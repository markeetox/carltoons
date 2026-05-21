/* ════════════════════════════════════════════════════════════
   world.js  —  The Wilds (Rumble Heroes style exploration)
   ════════════════════════════════════════════════════════════ */

const World = (() => {
  let canvas, ctx;
  let running = false;
  let lastTime = 0;

  // Game state
  let player = { x: 0, y: 0, radius: 14, speed: 2.5, color: '#fff' };
  let party = []; // Following pigeons
  let entities = []; // Worms, Wild birds

  // Joystick state
  let joystick = {
    active: false,
    baseX: 0, baseY: 0,
    stickX: 0, stickY: 0,
    dirX: 0, dirY: 0,
    maxDist: 45
  };

  function init() {
    canvas = document.getElementById('world-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    _initJoystick();
    _resize();
    window.addEventListener('resize', _resize);
  }

  function _resize() {
    if (!canvas) return;
    const container = document.getElementById('world-container');
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
  }

  function _initJoystick() {
    const zone = document.getElementById('joystick-zone');
    const stick = document.getElementById('joystick-stick');
    if (!zone || !stick) return;

    const handleStart = (x, y) => {
      const rect = zone.getBoundingClientRect();
      joystick.active = true;
      joystick.baseX = rect.left + rect.width / 2;
      joystick.baseY = rect.top + rect.height / 2;
      _updateJoystick(x, y);
    };

    const handleMove = (x, y) => {
      if (joystick.active) _updateJoystick(x, y);
    };

    const handleEnd = () => {
      joystick.active = false;
      joystick.dirX = 0;
      joystick.dirY = 0;
      stick.style.transform = `translate(-50%, -50%)`;
    };

    // Touch
    zone.addEventListener('touchstart', (e) => {
      e.preventDefault();
      handleStart(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: false });

    zone.addEventListener('touchmove', (e) => {
      e.preventDefault();
      handleMove(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: false });

    zone.addEventListener('touchend', handleEnd);

    // Mouse
    zone.addEventListener('mousedown', (e) => handleStart(e.clientX, e.clientY));
    window.addEventListener('mousemove', (e) => handleMove(e.clientX, e.clientY));
    window.addEventListener('mouseup', handleEnd);
  }

  function _updateJoystick(x, y) {
    const dx = x - joystick.baseX;
    const dy = y - joystick.baseY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);

    const moveDist = Math.min(dist, joystick.maxDist);
    joystick.stickX = Math.cos(angle) * moveDist;
    joystick.stickY = Math.sin(angle) * moveDist;

    joystick.dirX = Math.cos(angle) * (moveDist / joystick.maxDist);
    joystick.dirY = Math.sin(angle) * (moveDist / joystick.maxDist);

    const stick = document.getElementById('joystick-stick');
    if (stick) {
      stick.style.transform = `translate(calc(-50% + ${joystick.stickX}px), calc(-50% + ${joystick.stickY}px))`;
    }
  }

  function start() {
    if (running) return;
    running = true;
    lastTime = performance.now();
    player.x = canvas.width / 2;
    player.y = canvas.height / 2;
    _spawnInitial();
    _updateResourcesUI();
    requestAnimationFrame(_loop);
  }

  function stop() {
    running = false;
  }

  function _spawnInitial() {
    entities = [];
    for (let i = 0; i < 8; i++) _spawnEntity('worm');
    for (let i = 0; i < 2; i++) _spawnEntity('bird');
  }

  function _spawnEntity(type) {
    const margin = 40;
    entities.push({
      type,
      x: margin + Math.random() * (canvas.width - margin * 2),
      y: margin + Math.random() * (canvas.height - margin * 2),
      radius: type === 'worm' ? 6 : 12,
      color: type === 'worm' ? '#ef4444' : '#a855f7'
    });
  }

  function _loop(t) {
    if (!running) return;
    const dt = Math.min(2, (t - lastTime) / 16.66);
    lastTime = t;

    _update(dt);
    _draw();

    requestAnimationFrame(_loop);
  }

  function _update(dt) {
    // Move player
    player.x += joystick.dirX * player.speed * dt;
    player.y += joystick.dirY * player.speed * dt;

    // Bounds
    player.x = Math.max(player.radius, Math.min(canvas.width - player.radius, player.x));
    player.y = Math.max(player.radius, Math.min(canvas.height - player.radius, player.y));

    // Party follow
    let leader = player;
    party.forEach(p => {
      const dx = leader.x - p.x;
      const dy = leader.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const followDist = 32;

      if (dist > followDist) {
        const angle = Math.atan2(dy, dx);
        p.x += Math.cos(angle) * player.speed * 0.9 * dt;
        p.y += Math.sin(angle) * player.speed * 0.9 * dt;
      }
      leader = p;
    });

    // Interaction
    entities = entities.filter(ent => {
      const dx = player.x - ent.x;
      const dy = player.y - ent.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < player.radius + ent.radius) {
        if (ent.type === 'worm') {
          _collectWorm();
          return false;
        }
        if (ent.type === 'bird') {
          _rescueBird(ent);
          return false;
        }
      }
      return true;
    });

    // Respawn
    if (entities.filter(e => e.type === 'worm').length < 4) _spawnEntity('worm');
    if (entities.filter(e => e.type === 'bird').length < 1) _spawnEntity('bird');
  }

  function _collectWorm() {
    if (window.App && window.App.addWorm) {
      window.App.addWorm();
      _updateResourcesUI();
    }
  }

  function _rescueBird(ent) {
    party.push({ x: ent.x, y: ent.y });
    if (party.length > 5) party.shift(); // Max party size
    _updatePartyUI();
    showToast("🐦 Bird joined your flock!");
  }

  function _updateResourcesUI() {
    const el = document.getElementById('world-worms');
    if (el && window.App && window.App.getWorms) {
      el.textContent = window.App.getWorms();
    }
  }

  function _updatePartyUI() {
    const list = document.getElementById('party-list');
    if (list) {
      list.innerHTML = party.map(() => `
        <div class="party-member-icon"><i class="fa-solid fa-dove"></i></div>
      `).join('');
    }
  }

  function _draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background grid
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 2;
    const step = 40;
    ctx.beginPath();
    for (let x = 0; x < canvas.width; x += step) { ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); }
    for (let y = 0; y < canvas.height; y += step) { ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); }
    ctx.stroke();

    // Draw Entities (pixel style squares)
    entities.forEach(ent => {
      ctx.fillStyle = ent.color;
      const size = ent.radius * 2;
      ctx.fillRect(ent.x - ent.radius, ent.y - ent.radius, size, size);
    });

    // Draw Party
    party.forEach(p => {
      ctx.fillStyle = '#a855f7';
      ctx.fillRect(p.x - 8, p.y - 8, 16, 16);
    });

    // Draw Player
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x - player.radius, player.y - player.radius, player.radius * 2, player.radius * 2);

    // Eyes
    ctx.fillStyle = '#000';
    ctx.fillRect(player.x - 6, player.y - 6, 4, 4);
    ctx.fillRect(player.x + 2, player.y - 6, 4, 4);
  }

  return { init, start, stop };
})();
