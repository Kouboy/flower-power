// render/decor-tube.js — conduites usées des décors enterrés (v4.11.0) : canalisations, conduites rouillées, galeries de
// béton et câbles ne traversent plus le sol d'un trait droit et neuf. Tronçons qui changent de hauteur par des coudes en
// biais, colliers aux jonctions, rouille, cassures aux bords déchiquetés avec débris dessous ; fissures et effondrements
// pour les galeries ; bouts coupés qui pendent pour les câbles.
// Lit     : FP.px.
// Écrit   : rien dans l'état (dessine dans le contexte reçu).
// Expose  : FP.decorTube.path(w, y, rnd) → [{kind: 'run' | 'bend' | 'joint' | 'break', x0, y0, x1, y1}] (pur, déterministe ;
//           au moins un coude et une cassure, de x ≤ 0 à x ≥ w, à moins de SPREAD de y) ;
//           FP.decorTube.draw(g, path, t, C, seed, opts) — tube d'épaisseur t, couleurs C = {body, light, dark, joint, rust},
//           opts = {inner (couleur de l'intérieur d'une galerie), cracks, collapse: {rubble, rebar}} ;
//           FP.decorTube.wire(g, path, color) — câble fin qui ondule ; FP.decorTube.SPREAD.
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  const SPREAD = 30;
  const lcg = (s) => () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);

  // Tronçons droits de 26 à 80 pixels ; entre deux : coude (en biais, 45° ou plus raide), cassure ou simple collier.
  function path(w, y, rnd) {
    const out = [], forcedBend = 0, forcedBreak = 1 + Math.floor(rnd() * 2);
    let x = -4, cy = y, j = 0;
    while (x < w + 4) {
      const x1 = Math.min(w + 4, x + Math.round(26 + rnd() * 54));
      out.push({ kind: 'run', x0: x, y0: cy, x1, y1: cy }); x = x1;
      if (x >= w + 4) break;
      const r = rnd(), act = j === forcedBend ? 'bend' : j === forcedBreak ? 'break' : r < .35 ? 'bend' : r < .55 ? 'break' : 'joint';
      if (act === 'bend') {
        let dy = (rnd() < .5 ? -1 : 1) * (6 + Math.round(rnd() * 12));
        if (Math.abs(cy + dy - y) > SPREAD - 10) dy = -dy;   // reste dans sa bande
        const dx = rnd() < .5 ? Math.abs(dy) : Math.ceil(Math.abs(dy) / 2);
        out.push({ kind: 'bend', x0: x, y0: cy, x1: x + dx, y1: cy + dy }); x += dx; cy += dy;
      } else if (act === 'break') {
        const gap = 6 + Math.round(rnd() * 10);
        out.push({ kind: 'break', x0: x, y0: cy, x1: x + gap, y1: cy }); x += gap;
      } else out.push({ kind: 'joint', x0: x, y0: cy, x1: x, y1: cy });
      j++;
    }
    return out;
  }

  // Le tube est peint colonne par colonne (une fois, dans le cache de la terre) : corps, reflet, ombre, intérieur, usure.
  function draw(g, P, t, C, seed, opts) {
    const { px } = FP, r = lcg(seed), o = opts || {};
    const column = (x, yy) => {
      px.rect(g, x, yy, 1, t, C.body); px.rect(g, x, yy, 1, 1, C.light); px.rect(g, x, yy + t - 1, 1, 1, C.dark);
      if (o.inner) px.rect(g, x, yy + 3, 1, t - 6, o.inner);
      if (r() < .1) px.rect(g, x, yy + 1 + Math.floor(r() * (t - 2)), 1 + Math.floor(r() * 2), 1, C.rust);
      if (o.cracks && r() < .05) for (let k = 0; k < 3; k++) px.rect(g, x + (k % 2), yy + k, 1, 1, C.dark);   // fissure en zigzag
    };
    for (const s of P) {
      if (s.kind === 'run' || s.kind === 'bend') {
        for (let x = Math.round(s.x0); x < s.x1; x++) column(x, Math.round(s.y0 + (s.y1 - s.y0) * (x - s.x0) / Math.max(1, s.x1 - s.x0)));
      } else if (s.kind === 'joint') px.rect(g, s.x0 - 1, s.y0 - 1, 3, t + 2, C.joint);
      else {   // cassure : bouts déchiquetés, débris dessous (ou effondrement d'une galerie)
        for (let k = 0; k < 2; k++) {
          const hh = Math.max(1, t - 2 - 2 * k);
          px.rect(g, s.x0 + k, s.y0 + 1 + k, 1, hh, C.dark); px.rect(g, s.x1 - 1 - k, s.y0 + 1 + k, 1, hh, C.dark);
        }
        const gap = Math.max(1, s.x1 - s.x0 - 4);
        if (o.collapse) {
          for (let k = 0; k < 7; k++) px.rect(g, s.x0 + 2 + Math.floor(r() * gap), s.y0 + t - 3 - Math.floor(r() * (t / 2)), 3, 2, k % 2 ? o.collapse.rubble : C.dark);
          px.line(g, s.x0 + 1, s.y0 + 4, s.x0 + 5, s.y0 + 1, o.collapse.rebar); px.line(g, s.x1 - 2, s.y0 + t - 5, s.x1 - 6, s.y0 + t - 2, o.collapse.rebar);
        } else for (let k = 0; k < 3; k++) px.rect(g, s.x0 + 2 + Math.floor(r() * gap), s.y0 + t + 1 + k, 2, 1, k % 2 ? C.dark : C.rust);
      }
    }
  }

  // Câble : ondule le long des tronçons, suit les coudes ; aux cassures, deux bouts coupés qui pendent.
  function wire(g, P, color) {
    const { px } = FP;
    for (const s of P) {
      if (s.kind === 'run') for (let x = Math.round(s.x0); x < s.x1; x++) px.rect(g, x, s.y0 + 3 + Math.round(Math.sin(x / 9) * 2), 1, 1, color);
      else if (s.kind === 'bend') px.line(g, s.x0, s.y0 + 3, s.x1, s.y1 + 3, color);
      else if (s.kind === 'break') { px.rect(g, s.x0, s.y0 + 3, 1, 5, color); px.rect(g, s.x1 - 1, s.y0 + 3, 1, 4, color); }
    }
  }

  FP.decorTube = { path, draw, wire, SPREAD };
})();
