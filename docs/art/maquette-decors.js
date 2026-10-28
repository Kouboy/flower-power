// Maquettes des décors de milieu (après la v4.10.0) : ciel, horizon, surface et haut du sous-sol, deux variantes par milieu.
// Dessinées avec les primitives du jeu (src/render/px.js), ses palettes (palette.js) et sa police (ui/font.js).
// Une scène = 220 × 200 pixels d'art (largeur d'un téléphone) : ciel 70, pelouse 6, sous-sol en dessous.
(function () {
  'use strict';
  const FP = window.FP, px = FP.px, W = 220, SKY = 70, TOP = SKY + 6, H = 200;
  const rngOf = (seed) => { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };

  // --- Communs ---------------------------------------------------------------------------------
  function sky(g, pal) {
    const band = SKY / pal.length;
    for (let i = 0; i < pal.length; i++) {
      const y0 = Math.round(i * band), y1 = Math.round((i + 1) * band);
      px.rect(g, 0, y0, W, y1 - y0, pal[i]);
      if (i > 0) for (let k = 0; k < 4; k++) px.dither(g, 0, y0 - 2 + k, W, 1, pal[i - 1], pal[i], 4 + k * 3);
    }
  }
  function lawn(g, L) {
    px.rect(g, 0, SKY + 2, W, 4, L[1]); px.rect(g, 0, SKY + 4, W, 2, L[0]);
    for (let x = 0; x < W; x++) { const h = 1 + ((x * 7) % 5 === 0 ? 2 : (x * 3) % 4 === 0 ? 1 : 0); px.rect(g, x, SKY + 2 - h, 1, h, (x % 3) ? L[2] : L[3]); }
  }
  function strata(g, id, seed) {
    const r = rngOf(seed);
    for (let y = TOP; y < H; y += 4) for (let x = 0; x < W; x += 4) {
      const d = (y - TOP) / (H - TOP) * .45;
      px.rect(g, x, y, 4, 4, FP.palette.strataTone(d, Math.floor(r() * 4), id));
    }
  }
  const smokeCol = (t, k, n, a, b) => (((t / 3 + k / 3 + n * .17) % 1) < .5 ? a : b);
  function plume(g, x, y, t, n, a, b, size = 1, rise = 22) {
    for (let k = 0; k < 3; k++) {
      const ph = ((t / 3 + k / 3 + n * .17) % 1);
      px.disc(g, x + Math.round(ph * 6 * size), y - Math.round(ph * rise), Math.round((1 + ph * 2) * size), smokeCol(t, k, n, a, b));
    }
  }
  const text = (g, s, x, y, color) => FP.font.draw(g, s, x, y, { color, outline: false });

  // --- Friche urbaine : barres d'immeubles, grue, panneau « GREEN FUTURE » déchiré ; palissade taguée, caddie, plots ;
  //     sous-sol de briques, gravats, câbles, canalisation. ---------------------------------------------------
  const friche = {
    id: 'friche', sky: 0, lawn: 0,
    skyStatic(g) {   // soleil voilé, comme aujourd'hui
      const pal = FP.palette.milieux.friche.sky[0], sx = 150, sy = 54;
      for (let k = 3; k >= 1; k--) px.ring(g, sx, sy, 15 + k * 2, pal[6], 2);
      px.disc(g, sx, sy, 15, pal[7]);
    },
    back(g, v, t) {   // smog qui dérive
      const pal = FP.palette.milieux.friche.sky[0];
      for (let i = 0; i < 3; i++) { const cx = ((i * 83 + t * (2 + i * .6)) % 280) - 30, cy = 12 + i * 10; for (let k = 0; k < 4; k++) px.disc(g, cx + k * 7 - 10, cy + ((k * 3) % 4), 4 + (k % 2) * 2, i % 2 ? pal[3] : pal[4]); }
    },
    static(g, v) {
      const S = '#24122e', SL = '#341a3e';
      if (v === 0) {
        // Barres d'immeubles et leurs fenêtres.
        for (const [x, w, h] of [[4, 34, 30], [44, 22, 40], [72, 40, 26], [118, 26, 36], [150, 44, 22], [198, 22, 32]]) {
          px.rect(g, x, SKY - h, w, h, x % 3 ? S : SL);
          for (let wy = SKY - h + 3; wy < SKY - 3; wy += 4) for (let wx = x + 2; wx < x + w - 2; wx += 4) px.rect(g, wx, wy, 2, 2, '#1a0c22');
        }
        friche.crane(g, 100, 18);
      } else {
        // Pavillons bas, grue lointaine, grand panneau déchiré.
        for (let x = 0, n = 0; x < W; n++) { const w = 14 + (n * 7) % 10, h = 8 + (n * 5) % 6; px.rect(g, x, SKY - h, w, h, n % 2 ? S : SL); px.rect(g, x + 2, SKY - h - 3, w - 4, 3, S); x += w + 2; }
        friche.crane(g, 186, 30);
        px.rect(g, 40, 50, 2, 20, '#1a0c22'); px.rect(g, 104, 50, 2, 20, '#1a0c22');
        px.rect(g, 30, 26, 86, 26, '#3a2a3e'); px.rect(g, 32, 28, 82, 22, '#d8c8a8');
        text(g, 'GREEN', 38, 30, '#4f7a2a'); text(g, 'FUTURE', 38, 40, '#4f7a2a');
        for (let i = 0; i < 4; i++) px.disc(g, 96 + i * 3, 36 + (i % 2) * 3, 3, '#5e8c30');   // la feuille du logo
        for (let i = 0; i < 12; i++) px.rect(g, 84 + i * 2, 28 + i, 30 - i * 2, 1, '#3a2a3e');  // coin arraché
        px.rect(g, 104, 28, 10, 2, '#b8a888');
      }
    },
    crane(g, x, top) {
      const C = '#1a0c22';
      px.rect(g, x, top, 2, SKY - top, C);
      for (let y = top + 3; y < SKY; y += 4) px.line(g, x - 1, y, x + 2, y + 3, C);
      px.rect(g, x - 24, top, 40, 2, C); px.rect(g, x + 14, top + 2, 4, 3, C);
      px.line(g, x + 1, top - 6, x - 22, top, C); px.line(g, x + 1, top - 6, x + 16, top, C);
      px.rect(g, x - 18, top + 2, 1, 10, '#341a3e'); px.rect(g, x - 20, top + 12, 5, 3, '#341a3e');
    },
    anim(g, v, t) {
      if (v === 0) for (const [wx, wy] of [[8, 46], [52, 38], [56, 58], [80, 50], [126, 42], [156, 56], [202, 46]])
        if (((Math.floor(t * 1.3) + wx) % 5) !== 0) px.rect(g, wx, wy, 2, 2, wx % 2 ? '#f0b890' : '#d86850');
    },
    surface(g, v) {
      const y = SKY + 1;
      // Palissade taguée.
      for (let x = 10; x < 70; x += 4) { px.rect(g, x, y - 13, 3, 13, '#3a2a1e'); px.rect(g, x, y - 13, 3, 1, '#4a3626'); }
      px.line(g, 14, y - 9, 30, y - 6, '#e07a3a', 2); px.line(g, 34, y - 10, 44, y - 4, '#5fa88a', 2); px.line(g, 48, y - 8, 64, y - 9, '#f0a0a0', 2);
      // Caddie renversé.
      const cx = v === 0 ? 150 : 120;
      for (let i = 0; i < 4; i++) px.rect(g, cx, y - 9 + i * 2, 16, 1, '#9aa4b0');
      for (let i = 0; i < 5; i++) px.rect(g, cx + i * 4, y - 9, 1, 8, '#9aa4b0');
      px.disc(g, cx + 18, y - 8, 1, '#3a3a3a'); px.disc(g, cx + 18, y - 3, 1, '#3a3a3a');
      // Plots de chantier.
      for (const x of v === 0 ? [96, 104] : [176, 186, 196]) { px.rect(g, x, y - 7, 4, 7, '#e07a3a'); px.rect(g, x - 1, y - 1, 6, 1, '#e07a3a'); px.rect(g, x, y - 4, 4, 1, '#f4ecd8'); }
    },
    under(g, v) {
      const r = rngOf(11 + v);
      for (let n = 0; n < 9; n++) {   // briques et gravats
        const x = Math.floor(r() * 200), y = TOP + 8 + Math.floor(r() * 110);
        if (n % 3) for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) px.rect(g, x + i * 5 + (j % 2) * 2, y + j * 3, 4, 2, j % 2 ? '#3a2016' : '#4a2a1c');
        else for (let i = 0; i < 5; i++) px.rect(g, x + Math.floor(r() * 10), y + Math.floor(r() * 6), 2 + Math.floor(r() * 3), 2, '#2e2620');
      }
      // Canalisation et câble.
      const py = v === 0 ? TOP + 40 : TOP + 70;
      px.rect(g, 0, py, W, 5, '#3a3430'); px.rect(g, 0, py, W, 1, '#4a443c');
      for (let x = 20; x < W; x += 50) px.rect(g, x, py - 1, 4, 7, '#2a2420');
      for (let x = 0; x < W; x++) px.rect(g, x, TOP + 90 + Math.round(Math.sin(x / 9) * 3), 1, 1, '#1a1414');
    },
    underAnim() {}
  };

  // --- Zone industrielle : cheminées massives, cuves, enseigne qui clignote / raffinerie, torchère, convoyeur ;
  //     palettes, fûts rouillés, rails ; conduites rouillées, poches d'huile, scories. ---------------------------
  const industrie = {
    id: 'industrie', sky: 0, lawn: 0,
    skyStatic(g) { px.dither(g, 0, SKY - 18, W, 18, FP.palette.milieux.industrie.sky[0][6], FP.palette.milieux.industrie.sky[0][7], 6); },   // brume de soufre
    back(g, v, t) {   // gros panaches de smog, lents
      const pal = FP.palette.milieux.industrie.sky[0];
      for (let i = 0; i < 2; i++) { const cx = ((i * 113 + t * 1.5) % 300) - 40; for (let k = 0; k < 5; k++) px.disc(g, cx + k * 9, 10 + i * 12 + (k % 2) * 2, 6, i ? pal[2] : pal[3]); }
    },
    static(g, v) {
      const S = '#1a1814', SL = '#2a2620', R = '#5a2a1e';
      if (v === 0) {
        for (const [x, h] of [[30, 56], [62, 48], [170, 60]]) { px.rect(g, x, SKY - h, 8, h, S); for (let y = SKY - h + 4; y < SKY - h + 20; y += 8) px.rect(g, x, y, 8, 3, R); }
        for (const x of [90, 120]) { px.rect(g, x, SKY - 18, 26, 18, SL); px.disc(g, x + 13, SKY - 18, 13, SL); px.rect(g, x - 1, SKY - 18, 28, 18, SL); }
        px.rect(g, 0, SKY - 10, W, 2, S); px.rect(g, 140, SKY - 28, 26, 28, S); px.rect(g, 200, SKY - 22, 20, 22, SL);
        px.rect(g, 142, SKY - 38, 22, 9, '#2e2a22');
      } else {
        for (const [x, h, w] of [[20, 44, 10], [40, 34, 6], [100, 50, 12], [150, 40, 8]]) { px.rect(g, x, SKY - h, w, h, S); for (let y = SKY - h; y < SKY; y += 6) px.rect(g, x - 2, y, w + 4, 1, SL); }
        px.rect(g, 196, SKY - 46, 3, 46, S);   // torchère
        px.line(g, 60, SKY - 4, 96, SKY - 30, SL, 3); px.rect(g, 94, SKY - 32, 10, 6, S);   // convoyeur
        px.rect(g, 0, SKY - 8, W, 8, S); px.rect(g, 120, SKY - 20, 30, 20, SL);
      }
    },
    anim(g, v, t) {
      if (v === 0) {
        for (const [x, h, n] of [[30, 56, 0], [62, 48, 1], [170, 60, 2]]) plume(g, x + 4, SKY - h - 2, t * .6, n, '#3a3428', '#4a4232', 2.4, 34);
        const on = Math.floor(t * 2) % 3 !== 0;
        text(g, 'ACME', 145, SKY - 37, on ? '#e6d070' : '#5e5636');
      } else {
        for (const [x, h, n] of [[25, 44, 0], [106, 50, 1]]) plume(g, x, SKY - h - 2, t * .6, n, '#3a3428', '#4a4232', 2, 30);
        const f = Math.sin(t * 13) > 0;   // torchère qui vacille
        px.disc(g, 197, SKY - 50, f ? 3 : 2, '#f0a848'); px.disc(g, 197, SKY - 52, f ? 1 : 2, '#f8d070');
        for (let i = 0; i < 5; i++) { const k = ((t * .5 + i / 5) % 1); px.rect(g, 60 + k * 34, SKY - 6 - k * 26, 3, 2, '#6a5a3a'); }   // caisses sur le convoyeur
      }
    },
    surface(g, v) {
      const y = SKY + 1;
      for (let i = 0; i < (v === 0 ? 3 : 5); i++) { const x = 12 + i * 2, yy = y - 3 - i * 3; px.rect(g, x, yy, 22, 2, '#6a5a3a'); px.rect(g, x + 2, yy + 2, 2, 1, '#4a3e28'); px.rect(g, x + 18, yy + 2, 2, 1, '#4a3e28'); }
      for (const x of v === 0 ? [120, 130, 125] : [150, 160]) { const yy = x === 125 ? y - 18 : y - 9; px.rect(g, x, yy, 8, 9, '#7a3a1e'); px.rect(g, x, yy + 2, 8, 1, '#3a1a0c'); px.rect(g, x, yy + 6, 8, 1, '#3a1a0c'); px.rect(g, x + 1, yy, 1, 9, '#9a5a2e'); }
      px.rect(g, 50, y - 1, 60, 1, '#5a5a5a'); for (let x = 52; x < 110; x += 6) px.rect(g, x, y, 3, 1, '#3a3022');
    },
    under(g, v) {
      const r = rngOf(21 + v);
      for (const py of v === 0 ? [TOP + 24, TOP + 80] : [TOP + 50]) {
        px.rect(g, 0, py, W, 6, '#4a3424'); px.rect(g, 0, py, W, 1, '#6a4a30');
        for (let x = 10; x < W; x += 36) px.rect(g, x, py - 1, 5, 8, '#2a1c12');
      }
      for (let n = 0; n < 4; n++) { const x = 20 + Math.floor(r() * 170), y = TOP + 34 + Math.floor(r() * 80); px.disc(g, x, y, 6, '#0c0c0c'); px.disc(g, x + 4, y + 2, 4, '#0c0c0c'); px.rect(g, x - 3, y - 3, 4, 1, '#3a4048'); }
      for (let n = 0; n < 10; n++) px.rect(g, Math.floor(r() * 210), TOP + 6 + Math.floor(r() * 115), 3 + Math.floor(r() * 3), 2, n % 2 ? '#2a2622' : '#3a342c');
    },
    underAnim(g, v, t) {   // l'huile qui luit
      const r = rngOf(21 + v);
      for (let n = 0; n < 4; n++) { const x = 20 + Math.floor(r() * 170), y = TOP + 34 + Math.floor(r() * 80); if (Math.floor(t * 1.5 + n) % 4 === 0) px.rect(g, x - 1, y - 2, 3, 1, '#5a6068'); }
    }
  };

  // --- Décharge : montagnes d'ordures, bulldozer, grue à grappin, fumée de brûlage, mouettes ; sacs, pneus, frigo ;
  //     couches de déchets compactés, suintements. ------------------------------------------------------------
  const decharge = {
    id: 'decharge', sky: 1, lawn: 0,
    hill(g, x0, w, h, seed) {
      const r = rngOf(seed);
      for (let x = 0; x < w; x++) { const k = x / w, hh = Math.round(h * Math.sin(Math.PI * k) * (.85 + r() * .15)); px.rect(g, x0 + x, SKY - hh, 1, hh, '#2a2a1a'); }
      for (let n = 0; n < w / 2; n++) { const x = x0 + Math.floor(r() * w), k = (x - x0) / w, top = SKY - Math.round(h * Math.sin(Math.PI * k)); px.rect(g, x, top + 1 + Math.floor(r() * (SKY - top)), 2, 1, ['#6a6a4a', '#5a4a3a', '#4a5a4a', '#7a6a50'][n % 4]); }
    },
    skyStatic(g) { const pal = FP.palette.milieux.decharge.sky[1]; px.dither(g, 0, SKY - 26, W, 26, pal[6], pal[7], 5); },   // poussière sur l'horizon
    back() {},
    static(g, v) {
      if (v === 0) {
        decharge.hill(g, -10, 90, 34, 3); decharge.hill(g, 70, 80, 26, 4); decharge.hill(g, 140, 90, 38, 5);
        const bx = 104;   // bulldozer
        px.rect(g, bx, SKY - 30, 18, 6, '#1e1e12'); px.rect(g, bx + 10, SKY - 36, 7, 6, '#1e1e12'); px.rect(g, bx - 4, SKY - 32, 3, 8, '#1e1e12'); px.rect(g, bx, SKY - 24, 18, 3, '#141410');
      } else {
        decharge.hill(g, 10, 200, 52, 6);
        px.rect(g, 176, SKY - 66, 3, 66, '#1e1e12'); px.rect(g, 140, SKY - 66, 40, 2, '#1e1e12'); px.line(g, 177, SKY - 72, 142, SKY - 66, '#1e1e12');
        px.rect(g, 148, SKY - 64, 1, 12, '#2a2a1a');
      }
    },
    anim(g, v, t) {
      const pal = FP.palette.milieux.decharge.sky[1];
      const sx = v === 0 ? 40 : 90;   // fumée de brûlage
      for (let k = 0; k < 6; k++) { const ph = ((t / 5 + k / 6) % 1); px.disc(g, sx + Math.round(ph * 14), SKY - (v === 0 ? 32 : 50) - Math.round(ph * 40), Math.round(2 + ph * 5), ph < .5 ? pal[4] : pal[5]); }
      if (v === 1) { const sw = Math.sin(t * 1.2) * 2; px.line(g, 148, SKY - 52, 148 + sw, SKY - 46, '#2a2a1a'); px.rect(g, 145 + sw, SKY - 46, 7, 4, '#1e1e12'); }
      for (let i = 0; i < 5; i++) {   // mouettes qui tournent
        const a = t * .7 + i * 1.3, cx = 110 + Math.cos(a) * (50 + i * 8), cy = 22 + Math.sin(a) * 10 + i * 3, f = Math.floor(t * 6 + i) % 2;
        px.rect(g, cx - 2, cy - f, 2, 1, '#d8d4c0'); px.rect(g, cx, cy, 1, 1, '#d8d4c0'); px.rect(g, cx + 1, cy - f, 2, 1, '#d8d4c0');
      }
    },
    surface(g, v) {
      const y = SKY + 1;
      for (const x of v === 0 ? [20, 30, 26] : [20, 32, 44, 38]) { const yy = x === 26 || x === 38 ? y - 12 : y - 7; px.disc(g, x, yy + 3, 4, '#1a1a1a'); px.rect(g, x - 1, yy - 2, 2, 2, '#c8b448'); px.rect(g, x - 2, yy + 1, 2, 1, '#2e2e2e'); }
      for (const [x, yy] of v === 0 ? [[90, y - 4]] : [[90, y - 4], [92, y - 9], [110, y - 4]]) { px.ring(g, x, yy, 4, '#141414', 2); px.disc(g, x, yy, 1, '#2a2a2a'); }
      const fx = 160;   // vieux frigo, porte entrouverte
      px.rect(g, fx, y - 20, 12, 20, '#c8c4b0'); px.rect(g, fx, y - 13, 12, 1, '#9a9686'); px.rect(g, fx + 10, y - 18, 1, 3, '#5a5a5a');
      px.rect(g, fx + 12, y - 20, 4, 20, '#9a9686');
    },
    under(g, v) {
      const r = rngOf(31 + v);
      for (let b = 0; b < (v === 0 ? 3 : 5); b++) {   // couches compactées
        const y0 = TOP + 10 + b * (v === 0 ? 36 : 22), hh = 10;
        px.dither(g, 0, y0, W, hh, FP.palette.strataTone(.1, 1, 'decharge'), '#2a2418', 6);
        for (let n = 0; n < 30; n++) px.rect(g, Math.floor(r() * 216), y0 + Math.floor(r() * (hh - 2)), 2 + (n % 3), n % 4 ? 1 : 2, ['#6a6a6a', '#8a7a5a', '#3a5a3a', '#4a6a4a', '#2a2a2a'][n % 5]);
      }
    },
    underAnim(g, v, t) {   // suintements qui gouttent
      for (let i = 0; i < 5; i++) { const x = 18 + i * 44, ph = ((t * .4 + i * .37) % 1); px.rect(g, x, TOP + 22 + i * 7, 1, 3, '#4a4a20'); px.rect(g, x, TOP + 25 + i * 7 + Math.round(ph * 18), 1, 2, '#6a6a2a'); }
    }
  };

  // --- Site nucléaire : tours de refroidissement qui fument, pylônes, lune verte, aurore ; clôture, trèfle ;
  //     fûts jaunes, panneaux, herbe mutante ; fûts enterrés qui fuient, galeries de béton, cailloux qui luisent. ---
  const GLOW = ['#3ab88a', '#5ad0a0', '#8af0c0'];   // vert d'eau radioactif, distinct du vert de la pousse
  const nucleaire = {
    id: 'nucleaire', sky: 0, lawn: 0,
    tower(g, cx, base, h, w) {
      for (let y = 0; y < h; y++) { const k = y / h, half = Math.round(w * (.62 + .38 * Math.pow(Math.abs(k - .7) / .7, 1.6))); px.rect(g, cx - half, base - y, 2 * half, 1, y % 7 === 0 ? '#2a3830' : '#1e2a24'); }
    },
    pylon(g, x) {
      const C = '#0e1612';
      px.line(g, x - 5, SKY, x, SKY - 34, C); px.line(g, x + 5, SKY, x, SKY - 34, C);
      px.rect(g, x - 9, SKY - 28, 18, 1, C); px.rect(g, x - 7, SKY - 22, 14, 1, C);
      for (let y = SKY - 30; y < SKY; y += 6) px.line(g, x - 3, y, x + 3, y + 5, C);
    },
    skyStatic(g, v) {   // étoiles et lune verte un peu trop grosse
      const r = rngOf(41 + v);
      for (let n = 0; n < 30; n++) px.rect(g, Math.floor(r() * W), Math.floor(r() * 40), 1, 1, '#a8c8a0');
      if (v === 0) { px.disc(g, 40, 18, 9, '#a0c880'); px.disc(g, 37, 16, 2, '#88b070'); px.disc(g, 43, 21, 1, '#88b070'); }
      else { px.disc(g, 180, 16, 13, '#a0c880'); px.disc(g, 175, 13, 3, '#88b070'); }
    },
    back(g, v, t) {   // aurore verdâtre, étoiles qui scintillent
      for (let i = 0; i < W; i++) {
        const y = Math.round((v === 0 ? 30 : 34) + Math.sin(i / 17 + t * .8) * 5 + Math.sin(i / 7 - t * .5) * 2);
        px.rect(g, i, y, 1, v === 0 ? 2 : 4, (i + Math.floor(t * 4)) % 9 < 5 ? '#3a8a5a' : '#2a6a4a');
      }
      const r = rngOf(41 + v);
      for (let n = 0; n < 30; n++) { const x = Math.floor(r() * W), y = Math.floor(r() * 40); if (Math.floor(t * 3 + n) % 7 === 0) px.rect(g, x - 1, y, 3, 1, '#d8f0d0'); }
    },
    static(g, v) {
      if (v === 0) {
        nucleaire.tower(g, 120, SKY, 40, 16); nucleaire.tower(g, 160, SKY, 32, 13);
        nucleaire.pylon(g, 30); nucleaire.pylon(g, 206);
        px.line(g, 30, SKY - 28, 206, SKY - 28 + 4, '#0e1612');
      } else {
        nucleaire.tower(g, 100, SKY, 54, 22);
        for (let x = 0; x < W; x += 6) px.rect(g, x, SKY - 10, 1, 10, '#2a3430');
        px.rect(g, 0, SKY - 10, W, 1, '#2a3430'); for (let x = 2; x < W; x += 4) px.rect(g, x, SKY - 11, 1, 1, '#3a4440');
        nucleaire.sign(g, 160, SKY - 24, 10);
      }
    },
    sign(g, x, y, s) {   // trèfle radioactif sur fond jaune
      for (let i = 0; i < s; i++) px.rect(g, x - i, y + i, 2 * i + 1, 1, '#e8c840');
      px.disc(g, x, y + Math.round(s * .62), 1, '#1a1a1a');
      px.rect(g, x - 3, y + s - 3, 2, 2, '#1a1a1a'); px.rect(g, x + 2, y + s - 3, 2, 2, '#1a1a1a'); px.rect(g, x, y + 2, 1, 2, '#1a1a1a');
    },
    anim(g, v, t) {
      const towers = v === 0 ? [[120, 40, 16], [160, 32, 13]] : [[100, 54, 22]];
      towers.forEach(([x, h, w], n) => { for (let k = 0; k < 4; k++) { const ph = ((t / 4 + k / 4 + n * .3) % 1); px.disc(g, x + Math.round(ph * 10) - 4, SKY - h - 2 - Math.round(ph * 22), Math.round(w * .22 + ph * w * .3), ph < .5 ? '#4a6e48' : '#365a3a'); } });
    },
    surface(g, v) {
      const y = SKY + 1;
      for (const x of v === 0 ? [30, 41] : [30, 41, 52, 36]) { const yy = x === 36 ? y - 18 : y - 9; px.rect(g, x, yy, 10, 9, '#d8b830'); px.rect(g, x, yy + 2, 10, 1, '#a88a20'); px.rect(g, x, yy + 6, 10, 1, '#a88a20'); nucleaire.sign(g, x + 5, yy + 2, 3); }
      for (const x of v === 0 ? [140] : [120, 180]) { px.rect(g, x + 5, y - 14, 2, 14, '#2a2a2a'); px.rect(g, x, y - 22, 12, 10, '#1a1a1a'); px.rect(g, x + 1, y - 21, 10, 8, '#e8c840'); px.rect(g, x + 5, y - 19, 2, 4, '#1a1a1a'); px.rect(g, x + 5, y - 14, 2, 1, '#1a1a1a'); }
      for (const x of [80, 92, 100, 196]) { px.line(g, x, y, x - 3, y - 10, '#465a52'); px.line(g, x, y, x + 2, y - 8, '#465a52'); }
    },
    surfaceAnim(g, v, t) {   // pointes d'herbe mutante qui luisent
      const y = SKY + 1;
      for (const [i, x] of [80, 92, 100, 196].entries()) { const on = Math.sin(t * 3 + i) > 0; px.rect(g, x - 4, y - 12, 2, 2, on ? GLOW[2] : GLOW[0]); px.rect(g, x + 2, y - 10, 1, 1, GLOW[1]); }
    },
    under(g, v) {
      const r = rngOf(51 + v);
      const gy = v === 0 ? TOP + 60 : TOP + 40;   // galerie de béton
      px.rect(g, 0, gy, W, 18, '#2a2e34'); px.rect(g, 0, gy + 3, W, 12, '#0c0e10'); for (let x = 0; x < W; x += 24) px.rect(g, x, gy, 2, 18, '#1a1d22');
      for (let n = 0; n < 12; n++) px.rect(g, Math.floor(r() * 216), TOP + 6 + Math.floor(r() * 115), 2, 2, '#2a3a30');
    },
    underAnim(g, v, t) {   // fûts enterrés qui fuient, cailloux qui luisent
      for (const [x, y] of v === 0 ? [[40, TOP + 20], [170, TOP + 96]] : [[60, TOP + 80], [150, TOP + 14], [190, TOP + 96]]) {
        px.rect(g, x, y, 9, 12, '#5a5020'); px.rect(g, x, y + 3, 9, 1, '#3a3416'); px.rect(g, x, y + 8, 9, 1, '#3a3416');
        const p = (Math.sin(t * 2 + x) + 1) / 2;
        px.rect(g, x + 9, y + 9, 3 + Math.round(p * 3), 2, GLOW[0]); px.rect(g, x + 10, y + 10, 1 + Math.round(p * 2), 1, GLOW[1]);
      }
      const r = rngOf(61 + v);
      for (let n = 0; n < 8; n++) { const x = Math.floor(r() * 216), y = TOP + 10 + Math.floor(r() * 110); px.rect(g, x, y, 2, 2, Math.floor(t * 2 + n) % 3 ? '#2a5a46' : GLOW[0]); }
    }
  };

  // --- Rendu : chaque scène a sa toile ; la partie fixe est peinte une fois, l'animation à chaque image. ------------
  const MILIEUX = [friche, industrie, decharge, nucleaire];
  function scene(m, v) {
    const make = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
    const back = make(), front = make(), b = back.getContext('2d'), f = front.getContext('2d'), P = FP.palette.milieux[m.id];
    sky(b, P.sky[m.sky]); m.skyStatic(b, v);                                                          // fond : ciel et astres
    m.static(f, v); lawn(f, P.lawn[m.lawn]); strata(f, m.id, 7 + v); m.under(f, v); m.surface(f, v);   // premier plan
    return (g, t) => {
      g.drawImage(back, 0, 0); m.back(g, v, t); g.drawImage(front, 0, 0);
      m.anim(g, v, t); if (m.surfaceAnim) m.surfaceAnim(g, v, t); m.underAnim(g, v, t);
    };
  }
  FP.maquetteDecors = { MILIEUX, scene, W, H };
})();
