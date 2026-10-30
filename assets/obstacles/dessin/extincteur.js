// assets/obstacles/dessin/extincteur.js — famille `extinguisher` : extincteur cabossé (v4.14.0) — corps rouge vif bombé,
// tête et poignée noires, manomètre, tuyau qui pend et s'enroule au pied. Variantes : éraflures et bosses.
// Lit     : FP.drawn (kit.js).   Écrit : FP.drawn.families.extinguisher.
(function () {
  'use strict';
  const D = window.FP.drawn, { paint, over, M } = D;
  const R = D.material('#5a0e0a', '#a01a14', '#e0342a', '#ff8a70', '#2a0504');
  const BLK = D.material('#141218', '#28262e', '#403c48', '#646070', '#08060a');
  const DIAL = D.material('#8a8a80', '#c8c8c0', '#f0f0e8', '#ffffff', '#08060a');
  const W = 36, H = 39;

  D.define('extinguisher', {
    w: W, h: H,
    paint(g, v) {
      for (let k = 0; k < 60; k++) {                                         // tuyau : de la tête, pend à droite, s'enroule au pied
        const t = k / 59, x = 22 + Math.sin(t * 2.6) * 8, y = 7 + t * 29;
        for (let j = 0; j < 4; j++) paint(g, x + j, y, BLK, j === 0 ? 2 : j === 3 ? 0 : 1);
      }
      D.softBox(g, 15, 24, 10, 14, R, { p: 5, wobble: .3, seed: 2 });       // corps, à peine cabossé
      D.softBox(g, 15, 8, 5, 3, BLK, { p: 4 });                              // tête et poignée
      for (let x = 12; x < 26; x++) { paint(g, x, 3 - (x > 20 ? 1 : 0), BLK, 3); paint(g, x, 4 - (x > 20 ? 1 : 0), BLK, 1); }
      D.blob(g, 11, 16, 3.5, 3.5, DIAL);                                     // manomètre
      paint(g, 11, 16, R, 0); paint(g, 12, 15, R, 0);
      for (let x = 6; x < 24; x++) over(g, x, 20, R, 3);                     // étiquette
      for (let x = 6; x < 24; x++) over(g, x, 25, R, 1);
      for (const [x, y] of [[19, 29], [8, 33]]) { over(g, x, y, R, 0); over(g, x + 1, y, R, 1); over(g, x, y + 1, R, 1); }   // bosses
      D.stains(g, R, 0, 6, 220 + v, { x: 5, y: 12, w: 20, h: 24 });
      D.stains(g, M.rust, 2, 4, 230 + v, { x: 5, y: 30, w: 20, h: 8 });
    }
  });
})();
