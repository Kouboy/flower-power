// Plans des boss (v5.1.0) : quatre plans composés à la main (assets/boss/plans.js), posés dans le monde par FP.bossPlan.
// Chaque test passe les quatre milieux à quatre largeurs d'écran ; channelMin, propre à chaque boss (config.boss.ramp), est mis à l'échelle × W / 360 par toWorld.
const PLAN_MILIEUX = ['friche', 'industrie', 'decharge', 'nucleaire'];
const PLAN_FORMS = { friche: 'muraille', industrie: 'colosse', decharge: 'forteresse', nucleaire: 'reacteur' };
// Le jeu impose le 9:16 (render/view.js) : une seule proportion d'écran, seule la largeur varie.
const PLAN_WIDTHS = [280, 300, 360, 440];
// 12 px de trajet juste avant la cible, dispensés de distance : voulu (la pointe y touche sa cible), et pas mis à l'échelle de W.
const PLAN_END = 12;

// Chaque plan est vérifié sur un niveau de départ et sur un niveau étiré au facteur maximal (v5.3.0 : la hauteur suit la vitesse).
const stretchTo = (s, stems) => { s.plant.stemCount = stems; const h = FP.state.levelHeightFor(s); Object.assign(s.world, { height: h.height, baseHeight: h.base, growK: h.k }); return s; };
const eachPlan = (fn) => {
  for (const grown of [false, true]) for (const W of PLAN_WIDTHS) for (const milieu of PLAN_MILIEUX) {
    const s = FP.state.createRun(7, { W, H: Math.round(W * 16 / 9) });
    if (grown) stretchTo(s, 1e3);
    const plan = window.FLOWER_POWER_BOSS_PLANS[milieu];
    fn({ s, W, milieu, plan, grown, placed: FP.bossPlan.toWorld(plan, s.world), zone: FP.bossPlan.zone(s.world), at: `${milieu} W=${W}${grown ? ' k=' + s.world.growK.toFixed(2) : ''}` });
  }
};
// Points d'un trajet tous les 4 px, avec la longueur qui reste jusqu'au bout.
const pathSamples = (pts) => {
  const out = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) total += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  let done = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], len = Math.hypot(b.x - a.x, b.y - a.y), n = Math.max(1, Math.ceil(len / 4));
    for (let k = 0; k < n; k++) out.push({ x: a.x + (b.x - a.x) * k / n, y: a.y + (b.y - a.y) * k / n, left: total - done - len * k / n });
    done += len;
  }
  out.push({ x: pts[pts.length - 1].x, y: pts[pts.length - 1].y, left: 0 });
  return out;
};
// Le trajet vers la tête ne compte pas la tête elle-même dans la distance (il doit bien finir dessus).
const withoutPiece = (placed, id) => ({ ...placed, pieces: placed.pieces.filter(p => p.id !== id) });
const inRect = (r, x, y) => x >= r[0] && x <= r[2] && y >= r[1] && y <= r[3];

FP.test('bossPlan: quatre plans, un par milieu, avec la forme de la spec', () => {
  for (const milieu of PLAN_MILIEUX) FP.assertEqual(window.FLOWER_POWER_BOSS_PLANS[milieu].form, PLAN_FORMS[milieu], milieu);
  FP.assertEqual(Object.keys(window.FLOWER_POWER_BOSS_PLANS).length, 4, 'quatre plans');
});

FP.test('bossPlan: 3 cibles, 1 tête, 3 plaques, chaque cible reliée à sa plaque', () => {
  eachPlan(({ placed, at }) => {
    const of = (role) => placed.pieces.filter(p => p.role === role);
    const targets = of('target'), plates = of('plate');
    FP.assertEqual(targets.length, 3, 'cibles ' + at);
    FP.assertEqual(of('head').length, 1, 'tête ' + at);
    FP.assertEqual(plates.length, 3, 'plaques ' + at);
    for (const t of targets) FP.assert(plates.some(p => p.id === t.plate), `plaque de ${t.id} ` + at);
    for (const p of plates) FP.assertEqual(targets.filter(t => t.plate === p.id).length, 1, `cible de ${p.id} ` + at);
    FP.assertEqual(new Set(placed.pieces.map(p => p.id)).size, placed.pieces.length, 'identifiants uniques ' + at);
  });
});

FP.test('bossPlan: toutes les pièces dans le cadre', () => {
  eachPlan(({ W, placed, zone, at }) => {
    FP.assert(zone.top < zone.bottom, 'zone ' + at);
    for (const p of placed.pieces) for (const [x, y] of p.poly) {
      FP.assert(x >= -1e-6 && x <= W + 1e-6 && y >= zone.top - 1e-6 && y <= zone.bottom + 1e-6, `${p.id} (${x | 0},${y | 0}) ` + at);
    }
  });
});

FP.test('bossPlan: chaque trajet reste à distance sûre et atteint sa cible', () => {
  eachPlan(({ s, W, milieu, placed, at }) => {
    const ids = placed.pieces.filter(p => p.role === 'target').map(p => p.id).concat('head');
    FP.assertEqual(Object.keys(placed.paths).length, ids.length, 'un trajet par cible et un vers la tête ' + at);
    const half = placed.channelMin / 2;
    FP.assert(Math.abs(placed.channelMin - FP.config.boss.ramp[milieu].channelMin * W / 360) < 1e-9, 'channelMin du boss, à l\'échelle ' + at);
    for (const id of ids) {
      const pts = placed.paths[id], piece = placed.pieces.find(p => (id === 'head' ? p.role === 'head' : p.id === id));
      FP.assert(pts && pts.length >= 2, `trajet ${id} ` + at);
      FP.assert(pts[0].x === W / 2 && pts[0].y === s.world.height - FP.config.plant.seedOffset, `${id} part de la graine ` + at);
      const last = pts[pts.length - 1];
      FP.assert(FP.geom.sdPoly(last.x, last.y, piece.poly) <= 0, `${id} touche sa cible ` + at);
      const others = withoutPiece(placed, piece.id);
      for (const q of pathSamples(pts)) {
        if (q.left < PLAN_END) continue;
        const c = FP.bossPlan.clearance(others, q.x, q.y);
        FP.assert(c >= half, `${id} trop près d'une paroi en (${q.x | 0},${q.y | 0}) : ${c.toFixed(1)} < ${half.toFixed(1)} ` + at);
      }
    }
  });
});

// v5.1.0 (retours de playtest) : les plans sont resserrés à la main ; le canal le plus serré de chaque plan approche la largeur du boss,
// à la largeur où ils sont composés (360 px : la zone du boss n'est pas exactement proportionnelle à W, ses marges sont en px).
const PLAN_TIGHT = 4;   // px au plus entre le trajet le plus serré et la demi-largeur minimale
FP.test('bossPlan: chaque plan a un canal resserré près de la largeur minimale de son boss', () => {
  eachPlan(({ W, grown, placed, at }) => {
    if (W !== 360 || grown) return;   // propriété des plans à leur taille de départ ; étirés, les passages verticaux s'élargissent
    let tight = Infinity;
    for (const [id, pts] of Object.entries(placed.paths)) {
      const piece = placed.pieces.find(p => (id === 'head' ? p.role === 'head' : p.id === id)), others = withoutPiece(placed, piece.id);
      for (const q of pathSamples(pts)) if (q.left >= PLAN_END) tight = Math.min(tight, FP.bossPlan.clearance(others, q.x, q.y));
    }
    FP.assert(tight <= placed.channelMin / 2 + PLAN_TIGHT, `canal le plus serré ${tight.toFixed(1)} > ${(placed.channelMin / 2).toFixed(1)} + ${PLAN_TIGHT} ` + at);
  });
});

// La galerie est défendue en trois sections, une par vanne, chacune centrée sur le débouché de sa meurtrière : d'un bord à l'autre,
// une seule salle ne s'esquivait pas depuis les meurtrières des bords (bossfight.test.js).
FP.test('bossPlan: la galerie des vannes de la Bétonneuse est défendue (coulée de béton), une section par vanne', () => {
  eachPlan(({ milieu, placed, at }) => {
    if (milieu !== 'friche') return;
    const sections = placed.rooms.filter(r => r.id.startsWith('galerie'));
    FP.assertEqual(sections.length, 3, 'sections ' + at);
    for (const t of placed.pieces.filter(p => p.role === 'target')) {
      const xs = t.poly.map(v => v[0]), ys = t.poly.map(v => v[1]), cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
      const in_ = sections.filter(r => inRect(r.rect, cx, cy));
      FP.assert(in_.length === 1 && in_[0].defense === 'beton', `${t.id} dans une section défendue ` + at);
    }
  });
});

FP.test('bossPlan: les trajets montent toujours (la tige ne redescend pas)', () => {
  eachPlan(({ placed, at }) => {
    for (const [id, pts] of Object.entries(placed.paths)) {
      for (let i = 1; i < pts.length; i++) FP.assert(pts[i].y < pts[i - 1].y, `${id} segment ${i} ` + at);
    }
  });
});

FP.test('bossPlan: au-dessus de la tête, rien jusqu\'à la surface', () => {
  eachPlan(({ s, placed, at }) => {
    const head = placed.pieces.find(p => p.role === 'head'), walls = placed.pieces.filter(p => p.role === 'wall');
    const xs = head.poly.map(v => v[0]), x0 = Math.min(...xs), x1 = Math.max(...xs), top = Math.min(...head.poly.map(v => v[1]));
    for (let y = s.world.surfaceY; y <= top; y += 2) for (let x = x0; x <= x1; x += 2) {
      for (const w of walls) FP.assert(!FP.geom.pointInPoly(x, y, w.poly), `${w.id} au-dessus de la tête (${x | 0},${y | 0}) ` + at);
    }
  });
});

FP.test('bossPlan: salles et tourelles hors des canaux', () => {
  eachPlan(({ placed, at }) => {
    FP.assert(placed.rooms.length >= 1, 'au moins une salle ' + at);
    for (const room of placed.rooms) {
      FP.assert(room.rect[2] - room.rect[0] >= 2 * placed.channelMin, `largeur de ${room.id} ` + at);
      for (const tid of room.turrets) {
        const t = placed.pieces.find(p => p.id === tid);
        FP.assert(t && t.role === 'turret', `tourelle ${tid} ` + at);
        for (const [x, y] of t.poly) FP.assert(inRect(room.rect, x, y), `${tid} hors de ${room.id} ` + at);
      }
    }
    for (const t of placed.pieces.filter(p => p.role === 'turret')) {
      FP.assert(placed.rooms.some(r => r.turrets.includes(t.id)), `${t.id} sans salle ` + at);
    }
    for (const [id, pts] of Object.entries(placed.paths)) {
      const piece = placed.pieces.find(p => (id === 'head' ? p.role === 'head' : p.id === id)), others = withoutPiece(placed, piece.id);
      for (const q of pathSamples(pts)) {
        if (q.left < PLAN_END) continue;
        for (const room of placed.rooms) {
          if (!inRect(room.rect, q.x, q.y)) continue;
          const c = FP.bossPlan.clearance(others, q.x, q.y);
          FP.assert(c >= placed.channelMin, `${id} serré dans ${room.id} en (${q.x | 0},${q.y | 0}) : ${c.toFixed(1)} ` + at);
        }
      }
    }
  });
});

FP.test('bossPlan: trajets loin des tourelles et des autres cibles, nappes hors des trajets et des murs', () => {
  eachPlan(({ placed, at }) => {
    const half = placed.channelMin / 2;
    for (const [id, pts] of Object.entries(placed.paths)) {
      const avoid = placed.pieces.filter(p => p.role === 'turret' || (p.role === 'target' && p.id !== id));
      for (const q of pathSamples(pts)) {
        for (const p of avoid) FP.assert(FP.geom.sdPoly(q.x, q.y, p.poly) >= half, `${id} frôle ${p.id} en (${q.x | 0},${q.y | 0}) ` + at);
        for (const t of placed.toxics) FP.assert(Math.hypot(q.x - t.x, q.y - t.y) >= placed.channelMin, `${id} traverse une nappe ` + at);
      }
    }
    for (const t of placed.toxics) FP.assert(FP.bossPlan.clearance(placed, t.x, t.y) > 0, `nappe dans un mur (${t.x | 0},${t.y | 0}) ` + at);
  });
});

FP.test('bossPlan: pas de tourelle à la Bétonneuse, au moins une ailleurs', () => {
  for (const milieu of PLAN_MILIEUX) {
    const n = window.FLOWER_POWER_BOSS_PLANS[milieu].pieces.filter(p => p.role === 'turret').length;
    if (milieu === 'friche') FP.assertEqual(n, 0, milieu);
    else FP.assert(n >= 1, 'tourelle ' + milieu);
  }
});

// --- Plafond fermé (revue finale v5.1.0) : la surface ne s'atteint qu'à travers la tête, quelles que soient les plaques tombées.
// Grille de FLOOD_CELL px de monde, de la surface au fond : la pointe est un point (world/collision.js : contact dès sdPoly ≤ 0), une
// case est pleine si son centre touche une pièce solide (paroi, cible, tête, plaque) ; voisinage à 8, le plus permissif (un passage
// en biais compte). Aides reprises par bossfight.test.js (entrées des salles).
const FLOOD_CELL = 2;
const floodGrid = (s, placed) => {
  const w = s.world, y0 = w.surfaceY - FLOOD_CELL, nx = Math.ceil(w.width / FLOOD_CELL), ny = Math.ceil((w.height - y0) / FLOOD_CELL);
  const cx = (i) => (i + .5) * FLOOD_CELL, cy = (j) => y0 + (j + .5) * FLOOD_CELL;
  const cell = (x, y) => Math.max(0, Math.min(ny - 1, Math.floor((y - y0) / FLOOD_CELL))) * nx + Math.max(0, Math.min(nx - 1, Math.floor(x / FLOOD_CELL)));
  const masks = {};
  for (const p of placed.pieces) {
    if (p.role === 'turret') continue;
    const xs = p.poly.map(v => v[0]), ys = p.poly.map(v => v[1]), cells = [];
    const i0 = Math.max(0, Math.floor(Math.min(...xs) / FLOOD_CELL) - 1), i1 = Math.min(nx - 1, Math.ceil(Math.max(...xs) / FLOOD_CELL) + 1);
    const j0 = Math.max(0, Math.floor((Math.min(...ys) - y0) / FLOOD_CELL) - 1), j1 = Math.min(ny - 1, Math.ceil((Math.max(...ys) - y0) / FLOOD_CELL) + 1);
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) if (FP.geom.sdPoly(cx(i), cy(j), p.poly) <= 0) cells.push(j * nx + i);
    masks[p.id] = cells;
  }
  return { nx, ny, cx, cy, masks, seed: cell(w.width / 2, w.height - FP.config.plant.seedOffset) };
};
// Cases pleines : chaque pièce que `gone(pièce)` ne dit pas tombée, plus les cases `extra` (une salle exclue, par exemple).
const floodFull = (g, placed, gone, extra) => {
  const full = new Uint8Array(g.nx * g.ny);
  for (const p of placed.pieces) if (g.masks[p.id] && !gone(p)) for (const k of g.masks[p.id]) full[k] = 1;
  if (extra) for (const k of extra) full[k] = 1;
  return full;
};
const flood = (g, full, starts) => {
  const seen = new Uint8Array(full.length), queue = [];
  for (const k of starts) if (!full[k] && !seen[k]) { seen[k] = 1; queue.push(k); }
  for (let q = 0; q < queue.length; q++) {
    const k = queue[q], i = k % g.nx, j = (k - i) / g.nx;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      const a = i + di, b = j + dj, m = b * g.nx + a;
      if (a >= 0 && b >= 0 && a < g.nx && b < g.ny && !full[m] && !seen[m]) { seen[m] = 1; queue.push(m); }
    }
  }
  return seen;
};
const roomCells = (g, rect) => {
  const out = [];
  for (let j = 0; j < g.ny; j++) for (let i = 0; i < g.nx; i++) if (inRect(rect, g.cx(i), g.cy(j))) out.push(j * g.nx + i);
  return out;
};
// Pièce tombée ? cible détruite (destroyed, dans l'ordre du plan), plaque d'une cible détruite, tête transpercée (headOff).
const goneWith = (placed, destroyed, headOff) => {
  const targets = placed.pieces.filter(p => p.role === 'target');
  return (p) => (p.role === 'head' ? headOff : p.role === 'target' ? destroyed[targets.indexOf(p)]
    : p.role === 'plate' ? destroyed[targets.findIndex(t => t.plate === p.id)] : false);
};

FP.test('bossPlan: la surface ne s’atteint qu’à travers la tête, quelles que soient les plaques tombées', () => {
  eachPlan(({ s, placed, at }) => {
    const g = floodGrid(s, placed), starts = [g.seed];
    for (const r of placed.rooms) for (const k of roomCells(g, r.rect)) starts.push(k);   // une à une : une salle étirée a trop de cases pour un étalement
    const surface = (seen) => seen.subarray(0, g.nx).some(Boolean);   // première rangée : au-dessus de la surface
    for (let m = 0; m < 8; m++) {
      const destroyed = [0, 1, 2].map(k => !!(m & (1 << k)));
      const seen = flood(g, floodFull(g, placed, goneWith(placed, destroyed, false)), starts);
      FP.assert(!surface(seen), `surface atteinte sans la tête, cibles détruites ${JSON.stringify(destroyed)} ` + at);
    }
    const open = flood(g, floodFull(g, placed, goneWith(placed, [true, true, true], true)), [g.seed]);
    FP.assert(surface(open), 'la tête transpercée ouvre la surface ' + at);
  });
});
