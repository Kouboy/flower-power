// assets/obstacles/dessin/solaire.js — famille `solar` : panneau solaire sur son pied plié (v4.14.0) — cellules bleu nuit
// quadrillées vues de biais, cadre alu aux coins arrondis, verre étoilé, pied tordu et sa semelle. Variantes : taches.
// Lit     : FP.drawn (kit.js).   Écrit : FP.drawn.families.solar.
(function () {
  'use strict';
  const D = window.FP.drawn, { paint, over, M } = D;
  const CELL = D.material('#0c1430', '#16244e', '#22387a', '#5a7ac0', '#060a18');
  const W = 70, H = 68;
  // Panneau : parallélogramme (u le long des cellules, v en travers), penché vers la droite.
  const P = { x0: 6, y0: 6, w: 52, h: 34, shear: 10 };

  D.define('solar', {
    w: W, h: H,
    paint(g, v) {
      for (let y = 36; y < 62; y++) {                                        // pied plié : monte, se coude vers la gauche
        const x = y < 50 ? 34 + Math.round((y - 36) * .1) : 35 - Math.round((y - 50) * .6);
        for (let k = 0; k < 4; k++) paint(g, x + k, y, M.metal, k === 0 ? 3 : k === 3 ? 0 : 2);
      }
      D.softBox(g, 28, 63, 10, 2.5, M.metal, { p: 4 });                    // semelle
      for (let y = P.y0 - 1; y <= P.y0 + P.h + 1; y++) for (let x = 0; x < W; x++) {
        const v0 = (y + .5 - P.y0) / P.h, u = (x + .5 - P.x0 - P.shear * (1 - v0)) / P.w;
        const su = Math.abs(u * 2 - 1), sv = Math.abs(v0 * 2 - 1);
        if (su ** 8 + sv ** 8 > 1.02) continue;
        const frame = su ** 8 + sv ** 8 > .55;
        if (frame) paint(g, x, y, M.metal, y < P.y0 + 2 ? 3 : v0 > .9 ? 1 : 2);
        else {
          const line = Math.round(u * P.w) % 9 === 0 || Math.round(v0 * P.h) % 8 === 0;
          paint(g, x, y, CELL, line ? 0 : (u + v0 < .55 ? 3 : u + v0 < .9 ? 2 : 1));
        }
      }
      const cx = 38, cy = 22;                                                // verre étoilé
      for (let a = 0; a < 6; a++) for (let k = 2; k < 9 - (a % 2) * 3; k++)
        over(g, cx + Math.round(Math.cos(a * 1.05 + .3) * k), cy + Math.round(Math.sin(a * 1.05 + .3) * k * .7), M.metal, 3);
      D.stains(g, M.mud, 2, 8, 160 + v, { x: 6, y: 6, w: 60, h: 34 });
    }
  });
})();
