// render/decor-decharge.js — décor de la décharge (v4.11.0) : poussière sur l'horizon ; une montagne d'ordures énorme mouchetée
// de déchets, grue à grappin qui se balance, fumée de brûlage, mouettes qui tournent ; sacs poubelle, pneus, vieux frigo ;
// couches de déchets compactés et suintements qui gouttent dans la terre.
// Lit     : FP.px.
// Écrit   : rien dans l'état (dessine dans le contexte reçu).
// Expose  : FP.decor.decharge = { palette, skyStatic, back, horizon, front, layout, surface, under, glow } (contrat des décors,
//           voir docs/superpowers/plans/2026-10-28-decors-milieux.md).
// Horizon : motif de 220 pixels d'art (maquette docs/art/maquette-decors.js, variante B), répété ; hauteurs réduites sous 70.
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  const TILE = 220, REF = 70;
  const HILL = '#2a2a1a', BITS = ['#6a6a4a', '#5a4a3a', '#4a5a4a', '#7a6a50'], CRANE = '#1e1e12', SMOKE = ['#5c5e2c', '#727234'], GULL = '#cbc7b4';
  const BAG = ['#1a1a1a', '#2e2e2e', '#c8b448'], TIRE = ['#141414', '#2a2a2a'], FRIDGE = ['#c8c4b0', '#9a9686', '#5a5a5a'];
  const LAYER = ['#2a2418', '#2f2511'], WASTE = ['#6a6a6a', '#8a7a5a', '#3a5a3a', '#4a6a4a', '#2a2a2a'], OOZE = ['#4a4a20', '#6a6a2a'];
  const palette = [HILL, ...BITS, CRANE, ...SMOKE, GULL, ...BAG, ...TIRE, ...FRIDGE, ...LAYER, ...WASTE, ...OOZE];
  const scale = (h) => Math.min(1, h / REF);
  const tiles = (w) => { const out = []; for (let ox = 0; ox < w; ox += TILE) out.push(ox); return out; };
  const lcg = (s) => () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);

  function skyStatic(g, w, h, pal) { const hh = Math.round(26 * scale(h)); FP.px.dither(g, 0, h - hh, w, hh, pal[6], pal[7], 5); }   // poussière
  function back() {}   // le ciel de la décharge ne bouge pas : ses mouettes passent devant la montagne (front)

  // Montagne d'ordures : un profil en dôme irrégulier, mouchetée de déchets clairs ; un liseré d'ordures relie les motifs.
  function horizon(g, w, h) {
    const { px } = FP, s = scale(h), peak = Math.round(52 * s);
    for (const ox of tiles(w)) {
      const r = lcg(6);
      px.rect(g, ox, h - 3, TILE, 3, HILL);
      for (let x = 0; x < 200; x++) { const hh = Math.round(peak * Math.sin(Math.PI * x / 200) * (.85 + r() * .15)); px.rect(g, ox + 10 + x, h - hh, 1, hh, HILL); }
      for (let n = 0; n < 100; n++) {
        const x = Math.floor(r() * 200), top = h - Math.round(peak * Math.sin(Math.PI * x / 200)), dy = Math.floor(r() * Math.max(1, h - top - 1));
        if (top < h - 2) px.rect(g, ox + 10 + x, top + 1 + dy, 2, 1, BITS[n % 4]);   // pas de moucheture sous les pieds de la montagne
      }
      const mast = Math.round(66 * s);   // grue à grappin
      px.rect(g, ox + 176, h - mast, 3, mast, CRANE); px.rect(g, ox + 140, h - mast, 40, 2, CRANE);
      px.line(g, ox + 177, Math.max(0, h - Math.round(72 * s)), ox + 142, h - mast, CRANE);
    }
  }

  function front(g, w, h, oy, t) {
    const { px } = FP, s = scale(h);
    for (const ox of tiles(w)) {
      const base = h - Math.round(50 * s), rise = Math.max(0, Math.min(Math.round(40 * s), base - 9));   // fumée de brûlage
      for (let k = 0; k < 6; k++) {
        const ph = ((t / 5 + k / 6) % 1);
        px.disc(g, ox + 90 + Math.round(ph * 14), base - Math.round(ph * rise) - oy, Math.round(2 + ph * 5), ph < .5 ? SMOKE[0] : SMOKE[1]);
      }
      const top = h - Math.round(64 * s), sw = Math.round(Math.sin(t * 1.2 + ox) * 2), hook = top + Math.round(18 * s);   // grappin qui se balance
      px.line(g, ox + 148, top - oy, ox + 148 + sw, hook - oy, HILL); px.rect(g, ox + 145 + sw, hook - oy, 7, 4, CRANE);
      for (let i = 0; i < 5; i++) {   // mouettes qui tournent
        const a = t * .7 + i * 1.3, cx = ox + 110 + Math.cos(a) * (50 + i * 8), cy = Math.round(h * .3 + Math.sin(a) * 10 * s + i * 3 * s) - oy, f = Math.floor(t * 6 + i) % 2;
        px.rect(g, cx - 2, cy - f, 2, 1, GULL); px.rect(g, cx, cy, 1, 1, GULL); px.rect(g, cx + 1, cy - f, 2, 1, GULL);
      }
    }
  }

  // Placements : sacs, pneus et frigo sans chevauchement ; dans la terre, des couches compactées (plus serrées près de la
  // surface) et des suintements sous certaines d'entre elles.
  function layout(w, top, bottom, rnd) {
    // Au plus un tiers de la largeur, même sur un petit téléphone : moins de sacs et de pneus.
    const zone = w / 3, order = [0, 1, 2].sort(() => rnd() - .5);
    const bags = w < 190 ? 2 : w < 240 ? 3 : 3 + Math.floor(rnd() * 2), tires = w < 190 ? 1 : w < 240 ? 2 : 1 + Math.floor(rnd() * 3);
    const surface = [
      { kind: 'bags', x: Math.round(order[0] * zone + 4 + rnd() * Math.max(1, zone - 34)), n: bags },
      { kind: 'tires', x: Math.round(order[1] * zone + 6 + rnd() * Math.max(1, zone - 34)), n: tires },
      { kind: 'fridge', x: Math.round(order[2] * zone + rnd() * Math.max(1, zone - 18)) }
    ];
    const under = [];
    for (let y = top + 200 + rnd() * 30; y < bottom - 24; y += 90 + 150 * (y - top) / (bottom - top) + rnd() * 50) {   // rien de long en travers sous la pelouse
      under.push({ kind: 'layer', x: 0, y: Math.round(y), w, seed: Math.floor(rnd() * 1e6) });
      if (rnd() < .5) under.push({ kind: 'ooze', x: 10 + Math.floor(rnd() * (w - 20)), y: Math.round(y) + 11, phase: rnd() });
    }
    return { surface, under };
  }

  function surface(g, L, y) {
    const { px } = FP;
    for (const it of L.surface) {
      if (it.kind === 'bags') {
        const spots = [[0, 7], [10, 7], [20, 7], [5, 12]].slice(0, it.n);
        for (const [dx, up] of spots) { const x = it.x + dx, yy = y - up; px.disc(g, x, yy + 3, 4, BAG[0]); px.rect(g, x - 1, yy - 2, 2, 2, BAG[2]); px.rect(g, x - 2, yy + 1, 2, 1, BAG[1]); }
      } else if (it.kind === 'tires') {
        const spots = [[0, 4], [2, 9], [18, 4]].slice(0, it.n);
        for (const [dx, up] of spots) { px.ring(g, it.x + dx, y - up, 4, TIRE[0], 2); px.disc(g, it.x + dx, y - up, 1, TIRE[1]); }
      } else {   // vieux frigo, porte entrouverte
        px.rect(g, it.x, y - 20, 12, 20, FRIDGE[0]); px.rect(g, it.x, y - 13, 12, 1, FRIDGE[1]); px.rect(g, it.x + 10, y - 18, 1, 3, FRIDGE[2]);
        px.rect(g, it.x + 12, y - 20, 4, 20, FRIDGE[1]);
      }
    }
  }

  function under(g, L) {
    const { px } = FP;
    for (const it of L.under) {
      if (it.kind !== 'layer') { px.rect(g, it.x, it.y, 1, 3, OOZE[0]); continue; }   // départ du suintement
      px.dither(g, 0, it.y, it.w, 10, LAYER[1], LAYER[0], 6);
      const r = lcg(it.seed);
      for (let n = 0; n < it.w / 8; n++) px.rect(g, Math.floor(r() * (it.w - 4)), it.y + Math.floor(r() * 8), 2 + (n % 3), n % 4 ? 1 : 2, WASTE[n % 5]);
    }
  }

  function glow(g, L, y, oy, viewH, t) {   // les gouttes tombent des couches
    const { px } = FP;
    for (const it of L.under) {
      if (it.kind !== 'ooze' || it.y < oy - 8 || it.y > oy + viewH + 8) continue;
      const ph = ((t * .4 + it.phase) % 1);
      px.rect(g, it.x, it.y + 3 + Math.round(ph * 18) - oy, 1, 2, OOZE[1]);
    }
  }

  FP.decor = FP.decor || {};
  FP.decor.decharge = { palette, skyStatic, back, horizon, front, layout, surface, under, glow };
})();
