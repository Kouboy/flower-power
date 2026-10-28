// render/decor-nucleaire.js — décor du site nucléaire (v4.11.0) : nuit verdâtre, étoiles qui scintillent, grosse lune verte,
// aurore verte épaisse ; une tour de refroidissement géante qui fume, clôture barbelée, trèfle radioactif ; fûts jaunes,
// panneaux de danger, herbe mutante dont les pointes luisent ; galeries de béton, fûts enterrés qui fuient et cailloux qui
// luisent dans la terre. Les lueurs sont vert d'eau, distinctes du vert de la pousse.
// Lit     : FP.px, FP.decorTube (galeries usées).
// Écrit   : rien dans l'état (dessine dans le contexte reçu).
// Expose  : FP.decor.nucleaire = { palette, skyStatic, back, horizon, front, layout, surface, under, glow } (contrat des décors,
//           voir docs/superpowers/plans/2026-10-28-decors-milieux.md).
// Horizon : motif de 220 pixels d'art (maquette docs/art/maquette-decors.js, variante B), répété ; hauteurs réduites sous 70.
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  const TILE = 220, REF = 70;
  const STAR = ['#a8c8a0', '#c2d8bb'], MOON = ['#a0c880', '#88b070'], AURORA = ['#3a8a5a', '#2a6a4a'], STEAM = ['#4a6e48', '#365a3a'];
  const TOWER = ['#1e2a24', '#2a3830'], FENCE = ['#2a3430', '#3a4440'], SIGN = ['#d5b83b', '#1a1a1a'];
  const BARREL = ['#d8b830', '#a88a20'], POST = '#2a2a2a', GRASS = '#465a52';
  const CONCRETE = { body: '#2a2e34', light: '#3a3e44', dark: '#1a1d22', joint: '#1a1d22', rust: '#22262b' }, INNER = '#14171b', REBAR = '#5a4a3a', PEBBLE = ['#2a3a30', '#2a5a46'], BURIED = ['#5a5020', '#3a3416'];
  const GLOW = ['#3ab88a', '#5ad0a0', '#8af0c0'];   // vert d'eau radioactif
  const palette = [...STAR, ...MOON, ...AURORA, ...STEAM, ...TOWER, ...FENCE, ...SIGN, ...BARREL, POST, GRASS, ...Object.values(CONCRETE), INNER, REBAR, ...PEBBLE, ...BURIED, ...GLOW];
  const scale = (h) => Math.min(1, h / REF);
  const tiles = (w) => { const out = []; for (let ox = 0; ox < w; ox += TILE) out.push(ox); return out; };
  const lcg = (s) => () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const stars = (w, h) => { const r = lcg(41), out = []; for (let n = 0; n < w / 7; n++) out.push([Math.floor(r() * w), Math.floor(r() * h * .57)]); return out; };

  function skyStatic(g, w, h) {   // étoiles et grosse lune verte
    const { px } = FP, r = Math.max(6, Math.round(13 * scale(h))), mx = Math.round(w * .82), my = Math.round(h * .23);
    for (const [x, y] of stars(w, h)) px.rect(g, x, y, 1, 1, STAR[0]);
    px.disc(g, mx, my, r, MOON[0]); px.disc(g, mx - Math.round(r * .4), my - Math.round(r * .25), Math.max(1, Math.round(r * .22)), MOON[1]);
  }

  function back(g, w, h, oy, t) {   // aurore épaisse qui ondule, étoiles qui scintillent
    const { px } = FP, s = scale(h), thick = Math.max(2, Math.round(4 * s));
    for (let i = 0; i < w; i++) {
      const y = Math.round(h * .49 + Math.sin(i / 17 + t * .8) * 5 * s + Math.sin(i / 7 - t * .5) * 2 * s) - oy;
      px.rect(g, i, y, 1, thick, (i + Math.floor(t * 4)) % 9 < 5 ? AURORA[0] : AURORA[1]);
    }
    stars(w, h).forEach(([x, y], n) => { if (Math.floor(t * 3 + n) % 7 === 0) px.rect(g, x - 1, y - oy, 3, 1, STAR[1]); });
  }

  function tower(g, cx, base, hh, half0) {   // tour de refroidissement : large en bas, taille vers les 70 %, s'évase en haut
    const { px } = FP;
    for (let y = 0; y < hh; y++) {
      const k = y / hh, half = Math.round(half0 * (.62 + .38 * Math.pow(Math.abs(k - .7) / .7, 1.6)));
      px.rect(g, cx - half, base - y - 1, 2 * half, 1, y % 7 === 0 ? TOWER[1] : TOWER[0]);
    }
  }

  function sign(g, x, y, size) {   // trèfle radioactif sur triangle jaune
    const { px } = FP;
    for (let i = 0; i < size; i++) px.rect(g, x - i, y + i, 2 * i + 1, 1, SIGN[0]);
    px.disc(g, x, y + Math.round(size * .62), 1, SIGN[1]);
    px.rect(g, x - 3, y + size - 3, 2, 2, SIGN[1]); px.rect(g, x + 2, y + size - 3, 2, 2, SIGN[1]); px.rect(g, x, y + 2, 1, 2, SIGN[1]);
  }

  function horizon(g, w, h) {
    const { px } = FP, s = scale(h), fence = Math.max(4, Math.round(10 * s));
    for (const ox of tiles(w)) {
      tower(g, ox + 100, h, Math.round(54 * s), 22);
      px.rect(g, ox, h - 2, TILE, 2, TOWER[0]);
      for (let x = 0; x < TILE; x += 6) px.rect(g, ox + x, h - fence, 1, fence, FENCE[0]);
      px.rect(g, ox, h - fence, TILE, 1, FENCE[0]);
      for (let x = 2; x < TILE; x += 4) px.rect(g, ox + x, h - fence - 1, 1, 1, FENCE[1]);
      sign(g, ox + 160, h - Math.round(24 * s), Math.max(5, Math.round(10 * s)));
    }
  }

  function front(g, w, h, oy, t) {   // vapeur de la tour, qui reste dans le ciel
    const { px } = FP, s = scale(h);
    for (const ox of tiles(w)) {
      const top = h - Math.round(54 * s), rise = Math.max(0, Math.min(Math.round(22 * s), top - 2 - Math.round(10 * s)));
      for (let k = 0; k < 4; k++) {
        const ph = ((t / 4 + k / 4) % 1);
        px.disc(g, ox + 96 + Math.round(ph * 10), top - 2 - Math.round(ph * rise) - oy, Math.round((4 + ph * 6) * s), ph < .5 ? STEAM[0] : STEAM[1]);
      }
    }
  }

  // Placements : fûts, panneaux et herbe mutante sans chevauchement ; dans la terre, fûts enterrés et cailloux (plus serrés
  // près de la surface), une galerie de béton par tranche de 420 environ.
  function layout(w, top, bottom, rnd) {
    // Au plus un tiers de la largeur, même sur un petit téléphone : moins de fûts et de panneaux.
    const zone = w / 3, order = [0, 1, 2].sort(() => rnd() - .5);
    const barrels = w < 190 ? 1 : w < 240 ? 2 : 2 + Math.floor(rnd() * 3), panels = w < 300 ? 1 : 1 + Math.floor(rnd() * 2);
    const surface = [
      { kind: 'barrels', x: Math.round(order[0] * zone + rnd() * Math.max(1, zone - 34)), n: barrels },
      { kind: 'panels', x: Math.round(order[1] * zone + rnd() * Math.max(1, zone - 30)), n: panels },
      { kind: 'grass', x: Math.round(order[2] * zone + 6 + rnd() * Math.max(1, zone - 34)) }
    ];
    const under = [];
    for (let y = top + 12 + rnd() * 40; y < bottom - 16; y += 70 + 120 * (y - top) / (bottom - top) + rnd() * 40)
      under.push({ kind: rnd() < .4 ? 'barrel' : 'pebble', x: 6 + Math.floor(rnd() * (w - 22)), y: Math.round(y) });
    // Galeries de béton fissurées, effondrées par endroits, jamais à moins de 200 pixels de la pelouse.
    for (let y = top + 230 + rnd() * 120; y < bottom - 60; y += 420 + rnd() * 160)
      under.push({ kind: 'gallery', x: 0, y: Math.round(y), w, path: FP.decorTube.path(w, Math.round(y), rnd), seed: Math.floor(rnd() * 1e6) });
    return { surface, under };
  }

  const TUFTS = [0, 12, 20];   // herbe mutante : décalages des touffes

  function surface(g, L, y) {
    const { px } = FP;
    for (const it of L.surface) {
      if (it.kind === 'barrels') {
        const spots = [[0, 9], [11, 9], [22, 9], [6, 18]].slice(0, it.n);
        for (const [dx, up] of spots) { const x = it.x + dx, yy = y - up; px.rect(g, x, yy, 10, 9, BARREL[0]); px.rect(g, x, yy + 2, 10, 1, BARREL[1]); px.rect(g, x, yy + 6, 10, 1, BARREL[1]); px.rect(g, x + 4, yy + 3, 2, 2, SIGN[1]); }
      } else if (it.kind === 'panels') {
        for (let k = 0; k < it.n; k++) {
          const x = it.x + k * 16;
          px.rect(g, x + 5, y - 14, 2, 14, POST); px.rect(g, x, y - 22, 12, 10, SIGN[1]); px.rect(g, x + 1, y - 21, 10, 8, SIGN[0]);
          px.rect(g, x + 5, y - 19, 2, 4, SIGN[1]); px.rect(g, x + 5, y - 14, 2, 1, SIGN[1]);
        }
      } else {
        for (const dx of TUFTS) { const x = it.x + dx; px.line(g, x, y, x - 3, y - 10, GRASS); px.line(g, x, y, x + 2, y - 8, GRASS); }
      }
    }
  }

  function under(g, L) {
    const { px } = FP;
    for (const it of L.under) {
      if (it.kind === 'gallery') FP.decorTube.draw(g, it.path, 18, CONCRETE, it.seed, { inner: INNER, cracks: true, collapse: { rubble: CONCRETE.light, rebar: REBAR } });
      else if (it.kind === 'barrel') {
        px.rect(g, it.x, it.y, 9, 12, BURIED[0]); px.rect(g, it.x, it.y + 3, 9, 1, BURIED[1]); px.rect(g, it.x, it.y + 8, 9, 1, BURIED[1]);
      } else px.rect(g, it.x, it.y, 2, 2, PEBBLE[0]);
    }
  }

  // Fuites des fûts enterrés, cailloux qui luisent, pointes de l'herbe mutante : seulement ce qui est à l'écran.
  function glow(g, L, y, oy, viewH, t) {
    const { px } = FP, seen = (yy) => yy >= oy - 30 && yy <= oy + viewH + 8;
    L.under.forEach((it, n) => {
      if (!seen(it.y)) return;
      if (it.kind === 'barrel') {
        const p = (Math.sin(t * 2 + it.x) + 1) / 2;
        px.rect(g, it.x + 9, it.y + 9 - oy, 3 + Math.round(p * 3), 2, GLOW[0]); px.rect(g, it.x + 10, it.y + 10 - oy, 1 + Math.round(p * 2), 1, GLOW[1]);
      } else if (it.kind === 'pebble' && Math.floor(t * 2 + n) % 3 === 0) px.rect(g, it.x, it.y - oy, 2, 2, PEBBLE[1]);
    });
    if (!seen(y)) return;
    for (const it of L.surface) if (it.kind === 'grass') TUFTS.forEach((dx, i) => {
      const x = it.x + dx, on = Math.sin(t * 3 + i) > 0;
      px.rect(g, x - 4, y - 12 - oy, 2, 2, on ? GLOW[2] : GLOW[0]); px.rect(g, x + 2, y - 10 - oy, 1, 1, GLOW[1]);
    });
  }

  FP.decor = FP.decor || {};
  FP.decor.nucleaire = { palette, skyStatic, back, horizon, front, layout, surface, under, glow };
})();
