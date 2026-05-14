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

/* ── Vercel serverless function base URL ─────────────────── */
//  This is your deployed Vercel domain — update if it changes
const API_BASE = "https://pigeons.vercel.app/api";
//  Only one endpoint:
//    POST /api/discord-token  (not used — X login is Firebase-native, no edge fn needed)

/* ── Game constants ──────────────────────────────────────── */
const GAME_CONFIG = {
  eggDays:          7,      // days of incubation before hatch
  maxDailyActions:  1,      // one action per day on the egg
  statMax:          100,    // cap for all stats
  baseHP:           100,    // base HP before NGMI bonus
  eloDefault:       1000,   // starting ELO
  bondMax:          100,    // bond meter ceiling
  bondDecayPerDay:  5,      // bond lost per missed care day
  bondGainFeed:     8,
  bondGainPlay:     10,
  bondGainTrain:    5,
  // Stat boosts per incubation action (per day, stacks over 7 days)
  actionBoosts: {
    shake: { yolo: 8,  fomo: 8,  hodl: 0,  fud: 0,  ngmi: 0,  wagmi: 0 },
    heat:  { yolo: 0,  fomo: 0,  hodl: 8,  fud: 0,  ngmi: 0,  wagmi: 8 },
    lick:  { yolo: 0,  fomo: 0,  hodl: 0,  fud: 8,  ngmi: 8,  wagmi: 0 },
  },
  // Every pigeon starts with these regardless of incubation
  statBase: {
    yolo: 20, fomo: 20, hodl: 20, fud: 10, ngmi: 30, wagmi: 20,
  },
};

/* ── Pigeon layer config ─────────────────────────────────── */
const PIGEON_CONFIG = {
  totalVariants: 5,   // how many variants you drew per slot (1…5)

  // Z-order: back → front
  // Z-order bottom→top: leg_near(right foot), tail, torso, leg_far(left leg), head, wings
  layers: ["leg_near", "tail", "torso", "leg_far", "head", "wings"],

  // ─────────────────────────────────────────────────────────
  // WHERE TO PUT YOUR PNG FILES:
  //
  //   assets/pigeon/head/head_1.png       …  head_5.png
  //   assets/pigeon/torso/torso_1.png     …  torso_5.png
  //   assets/pigeon/wings/wings_1.png     …  wings_5.png
  //   assets/pigeon/leg_far/leg_far_1.png …  leg_far_5.png
  //   assets/pigeon/leg_near/leg_near_1.png … leg_near_5.png
  //   assets/pigeon/tail/tail_1.png      … tail_5.png
  //
  //   assets/egg/egg_whole.png
  //   assets/egg/egg_crack1.png
  //   assets/egg/egg_crack2.png
  //   assets/egg/nest_bg.png
  //
  // ALL PNGs must be 500×500px, transparent background.
  // Place the art where it should appear in the final pigeon —
  // the rest of the canvas stays transparent.
  // Stacking all layers at top:0 left:0 assembles the pigeon.
  // ─────────────────────────────────────────────────────────
  imagePath: (layer, variant) =>
    `assets/pigeon/${layer}/${layer}_${variant}.png`,

  eggPath: (state) =>
    `assets/egg/${state}.png`,
};

/* ── Firebase init (runs once before any other script) ────── */
firebase.initializeApp(FIREBASE_CONFIG);
const db   = firebase.firestore();
const auth = firebase.auth();

/* ── Register service worker (PWA) ──────────────────────── */
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").catch(() => {});
}

console.log("[Pigeons] Firebase ready →", FIREBASE_CONFIG.projectId);
