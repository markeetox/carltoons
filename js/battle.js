/* ════════════════════════════════════════════════════════════
   battle.js  —  Tooniseum real-time multiplayer battle engine
   ────────────────────────────────────────────────────────────
   HOW MULTIPLAYER WORKS (no game server needed):

   Firestore document:  battles/{battleId}
   Both players listen with onSnapshot() — Firestore is the
   message bus. The host resolves each round via a transaction
   so there's no race condition.

   Flow:
     1. Player A clicks "Find Match" → writes a waiting battle doc
     2. Player B clicks "Find Match" → finds A's open doc, joins it
     3. Both clients get onSnapshot → battle UI renders
     4. Each round: both submit their move to the battle doc
     5. When both moves present, host resolves via transaction
        → state updates → both clients animate simultaneously
     6. Winner/loser saved, ELO updated

   Firestore schema:  battles/{battleId}
     status:       "waiting" | "active" | "resolving" | "done"
     hostId        string
     guestId       string | null
     hostPigeon    { name, traits, stats }
     guestPigeon   { name, traits, stats } | null
     round         number
     hostHP        number
     guestHP       number
     hostMaxHP     number
     guestMaxHP    number
     hostMove      null | "peck" | "swoop" | "dodge"
     guestMove     null | "peck" | "swoop" | "dodge"
     roundLog      string[]   (messages for current round)
     fullLog       string[]   (entire battle history)
     winnerId      null | uid
     createdAt     timestamp
     lastActivity  timestamp
   ════════════════════════════════════════════════════════════ */

const Battle = (() => {

  const RPS_BEATS = { peck: "dodge", swoop: "peck", dodge: "swoop" };

  let _battleRef     = null;
  let _unsubscribe   = null;
  let _myRole        = null;   // "host" | "guest"
  let _myUid         = null;
  let _moveSubmitted = false;
  let _battleOver    = false;
  let _rigBuilt      = false;
  let _timeoutTimer  = null;

  /* ════════════════════════════════════════════════════════
     MATCHMAKING
  ════════════════════════════════════════════════════════ */

  async function findMatch(playerData) {
    try {
      _myUid      = playerData.uid;
      _battleOver = false;
      _rigBuilt   = false;

      _setStatus("🔍 Searching for an opponent…");

      // Fetch waiting battles with a simple single-field query (no compound
      // index needed). Filter out our own battle client-side.
      const snap = await db.collection("battles")
        .where("status", "==", "waiting")
        .orderBy("createdAt")
        .limit(10)
        .get();

      // Find first open battle that belongs to someone else
      const joinable = snap.docs.find((d) => d.data().hostId !== _myUid);

      if (joinable) {
        await _joinBattle(joinable, playerData);
      } else {
        await _createBattle(playerData);
      }
    } catch (err) {
      console.error("[Battle] Find match failed:", err);
      _setStatus("❌ Matchmaking failed: " + (err.message || "Unknown error"));
      showToast("Matchmaking error. Check permissions.");
    }
  }

  async function _createBattle(playerData) {
    _myRole = "host";
    _setStatus("🕊️ Waiting for a challenger…");

    const maxHP = _maxHP(playerData.stats);
    _battleRef  = await db.collection("battles").add({
      status:       "waiting",
      hostId:       playerData.uid,
      guestId:      null,
      hostPigeon:   _pigeonPayload(playerData),
      guestPigeon:  null,
      round:        1,
      hostHP:       maxHP,
      guestHP:      0,
      hostMaxHP:    maxHP,
      guestMaxHP:   0,
      hostMove:     null,
      guestMove:    null,
      roundLog:     [],
      fullLog:      ["⚔️ Battle room open. Waiting for challenger…"],
      winnerId:     null,
      createdAt:    firebase.firestore.FieldValue.serverTimestamp(),
      lastActivity: firebase.firestore.FieldValue.serverTimestamp(),
    });

    _listenToBattle();
  }

  async function _joinBattle(doc, playerData) {
    _myRole    = "guest";
    _battleRef = doc.ref;

    const maxHP = _maxHP(playerData.stats);

    await _battleRef.update({
      status:       "active",
      guestId:      playerData.uid,
      guestPigeon:  _pigeonPayload(playerData),
      guestHP:      maxHP,
      guestMaxHP:   maxHP,
      fullLog:      firebase.firestore.FieldValue.arrayUnion(
                      `🐦 ${playerData.name} accepted the challenge! Battle starts now.`
                    ),
      lastActivity: firebase.firestore.FieldValue.serverTimestamp(),
    });

    _listenToBattle();
  }

  /* ════════════════════════════════════════════════════════
     REAL-TIME LISTENER  (both clients)
  ════════════════════════════════════════════════════════ */

  function _listenToBattle() {
    if (_unsubscribe) _unsubscribe();
    _unsubscribe = _battleRef.onSnapshot((snap) => {
      if (!snap.exists) return;
      _onUpdate(snap.data());
    });
  }

  function _onUpdate(d) {
    if (_battleOver) return;

    if (d.status === "waiting") {
      _setStatus("🕊️ Waiting for a challenger…");
      return;
    }

    if (d.status === "done") {
      _battleOver = true;
      _renderBattleUI(d);
      _onBattleEnd(d);
      return;
    }

    // "active" or "resolving"
    _renderBattleUI(d);

    // Host resolves when both moves are in
    if (d.status === "active" && d.hostMove && d.guestMove && _myRole === "host") {
      _resolveRound(d);
    }

    // After host resolves, re-enable picker for next round
    if (d.status === "active" && !d.hostMove && !d.guestMove) {
      _moveSubmitted = false;
      _setPickerWaiting(false);
    }

    // Touch the timeout clock on any activity
    _resetTimeoutWatcher(d);
  }

  /* ════════════════════════════════════════════════════════
     SUBMIT MOVE
  ════════════════════════════════════════════════════════ */

  async function submitMove(move) {
    if (!_battleRef || _moveSubmitted || _battleOver) return;
    _moveSubmitted = true;
    _setPickerWaiting(true);

    const field = _myRole === "host" ? "hostMove" : "guestMove";
    await _battleRef.update({
      [field]:      move,
      lastActivity: firebase.firestore.FieldValue.serverTimestamp(),
    });
  }

  /* ════════════════════════════════════════════════════════
     ROUND RESOLUTION  (host only, inside a transaction)
  ════════════════════════════════════════════════════════ */

  async function _resolveRound() {
    try {
      await db.runTransaction(async (tx) => {
        const snap = await tx.get(_battleRef);
        const d    = snap.data();

        if (d.status !== "active" || !d.hostMove || !d.guestMove) return;

        // Lock immediately
        tx.update(_battleRef, { status: "resolving" });

        const hMove = d.hostMove;
        const gMove = d.guestMove;

        // RPS: positive = host wins, negative = guest wins
        const rps = _rpsResult(hMove, gMove);

        // FUD confusion
        const hostFuds  = Math.random() < ((d.hostPigeon.stats.fud  ?? 0) / 200);
        const guestFuds = Math.random() < ((d.guestPigeon.stats.fud ?? 0) / 200);

        let hDmg = _calcDamage(d.hostPigeon.stats,   rps);
        let gDmg = _calcDamage(d.guestPigeon.stats, -rps);

        const log = [];
        log.push(`Round ${d.round} — ${d.hostPigeon.name}: ${_moveName(hMove)} vs ${d.guestPigeon.name}: ${_moveName(gMove)}`);
        log.push(
          rps === 1  ? `⚡ ${d.hostPigeon.name} wins the clash!`  :
          rps === -1 ? `⚡ ${d.guestPigeon.name} wins the clash!` :
                       "🤝 Clash tied!"
        );

        if (hostFuds)  { gDmg = 0; log.push(`😵 ${d.hostPigeon.name} is confused — misses!`);  }
        if (guestFuds) { hDmg = 0; log.push(`😵 ${d.guestPigeon.name} is confused — misses!`); }

        let newHostHP  = Math.max(0, d.hostHP  - gDmg);
        let newGuestHP = Math.max(0, d.guestHP - hDmg);

        if (hDmg > 0) log.push(`💢 ${d.hostPigeon.name} deals ${hDmg} dmg → ${d.guestPigeon.name}`);
        if (gDmg > 0) log.push(`💢 ${d.guestPigeon.name} deals ${gDmg} dmg → ${d.hostPigeon.name}`);

        // WAGMI regen
        newHostHP  = Math.min(d.hostMaxHP,  newHostHP  + Math.floor((d.hostPigeon.stats.wagmi  ?? 0) * 0.05));
        newGuestHP = Math.min(d.guestMaxHP, newGuestHP + Math.floor((d.guestPigeon.stats.wagmi ?? 0) * 0.05));

        log.push(`❤️ ${d.hostPigeon.name}: ${newHostHP} HP | ${d.guestPigeon.name}: ${newGuestHP} HP`);

        const over = newHostHP <= 0 || newGuestHP <= 0;
        const winnerId = over ? (newHostHP > 0 ? d.hostId : d.guestId) : null;
        if (over) {
          const winnerName = winnerId === d.hostId ? d.hostPigeon.name : d.guestPigeon.name;
          log.push(`🏆 ${winnerName} wins the Tooniseum battle!`);
        }

        tx.update(_battleRef, {
          status:       over ? "done" : "active",
          round:        d.round + 1,
          hostHP:       newHostHP,
          guestHP:      newGuestHP,
          hostMove:     null,
          guestMove:    null,
          roundLog:     log,
          fullLog:      firebase.firestore.FieldValue.arrayUnion(...log),
          winnerId,
          lastActivity: firebase.firestore.FieldValue.serverTimestamp(),
        });
      });
    } catch (err) {
      console.error("[battle] Transaction failed:", err);
      // Reset status so it can retry
      await _battleRef.update({ status: "active" });
    }
  }

  /* ════════════════════════════════════════════════════════
     UI
  ════════════════════════════════════════════════════════ */

  function _renderBattleUI(d) {
    document.getElementById("matchmaking")?.classList.add("hidden");
    document.getElementById("move-picker")?.classList.remove("hidden");

    const isHost   = _myRole === "host";
    const myPigeon = isHost ? d.hostPigeon  : d.guestPigeon;
    const opPigeon = isHost ? d.guestPigeon : d.hostPigeon;
    if (!myPigeon || !opPigeon) return;

    // Names
    document.getElementById("player-arena-name").textContent = myPigeon.name;
    document.getElementById("opponent-name").textContent     = opPigeon.name;

    // Build rigs once
    if (!_rigBuilt) {
      buildPigeonRig(document.getElementById("player-rig"),   myPigeon.traits, { idle: true });
      buildPigeonRig(document.getElementById("opponent-rig"), opPigeon.traits, { idle: true, mirrored: true });
      _rigBuilt = true;
    }

    // HP
    const myHP    = isHost ? d.hostHP    : d.guestHP;
    const myMaxHP = isHost ? d.hostMaxHP : d.guestMaxHP;
    const opHP    = isHost ? d.guestHP   : d.hostHP;
    const opMaxHP = isHost ? d.guestMaxHP: d.hostMaxHP;

    _updateHP("player", myHP, myMaxHP);
    _updateHP("opponent", opHP, opMaxHP);

    // Hurt animations on HP change
    const playerRig   = document.getElementById("player-rig");
    const opponentRig = document.getElementById("opponent-rig");
    if (d.roundLog?.some(l => l.includes(myPigeon.name) && l.includes("dmg") && !l.startsWith(`💢 ${myPigeon.name}`))) {
      triggerAnimation(playerRig, "hurt");
    }
    if (d.roundLog?.some(l => l.includes(opPigeon.name) && l.includes("dmg") && !l.startsWith(`💢 ${opPigeon.name}`))) {
      triggerAnimation(opponentRig, "hurt");
    }

    // Low HP
    if (myHP / myMaxHP <= 0.25) playerRig?.classList.add("low-hp");
    else playerRig?.classList.remove("low-hp");

    // Log
    _syncFeedLog(d.fullLog ?? []);
  }

  function _updateHP(side, hp, maxHp) {
    const pct   = Math.max(0, Math.round((hp / maxHp) * 100));
    const color = pct > 50 ? "var(--clr-green)" : pct > 25 ? "var(--clr-gold)" : "var(--clr-red)";
    const fill  = document.getElementById(`${side}-hp-fill`);
    const label = document.getElementById(`${side}-hp-label`);
    if (fill)  { fill.style.width = pct + "%"; fill.style.background = color; }
    if (label) label.textContent = `${hp} HP`;
  }

  function _syncFeedLog(fullLog) {
    const feed = document.getElementById("battle-feed");
    if (!feed) return;
    const shown = feed.querySelectorAll(".feed-entry").length;
    fullLog.slice(shown).forEach((msg) => {
      const p = document.createElement("p");
      p.className = "feed-entry"
        + (msg.includes("wins") || msg.includes("🏆") ? " win"  : "")
        + (msg.includes("dmg")  || msg.includes("💢") ? " hit"  : "")
        + (msg.includes("dodge")|| msg.includes("💨") ? " dodge": "");
      p.textContent = msg;
      feed.appendChild(p);
    });
    feed.scrollTop = feed.scrollHeight;
  }

  function _setPickerWaiting(waiting) {
    const picker = document.getElementById("move-picker");
    if (!picker) return;
    picker.querySelectorAll(".move-btn").forEach((btn) => {
      btn.disabled      = waiting;
      btn.style.opacity = waiting ? "0.4" : "1";
    });
    let lbl = document.getElementById("move-wait-label");
    if (waiting && !lbl) {
      lbl = document.createElement("p");
      lbl.id = "move-wait-label";
      lbl.style.cssText = "grid-column:1/-1;text-align:center;font-size:13px;color:var(--clr-text-dim);padding:4px 0";
      lbl.textContent   = "⏳ Waiting for opponent's move…";
      picker.appendChild(lbl);
    } else if (!waiting && lbl) {
      lbl.remove();
    }
  }

  function _setStatus(msg) {
    const el = document.querySelector(".matchmaking-sub");
    if (el) el.textContent = msg;
  }

  /* ════════════════════════════════════════════════════════
     BATTLE END
  ════════════════════════════════════════════════════════ */

  async function _onBattleEnd(d) {
    if (_unsubscribe) { _unsubscribe(); _unsubscribe = null; }
    if (_timeoutTimer) { clearInterval(_timeoutTimer); _timeoutTimer = null; }

    const isHost = _myRole === "host";
    const iWon   = d.winnerId === _myUid;

    const playerRig   = document.getElementById("player-rig");
    const opponentRig = document.getElementById("opponent-rig");

    setTimeout(() => {
      if (iWon) {
        triggerAnimation(playerRig,   "victory", 900);
        triggerAnimation(opponentRig, "ko");
      } else {
        triggerAnimation(playerRig, "ko");
      }
    }, 400);

    _setPickerWaiting(true);

    await App.recordBattleResult({
      won:      iWon,
      opponent: (isHost ? d.guestPigeon?.name : d.hostPigeon?.name) ?? "Unknown",
      rounds:   (d.round ?? 1) - 1,
      eloDelta: iWon ? 25 : -20,
    });

    // Soft-delete the battle doc after 30s (keeps it readable for both)
    setTimeout(async () => {
      try { await _battleRef?.delete(); } catch (_) {}
    }, 30000);
  }

  /* ════════════════════════════════════════════════════════
     TIMEOUT WATCHER  (host only)
     If opponent hasn't moved in 90s, host wins by default
  ════════════════════════════════════════════════════════ */

  function _resetTimeoutWatcher(d) {
    if (_myRole !== "host" || d.status !== "active") return;
    if (_timeoutTimer) clearInterval(_timeoutTimer);

    _timeoutTimer = setInterval(async () => {
      if (_battleOver) { clearInterval(_timeoutTimer); return; }
      const snap = await _battleRef.get();
      if (!snap.exists) { clearInterval(_timeoutTimer); return; }
      const data = snap.data();
      if (data.status !== "active") return;

      const last = data.lastActivity?.toDate?.() ?? new Date();
      if ((Date.now() - last.getTime()) / 1000 > 90) {
        clearInterval(_timeoutTimer);
        await _battleRef.update({
          status:   "done",
          winnerId: _myUid,
          fullLog:  firebase.firestore.FieldValue.arrayUnion("⏱️ Opponent timed out. Victory by default!"),
        });
      }
    }, 15000);
  }

  /* ════════════════════════════════════════════════════════
     CANCEL MATCHMAKING
  ════════════════════════════════════════════════════════ */

  async function cancelMatchmaking() {
    if (_unsubscribe) { _unsubscribe(); _unsubscribe = null; }
    if (_timeoutTimer) { clearInterval(_timeoutTimer); _timeoutTimer = null; }
    if (_battleRef && _myRole === "host") {
      try {
        const snap = await _battleRef.get();
        if (snap.exists && snap.data().status === "waiting") await _battleRef.delete();
      } catch (_) {}
    }
    _battleRef     = null;
    _myRole        = null;
    _moveSubmitted = false;
    _battleOver    = false;
    _rigBuilt      = false;
  }

  /* ════════════════════════════════════════════════════════
     HELPERS
  ════════════════════════════════════════════════════════ */

  function _pigeonPayload(p) {
    return { name: p.name, traits: p.traits, stats: p.stats };
  }

  function _maxHP(stats) {
    return GAME_CONFIG.baseHP + Math.floor((stats.ngmi ?? 0) * 0.5);
  }

  function _rpsResult(a, b) {
    if (a === b) return 0;
    return RPS_BEATS[a] === b ? 1 : -1;
  }

  function _calcDamage(stats, rps) {
    const base     = 10 + Math.floor((stats.yolo ?? 20) * 0.3);
    const defence  = stats.hodl ?? 20;
    const mult     = rps === 1 ? 1.45 : rps === 0 ? 1.0 : 0.55;
    const variance = Math.floor((stats.yolo ?? 20) * 0.15 * (Math.random() * 2 - 1));
    return Math.max(1, Math.round((base + variance) * mult) - Math.floor(defence * 0.15));
  }

  function _moveName(m) {
    return { peck: "🐦 Peck", swoop: "🌀 Swoop", dodge: "💨 Dodge" }[m] ?? m;
  }

  /* ════════════════════════════════════════════════════════
     PUBLIC INIT
  ════════════════════════════════════════════════════════ */

  function init() {
    document.querySelectorAll(".move-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (!btn.disabled) submitMove(btn.dataset.move);
      });
    });

    // Cancel when leaving battle tab mid-search
    document.querySelectorAll(".nav-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.dataset.screen !== "battle" && _myRole && !_battleOver) {
          cancelMatchmaking();
          document.getElementById("matchmaking")?.classList.remove("hidden");
        }
      });
    });
  }

  return { init, findMatch, cancelMatchmaking };
})();
