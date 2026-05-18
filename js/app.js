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

/* ── localStorage action gate ──────────────────────────────
   Written BEFORE the Firestore write so a refresh mid-write
   can never grant a second action on the same day.
   Key format:  pigeons_{uid}_{action}  e.g. pigeons_abc_egg
   Value:       date string "2025-01-15"
────────────────────────────────────────────────────────────── */
function _lockAction(uid, action) {
  try {
    localStorage.setItem(`pigeons_${uid}_${action}`, todayStr());
  } catch (_) {}
}

function _isActionLocked(uid, action) {
  try {
    return localStorage.getItem(`pigeons_${uid}_${action}`) === todayStr();
  } catch (_) { return false; }
}

function _syncLocksFromFirestore(uid, pigeonData) {
  // On load, sync localStorage with Firestore so they agree.
  // Firestore always wins — if Firestore says used, lock it.
  if (!pigeonData) return;
  const today = todayStr();
  if (pigeonData.lastActionDate === today) _lockAction(uid, "egg");
  if (pigeonData.lastFed       === today)  _lockAction(uid, "food");
  if (pigeonData.lastPlayed    === today)  _lockAction(uid, "play");
  if (pigeonData.lastTrained   === today)  _lockAction(uid, "train");
}

/* ── Utility: ms until midnight (next day reset) ── */
function msUntilMidnight() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return midnight - now;
}

/* ── Utility: format ms as "Hh Mm Ss" countdown ── */
function formatCountdown(ms) {
  if (ms <= 0) return "Ready!";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2,"0")}m`;
  if (m > 0) return `${m}m ${String(s).padStart(2,"0")}s`;
  return `${s}s`;
}

/* ── Countdown ticker — updates all .js-countdown elements every second ── */
let _countdownInterval = null;
function startCountdownTicker() {
  if (_countdownInterval) clearInterval(_countdownInterval);
  _countdownInterval = setInterval(() => {
    const ms = msUntilMidnight();
    document.querySelectorAll(".js-countdown").forEach((el) => {
      el.textContent = formatCountdown(ms);
    });
  }, 1000);
  // Tick immediately
  const ms = msUntilMidnight();
  document.querySelectorAll(".js-countdown").forEach((el) => {
    el.textContent = formatCountdown(ms);
  });
}

/* ════════════════════════════════════════════════════════════
   App — main namespace
   ════════════════════════════════════════════════════════════ */
const App = (() => {
  let _user     = null;   // Firebase auth user
  let _userData = null;   // Firestore player document
  let _pigeon   = null;   // Firestore pigeon document
  let _howtoReturnScreen = "home";  // screen to return to from how-to

  /* ──────────────────────────────────────────────────────────
     BOOT
  ────────────────────────────────────────────────────────────── */
  function boot() {
    // Auth form first — always available on login screen
    _initAuthForm();

    // Watch auth state — routes to correct screen
    auth.onAuthStateChanged(async (user) => {
      if (!user) {
        showScreen("login");
        return;
      }
      _user = user;
      await _loadPlayer();
    });

    // Wire up everything else safely after DOM is ready
    _initNav();
    _initEggActions();
    _initCareActions();
    _initBattleButtons();
    _initChallenges();
    Hatch.init();
    Battle.init();

    // Mood popup — use document-level delegation so it always fires
    // regardless of z-index stacking or timing
    document.addEventListener("click", (e) => {
      if (e.target.closest("#mood-dismiss")) { _hideMoodPopup(); return; }
      if (e.target.id === "mood-overlay")    { _hideMoodPopup(); return; }
    });

    // How-to-play buttons — any .btn-howto or back button
    document.addEventListener("click", (e) => {
      if (e.target.closest(".btn-howto")) {
        // Remember which screen we came from to go back
        _howtoReturnScreen = document.querySelector(".screen.active")?.id?.replace("screen-","") ?? "home";
        showScreen("howto");
        document.getElementById("bottom-nav").classList.add("hidden");
        return;
      }
      if (e.target.closest("#btn-howto-back")) {
        showScreen(_howtoReturnScreen ?? "home");
        if (!["login","hatch"].includes(_howtoReturnScreen)) {
          document.getElementById("bottom-nav").classList.remove("hidden");
        }
        return;
      }
    });

    // Logout — always in the nav, works from any screen
    document.addEventListener("click", async (e) => {
      if (!e.target.closest("#btn-logout")) return;
      // Simple confirm to prevent accidental logout
      if (!confirm("Log out of Pigeons?")) return;
      try {
        await auth.signOut();
      } catch (_) {}
      _user     = null;
      _userData = null;
      _pigeon   = null;
      _hideMoodPopup();
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
    const btnForgot   = document.getElementById("btn-forgot-pw");
    const forgotWrap  = document.querySelector(".auth-forgot-wrap");

    // Tab switching
    tabLogin.addEventListener("click", () => {
      isRegister = false;
      tabLogin.classList.add("active");
      tabRegister.classList.remove("active");
      form.classList.remove("register-mode");
      btnLabel.textContent = "Login";
      errEl.textContent = "";
      forgotWrap.style.display = "flex";
    });

    tabRegister.addEventListener("click", () => {
      isRegister = true;
      tabRegister.classList.add("active");
      tabLogin.classList.remove("active");
      form.classList.add("register-mode");
      btnLabel.textContent = "Create Account";
      errEl.textContent = "";
      forgotWrap.style.display = "none";
    });

    // Forgot Password
    btnForgot.addEventListener("click", async () => {
      const email = document.getElementById("auth-email").value.trim();
      if (!email) {
        errEl.textContent = "Enter your email first.";
        return;
      }
      errEl.textContent = "";
      btnForgot.disabled = true;
      btnForgot.textContent = "Sending...";

      try {
        await auth.sendPasswordResetEmail(email);
        showToast("Reset email sent! Check your inbox.");
      } catch (err) {
        errEl.textContent = _authErrorMsg(err.code);
      } finally {
        btnForgot.disabled = false;
        btnForgot.textContent = "Forgot password?";
      }
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

    // Detect Brave browser and show shields warning
    const isBrave = navigator.brave && typeof navigator.brave.isBrave === "function";
    if (isBrave) {
      navigator.brave.isBrave().then((brave) => {
        const el = document.getElementById("brave-note");
        if (brave && el) el.style.display = "flex";
      });
    }
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
      "auth/network-request-failed": "Network blocked — if using Brave, disable Shields for this site.",
    };
    return map[code] ?? "Something went wrong. Try again.";
  }

  /* ──────────────────────────────────────────────────────────
     LOAD PLAYER from Firestore
     Document path: players/{uid}
  ────────────────────────────────────────────────────────────── */
  async function _loadPlayer() {
    try {
      const data = await DB.getPlayer(_user.uid);

      if (!data) {
        // Brand new player — create document + assign egg
        await _createNewPlayer();
      } else {
        _userData = data;
      }

      await _loadPigeon();
      _recordDailyLogin();
      _routeAfterLoad();
    } catch (err) {
      console.error("[App] Load player failed:", err);
      showToast("Authentication error. Please refresh.");
    }
  }

  async function _createNewPlayer() {
    _userData = {
      uid:          _user.uid,
      username:     _user.displayName ?? _user.email?.split('@')[0] ?? "pigeon_owner",
      createdAt:    Date.now(),
      totalLogins:  0,
      loginDates:   [],
      elo:          GAME_CONFIG.eloDefault,
      battleLog:    [],
      hasPigeon:    false,
      pigeonId:     null,
    };
    try {
      await DB.setPlayer(_user.uid, _userData);
    } catch (err) {
      console.error("[App] Create player failed:", err);
      showToast("Failed to create profile. Check connection.");
    }
  }

  /* ──────────────────────────────────────────────────────────
     LOAD PIGEON from Firestore
     Document path: pigeons/{uid}  (one pigeon per player for now)
  ────────────────────────────────────────────────────────────── */
  async function _loadPigeon() {
    try {
      // Even if hasPigeon is false, they might have an unhatched egg (incubation progress)
      const data = await DB.getPigeon(_user.uid);
      if (data) {
        _pigeon = data;
        // Sync localStorage gates so refresh can never bypass them
        _syncLocksFromFirestore(_user.uid, _pigeon);
      }
    } catch (err) {
      console.error("[App] Load pigeon failed:", err);
      // No toast here as it's a silent background load,
      // but Step 2 will add more robust error handling.
    }
  }

  /* ──────────────────────────────────────────────────────────
     RECORD DAILY LOGIN
  ────────────────────────────────────────────────────────────── */
  async function _recordDailyLogin() {
    try {
      const today = todayStr();
      const dates = _userData.loginDates ?? [];
      if (dates.includes(today)) return; // already counted

      dates.push(today);
      const newTotalLogins = (_userData.totalLogins ?? 0) + 1;
      await DB.updatePlayer(_user.uid, {
        loginDates:  dates,
        totalLogins: newTotalLogins,
      });
      _userData.loginDates  = dates;
      _userData.totalLogins = newTotalLogins;

      // Apply bond decay if pigeon exists and player missed yesterday
      if (_pigeon) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yStr = yesterday.toISOString().slice(0, 10);
        if (!dates.includes(yStr)) {
          const newBond = Math.max(0, (_pigeon.bond ?? 50) - GAME_CONFIG.bondDecayPerDay);
          await DB.updatePigeon(_user.uid, { bond: newBond });
          _pigeon.bond = newBond;
        }
      }
    } catch (err) {
      console.error("[App] Record login failed:", err);
    }
  }

  /* ──────────────────────────────────────────────────────────
     ROUTING after load
  ────────────────────────────────────────────────────────────── */
  function _routeAfterLoad() {
    startCountdownTicker();
    if (!_userData.hasPigeon) {
      showScreen("egg");
      _renderEggScreen();
    } else if (_pigeon) {
      showScreen("home");
      _renderHomeScreen();
      _renderProfileScreen();
      // Show daily mood popup after a short delay
      setTimeout(_showMoodPopup, 800);
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
    // Check both Firestore data AND localStorage — whichever says used, it's used
    const usedToday = egg.lastActionDate === today
      || (_user && _isActionLocked(_user.uid, "egg"));

    // Egg image state
    const eggImg = document.getElementById("egg-img");
    if (eggImg) {
      // For eggDays=3:
      // 0 done -> whole
      // 1 done -> crack1
      // 2 done -> crack2
      // 3 done -> (hatches)
      let eggState = "egg_whole";
      if (daysDone === 1) eggState = "egg_crack1";
      if (daysDone >= 2) eggState = "egg_crack2";

      eggImg.src = PIGEON_CONFIG.eggPath(eggState);
      eggImg.onerror = () => {
        eggImg.onerror = null;
        eggImg.src = _svgEggFallback(eggState);
      };
    }

    const daysLabel = document.getElementById("egg-days-label");
    if (daysLabel) daysLabel.textContent =
      daysLeft <= 0 ? "Ready to hatch! 🎉" : `${daysLeft} day${daysLeft !== 1 ? "s" : ""} until hatch`;

    // Streak
    const streak = _calcStreak(_userData.loginDates ?? []);
    const streakEl = document.getElementById("streak-count");
    if (streakEl) streakEl.textContent = streak;

    // Used today
    const grid    = document.getElementById("action-grid");
    const usedMsg = document.getElementById("daily-used-msg");
    if (grid && usedMsg) {
      if (usedToday) {
        grid.style.display = "none";
        usedMsg.style.display = "flex";
        // Inject countdown into egg screen
        let cdWrap = document.getElementById("egg-countdown");
        if (!cdWrap) {
          cdWrap = document.createElement("div");
          cdWrap.id = "egg-countdown";
          cdWrap.className = "countdown-wrap";
          cdWrap.innerHTML = `
            <span class="countdown-label">Next Nudge in</span>
            <span class="countdown-timer js-countdown">—</span>
            <span class="countdown-sub">Come back tomorrow to nurture your egg</span>
          `;
          usedMsg.parentNode.insertBefore(cdWrap, usedMsg.nextSibling);
        }
      } else {
        grid.style.display = "grid";
        usedMsg.style.display = "none";
        const cdWrap = document.getElementById("egg-countdown");
        if (cdWrap) cdWrap.remove();
      }
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

    // ── Gate check: localStorage first (instant), then Firestore ──
    if (_isActionLocked(_user.uid, "egg")) {
      showToast("Already done today — come back tomorrow!");
      _renderEggScreen();
      return;
    }

    // Lock immediately — BEFORE the Firestore write
    // This prevents a refresh mid-write from granting a second action
    _lockAction(_user.uid, "egg");

    // Animate egg
    const wrap = document.getElementById("egg-wrap");
    if (wrap) {
      const animClass = `do-${action}`;
      wrap.classList.remove("do-shake","do-heat","do-lick");
      void wrap.offsetWidth;
      wrap.classList.add(animClass);
      if (action === "shake") setTimeout(() => wrap.classList.remove(animClass), 700);
    }

    try {
      // Re-fetch pigeon doc to get latest incubation log
      const data = await DB.getPigeon(_user.uid);

      // Double-check — belt and suspenders
      if (data && data.lastActionDate === today) {
        showToast("Already done today — come back tomorrow!");
        _pigeon = data;
        _renderEggScreen();
        return;
      }

      const incubationLog = data ? (data.incubationLog ?? []) : [];

      incubationLog.push(action);

      const pigeonData = {
        uid:            _user.uid,
        incubationLog,
        lastActionDate: today,
        hatched:        false,
      };

      if (data) await DB.updatePigeon(_user.uid, pigeonData);
      else await DB.setPigeon(_user.uid, pigeonData);

      _pigeon = pigeonData;
      showToast(`🐣 ${action.charAt(0).toUpperCase() + action.slice(1)} done! Come back tomorrow.`);

      const daysDone = incubationLog.filter(Boolean).length;
      if (daysDone >= GAME_CONFIG.eggDays) {
        setTimeout(_triggerHatch, 1000);
      } else {
        _renderEggScreen();
      }
    } catch (err) {
      console.error("[App] Egg action failed:", err);
      showToast("Action failed. Check Firestore permissions.");
      // Unlock so they can try again
      localStorage.removeItem(`pigeons_${_user.uid}_egg`);
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
      xp:            0,
      bond:          50,
      hatched:       true,
      hatchDate:     todayStr(),
      incubationLog: _pigeon?.incubationLog ?? [],
      lastFed:       null,
      lastPlayed:    null,
      lastTrained:   null,
    };

    try {
      await DB.setPigeon(_user.uid, pigeonData);
      await DB.updatePlayer(_user.uid, { hasPigeon: true, pigeonId: _user.uid });

      _pigeon = pigeonData;
      _userData.hasPigeon = true;

      _renderHomeScreen();
      _renderProfileScreen();
    } catch (err) {
      console.error("[App] Save pigeon failed:", err);
      showToast("Failed to hatch pigeon. Check permissions.");
    }
  }

  /* ──────────────────────────────────────────────────────────
     MOOD POPUP  (daily fortune cookie)
  ────────────────────────────────────────────────────────────── */
  function _showMoodPopup() {
    if (!_pigeon) return;

    const missedDays = _calcMissedDays(_userData.loginDates ?? []);
    const rehabDay   = _pigeon.rehabDay ?? 0;
    const { mood, message } = getDailyMessage(
      _pigeon.bond ?? 50,
      missedDays,
      rehabDay,
      _user?.uid ?? ""
    );

    // Build pigeon rig inside popup
    const moodRig = document.getElementById("mood-rig");
    if (moodRig) buildPigeonRig(moodRig, _pigeon.traits, { idle: mood !== "feral", [mood]: mood === "feral" });

    const card = document.getElementById("mood-card");
    if (card) {
      card.className = `mood-card ${mood}`;
    }

    const nameEl = document.getElementById("mood-name");
    if (nameEl) nameEl.textContent = _pigeon.name ?? "Your pigeon";

    const msgEl = document.getElementById("mood-message");
    if (msgEl) msgEl.textContent = `"${message}"`;

    // Show overlay
    const overlay = document.getElementById("mood-overlay");
    if (overlay) {
      overlay.classList.remove("hidden");
      overlay.classList.add("show");
    }
  }

  function _hideMoodPopup() {
    const overlay = document.getElementById("mood-overlay");
    if (!overlay) return;
    overlay.classList.remove("show");
    overlay.classList.add("hidden");
    // Belt-and-suspenders: force pointer-events off immediately
    overlay.style.pointerEvents = "none";
    // Re-enable pointer-events when shown again (handled by .show CSS)
    overlay.addEventListener("transitionend", () => {
      if (!overlay.classList.contains("show")) {
        overlay.style.pointerEvents = "";
      }
    }, { once: true });
  }

  /* ──────────────────────────────────────────────────────────
     HOME SCREEN
  ────────────────────────────────────────────────────────────── */
  function _renderHomeScreen() {
    if (!_pigeon) return;
    const traits = _pigeon.traits;
    const stats  = _pigeon.stats;
    const today  = todayStr();

    const nameEl = document.getElementById("home-pigeon-name");
    if (nameEl) nameEl.textContent = _pigeon.name ?? "Pigeon";

    const streak = _calcStreak(_userData.loginDates ?? []);
    const streakEl = document.getElementById("home-streak");
    if (streakEl) streakEl.textContent = streak;

    // Mood state
    const missedDays = _calcMissedDays(_userData.loginDates ?? []);
    const rehabDay   = _pigeon.rehabDay ?? 0;
    const mood = getMood(_pigeon.bond ?? 50, missedDays, rehabDay);

    // Build pigeon rig with correct animation state
    const rig = document.getElementById("home-rig");
    if (rig) {
      buildPigeonRig(rig, traits, { idle: mood === "happy" || mood === "neutral" });
      // Apply mood-specific animation class
      rig.classList.remove("feral","rehab","low-hp");
      if (mood === "feral") rig.classList.add("feral");
      if (mood === "rehab") rig.classList.add("rehab");
    }

    // Mood badge
    const MOOD_LABELS = {
      happy:   "😄 Happy",
      neutral: "😐 Neutral",
      upset:   "😤 Upset",
      feral:   "💀 FERAL",
      rehab:   "🩹 Recovering",
    };
    const badge = document.getElementById("mood-badge");
    if (badge) {
      badge.className = `mood-badge show ${mood}`;
      badge.textContent = MOOD_LABELS[mood] ?? mood;
    }

    updateBondUI(_pigeon.bond ?? 50);
    renderStatChips("quick-stats", stats);

    // Mark care cards as done and show countdowns
    const CARE_FIELDS  = { food: "lastFed", play: "lastPlayed", train: "lastTrained" };
    const CARE_LABELS  = { food: "Next Feed", play: "Next Play", train: "Next Training" };
    const CARE_SUBS    = { food: "Your bird is full", play: "Pigeon is tired", train: "Muscles need rest" };

    ["food","play","train"].forEach((care) => {
      const btn   = document.getElementById(`care-${care}`);
      const field = CARE_FIELDS[care];
      // Check Firestore data OR localStorage — both count as done
      const done  = _pigeon[field] === today
        || (_user && _isActionLocked(_user.uid, care));
      if (btn) btn.classList.toggle("done", done);
    });

    // Single countdown below care grid — shows time until midnight reset
    let cdWrap = document.getElementById("care-countdown");
    const anyDone = ["food","play","train"].some(
      (c) => _pigeon[CARE_FIELDS[c]] === today
    );
    if (anyDone) {
      if (!cdWrap) {
        cdWrap = document.createElement("div");
        cdWrap.id = "care-countdown";
        cdWrap.className = "countdown-wrap";
        cdWrap.innerHTML = `
          <span class="countdown-label">Next Peck available in</span>
          <span class="countdown-timer js-countdown">—</span>
          <span class="countdown-sub">Actions reset at midnight</span>
        `;
        const careSection = document.querySelector(".care-section");
        if (careSection) careSection.appendChild(cdWrap);
      }
    } else {
      if (cdWrap) cdWrap.remove();
    }
  }

  function _initCareActions() {
    document.querySelector(".care-grid")?.addEventListener("click", async (e) => {
      const card = e.target.closest(".care-card");
      if (!card || card.classList.contains("done")) return;
      await _doCareAction(card.dataset.care);
    });
  }

  async function _doCareAction(careType) {
    const today  = todayStr();
    const field  = careType === "food" ? "lastFed" : careType === "play" ? "lastPlayed" : "lastTrained";

    // ── Gate check: localStorage first ──
    if (_isActionLocked(_user.uid, careType)) {
      showToast("Already done today — come back tomorrow!");
      return;
    }

    // Lock immediately before any async work
    _lockAction(_user.uid, careType);

    try {
      // Double-check
      const data = await DB.getPigeon(_user.uid);
      if (data && data[field] === today) {
        showToast("Already done today — come back tomorrow!");
        _pigeon = data;
        _renderHomeScreen();
        return;
      }

      const bondGain = GAME_CONFIG[`bondGain${careType.charAt(0).toUpperCase() + careType.slice(1)}`] ?? 5;
      const newBond  = Math.min(GAME_CONFIG.bondMax, (_pigeon.bond ?? 50) + bondGain);

      // XP gain: 20 per care action
      const xpGain = 20;
      const { level, xp } = _applyXP(_pigeon.level ?? 1, _pigeon.xp ?? 0, xpGain);

      let statUpdates = { level, xp };
      if (careType === "train") {
        const weakest = _weakestStat(_pigeon.stats);
        const stats = { ..._pigeon.stats };
        stats[weakest] = Math.min(GAME_CONFIG.statMax, (stats[weakest] ?? 0) + 3);
        statUpdates.stats = stats;
      }

      await DB.updatePigeon(_user.uid, {
        [field]: today,
        bond:    newBond,
        ...statUpdates,
      });

      _pigeon[field] = today;
      _pigeon.bond   = newBond;
      _pigeon.level  = level;
      _pigeon.xp     = xp;

      if (careType === "train") {
        const w = _weakestStat(_pigeon.stats);
        _pigeon.stats[w] = Math.min(GAME_CONFIG.statMax, (_pigeon.stats[w] ?? 0) + 3);
      }

      const LABELS = { food: "🍞 Fed! Come back tomorrow.", play: "🎮 Played! See you tomorrow.", train: "🏋️ Trained! Rest up." };
      showToast(LABELS[careType]);
      _renderHomeScreen();
      triggerAnimation(document.getElementById("home-rig"), "victory", 900);
    } catch (err) {
      console.error("[App] Care action failed:", err);
      showToast("Action failed. Check Firestore permissions.");
      localStorage.removeItem(`pigeons_${_user.uid}_${careType}`);
      _renderHomeScreen();
    }
  }

  function _weakestStat(stats) {
    const keys = Object.keys(stats);
    return keys.reduce((min, k) => stats[k] < stats[min] ? k : min, keys[0]);
  }

  /* ──────────────────────────────────────────────────────────
     PROFILE SCREEN
  ────────────────────────────────────────────────────────────── */
  function _renderProfileScreen() {
    if (!_pigeon || !_userData) return;

    const rigEl = document.getElementById("profile-rig");
    if (rigEl) buildPigeonRig(rigEl, _pigeon.traits, { idle: true });

    const nameEl = document.getElementById("profile-name");
    if (nameEl) nameEl.textContent = _pigeon.name ?? "—";

    const subEl = document.getElementById("profile-sub");
    if (subEl) subEl.textContent = `${(_userData.battleLog ?? []).length} battles`;

    updateLevelUI(_pigeon.level ?? 1, _pigeon.xp ?? 0);
    renderFullStatCard("profile-stat-card", _pigeon.stats);

    // Battle log
    const logEl = document.getElementById("battle-log");
    if (logEl) {
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
    }

    // Streak dots (last 7 days)
    const dotsEl = document.getElementById("streak-dots");
    if (dotsEl) {
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
    }

    const loginsEl = document.getElementById("total-logins");
    if (loginsEl) loginsEl.textContent = _userData.totalLogins ?? 0;
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

    // Use fresh data from DB to avoid state desync on concurrent updates
    try {
      const freshUser = await DB.getPlayer(_user.uid);
      if (!freshUser) return;

      const newLog = [...(freshUser.battleLog ?? []), entry];
      const newElo = Math.max(0, (freshUser.elo ?? GAME_CONFIG.eloDefault) + eloDelta);

      await DB.updatePlayer(_user.uid, {
        battleLog: newLog,
        elo:       newElo,
      });

      // XP gain from battle: 50 for win, 20 for loss
      const xpGain = won ? 50 : 20;
      const { level, xp } = _applyXP(_pigeon.level ?? 1, _pigeon.xp ?? 0, xpGain);
      await DB.updatePigeon(_user.uid, { level, xp });
      _pigeon.level = level;
      _pigeon.xp = xp;

      // Update local state
      _userData.battleLog = newLog;
      _userData.elo       = newElo;

      const eloEl = document.getElementById("player-elo");
      if (eloEl) eloEl.textContent = _formatNumber(newElo);
      _renderProfileScreen();
    } catch (err) {
      console.error("[App] Record battle result failed:", err);
    }
  }

  /* ──────────────────────────────────────────────────────────
     NAV
  ────────────────────────────────────────────────────────────── */
  function _initNav() {
    document.querySelectorAll(".nav-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const screen = btn.dataset.screen;
        if (screen === "battle") {
          // Only show matchmaking if NOT currently in a battle
          if (!Battle.isInBattle()) {
            document.getElementById("matchmaking")?.classList.remove("hidden");
            _renderLeaderboard();
          }
        }
        if (screen === "profile") _renderProfileScreen();
        showScreen(screen);
      });
    });
  }

  /* ──────────────────────────────────────────────────────────
     LEADERBOARD preview
  ────────────────────────────────────────────────────────────── */
  async function _renderLeaderboard(query = "") {
    const el = document.getElementById("leaderboard-preview");
    if (!el) return;

    // Guard: ensure user is authenticated before calling DB.getLeaderboard()
    if (!_user) {
      el.innerHTML = `<p class="empty-state">Please login to view leaderboard</p>`;
      return;
    }

    el.innerHTML = `<p class="empty-state">Loading...</p>`;

    try {
      let list = [];
      if (query) {
        list = await DB.searchPlayers(query);
      } else {
        list = await DB.getLeaderboard();
        list = list.slice(0, 5);
      }

      el.innerHTML = "";

      if (list.length === 0) {
        el.innerHTML = `<p class="empty-state">No players found</p>`;
        return;
      }

      list.forEach((d, i) => {
        const row = document.createElement("div");
        row.className = "lb-row";
        const formattedElo = _formatNumber(d.elo ?? 1000);
        const isMe = d.uid === _user.uid;

        row.innerHTML = `
          <span class="lb-rank">${query ? "" : "#" + (i + 1)}</span>
          <span class="lb-name">${d.username ?? "Pigeon owner"}</span>
          <div class="lb-right">
            <span class="lb-elo">${formattedElo}</span>
            ${!isMe ? `<button class="btn-challenge" data-uid="${d.uid}" data-username="${d.username}">Challenge</button>` : ""}
          </div>
        `;
        el.appendChild(row);
      });

      // Wire up challenge buttons
      el.querySelectorAll(".btn-challenge").forEach(btn => {
        btn.onclick = () => {
          const targetUid = btn.dataset.uid;
          const targetUsername = btn.dataset.username;
          _challengePlayer(targetUid, targetUsername);
        };
      });
    } catch (err) {
      console.error("[App] Leaderboard failed:", err);
      const isPermissionError = err.message?.includes("permissions") || err.code === "permission-denied";
      el.innerHTML = `
        <div class="empty-state" style="flex-direction:column;gap:8px;text-align:center">
          <i class="fa-solid fa-triangle-exclamation"></i>
          <span>Leaderboard unavailable</span>
          ${isPermissionError ? '<span style="font-size:11px;opacity:0.7">Missing database permissions or indexes.</span>' : ''}
        </div>
      `;
    }
  }

  async function _challengePlayer(targetUid, targetUsername) {
    if (!_pigeon) { showToast("You need a pigeon first!"); return; }
    if (Battle.isInBattle()) { showToast("Already in a battle!"); return; }

    Battle.sendChallenge({ uid: targetUid, username: targetUsername }, {
      uid:    _user.uid,
      name:   _pigeon.name,
      traits: _pigeon.traits,
      stats:  _pigeon.stats,
    });
  }

  function _initChallenges() {
    const btnChallenges = document.getElementById("btn-challenges");
    const modal = document.getElementById("challenges-modal");
    const btnClose = document.getElementById("btn-close-challenges");
    const searchInput = document.getElementById("player-search");

    btnChallenges?.addEventListener("click", () => {
      modal?.classList.remove("hidden");
      _renderChallengesList();
    });

    btnClose?.addEventListener("click", () => {
      modal?.classList.add("hidden");
    });

    searchInput?.addEventListener("input", (e) => {
      const q = e.target.value.trim();
      _renderLeaderboard(q);
    });

    // Periodically check for incoming challenges
    setInterval(_updateChallengeCount, 10000);
    _updateChallengeCount();
  }

  async function _updateChallengeCount() {
    if (!_user) return;
    try {
      const challenges = await DB.getIncomingChallenges(_user.uid);
      const countEl = document.getElementById("challenge-count");
      if (countEl) {
        countEl.textContent = challenges.length;
        countEl.style.display = challenges.length > 0 ? "inline-block" : "none";
      }
    } catch (err) {
      console.error("[App] Update challenge count failed:", err);
    }
  }

  async function _renderChallengesList() {
    const el = document.getElementById("challenges-list");
    if (!el) return;
    el.innerHTML = `<p class="empty-state">Loading challenges...</p>`;

    try {
      const list = await DB.getIncomingChallenges(_user.uid);
      el.innerHTML = "";

      if (list.length === 0) {
        el.innerHTML = `<p class="empty-state">No pending challenges</p>`;
        return;
      }

      list.forEach((c) => {
        const row = document.createElement("div");
        row.className = "challenge-row";
        row.innerHTML = `
          <div class="challenge-info">
            <span class="challenge-host">${c.hostPigeon.name}</span>
            <span class="challenge-sub">from ${c.hostId.slice(0, 6)}...</span>
          </div>
          <button class="btn-accept" data-id="${c.id}">Accept</button>
        `;
        el.appendChild(row);
      });

      el.querySelectorAll(".btn-accept").forEach(btn => {
        btn.onclick = () => {
          const battleId = btn.dataset.id;
          document.getElementById("challenges-modal").classList.add("hidden");
          Battle.acceptChallenge(battleId, {
            uid:    _user.uid,
            name:   _pigeon.name,
            traits: _pigeon.traits,
            stats:  _pigeon.stats,
          });
          showScreen("battle");
        };
      });
    } catch (err) {
      console.error("[App] Render challenges failed:", err);
      el.innerHTML = `<p class="empty-state">Error loading challenges</p>`;
    }
  }

  /* ──────────────────────────────────────────────────────────
     HELPERS
  ────────────────────────────────────────────────────────────── */
  /* ──────────────────────────────────────────────────────────
     MISSED DAYS + PENALTY SYSTEM
  ────────────────────────────────────────────────────────────── */

  function _calcMissedDays(loginDates) {
    // Count consecutive missed days going backwards from yesterday
    let missed = 0;
    const d = new Date();
    d.setDate(d.getDate() - 1); // start from yesterday
    while (missed < 30) {
      const s = d.toISOString().slice(0, 10);
      if ((loginDates ?? []).includes(s)) break;
      missed++;
      d.setDate(d.getDate() - 1);
    }
    return missed;
  }

  async function _applyPenalties(missedDays) {
    if (!_pigeon || missedDays === 0) return;

    const updates  = {};
    let   bond     = _pigeon.bond ?? 50;
    const stats    = { ..._pigeon.stats };
    let   rehabDay = _pigeon.rehabDay ?? 0;

    if (missedDays === 1) {
      bond = Math.max(0, bond - 10);
    } else if (missedDays === 2 || missedDays === 3) {
      bond = Math.max(0, bond - 20);
      // Drop one random stat by 2
      const keys = Object.keys(stats);
      const target = keys[Math.floor(Math.random() * keys.length)];
      stats[target] = Math.max(0, (stats[target] ?? 0) - 2);
      updates.stats = stats;
    } else {
      // 4+ days — feral decay
      bond = Math.max(0, bond - Math.min(15 * (missedDays - 3), 50));
      // Decay highest stat by 2% per missed day (capped at -10)
      const highestKey = Object.keys(stats).reduce((a,b) => stats[a]>stats[b]?a:b);
      const decay = Math.min(10, Math.floor(stats[highestKey] * 0.02 * missedDays));
      stats[highestKey] = Math.max(0, stats[highestKey] - decay);
      updates.stats = stats;
    }

    // If returning from feral (bond was < 15, now recovering)
    if (_pigeon.bond < 15 && bond > (_pigeon.bond ?? 50)) {
      rehabDay = 0; // reset rehab if somehow going up
    }
    if (bond < 15 && (_pigeon.bond ?? 50) >= 15) {
      // Just crossed into feral — start feral state
      updates.feralSince = todayStr();
    }

    updates.bond = bond;
    updates.rehabDay = rehabDay;

    try {
      await DB.updatePigeon(_user.uid, updates);
      _pigeon.bond    = bond;
      _pigeon.stats   = stats;
      _pigeon.rehabDay = rehabDay;
      if (updates.feralSince) _pigeon.feralSince = updates.feralSince;
    } catch (err) {
      console.error("[App] Apply penalties failed:", err);
    }
  }

  async function _checkRehab() {
    // Called on login — if pigeon is feral and player is logging in,
    // increment rehab counter. 3 consecutive days clears feral.
    if (!_pigeon) return;
    const bond = _pigeon.bond ?? 50;
    if (bond >= 15) return; // not feral

    const rehabDay = (_pigeon.rehabDay ?? 0) + 1;
    const updates  = { rehabDay };

    if (rehabDay >= 3) {
      // Fully recovered! Give bond a boost and clear feral
      updates.bond     = 35;
      updates.rehabDay = 0;
      updates.feralSince = null;
      _pigeon.bond     = 35;
      _pigeon.rehabDay = 0;
      showToast("🕊️ Your pigeon trusts you again!");
    } else {
      _pigeon.rehabDay = rehabDay;
      showToast(`🩹 Rehab day ${rehabDay}/3 — keep coming back!`);
    }

    try {
      await DB.updatePigeon(_user.uid, updates);
    } catch (err) {
      console.error("[App] Check rehab failed:", err);
    }
  }

  function _applyXP(level, xp, gain) {
    let newXP = xp + gain;
    let newLevel = level;
    while (true) {
      const nextXP = GAME_CONFIG.getXPForLevel(newLevel + 1);
      if (newXP >= nextXP) {
        newLevel++;
      } else {
        break;
      }
    }
    return { level: newLevel, xp: newXP };
  }

  function _formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    return num;
  }

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

  return { boot, saveNewPigeon, recordBattleResult };
})();

/* ── Start the app ── */
document.addEventListener("DOMContentLoaded", App.boot);
