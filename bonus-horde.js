const bonusHorde = (() => {
  // ── constants ────────────────────────────────────────────────
  const CW = 960;
  const CH = 380;
  const GROUND_H  = 60;
  const GRASS_H   = 8;
  const GROUND_Y  = CH - GROUND_H;
  const MAX_ESCAPES     = 5;
  const BASE_SPEED      = 38;
  const SPEED_STEP      = 10;   // added every 10s
  const BASE_MAX_ACTIVE = 4;
  const ARROW_SPEED     = 520;
  const HIT_INSET       = 6;

  const MOB_TYPES = [
    { kind: 'zombie',   w: 20, h: 36, weight: 4 },
    { kind: 'skeleton', w: 20, h: 36, weight: 4 },
    { kind: 'creeper',  w: 20, h: 36, weight: 3 },
  ];

  // ── state ─────────────────────────────────────────────────────
  let canvas, ctx, rafId, lastTs, onDone;
  let dead, elapsed, score, escapes, speed, nextSpawn;
  let mobs, arrows, particles, flashes;

  function initState() {
    dead      = false;
    elapsed   = 0;
    score     = 0;
    escapes   = 0;
    speed     = BASE_SPEED;
    nextSpawn = 1.2;
    mobs      = [];
    arrows    = [];
    particles = [];
    flashes   = [];
  }

  // ── helpers ───────────────────────────────────────────────────
  function rand(a, b) { return a + Math.random() * (b - a); }

  function pickType() {
    const total = MOB_TYPES.reduce((s, t) => s + t.weight, 0);
    let r = Math.random() * total;
    for (const t of MOB_TYPES) { r -= t.weight; if (r <= 0) return t; }
    return MOB_TYPES[0];
  }

  function spawnMob() {
    const t        = pickType();
    const fromLeft = Math.random() < 0.5;
    const x        = fromLeft ? -t.w - 10 : CW + 10;
    const y        = GROUND_Y - t.h - Math.floor(rand(0, 3));
    return {
      kind: t.kind, w: t.w, h: t.h,
      x, y,
      vx: fromLeft ? speed : -speed,
      facing: fromLeft ? 1 : -1,
      hit: false, hitTimer: 0,
    };
  }

  function maxActive() {
    return Math.min(BASE_MAX_ACTIVE + Math.floor(elapsed / 20), 10);
  }

  // ── arrow shooting ────────────────────────────────────────────
  function shoot(tx, ty) {
    // Find topmost mob under click point
    for (let i = mobs.length - 1; i >= 0; i--) {
      const m = mobs[i];
      if (m.hit) continue;
      if (tx >= m.x + HIT_INSET && tx <= m.x + m.w - HIT_INSET &&
          ty >= m.y + HIT_INSET && ty <= m.y + m.h - HIT_INSET) {
        hitMob(i, tx, ty);
        return;
      }
    }
  }

  function hitMob(i, tx, ty) {
    const m = mobs[i];
    m.hit = true; m.hitTimer = 0.25;
    score++;
    spawnHitParticles(m.x + m.w / 2, m.y + m.h / 2);
  }

  function spawnHitParticles(cx, cy) {
    for (let i = 0; i < 10; i++) {
      const life = rand(0.3, 0.6);
      particles.push({
        x: cx, y: cy,
        vx: rand(-80, 80), vy: rand(-100, 20),
        life, maxLife: life,
        color: ['#FFCC00','#FF6600','#FF2200'][Math.floor(Math.random() * 3)],
        size: 3,
      });
    }
  }

  // ── update ────────────────────────────────────────────────────
  function update(dt) {
    elapsed += dt;
    speed = BASE_SPEED + Math.floor(elapsed / 10) * SPEED_STEP;

    // Spawn mobs
    if (mobs.length < maxActive() && elapsed >= nextSpawn) {
      mobs.push(spawnMob());
      nextSpawn = elapsed + rand(1.0, 2.8);
    }

    // Update mobs
    for (let i = mobs.length - 1; i >= 0; i--) {
      const m = mobs[i];
      if (m.hit) {
        m.hitTimer -= dt;
        if (m.hitTimer <= 0) { mobs.splice(i, 1); continue; }
        continue;
      }
      m.x += m.vx * dt;
      // Escaped
      if ((m.vx > 0 && m.x > CW + m.w + 10) ||
          (m.vx < 0 && m.x < -m.w - 10)) {
        mobs.splice(i, 1);
        escapes++;
        if (escapes >= MAX_ESCAPES) dead = true;
      }
    }

    // Update particles
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
    // Night sky
    const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
    sky.addColorStop(0, '#0A0A1A');
    sky.addColorStop(1, '#12183A');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, CW, GROUND_Y);

    // Stars
    ctx.fillStyle = '#FFFFFF';
    const stars = [[80,30],[200,55],[380,18],[540,42],[710,25],[850,50],
                   [140,80],[460,70],[620,88],[760,60],[920,35],[300,95]];
    for (const [sx, sy] of stars) ctx.fillRect(sx, sy, 2, 2);

    // Moon
    ctx.fillStyle = '#FFFFCC';
    ctx.fillRect(880, 28, 18, 18);
    ctx.fillStyle = '#0A0A1A';
    ctx.fillRect(884, 30, 10, 14);

    // Ground
    ctx.fillStyle = '#8B5E3C';
    ctx.fillRect(0, GROUND_Y, CW, GROUND_H);
    ctx.fillStyle = '#3A6B18';
    ctx.fillRect(0, GROUND_Y, CW, GRASS_H);
    ctx.fillStyle = '#2A5010';
    ctx.fillRect(0, GROUND_Y + GRASS_H, CW, 3);
  }

  function drawMob(m) {
    ctx.save();
    if (m.hit) ctx.globalAlpha = 0.4;
    if (m.facing < 0) {
      ctx.translate(m.x + m.w, m.y);
      ctx.scale(-1, 1);
      drawMobShape(m, 0, 0);
    } else {
      drawMobShape(m, m.x, m.y);
    }
    ctx.restore();
  }

  function drawMobShape(m, x, y) {
    switch (m.kind) {
      case 'zombie':   return drawZombie(x, y, m.w, m.h);
      case 'skeleton': return drawSkeleton(x, y, m.w, m.h);
      case 'creeper':  return drawCreeper(x, y, m.w, m.h);
    }
  }

  function drawZombie(x, y, w, h) {
    const headH = Math.round(h * 0.38);
    const bodyH = Math.round(h * 0.30);
    const legH  = h - headH - bodyH;
    const armW  = Math.round(w * 0.22);
    const bw    = w - armW * 2;
    ctx.fillStyle = '#78B890';
    ctx.fillRect(x + armW, y, bw, headH);
    ctx.fillStyle = '#0A2010';
    ctx.fillRect(x + armW + 3, y + 5, 3, 3);
    ctx.fillRect(x + armW + bw - 6, y + 5, 3, 3);
    ctx.fillStyle = '#5898A0';
    ctx.fillRect(x, y + headH + 3, armW, Math.round(bodyH * 0.55));
    ctx.fillRect(x + w - armW, y + headH - 5, armW, Math.round(bodyH * 0.55));
    ctx.fillStyle = '#2A5880';
    ctx.fillRect(x + armW, y + headH, bw, bodyH);
    const lw = Math.round(bw / 2) - 1;
    ctx.fillStyle = '#3A3A5A';
    ctx.fillRect(x + armW,          y + headH + bodyH, lw, legH);
    ctx.fillRect(x + armW + lw + 2, y + headH + bodyH + Math.round(legH * 0.2), lw, legH - Math.round(legH * 0.2));
  }

  function drawSkeleton(x, y, w, h) {
    const headH = Math.round(h * 0.36);
    const bodyH = Math.round(h * 0.28);
    const legH  = h - headH - bodyH;
    const armW  = Math.round(w * 0.18);
    const bw    = w - armW * 2;
    ctx.fillStyle = '#D8D8D8';
    ctx.fillRect(x + armW, y, bw, headH);
    ctx.fillStyle = '#111';
    ctx.fillRect(x + armW + 2, y + 4, 4, 4);
    ctx.fillRect(x + armW + bw - 6, y + 4, 4, 4);
    ctx.fillStyle = '#C0C0C0';
    ctx.fillRect(x, y + headH, armW, bodyH);
    ctx.fillRect(x + w - armW, y + headH, armW, bodyH);
    ctx.fillRect(x + armW, y + headH, bw, bodyH);
    ctx.fillStyle = '#888';
    for (let i = 0; i < 3; i++)
      ctx.fillRect(x + armW + 1, y + headH + 2 + i * Math.round(bodyH / 3.5), bw - 2, 1);
    const lw = Math.round(bw / 2) - 2;
    ctx.fillStyle = '#B8B8B8';
    ctx.fillRect(x + armW + 1,      y + headH + bodyH, lw, legH);
    ctx.fillRect(x + armW + lw + 3, y + headH + bodyH + Math.round(legH * 0.15), lw, legH - Math.round(legH * 0.15));
  }

  function drawCreeper(x, y, w, h) {
    const headH = Math.round(h * 0.40);
    const bodyH = Math.round(h * 0.36);
    const legH  = h - headH - bodyH;
    const headW = Math.round(w * 0.80);
    const hx    = x + Math.round((w - headW) / 2);
    ctx.fillStyle = '#32C832';
    ctx.fillRect(hx, y, headW, headH);
    ctx.fillStyle = '#000';
    const ew = Math.round(headW * 0.22);
    const eh = Math.round(headH * 0.22);
    ctx.fillRect(hx + Math.round(headW * 0.12), y + Math.round(headH * 0.20), ew, eh);
    ctx.fillRect(hx + Math.round(headW * 0.64), y + Math.round(headH * 0.20), ew, eh);
    const mx = hx + Math.round(headW * 0.22);
    const my = y  + Math.round(headH * 0.54);
    const mw = Math.round(headW * 0.56);
    const mh = Math.round(headH * 0.32);
    const sw = Math.round(mw * 0.30);
    const bar = Math.round(mh * 0.38);
    ctx.fillRect(mx, my, mw, bar);
    ctx.fillRect(mx, my + bar, sw, mh - bar);
    ctx.fillRect(mx + mw - sw, my + bar, sw, mh - bar);
    const bx = x + Math.round(w * 0.12);
    const bw = Math.round(w * 0.76);
    ctx.fillStyle = '#28AA28';
    ctx.fillRect(bx, y + headH, bw, bodyH);
    ctx.fillStyle = '#229422';
    const lw = Math.round(w * 0.20);
    ctx.fillRect(x,                   y + headH + bodyH, lw, legH);
    ctx.fillRect(x + lw + 1,          y + headH + bodyH, lw, legH);
    ctx.fillRect(x + w - lw * 2 - 1,  y + headH + bodyH, lw, legH);
    ctx.fillRect(x + w - lw,          y + headH + bodyH, lw, legH);
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

  function drawMcHeart(x, y, b, filled) {
    ctx.fillStyle = filled ? '#FF2222' : '#3A3A3A';
    ctx.fillRect(x + b,     y,         b * 2, b);
    ctx.fillRect(x + b * 4, y,         b * 2, b);
    ctx.fillRect(x,         y + b,     b * 6, b);
    ctx.fillRect(x,         y + b * 2, b * 6, b);
    ctx.fillRect(x + b,     y + b * 3, b * 4, b);
    ctx.fillRect(x + b * 2, y + b * 4, b * 2, b);
    if (filled) {
      ctx.fillStyle = '#FF7777';
      ctx.fillRect(x + b, y + b, b, b);
    }
  }

  function drawHUD() {
    ctx.save();
    ctx.textBaseline = 'top';
    ctx.textAlign    = 'left';
    ctx.font = '10px "Press Start 2P", monospace';
    shadowed(() => {
      ctx.fillStyle = '#FFFFA5';
      ctx.fillText('MOBS: ' + score, 12, 12);
    });
    // Lives remaining as Minecraft hearts (right-aligned)
    const lives = MAX_ESCAPES - escapes;
    const hSize = 2; // px per heart pixel
    const heartW = hSize * 7; // heart is 7 blocks wide
    const gap = 4;
    let hx = CW - 14;
    for (let i = MAX_ESCAPES - 1; i >= 0; i--) {
      drawMcHeart(hx - heartW, 10, hSize, i < lives);
      hx -= heartW + gap;
    }

    // Hint
    if (!dead && elapsed < 2.5) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(CW / 2 - 180, CH / 2 - 26, 360, 46);
      ctx.fillStyle    = '#FFFFA5';
      ctx.font         = '8px "Press Start 2P", monospace';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('CLICK OR TAP MOBS TO SHOOT!', CW / 2, CH / 2);
      ctx.textAlign    = 'left';
      ctx.textBaseline = 'top';
    }

    // Game over
    if (dead) {
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      ctx.fillRect(0, 0, CW, CH);
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      shadowed(() => {
        ctx.fillStyle = '#FFFFA5';
        ctx.font      = '22px "Press Start 2P", monospace';
        ctx.fillText('OVERRUN!', CW / 2, CH / 2 - 36);
      });
      shadowed(() => {
        ctx.fillStyle = '#FFAA00';
        ctx.font      = '14px "Press Start 2P", monospace';
        ctx.fillText(score + ' MOBS HIT', CW / 2, CH / 2 + 8);
      });
      ctx.textAlign    = 'left';
      ctx.textBaseline = 'top';
    }
    ctx.restore();
  }

  function render() {
    ctx.clearRect(0, 0, CW, CH);
    drawScene();
    for (const m of mobs) drawMob(m);
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
  function getCanvasPos(e) {
    const rect   = canvas.getBoundingClientRect();
    const scaleX = CW / rect.width;
    const scaleY = CH / rect.height;
    if (e.touches && e.touches.length > 0) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top)  * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top)  * scaleY,
    };
  }

  function onShoot(e) {
    if (e.target.id === 'bonus-home-btn') return;
    e.preventDefault();
    if (dead) return;
    const { x, y } = getCanvasPos(e);
    shoot(x, y);
  }

  // ── cleanup ───────────────────────────────────────────────────
  function cleanup() {
    cancelAnimationFrame(rafId);
    if (!canvas) return;
    canvas.removeEventListener('mousedown',  onShoot);
    canvas.removeEventListener('touchstart', onShoot);
  }

  // ── public API ────────────────────────────────────────────────
  function startGame(callback) {
    onDone        = callback;
    canvas        = document.getElementById('bonus-canvas');
    canvas.width  = CW;
    canvas.height = CH;
    ctx = canvas.getContext('2d');
    initState();
    canvas.addEventListener('mousedown',  onShoot);
    canvas.addEventListener('touchstart', onShoot, { passive: false });
    lastTs = performance.now();
    rafId  = requestAnimationFrame(loop);
  }

  function stopGame() { cleanup(); }

  return { startGame, stopGame };
})();
