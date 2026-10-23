// render/coins.js — jetons ÉcoCrédits™ rouillés (v4.5.0) : ils tournent sur place, et lâchent un éclat cuivré quand on les prend.
// Lit     : state.world.coins, state.time, state.camera.y, state.world.viewH, state.events (coin), FP.config.coins.spinFps,
//           FP.px, FP.palette.coin.
// Écrit   : state.fx.coinSparks uniquement (éclats en cours).
// Expose  : FP.coinsRender.token(g, x, y, frame) (coin haut-gauche, 11 × 11, testé), FP.coinsRender.draw(g, state).
// Ne touche pas au DOM au chargement : testable sous Node.
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  const SIZE = 11, R = 5, SPARK_LIFE = .3;
  const E = ['####', '#.#.', '###.', '##..', '###.'];   // petit Ɇ gravé (la barre dépasse en haut à droite)
  const half = (dy) => { let h = 0; while ((h + 1) * (h + 1) + dy * dy <= R * R + R) h++; return h; };

  // Image 0 : face ; 1 et 3 : de trois quarts (reflet d'un côté puis de l'autre) ; 2 : la tranche.
  function token(g, x, y, frame) {
    const { px } = FP, c = FP.palette.coin, cx = x + R, cy = y + R;
    if (frame === 2) {
      px.rect(g, cx - 1, y, 3, SIZE, c.ink); px.rect(g, cx, y + 1, 1, SIZE - 2, c.light); px.rect(g, cx, y + 7, 1, 2, c.rust);
      return;
    }
    const k = frame === 0 ? 1 : .6, flip = frame === 3 ? -1 : 1;
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
      px.rect(g, cx - flip, cy - 2, 1, 3, c.shine); px.rect(g, cx + flip, cy + 1, 1, 2, c.verdigris); px.rect(g, cx, cy - 1, 1, 3, c.engrave);
    }
  }

  function draw(g, state) {
    const { px } = FP, w = state.world, oy = px.toArt(state.camera.y), top = state.camera.y - 20, bottom = state.camera.y + w.viewH + 20;
    const sparks = state.fx.coinSparks || (state.fx.coinSparks = []);
    for (const e of state.events) if (e.type === 'coin') sparks.push({ x: e.x, y: e.y, t0: state.time, seed: e.rank });
    const spin = FP.config.coins.spinFps;
    for (const c of w.coins) {
      if (c.taken || c.y < top || c.y > bottom) continue;
      token(g, px.toArt(c.x) - R, px.toArt(c.y) - oy - R, Math.floor(state.time * spin + c.rank + c.chain) % 4);
    }
    // Éclat : 5 pixels cuivrés qui s'écartent et s'éteignent en .3 s.
    const col = FP.palette.coin;
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i], k = (state.time - s.t0) / SPARK_LIFE;
      if (k >= 1) { sparks.splice(i, 1); continue; }
      for (let j = 0; j < 5; j++) {
        const a = (j / 5 + s.seed * .13) * Math.PI * 2, d = 2 + 7 * k;
        px.rect(g, px.toArt(s.x) + Math.round(Math.cos(a) * d), px.toArt(s.y) - oy + Math.round(Math.sin(a) * d), 1, 1, j % 2 ? col.shine : col.light);
      }
    }
  }

  FP.coinsRender = { token, draw };
})();
