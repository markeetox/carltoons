/* ════════════════════════════════════════════════════════════
   config.js  —  ALL your environment variables live here
   ────────────────────────────────────────────────────────────
   HOW TO FILL THIS IN:
   1. Firebase config  →  console.firebase.google.com
      > your project > Project Settings > Your apps > SDK setup
   2. Discord config   →  discord.com/developers/applications
      > your app > OAuth2
   3. Vercel env vars  →  see SETUP.md for the safer approach
      (never commit real secrets to git — use Vercel env vars
       and replace the placeholders below at build time or
       via a serverless edge function)
   ════════════════════════════════════════════════════════════ */

/* ── Firebase ─────────────────────────────────────────────── */
const FIREBASE_CONFIG = {
  apiKey:            "REPLACE_WITH_FIREBASE_API_KEY",
  authDomain:        "REPLACE_WITH_PROJECT_ID.firebaseapp.com",
  projectId:         "REPLACE_WITH_PROJECT_ID",          // e.g. "potos-rgp"
  storageBucket:     "REPLACE_WITH_PROJECT_ID.appspot.com",
  messagingSenderId: "REPLACE_WITH_SENDER_ID",
  appId:             "REPLACE_WITH_APP_ID",
};

/* ── Discord OAuth ───────────────────────────────────────── */
const DISCORD_CONFIG = {
  clientId:     "REPLACE_WITH_DISCORD_CLIENT_ID",        // from Developer Portal
  redirectUri:  "https://world.potos.io/auth/discord",   // must match OAuth2 redirect in Discord
  // clientSecret lives ONLY in your Vercel edge function — never here
};

/* ── Discord role IDs that are allowed to play ───────────── */
const ALLOWED_ROLES = [
  "962202155341742120",   // Captain
  "911659311120400384",   // Pirate
];

/* ── Vercel edge function URL (role verification) ────────── */
const API_BASE = "https://world.potos.io/api";
//  endpoints used:
//    POST /api/discord-roles   → verifies role membership
//    POST /api/discord-token   → exchanges code for access token (server-side)

/* ── Game constants ──────────────────────────────────────── */
const GAME_CONFIG = {
  eggDays:          7,      // days until hatch
  maxDailyActions:  1,      // one action per day on the egg
  statMax:          100,    // cap for all stats
  baseHP:           100,    // starting HP in battle
  eloDefault:       1000,   // starting ELO rating
  bondMax:          100,    // bond meter max
  bondDecayPerDay:  5,      // bond lost per missed day
  bondGainFeed:     8,
  bondGainPlay:     10,
  bondGainTrain:    5,
  // Stat boosts per incubation action (accumulated over 7 days)
  actionBoosts: {
    shake: { yolo: 8,  fomo: 8,  hodl: 0,  fud: 0,  ngmi: 0,  wagmi: 0  },
    heat:  { yolo: 0,  fomo: 0,  hodl: 8,  fud: 0,  ngmi: 0,  wagmi: 8  },
    lick:  { yolo: 0,  fomo: 0,  hodl: 0,  fud: 8,  ngmi: 8,  wagmi: 0  },
  },
  // Base stat floor (every pigeon starts with these)
  statBase: {
    yolo: 20, fomo: 20, hodl: 20, fud: 10, ngmi: 30, wagmi: 20,
  },
};

/* ── Pigeon layer variants (1-indexed, match your filenames) ─ */
const PIGEON_CONFIG = {
  totalVariants: 5,                      // variants per slot (1…5)
  layers: ["leg_far","wings","torso","head","leg_near"],
  //
  // IMAGE PATHS
  // Place your PNGs at exactly these paths inside the project:
  //
  //   assets/pigeon/head/head_1.png  …  head_5.png
  //   assets/pigeon/torso/torso_1.png … torso_5.png
  //   assets/pigeon/wings/wings_1.png … wings_5.png
  //   assets/pigeon/leg_far/leg_far_1.png … leg_far_5.png
  //   assets/pigeon/leg_near/leg_near_1.png … leg_near_5.png
  //   assets/egg/egg_whole.png
  //   assets/egg/egg_crack1.png
  //   assets/egg/egg_crack2.png
  //   assets/egg/nest_bg.png
  //
  imagePath: (layer, variant) =>
    `assets/pigeon/${layer}/${layer}_${variant}.png`,

  eggPath: (state) =>
    `assets/egg/${state}.png`,           // state: egg_whole | egg_crack1 | egg_crack2
};

/* ── Initialise Firebase (called once, before anything else) ─ */
firebase.initializeApp(FIREBASE_CONFIG);
const db   = firebase.firestore();
const auth = firebase.auth();

console.log("[config] Firebase initialised:", FIREBASE_CONFIG.projectId);
