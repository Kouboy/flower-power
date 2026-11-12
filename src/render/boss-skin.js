// render/boss-skin.js — l'habillage des boss (v5.6.0) : images PixelLab de assets/boss/art.js, matière répétée dans les parois,
// images des pièces découpées par leur polygone. Un milieu sans images garde son boss dessiné par le code (render/boss.js).
// Lit     : window.FLOWER_POWER_BOSS_ART.
// Écrit   : rien dans l'état (la toile reçue).
// Expose  : FP.bossSkin.image(milieuId, role) → image prête ou null (role : matter | plate | turret | pump (v5.9.0)) ;
//           FP.bossSkin.tank(milieuId) → [x0, y0, x1, y1] (la cuve dans l'image de la pompe, fractions) ou null ;
//           FP.bossSkin.version() → augmente à chaque image devenue prête (clé du calque de render/boss.js) ;
//           FP.bossSkin.spans(pts, inset, fn) → appelle fn(y, a, b) pour chaque morceau de rangée du polygone (règle pair-impair) ;
//           FP.bossSkin.wall(g, pts, img, ox, oy, inset) : img répétée dans le polygone, ancrée au monde (ox, oy : origine du monde
//           en pixels d'art dans g) ; FP.bossSkin.piece(g, pts, img, inset) : img à l'échelle de la boîte du polygone sans déformation
//           (proportions gardées, centrée), découpée par lui.
//           Réservés au banc d'essai : FP.bossSkin._set(milieuId, role, img) et FP.bossSkin._reset().
// Sous Node (pas d'Image) : rien n'est chargé, tout passe par le dessin du code.
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  const ROLES = ['matter', 'plate', 'turret', 'pump'];
  let entries = {}, version = 0;

  function load(src) {
    const e = { img: new Image(), ready: false };
    e.img.onload = () => { e.ready = true; version++; };
    e.img.onerror = () => { console.warn('Flower Power : image de boss non chargée', src); };
    e.img.src = src;
    return e;
  }

  function loadAll() {
    entries = {};
    if (typeof Image === 'undefined') return;
    for (const [id, a] of Object.entries(window.FLOWER_POWER_BOSS_ART || {})) {
      entries[id] = {};
      for (const r of ROLES) if (a[r]) entries[id][r] = load(a[r]);
    }
  }

  const ready = (e) => (e && e.ready ? e.img : null);
  const image = (id, role) => ready(entries[id] && entries[id][role]);
  const tank = (id) => { const a = (window.FLOWER_POWER_BOSS_ART || {})[id]; return a && a.pumpTank ? a.pumpTank : null; };

  // Morceaux de rangées d'un polygone quelconque (concave compris), rognés de inset aux deux bouts et en haut et en bas.
  function spans(pts, inset, fn) {
    let lo = Infinity, hi = -Infinity;
    for (const p of pts) { lo = Math.min(lo, p[1]); hi = Math.max(hi, p[1]); }
    for (let y = Math.ceil(lo) + inset; y <= Math.floor(hi) - inset; y++) {
      const xs = [];
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i], q = pts[(i + 1) % pts.length];
        if ((p[1] <= y + .5) === (q[1] <= y + .5)) continue;
        xs.push(p[0] + (y + .5 - p[1]) / (q[1] - p[1]) * (q[0] - p[0]));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const a = Math.round(xs[k]) + inset, b = Math.round(xs[k + 1]) - inset;
        if (b > a) fn(y, a, b);
      }
    }
  }

  const mod = (v, n) => ((v % n) + n) % n;

  function wall(g, pts, img, ox, oy, inset = 0) {
    const w = img.width, h = img.height;
    spans(pts, inset, (y, a, b) => {
      const sy = mod(y - oy, h);
      for (let x = a; x < b;) {
        const sx = mod(x - ox, w), n = Math.min(w - sx, b - x);
        g.drawImage(img, sx, sy, n, 1, x, y, n, 1);
        x += n;
      }
    });
  }

  function piece(g, pts, img, inset = 0) {
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const p of pts) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    const k = Math.min((x1 - x0) / img.width, (y1 - y0) / img.height), w = img.width * k, h = img.height * k;
    const dx = x0 + (x1 - x0 - w) / 2, dy = y0 + (y1 - y0 - h) / 2;
    spans(pts, inset, (y, a, b) => {
      if (y < dy || y + 1 > dy + h) return;
      const l = Math.max(a, dx), r = Math.min(b, dx + w);
      if (r > l) g.drawImage(img, (l - dx) / k, (y - dy) / k, (r - l) / k, 1 / k, l, y, r - l, 1);
    });
  }

  const fake = (img) => ({ img, ready: true });
  function _set(id, role, img) {
    (entries[id] = entries[id] || {})[role] = fake(img);
    version++;
  }
  function _reset() { entries = {}; version++; }

  loadAll();
  FP.bossSkin = { image, tank, version: () => version, spans, wall, piece, _set, _reset };
})();
