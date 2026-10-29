// world/silhouette.js — polygone de collision tiré de la silhouette d'un obstacle dessiné (v4.14.0, ?obstacles=dessin).
// Lit     : rien (fonctions pures sur des grilles et des masques).
// Écrit   : rien.
// Expose  : FP.silhouette.{mask(grid), erode(mask, n), components(mask), polygon(mask, maxPoints), coverage(mask, poly)} (purs, testés).
// Un masque : { w, h, on: Uint8Array } (1 = pixel plein). Les polygones sont dans le repère du masque, sur les coins des pixels.
// Connexité 4 : deux pixels qui ne se touchent que par un coin ne sont pas reliés (le contour les sépare).
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  const N4 = [[-1, 0], [1, 0], [0, -1], [0, 1]];

  function mask(grid) {
    const on = new Uint8Array(grid.w * grid.h);
    for (let y = 0; y < grid.h; y++) for (let x = 0; x < grid.w; x++) on[y * grid.w + x] = grid.get(x, y) ? 1 : 0;
    return { w: grid.w, h: grid.h, on };
  }

  const full = (m, x, y) => x >= 0 && y >= 0 && x < m.w && y < m.h && m.on[y * m.w + x] === 1;

  // Rétrécissement de n pixels : un pixel reste plein si lui et ses 4 voisins le sont.
  function erode(m, n) {
    let cur = m;
    for (let k = 0; k < n; k++) {
      const on = new Uint8Array(cur.w * cur.h);
      for (let y = 0; y < cur.h; y++) for (let x = 0; x < cur.w; x++)
        on[y * cur.w + x] = full(cur, x, y) && N4.every(([dx, dy]) => full(cur, x + dx, y + dy)) ? 1 : 0;
      cur = { w: cur.w, h: cur.h, on };
    }
    return cur;
  }

  // Étiquettes des composantes 4-connexes : { label: Int32Array (0 = vide), sizes: [taille de la composante i + 1] }.
  function label(m) {
    const lab = new Int32Array(m.w * m.h), sizes = [];
    for (let i = 0; i < lab.length; i++) {
      if (!m.on[i] || lab[i]) continue;
      const id = sizes.length + 1, stack = [i];
      let n = 0;
      lab[i] = id;
      while (stack.length) {
        const j = stack.pop(), x = j % m.w, y = (j - x) / m.w;
        n++;
        for (const [dx, dy] of N4) {
          if (!full(m, x + dx, y + dy)) continue;
          const k = (y + dy) * m.w + x + dx;
          if (!lab[k]) { lab[k] = id; stack.push(k); }
        }
      }
      sizes.push(n);
    }
    return { lab, sizes };
  }
  const components = (m) => label(m).sizes.length;

  // Bord extérieur de la plus grande composante : arêtes de pixels orientées (intérieur toujours du même côté), enchaînées ;
  // à un coin où deux arêtes repartent (deux pixels en diagonale), on tourne à droite : les pixels ne se relient pas par un coin.
  function outline(m) {
    const { lab, sizes } = label(m);
    if (!sizes.length) return [];
    const id = sizes.indexOf(Math.max(...sizes)) + 1, inC = (x, y) => full(m, x, y) && lab[y * m.w + x] === id;
    const out = new Map(), key = (x, y) => x + ',' + y;
    const add = (x0, y0, x1, y1) => { const k = key(x0, y0); if (!out.has(k)) out.set(k, []); out.get(k).push({ x0, y0, x1, y1, used: false }); };
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      if (!inC(x, y)) continue;
      if (!inC(x, y - 1)) add(x, y, x + 1, y);
      if (!inC(x + 1, y)) add(x + 1, y, x + 1, y + 1);
      if (!inC(x, y + 1)) add(x + 1, y + 1, x, y + 1);
      if (!inC(x - 1, y)) add(x, y + 1, x, y);
    }
    let best = [], bestArea = 0;
    for (const list of out.values()) for (const e0 of list) {
      if (e0.used) continue;
      const loop = [];
      let e = e0;
      while (e && !e.used) {
        e.used = true; loop.push([e.x0, e.y0]);
        const dx = e.x1 - e.x0, dy = e.y1 - e.y0, next = (out.get(key(e.x1, e.y1)) || []).filter(n => !n.used);
        const turn = (n) => { const ex = n.x1 - n.x0, ey = n.y1 - n.y0; return ex === -dy && ey === dx ? 0 : ex === dx && ey === dy ? 1 : 2; };
        e = next.sort((a, b) => turn(a) - turn(b))[0];
      }
      const a = Math.abs(area(loop));
      if (a > bestArea) { bestArea = a; best = loop; }
    }
    return best;
  }

  function area(p) { let s = 0; for (let i = 0, j = p.length - 1; i < p.length; j = i++) s += (p[j][0] - p[i][0]) * (p[j][1] + p[i][1]); return s / 2; }

  // Douglas-Peucker sur une polyligne ouverte (extrémités gardées).
  function dp(pts, tol) {
    if (pts.length < 3) return pts.slice();
    const [ax, ay] = pts[0], [bx, by] = pts[pts.length - 1], len = Math.hypot(bx - ax, by - ay) || 1;
    let far = 0, at = 0;
    for (let i = 1; i < pts.length - 1; i++) {
      const d = Math.abs((bx - ax) * (ay - pts[i][1]) - (ax - pts[i][0]) * (by - ay)) / len;
      if (d > far) { far = d; at = i; }
    }
    if (far <= tol) return [pts[0], pts[pts.length - 1]];
    return dp(pts.slice(0, at + 1), tol).slice(0, -1).concat(dp(pts.slice(at), tol));
  }

  // Anneau fermé : coupé au point le plus éloigné du premier, chaque moitié simplifiée.
  function simplifyRing(p, tol) {
    let far = 0, at = 0;
    for (let i = 1; i < p.length; i++) { const d = Math.hypot(p[i][0] - p[0][0], p[i][1] - p[0][1]); if (d > far) { far = d; at = i; } }
    const a = dp(p.slice(0, at + 1), tol), b = dp(p.slice(at).concat([p[0]]), tol);
    return a.slice(0, -1).concat(b.slice(0, -1));
  }

  // Polygone : tolérance .75 pixel (à 1 pixel, les cordes débordent de plus de 3 % sur une petite forme ronde), relevée par
  // pas de .25 tant qu'il y a trop de points.
  function polygon(m, maxPoints = 48) {
    const ring = outline(m);
    if (ring.length < 3) return ring;
    let tol = .75, p = simplifyRing(ring, tol);
    while (p.length > maxPoints) { tol += .25; p = simplifyRing(ring, tol); }
    return p.length >= 3 ? p : ring;
  }

  function inside(p, x, y) {
    let c = false;
    for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
      const [xi, yi] = p[i], [xj, yj] = p[j];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c;
    }
    return c;
  }

  // Couverture, sur les centres de pixels : part du masque dans le polygone ; surface du polygone hors masque / surface du masque.
  function coverage(m, poly) {
    let n = 0, hit = 0, over = 0;
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      const on = m.on[y * m.w + x] === 1, inP = inside(poly, x + .5, y + .5);
      if (on) { n++; if (inP) hit++; } else if (inP) over++;
    }
    return { inside: n ? hit / n : 0, outside: n ? over / n : 0 };
  }

  FP.silhouette = { mask, erode, components, polygon, coverage };
})();
