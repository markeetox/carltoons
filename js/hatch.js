/* ════════════════════════════════════════════════════════════
   hatch.js  —  7-step hatch sequence controller
   ════════════════════════════════════════════════════════════ */

const Hatch = (() => {
  let _traits = null;
  let _stats  = null;
  let _revealStep = 0;

  const REVEAL_STEPS = [
    { layers: [],                          label: "Something's coming…"   },
    { layers: ["leg-far","leg-near"],      label: "Legs! Stomp stomp."    },
    { layers: ["wings"],                   label: "Wings unfolding…"      },
    { layers: ["torso"],                   label: "Body taking shape…"    },
    { layers: ["head"],                    label: "There it is."          },
  ];

  /* ── Show a hatch step by id ── */
  function _showStep(stepId) {
    document.querySelectorAll(".hatch-step").forEach((s) => {
      s.classList.remove("active");
    });
    const el = document.getElementById(stepId);
    if (el) el.classList.add("active");
  }

  /* ── Start the whole sequence ── */
  function start(traits, stats) {
    _traits = traits;
    _stats  = stats;
    _revealStep = 0;

    showScreen("hatch");
    document.getElementById("bottom-nav").classList.add("hidden");

    // Step A: shaking egg — tap to hatch
    _showStep("hatch-step-egg");

    const eggWrap = document.getElementById("hatch-egg-wrap");
    eggWrap.addEventListener("click", _onEggTap, { once: true });
  }

  /* ── A: tap egg → go to name step ── */
  function _onEggTap() {
    // Shell split animation — egg image splits via CSS clip-path
    const eggWrap = document.getElementById("hatch-egg-wrap");
    eggWrap.style.transition = "opacity .5s";
    eggWrap.style.opacity = "0";

    setTimeout(() => {
      // Build silhouette pigeon in name step
      const silhouetteRig = document.getElementById("hatch-silhouette");
      // Reuse the pigeon-rig style but the silhouette container is a plain div
      // We'll build a mini rig inside it
      const rig = document.createElement("div");
      rig.className = "pigeon-rig silhouette";
      buildPigeonRig(rig, _traits, { silhouette: true, idle: false });
      silhouetteRig.innerHTML = "";
      silhouetteRig.appendChild(rig);

      _showStep("hatch-step-name");
    }, 500);
  }

  /* ── B: confirm name → reveal step ── */
  function initNameStep() {
    document.getElementById("btn-confirm-name").addEventListener("click", () => {
      const nameInput = document.getElementById("pigeon-name-input");
      const name = nameInput.value.trim();
      if (!name) { showToast("Give your pigeon a name!"); return; }

      // Build the reveal rig (all layers hidden initially)
      const revealRig = document.getElementById("hatch-rig");
      buildPigeonRig(revealRig, _traits, { idle: false });
      // Hide all layers initially
      revealRig.querySelectorAll(".p-layer").forEach((l) => {
        l.style.opacity = "0";
        l.style.transition = "opacity .6s ease";
      });

      _revealStep = 0;
      document.getElementById("reveal-label").textContent = REVEAL_STEPS[0].label;
      _showStep("hatch-step-reveal");

      // Auto-advance past step 0 (no layers yet, just label)
      setTimeout(_advanceReveal, 800);
    });
  }

  /* ── C: tap to reveal next layer group ── */
  function initRevealStep() {
    document.getElementById("btn-next-reveal").addEventListener("click", _advanceReveal);
  }

  function _advanceReveal() {
    _revealStep++;
    if (_revealStep >= REVEAL_STEPS.length) {
      // All layers revealed — go to stat step
      _buildStatRig();
      _showStep("hatch-step-stats");
      setTimeout(_spinStats, 300);
      return;
    }

    const step = REVEAL_STEPS[_revealStep];
    document.getElementById("reveal-label").textContent = step.label;

    // Reveal the layers for this step
    const revealRig = document.getElementById("hatch-rig");
    step.layers.forEach((layerClass) => {
      const el = revealRig.querySelector(`.p-layer.${layerClass}`);
      if (el) el.style.opacity = "1";
    });

    // Special: head drops in from above
    if (step.layers.includes("head")) {
      const headEl = revealRig.querySelector(".p-layer.head");
      if (headEl) {
        headEl.style.transform = "translateY(-30px)";
        headEl.style.transition = "opacity .5s ease, transform .5s cubic-bezier(.22,.6,.36,1.4)";
        requestAnimationFrame(() => {
          headEl.style.transform = "translateY(0)";
        });
      }
    }

    // Wings unfurl
    if (step.layers.includes("wings")) {
      const wingEl = revealRig.querySelector(".p-layer.wings");
      if (wingEl) {
        wingEl.style.transform = "rotate(-10deg)";
        wingEl.style.transition = "opacity .6s ease, transform .6s ease-out";
        requestAnimationFrame(() => {
          wingEl.style.transform = "rotate(0deg)";
        });
      }
    }
  }

  /* ── D: stat reveal slot machine ── */
  function _buildStatRig() {
    const statsRig = document.getElementById("hatch-rig-stats");
    buildPigeonRig(statsRig, _traits, { idle: true });

    // Render empty stat slots
    const slotsEl = document.getElementById("stat-slots");
    slotsEl.innerHTML = "";
    const statNames = ["yolo","fomo","hodl","fud","ngmi","wagmi"];
    statNames.forEach((name) => {
      const row = document.createElement("div");
      row.className = "stat-slot-row";
      row.innerHTML = `
        <span class="stat-slot-name">${name.toUpperCase()}</span>
        <div class="stat-slot-bar-bg">
          <div class="stat-slot-bar-fill" id="slot-bar-${name}" style="width:0%"></div>
        </div>
        <span class="stat-slot-value" id="slot-val-${name}">0</span>
      `;
      slotsEl.appendChild(row);
    });
  }

  function _spinStats() {
    const statNames = ["yolo","fomo","hodl","fud","ngmi","wagmi"];
    statNames.forEach((name, i) => {
      setTimeout(() => {
        const val = _stats[name] ?? 0;
        const pct = Math.round((val / GAME_CONFIG.statMax) * 100);
        const bar = document.getElementById(`slot-bar-${name}`);
        const valEl = document.getElementById(`slot-val-${name}`);
        if (bar) bar.style.width = pct + "%";
        if (valEl) valEl.textContent = val;
      }, i * 200);
    });
  }

  /* ── Finish: save pigeon, go home ── */
  function initFinishStep() {
    document.getElementById("btn-finish-hatch").addEventListener("click", async () => {
      const name = document.getElementById("pigeon-name-input").value.trim();
      await App.saveNewPigeon(name, _traits, _stats);
      document.getElementById("bottom-nav").classList.remove("hidden");
      showScreen("home");
    });
  }

  /* ── Public init (called once from app.js) ── */
  function init() {
    // Guard — only wire up elements that exist
    if (document.getElementById("btn-confirm-name")) initNameStep();
    if (document.getElementById("btn-next-reveal"))  initRevealStep();
    if (document.getElementById("btn-finish-hatch")) initFinishStep();
  }

  return { init, start };
})();
