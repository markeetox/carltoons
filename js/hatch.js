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
        headEl.style.transform = "translate(-50%, -50%) translateY(-30px)";
        headEl.style.transition = "opacity .5s ease, transform .5s cubic-bezier(.22,.6,.36,1.4)";
        requestAnimationFrame(() => {
          headEl.style.transform = "translate(-50%, -50%) translateY(0)";
        });
      }
    }

    // Wings unfurl
    if (step.layers.includes("wings")) {
      const wingEl = revealRig.querySelector(".p-layer.wings");
      if (wingEl) {
        wingEl.style.transform = "translate(-50%, -50%) rotate(-10deg)";
        wingEl.style.transition = "opacity .6s ease, transform .6s ease-out";
        requestAnimationFrame(() => {
          wingEl.style.transform = "translate(-50%, -50%) rotate(0deg)";
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

    document.getElementById("btn-hatch-share")?.addEventListener("click", _shareHatch);
  }

  async function _shareHatch() {
    const name = document.getElementById("pigeon-name-input").value.trim() || "Pigeon";
    const btn = document.getElementById("btn-hatch-share");
    const originalIcon = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-camera fa-spin"></i>';

    try {
      const shareBox = document.createElement("div");
      shareBox.className = "share-box-temp";
      shareBox.innerHTML = `
        <div class="pigeon-scene">
          <div class="pigeon-bg"></div>
          <div class="pigeon-rig idle" id="share-rig"></div>
          <div class="share-stats-overlay">
            <h2 class="share-name">${name}</h2>
            <p class="share-level">Newly Hatched!</p>
          </div>
          <div class="share-footer">
            <span>coo.wutju.com</span>
          </div>
        </div>
      `;
      document.body.appendChild(shareBox);

      const shareRig = shareBox.querySelector("#share-rig");
      buildPigeonRig(shareRig, _traits, { idle: true });

      await new Promise(r => setTimeout(r, 500));

      const canvas = await html2canvas(shareBox, {
        backgroundColor: "#1a1a1a",
        scale: 2,
        useCORS: true,
        logging: false
      });

      shareBox.remove();

      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      const file = new File([blob], 'my_new_pigeon.png', { type: 'image/png' });

      // If we have a user ID from app.js, use it for referral
      let shareUrl = "https://coo.wutju.com";
      if (typeof auth !== 'undefined' && auth.currentUser) {
        shareUrl = `${window.location.origin}${window.location.pathname}?ref=${auth.currentUser.uid}`;
      }

      const shareData = {
        title: `Meet ${name}!`,
        text: `I just hatched a new pigeon on Pigeons! Raise your own at coo.wutju.com`,
        url: shareUrl,
        files: [file]
      };

      if (navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        const dataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = 'my_new_pigeon.png';
        link.href = dataUrl;
        link.click();
        await navigator.clipboard.writeText(shareUrl);
        showToast("Image saved & Invite link copied!");
      }
    } catch (err) {
      console.error("[Hatch] Share failed:", err);
      showToast("Sharing failed.");
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalIcon;
    }
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
