// assets/obstacles/dessin/serveur.js — famille `server` : baie de serveur (v4.14.0) — bloc gris-bleu bombé et de travers,
// tiroirs sombres, voyants rouges et verts, grille d'aération, câbles arrachés qui pendent du flanc. Variantes : éraflures,
// rouille, voyants allumés ou éteints.
// Lit     : FP.drawn (kit.js).   Écrit : FP.drawn.families.server.
(function () {
  'use strict';
  const D = window.FP.drawn, { paint, over, hash, M } = D;
  const B = D.material('#2a3040', '#465068', '#6a7896', '#9aa8c4', '#121620');
  const BAY = D.material('#14161e', '#1e2230', '#2c3244', '#48506a', '#121620');
  const RED = D.material('#5a1410', '#a8281e', '#e84a3a', '#ff9a80', '#2a0806');
  const GREEN = D.material('#1a4a14', '#3a8a24', '#7ad84a', '#c8f8a0', '#0a1e06');
  const YEL = D.material('#5a4a10', '#a88a1e', '#e8c43a', '#fff0a0', '#2a2006');
  const W = 60, H = 58, LEAN = 4;
  const sx = (y) => LEAN * (54 - y) / 50;   // décalage du haut : la baie penche

  // Câble arraché : épais de 2, qui pend en arc depuis le flanc droit.
  function cable(g, x0, y0, len, m, bend) {
    for (let k = 0; k <= len; k++) {
      const x = x0 + Math.round(Math.sin(k / len * Math.PI) * bend + k * .15), y = y0 + k;
      paint(g, x, y, m, 2); paint(g, x + 1, y, m, k % 3 ? 1 : 3);
    }
  }

  D.define('server', {
    w: W, h: H,
    paint(g, v) {
      D.softBox(g, 27, 29, 23, 26, B, { lean: LEAN, wobble: .6, seed: 3 });
      for (let i = 0; i < 4; i++) {                                         // tiroirs, fentes, voyant
        const y = 10 + i * 10, led = hash(i, v, 5) > .35 ? (i % 2 ? RED : GREEN) : BAY;
        D.softBox(g, 25 + sx(y), y + 2, 17, 3, BAY, { p: 4 });
        for (let x = 12; x < 30; x += 3) over(g, x + sx(y), y + 2, BAY, 0);
        over(g, 44 + sx(y), y + 1, led, 3); over(g, 44 + sx(y), y + 2, led, 2);
      }
      for (let y = 50; y < 53; y++) for (let x = 12; x < 40; x += 2) over(g, x + sx(y), y, B, 0);   // aération du bas
      cable(g, 48, 18, 18, RED, 4); cable(g, 47, 26, 13, YEL, 3);
      D.stains(g, B, 0, 10, 80 + v, { x: 4, y: 3, w: 48, h: 52 });           // éraflures et rouille de la variante
      D.stains(g, M.rust, 2, 5, 90 + v, { x: 4, y: 40, w: 48, h: 15 });
    }
  });
})();
