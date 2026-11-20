// world/level.js — génération d'un niveau à partir de la graine du run.
// Lit     : state.rng, state.difficulty (niveau équivalent : réglages par niveau), state.level (réveil du T-Rex), state.run.{milieu,boss}, FP.config.shop.lobbyingK (option lobbying), state.world.{width,viewH,surfaceY,baseHeight,growK}, FP.state.levelHeightFor (hauteur du niveau), state.signature,
//           FP.config.{level,spawnTables,signature,milieux,world.growMax,plant.speed}, FP.state.worldHeightFor, FP.catalog, FP.geom, FP.bossLevel.generate (niveau de boss),
//           FP.levelHazards.{placeToxics, placeLeaks} (nappes et limaces, world/level-hazards.js),
//           FP.braid.trace (v5.15.0 : la tresse, world/braid.js), FP.islands.place (v5.17.0 : ses îlots, world/islands.js).
// Écrit   : state.world.{height,baseHeight,growK (v5.3.0 : hauteur du niveau, décidée ici),milieu,level,boss,bossLevel,braid (v5.15.0 : la tresse ; null au boss),turrets,turretShots (v5.17.0 : vidés ici ; posés par world/islands.js),skyVariant,lawnVariant,safePath,safeRadius,hazardRadius,solidExtra,solids,toxics,leaks (crossing : barre le chemin sûr, v4.17.0),bonuses}, state.signature ;
//           puis FP.coins.place écrit state.world.{coins,chains}.
// Expose  : FP.level.startRun(state), FP.level.generate(state), FP.level.tableFor(milieu, band) (pur, testé), FP.level.makeCandidate(state, rng, pos), FP.level.objectFits(world, o, bite?),
//           FP.level.makeToxic(rng, x, y, big),
//           FP.level.distToSafePath(world,x,y,path?), FP.level.pathXAt(world,y,path?), FP.level.depthK(world,y), FP.level.depthBand(world,y) ;
//           aides de placement partagées avec world/level-hazards.js (nappes et limaces) : pickCell, cellPos, countFor, pathSamples, segmentToSafePath.
// Porté de la v3.43.16 (generateSoil, generateSafePath, objectFits…) sans les familles vectorielles ni les portes.
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  const { clamp, lerp } = FP.math;

  // --- Profondeur ----------------------------------------------------------

  function depthK(world, y) {
    return clamp((y - world.surfaceY) / (world.height - world.surfaceY), 0, 1);
  }

  function depthBand(world, y) {
    const k = depthK(world, y), b = FP.config.level.bands;
    return k < b.upper ? 'upper' : (k < b.middle ? 'middle' : 'deep');
  }

  // --- Grille de spawn -----------------------------------------------------

  function makeGrid(width, top, bottom) {
    const g = FP.config.level.grid;
    const cols = g.cols, rows = Math.max(g.minRows, Math.round((bottom - top) / g.rowPx));
    const cellW = (width - g.marginX * 2) / cols, cellH = (bottom - top) / rows;
    const cells = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        cells.push({ c, r, x: g.marginX + (c + .5) * cellW, y: top + (r + .5) * cellH, used: false });
      }
    }
    return { cols, rows, cellW, cellH, cells };
  }

  // Cellule libre tirée parmi celles qui respectent le prédicat. Faute de mieux : n'importe laquelle, non marquée.
  function pickCell(grid, rng, predicate) {
    const choices = grid.cells.filter(c => !c.used && predicate(c));
    if (!choices.length) return grid.cells[Math.floor(rng.next() * grid.cells.length)];
    const cell = choices[Math.floor(rng.next() * choices.length)];
    cell.used = true;
    return cell;
  }

  function cellPos(grid, rng, cell, jitter) {
    const jw = grid.cellW * jitter, jh = grid.cellH * jitter;
    return { x: cell.x + rng.range(-jw, jw), y: cell.y + rng.range(-jh, jh) };
  }

  // --- Chemin sûr ----------------------------------------------------------

  // Chemin plus sinueux et plus étroit avec les niveaux (v4.8.0) : chaque réglage glisse de sa valeur de base vers safePath.hard,
  // jusqu'au niveau hard.level. Écrit aussi world.hazardRadius (marge des nappes et limaces) et world.solidExtra (des déchets).
  function generateSafePath(world, rng, level) {
    const p = FP.config.level.safePath, h = p.hard, W = world.width, k = clamp(level / h.level, 0, 1);
    const lo = p.edge, hi = W - p.edge, mid = W * .5;
    const startY = world.height - p.startPad, endY = world.surfaceY + p.endPad;
    const n = Math.max(p.minNodes, Math.round((startY - endY) / lerp(p.segmentPx, h.segmentPx, k)));
    const swapChance = lerp(p.swapChance, h.swapChance, k), spread = [0, 1].map(i => lerp(p.spread[i], h.spread[i], k));
    const dy = (startY - endY) / n, slope = p.maxSlope * dy;   // aucun segment plus penché que maxSlope : la tige suit
    let x = mid;
    let side = rng.next() < .5 ? -1 : 1;
    const nodes = [{ x, y: startY }];
    for (let i = 1; i < n; i++) {
      const y = lerp(startY, endY, i / n), prev = x;
      // Le premier pas force une vraie sortie du centre, puis le chemin change parfois de côté.
      if (i === 1) x = clamp(mid + side * rng.range(p.firstStep[0], p.firstStep[1]), lo, hi);
      else if (p.swapNodes.includes(i) || rng.next() < swapChance) side *= -1;
      const target = mid + side * rng.range(W * spread[0], W * spread[1]);
      const maxStep = p.baseStep + Math.max(0, p.stepBonusMax - Math.min(p.stepBonusMax, level));
      x = clamp(lerp(x, target, p.pull) + rng.range(-maxStep, maxStep) * p.wobble, lo, hi);
      if (Math.abs(x - mid) < p.centerDeadzone) x = clamp(mid + side * rng.range(p.centerPush[0], p.centerPush[1]), lo, hi);
      x = clamp(x, prev - slope, prev + slope);
      nodes.push({ x, y });
    }
    nodes.push({ x: clamp(clamp(x + rng.range(-p.endJitter, p.endJitter), lo, hi), x - slope, x + slope), y: endY });
    world.safePath = nodes;
    world.safeRadius = Math.max(p.radiusMin, p.radiusBase + level * p.radiusPerLevel);
    world.hazardRadius = Math.max(world.safeRadius, lerp(p.radiusBase, h.hazardRadius, k));
    world.solidExtra = lerp(FP.config.level.fit.safeExtra, h.solidExtra, k);
  }

  // path (v5.15.0) : un autre chemin que le chemin sûr (B, la tresse) ; idem pour segmentToSafePath et pathSamples.
  function distToSafePath(world, x, y, path = world.safePath) {
    if (!path || path.length < 2) return Infinity;
    let m = Infinity;
    for (let i = 1; i < path.length; i++) {
      const a = path[i - 1], b = path[i];
      if (y - Math.max(a.y, b.y) >= m || Math.min(a.y, b.y) - y >= m) continue;   // trop loin en hauteur : ne fera pas mieux (même résultat)
      m = Math.min(m, FP.geom.distPointToSegment(x, y, a.x, a.y, b.x, b.y));
    }
    return m;
  }

  // Distance exacte du segment [a, b] au chemin sûr, 0 s'ils se croisent (v4.8.0 : la marge serrée des limaces l'exige).
  const turn = (ax, ay, bx, by, cx, cy) => (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  function segmentToSafePath(world, ax, ay, bx, by, P = world.safePath) {
    const d = FP.geom.distPointToSegment;
    let m = Infinity;
    for (let i = 1; i < P.length; i++) {
      const p = P[i - 1], q = P[i];
      if (turn(ax, ay, bx, by, p.x, p.y) * turn(ax, ay, bx, by, q.x, q.y) < 0 && turn(p.x, p.y, q.x, q.y, ax, ay) * turn(p.x, p.y, q.x, q.y, bx, by) < 0) return 0;
      m = Math.min(m, d(ax, ay, p.x, p.y, q.x, q.y), d(bx, by, p.x, p.y, q.x, q.y), d(p.x, p.y, ax, ay, bx, by), d(q.x, q.y, ax, ay, bx, by));
    }
    return m;
  }

  // Points du chemin sûr tous les ~6 px, pour vérifier qu'une nappe n'y mord pas.
  function pathSamples(world, P = world.safePath) {
    const pts = [];
    for (let i = 1; i < P.length; i++) {
      const a = P[i - 1], b = P[i], n = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 6);
      for (let k = 0; k <= n; k++) pts.push({ x: a.x + (b.x - a.x) * k / n, y: a.y + (b.y - a.y) * k / n });
    }
    return pts;
  }

  // --- Placement -----------------------------------------------------------

  // Centre + 8 points du rectangle rendu : aucun ne doit mordre sur le chemin sûr.
  // limit, path (v5.15.0) : la marge et le chemin (par défaut, A et sa marge) ; B, la tresse, a la sienne.
  function clearOfSafePath(world, o, extra, limit = world.safeRadius + extra, path = world.safePath) {
    const hw = o.w / 2, hh = o.h / 2;
    const raw = [[0, 0], [-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh], [-hw, 0], [hw, 0], [0, -hh], [0, hh]];
    for (const [lx, ly] of raw) {
      const p = FP.geom.toWorld(o, lx, ly);
      if (distToSafePath(world, p.x, p.y, path) < limit) return false;
    }
    const approx = Math.hypot(o.w, o.h) * .5;
    return distToSafePath(world, o.x, o.y, path) > limit + approx * FP.config.level.fit.safeApproxK;
  }

  // B monte avec une pente d'au plus maxSlope : un point est au moins à |x − x de B à sa hauteur| / √(1 + maxSlope²) de B. Loin en
  // largeur, l'objet est accepté sans le calcul exact (même résultat que clearOfSafePath, bien plus vite) ; sinon, le calcul exact.
  function clearOfBraid(world, o, r = world.braid.radius) {
    const B = world.braid, hd = Math.hypot(o.w, o.h) * .5, far = Math.abs(o.x - pathXAt(world, o.y, B.path)) / Math.hypot(1, FP.config.level.safePath.maxSlope);
    if (far - hd >= r && far > r + hd * FP.config.level.fit.safeApproxK) return true;
    return clearOfSafePath(world, o, 0, r, B.path);
  }

  // bite (v5.17.2, déchets des îlots) : l'objet peut mordre cette part de la largeur garantie de A et de B (sans la marge des déchets).
  function objectFits(world, o, bite = 0) {
    const f = FP.config.level.fit, W = world.width;
    if (o.x < f.centerMarginX || o.x > W - f.centerMarginX) return false;
    if (o.y < world.surfaceY + f.centerTop || o.y > world.height - f.centerBottom) return false;
    const out = o.signature ? f.maxOutside.signature : f.maxOutside.authored;
    for (const p of FP.catalog.visibleFootprint(o)) {
      if (p.x < -out || p.x > W + out) return false;
      if (p.y < world.surfaceY + f.edgeTop || p.y > world.height - f.edgeBottom) return false;
    }
    if (!clearOfSafePath(world, o, bite ? 0 : world.solidExtra, world.safeRadius * (1 - bite) + (bite ? 0 : world.solidExtra))) return false;
    if (world.braid && !clearOfBraid(world, o, world.braid.radius * (1 - bite))) return false;   // v5.15.0 : B, la tresse, à sa largeur
    for (const other of world.solids) {
      if (FP.geom.convexPolysOverlap(o.footprint, other.footprint)) return false;
    }
    return true;
  }

  // Table d'apparition d'une bande, restreinte aux familles du milieu (v4.9.0), poids d'origine. Si la bande n'en a aucune :
  // toutes les familles du milieu, à poids égaux, avec l'angle de leur première entrée dans les tables.
  function tableFor(milieu, band) {
    const kinds = FP.config.milieux[milieu].kinds, T = FP.config.spawnTables;
    const table = T[band].filter(e => kinds.includes(e.kind));
    if (table.length) return table;
    const all = [...T.upper, ...T.middle, ...T.deep];
    return kinds.map(kind => { const e = all.find(x => x.kind === kind); return { ...e, w: 1 }; });
  }

  function makeCandidate(state, rng, pos) {
    const table = tableFor(state.run.milieu, depthBand(state.world, pos.y));
    let r = rng.next() * table.reduce((sum, e) => sum + e.w, 0);
    let entry = table[table.length - 1];
    for (const e of table) { if (r < e.w) { entry = e; break; } r -= e.w; }
    const a = rng.range(-entry.a, entry.a);
    const flip = entry.noFlip ? 1 : (rng.next() < FP.config.level.mirrorChance ? -1 : 1);
    const scale = rng.range(...FP.config.level.solids.sizeJitter);
    return FP.catalog.makeSolid({ kind: entry.kind, x: pos.x, y: pos.y, a, flip, scale });
  }

  // Le grand PNG signature réserve sa place AVANT le mobilier courant.
  function placeSignature(state, grid) {
    const sig = state.signature, cfg = FP.config.signature, world = state.world, rng = state.rng;
    if (!sig.armed || sig.spawned || state.level < sig.targetLevel || !FP.catalog.has('trex_signature')) return;
    if (FP.config.milieux[state.run.milieu].id !== 'nucleaire') return;   // v4.9.0 : le T-Rex vit au site nucléaire
    for (let tries = 0; tries < cfg.tries && !sig.spawned; tries++) {
      const cell = pickCell(grid, rng, c => c.r > 1 && c.r < grid.rows - 2 && depthK(world, c.y) > cfg.minDepth);
      const pos = cellPos(grid, rng, cell, cfg.jitter);
      const nominal = FP.catalog.assets.trex_signature.render.worldWidth, scale = Math.min(1, world.width * cfg.maxWidthK / nominal);
      const o = FP.catalog.makeSolid({ kind: 'trex_signature', x: pos.x, y: pos.y, a: rng.range(-cfg.angle, cfg.angle), flip: 1, scale });
      if (objectFits(world, o)) { world.solids.push(o); sig.spawned = true; }
      else cell.used = false;
    }
  }

  function placeSolids(state, grid, k = 1) {
    const world = state.world, rng = state.rng, s = FP.config.level.solids;
    const worldScale = worldScaleOf(world);
    const count = Math.round((s.base + Math.min(s.maxExtra, Math.floor(state.difficulty * s.perLevel))) * worldScale * s.scale * s.framing * k);
    const bands = ['upper', 'middle', 'deep'];
    let misses = 0;
    const more = world.braid ? FP.config.braid.triesK : 1;   // v5.15.0 : avec la tresse, plus d'échecs tolérés avant d'abandonner (densité gardée malgré B)
    for (let i = 0; i < count && misses < s.giveUpAfter * more; i++) {
      const preferred = bands[i % 3];
      let placed = false;
      for (let tries = 0; tries < s.tries && !placed; tries++) {
        const cell = pickCell(grid, rng, c => c.r > 0 && c.r < grid.rows - 1 &&
          !(c.c === 2 && c.r > grid.rows - 3) &&                      // dégage le départ de la graine
          !c.onBraid &&                                               // v5.15.0 : pas de case sur B (la tresse)
          (tries > s.relaxAfter || depthBand(world, c.y) === preferred));
        const o = makeCandidate(state, rng, cellPos(grid, rng, cell, s.jitter));
        if (o && objectFits(world, o)) { world.solids.push(o); placed = true; }
        else cell.used = false;
      }
      // Pas de place : on accepte un décor moins dense plutôt que de superposer deux assets ;
      // après plusieurs échecs de suite, le niveau est plein et on arrête de chercher.
      misses = placed ? 0 : misses + 1;
    }
  }

  // --- Zones toxiques et limaces -------------------------------------------

  function pathXAt(world, y, path = world.safePath) {   // path (v5.15.0) : un autre chemin (B, la tresse)
    if (!path || path.length < 2) return world.width / 2;
    for (let i = 1; i < path.length; i++) {
      const a = path[i - 1], b = path[i];
      if ((y <= a.y && y >= b.y) || (y >= a.y && y <= b.y)) return lerp(a.x, b.x, clamp((y - a.y) / (b.y - a.y || 1), 0, 1));
    }
    return path[path.length - 1].x;
  }

  // Échelle d'un niveau : celle de la hauteur de départ (plafonnée), × growK (v5.3.0) — même densité par écran sur un niveau plus haut.
  function worldScaleOf(world) {
    const s = FP.config.level.solids, base = world.baseHeight || world.height;
    return clamp((base - world.surfaceY) / (world.viewH - world.surfaceY), 1, s.worldScaleMax) * (world.growK || 1);
  }

  function countFor(c, state) {
    return Math.round((c.base + Math.min(c.maxExtra, Math.floor(state.difficulty * c.perLevel))) * worldScaleOf(state.world) * c.scale);
  }

  // Une nappe : ellipse, lobes et taches tirés dans rng (placeToxics et niveau de boss).
  function makeToxic(rng, x, y, big) {
    const c = FP.config.level.toxics;
    const o = {
      x, y,
      rx: rng.range(c.rx[0], c.rx[1]) * (big ? c.bigRx : 1), ry: rng.range(c.ry[0], c.ry[1]) * (big ? c.bigRy : 1),
      a: rng.range(0, Math.PI), pulse: rng.range(0, 10), lobes: [], specks: []
    };
    for (let q = 0; q < c.lobes; q++) o.lobes.push({ a: rng.range(0, FP.TAU), r: rng.range(...c.shape.lobeR), sx: rng.range(...c.shape.lobeSx), sy: rng.range(...c.shape.lobeSy) });
    for (let q = 0; q < c.specks; q++) o.specks.push({ x: rng.range(-c.shape.speckX, c.shape.speckX), y: rng.range(-c.shape.speckY, c.shape.speckY), r: rng.range(...c.shape.speckR), light: rng.next() < c.lightChance });
    return o;
  }

  // --- Points d'entrée -----------------------------------------------------

  // opts.lobbying (boutique) : moins d'obstacles (× FP.config.shop.lobbyingK).
  function generate(state, opts = {}) {
    const world = state.world, rng = state.rng, g = FP.config.level.grid;
    const size = FP.state.levelHeightFor(state);   // décidée à chaque niveau, figée ensuite (avant le niveau de boss aussi)
    world.height = size.height; world.baseHeight = size.base; world.growK = size.k;
    world.solids = []; world.toxics = []; world.leaks = []; world.bonuses = [];
    world.milieu = FP.config.milieux[state.run.milieu].id;   // v4.9.0 ; le rendu ramène les nuances tirées à celles du milieu
    world.level = state.level;   // v4.13.1 : graine du décor, figée jusqu'au niveau suivant (l'éclosion avance state.level avant le fondu)
    world.boss = !!state.run.boss;   // v4.10.0 : la musique suit le niveau réellement généré (milieu, boss)
    world.skyVariant = Math.floor(rng.next() * FP.config.level.skyVariants);
    world.lawnVariant = Math.floor(rng.next() * FP.config.level.lawnVariants);
    world.bossLevel = null; world.braid = null;   // v5.15.0 : la tresse
    world.turrets = []; world.turretShots = [];   // v5.17.0 : tourelles des îlots (world/islands.js) et leurs tirs (play/island-turrets.js)
    if (state.run.boss) { FP.bossLevel.generate(state); return; }   // v4.12.0 : le niveau de boss a sa propre génération (world/boss.js)
    const grid = makeGrid(world.width, world.surfaceY + g.topPad, world.height - g.bottomPad);
    generateSafePath(world, rng, state.difficulty);
    // v5.15.0 : la tresse (v5.17.0 : dans tous les niveaux tirés au hasard) ; les cases dont le centre est sur B ne sont pas tirées pour
    // les déchets (essais perdus). Son tirage propre pose ensuite les îlots (après le T-Rex signature, avant les autres déchets).
    const brng = FP.createRng((state.seed ^ FP.config.braid.salt ^ Math.imul(state.level, 2654435761)) >>> 0);
    world.braid = FP.braid.trace(world, brng, world.safePath, world.safeRadius);
    for (const c of grid.cells) c.onBraid = distToSafePath(world, c.x, c.y, world.braid.path) < world.braid.radius + Math.min(grid.cellW, grid.cellH) * .5;
    placeSignature(state, grid);
    FP.islands.place(state, brng, opts.lobbying ? FP.config.shop.lobbyingK : 1);   // lobbying : moins de déchets dans les îlots aussi
    placeSolids(state, grid, opts.lobbying ? FP.config.shop.lobbyingK : 1);
    FP.levelHazards.placeToxics(state, grid);
    FP.levelHazards.placeLeaks(state, grid);
    FP.coins.place(state);   // chapelets de pièces, tirage propre (world/coins.js)
  }

  // Début de run : tirage du T-Rex signature, puis premier niveau.
  function startRun(state) {
    const cfg = FP.config.signature, rng = state.rng;
    state.signature.armed = rng.next() < cfg.chance;
    state.signature.spawned = false;
    state.signature.targetLevel = cfg.minLevel + Math.floor(rng.next() * (cfg.maxLevel - cfg.minLevel + 1));
    generate(state);
  }

  FP.level = { startRun, generate, tableFor, makeToxic, distToSafePath, pathXAt, depthK, depthBand,
    pickCell, cellPos, countFor, pathSamples, segmentToSafePath,   // les cinq dernières : pour world/level-hazards.js
    makeCandidate, objectFits };   // v5.17.0 : pour world/islands.js
})();
