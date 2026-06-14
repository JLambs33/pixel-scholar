const bonusElytra = (() => {
  // ── constants ────────────────────────────────────────────────
  const CW = 960;
  const CH = 380;
  const GRAVITY      = 620;   // px/s²
  const FLAP_VEL     = -285;  // px/s — single flap gives ~65px height
  const MAX_LIVES    = 3;
  const INVINCE_TIME = 0.75;
  const P_W = 42;
  const P_H = 26;
  const CEIL  = 4;
  const FLOOR = CH - P_H - 4;
  const PILLAR_W  = 46;
  const CAP_W     = PILLAR_W + 10;  // cap wider than pillar
  const CAP_H     = 10;
  const GAP_START = 118;
  const GAP_MIN   = 92;
  const BASE_SPEED = 165;
  const SPEED_MAX  = 330;
  const SPEED_STEP = 8;   // per 10s
  const BASE_INTERVAL = 2.2;
  const MIN_INTERVAL  = 1.1;
  const GEM_S = 12;
  const POINTS_PER_BLOCK = 1;
  const POINTS_PER_GEM   = 10;

  // ── state ─────────────────────────────────────────────────────
  let canvas, ctx, rafId, lastTs, onDone;
  let dead, elapsed, distance, speed, lives, invinceTimer, nextPillar;
  let player, pillars, gems, particles, collectedGems;

  function initState() {
    dead         = false;
    elapsed      = 0;
    distance     = 0;
    lives        = MAX_LIVES;
    invinceTimer = 0;
    nextPillar   = 2.0;
    collectedGems = 0;
    player    = { x: 100, y: CH / 2 - P_H / 2, vy: -60 };
    pillars   = [];
    gems      = [];
    particles = [];
  }

  function calcScore() {
    return Math.floor(distance / 10) + collectedGems * POINTS_PER_GEM;
  }

  function gapSize() {
    return Math.max(GAP_MIN, GAP_START - Math.floor(elapsed / 20) * 4);
  }

  // ── spawn ─────────────────────────────────────────────────────
  function spawnPillar() {
    const gap  = gapSize();
    const gapY = 50 + Math.random() * (CH - 100 - gap);
    pillars.push({ x: CW + 10, gapY, gapH: gap });
    if (Math.random() < 0.65) {
      gems.push({
        x: CW + 10 + PILLAR_W / 2 - GEM_S / 2,
        y: gapY + gap / 2 - GEM_S / 2 + (Math.random() - 0.5) * 20,
        done: false,
      });
    }
  }

  // ── particles ─────────────────────────────────────────────────
  function spawnParticles(cx, cy, color, count) {
    for (let i = 0; i < count; i++) {
      const life = 0.25 + Math.random() * 0.45;
      particles.push({
        x: cx, y: cy,
        vx: (Math.random() - 0.5) * 160, vy: (Math.random() - 0.5) * 120,
        life, maxLife: life, size: 3, color,
      });
    }
  }

  // ── update ────────────────────────────────────────────────────
  function update(dt) {
    elapsed  += dt;
    speed     = Math.min(SPEED_MAX, BASE_SPEED + Math.floor(elapsed / 10) * SPEED_STEP);
    distance += speed * dt;
    if (invinceTimer > 0) invinceTimer -= dt;

    // Physics
    player.vy += GRAVITY * dt;
    player.y  += player.vy * dt;

    // Bounds
    if (player.y < CEIL) {
      player.y = CEIL; player.vy = Math.abs(player.vy) * 0.2;
      if (invinceTimer <= 0) takeDamage();
    }
    if (player.y > FLOOR) {
      player.y = FLOOR; player.vy = 0;
      if (invinceTimer <= 0) takeDamage();
    }

    // Spawn pillars
    const interval = Math.max(MIN_INTERVAL, BASE_INTERVAL - elapsed * 0.005);
    if (elapsed >= nextPillar) { spawnPillar(); nextPillar = elapsed + interval; }

    // Move pillars and gems
    for (const p of pillars) p.x -= speed * dt;
    for (const g of gems)    g.x -= speed * dt;

    // Pillar collision (with forgiveness inset)
    if (invinceTimer <= 0) {
      const px = player.x + 8,  py = player.y + 4;
      const pw = P_W - 16,      ph = P_H - 8;
      for (const p of pillars) {
        if (px + pw > p.x + 4 && px < p.x + PILLAR_W - 4) {
          if (py < p.gapY + 4 || py + ph > p.gapY + p.gapH - 4) {
            takeDamage(); break;
          }
        }
      }
    }

    // Gem collection
    for (const g of gems) {
      if (g.done) continue;
      if (player.x + P_W > g.x + 2 && player.x + 4 < g.x + GEM_S - 2 &&
          player.y + P_H > g.y + 2 && player.y + 4 < g.y + GEM_S - 2) {
        g.done = true;
        collectedGems++;
        spawnParticles(g.x + GEM_S / 2, g.y + GEM_S / 2, '#00FF88', 10);
      }
    }

    // Particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt;
      if (p.life <= 0) { particles.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt;
    }

    // Cleanup off-screen
    pillars = pillars.filter(p => p.x + PILLAR_W > -20);
    gems    = gems.filter(g => g.x > -20);
  }

  function takeDamage() {
    lives--;
    invinceTimer = INVINCE_TIME;
    spawnParticles(player.x + P_W / 2, player.y + P_H / 2, '#FF4444', 14);
    if (lives <= 0) { dead = true; }
  }

  // ── drawing ───────────────────────────────────────────────────
  function drawScene() {
    // End dimension: very dark purple sky
    const sky = ctx.createLinearGradient(0, 0, 0, CH);
    sky.addColorStop(0, '#04000E');
    sky.addColorStop(0.6, '#0A0020');
    sky.addColorStop(1, '#160040');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, CW, CH);

    // Purple/cyan stars
    ctx.fillStyle = '#8833FF';
    [[95,22],[220,48],[385,18],[545,38],[705,22],[835,44],[940,12],
     [60,80],[300,70],[580,60],[760,88],[140,100],[430,95],[880,75]].forEach(([sx,sy]) =>
      ctx.fillRect(sx, sy, 2, 2)
    );
    ctx.fillStyle = '#44CCFF';
    [[175,35],[490,25],[650,55],[820,30],[250,90]].forEach(([sx,sy]) =>
      ctx.fillRect(sx, sy, 1, 1)
    );
  }

  function drawPillar(p) {
    const bh   = 16; // endstone block height for texture
    const mainC  = '#CCC896';
    const lineC  = '#AAAA6A';
    const capC   = '#DDDAAA';
    const edgeC  = '#9A9850';

    // Top pillar (ceiling → gapY)
    ctx.fillStyle = mainC;
    ctx.fillRect(p.x, 0, PILLAR_W, p.gapY);
    // Block grid lines on top pillar
    ctx.fillStyle = lineC;
    for (let by = bh; by < p.gapY; by += bh) ctx.fillRect(p.x, by - 1, PILLAR_W, 1);
    ctx.fillRect(p.x + PILLAR_W / 2 - 1, 0, 1, p.gapY);
    // Cap at bottom of top pillar
    ctx.fillStyle = capC;
    ctx.fillRect(p.x - 5, p.gapY - CAP_H, CAP_W, CAP_H);
    ctx.fillStyle = edgeC;
    ctx.fillRect(p.x - 5, p.gapY - CAP_H, CAP_W, 2);

    // Bottom pillar (gapY + gapH → CH)
    const bot = p.gapY + p.gapH;
    ctx.fillStyle = mainC;
    ctx.fillRect(p.x, bot, PILLAR_W, CH - bot);
    ctx.fillStyle = lineC;
    for (let by = bot + bh; by < CH; by += bh) ctx.fillRect(p.x, by - 1, PILLAR_W, 1);
    ctx.fillRect(p.x + PILLAR_W / 2 - 1, bot, 1, CH - bot);
    // Cap at top of bottom pillar
    ctx.fillStyle = capC;
    ctx.fillRect(p.x - 5, bot, CAP_W, CAP_H);
    ctx.fillStyle = edgeC;
    ctx.fillRect(p.x - 5, bot + CAP_H - 2, CAP_W, 2);
  }

  function drawGem(g) {
    if (g.done) return;
    // Emerald pixel art
    ctx.fillStyle = '#00CC55';
    ctx.fillRect(g.x + 3, g.y,      6, 3);
    ctx.fillRect(g.x,     g.y + 3,  12, 5);
    ctx.fillRect(g.x + 3, g.y + 8,  6, 4);
    ctx.fillStyle = '#66FF99'; // highlight
    ctx.fillRect(g.x + 4, g.y + 1,  3, 2);
  }

  function drawElytraSteve() {
    const x = Math.round(player.x);
    const y = Math.round(player.y);

    // Elytra wings (purple, sweep left/backward from Steve's body)
    ctx.fillStyle = '#55119A';
    // Upper wing — sweeps up-left
    ctx.fillRect(x,      y + 2,  22, 4);
    ctx.fillRect(x + 3,  y + 6,  18, 3);
    ctx.fillRect(x + 6,  y + 9,  13, 3);
    // Lower wing — sweeps down-left
    ctx.fillRect(x,      y + 16, 22, 4);
    ctx.fillRect(x + 3,  y + 20, 16, 3);
    ctx.fillRect(x + 7,  y + 23, 10, 3);
    // Wing leading-edge highlight
    ctx.fillStyle = '#7733CC';
    ctx.fillRect(x,      y + 2,  22, 1);
    ctx.fillRect(x,      y + 16, 22, 1);
    // Wing rib detail
    ctx.fillStyle = '#3A0A77';
    ctx.fillRect(x + 2,  y + 5,  18, 1);
    ctx.fillRect(x + 2,  y + 19, 14, 1);

    // Steve body (right side of sprite, facing right)
    // Head
    ctx.fillStyle = '#C68642';
    ctx.fillRect(x + 28, y, 12, 12);
    ctx.fillStyle = '#6B3A1F'; // hair
    ctx.fillRect(x + 28, y, 12, 3);
    ctx.fillStyle = '#1A0A00'; // eye
    ctx.fillRect(x + 35,  y + 5, 3, 3);
    // Shirt (green)
    ctx.fillStyle = '#5C9A27';
    ctx.fillRect(x + 26, y + 12, 14, 8);
    // Pants (blue)
    ctx.fillStyle = '#2E4482';
    ctx.fillRect(x + 28, y + 20, 5, 6);
    ctx.fillRect(x + 34, y + 20, 5, 6);
  }

  function drawMcHeart(x, y, b, filled) {
    ctx.fillStyle = filled ? '#FF2222' : '#3A3A3A';
    ctx.fillRect(x + b,     y,         b * 2, b);
    ctx.fillRect(x + b * 4, y,         b * 2, b);
    ctx.fillRect(x,         y + b,     b * 6, b);
    ctx.fillRect(x,         y + b * 2, b * 6, b);
    ctx.fillRect(x + b,     y + b * 3, b * 4, b);
    ctx.fillRect(x + b * 2, y + b * 4, b * 2, b);
    if (filled) { ctx.fillStyle = '#FF7777'; ctx.fillRect(x + b, y + b, b, b); }
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
    ctx.save();
    ctx.textBaseline = 'top';
    ctx.textAlign    = 'left';
    ctx.font = '10px "Press Start 2P", monospace';
    shadowed(() => {
      ctx.fillStyle = '#FFFFA5';
      ctx.fillText('SCORE: ' + calcScore(), 12, 12);
    });

    // Hearts (right-aligned)
    const hSize = 2, heartW = hSize * 7, gap = 4;
    let hx = CW - 14;
    for (let i = MAX_LIVES - 1; i >= 0; i--) {
      drawMcHeart(hx - heartW, 10, hSize, i < lives);
      hx -= heartW + gap;
    }

    // Hint
    if (!dead && elapsed < 3.0) {
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      ctx.fillRect(CW / 2 - 210, CH / 2 - 32, 420, 58);
      ctx.fillStyle    = '#FFFFA5';
      ctx.font         = '8px "Press Start 2P", monospace';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('TAP / CLICK / SPACE TO FLAP!', CW / 2, CH / 2 - 10);
      ctx.fillText('COLLECT EMERALDS FOR BONUS POINTS', CW / 2, CH / 2 + 8);
    }

    // Game over overlay
    if (dead) {
      ctx.fillStyle = 'rgba(0,0,0,0.72)';
      ctx.fillRect(0, 0, CW, CH);
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      shadowed(() => {
        ctx.fillStyle = '#FFFFA5';
        ctx.font      = '22px "Press Start 2P", monospace';
        ctx.fillText('GAME OVER!', CW / 2, CH / 2 - 36);
      });
      shadowed(() => {
        ctx.fillStyle = '#00FF88';
        ctx.font      = '14px "Press Start 2P", monospace';
        ctx.fillText(calcScore() + ' POINTS', CW / 2, CH / 2 + 8);
      });
    }
    ctx.restore();
  }

  // ── render ────────────────────────────────────────────────────
  function render() {
    ctx.clearRect(0, 0, CW, CH);
    drawScene();
    for (const p of pillars) drawPillar(p);
    for (const g of gems)    drawGem(g);
    // Flash during invincibility
    if (invinceTimer <= 0 || Math.floor(invinceTimer * 10) % 2 === 0) drawElytraSteve();
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
      if (onDone) { const cb = onDone; onDone = null; cb(calcScore()); }
    }
  }

  // ── input ─────────────────────────────────────────────────────
  function flap() { if (!dead) player.vy = FLAP_VEL; }

  function onKeyDown(e) {
    if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
      e.preventDefault(); flap();
    }
  }

  function onPointerDown(e) {
    if (e.target.id === 'bonus-home-btn') return;
    e.preventDefault();
    flap();
  }

  // ── cleanup ───────────────────────────────────────────────────
  function cleanup() {
    cancelAnimationFrame(rafId);
    document.removeEventListener('keydown', onKeyDown);
    if (!canvas) return;
    canvas.removeEventListener('mousedown',  onPointerDown);
    canvas.removeEventListener('touchstart', onPointerDown);
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
    canvas.addEventListener('mousedown',  onPointerDown);
    canvas.addEventListener('touchstart', onPointerDown, { passive: false });
    lastTs = performance.now();
    rafId  = requestAnimationFrame(loop);
  }

  function stopGame() { cleanup(); }

  return { startGame, stopGame };
})();
