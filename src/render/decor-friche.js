// render/decor-friche.js — décor de la friche urbaine (v4.11.0) : soleil voilé et smog qui dérive ; barres d'immeubles dont
// des fenêtres s'allument et s'éteignent, grue ; palissade taguée, caddie renversé, plots de chantier ; briques, gravats,
// canalisation et câble dans la terre.
// Lit     : FP.px, FP.decorTube (conduites usées).
// Écrit   : rien dans l'état (dessine dans le contexte reçu).
// Expose  : FP.decor.friche = { palette, skyStatic, back, horizon, front, layout, surface, under, glow } (contrat des décors,
//           voir docs/superpowers/plans/2026-10-28-decors-milieux.md).
// Horizon : motif de 220 pixels d'art (la maquette docs/art/maquette-decors.js, variante A), répété sur la largeur ; ses
// hauteurs sont réduites quand le ciel fait moins de 70 pixels.
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  const TILE = 220, REF = 70;
  const S = '#24122e', SL = '#341a3e', CRANE = '#1a0c22', LIT = ['#f0b890', '#d86850'];
  const FENCE = ['#3a2a1e', '#4a3626'], TAGS = ['#e07a3a', '#5fa88a', '#f0a0a0'], CART = '#9aa4b0', WHEEL = '#3a3a3a', CONE = ['#e07a3a', '#cfc8b1'];
  const BRICK = ['#4a2a1c', '#3a2016'], RUBBLE = '#2e2620', CABLE = '#1a1414';
  const PIPE = { body: '#3a3430', light: '#4a443c', dark: '#2a2420', joint: '#2a2420', rust: '#5a3a26' };
  const palette = [S, SL, CRANE, ...LIT, ...FENCE, ...TAGS, CART, WHEEL, ...CONE, ...BRICK, RUBBLE, ...Object.values(PIPE), CABLE];
  const scale = (h) => Math.min(1, h / REF);
  const tiles = (w) => { const out = []; for (let ox = 0; ox < w; ox += TILE) out.push(ox); return out; };

  // Barres d'immeubles : [x dans le motif, largeur, hauteur de référence].
  const BUILDINGS = [[4, 34, 30], [44, 22, 40], [72, 40, 26], [118, 26, 36], [150, 44, 22], [198, 22, 32]];
  // Fenêtres qui s'allument : [x dans le motif, hauteur au-dessus de l'horizon].
  const WINDOWS = [[8, 24], [52, 32], [56, 12], [80, 20], [126, 28], [156, 14], [202, 24]];

  function skyStatic(g, w, h, pal) {   // soleil voilé, bas sur l'horizon
    const { px } = FP, sx = Math.round(w * .68), sy = Math.round(h * .77), r = Math.max(6, Math.round(Math.min(w, TILE) * .07));
    for (let k = 3; k >= 1; k--) px.ring(g, sx, sy, r + k * 2, pal[6], 2);
    px.disc(g, sx, sy, r, pal[7]);
    px.rect(g, sx - r, sy + Math.round(r * .3), 2 * r + 1, 1, pal[6]);
  }

  function back(g, w, h, oy, t, pal) {   // smog : grappes de disques plats qui dérivent et reviennent par l'autre bord
    const { px } = FP;
    for (let i = 0; i < 3; i++) {
      const span = w + 60, cx = ((i * 83 + t * (2 + i * .6)) % span + span) % span - 30, cy = Math.round(h * (.18 + i * .14)) - oy;
      for (let k = 0; k < 4; k++) px.disc(g, cx + k * 7 - 10, cy + ((k * 3) % 4), 4 + (k % 2) * 2, i % 2 ? pal[3] : pal[4]);
      px.rect(g, Math.round(cx) - 14, cy + 4, 30, 1, pal[2]);
    }
  }

  function crane(g, x, h, s) {
    const { px } = FP, top = h - Math.round(52 * s);
    px.rect(g, x, top, 2, h - top, CRANE);
    for (let y = top + 3; y < h - 3; y += 4) px.line(g, x - 1, y, x + 2, y + 3, CRANE);
    px.rect(g, x - 24, top, 40, 2, CRANE); px.rect(g, x + 14, top + 2, 4, 3, CRANE);
    const tip = Math.max(0, top - Math.round(6 * s));
    px.line(g, x + 1, tip, x - 22, top, CRANE); px.line(g, x + 1, tip, x + 16, top, CRANE);
    px.rect(g, x - 18, top + 2, 1, Math.round(10 * s), SL); px.rect(g, x - 20, top + 2 + Math.round(10 * s), 5, 3, SL);
  }

  function horizon(g, w, h) {
    const { px } = FP, s = scale(h);
    for (const ox of tiles(w)) {
      for (const [x, bw, bh] of BUILDINGS) {
        const hh = Math.round(bh * s);
        px.rect(g, ox + x, h - hh, bw, hh, x % 3 ? S : SL);
        for (let wy = h - hh + 3; wy < h - 3; wy += 4) for (let wx = ox + x + 2; wx < ox + x + bw - 2; wx += 4) px.rect(g, wx, wy, 2, 2, CRANE);
      }
      crane(g, ox + 100, h, s);
    }
  }

  function front(g, w, h, oy, t) {   // fenêtres qui s'allument et s'éteignent
    const { px } = FP, s = scale(h);
    for (const ox of tiles(w)) for (const [x, up] of WINDOWS)
      if (((Math.floor(t * 1.3) + x + ox) % 5) !== 0) px.rect(g, ox + x, h - Math.round(up * s) - oy, 2, 2, x % 2 ? LIT[0] : LIT[1]);
  }

  // Placements : la palissade, le caddie et les plots se partagent la largeur sans se chevaucher ; dans la terre, un élément
  // tous les 70 à 190 pixels (plus serré près de la surface), une canalisation et un câble par tranche de 400.
  function layout(w, top, bottom, rnd) {
    // Au plus un tiers de la largeur, même sur un petit téléphone : palissade proportionnelle, moins de plots.
    const fence = Math.max(16, Math.round(w * .1)), zone = w / 3, order = [0, 1, 2].sort(() => rnd() - .5);
    const cones = w < 170 ? 1 : w < 230 ? 2 : 2 + Math.floor(rnd() * 2);
    const surface = [
      { kind: 'fence', x: Math.round(order[0] * zone + rnd() * Math.max(1, zone - fence - 4)), w: fence },
      { kind: 'cart', x: Math.round(order[1] * zone + rnd() * Math.max(1, zone - 24)) },
      { kind: 'cones', x: Math.round(order[2] * zone + rnd() * Math.max(1, zone - 22)), n: cones }
    ];
    const under = [];
    for (let y = top + 10 + rnd() * 40; y < bottom - 12; y += 70 + 120 * (y - top) / (bottom - top) + rnd() * 40)
      under.push({ kind: rnd() < .6 ? 'bricks' : 'rubble', x: Math.floor(rnd() * (w - 16)), y: Math.round(y), seed: Math.floor(rnd() * 1e6) });
    // Canalisations et câbles usés (coudes, cassures), jamais à moins de 200 pixels de la pelouse.
    for (let y = top + 230 + rnd() * 120; y < bottom - 60; y += 400 + rnd() * 160)
      under.push({ kind: rnd() < .5 ? 'pipe' : 'cable', x: 0, y: Math.round(y), w, path: FP.decorTube.path(w, Math.round(y), rnd), seed: Math.floor(rnd() * 1e6) });
    return { surface, under };
  }

  function surface(g, L, y) {
    const { px } = FP;
    for (const it of L.surface) {
      if (it.kind === 'fence') {
        for (let x = it.x; x < it.x + it.w; x += 4) { px.rect(g, x, y - 13, 3, 13, FENCE[0]); px.rect(g, x, y - 13, 3, 1, FENCE[1]); }
        const third = Math.round(it.w / 3);
        px.line(g, it.x + 4, y - 9, it.x + third, y - 6, TAGS[0], 2); px.line(g, it.x + third + 2, y - 10, it.x + 2 * third, y - 4, TAGS[1], 2);
        px.line(g, it.x + 2 * third + 2, y - 8, it.x + it.w - 4, y - 9, TAGS[2], 2);
      } else if (it.kind === 'cart') {   // caddie renversé : grille et roues
        for (let i = 0; i < 4; i++) px.rect(g, it.x, y - 9 + i * 2, 16, 1, CART);
        for (let i = 0; i < 5; i++) px.rect(g, it.x + i * 4, y - 9, 1, 8, CART);
        px.disc(g, it.x + 18, y - 8, 1, WHEEL); px.disc(g, it.x + 18, y - 3, 1, WHEEL);
      } else {   // plots de chantier
        for (let k = 0; k < it.n; k++) { const x = it.x + 2 + k * 8; px.rect(g, x, y - 7, 4, 7, CONE[0]); px.rect(g, x - 1, y - 1, 6, 1, CONE[0]); px.rect(g, x, y - 4, 4, 1, CONE[1]); }
      }
    }
  }

  function under(g, L) {
    const { px } = FP;
    for (const it of L.under) {
      if (it.kind === 'bricks') {
        for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) px.rect(g, it.x + i * 5 + (j % 2) * 2, it.y + j * 3, 4, 2, BRICK[j % 2]);
      } else if (it.kind === 'rubble') {
        let s = it.seed;
        for (let i = 0; i < 5; i++) { s = (s * 1103515245 + 12345) >>> 0; px.rect(g, it.x + (s % 10), it.y + ((s >> 8) % 6), 2 + ((s >> 4) % 3), 2, RUBBLE); }
      } else if (it.kind === 'pipe') FP.decorTube.draw(g, it.path, 5, PIPE, it.seed);
      else FP.decorTube.wire(g, it.path, CABLE);
    }
  }

  function glow() {}   // la friche n'a pas de petites animations dans la terre

  FP.decor = FP.decor || {};
  FP.decor.friche = { palette, skyStatic, back, horizon, front, layout, surface, under, glow };
})();
