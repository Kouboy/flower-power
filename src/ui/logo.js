// ui/logo.js — le logo « Flower Power » : lettres groovy 70s à contours empilés (encre, rose, orange), coulures de boue
// violette qui gouttent, et le « O » de POWER en trèfle radioactif qui tourne lentement.
// Lit     : FP.palette.slug (couleurs des coulures).
// Écrit   : rien dans l'état ; un cache des lettres rendues (canvas hors écran, créé au premier dessin).
// Expose  : FP.logo.layout() (pur, testé : boîtes des lettres, trèfle, coulures), FP.logo.draw(g, x, y, t) (coin haut-gauche).
// Les lettres sont décrites par des traits épais (segments, arcs) tramés une fois en pixels, penchés en italique.
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  const INK = '#3a1430', PINK = '#ff5fa0', ORANGE = '#ffa94d', FILL = ['#fff7ad', '#ffeb8a', '#ffde72', '#ffd166'];
  const RINGS = [[3, INK], [2, PINK], [1, ORANGE]];   // rayon de dilatation → couleur, du plus large au plus fin
  const PAD = 3, GAP = 2, LINE_GAP = 14, SHEAR = .16, DRIP_ROOM = 12, TREFOIL_STEPS = 48;
  const deg = (a) => a * Math.PI / 180;

  // Mots : hauteur des capitales H, des minuscules X, épaisseur du trait T.
  const WORDS = [{ H: 22, X: 16, T: 5, letters: 'Flower' }, { H: 25, X: 18, T: 6, letters: 'Pwer' }];

  // Traits d'une lettre dans sa boîte (origine en haut à gauche, hauteur H) : ['s', x0, y0, x1, y1, demi-épaisseur?] ou ['a', cx, cy, R, a0, a1].
  function strokes(ch, H, X, T) {
    const h = T / 2, top = H - X + h, bot = H - h, mid = H - X / 2;
    switch (ch) {
      case 'F': return { w: H * .72, s: [['s', h, h, h, bot], ['s', h, h, H * .72 - h, h], ['s', h, H * .45, H * .56 - h, H * .45]] };
      case 'l': return { w: T, s: [['s', h, h, h, bot]] };
      case 'o': { const R = X / 2 - h; return { w: X, s: [['a', X / 2, mid, R, 0, 360]] }; }
      case 'w': return { w: X + 6, s: [['s', h, top, h + 3, bot], ['s', h + 3, bot, (X + 6) / 2, top + 3], ['s', (X + 6) / 2, top + 3, X + 3 - h, bot], ['s', X + 3 - h, bot, X + 6 - h, top]] };
      case 'e': { const R = X / 2 - h; return { w: X, s: [['a', X / 2, mid, R, 40, 360], ['s', h, mid, X - h, mid, 1]] }; }   // barre fine : l'œil du e reste ouvert
      case 'r': return { w: X * .75, s: [['s', h, top, h, bot], ['a', h + X * .35, top + X * .3, X * .3, 190, 320]] };
      case 'P': { const bowl = H * .3, R = bowl - h, W = H * .75; return { w: W, s: [['s', h, h, h, bot], ['s', h, h, W - h - R, h], ['s', h, 2 * bowl - h, W - h - R, 2 * bowl - h], ['a', W - h - R, bowl, R, -90, 90]] }; }
    }
    throw new Error('lettre inconnue : ' + ch);
  }

  // Distance d'un point à un segment ; un point est dans un arc s'il est à ±T/2 du cercle, dans la plage d'angles.
  function segDist(px, py, x0, y0, x1, y1) {
    const dx = x1 - x0, dy = y1 - y0, l2 = dx * dx + dy * dy || 1, k = Math.max(0, Math.min(1, ((px - x0) * dx + (py - y0) * dy) / l2));
    return Math.hypot(px - x0 - k * dx, py - y0 - k * dy);
  }
  function inArc(px, py, [, cx, cy, R, a0, a1], h) {
    if (Math.abs(Math.hypot(px - cx, py - cy) - R) > h) return false;
    let a = Math.atan2(py - cy, px - cx) * 180 / Math.PI; if (a < a0) a += 360;
    return a >= a0 && a <= a1;
  }

  // Masque d'une lettre : traits tramés, puis penchés (chaque rangée décalée selon sa hauteur), recadrés au plus juste.
  function mask(ch, word) {
    const { H, X, T } = word, def = strokes(ch, H, X, T), h = T / 2, slant = Math.ceil(SHEAR * H);
    const W = Math.ceil(def.w) + slant, rows = [];
    for (let y = 0; y < H; y++) {
      const row = [], shift = Math.round(SHEAR * (H - 1 - y));
      for (let x = 0; x < W; x++) {
        const px = x - shift + .5, py = y + .5;
        row.push(def.s.some(s => s[0] === 's' ? segDist(px, py, s[1], s[2], s[3], s[4]) <= (s[5] || h) : inArc(px, py, s, h)) ? 1 : 0);
      }
      rows.push(row);
    }
    let x0 = W, x1 = -1;
    rows.forEach(r => r.forEach((v, x) => { if (v) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); } }));
    return { w: x1 - x0 + 1, h: H, rows: rows.map(r => r.slice(x0, x1 + 1)) };
  }

  // Colonne d'une coulure : un pixel du bas de la lettre, pris à une fraction de sa largeur.
  function dripAt(m, f) {
    const y = m.h - 1, cols = m.rows[y].map((v, x) => v ? x : -1).filter(x => x >= 0);
    return { x: cols[Math.min(cols.length - 1, Math.floor(f * cols.length))], y: m.h };
  }
  const DRIPS = { F: [.3], o: [.5], w: [.15, .85], e: [.45], r: [.2], P: [.4] };

  let cached = null;
  function layout() {
    if (cached) return cached;
    const letters = [], drips = [];
    let trefoil = null, y = PAD, width = 0;
    const lines = WORDS.map(word => {
      const items = [];
      let x = 0;
      for (const ch of word.letters) {
        const m = mask(ch, word);
        items.push({ ch, m, x, y: 0 });
        x += m.w + GAP;
        // Le « O » de POWER : une place réservée entre P et w, de la largeur d'un o avec ses anneaux.
        if (ch === 'P') { const r = Math.floor(word.X / 2) - 1; trefoil = { r, dx: x + PAD + r, word }; x += 2 * (r + PAD) + GAP + 1; }
      }
      return { word, items, w: x - GAP };
    });
    width = Math.max(...lines.map(l => l.w)) + 2 * PAD;
    lines.forEach((line, i) => {
      const x0 = Math.round((width - line.w) / 2);
      for (const it of line.items) {
        letters.push({ ch: it.ch, x: x0 + it.x, y, w: it.m.w, h: it.m.h, rows: it.m.rows });
        for (const f of DRIPS[it.ch] || []) { const d = dripAt(it.m, f); drips.push({ x: x0 + it.x + d.x, y: y + d.y }); }
      }
      if (trefoil && trefoil.word === line.word) { trefoil.cx = x0 + trefoil.dx; trefoil.cy = y + line.word.H - line.word.X / 2; }
      y += line.word.H + (i === 0 ? LINE_GAP : 0);
    });
    cached = { width, height: y + PAD + DRIP_ROOM, letters: letters.map(({ rows, ...l }) => l), trefoil: { cx: Math.round(trefoil.cx), cy: Math.round(trefoil.cy), r: trefoil.r }, drips, masks: letters.map(l => l.rows) };
    return cached;
  }

  // Une lettre rendue : anneaux par dilatation du masque, puis remplissage dégradé par rangées.
  const sprites = [];
  function sprite(i) {
    if (sprites[i]) return sprites[i];
    const L = layout(), rows = L.masks[i], w = rows[0].length, h = rows.length;
    const c = document.createElement('canvas'); c.width = w + 2 * PAD; c.height = h + 2 * PAD;
    const g = c.getContext('2d');
    const on = (x, y) => y >= 0 && y < h && x >= 0 && x < w && rows[y][x];
    for (const [r, color] of RINGS) {
      g.fillStyle = color;
      for (let y = -r; y < h + r; y++) for (let x = -r; x < w + r; x++) {
        let hit = false;
        for (let dy = -r; dy <= r && !hit; dy++) for (let dx = -r; dx <= r && !hit; dx++) if (dx * dx + dy * dy <= r * r + 1 && on(x + dx, y + dy)) hit = true;
        if (hit) g.fillRect(x + PAD, y + PAD, 1, 1);
      }
    }
    for (let y = 0; y < h; y++) {
      g.fillStyle = FILL[Math.min(FILL.length - 1, Math.floor(y / h * FILL.length))];
      for (let x = 0; x < w; x++) if (rows[y][x]) g.fillRect(x + PAD, y + PAD, 1, 1);
    }
    return (sprites[i] = c);
  }

  // Trèfle radioactif : disque jaune soufre cerclé comme les lettres, trois pales encre et un moyeu, qui tournent.
  const trefoils = [];
  function trefoilSprite(o, step) {
    if (trefoils[step]) return trefoils[step];
    const R = o.r + PAD, rot = step / TREFOIL_STEPS * 2 * Math.PI / 3;   // trois pales : un tiers de tour suffit
    const c = document.createElement('canvas'); c.width = c.height = 2 * R + 1;
    const g = c.getContext('2d'), x = R - o.cx, y = R - o.cy;
    for (let py = -R; py <= R; py++) for (let px = -R; px <= R; px++) {
      const d = Math.hypot(px, py);
      let col = null;
      if (d <= o.r) {
        const a = Math.atan2(py, px) - rot, blade = [-90, 30, 150].some(b => Math.abs(Math.atan2(Math.sin(a - deg(b)), Math.cos(a - deg(b)))) <= .5);
        col = d <= 1.5 ? INK : d <= 2.6 ? FILL[3] : (blade && d <= o.r - 1 ? INK : FILL[3]);
      } else if (d <= o.r + 1) col = ORANGE; else if (d <= o.r + 2) col = PINK; else if (d <= o.r + 3) col = INK;
      if (col) { g.fillStyle = col; g.fillRect(x + o.cx + px, y + o.cy + py, 1, 1); }
    }
    return (trefoils[step] = c);
  }

  function trefoil(g, x, y, o, t) {
    const step = Math.floor(t * .4 / (2 * Math.PI / 3) * TREFOIL_STEPS) % TREFOIL_STEPS, R = o.r + PAD;
    g.drawImage(trefoilSprite(o, step), x + o.cx - R, y + o.cy - R);
  }

  // Coulure : un filet de boue sous la lettre, une goutte qui gonfle, se détache, tombe et disparaît.
  function drip(g, x, y, d, i, t) {
    const s = FP.palette.slug, len = 3 + (i % 3), period = 1.6 + (i % 4) * .25, p = ((t + i * .37) % period) / period;
    const bx = x + d.x, by = y + d.y - 1;
    g.fillStyle = s.shade; g.fillRect(bx - 1, by, 3, len + 1);   // filet de 2 pixels bordé d'ombre
    g.fillStyle = s.body; g.fillRect(bx - 1, by, 2, len);
    if (p < .5) { const k = p < .25 ? 2 : 3; g.fillStyle = s.shade; g.fillRect(bx - 1, by + len, k, k); g.fillStyle = s.body; g.fillRect(bx - 1, by + len, k - 1, k - 1); g.fillStyle = s.clear; g.fillRect(bx - 1, by + len, 1, 1); }
    else if (p < .8) { g.fillStyle = s.body; g.fillRect(bx - 1, by + len + 2 + Math.round((p - .5) / .3 * 4), 2, 2); }
  }

  function draw(g, x, y, t) {
    const L = layout();
    L.drips.forEach((d, i) => drip(g, x, y, d, i, t));
    L.letters.forEach((l, i) => {
      const bob = Math.floor((t / 1.2 + i * .125) * 2) % 2;   // chaque lettre monte d'un pixel une demi-période sur deux, en décalé
      g.drawImage(sprite(i), x + l.x - PAD, y + l.y - PAD - bob);
    });
    trefoil(g, x, y, L.trefoil, t);
  }

  FP.logo = { layout, draw };
})();
