// assets/obstacles/dessin/batterie.js — famille `battery` : batterie de voiture (v4.14.0) — bloc noir au flanc gonflé,
// couvercle rouge, deux bornes croûtées de sulfate vert pâle, coulure qui suinte du flanc. Variantes : éraflures, sulfate.
// Lit     : FP.drawn (kit.js).   Écrit : FP.drawn.families.battery.
(function () {
  'use strict';
  const D = window.FP.drawn, { paint, drip, M } = D;
  const BLK = D.material('#141218', '#28262e', '#403c48', '#646070', '#08060a');
  const RED = D.material('#5a1010', '#a02020', '#d83a2a', '#f07a5a', '#2a0606');
  const SUL = D.material('#4a7a5a', '#7ab88a', '#a8e0b0', '#e0f8e4', '#14261a');
  const W = 40, H = 38;

  D.define('battery', {
    w: W, h: H,
    paint(g, v) {
      D.softBox(g, 19, 22, 16, 14, BLK, { wobble: .5, seed: 4 });             // bloc et flanc gonflé
      D.blob(g, 33, 25, 4, 8, BLK);
      D.softBox(g, 19, 10, 17, 3.5, RED, { p: 4 });                           // couvercle
      for (const x of [9, 29]) {                                             // bornes et leur croûte
        D.softBox(g, x, 5.5, 2.5, 2.5, M.metal, { p: 4 });
        D.blob(g, x, 6.5, 4.5, 2.6, SUL, { wobble: .8, seed: x });
      }
      for (let x = 7; x < 12; x++) paint(g, x, 2, M.metal, 3);                 // + et −
      paint(g, 9, 1, M.metal, 3); paint(g, 9, 3, M.metal, 3);
      for (let x = 27; x < 32; x++) paint(g, x, 2, M.metal, 3);
      drip(g, 34, 30, 4, M.goo);                                               // suintement du flanc
      D.stains(g, BLK, 3, 8, 120 + v, { x: 4, y: 14, w: 32, h: 20 });
      D.stains(g, SUL, 2, 4, 130 + v, { x: 4, y: 9, w: 32, h: 4 });
    }
  });
})();
