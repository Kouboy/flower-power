// assets/obstacles/dessin/drone.js — famille `drone` : drone écrasé (v4.14.0) — coque blanche rayée et bombée, quatre bras
// trapus, hélices en disques flous dont une tordue, une patte cassée, œil de caméra rouge. Variantes : éraflures.
// Lit     : FP.drawn (kit.js).   Écrit : FP.drawn.families.drone.
(function () {
  'use strict';
  const D = window.FP.drawn, { paint, M } = D;
  const SH = D.material('#6a6e78', '#a8acb4', '#dcdee4', '#ffffff', '#1a1c22');
  const DARK = D.material('#14161c', '#262a32', '#3a3e48', '#5a606c', '#0a0b0e');
  const BLUR = D.material('#2a2e38', '#3e4450', '#58606e', '#8a92a0', '#0a0b0e');
  const RED = D.material('#5a1410', '#a8281e', '#e84a3a', '#ff9a80', '#2a0806');
  const W = 40, H = 33;

  // Segment épais de 4 pixels (bras, pattes).
  function bar(g, x0, y0, x1, y1, m) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let k = 0; k <= n; k++) {
      const x = x0 + (x1 - x0) * k / n, y = y0 + (y1 - y0) * k / n;
      paint(g, x, y - 2, m, 3); paint(g, x, y - 1, m, 2); paint(g, x, y, m, 2); paint(g, x, y + 1, m, 1);
    }
  }

  D.define('drone', {
    w: W, h: H,
    paint(g, v) {
      bar(g, 17, 22, 13, 30, DARK); bar(g, 23, 22, 27, 26, DARK);           // pattes, la droite cassée
      const ROTORS = [[8, 8, 6, 2.6], [32, 7, 6, 2.6], [8, 21, 6, 2.6], [31, 23, 5, 3.6]];   // la dernière tordue
      for (const [x, y] of ROTORS) bar(g, 20, 15, x, y, SH);                   // bras
      for (const [x, y, rx, ry] of ROTORS) { D.blob(g, x, y - 1, rx, ry, BLUR); D.blob(g, x, y, 2.5, 2.5, DARK); }   // hélices floues, moyeux
      D.blob(g, 20, 15, 10, 7, SH, { wobble: .6, seed: 2 });                 // coque
      for (let x = 13; x < 28; x++) if (x % 5) paint(g, x, 12 + (x % 3 === 0 ? 1 : 0), SH, 1);   // rayures
      D.blob(g, 20, 19, 3, 2.5, DARK); paint(g, 20, 19, RED, 3); paint(g, 21, 19, RED, 2);   // caméra
      D.stains(g, SH, 1, 6, 170 + v, { x: 11, y: 9, w: 18, h: 12 });
      D.stains(g, M.mud, 2, 3, 175 + v, { x: 11, y: 17, w: 18, h: 4 });
    }
  });
})();
