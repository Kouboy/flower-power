// render/coins.js — jetons ÉcoCrédits™ rouillés (v4.5.0) : ils tournent sur place, et lâchent un éclat cuivré quand on les prend.
// Lit     : state.world.coins, state.time, state.camera.y, state.world.viewH, state.events (coin), state.boosts.magnet, state.plant.tip, state.mode,
//           FP.config.coins.spinFps,
//           FP.px, FP.palette.coin.
// Écrit   : state.fx.coinSparks uniquement (éclats en cours).
// Expose  : FP.coinsRender.token(g, x, y, frame) (coin haut-gauche, 11 × 11, 6 images par tour, testé), FP.coinsRender.draw(g, state),
//           FP.coinsRender.pop(g, x, y, k) (effet de ramassage, testé), FP.coinsRender.FRAMES.
// Ne touche pas au DOM au chargement : testable sous Node.
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  const SIZE = 11, R = 5, SPARK_LIFE = .3;
  const E = ['####', '#.#.', '###.', '##..', '###.'];   // petit Ɇ gravé (la barre dépasse en haut à droite)
  const half = (dy) => { let h = 0; while ((h + 1) * (h + 1) + dy * dy <= R * R + R) h++; return h; };

  // Image 0 : face ; 1 et 3 : de trois quarts (reflet d'un côté puis de l'autre) ; 2 : la tranche.
  // Six images par tour : face, ¾, profil, tranche, puis profil et ¾ vus de l'autre côté (reflet inversé).
  const FRAMES = 6, WIDTH = [1, .7, .4, 0, .4, .7];
  function token(g, x, y, frame) {
    const { px } = FP, c = FP.palette.coin, cx = x + R, cy = y + R;
    if (frame === 3) {
      px.rect(g, cx - 1, y, 3, SIZE, c.ink); px.rect(g, cx, y + 1, 1, SIZE - 2, c.light); px.rect(g, cx, y + 7, 1, 2, c.rust);
      return;
    }
    const k = WIDTH[frame], flip = frame > 3 ? -1 : 1;
    for (let dy = -R; dy <= R; dy++) {
      const h = Math.round(half(dy) * k);
      px.rect(g, cx - h, cy + dy, 2 * h + 1, 1, c.ink);
      if (Math.abs(dy) < R && h > 0) px.rect(g, cx - h + 1, cy + dy, 2 * h - 1, 1, c.copper);
    }
    if (frame === 0) {
      px.disc(g, cx - 1, cy - 1, 2, c.light); px.rect(g, cx - 3, cy - 2, 1, 1, c.shine); px.rect(g, cx - 2, cy - 3, 1, 1, c.shine);
      for (const [dx, dy] of [[2, -2], [3, -1], [2, 2], [-2, 3], [3, 1]]) px.rect(g, cx + dx, cy + dy, 1, 1, c.verdigris);
      px.rect(g, cx + 3, cy, 1, 1, c.verdigrisDark); px.rect(g, cx - 3, cy + 1, 1, 1, c.verdigrisDark);
      E.forEach((row, j) => [...row].forEach((ch, i) => { if (ch === '#') px.rect(g, cx - 2 + i, cy - 2 + j, 1, 1, c.engrave); }));
      px.rect(g, cx + 1, cy + R, 1, 1, c.mud);   // coulure de boue
    } else {
      const o = frame === 2 || frame === 4 ? 0 : flip;   // profil étroit : reflet au centre
      px.rect(g, cx - o, cy - 2, 1, 3, c.shine); px.rect(g, cx + flip, cy + 1, 1, 2, c.verdigris); if (k > .5) px.rect(g, cx, cy - 1, 1, 3, c.engrave);
    }
  }

  // Les six images, dessinées une fois chacune dans un petit calque (v4.7.5) ; null sans calque possible (sous Node).
  const sprites = [];
  function sprite(frame) {
    if (!sprites[frame]) {
      const l = FP.px.layer(SIZE, SIZE);
      if (!l) return null;
      token(l.g, 0, 0, frame);
      sprites[frame] = l;
    }
    return sprites[frame];
  }

  // Aura de l'aimant : un anneau cuivré pointillé qui pulse et tourne autour de la tête.
  function aura(g, state, x, y) {
    const c = FP.palette.coin, t = state.time, r = 16 + Math.round(Math.sin(t * 6) * 2);
    for (let i = 0; i < 20; i++) {
      const a = i / 20 * Math.PI * 2 + t * 1.5, s = (i + Math.floor(t * 8)) % 4 === 0 ? 1 : 2;   // points de 2 px, un sur quatre plus petit : ça scintille
      FP.px.rect(g, Math.round(x + Math.cos(a) * r), Math.round(y + Math.sin(a) * r), s, s, i % 2 ? c.shine : c.light);
    }
  }

  // Ramassage (v4.7.0) : éclair blanc les premiers instants, puis anneau cuivré qui s'ouvre jusqu'à 12 px et s'éteint ; k de 0 à 1.
  function pop(g, x, y, k) {
    if (k >= 1) return;
    const c = FP.palette.coin;
    if (k < .2) FP.px.disc(g, x, y, 3 - Math.round(k * 10), '#ffffff');
    const r = 3 + Math.round(9 * Math.sqrt(k));
    if (k > .1) FP.px.ring(g, x, y, r, k < .6 ? c.shine : c.light, 1);
  }

  function draw(g, state) {
    const { px } = FP, w = state.world, oy = px.toArt(state.camera.y), top = state.camera.y - 20, bottom = state.camera.y + w.viewH + 20;
    const sparks = state.fx.coinSparks || (state.fx.coinSparks = []);
    for (const e of state.events) if (e.type === 'coin') sparks.push({ x: e.x, y: e.y, t0: state.time, seed: e.rank });
    const spin = FP.config.coins.spinFps, col = FP.palette.coin, tip = state.plant.tip;
    if (state.boosts.magnet && tip && state.mode === 'playing') aura(g, state, px.toArt(tip.x), px.toArt(tip.y) - oy);
    for (const c of w.coins) {
      if (c.taken || c.y < top || c.y > bottom) continue;
      const ax = px.toArt(c.x), ay = px.toArt(c.y) - oy;
      if (c.pulled && tip) {   // aspiré : traînée cuivrée derrière lui, rotation deux fois plus rapide
        const dx = c.x - tip.x, dy = c.y - tip.y, d = Math.hypot(dx, dy) || 1;
        for (let i = 1; i <= 3; i++) px.rect(g, Math.round(ax + dx / d * i * 4), Math.round(ay + dy / d * i * 4), 2 - (i > 1), 2 - (i > 1), i === 1 ? col.shine : col.light);
      }
      const frame = Math.floor(state.time * spin * (c.pulled ? 2 : 1) + c.rank + c.chain) % FRAMES, sp = sprite(frame);
      if (sp) g.drawImage(sp.canvas, 0, 0, SIZE, SIZE, ax - R, ay - R, SIZE, SIZE);
      else token(g, ax - R, ay - R, frame);
    }
    // Éclat : 5 pixels cuivrés qui s'écartent et s'éteignent en .3 s.
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i], k = (state.time - s.t0) / SPARK_LIFE;
      if (k >= 1) { sparks.splice(i, 1); continue; }
      for (let j = 0; j < 5; j++) {
        const a = (j / 5 + s.seed * .13) * Math.PI * 2, d = 2 + 7 * k;
        px.rect(g, px.toArt(s.x) + Math.round(Math.cos(a) * d), px.toArt(s.y) - oy + Math.round(Math.sin(a) * d), 1, 1, j % 2 ? col.shine : col.light);
      }
      pop(g, px.toArt(s.x), px.toArt(s.y) - oy, k);
    }
  }

  FP.coinsRender = { token, pop, draw, FRAMES };
})();
