// assets/obstacles/dessin/microondes.js — famille `microwave` : four à micro-ondes (v4.14.0) — caisse crème bombée, vitre
// noire avec un reflet, porte de travers, bouton et touches ; coins rouillés. Variantes : rouille et éraflures.
// Lit     : FP.drawn (kit.js).   Écrit : FP.drawn.families.microwave.
(function () {
  'use strict';
  const D = window.FP.drawn, { paint, over, M } = D;
  const C = D.material('#6a5a40', '#b0a080', '#e0d4b4', '#f8f0dc', '#2a2014');
  const GLASS = D.material('#0c0e14', '#141820', '#20283a', '#5a7090', '#2a2014');
  const W = 45, H = 32;

  D.define('microwave', {
    w: W, h: H,
    paint(g, v) {
      D.softBox(g, 22, 16, 21.5, 14.5, C, { wobble: .4, seed: 1, lean: -1 });
      for (let y = 5; y < 27; y++) for (let x = 4; x < 31; x++) {          // porte de travers
        const yy = y + Math.round((x - 4) * .06);
        if (yy >= 5 && yy < 26) paint(g, x, yy, C, x === 4 || yy === 5 ? 3 : 2);
      }
      D.softBox(g, 17, 15.5, 11, 8, GLASS, { p: 4 });                       // vitre et son reflet
      for (let k = 0; k < 6; k++) over(g, 10 + k, 10 + k, GLASS, 3);
      for (let y = 6; y < 25; y++) paint(g, 31, y, C, 0);                    // jour de la porte
      D.blob(g, 37.5, 10, 3, 3, M.metal);                                    // bouton
      for (const y of [16, 19, 22]) for (let x = 35; x < 41; x++) paint(g, x, y, C, x < 38 ? 1 : 0);   // touches
      for (const [x, y] of [[2, 3], [41, 3], [2, 27], [41, 27]]) D.stains(g, M.rust, 2, 3, x * 7 + y + v, { x: x - 2, y: y - 2, w: 4, h: 4 });   // coins rouillés
      D.stains(g, M.rust, 1, 6, 30 + v, { x: 2, y: 2, w: 41, h: 28 });
      D.stains(g, C, 1, 6, 60 + v, { x: 2, y: 2, w: 41, h: 28 });
    }
  });
})();
