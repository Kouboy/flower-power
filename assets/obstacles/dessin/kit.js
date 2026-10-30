// assets/obstacles/dessin/kit.js — boîte à outils des obstacles dessinés par le code (v4.14.0, ?obstacles=dessin) : grille de
// pixels d'art, matières à 4 teintes et contour teinté, volumes arrondis, coulures, tirage d'usure déterministe.
// Lit     : rien (aucun DOM : les dessins sont des données, lues par world/catalog.js et render/obstacles.js).
// Écrit   : FP.drawn.families (registre des familles, rempli par assets/obstacles/dessin/<famille>.js).
// Expose  : FP.drawn = { families, define(kind, def), grid(w, h), renderDef(def, v), render(kind, v), material(…), M, paint,
//           over, stains, tone(m, n), blob, roundRect, softBox, drip, hash(x, y, k) }.
// Une famille : define(kind, { w, h, inset?, paint(g, v) }) — w × h pixels d'art sans le contour, v = variante 0 à 3.
// Règles de la spec (docs/superpowers/specs/2026-10-29-obstacles-dessines-design.md) : rond, organique, contour teinté,
// d'un seul tenant ; les variantes ne changent que l'intérieur de la silhouette.
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  const families = {};

  const define = (kind, def) => { families[kind] = def; };

  // Grille de w × h pixels : une couleur et, pour le contour, l'encre de la matière qui l'a peinte.
  function grid(w, h) {
    const col = new Array(w * h).fill(null), inks = new Array(w * h).fill(null);
    const at = (x, y) => { x = Math.round(x); y = Math.round(y); return x >= 0 && y >= 0 && x < w && y < h ? y * w + x : -1; };
    return {
      w, h,
      set(x, y, c, ink) { const i = at(x, y); if (i >= 0) { col[i] = c; inks[i] = ink || null; } },
      get(x, y) { const i = at(x, y); return i >= 0 ? col[i] : null; },
      ink(x, y) { const i = at(x, y); return i >= 0 ? inks[i] : null; }
    };
  }

  // Grille rendue : le dessin décalé d'un pixel (il ne peut pas sortir de son cadre), puis le contour teinté — tout pixel vide
  // voisin (4-connexe) d'un pixel peint prend l'encre de ce voisin (gauche, droite, haut, bas, le premier trouvé).
  function renderDef(def, v) {
    const g = grid(def.w + 2, def.h + 2), inside = (x, y) => x >= 0 && y >= 0 && x < def.w && y < def.h;
    def.paint({
      w: def.w, h: def.h,
      set(x, y, c, ink) { x = Math.round(x); y = Math.round(y); if (inside(x, y)) g.set(x + 1, y + 1, c, ink); },
      get(x, y) { x = Math.round(x); y = Math.round(y); return inside(x, y) ? g.get(x + 1, y + 1) : null; },
      ink(x, y) { x = Math.round(x); y = Math.round(y); return inside(x, y) ? g.ink(x + 1, y + 1) : null; }
    }, v | 0);
    const out = grid(g.w, g.h);
    for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
      const c = g.get(x, y);
      if (c) { out.set(x, y, c, g.ink(x, y)); continue; }
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        if (!g.get(x + dx, y + dy)) continue;
        const ink = g.ink(x + dx, y + dy) || g.get(x + dx, y + dy);
        out.set(x, y, ink, ink); break;
      }
    }
    return out;
  }
  const render = (kind, v) => renderDef(families[kind], v);

  // Matière : sombre, ombre, corps, reflet (indices 0 à 3) et son encre de contour (la teinte très assombrie).
  function material(dark, shade, body, light, ink) { const m = [dark, shade, body, light]; m.ink = ink; return m; }
  const M = {
    goo: material('#2e5010', '#6ea820', '#aedc3a', '#e4f89a', '#16260a'),     // coulure vert acide, plus jaune que la tige
    metal: material('#3a3e48', '#6a7484', '#9aa4b0', '#d8e0e8', '#181a20'),
    mud: material('#2e2014', '#4a3420', '#6a4c2c', '#8a6a44', '#140c06'),
    rust: material('#4a2210', '#7a3a18', '#a85a28', '#c8804a', '#1e0c04')
  };
  const paint = (g, x, y, m, k) => g.set(x, y, m[k], m.ink);
  // Sur un pixel déjà peint seulement : usure, taches, éraflures (les variantes ne touchent jamais la silhouette).
  const over = (g, x, y, m, k) => { if (g.get(x, y)) paint(g, x, y, m, k); };

  // Volume arrondi : teinte selon la position horizontale n (-1 bord gauche … 1 bord droit), lumière en haut à gauche.
  const tone = (m, n) => (n < -.82 ? m[1] : n < -.5 ? m[2] : n < -.2 ? m[3] : n < .55 ? m[2] : n < .82 ? m[1] : m[0]);

  // Tirage déterministe dans [0, 1[ : usure, taches, variantes.
  function hash(x, y, k) {
    let h = Math.imul(x * 374761393 + y * 668265263 + k * 2246822519, 1274126177);
    h ^= h >>> 13;
    return ((h >>> 0) % 1000) / 1000;
  }

  // Taches groupées (1 à 4 pixels chacune) sur les pixels déjà peints d'une zone : usure, rouille, terre d'une variante.
  function stains(g, m, k, count, seed, box) {
    for (let i = 0; i < count; i++) {
      const x = box.x + Math.floor(hash(i, 1, seed) * box.w), y = box.y + Math.floor(hash(i, 2, seed) * box.h), s = 1 + Math.floor(hash(i, 3, seed) * 4);
      over(g, x, y, m, k);
      if (s > 1) over(g, x + 1, y, m, k);
      if (s > 2) over(g, x, y + 1, m, k);
      if (s > 3) over(g, x - 1, y + 1, m, Math.max(0, k - 1));
    }
  }

  // Ellipse pleine modelée : reflet en croissant en haut à gauche, ombre en bas à droite. opts.wobble : bord qui ondule
  // (pixels), opts.seed : sa phase.
  function blob(g, cx, cy, rx, ry, m, opts = {}) {
    const wob = (opts.wobble || 0) / Math.max(rx, ry), ph = opts.seed || 0, R = Math.ceil(Math.max(rx, ry) * (1 + wob)) + 1;
    for (let y = Math.floor(cy - R); y <= cy + R; y++) for (let x = Math.floor(cx - R); x <= cx + R; x++) {
      const lx = (x - cx) / rx, ly = (y - cy) / ry, k = 1 + wob * Math.sin(Math.atan2(ly, lx) * 3 + ph);
      if (lx * lx + ly * ly > k * k) continue;
      const s = lx * .5 + ly * .85;
      paint(g, x, y, m, (lx + .35) ** 2 + (ly + .45) ** 2 < .12 ? 3 : s > .85 ? 0 : s > .4 ? 1 : 2);
    }
  }

  // Rectangle aux coins arrondis de rayon r (≥ 2), modelé arrondi ; opts.bulge : côtés qui bombent (pixels au milieu de la
  // hauteur), opts.wobble / opts.seed : bords qui ondulent.
  function roundRect(g, x, y, w, h, r, m, opts = {}) {
    const bulge = opts.bulge || 0, wob = opts.wobble || 0, ph = opts.seed || 0;
    for (let py = y; py < y + h; py++) {
      const t = (py + .5 - y) / h, extra = Math.round(bulge * Math.sin(Math.PI * t) + wob * Math.sin(py * .7 + ph));
      const x0 = x - extra, x1 = x + w + extra, half = (x1 - x0) / 2;
      for (let px = x0; px < x1; px++) {
        const cx = px + .5 < x0 + r ? x0 + r : px + .5 > x1 - r ? x1 - r : null, cy = py + .5 < y + r ? y + r : py + .5 > y + h - r ? y + h - r : null;
        if (cx !== null && cy !== null && (px + .5 - cx) ** 2 + (py + .5 - cy) ** 2 > r * r) continue;
        const n = (px + .5 - x0 - half) / half;
        g.set(px, py, py === y + h - 1 ? m[1] : py === y && n < .3 ? m[3] : tone(m, n), m.ink);   // pied ombré, arête haute éclairée
      }
    }
  }

  // Boîte molle : super-ellipse (|u|^p + |v|^p ≤ 1, p = 6 par défaut) — coins très arrondis, flancs droits qui bombent ;
  // opts.lean : décalage horizontal du haut par rapport au bas (pixels, objet de travers), opts.wobble / opts.seed : bords
  // qui ondulent. Modelé : tone() sur la largeur, arête haute éclairée, pied ombré.
  function softBox(g, cx, cy, rx, ry, m, opts = {}) {
    const p = opts.p || 6, lean = opts.lean || 0, wob = opts.wobble || 0, ph = opts.seed || 0;
    for (let y = Math.floor(cy - ry); y <= cy + ry; y++) {
      const v = (y + .5 - cy) / ry, sx = cx - lean * v / 2, k = 1 + wob / rx * Math.sin(y * .6 + ph);
      if (Math.abs(v) > 1) continue;
      for (let x = Math.floor(sx - rx * k - 1); x <= sx + rx * k + 1; x++) {
        const u = (x + .5 - sx) / (rx * k);
        if (Math.abs(u) ** p + Math.abs(v) ** p > 1) continue;
        g.set(x, y, v > .88 ? m[1] : v < -.86 && u < .4 ? m[3] : tone(m, u), m.ink);
      }
    }
  }

  // Coulure collée à la forme : colonne de 2 pixels depuis (x, y), goutte au bout.
  function drip(g, x, y, len, m) {
    for (let k = 0; k < len; k++) { paint(g, x, y + k, m, 3); paint(g, x + 1, y + k, m, 2); }
    const e = y + len;
    paint(g, x - 1, e, m, 2); paint(g, x, e, m, 3); paint(g, x + 1, e, m, 2); paint(g, x + 2, e, m, 1);
    paint(g, x, e + 1, m, 2); paint(g, x + 1, e + 1, m, 1);
  }

  FP.drawn = { families, define, grid, renderDef, render, material, M, paint, over, stains, tone, blob, roundRect, softBox, drip, hash };
})();
