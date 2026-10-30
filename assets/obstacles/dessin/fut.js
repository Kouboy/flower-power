// assets/obstacles/dessin/fut.js — famille `nuclear` : fût de déchets nucléaires (v4.14.0) — jaune bombé, cerclages, trèfle
// noir, couvercle qui déborde de vert acide, bouchon. Variantes : taches de rouille et coulures intérieures.
// Lit     : FP.drawn (kit.js).   Écrit : FP.drawn.families.nuclear.
(function () {
  'use strict';
  const D = window.FP.drawn, { paint, over, tone, drip, M } = D;
  const Y = D.material('#6a4210', '#b8801c', '#ecc02c', '#fae67a', '#2a1806');
  const SIGN = '#1c1410';
  const W = 42, H = 62, cx = 20.5, ty = 6, by = 55, ry = 5;
  const rxAt = (y) => 19.4 + .9 * Math.sin(Math.PI * Math.min(1, Math.max(0, (y - ty) / (by - ty))));   // flancs bombés

  D.define('nuclear', {
    w: W, h: H,
    paint(g, v) {
      for (let y = ty; y < H; y++) for (let x = 0; x < W; x++) {          // corps, fond arrondi
        const rx = rxAt(y), n = (x + .5 - cx) / rx;
        if (Math.abs(n) > 1 || y > by + ry * Math.sqrt(1 - n * n)) continue;
        g.set(x, y, y > by + ry * Math.sqrt(1 - n * n) - 2 ? Y[1] : tone(Y, n), Y.ink);
      }
      for (let x = 0; x < W; x++) {                                        // cerclages qui suivent la courbe
        const n = (x + .5 - cx) / rxAt(30);
        if (Math.abs(n) > 1) continue;
        const e = ry * Math.sqrt(1 - n * n);
        for (const r of [21, 38]) { over(g, x, r + e, Y, 0); over(g, x, r + e + 1, Y, 3); }
      }
      for (let y = 0; y < 12; y++) for (let x = 0; x < W; x++) {          // couvercle
        const d = ((x + .5 - cx) / rxAt(ty)) ** 2 + ((y + .5 - ty) / ry) ** 2;
        if (d <= 1) paint(g, x, y, Y, d > .62 ? (y < ty ? 3 : 2) : 1);
      }
      for (let y = 3; y < 9; y++) for (let x = 7; x < 21; x++)            // flaque verte sur le couvercle
        if (((x - 14) / 6.5) ** 2 + ((y - 6) / 2.6) ** 2 <= 1) paint(g, x, y, M.goo, x < 12 ? 3 : 2);
      for (let x = 26; x < 32; x++) { paint(g, x, 4, M.metal, 3); paint(g, x, 5, M.metal, 2); }   // bouchon
      const sx = 20.5, sy = 33;                                            // trèfle
      for (let y = sy - 9; y <= sy + 9; y++) for (let x = sx - 9; x <= sx + 9; x++) {
        const dx = x - sx, dy = y - sy, d = Math.hypot(dx, dy), a = Math.atan2(dy, dx) * 180 / Math.PI;
        const blade = [-150, -30, 90].some(b => Math.abs(((a - b + 540) % 360) - 180) < 30);
        if (d < 2.2 || (d > 3.3 && d < 8.6 && blade)) g.set(x, y, SIGN, Y.ink);
      }
      drip(g, 9, 9, 10, M.goo); drip(g, 15, 9, 4, M.goo); drip(g, 31, 9, 13, M.goo); drip(g, 35, 8, 5, M.goo);
      D.stains(g, M.rust, 2, 12, 70 + v, { x: 1, y: 12, w: 40, h: 46 });  // rouille de la variante
    }
  });
})();
