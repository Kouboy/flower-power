// assets/obstacles/dessin/sarcophage.js — famille `sarcophagus` : sarcophage de béton (v4.14.0) — bloc gris-beige bosselé
// en deux gradins, fissures, fers à béton rouillés qui dépassent, trèfle presque effacé. Variantes : taches, rouille.
// Lit     : FP.drawn (kit.js).   Écrit : FP.drawn.families.sarcophagus.
(function () {
  'use strict';
  const D = window.FP.drawn, { paint, over, M } = D;
  const C = D.material('#4a463e', '#7a7466', '#a8a090', '#d0c8b4', '#1e1c16');
  const W = 73, H = 75;

  // Fer à béton : 2 pixels d'épaisseur, de (x, y) vers (x + dx, y + dy), légèrement tordu.
  function rebar(g, x, y, dx, dy) {
    const n = Math.max(Math.abs(dx), Math.abs(dy));
    for (let k = 0; k <= n; k++) {
      const px = x + dx * k / n + Math.sin(k * .8) * .6, py = y + dy * k / n;
      paint(g, px, py, M.rust, k % 4 ? 2 : 3); paint(g, px + 1, py, M.rust, 1);
    }
  }

  D.define('sarcophagus', {
    w: W, h: H,
    paint(g, v) {
      rebar(g, 14, 18, -6, -12); rebar(g, 52, 14, 8, -12); rebar(g, 33, 12, 3, -11);
      D.softBox(g, 36, 51, 34, 22, C, { p: 5, wobble: .5, seed: 1 });        // gradin du bas
      D.softBox(g, 35, 24, 25, 13, C, { p: 5, wobble: .5, seed: 4, lean: 3 });   // gradin du haut
      for (let x = 6; x < 67; x++) over(g, x, 32 + Math.round(Math.sin(x * .3)), C, 0);   // jointure des gradins
      const sx = 36, sy = 51;                                                  // trèfle effacé
      for (let y = sy - 8; y <= sy + 8; y++) for (let x = sx - 8; x <= sx + 8; x++) {
        const dx = x - sx, dy = y - sy, d = Math.hypot(dx, dy), a = Math.atan2(dy, dx) * 180 / Math.PI;
        const blade = [-150, -30, 90].some(b => Math.abs(((a - b + 540) % 360) - 180) < 30);
        if ((d < 2 || (d > 3 && d < 8 && blade)) && D.hash(x, y, 3) > .3) over(g, x, y, C, 1);
      }
      for (const [x0, y0, len, dir] of [[18, 40, 12, 1], [55, 36, 16, -1], [30, 16, 8, 1]])   // fissures
        for (let k = 0; k < len; k++) over(g, x0 + Math.round(Math.sin(k * 1.3) + dir * k * .4), y0 + k, C, 0);
      D.stains(g, C, 1, 14, 140 + v, { x: 4, y: 14, w: 64, h: 58 });
      D.stains(g, M.rust, 1, 5, 150 + v, { x: 4, y: 30, w: 64, h: 40 });
    }
  });
})();
