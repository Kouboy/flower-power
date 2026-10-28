// render/decor-industrie.js — décor de la zone industrielle (v4.11.0) : brume de soufre et gros panaches lents ; raffinerie aux
// tours cerclées, torchère qui vacille, convoyeur qui monte des caisses, fumées qui montent ; palettes, fûts rouillés, rails ;
// conduites rouillées, scories et poches d'huile sourdes (un reflet luit de temps en temps) dans la terre.
// Lit     : FP.px.
// Écrit   : rien dans l'état (dessine dans le contexte reçu).
// Expose  : FP.decor.industrie = { palette, skyStatic, back, horizon, front, layout, surface, under, glow } (contrat des décors,
//           voir docs/superpowers/plans/2026-10-28-decors-milieux.md).
// Horizon : motif de 220 pixels d'art (maquette docs/art/maquette-decors.js, variante B), répété ; hauteurs réduites sous 70.
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  const TILE = 220, REF = 70;
  const S = '#1a1814', SL = '#2a2620', SMOKE = ['#3a3428', '#4a4232'], FLAME = ['#f0a848', '#f8d070'], BOX = '#6a5a3a';
  const PALLET = ['#6a5a3a', '#4a3e28'], BARREL = ['#7a3a1e', '#3a1a0c', '#9a5a2e'], RAIL = ['#5a5a5a', '#3a3022'];
  const PIPE = ['#4a3424', '#6a4a30', '#2a1c12'], OIL = ['#1e1a14', '#26201a'], GLINT = '#3a3830', SLAG = ['#2a2622', '#3a342c'];
  const palette = [S, SL, ...SMOKE, ...FLAME, BOX, ...PALLET, ...BARREL, ...RAIL, ...PIPE, ...OIL, GLINT, ...SLAG];
  const scale = (h) => Math.min(1, h / REF);
  const tiles = (w) => { const out = []; for (let ox = 0; ox < w; ox += TILE) out.push(ox); return out; };

  // Tours de la raffinerie : [x, hauteur de référence, largeur] ; les deux premières fument.
  const TOWERS = [[20, 44, 10], [100, 50, 12], [40, 34, 6], [150, 40, 8]];
  const FLARE = { x: 196, h: 46 };

  function skyStatic(g, w, h, pal) { FP.px.dither(g, 0, h - Math.round(18 * scale(h)), w, Math.round(18 * scale(h)), pal[6], pal[7], 6); }   // brume de soufre

  function back(g, w, h, oy, t, pal) {   // gros panaches de smog, lents
    const { px } = FP;
    for (let i = 0; i < 2; i++) {
      const span = w + 80, cx = ((i * 113 + t * 1.5) % span + span) % span - 40, cy = Math.round(h * (.14 + i * .17)) - oy;
      for (let k = 0; k < 5; k++) px.disc(g, cx + k * 9, cy + (k % 2) * 2, 6, i ? pal[2] : pal[3]);
    }
  }

  function horizon(g, w, h) {
    const { px } = FP, s = scale(h);
    for (const ox of tiles(w)) {
      for (const [x, th, tw] of TOWERS) {
        const hh = Math.round(th * s);
        px.rect(g, ox + x, h - hh, tw, hh, S);
        for (let y = h - hh; y < h; y += 6) px.rect(g, ox + x - 2, y, tw + 4, 1, SL);
      }
      px.rect(g, ox + FLARE.x, h - Math.round(FLARE.h * s), 3, Math.round(FLARE.h * s), S);
      px.line(g, ox + 60, h - Math.round(4 * s), ox + 96, h - Math.round(30 * s), SL, 3);
      px.rect(g, ox + 94, h - Math.round(32 * s), 10, 6, S);
      px.rect(g, ox, h - Math.round(8 * s), TILE, Math.round(8 * s), S);
      px.rect(g, ox + 120, h - Math.round(20 * s), 30, Math.round(20 * s), SL);
    }
  }

  function front(g, w, h, oy, t) {
    const { px } = FP, s = scale(h);
    for (const ox of tiles(w)) {
      TOWERS.slice(0, 2).forEach(([x, th, tw], n) => {   // fumées qui montent, sans jamais sortir du ciel
        const top = h - Math.round(th * s) - 2, rise = Math.max(0, Math.min(Math.round(30 * s), top - 8));
        for (let k = 0; k < 3; k++) {
          const ph = ((t * .6 / 3 + k / 3 + n * .17) % 1);
          px.disc(g, ox + x + tw / 2 + Math.round(ph * 12), top - Math.round(ph * rise) - oy, Math.round(2 + ph * 4), ph < .5 ? SMOKE[0] : SMOKE[1]);
        }
      });
      const fy = h - Math.round(FLARE.h * s) - 4 - oy, f = Math.sin(t * 13 + ox) > 0;   // torchère qui vacille
      px.disc(g, ox + FLARE.x + 1, fy, f ? 3 : 2, FLAME[0]); px.disc(g, ox + FLARE.x + 1, fy - 1, f ? 1 : 2, FLAME[1]);
      for (let i = 0; i < 5; i++) {   // caisses sur le convoyeur
        const k = ((t * .5 + i / 5) % 1);
        px.rect(g, ox + 60 + Math.round(k * 34), h - Math.round((6 + k * 26) * s) - oy, 3, 2, BOX);
      }
    }
  }

  // Placements : palettes, fûts et rails sans chevauchement ; dans la terre, scories et poches d'huile (plus serrées près de
  // la surface), une conduite rouillée par tranche de 350 environ.
  function layout(w, top, bottom, rnd) {
    const zone = w / 3, order = [0, 1, 2].sort(() => rnd() - .5), rails = Math.max(24, Math.round(w * .13));
    const surface = [
      { kind: 'pallets', x: Math.round(order[0] * zone + rnd() * Math.max(1, zone - 28)), n: 3 + Math.floor(rnd() * 3) },
      { kind: 'barrels', x: Math.round(order[1] * zone + rnd() * Math.max(1, zone - 22)), n: 2 + Math.floor(rnd() * 2) },
      { kind: 'rails', x: Math.round(order[2] * zone + rnd() * Math.max(1, zone - rails - 2)), w: rails }
    ];
    const under = [];
    for (let y = top + 12 + rnd() * 40; y < bottom - 12; y += 70 + 120 * (y - top) / (bottom - top) + rnd() * 40)
      under.push({ kind: rnd() < .45 ? 'oil' : 'slag', x: 8 + Math.floor(rnd() * (w - 24)), y: Math.round(y), seed: Math.floor(rnd() * 1e6) });
    for (let y = top + 24 + rnd() * 100; y < bottom - 12; y += 330 + rnd() * 140) under.push({ kind: 'pipe', x: 0, y: Math.round(y), w });
    return { surface, under };
  }

  function surface(g, L, y) {
    const { px } = FP;
    for (const it of L.surface) {
      if (it.kind === 'pallets') {
        for (let i = 0; i < it.n; i++) { const x = it.x + i * 2, yy = y - 3 - i * 3; px.rect(g, x, yy, 22, 2, PALLET[0]); px.rect(g, x + 2, yy + 2, 2, 1, PALLET[1]); px.rect(g, x + 18, yy + 2, 2, 1, PALLET[1]); }
      } else if (it.kind === 'barrels') {
        const spots = [[0, 9], [10, 9], [5, 18]].slice(0, it.n);
        for (const [dx, up] of spots) { const x = it.x + dx, yy = y - up; px.rect(g, x, yy, 8, 9, BARREL[0]); px.rect(g, x, yy + 2, 8, 1, BARREL[1]); px.rect(g, x, yy + 6, 8, 1, BARREL[1]); px.rect(g, x + 1, yy, 1, 9, BARREL[2]); }
      } else {
        px.rect(g, it.x, y - 1, it.w, 1, RAIL[0]);
        for (let x = it.x + 2; x < it.x + it.w - 3; x += 6) px.rect(g, x, y, 3, 1, RAIL[1]);
      }
    }
  }

  function under(g, L) {
    const { px } = FP;
    for (const it of L.under) {
      if (it.kind === 'pipe') {
        px.rect(g, 0, it.y, it.w, 6, PIPE[0]); px.rect(g, 0, it.y, it.w, 1, PIPE[1]);
        for (let x = 10; x < it.w; x += 36) px.rect(g, x, it.y - 1, 5, 8, PIPE[2]);
      } else if (it.kind === 'oil') {   // poche d'huile sourde, brun-noir proche de la strate
        px.disc(g, it.x, it.y + 6, 6, OIL[0]); px.disc(g, it.x + 4, it.y + 8, 4, OIL[0]); px.disc(g, it.x + 1, it.y + 6, 3, OIL[1]);
      } else {
        let s = it.seed;
        for (let i = 0; i < 4; i++) { s = (s * 1103515245 + 12345) >>> 0; px.rect(g, it.x + (s % 14), it.y + ((s >> 8) % 8), 3 + ((s >> 4) % 3), 2, SLAG[i % 2]); }
      }
    }
  }

  function glow(g, L, y, oy, viewH, t) {   // le reflet d'une poche d'huile luit par intermittence
    const { px } = FP;
    L.under.forEach((it, i) => {
      if (it.kind !== 'oil' || it.y < oy - 8 || it.y > oy + viewH + 8) return;
      if (Math.floor(t * 1.5 + i) % 4 === 0) px.rect(g, it.x - 2, it.y + 3 - oy, 3, 1, GLINT);
    });
  }

  FP.decor = FP.decor || {};
  FP.decor.industrie = { palette, skyStatic, back, horizon, front, layout, surface, under, glow };
})();
