/* ════════════════════════════════════════════════════════════
   app.js  —  Main app controller
   Handles: auth, screen routing, Firestore reads/writes,
            daily care actions, Discord role verification
   ════════════════════════════════════════════════════════════ */

/* ── Utility: show a named screen ── */
function showScreen(name) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
  const target = document.getElementById(`screen-${name}`);
  if (target) target.classList.add("active");

  // Nav visibility
  const hideNav = ["login","hatch"].includes(name);
  document.getElementById("bottom-nav").classList.toggle("hidden", hideNav);

  // Highlight active nav button
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.screen === name);
  });
}

/* ── Utility: toast notification ── */
function showToast(msg, duration = 2500) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), duration);
}

/* ── Utility: today's date string (YYYY-MM-DD) ── */
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

/* ════════════════════════════════════════════════════════════
   App — main namespace
   ════════════════════════════════════════════════════════════ */
const App = (() => {
  let _user     = null;   // Firebase auth user
  let _userData = null;   // Firestore player document
  let _pigeon   = null;   // Firestore pigeon document

  /* ──────────────────────────────────────────────────────────
     BOOT
  ────────────────────────────────────────────────────────────── */
  function boot() {
    Hatch.init();
    Battle.init();
    _initNav();
    _initEggActions();
    _initCareActions();
    _initBattleButtons();

    // Watch auth state
    auth.onAuthStateChanged(async (user) => {
      if (!user) {
        showScreen("login");
        return;
      }
      _user = user;
      await _loadPlayer();
    });


    // Auth form — tab switching + submit
    _initAuthForm();

    // Logout
    document.getElementById("btn-logout").addEventListener("click", async () => {
      await auth.signOut();
      showScreen("login");
    });
  }


  /* ──────────────────────────────────────────────────────────
     EMAIL / PASSWORD AUTH FORM
  ────────────────────────────────────────────────────────────── */
  function _initAuthForm() {
    let isRegister = false;

    const tabLogin    = document.getElementById("tab-login");
    const tabRegister = document.getElementById("tab-register");
    const form        = document.querySelector(".auth-form");
    const btnSubmit   = document.getElementById("btn-auth-submit");
    const btnLabel    = document.getElementById("btn-auth-label");
    const errEl       = document.getElementById("auth-error");

    // Tab switching
    tabLogin.addEventListener("click", () => {
      isRegister = false;
      tabLogin.classList.add("active");
      tabRegister.classList.remove("active");
      form.classList.remove("register-mode");
      btnLabel.textContent = "Login";
      errEl.textContent = "";
    });

    tabRegister.addEventListener("click", () => {
      isRegister = true;
      tabRegister.classList.add("active");
      tabLogin.classList.remove("active");
      form.classList.add("register-mode");
      btnLabel.textContent = "Create Account";
      errEl.textContent = "";
    });

    // Submit
    btnSubmit.addEventListener("click", async () => {
      const username = document.getElementById("auth-username").value.trim();
      const email    = document.getElementById("auth-email").value.trim();
      const password = document.getElementById("auth-password").value;
      errEl.textContent = "";

      if (!email || !password) {
        errEl.textContent = "Email and password are required."; return;
      }
      if (isRegister && !username) {
        errEl.textContent = "Pick a username."; return;
      }
      if (password.length < 6) {
        errEl.textContent = "Password must be at least 6 characters."; return;
      }

      btnSubmit.disabled = true;
      btnLabel.textContent = isRegister ? "Creating…" : "Logging in…";

      try {
        if (isRegister) {
          const cred = await auth.createUserWithEmailAndPassword(email, password);
          // Store display name so it shows in game
          await cred.user.updateProfile({ displayName: username });
        } else {
          await auth.signInWithEmailAndPassword(email, password);
        }
        // onAuthStateChanged fires → _loadPlayer() called automatically
      } catch (err) {
        errEl.textContent = _authErrorMsg(err.code);
        btnSubmit.disabled = false;
        btnLabel.textContent = isRegister ? "Create Account" : "Login";
      }
    });

    // Also submit on Enter key
    document.querySelector(".auth-form").addEventListener("keydown", (e) => {
      if (e.key === "Enter") btnSubmit.click();
    });
  }

  function _authErrorMsg(code) {
    const map = {
      "auth/user-not-found":       "No account with that email.",
      "auth/wrong-password":       "Wrong password.",
      "auth/email-already-in-use": "That email is already registered.",
      "auth/invalid-email":        "Invalid email address.",
      "auth/weak-password":        "Password is too weak.",
      "auth/too-many-requests":    "Too many attempts — try again later.",
      "auth/invalid-credential":   "Wrong email or password.",
    };
    return map[code] ?? "Something went wrong. Try again.";
  }

  /* ──────────────────────────────────────────────────────────
     LOAD PLAYER from Firestore
     Document path: players/{uid}
  ────────────────────────────────────────────────────────────── */
  async function _loadPlayer() {
    const ref  = db.collection("players").doc(_user.uid);
    const snap = await ref.get();

    if (!snap.exists) {
      // Brand new player — create document + assign egg
      await _createNewPlayer(ref);
    } else {
      _userData = snap.data();
    }

    await _loadPigeon();
    _recordDailyLogin();
    _routeAfterLoad();
  }

  async function _createNewPlayer(ref) {
    _userData = {
      uid:          _user.uid,
      username:     _user.displayName ?? _user.email?.split('@')[0] ?? "pigeon_owner",
      createdAt:    firebase.firestore.FieldValue.serverTimestamp(),
      totalLogins:  0,
      loginDates:   [],
      elo:          GAME_CONFIG.eloDefault,
      battleLog:    [],
      hasPigeon:    false,
      pigeonId:     null,
    };
    await ref.set(_userData);
  }

  /* ──────────────────────────────────────────────────────────
     LOAD PIGEON from Firestore
     Document path: pigeons/{uid}  (one pigeon per player for now)
  ────────────────────────────────────────────────────────────── */
  async function _loadPigeon() {
    if (!_userData.hasPigeon) return;
    const snap = await db.collection("pigeons").doc(_user.uid).get();
    if (snap.exists) _pigeon = snap.data();
  }

  /* ──────────────────────────────────────────────────────────
     RECORD DAILY LOGIN
  ────────────────────────────────────────────────────────────── */
  async function _recordDailyLogin() {
    const today = todayStr();
    const dates = _userData.loginDates ?? [];
    if (dates.includes(today)) return; // already counted

    dates.push(today);
    await db.collection("players").doc(_user.uid).update({
      loginDates:  dates,
      totalLogins: firebase.firestore.FieldValue.increment(1),
    });
    _userData.loginDates  = dates;
    _userData.totalLogins = (_userData.totalLogins ?? 0) + 1;

    // Apply bond decay if pigeon exists and player missed yesterday
    if (_pigeon) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yStr = yesterday.toISOString().slice(0, 10);
      if (!dates.includes(yStr)) {
        const newBond = Math.max(0, (_pigeon.bond ?? 50) - GAME_CONFIG.bondDecayPerDay);
        await db.collection("pigeons").doc(_user.uid).update({ bond: newBond });
        _pigeon.bond = newBond;
      }
    }
  }

  /* ──────────────────────────────────────────────────────────
     ROUTING after load
  ────────────────────────────────────────────────────────────── */
  function _routeAfterLoad() {
    if (!_userData.hasPigeon) {
      // New player: show egg screen
      _renderEggScreen();
      showScreen("egg");
    } else if (_pigeon) {
      // Has pigeon: go home
      _renderHomeScreen();
      _renderProfileScreen();
      showScreen("home");
    }
  }

  /* ──────────────────────────────────────────────────────────
     EGG SCREEN
  ────────────────────────────────────────────────────────────── */
  function _renderEggScreen() {
    const egg = _pigeon ?? {};  // might not exist yet, that's fine
    const actionLog   = egg.incubationLog ?? [];
    const daysDone    = actionLog.filter(Boolean).length;
    const daysLeft    = GAME_CONFIG.eggDays - daysDone;
    const today       = todayStr();
    const usedToday   = egg.lastActionDate === today;

    // Egg image state
    const eggImg = document.getElementById("egg-img");
    if (eggImg) {
      if (daysDone >= 6)       eggImg.src = PIGEON_CONFIG.eggPath("egg_crack2");
      else if (daysDone >= 3)  eggImg.src = PIGEON_CONFIG.eggPath("egg_crack1");
      else                     eggImg.src = PIGEON_CONFIG.eggPath("egg_whole");
    }

    document.getElementById("egg-days-label").textContent =
      daysLeft <= 0 ? "Ready to hatch! 🎉" : `${daysLeft} day${daysLeft !== 1 ? "s" : ""} until hatch`;

    // Streak
    const streak = _calcStreak(_userData.loginDates ?? []);
    document.getElementById("streak-count").textContent = streak;

    // Used today
    const grid    = document.getElementById("action-grid");
    const usedMsg = document.getElementById("daily-used-msg");
    if (usedToday) {
      grid.style.display = "none";
      usedMsg.style.display = "flex";
    } else {
      grid.style.display = "grid";
      usedMsg.style.display = "none";
    }

    renderIncubationLog("incubation-log", actionLog);

    // Check if egg should hatch
    if (daysLeft <= 0 && !usedToday) {
      _triggerHatch();
    }
  }

  function _initEggActions() {
    document.getElementById("action-grid").addEventListener("click", async (e) => {
      const card = e.target.closest(".action-card");
      if (!card) return;
      const action = card.dataset.action;
      await _doEggAction(action);
    });
  }

  async function _doEggAction(action) {
    const today = todayStr();

    // Animate egg
    const wrap = document.getElementById("egg-wrap");
    const animClass = `do-${action}`;
    wrap.classList.remove("do-shake","do-heat","do-lick");
    void wrap.offsetWidth;
    wrap.classList.add(animClass);
    if (action === "shake") setTimeout(() => wrap.classList.remove(animClass), 700);

    // Get or create pigeon doc for incubation tracking
    let pigeonRef = db.collection("pigeons").doc(_user.uid);
    let pigeonSnap = await pigeonRef.get();

    let incubationLog = [];
    if (pigeonSnap.exists) {
      incubationLog = pigeonSnap.data().incubationLog ?? [];
    }

    incubationLog.push(action);

    const pigeonData = {
      uid:            _user.uid,
      incubationLog,
      lastActionDate: today,
      hatched:        false,
    };

    if (pigeonSnap.exists) await pigeonRef.update(pigeonData);
    else await pigeonRef.set(pigeonData);

    _pigeon = pigeonData;
    showToast(`🐣 ${action.charAt(0).toUpperCase() + action.slice(1)} action recorded!`);

    const daysDone = incubationLog.filter(Boolean).length;
    if (daysDone >= GAME_CONFIG.eggDays) {
      setTimeout(_triggerHatch, 1000);
    } else {
      _renderEggScreen();
    }
  }

  /* ──────────────────────────────────────────────────────────
     TRIGGER HATCH
  ────────────────────────────────────────────────────────────── */
  function _triggerHatch() {
    const log    = _pigeon?.incubationLog ?? [];
    const traits = generatePigeonTraits(_user.uid);
    const stats  = computeStats(log);
    Hatch.start(traits, stats);
  }

  /* ──────────────────────────────────────────────────────────
     SAVE NEW PIGEON (called by Hatch.js after naming)
  ────────────────────────────────────────────────────────────── */
  async function saveNewPigeon(name, traits, stats) {
    const pigeonData = {
      uid:           _user.uid,
      name,
      traits,
      stats,
      level:         1,
      bond:          50,
      hatched:       true,
      hatchDate:     todayStr(),
      incubationLog: _pigeon?.incubationLog ?? [],
      lastFed:       null,
      lastPlayed:    null,
      lastTrained:   null,
    };

    await db.collection("pigeons").doc(_user.uid).set(pigeonData);
    await db.collection("players").doc(_user.uid).update({ hasPigeon: true, pigeonId: _user.uid });

    _pigeon = pigeonData;
    _userData.hasPigeon = true;

    _renderHomeScreen();
    _renderProfileScreen();
  }

  /* ──────────────────────────────────────────────────────────
     HOME SCREEN
  ────────────────────────────────────────────────────────────── */
  function _renderHomeScreen() {
    if (!_pigeon) return;
    const traits = _pigeon.traits;
    const stats  = _pigeon.stats;
    const today  = todayStr();

    document.getElementById("home-pigeon-name").textContent = _pigeon.name ?? "Pigeon";

    const streak = _calcStreak(_userData.loginDates ?? []);
    document.getElementById("home-streak").textContent = streak;

    buildPigeonRig(document.getElementById("home-rig"), traits, { idle: true });
    updateBondUI(_pigeon.bond ?? 50);
    renderStatChips("quick-stats", stats);

    // Mark care cards as done if already used today
    ["food","play","train"].forEach((care) => {
      const btn = document.getElementById(`care-${care}`);
      const field = care === "food" ? "lastFed" : care === "play" ? "lastPlayed" : "lastTrained";
      if (btn) btn.classList.toggle("done", _pigeon[field] === today);
    });
  }

  function _initCareActions() {
    document.querySelector(".care-grid")?.addEventListener("click", async (e) => {
      const card = e.target.closest(".care-card");
      if (!card || card.classList.contains("done")) return;
      await _doCareAction(card.dataset.care);
    });
  }

  async function _doCareAction(careType) {
    const today = todayStr();
    const field  = careType === "food" ? "lastFed" : careType === "play" ? "lastPlayed" : "lastTrained";
    const bondGain = GAME_CONFIG[`bondGain${careType.charAt(0).toUpperCase() + careType.slice(1)}`] ?? 5;

    // Stat to train (player could choose later — for now auto-pick weakest)
    let statUpdates = {};
    if (careType === "train") {
      const weakest = _weakestStat(_pigeon.stats);
      statUpdates[`stats.${weakest}`] = Math.min(
        GAME_CONFIG.statMax,
        (_pigeon.stats[weakest] ?? 0) + 3
      );
    }

    const newBond = Math.min(GAME_CONFIG.bondMax, (_pigeon.bond ?? 50) + bondGain);

    await db.collection("pigeons").doc(_user.uid).update({
      [field]: today,
      bond:    newBond,
      ...statUpdates,
    });

    _pigeon[field] = today;
    _pigeon.bond   = newBond;
    if (careType === "train") {
      const w = _weakestStat(_pigeon.stats);
      _pigeon.stats[w] = Math.min(GAME_CONFIG.statMax, (_pigeon.stats[w] ?? 0) + 3);
    }

    const LABELS = { food: "🍞 Fed!", play: "🎮 Played!", train: "🏋️ Trained!" };
    showToast(LABELS[careType]);
    _renderHomeScreen();
    triggerAnimation(document.getElementById("home-rig"), "victory", 900);
  }

  function _weakestStat(stats) {
    const keys = Object.keys(stats);
    return keys.reduce((min, k) => stats[k] < stats[min] ? k : min, keys[0]);
  }

  /* ──────────────────────────────────────────────────────────
     PROFILE SCREEN
  ────────────────────────────────────────────────────────────── */
  function _renderProfileScreen() {
    if (!_pigeon) return;

    buildPigeonRig(document.getElementById("profile-rig"), _pigeon.traits, { idle: true });
    document.getElementById("profile-name").textContent = _pigeon.name ?? "—";
    document.getElementById("profile-sub").textContent =
      `Level ${_pigeon.level ?? 1} · ${(_userData.battleLog ?? []).length} battles`;

    renderFullStatCard("profile-stat-card", _pigeon.stats);

    // Battle log
    const logEl = document.getElementById("battle-log");
    const battles = _userData.battleLog ?? [];
    if (battles.length === 0) {
      logEl.innerHTML = `<p class="empty-state"><i class="fa-solid fa-skull"></i> No battles yet</p>`;
    } else {
      logEl.innerHTML = battles.slice(-10).reverse().map((b) => `
        <div class="battle-entry">
          <span class="battle-result ${b.won ? "win" : "loss"}">${b.won ? "WIN" : "LOSS"}</span>
          <span>vs ${b.opponent}</span>
          <span style="margin-left:auto;font-size:11px">${b.date ?? ""}</span>
        </div>
      `).join("");
    }

    // Streak dots (last 7 days)
    const dotsEl = document.getElementById("streak-dots");
    const loginDates = _userData.loginDates ?? [];
    dotsEl.innerHTML = "";
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dStr = d.toISOString().slice(0, 10);
      const dot = document.createElement("div");
      dot.className = `streak-dot ${loginDates.includes(dStr) ? "active" : ""}`;
      dot.textContent = loginDates.includes(dStr) ? "✓" : "·";
      dotsEl.appendChild(dot);
    }

    document.getElementById("total-logins").textContent = _userData.totalLogins ?? 0;
  }

  /* ──────────────────────────────────────────────────────────
     BATTLE BUTTONS
  ────────────────────────────────────────────────────────────── */
  function _initBattleButtons() {
    document.getElementById("btn-find-match")?.addEventListener("click", _findMatch);
  }

  async function _findMatch() {
    if (!_pigeon) { showToast("You need a pigeon first!"); return; }
    document.getElementById("player-elo").textContent = _userData.elo ?? GAME_CONFIG.eloDefault;
    // Clear the feed for new battle
    const feed = document.getElementById("battle-feed");
    if (feed) feed.innerHTML = "";
    // Clear rigs for fresh build
    ["player-rig","opponent-rig"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = "";
    });
    Battle.findMatch({
      uid:    _user.uid,
      name:   _pigeon.name,
      traits: _pigeon.traits,
      stats:  _pigeon.stats,
    });
  }

  /* ──────────────────────────────────────────────────────────
     RECORD BATTLE RESULT
  ────────────────────────────────────────────────────────────── */
  async function recordBattleResult({ won, opponent, rounds, eloDelta = 0 }) {
    const entry  = { won, opponent, rounds, date: todayStr() };
    const newLog = [...(_userData.battleLog ?? []), entry];
    const newElo = Math.max(0, (_userData.elo ?? GAME_CONFIG.eloDefault) + eloDelta);

    await db.collection("players").doc(_user.uid).update({
      battleLog: newLog,
      elo:       newElo,
    });

    _userData.battleLog = newLog;
    _userData.elo       = newElo;

    document.getElementById("player-elo").textContent = newElo;
    _renderProfileScreen();
  }

  /* ──────────────────────────────────────────────────────────
     NAV
  ────────────────────────────────────────────────────────────── */
  function _initNav() {
    document.querySelectorAll(".nav-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const screen = btn.dataset.screen;
        if (screen === "battle") {
          // Re-show matchmaking when navigating to battle tab
          document.getElementById("matchmaking")?.classList.remove("hidden");
          _renderLeaderboard();
        }
        if (screen === "profile") _renderProfileScreen();
        showScreen(screen);
      });
    });
  }

  /* ──────────────────────────────────────────────────────────
     LEADERBOARD preview
  ────────────────────────────────────────────────────────────── */
  async function _renderLeaderboard() {
    const snap = await db.collection("players")
      .orderBy("elo", "desc")
      .limit(5)
      .get();

    const el = document.getElementById("leaderboard-preview");
    if (!el) return;
    el.innerHTML = "";

    snap.docs.forEach((doc, i) => {
      const d = doc.data();
      const row = document.createElement("div");
      row.className = "lb-row";
      row.innerHTML = `
        <span class="lb-rank">#${i + 1}</span>
        <span class="lb-name">${d.username ?? "Pigeon owner"}</span>
        <span class="lb-elo">${d.elo ?? 1000}</span>
      `;
      el.appendChild(row);
    });
  }

  /* ──────────────────────────────────────────────────────────
     HELPERS
  ────────────────────────────────────────────────────────────── */
  function _calcStreak(loginDates) {
    if (!loginDates.length) return 0;
    let streak = 0;
    const d = new Date();
    while (true) {
      const s = d.toISOString().slice(0, 10);
      if (loginDates.includes(s)) { streak++; d.setDate(d.getDate() - 1); }
      else break;
    }
    return streak;
  }

  return { boot, saveNewPigeon, recordBattleResult, handleDiscordCallback };
})();

/* ── Start the app ── */
document.addEventListener("DOMContentLoaded", App.boot);
