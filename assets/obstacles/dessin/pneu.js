// assets/obstacles/dessin/pneu.js — famille `tire` : deux vieux pneus empilés (v4.14.0, essai validé « v3 ») — caoutchouc
// gris ardoise délavé, celui du haut affaissé à droite et entaillé (fils d'acier), sculptures rasées, craquelures, boue au pied,
// coulure qui sort du pneu du haut. Variantes : poussière, éraflures et terre sur le dessus.
// Lit     : FP.drawn (kit.js).   Écrit : FP.drawn.families.tire.
(function () {
  'use strict';
  const D = window.FP.drawn, { paint, over, tone, hash, drip, M } = D;
  const R = D.material('#1a1820', '#36323c', '#545060', '#80788a', '#0e0c12');
  const DUST = D.material('#5e5650', '#6e6458', '#8a7a66', '#a89880', '#0e0c12');
  const W = 52, H = 34;
  // Pneu du bas puis pneu du haut (plus petit, de travers, affaissé côté droit).
  const TIRES = [{ cx: 25, cy: 18, rx: 25, ry: 7.5, ix: 12.5, iy: 3.8, h: 7, tilt: -.04, sag: 0, k: 1 },
                 { cx: 27, cy: 9, rx: 22, ry: 6.5, ix: 11, iy: 3.4, h: 6, tilt: .06, sag: 3, k: 2 }];
  const notch = (T, x, y) => T.k === 2 && x >= 39 && x <= 43 && y >= 4 && y <= 12 - (x - 39);   // entaille du pneu du haut

  function paintTire(g, T) {
    const lean = (x) => (x - T.cx) * T.tilt + T.sag * Math.max(0, (x - T.cx) / T.rx) ** 2;
    const dent = (x) => 1 + .07 * Math.sin(x * .45 + T.k * 2) - .08 * (hash(x >> 2, 0, T.k) > .7);
    for (let x = 0; x < W; x++) {                                       // flanc : sculptures rasées, craquelures
      const n = (x - T.cx) / T.rx;
      if (Math.abs(n) > 1) continue;
      const e = T.ry * Math.sqrt(1 - n * n) * dent(x), y0 = T.cy + lean(x);
      for (let y = Math.round(y0); y <= y0 + e + T.h; y++) if (!notch(T, x, y)) g.set(x, y, tone(R, n), R.ink);
      if (x % 4 === 1 && Math.abs(n) < .9 && hash(x, 0, T.k + 5) > .55) for (let k = 3; k < 5; k++) over(g, x, y0 + e + k, R, 0);
      if (hash(x, 1, T.k + 3) < .12 && Math.abs(n) < .85) { over(g, x, y0 + e + 2, R, 0); over(g, x + 1, y0 + e + 3, R, 0); over(g, x + 1, y0 + e + 4, R, 0); }
      over(g, x, y0 + e + T.h, R, 0);
    }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {           // dessus : anneau, trou sombre
      const yy = y - lean(x), d = ((x - T.cx) / T.rx) ** 2 + ((yy - T.cy) / (T.ry * dent(x))) ** 2;
      if (d > 1 || notch(T, x, y)) continue;
      const di = ((x - T.cx - 1) / T.ix) ** 2 + ((yy - T.cy) / T.iy) ** 2;
      paint(g, x, y, di <= 1 ? (yy > T.cy ? M.mud : R) : R, di <= 1 ? 0 : (yy < T.cy && d > .55 && d < .85) ? 3 : 2);
    }
  }

  D.define('tire', {
    w: W, h: H,
    paint(g, v) {
      for (const T of TIRES) paintTire(g, T);
      for (let y = 5; y < 12; y++) for (let x = 39; x < 44; x++)          // fils d'acier qui pendent dans l'entaille
        if (x === 40 + (y % 3) && y > 12 - (x - 39) - 3) paint(g, x, y, M.metal, y % 2 ? 2 : 3);
      for (const [x, y] of [[12, 6], [13, 7], [14, 7], [15, 8]]) over(g, x, y, R, 0);   // fissure
      D.stains(g, DUST, 2, 14, 10 + v, { x: 2, y: 4, w: 48, h: 26 });     // usure de la variante : poussière, terre sur le dessus
      D.stains(g, M.mud, 2, 6, 20 + v, { x: 6, y: 3, w: 40, h: 8 });
      for (let x = 0; x < 22; x++) {                                       // boue collée au pied, à gauche
        const top = 29 + Math.round(Math.sin(x * 1.3) * 1.2 + hash(x, 1, 3) * 2);
        for (let y = top; y < H; y++) paint(g, x, y, M.mud, y === top ? 3 : hash(x, y, 4) < .5 ? 2 : 1);
      }
      for (let x = 18; x < 30; x++) {                                      // coulée qui sort du pneu du haut
        const top = 12 + Math.round(Math.sin(x * .9) * .8), bot = top + 2 + Math.round(Math.sin(x * 1.7) * 1.2 + hash(x, 2, 2) * 1.5);
        for (let y = top; y <= bot; y++) paint(g, x, y, M.goo, y === top ? 3 : y === bot ? 1 : x < 21 ? 3 : 2);
      }
      drip(g, 20, 16, 4, M.goo); drip(g, 26, 16, 9, M.goo);
      for (let y = 31; y < H; y++) for (let x = 20; x < 42; x++) {          // flaque au pied, décentrée
        const d = ((x - 30) / 10) ** 2 + ((y - 32.5) / 1.6) ** 2;
        if (d <= 1) paint(g, x, y, M.goo, y < 32 ? 3 : d < .5 ? 2 : 1);
      }
    }
  });
})();
