/* ════════════════════════════════════════════════════════════
   pigeon.js  —  Pigeon generation & layer compositor
   ════════════════════════════════════════════════════════════ */

/* ──────────────────────────────────────────────────────────
   SVG fallbacks — used when PNG assets are not yet uploaded.
   Each returns a data: URI that browsers render inline.
────────────────────────────────────────────────────────────── */
const FALLBACK_COLORS = {
  "leg-far":  "#c8a040",
  "wings":    "#7b5ea7",
  "torso":    "#3d7a5a",
  "head":     "#4a7fb5",
  "leg-near": "#b05030",
};

function _svgLayerFallback(layerClass, variant) {
  const color = FALLBACK_COLORS[layerClass] ?? "#555";
  const label = layerClass.replace("-"," ") + " " + variant;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="500">
    <rect width="500" height="500" fill="none"/>
    <ellipse cx="250" cy="250" rx="80" ry="90" fill="${color}" opacity="0.7"/>
    <text x="250" y="255" text-anchor="middle" font-size="18" fill="white" font-family="sans-serif">${label}</text>
  </svg>`;
  return "data:image/svg+xml;base64," + btoa(svg);
}

function _svgEggFallback(state) {
  const cracks = state === "egg_crack2" ? 2 : state === "egg_crack1" ? 1 : 0;
  let crackLines = "";
  if (cracks >= 1) crackLines += `<line x1="230" y1="120" x2="250" y2="180" stroke="#6b4c2a" stroke-width="3"/>`;
  if (cracks >= 2) crackLines += `<line x1="270" y1="140" x2="290" y2="200" stroke="#6b4c2a" stroke-width="2"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="500">
    <rect width="500" height="500" fill="none"/>
    <ellipse cx="250" cy="260" rx="130" ry="170" fill="#e8dcc8" stroke="#b8a080" stroke-width="4"/>
    ${crackLines}
  </svg>`;
  return "data:image/svg+xml;base64," + btoa(svg);
}

/* ──────────────────────────────────────────────────────────
   generatePigeonTraits(seed)
   Given a deterministic seed string (Discord user ID works
   perfectly), returns a traits object like:
   { head:2, torso:5, wings:1, leg_far:3, leg_near:3 }
   leg_far and leg_near are ALWAYS the same index (matched legs).
────────────────────────────────────────────────────────────── */
function generatePigeonTraits(seed) {
  // Simple seeded hash — deterministic for same seed every time
  const hash = (s, salt) => {
    let h = 2166136261; // FNV-1a basis
    for (let i = 0; i < (s + salt).length; i++) {
      h ^= (s + salt).charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h;
  };

  const pick = (salt) => (hash(seed, salt) % PIGEON_CONFIG.totalVariants) + 1;

  const legVariant = pick("legs"); // one pick, used for both leg layers

  return {
    head:     pick("head"),
    torso:    pick("torso"),
    wings:    pick("wings"),
    leg_far:  legVariant,
    leg_near: legVariant,   // always matches
  };
}

/* ──────────────────────────────────────────────────────────
   buildPigeonRig(containerEl, traits, options)
   Injects the 5 image layers into a .pigeon-rig element.
   options: { silhouette: bool, idle: bool }
────────────────────────────────────────────────────────────── */
function buildPigeonRig(containerEl, traits, options = {}) {
  if (!containerEl) return;
  containerEl.innerHTML = "";

  // z-order: leg_far → wings → torso → head → leg_near
  const layerOrder = ["leg_far", "wings", "torso", "head", "leg_near"];

  layerOrder.forEach((layer) => {
    const img = document.createElement("img");
    img.src = PIGEON_CONFIG.imagePath(layer, traits[layer]);
    img.alt = layer;
    img.classList.add("p-layer", layer.replace("_", "-")); // e.g. "leg-far"
    img.draggable = false;

    // Placeholder fallback while art isn't ready yet
    // Remove this block once you have real PNGs
    img.onerror = () => {
      img.style.display = "none"; // silently hide missing layers
    };

    containerEl.appendChild(img);
  });

  // Apply modifier classes
  if (options.silhouette) containerEl.classList.add("silhouette");
  if (options.idle !== false) containerEl.classList.add("idle");
  if (options.mirrored) containerEl.classList.add("mirrored");
}

/* ──────────────────────────────────────────────────────────
   triggerAnimation(rigEl, type, durationMs)
   Adds an animation class, removes it after duration.
   type: 'attacking' | 'hurt' | 'victory' | 'ko' | 'low-hp'
────────────────────────────────────────────────────────────── */
function triggerAnimation(rigEl, type, durationMs = 600) {
  if (!rigEl) return;
  rigEl.classList.remove("idle");
  rigEl.classList.add(type);
  if (type !== "ko" && type !== "low-hp") {
    setTimeout(() => {
      rigEl.classList.remove(type);
      rigEl.classList.add("idle");
    }, durationMs);
  }
}

/* ──────────────────────────────────────────────────────────
   computeStats(incubationLog)
   Turns an array of 7 daily actions into final stats.
   incubationLog: ["shake","heat","lick","shake","heat","heat","heat"]
────────────────────────────────────────────────────────────── */
function computeStats(incubationLog) {
  // Start with base stats
  const stats = { ...GAME_CONFIG.statBase };

  incubationLog.forEach((action) => {
    if (!action || !GAME_CONFIG.actionBoosts[action]) return;
    const boosts = GAME_CONFIG.actionBoosts[action];
    Object.keys(boosts).forEach((stat) => {
      stats[stat] = Math.min(GAME_CONFIG.statMax, stats[stat] + boosts[stat]);
    });
  });

  return stats;
}

/* ──────────────────────────────────────────────────────────
   getBondLabel(bondValue)
   Returns a text label for the bond meter (0–100).
────────────────────────────────────────────────────────────── */
function getBondLabel(val) {
  if (val >= 85) return "Obsessed";
  if (val >= 65) return "Loves you";
  if (val >= 45) return "Neutral";
  if (val >= 25) return "Cold";
  if (val >= 10) return "Resents you";
  return "Hates you";
}

/* ──────────────────────────────────────────────────────────
   updateBondUI(bondValue)
   Updates the bond bar + label on the home screen.
────────────────────────────────────────────────────────────── */
function updateBondUI(bondVal) {
  const fill  = document.getElementById("bond-fill");
  const label = document.getElementById("bond-label");
  if (!fill || !label) return;

  fill.style.width = bondVal + "%";
  // Colour shifts: green (love) → yellow (neutral) → red (hate)
  if (bondVal >= 65) fill.style.background = "var(--clr-green)";
  else if (bondVal >= 35) fill.style.background = "var(--clr-gold)";
  else fill.style.background = "var(--clr-red)";

  label.textContent = getBondLabel(bondVal);
}

/* ──────────────────────────────────────────────────────────
   renderStatChips(containerId, stats)
   Renders the quick-stat strip on the home screen.
────────────────────────────────────────────────────────────── */
function renderStatChips(containerId, stats) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = "";
  const statNames = ["yolo","fomo","hodl","fud","ngmi","wagmi"];
  statNames.forEach((name) => {
    const chip = document.createElement("div");
    chip.className = "stat-chip";
    chip.innerHTML = `
      <span class="stat-chip-name">${name.toUpperCase()}</span>
      <span class="stat-chip-val">${stats[name] ?? 0}</span>
    `;
    el.appendChild(chip);
  });
}

/* ──────────────────────────────────────────────────────────
   renderFullStatCard(containerId, stats)
   Renders the stat card with bars for the profile screen.
────────────────────────────────────────────────────────────── */
function renderFullStatCard(containerId, stats) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = "";
  const statNames = ["yolo","fomo","hodl","fud","ngmi","wagmi"];
  statNames.forEach((name) => {
    const row = document.createElement("div");
    row.className = "stat-card-row";
    const pct = Math.round((stats[name] / GAME_CONFIG.statMax) * 100);
    row.innerHTML = `
      <span class="stat-card-name">${name.toUpperCase()}</span>
      <div class="stat-card-bar-bg">
        <div class="stat-card-bar-fill" style="width:${pct}%"></div>
      </div>
      <span class="stat-card-value">${stats[name]} / ${GAME_CONFIG.statMax}</span>
    `;
    el.appendChild(row);
  });
}

/* ──────────────────────────────────────────────────────────
   renderIncubationLog(containerId, actionLog)
   Renders the 7-day dot history on the egg screen.
────────────────────────────────────────────────────────────── */
const ACTION_EMOJI = { shake: "🫳", heat: "🔥", lick: "👅", missed: "·" };

function renderIncubationLog(containerId, actionLog) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = "";
  for (let i = 0; i < GAME_CONFIG.eggDays; i++) {
    const action = actionLog[i] || "missed";
    const dot = document.createElement("div");
    dot.className = `log-dot ${action}`;
    dot.textContent = ACTION_EMOJI[action] || "·";
    el.appendChild(dot);
  }
}
