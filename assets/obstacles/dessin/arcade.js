// assets/obstacles/dessin/arcade.js — famille `arcade` : borne d'arcade penchée (v4.14.0) — caisse bleu roi haute et
// étroite, fronton magenta lumineux, écran encastré fendu où traîne une image, tableau de commande en saillie (joystick
// tordu, boutons), trappe à pièces. Variantes : éraflures et rouille.
// Lit     : FP.drawn (kit.js).   Écrit : FP.drawn.families.arcade.
(function () {
  'use strict';
  const D = window.FP.drawn, { paint, over, M } = D;
  const BLUE = D.material('#141c5a', '#2434a0', '#3a54d8', '#7a94f4', '#0a0e2e');
  const MAG = D.material('#5a0e3a', '#a01e6a', '#e0389a', '#f88cc8', '#2a0418');
  const SCR = D.material('#060a10', '#0e1620', '#16303a', '#4ad0c8', '#0a0e2e');
  const RED = D.material('#5a1410', '#a8281e', '#e84a3a', '#ff9a80', '#2a0806');
  const COIN = D.material('#5a3010', '#a8601e', '#e8963a', '#ffd080', '#2a1406');
  const W = 75, H = 87, LEAN = 10;
  const at = (y) => LEAN * (84 - y) / 80;   // décalage vers la droite en montant : la borne penche

  D.define('arcade', {
    w: W, h: H,
    paint(g, v) {
      D.softBox(g, 33, 48, 22, 36, BLUE, { lean: LEAN * .9, p: 8, wobble: .5, seed: 2 });   // caisse
      D.softBox(g, 33 + at(9), 9, 25, 6.5, MAG, { p: 6, wobble: .4, seed: 5 });             // fronton lumineux
      for (let x = 15; x < 54; x++) if (x % 4 !== 0) over(g, x + at(9), 9, MAG, 3);
      D.softBox(g, 33 + at(30), 30, 17, 12, BLUE, { p: 6, lean: 2 });                      // cadre de l'écran
      D.softBox(g, 33 + at(30), 30, 14, 9.5, SCR, { p: 4, lean: 2 });                       // écran, image figée, fêlure
      for (const [x, y, k] of [[-6, -3, 3], [-5, -3, 3], [4, 2, 2], [5, 2, 3], [-1, 4, 2], [0, 4, 2]]) over(g, 33 + at(30) + x, 30 + y, SCR, k);
      for (let k = 0; k < 14; k++) over(g, 38 + at(30) - Math.round(k * .45), 22 + k, M.metal, 3);
      D.softBox(g, 34 + at(47), 47, 27, 4.5, MAG, { p: 4 });                                // tableau de commande en saillie
      for (let y = 37; y < 44; y++) { paint(g, 22 + at(44) + Math.round((44 - y) * .6), y, M.metal, 2); paint(g, 23 + at(44) + Math.round((44 - y) * .6), y, M.metal, 1); }   // manche tordu
      for (let x = 0; x < 6; x++) { paint(g, 25 + at(36) + x, 35, RED, 3); paint(g, 25 + at(36) + x, 36, RED, 1); }   // boule aplatie
      for (const x of [36, 42, 48]) { paint(g, x + at(46), 45, RED, 3); paint(g, x + 1 + at(46), 45, RED, 2); }   // boutons
      D.softBox(g, 31 + at(68), 68, 7, 6, BLUE, { p: 4 });                                  // trappe à pièces
      for (const x of [-3, 2]) { over(g, 31 + at(66) + x, 66, COIN, 3); over(g, 31 + at(66) + x, 67, COIN, 2); over(g, 32 + at(66) + x, 66, COIN, 2); over(g, 32 + at(66) + x, 67, COIN, 1); }
      D.stains(g, BLUE, 0, 12, 100 + v, { x: 11, y: 16, w: 52, h: 68 });
      D.stains(g, M.rust, 2, 5, 110 + v, { x: 11, y: 70, w: 52, h: 14 });
    }
  });
})();
