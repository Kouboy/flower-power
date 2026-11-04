// render/boss-death.js — la mort du boss (v5.1.0, retours de playtest) : chaque paroi se fissure après son explosion, puis s'effondre en gros
// morceaux qui tombent ; au paroxysme, flash plein écran et pluie de jetons. Les explosions elles-mêmes sont dans render/boss-fx.js.
// Lit     : state.{events, time, camera.y, run.milieu, bossFight.collapse}, state.world.{width, viewH, bossLevel.walls}, FP.config.{boss.death, milieux},
//           FP.palette.{boss, coin}, FP.px, FP.bossFx.{shatter, shardAt}, FP.bossRender.artPoly.
// Écrit   : state.fx.bossDeath uniquement { chunks, rain, flash: { t0 } | null } (horodatés avec state.time, éteints d'eux-mêmes).
// Expose  : FP.bossDeath.update(state) (une fois par frame, avant le dessin : events → effets), FP.bossDeath.draw(g, state) (toile d'art, monde).
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  const CRACK_ARMS = 4, CRACK_STEP = 5;   // fissures d'une paroi : branches depuis son centre, pas d'un zigzag (px d'art)

  const store = (state) => state.fx.bossDeath || (state.fx.bossDeath = { chunks: [], rain: [], flash: null });
  const worldPoly = (o) => o.collision.map(([x, y]) => [o.x + x, o.y + y]);
  // Suite reproductible propre à une paroi (même mort, mêmes fissures).
  const hash = (i, k) => { const v = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return v - Math.floor(v); };

  function update(state) {
    const fx = store(state), D = FP.config.boss.death, t0 = state.time, bl = state.world.bossLevel;
    for (const e of state.events) {
      if (e.type === 'bossCrumble' && bl) {
        const w = bl.walls[e.i], n = Math.min(D.chunks * 3, Math.max(D.chunks, Math.round(Math.sqrt(w.broadR) * 2)));
        for (const p of FP.bossFx.shatter(worldPoly(w), n, 70, e.i * 7919 + 1)) fx.chunks.push({ ...p, size: p.size + 2, t0 });
      } else if (e.type === 'bossPeak') {
        fx.flash = { t0 };
        const top = state.camera.y, W = state.world.width;
        for (let i = 0; i < D.rain; i++) fx.rain.push({ x: hash(i, 1) * W, y: top - 10 - hash(i, 2) * 120, vx: (hash(i, 3) - .5) * 30, vy: 60 + hash(i, 4) * 120, spin: 0, t0 });
      }
    }
    const alive = (f, life) => state.time - f.t0 < life;
    fx.chunks = fx.chunks.filter(p => alive(p, D.chunkLife));
    fx.rain = fx.rain.filter(p => alive(p, D.rainLife));
    if (fx.flash && !alive(fx.flash, D.flash)) fx.flash = null;
  }

  // Fissures d'une paroi qui a explosé : zigzags sombres depuis son centre, d'autant plus longs que l'effondrement approche (k de 0 à 1).
  function cracks(g, w, i, k, cam, color) {
    const cx = FP.px.toArt(w.x), cy = FP.px.toArt(w.y) - cam, reach = FP.px.toArt(w.broadR) * k;
    for (let a = 0; a < CRACK_ARMS; a++) {
      let x = cx, y = cy, ang = (a + hash(i, a)) * Math.PI * 2 / CRACK_ARMS;
      for (let d = 0; d < reach; d += CRACK_STEP) {
        ang += (hash(i, a * 31 + d) - .5) * 1.2;
        const nx = x + Math.cos(ang) * CRACK_STEP, ny = y + Math.sin(ang) * CRACK_STEP;
        for (let s = 0; s <= CRACK_STEP; s++) FP.px.rect(g, Math.round(x + (nx - x) * s / CRACK_STEP), Math.round(y + (ny - y) * s / CRACK_STEP), 1, 1, color);
        x = nx; y = ny;
      }
    }
  }

  function draw(g, state) {
    const fx = state.fx.bossDeath, bl = state.world.bossLevel, c = state.bossFight.collapse, D = FP.config.boss.death;
    const cam = FP.px.toArt(state.camera.y), t = state.time, top = state.camera.y, H = state.world.viewH;
    const M = FP.palette.boss.milieux[FP.config.milieux[state.run.milieu].id];
    if (c && bl) {
      const G = D.time * D.scale;
      bl.walls.forEach((w, i) => {
        const k = c.walls[i];
        if (!k.blown || k.down || w.y + w.broadR < top || w.y - w.broadR > top + H) return;
        cracks(g, w, i, Math.min(1, (c.t - k.at) / (D.crack * G)), cam, FP.palette.boss.hole);
      });
    }
    if (!fx) return;
    const colors = [M.body, M.dark, M.light, M.edge];
    for (const p of fx.chunks) {
      const at = FP.bossFx.shardAt(p, t - p.t0), flip = Math.sin(at.a) > 0, x = FP.px.toArt(at.x), y = FP.px.toArt(at.y) - cam;
      FP.px.rect(g, x, y, p.size + (flip ? 1 : 0), p.size + (flip ? 0 : 1), M.edge);
      FP.px.rect(g, x + 1, y + 1, Math.max(1, p.size - 1), Math.max(1, p.size - 1), colors[p.size % 3]);
    }
    for (const p of fx.rain) {
      const at = FP.bossFx.shardAt(p, t - p.t0), x = FP.px.toArt(at.x), y = FP.px.toArt(at.y) - cam;
      FP.px.disc(g, x, y, 2, FP.palette.coin.copper); FP.px.rect(g, x - 1, y - 1, 1, 1, FP.palette.coin.shine);
    }
    // Flash plein écran : plein au paroxysme, puis une rangée sur deux avant de s'éteindre ; débordant d'un écran de chaque côté,
    // le zoom de la caméra n'en montre jamais le bord.
    if (fx.flash) {
      const age = t - fx.flash.t0, w = Math.ceil(state.world.width / FP.px.SCALE), h = Math.ceil(H / FP.px.SCALE);
      if (age < D.flash / 2) FP.px.rect(g, -w, -h, 3 * w, 3 * h, FP.palette.boss.flash);
      else for (let y = -h + Math.floor(age * 60) % 2; y < 2 * h; y += 2) FP.px.rect(g, -w, y, 3 * w, 1, FP.palette.boss.flash);
    }
  }

  FP.bossDeath = { update, draw };
})();
