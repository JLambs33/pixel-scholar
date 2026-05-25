const bonusTnt = (() => {
  // ── constants ────────────────────────────────────────────────
  const CW = 960;
  const CH = 380;
  const GROUND_H = 60;
  const GRASS_H  = 8;
  const GROUND_Y = CH - GROUND_H;
  const PLAYER_W = 28;
  const PLAYER_H = 52;
  const FLOOR    = GROUND_Y - PLAYER_H;
  const PLAYER_SPEED = 260;
  const MAX_LIVES    = 3;
  const ITEM_W       = 18;
  const ITEM_H       = 18;
  const BASE_FALL    = 120;
  const FALL_STEP    = 15;   // added every 15s
  const BASE_INTERVAL = 1.8;
  const MIN_INTERVAL  = 0.7;
  const TNT_RATIO_START = 0.35;
  const TNT_RATIO_MAX   = 0.65;

  // ── state ─────────────────────────────────────────────────────
  let canvas, ctx, rafId, lastTs, onDone;
  let dead, elapsed, score, lives, nextSpawn;
  let player, items, particles, flashTimer;
  let leftDown, rightDown;

  function initState() {
    dead      = false;
    elapsed   = 0;
    score     = 0;
    lives     = MAX_LIVES;
    nextSpawn = 1.0;
    flashTimer = 0;
    leftDown  = false;
    rightDown = false;
    player    = { x: CW / 2 - PLAYER_W / 2, y: FLOOR };
    items     = [];
    particles = [];
  }

  // ── helpers ───────────────────────────────────────────────────
  function rand(a, b) { return a + Math.random() * (b - a); }

  function fallSpeed() {
    return BASE_FALL + Math.floor(elapsed / 15) * FALL_STEP;
  }

  function tntRatio() {
    return Math.min(TNT_RATIO_MAX, TNT_RATIO_START + (elapsed / 120) * (TNT_RATIO_MAX - TNT_RATIO_START));
  }

  function spawnInterval() {
    return Math.max(MIN_INTERVAL, BASE_INTERVAL - elapsed * 0.006);
  }

  function spawnItem() {
    const isTnt = Math.random() < tntRatio();
    return {
      kind: isTnt ? 'tnt' : 'diamond',
      x: rand(20, CW - ITEM_W - 20),
      y: -ITEM_H - 10,
      vy: fallSpeed(),
      fuse: isTnt ? rand(0, 1) : 0, // fuse flicker state
    };
  }

  function spawnHitParticles(cx, cy, isTnt) {
    const colors = isTnt
      ? ['#FF4400','#FF6600','#FF2200','#FFAA00']
      : ['#00FFFF','#44CCFF','#00AAFF','#FFFFFF'];
    for (let i = 0; i < 12; i++) {
      const life = rand(0.3, 0.7);
      particles.push({
        x: cx, y: cy,
        vx: rand(-90, 90), vy: rand(-120, 20),
        life, maxLife: life,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 3,
      });
    }
  }

  // ── update ────────────────────────────────────────────────────
  function update(dt) {
    elapsed += dt;
    if (flashTimer > 0) flashTimer -= dt;

    // Player movement
    if (leftDown  && player.x > 0)            player.x -= PLAYER_SPEED * dt;
    if (rightDown && player.x + PLAYER_W < CW) player.x += PLAYER_SPEED * dt;

    // Spawn
    if (elapsed >= nextSpawn) {
      items.push(spawnItem());
      nextSpawn = elapsed + spawnInterval();
    }

    // Update items
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i];
      it.y  += it.vy * dt;
      if (it.kind === 'tnt') it.fuse = (it.fuse + dt * 5) % 1;

      // Hit ground — remove
      if (it.y > GROUND_Y) { items.splice(i, 1); continue; }

      // Caught by player
      const px = player.x, py = player.y;
      if (it.x + ITEM_W > px + 4 && it.x < px + PLAYER_W - 4 &&
          it.y + ITEM_H > py + PLAYER_H - 12 && it.y < py + PLAYER_H) {
        spawnHitParticles(it.x + ITEM_W / 2, it.y, it.kind === 'tnt');
        if (it.kind === 'diamond') {
          score++;
        } else {
          lives--;
          flashTimer = 0.5;
          if (lives <= 0) dead = true;
        }
        items.splice(i, 1);
      }
    }

    // Particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt;
      if (p.life <= 0) { particles.splice(i, 1); continue; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }

  // ── drawing ───────────────────────────────────────────────────
  function drawScene() {
    const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
    sky.addColorStop(0, '#60A8E0');
    sky.addColorStop(1, '#87CEEB');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, CW, GROUND_Y);

    // Clouds
    ctx.fillStyle = 'rgba(255,255,255,0.88)';
    [[80,40,110,28],[340,60,78,22],[660,38,96,26],[880,55,80,20]].forEach(([x,y,w,h]) =>
      ctx.fillRect(x, y, w, h)
    );

    // Creepers at top dropping items
    ctx.fillStyle = '#32C832';
    [160, 400, 640, 880].forEach(cx => {
      ctx.fillRect(cx - 8, 0, 16, 22); // body peeking from top
    });

    ctx.fillStyle = '#8B5E3C';
    ctx.fillRect(0, GROUND_Y, CW, GROUND_H);
    ctx.fillStyle = '#3A6B18';
    ctx.fillRect(0, GROUND_Y, CW, GRASS_H);
    ctx.fillStyle = '#2A5010';
    ctx.fillRect(0, GROUND_Y + GRASS_H, CW, 3);
  }

  function drawPlayer() {
    const x = Math.round(player.x);
    const y = Math.round(player.y);
    // Flash red when hit
    if (flashTimer > 0 && Math.floor(flashTimer * 10) % 2 === 0) {
      ctx.fillStyle = '#FF4444';
      ctx.fillRect(x, y, PLAYER_W, PLAYER_H);
      return;
    }
    // Steve
    ctx.fillStyle = '#C68642';
    ctx.fillRect(x, y, PLAYER_W, 22);
    ctx.fillStyle = '#6B3A1F';
    ctx.fillRect(x + 2, y, PLAYER_W - 4, 6);
    ctx.fillStyle = '#1A0A00';
    ctx.fillRect(x + 5,          y + 10, 6, 5);
    ctx.fillRect(x + PLAYER_W - 11, y + 10, 6, 5);
    ctx.fillStyle = '#5C9A27';
    ctx.fillRect(x, y + 22, PLAYER_W, 16);
    ctx.fillStyle = '#2E4482';
    ctx.fillRect(x, y + 38, PLAYER_W, 14);
  }

  function drawItem(it) {
    const x = Math.round(it.x);
    const y = Math.round(it.y);
    if (it.kind === 'diamond') {
      // Pixel diamond — cyan gem shape
      ctx.fillStyle = '#00FFFF';
      ctx.fillRect(x + 5, y,     8,  4);
      ctx.fillRect(x + 2, y + 4, 14, 6);
      ctx.fillRect(x + 4, y + 10, 10, 4);
      ctx.fillRect(x + 7, y + 14, 4,  3);
      ctx.fillStyle = '#AAFFFF';
      ctx.fillRect(x + 6, y + 1, 4, 2);
    } else {
      // TNT block
      const lit = it.fuse > 0.5;
      ctx.fillStyle = lit ? '#CC1111' : '#AA1111';
      ctx.fillRect(x, y, ITEM_W, ITEM_H);
      // Fuse top
      ctx.fillStyle = lit ? '#FFCC00' : '#888844';
      ctx.fillRect(x + ITEM_W / 2 - 1, y - 5, 2, 6);
      if (lit) {
        ctx.fillStyle = '#FFFF00';
        ctx.fillRect(x + ITEM_W / 2 - 1, y - 6, 2, 2);
      }
      // "TNT" label strip
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(x + 2, y + 5, ITEM_W - 4, 8);
      ctx.fillStyle = '#AA1111';
      ctx.font = '5px monospace';
      ctx.textBaseline = 'top';
      ctx.fillText('TNT', x + 3, y + 6);
    }
  }

  function drawParticles() {
    for (const p of particles) {
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.fillStyle   = p.color;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  function shadowed(fn) {
    ctx.shadowColor = '#000'; ctx.shadowOffsetX = 2; ctx.shadowOffsetY = 2;
    fn();
    ctx.shadowColor = 'transparent'; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
  }

  function drawHUD() {
    ctx.textBaseline = 'top';
    ctx.textAlign    = 'left';
    ctx.font = '10px "Press Start 2P", monospace';
    shadowed(() => {
      ctx.fillStyle = '#00FFFF';
      ctx.fillText('DIAMONDS: ' + score, 12, 12);
    });

    // Lives
    for (let i = 0; i < MAX_LIVES; i++) {
      ctx.fillStyle = i < lives ? '#CC2222' : '#333';
      ctx.fillRect(CW - 20 - i * 20, 12, 14, 14);
    }

    // Hint
    if (!dead && elapsed < 2.5) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(CW / 2 - 200, CH / 2 - 32, 400, 58);
      ctx.fillStyle    = '#FFFFA5';
      ctx.font         = '8px "Press Start 2P", monospace';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('CATCH DIAMONDS  DODGE TNT', CW / 2, CH / 2 - 10);
      ctx.fillText('ARROW KEYS OR TAP SIDES', CW / 2, CH / 2 + 12);
      ctx.textAlign    = 'left';
      ctx.textBaseline = 'top';
    }

    if (dead) {
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      ctx.fillRect(0, 0, CW, CH);
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      shadowed(() => {
        ctx.fillStyle = '#FFFFA5';
        ctx.font      = '22px "Press Start 2P", monospace';
        ctx.fillText('KABOOM!', CW / 2, CH / 2 - 36);
      });
      shadowed(() => {
        ctx.fillStyle = '#00FFFF';
        ctx.font      = '14px "Press Start 2P", monospace';
        ctx.fillText(score + ' DIAMONDS', CW / 2, CH / 2 + 8);
      });
      ctx.textAlign    = 'left';
      ctx.textBaseline = 'top';
    }
  }

  function render() {
    ctx.clearRect(0, 0, CW, CH);
    drawScene();
    for (const it of items) drawItem(it);
    drawPlayer();
    drawParticles();
    drawHUD();
  }

  // ── loop ──────────────────────────────────────────────────────
  function loop(ts) {
    const dt = Math.min((ts - lastTs) / 1000, 0.05);
    lastTs = ts;
    if (!dead) update(dt);
    render();
    if (!dead) {
      rafId = requestAnimationFrame(loop);
    } else {
      if (onDone) { const cb = onDone; onDone = null; cb(score); }
    }
  }

  // ── input ─────────────────────────────────────────────────────
  function onKeyDown(e) {
    if (e.key === 'ArrowLeft'  || e.key === 'a' || e.key === 'A') leftDown  = true;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') rightDown = true;
  }

  function onKeyUp(e) {
    if (e.key === 'ArrowLeft'  || e.key === 'a' || e.key === 'A') leftDown  = false;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') rightDown = false;
  }

  let touchId = null;

  function onTouchStart(e) {
    if (e.target.id === 'bonus-home-btn') return;
    e.preventDefault();
    if (dead) return;
    const rect = canvas.getBoundingClientRect();
    const t    = e.changedTouches[0];
    touchId    = t.identifier;
    const tx   = (t.clientX - rect.left) / rect.width * CW;
    leftDown   = tx < CW / 2;
    rightDown  = tx >= CW / 2;
  }

  function onTouchEnd(e) {
    for (const t of e.changedTouches) {
      if (t.identifier === touchId) { leftDown = false; rightDown = false; touchId = null; }
    }
  }

  function onTouchMove(e) {
    if (dead) return;
    const rect = canvas.getBoundingClientRect();
    for (const t of e.changedTouches) {
      if (t.identifier === touchId) {
        const tx = (t.clientX - rect.left) / rect.width * CW;
        leftDown  = tx < CW / 2;
        rightDown = tx >= CW / 2;
      }
    }
  }

  // ── cleanup ───────────────────────────────────────────────────
  function cleanup() {
    cancelAnimationFrame(rafId);
    document.removeEventListener('keydown', onKeyDown);
    document.removeEventListener('keyup',   onKeyUp);
    canvas.removeEventListener('touchstart', onTouchStart);
    canvas.removeEventListener('touchend',   onTouchEnd);
    canvas.removeEventListener('touchmove',  onTouchMove);
    leftDown = false; rightDown = false;
  }

  // ── public API ────────────────────────────────────────────────
  function startGame(callback) {
    onDone        = callback;
    canvas        = document.getElementById('bonus-canvas');
    canvas.width  = CW;
    canvas.height = CH;
    ctx = canvas.getContext('2d');
    initState();
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup',   onKeyUp);
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchend',   onTouchEnd,   { passive: false });
    canvas.addEventListener('touchmove',  onTouchMove,  { passive: false });
    lastTs = performance.now();
    rafId  = requestAnimationFrame(loop);
  }

  function stopGame() { cleanup(); }

  return { startGame, stopGame };
})();
