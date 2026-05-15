/* ════════════════════════════════════════════════════════════
   pigeon.js  —  Pigeon generation, compositor & animations
   ════════════════════════════════════════════════════════════ */

/* ──────────────────────────────────────────────────────────
   SVG fallbacks — shown when real PNGs aren't uploaded yet
────────────────────────────────────────────────────────────── */
const FALLBACK_COLORS = {
  "leg-far":  "#c8a040",
  "tail":     "#6d4c8a",
  "torso":    "#3d7a5a",
  "leg-near": "#b05030",
  "head":     "#4a7fb5",
  "wings":    "#7b5ea7",
};

function _svgLayerFallback(layerClass, variant) {
  const color = FALLBACK_COLORS[layerClass] ?? "#555";
  const label = layerClass.replace(/-/g," ") + " " + variant;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="500">
    <rect width="500" height="500" fill="none"/>
    <ellipse cx="250" cy="250" rx="80" ry="90" fill="${color}" opacity="0.7"/>
    <text x="250" y="255" text-anchor="middle" font-size="18"
      fill="white" font-family="sans-serif">${label}</text>
  </svg>`;
  return "data:image/svg+xml;base64," + btoa(svg);
}

function _svgEggFallback(state) {
  const cracks = state === "egg_crack2" ? 2 : state === "egg_crack1" ? 1 : 0;
  let lines = "";
  if (cracks >= 1) lines += `<line x1="230" y1="120" x2="250" y2="180" stroke="#6b4c2a" stroke-width="3"/>`;
  if (cracks >= 2) lines += `<line x1="270" y1="140" x2="290" y2="200" stroke="#6b4c2a" stroke-width="2"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="500">
    <rect width="500" height="500" fill="none"/>
    <ellipse cx="250" cy="260" rx="130" ry="170"
      fill="#e8dcc8" stroke="#b8a080" stroke-width="4"/>
    ${lines}
  </svg>`;
  return "data:image/svg+xml;base64," + btoa(svg);
}

/* ──────────────────────────────────────────────────────────
   generatePigeonTraits(seed)
   Returns a deterministic traits object for a given uid seed.
   Each layer picks from its own variant pool using per-layer counts.
   Legs are always matched (same index for leg_far + leg_near).
────────────────────────────────────────────────────────────── */
function generatePigeonTraits(seed) {
  // FNV-1a seeded hash — deterministic, same seed = same pigeon every time
  const hash = (s, salt) => {
    let h = 2166136261;
    const str = s + salt;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h;
  };

  // Pick variant for a layer — respects per-layer variant count
  const pick = (layer, salt) => {
    const count = PIGEON_CONFIG.variants[layer] ?? 6;
    return (hash(seed, salt) % count) + 1;
  };

  // Legs share the same variant index (matched pair)
  const legVariant = pick("leg_far", "legs");

  return {
    leg_far:  legVariant,
    tail:     pick("tail",  "tail"),
    torso:    pick("torso", "torso"),
    leg_near: legVariant,       // always matches leg_far
    head:     pick("head",  "head"),
    wings:    pick("wings", "wings"),
  };
}

/* ──────────────────────────────────────────────────────────
   buildPigeonRig(containerEl, traits, options)
   Stacks all 6 layer images inside a .pigeon-rig container.
   Layer order comes from PIGEON_CONFIG.layers (bottom → top).

   options:
     idle      bool   — add .idle animation class (default true)
     silhouette bool  — add .silhouette class (hatch reveal)
     mirrored   bool  — add .mirrored class (opponent in battle)
────────────────────────────────────────────────────────────── */
function buildPigeonRig(containerEl, traits, options = {}) {
  if (!containerEl) return;
  containerEl.innerHTML = "";

  // Always use the layer order from config — single source of truth
  const layerOrder = PIGEON_CONFIG.layers;

  layerOrder.forEach((layer) => {
    const img        = document.createElement("img");
    const layerClass = layer.replace(/_/g, "-");   // "leg_far" → "leg-far"
    const variant    = traits[layer] ?? 1;

    img.src      = PIGEON_CONFIG.imagePath(layer, variant);
    img.alt      = layer;
    img.draggable = false;
    img.classList.add("p-layer", layerClass);

    // Silent fallback to inline SVG if PNG not uploaded yet
    img.onerror = () => {
      img.onerror = null;
      img.src = _svgLayerFallback(layerClass, variant);
    };

    containerEl.appendChild(img);
  });

  // Apply state classes
  if (options.silhouette)   containerEl.classList.add("silhouette");
  if (options.mirrored)     containerEl.classList.add("mirrored");
  // Idle is the default — only skip if explicitly false
  if (options.idle !== false) containerEl.classList.add("idle");
}

/* ──────────────────────────────────────────────────────────
   triggerAnimation(rigEl, type, durationMs)
   One-shot or toggle animation classes on a rig element.
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
   Converts 7 daily actions into final stat values.
────────────────────────────────────────────────────────────── */
function computeStats(incubationLog) {
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
   Bond meter helpers
────────────────────────────────────────────────────────────── */
function getBondLabel(val) {
  if (val >= 85) return "Obsessed";
  if (val >= 65) return "Loves you";
  if (val >= 45) return "Neutral";
  if (val >= 25) return "Cold";
  if (val >= 10) return "Resents you";
  return "Hates you";
}

function updateBondUI(bondVal) {
  const fill  = document.getElementById("bond-fill");
  const label = document.getElementById("bond-label");
  if (!fill || !label) return;
  fill.style.width = bondVal + "%";
  if (bondVal >= 65)      fill.style.background = "var(--clr-green)";
  else if (bondVal >= 35) fill.style.background = "var(--clr-gold)";
  else                    fill.style.background = "var(--clr-red)";
  label.textContent = getBondLabel(bondVal);
}

/* ──────────────────────────────────────────────────────────
   Stat display helpers
────────────────────────────────────────────────────────────── */
function renderStatChips(containerId, stats) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = "";
  ["yolo","fomo","hodl","fud","ngmi","wagmi"].forEach((name) => {
    const chip = document.createElement("div");
    chip.className = "stat-chip";
    chip.innerHTML = `
      <span class="stat-chip-name">${name.toUpperCase()}</span>
      <span class="stat-chip-val">${stats[name] ?? 0}</span>
    `;
    el.appendChild(chip);
  });
}

function renderFullStatCard(containerId, stats) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = "";
  ["yolo","fomo","hodl","fud","ngmi","wagmi"].forEach((name) => {
    const row = document.createElement("div");
    row.className = "stat-card-row";
    const pct = Math.round(((stats[name] ?? 0) / GAME_CONFIG.statMax) * 100);
    row.innerHTML = `
      <span class="stat-card-name">${name.toUpperCase()}</span>
      <div class="stat-card-bar-bg">
        <div class="stat-card-bar-fill" style="width:${pct}%"></div>
      </div>
      <span class="stat-card-value">${stats[name] ?? 0} / ${GAME_CONFIG.statMax}</span>
    `;
    el.appendChild(row);
  });
}

/* ──────────────────────────────────────────────────────────
   Incubation log dots
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
