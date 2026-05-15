/* ════════════════════════════════════════════════════════════
   config.js  —  Firebase + game constants
   Project: build-wutju (Pigeons / Carltoons)
   ════════════════════════════════════════════════════════════ */

/* ── Firebase ─────────────────────────────────────────────── */
const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyB2tcGzYn_IXf4LLZ6PzncnqJvjlOarN3s",
  authDomain:        "build-wutju.firebaseapp.com",
  projectId:         "build-wutju",
  storageBucket:     "build-wutju.firebasestorage.app",
  messagingSenderId: "274875436130",
  appId:             "1:274875436130:web:e7b35e071ef88aaa35553b",
  measurementId:     "G-Q5WK6BL4PS",
};

/* ── Vercel edge function base URL ───────────────────────── */
const API_BASE = "https://pigeons.vercel.app/api";

/* ── Game constants ──────────────────────────────────────── */
const GAME_CONFIG = {
  eggDays:          7,
  maxDailyActions:  1,
  statMax:          100,
  baseHP:           100,
  eloDefault:       1000,
  bondMax:          100,
  bondDecayPerDay:  5,
  bondGainFeed:     8,
  bondGainPlay:     10,
  bondGainTrain:    5,
  actionBoosts: {
    shake: { yolo: 8,  fomo: 8,  hodl: 0,  fud: 0,  ngmi: 0,  wagmi: 0 },
    heat:  { yolo: 0,  fomo: 0,  hodl: 8,  fud: 0,  ngmi: 0,  wagmi: 8 },
    lick:  { yolo: 0,  fomo: 0,  hodl: 0,  fud: 8,  ngmi: 8,  wagmi: 0 },
  },
  statBase: {
    yolo: 20, fomo: 20, hodl: 20, fud: 10, ngmi: 30, wagmi: 20,
  },
};

/* ── Pigeon layer config ─────────────────────────────────── */
const PIGEON_CONFIG = {

  // Layer z-order — bottom to top
  // leg_far (back leg), tail, torso, leg_near (front leg), head, wings
  layers: ["leg_far", "tail", "torso", "leg_near", "head", "wings"],

  // Variant count PER layer — how many PNG files you have for each
  variants: {
    leg_far:  6,   // leg_far_1.png  … leg_far_6.png
    tail:     6,   // tail_1.png     … tail_6.png
    torso:    6,   // torso_1.png    … torso_6.png
    leg_near: 6,   // leg_near_1.png … leg_near_6.png
    head:     9,   // head_1.png     … head_9.png
    wings:    6,   // wings_1.png    … wings_6.png
  },

  // ─────────────────────────────────────────────────────────
  // WHERE TO PUT YOUR PNG FILES:
  //
  //   assets/pigeon/leg_far/leg_far_1.png  … leg_far_6.png
  //   assets/pigeon/tail/tail_1.png        … tail_6.png
  //   assets/pigeon/torso/torso_1.png      … torso_6.png
  //   assets/pigeon/leg_near/leg_near_1.png … leg_near_6.png
  //   assets/pigeon/head/head_1.png        … head_9.png
  //   assets/pigeon/wings/wings_1.png      … wings_6.png
  //
  //   assets/egg/egg_whole.png
  //   assets/egg/egg_crack1.png
  //   assets/egg/egg_crack2.png
  //   assets/egg/nest_bg.png
  //
  //   assets/bg/home_bg.png   ← your pigeon background scene
  //
  // ALL PNGs: 500×500px, transparent background.
  // Art sits where it belongs in the canvas — transparency fills the rest.
  // Stack all layers at top:0 left:0 → pigeon assembles automatically.
  // ─────────────────────────────────────────────────────────

  imagePath: (layer, variant) =>
    `assets/pigeon/${layer}/${layer}_${variant}.png`,

  eggPath: (state) =>
    `assets/egg/${state}.png`,
};

/* ── Firebase init ───────────────────────────────────────── */
firebase.initializeApp(FIREBASE_CONFIG);
const db   = firebase.firestore();
const auth = firebase.auth();

/* ── PWA service worker ──────────────────────────────────── */
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").catch(() => {});
}

console.log("[Pigeons] Firebase ready →", FIREBASE_CONFIG.projectId);
