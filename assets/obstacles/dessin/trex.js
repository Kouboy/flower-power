// assets/obstacles/dessin/trex.js — famille `trex_signature` : squelette de T-Rex, l'obstacle rare (v4.14.0) — os ivoire
// et beige, crâne de profil tourné vers la droite (jamais retourné), cou, colonne arquée jusqu'au bout de la queue, cage
// thoracique (l'intérieur en ombre : la cage fait bloc), bassin, deux pattes, petits bras. Os d'au moins 3 pixels
// d'épaisseur : le squelette reste d'un seul tenant une fois rétréci. Variantes : taches de terre.
// Lit     : FP.drawn (kit.js).   Écrit : FP.drawn.families.trex_signature.
(function () {
  'use strict';
  const D = window.FP.drawn, { paint, over, M } = D;
  const BONE = D.material('#6a5a40', '#b0a080', '#e8dcc0', '#fff8e8', '#2a2014');
  const SHADOW = D.material('#1e1810', '#2a2216', '#3a3020', '#4a3e2c', '#2a2014');
  const W = 140, H = 105;

  // Os : disques de rayon r le long d'un segment (r décroît de r0 à r1), éclairés en haut.
  function bone(g, x0, y0, x1, y1, r0, r1) {
    const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0));
    for (let k = 0; k <= n; k++) {
      const t = k / n, cx = x0 + (x1 - x0) * t, cy = y0 + (y1 - y0) * t, r = r0 + (r1 - r0) * t;
      for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) {
        const dx = x + .5 - cx, dy = y + .5 - cy;
        if (dx * dx + dy * dy > r * r) continue;
        paint(g, x, y, BONE, dy < -r * .35 ? 3 : dy > r * .45 ? 1 : 2);
      }
    }
  }
  // Polyligne d'os.
  const chain = (g, pts, r0, r1) => pts.slice(1).forEach((p, i) => bone(g, pts[i][0], pts[i][1], p[0], p[1], r0 + (r1 - r0) * i / (pts.length - 1), r0 + (r1 - r0) * (i + 1) / (pts.length - 1)));

  D.define('trex_signature', {
    w: W, h: H,
    inset: 0,   // os fins : rétréci d'un pixel, le polygone de 48 points déborderait de plus de 3 % ; le contour compte donc
    paint(g, v) {
      D.blob(g, 72, 46, 17, 13, SHADOW);                                     // intérieur de la cage, en ombre
      chain(g, [[4, 60], [20, 51], [40, 41], [58, 34], [78, 32], [92, 30], [104, 26]], 2.6, 4.6);   // queue, colonne, cou
      for (let i = 0; i < 6; i++) {                                          // côtes
        const x = 60 + i * 5.5, len = 20 - Math.abs(i - 2.5) * 2.5;
        chain(g, [[x, 34], [x + 3, 34 + len * .55], [x + 1, 34 + len]], 1.6, 1.6);
      }
      bone(g, 58, 56, 90, 57, 1.8, 1.8);                                     // sternum
      D.blob(g, 47, 46, 9, 7, BONE, { wobble: 1, seed: 3 });                 // bassin
      chain(g, [[44, 48], [30, 68], [35, 84], [27, 98]], 5.5, 3.6);         // patte arrière, en marche
      chain(g, [[52, 50], [66, 68], [60, 86], [67, 98]], 5.5, 3.6);         // patte avant
      D.softBox(g, 24, 100, 7, 3, BONE, { p: 3 }); D.softBox(g, 71, 100, 7, 3, BONE, { p: 3 });   // pieds
      chain(g, [[90, 40], [96, 48], [102, 47]], 2.2, 2);                     // petit bras
      D.softBox(g, 120, 24, 17, 11, BONE, { p: 3, lean: -4, wobble: .5, seed: 9 });   // crâne
      D.softBox(g, 121, 39, 15, 4, BONE, { p: 3, lean: 3 });                 // mâchoire
      D.blob(g, 113, 20, 4, 3.5, SHADOW); D.blob(g, 127, 30, 6, 2.5, SHADOW);   // orbite, fenêtre du crâne
      for (let x = 108; x < 136; x += 3) { over(g, x, 35, BONE, 3); over(g, x, 36, BONE, 3); }   // dents
      for (let x = 107; x < 136; x++) over(g, x, 34 + (x % 3 === 0 ? 1 : 0), SHADOW, 1);
      D.stains(g, M.mud, 2, 18, 240 + v, { x: 4, y: 20, w: 132, h: 82 });
    }
  });
})();
