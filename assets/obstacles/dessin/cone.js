// assets/obstacles/dessin/cone.js — famille `cone` : cône de chantier penché sur son socle plat (v4.14.0) — orange et blanc,
// socle carré aux coins arrondis vu de biais, bouche qui coule. Variantes : éraflures et terre sur le plastique.
// Lit     : FP.drawn (kit.js).   Écrit : FP.drawn.families.cone.
(function () {
  'use strict';
  const D = window.FP.drawn, { paint, tone, drip, M } = D;
  const O = D.material('#6a2410', '#c04a1c', '#f27a2a', '#ffb878', '#2e0e04');
  const Wh = D.material('#7a7480', '#bcb8c0', '#ece8e0', '#ffffff', '#2e0e04');
  const W = 42, H = 47;

  D.define('cone', {
    w: W, h: H,
    paint(g, v) {
      for (let y = 33; y < H; y++) for (let x = 0; x < W; x++) {          // socle : dessus clair, épaisseur sombre
        const u = (x + .5 - 21) / 20.5, top = u ** 4 + ((y + .5 - 39) / 4.5) ** 4, side = u ** 4 + ((y + .5 - 42) / 4.5) ** 4;
        if (top <= 1) paint(g, x, y, O, u < -.55 || y < 37 ? 3 : 2);
        else if (y > 39 && side <= 1) paint(g, x, y, O, u > .6 ? 0 : 1);
      }
      for (let y = 3; y <= 39; y++) {                                      // corps penché, deux bandes blanches
        const cx = 21 + (39 - y) * .2, hw = 3 + (y - 3) * .38, t = (y - 3) / 36;
        const stripe = (t > .28 && t < .44) || (t > .62 && t < .78);
        for (let x = Math.floor(cx - hw); x <= Math.ceil(cx + hw); x++) {
          const n = (x - cx) / hw;
          if (Math.abs(n) <= 1) g.set(x, y, tone(stripe ? Wh : O, n), O.ink);
        }
      }
      const tx = 28;                                                       // bouche, ourlée
      for (let x = tx - 3; x <= tx + 3; x++) { paint(g, x, 2, O, 3); paint(g, x, 3, O, 0); }
      paint(g, tx - 4, 3, O, 2); paint(g, tx + 4, 3, O, 1);
      drip(g, 30, 4, 9, M.goo); drip(g, 25, 4, 4, M.goo);
      D.stains(g, O, 0, 7, 40 + v, { x: 8, y: 8, w: 26, h: 30 });         // usure de la variante : éraflures, terre au pied
      D.stains(g, M.mud, 2, 6, 50 + v, { x: 2, y: 34, w: 38, h: 10 });
    }
  });
})();
