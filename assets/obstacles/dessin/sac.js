// assets/obstacles/dessin/sac.js — famille `trashbag` : sac poubelle (v4.14.0) — noir brillant, bosselé, nœud serré d'un
// lien jaune, déchirure d'où sortent une canette et une peau de banane. Variantes : reflets et taches.
// Lit     : FP.drawn (kit.js).   Écrit : FP.drawn.families.trashbag.
(function () {
  'use strict';
  const D = window.FP.drawn, { paint, over, M } = D;
  const BAG = D.material('#0c0c10', '#1c1c24', '#2e2e3a', '#6a6a80', '#050508');
  const TIE = D.material('#5a4a10', '#a88a1e', '#e8c43a', '#fff0a0', '#2a2006');
  const CAN = D.material('#5a1410', '#a8281e', '#e84a3a', '#ff9a80', '#2a0806');
  const BAN = D.material('#5a4a10', '#b8a020', '#f0d840', '#fff4a0', '#2a2006');
  const W = 48, H = 48;

  D.define('trashbag', {
    w: W, h: H,
    paint(g, v) {
      D.blob(g, 24, 32, 20, 14, BAG, { wobble: 1.5, seed: 1 });             // ventre bosselé
      D.blob(g, 17, 26, 11, 11, BAG, { wobble: 1, seed: 4 });
      D.blob(g, 30, 25, 10, 10, BAG, { wobble: 1, seed: 7 });
      D.blob(g, 24, 11, 5, 6, BAG);                                           // col froncé
      for (let k = 0; k < 4; k++) { D.blob(g, 20 - k, 4 - Math.min(k, 2), 2, 2, BAG); D.blob(g, 28 + k, 4 - Math.min(k, 2), 2, 2, BAG); }   // oreilles du nœud
      for (let x = 19; x < 30; x++) { paint(g, x, 13, TIE, 3); paint(g, x, 14, TIE, 1); }   // lien jaune
      for (const [x, y, n] of [[12, 22, 6], [33, 20, 5], [20, 36, 8]]) for (let k = 0; k < n; k++) over(g, x + k, y - Math.round(k * .5), BAG, 3);   // reflets brillants
      for (let y = 30; y < 40; y++) for (let x = 36; x < 44; x++)            // déchirure
        if (((x - 40) / 4) ** 2 + ((y - 35) / 5) ** 2 <= 1) paint(g, x, y, BAG, 0);
      D.softBox(g, 41, 34, 3, 4.5, CAN, { p: 4, lean: 2 });                   // canette qui dépasse
      for (let y = 31; y < 38; y++) paint(g, 42, y, M.metal, 3);
      for (let k = 0; k < 10; k++) for (let j = 0; j < 3; j++) paint(g, 36 - Math.round(k * .5) + j, 38 + Math.round(k * .7), BAN, j === 0 ? 3 : j === 2 ? 1 : 2);   // peau de banane
      for (let k = 0; k < 6; k++) { paint(g, 37 + k, 38 + Math.round(k * .9), BAN, 2); paint(g, 38 + k, 38 + Math.round(k * .9), BAN, 1); }
      D.stains(g, BAG, 3, 6, 200 + v, { x: 8, y: 16, w: 32, h: 28 });
      D.stains(g, M.mud, 2, 5, 210 + v, { x: 6, y: 38, w: 36, h: 8 });
    }
  });
})();
