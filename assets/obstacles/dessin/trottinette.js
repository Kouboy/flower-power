// assets/obstacles/dessin/trottinette.js — famille `scooter` : trottinette de location (v4.14.0) — vert électrique,
// plateau épais, roue avant voilée, colonne pliée et guidon de travers, poignées noires. Variantes : boue et éraflures.
// Lit     : FP.drawn (kit.js).   Écrit : FP.drawn.families.scooter.
(function () {
  'use strict';
  const D = window.FP.drawn, { paint, M } = D;
  const GR = D.material('#0e3a1a', '#1e7a34', '#34c056', '#9af0a8', '#06180a');
  const TYRE = D.material('#121214', '#24242a', '#3a3a44', '#5c5c68', '#08080a');
  const W = 64, H = 61;

  // Tube épais de 6 pixels entre deux points.
  function tube(g, x0, y0, x1, y1, m) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let k = 0; k <= n; k++) {
      const x = x0 + (x1 - x0) * k / n, y = y0 + (y1 - y0) * k / n;
      for (let j = 0; j < 6; j++) paint(g, x + j, y, m, j < 2 ? 3 : j === 5 ? 0 : 2);
    }
  }

  D.define('scooter', {
    w: W, h: H,
    paint(g, v) {
      D.blob(g, 10, 51, 8.5, 8.5, TYRE); D.blob(g, 10, 51, 3.5, 3.5, M.metal);   // roue arrière
      D.blob(g, 53, 51, 7.5, 9, TYRE, { wobble: 1, seed: 3 }); D.blob(g, 53, 51, 3, 3.5, M.metal);   // roue avant voilée
      D.softBox(g, 31, 46, 23, 5, GR, { p: 4, wobble: .3, seed: 1 });       // plateau
      tube(g, 46, 44, 42, 23, GR);                                             // colonne, puis pliée vers l'arrière
      tube(g, 42, 23, 29, 10, GR);
      for (let k = 0; k < 26; k++) {                                          // guidon de travers
        const x = 18 + k, y = 5 + Math.round(k * .25);
        for (let j = 0; j < 5; j++) paint(g, x, y + j, GR, j === 0 ? 3 : j === 4 ? 1 : 2);
      }
      for (const x0 of [15, 41]) for (let k = 0; k < 6; k++)                  // poignées
        for (let j = 0; j < 5; j++) paint(g, x0 + k, 5 + Math.round((x0 - 18 + k) * .25) + j, TYRE, j === 0 ? 3 : 2);
      for (let x = 12; x < 48; x += 5) paint(g, x, 45, GR, 3);                // reflets du plateau
      D.stains(g, M.mud, 2, 8, 180 + v, { x: 6, y: 44, w: 52, h: 8 });
      D.stains(g, GR, 0, 6, 190 + v, { x: 10, y: 8, w: 40, h: 40 });
    }
  });
})();
