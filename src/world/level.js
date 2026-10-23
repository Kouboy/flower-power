// world/level.js — génération d'un niveau à partir de la graine du run.
// Lit     : state.rng, state.level, FP.config.shop.lobbyingK (option lobbying), state.world.{width,height,viewH,surfaceY}, state.signature,
//           FP.config.{level,spawnTables,signature}, FP.catalog, FP.geom.
// Écrit   : state.world.{skyVariant,lawnVariant,safePath,safeRadius,solids,toxics,leaks,bonuses}, state.signature ;
//           puis FP.coins.place écrit state.world.{coins,chains}.
// Expose  : FP.level.startRun(state), FP.level.generate(state),
//           FP.level.distToSafePath(world,x,y), FP.level.pathXAt(world,y), FP.level.depthK(world,y), FP.level.depthBand(world,y).
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

  function generateSafePath(world, rng, level) {
    const p = FP.config.level.safePath, W = world.width;
    const lo = p.edge, hi = W - p.edge, mid = W * .5;
    const startY = world.height - p.startPad, endY = world.surfaceY + p.endPad;
    const n = Math.max(p.minNodes, Math.round((startY - endY) / p.segmentPx));
    let x = mid;
    let side = rng.next() < .5 ? -1 : 1;
    const nodes = [{ x, y: startY }];
    for (let i = 1; i < n; i++) {
      const y = lerp(startY, endY, i / n);
      // Le premier pas force une vraie sortie du centre, puis le chemin change parfois de côté.
      if (i === 1) x = clamp(mid + side * rng.range(p.firstStep[0], p.firstStep[1]), lo, hi);
      else if (p.swapNodes.includes(i) || rng.next() < p.swapChance) side *= -1;
      const target = mid + side * rng.range(W * p.spread[0], W * p.spread[1]);
      const maxStep = p.baseStep + Math.max(0, p.stepBonusMax - Math.min(p.stepBonusMax, level));
      x = clamp(lerp(x, target, p.pull) + rng.range(-maxStep, maxStep) * p.wobble, lo, hi);
      if (Math.abs(x - mid) < p.centerDeadzone) x = clamp(mid + side * rng.range(p.centerPush[0], p.centerPush[1]), lo, hi);
      nodes.push({ x, y });
    }
    nodes.push({ x: clamp(x + rng.range(-p.endJitter, p.endJitter), lo, hi), y: endY });
    world.safePath = nodes;
    world.safeRadius = Math.max(p.radiusMin, p.radiusBase + level * p.radiusPerLevel);
  }

  function distToSafePath(world, x, y) {
    const path = world.safePath;
    if (!path || path.length < 2) return Infinity;
    let m = Infinity;
    for (let i = 1; i < path.length; i++) {
      const a = path[i - 1], b = path[i];
      m = Math.min(m, FP.geom.distPointToSegment(x, y, a.x, a.y, b.x, b.y));
    }
    return m;
  }

  // --- Placement -----------------------------------------------------------

  // Centre + 8 points du rectangle rendu : aucun ne doit mordre sur le chemin sûr.
  function clearOfSafePath(world, o, extra) {
    const hw = o.w / 2, hh = o.h / 2, limit = world.safeRadius + extra;
    const raw = [[0, 0], [-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh], [-hw, 0], [hw, 0], [0, -hh], [0, hh]];
    for (const [lx, ly] of raw) {
      const p = FP.geom.toWorld(o, lx, ly);
      if (distToSafePath(world, p.x, p.y) < limit) return false;
    }
    const approx = Math.hypot(o.w, o.h) * .5;
    return distToSafePath(world, o.x, o.y) > limit + approx * FP.config.level.fit.safeApproxK;
  }

  function objectFits(world, o) {
    const f = FP.config.level.fit, W = world.width;
    if (o.x < f.centerMarginX || o.x > W - f.centerMarginX) return false;
    if (o.y < world.surfaceY + f.centerTop || o.y > world.height - f.centerBottom) return false;
    const out = o.signature ? f.maxOutside.signature : f.maxOutside.authored;
    for (const p of FP.catalog.visibleFootprint(o)) {
      if (p.x < -out || p.x > W + out) return false;
      if (p.y < world.surfaceY + f.edgeTop || p.y > world.height - f.edgeBottom) return false;
    }
    if (!clearOfSafePath(world, o, f.safeExtra)) return false;
    for (const other of world.solids) {
      if (FP.geom.convexPolysOverlap(o.footprint, other.footprint)) return false;
    }
    return true;
  }

  function makeCandidate(world, rng, pos) {
    const table = FP.config.spawnTables[depthBand(world, pos.y)];
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
    const count = Math.round((s.base + Math.min(s.maxExtra, Math.floor(state.level * s.perLevel))) * worldScale * s.scale * s.framing * k);
    const bands = ['upper', 'middle', 'deep'];
    let misses = 0;
    for (let i = 0; i < count && misses < s.giveUpAfter; i++) {
      const preferred = bands[i % 3];
      let placed = false;
      for (let tries = 0; tries < s.tries && !placed; tries++) {
        const cell = pickCell(grid, rng, c => c.r > 0 && c.r < grid.rows - 1 &&
          !(c.c === 2 && c.r > grid.rows - 3) &&                      // dégage le départ de la graine
          (tries > s.relaxAfter || depthBand(world, c.y) === preferred));
        const o = makeCandidate(world, rng, cellPos(grid, rng, cell, s.jitter));
        if (o && objectFits(world, o)) { world.solids.push(o); placed = true; }
        else cell.used = false;
      }
      // Pas de place : on accepte un décor moins dense plutôt que de superposer deux assets ;
      // après plusieurs échecs de suite, le niveau est plein et on arrête de chercher.
      misses = placed ? 0 : misses + 1;
    }
  }

  // --- Zones toxiques et limaces -------------------------------------------

  function pathXAt(world, y) {
    const path = world.safePath;
    if (!path || path.length < 2) return world.width / 2;
    for (let i = 1; i < path.length; i++) {
      const a = path[i - 1], b = path[i];
      if ((y <= a.y && y >= b.y) || (y >= a.y && y <= b.y)) return lerp(a.x, b.x, clamp((y - a.y) / (b.y - a.y || 1), 0, 1));
    }
    return path[path.length - 1].x;
  }

  function worldScaleOf(world) {
    const s = FP.config.level.solids;
    return clamp((world.height - world.surfaceY) / (world.viewH - world.surfaceY), 1, s.worldScaleMax);
  }

  function countFor(c, state) {
    return Math.round((c.base + Math.min(c.maxExtra, Math.floor(state.level * c.perLevel))) * worldScaleOf(state.world) * c.scale);
  }

  // Marge du chemin sûr pour les nappes et les limaces : celle d'origine (radiusBase), même quand le chemin se resserre pour les
  // déchets avec les niveaux — leurs règles de placement (ellipse, va-et-vient) ne tiennent qu'avec cette marge.
  const hazardRadius = (world) => Math.max(world.safeRadius, FP.config.level.safePath.radiusBase);

  function placeToxics(state, grid) {
    const world = state.world, rng = state.rng, c = FP.config.level.toxics;
    const count = countFor(c, state);
    for (let i = 0; i < count; i++) {
      // v4.2.3 : à tour de rôle dans les trois tiers de la hauteur (v3 : réservées aux profondeurs, la surface restait propre).
      const third = i % 3;
      let placed = false;
      for (let tries = 0; tries < c.tries && !placed; tries++) {
        const cell = pickCell(grid, rng, cl => cl.r > 0 && cl.r < grid.rows - 1 &&
          (tries > c.relaxAfter || Math.min(2, Math.floor(depthK(world, cl.y) * 3)) === third));
        const pos = cellPos(grid, rng, cell, c.jitter), big = depthK(world, pos.y) > c.bigDepth;
        const o = {
          x: pos.x, y: pos.y,
          rx: rng.range(c.rx[0], c.rx[1]) * (big ? c.bigRx : 1), ry: rng.range(c.ry[0], c.ry[1]) * (big ? c.bigRy : 1),
          a: rng.range(0, Math.PI), pulse: rng.range(0, 10), lobes: [], specks: []
        };
        for (let q = 0; q < c.lobes; q++) o.lobes.push({ a: rng.range(0, FP.TAU), r: rng.range(...c.shape.lobeR), sx: rng.range(...c.shape.lobeSx), sy: rng.range(...c.shape.lobeSy) });
        for (let q = 0; q < c.specks; q++) o.specks.push({ x: rng.range(-c.shape.speckX, c.shape.speckX), y: rng.range(-c.shape.speckY, c.shape.speckY), r: rng.range(...c.shape.speckR), light: rng.next() < c.lightChance });
        // Une nappe peut déborder du cadre, mais on doit en voir assez pour l'anticiper.
        const visible = (Math.min(world.width, o.x + o.rx) - Math.max(0, o.x - o.rx)) / (2 * o.rx);
        if (visible >= c.minVisible && distToSafePath(world, o.x, o.y) > hazardRadius(world) + Math.max(o.rx, o.ry) * c.safeK + c.safeExtra) { world.toxics.push(o); placed = true; }
        else cell.used = false;
      }
    }
  }

  function leakPoints(l) {
    const ca = Math.cos(l.angle), sa = Math.sin(l.angle), pts = [];
    for (let i = 0; i <= 8; i++) { const k = -.5 + i / 8; pts.push({ x: l.x + ca * l.len * k, y: l.y + sa * l.len * k }); }
    return pts;
  }

  // Rectangle rendu tourné (v3 : pointInRotRect) et ellipse (pointInEllipse), élargis de pad.
  function nearSolid(world, x, y, pad) {
    return world.solids.some(o => {
      const ca = Math.cos(-o.a), sa = Math.sin(-o.a), dx = x - o.x, dy = y - o.y;
      return Math.abs(dx * ca - dy * sa) < o.w / 2 + pad && Math.abs(dx * sa + dy * ca) < o.h / 2 + pad;
    });
  }
  function nearToxic(world, x, y, pad) {
    return world.toxics.some(o => {
      const ca = Math.cos(-o.a), sa = Math.sin(-o.a), dx = x - o.x, dy = y - o.y;
      const lx = dx * ca - dy * sa, ly = dx * sa + dy * ca, rx = o.rx + pad, ry = o.ry + pad;
      return (lx * lx) / (rx * rx) + (ly * ly) / (ry * ry) < 1;
    });
  }
  // Toutes les limaces comptent (en v3, celles hors écran étaient ignorées par accident).
  function nearLeak(world, x, y, pad) {
    return world.leaks.some(l => {
      const ca = Math.cos(l.angle), sa = Math.sin(l.angle);
      return FP.geom.distPointToSegment(x, y, l.x - ca * l.len * .5, l.y - sa * l.len * .5, l.x + ca * l.len * .5, l.y + sa * l.len * .5) < l.r + pad;
    });
  }

  function placeLeaks(state, grid) {
    const world = state.world, rng = state.rng, c = FP.config.level.leaks, W = world.width;
    const count = countFor(c, state);
    for (let i = 0; i < count; i++) {
      let placed = false;
      for (let tries = 0; tries < c.tries && !placed; tries++) {
        let pos;
        if (rng.next() < c.nearRouteChance) {
          const y = rng.range(world.surfaceY + c.routeTop, world.height - c.routeBottom);
          const side = rng.next() < .5 ? -1 : 1;
          pos = { x: clamp(pathXAt(world, y) + side * rng.range(c.routeOffset[0], c.routeOffset[1]), c.routeMarginX, W - c.routeMarginX), y };
        } else {
          const cell = pickCell(grid, rng, cl => cl.r > 0 && cl.r < grid.rows - 1 && (tries > c.relaxAfter || depthK(world, cl.y) > c.minDepth));
          pos = cellPos(grid, rng, cell, c.jitter);
        }
        const k = depthK(world, pos.y);
        // Angles très variés : les axes purs deviennent rares.
        const angle = rng.next() < c.angledChance
          ? Math.PI * c.shape.angles[Math.floor(rng.next() * c.shape.angles.length)] + rng.range(-c.angleJitter, c.angleJitter)
          : (rng.next() < .5 ? 0 : Math.PI * .5);
        const len = rng.range(c.len[0], c.len[1]) + Math.min(c.lenLevelMax, state.level * c.lenPerLevel) * rng.next() + k * c.lenDepth;
        const leak = {
          x: pos.x, y: pos.y, len, angle, phase: rng.range(0, 6.28), rate: rng.range(c.rate[0], c.rate[1]), r: rng.range(c.r[0], c.r[1]),
          hitFlash: 0, morph: c.shape.morphs[Math.floor(rng.next() * c.shape.morphs.length)], debrisSeed: Math.floor(rng.next() * 99),
          s: 0, cx: 0, cy: 0, cr: 0
        };
        // Position de départ = celle de la première frame (pas de saut visible).
        const k0 = (Math.sin(leak.phase) + 1) * .5 - .5;
        leak.cx = pos.x + Math.cos(angle) * len * k0; leak.cy = pos.y + Math.sin(angle) * len * k0; leak.cr = leak.r;
        const pts = leakPoints(leak);
        // Le trajet peut sortir par un bord, tant que son centre est dans le cadre et qu'on en voit au moins la moitié.
        const visible = pts.filter(p => p.x >= 0 && p.x <= W).length / pts.length;
        const inBounds = pos.x >= c.marginX && pos.x <= W - c.marginX && visible >= c.minVisible &&
          pts.every(p => p.y > world.surfaceY + c.top && p.y < world.height - c.bottom);
        const notBuried = !nearSolid(world, pos.x, pos.y, c.solidPad) && !nearToxic(world, pos.x, pos.y, c.toxicPad);
        const breathing = !nearLeak(world, pos.x, pos.y, c.spacingCenter) && pts.every(p => !nearLeak(world, p.x, p.y, c.spacingPath));
        // Une limace peut mettre la pression près du chemin, jamais le condamner.
        const pathOpen = pts.every(p => distToSafePath(world, p.x, p.y) >= hazardRadius(world) * c.safeK + leak.r);
        if (inBounds && notBuried && breathing && pathOpen) { world.leaks.push(leak); placed = true; }
      }
    }
  }


  // --- Points d'entrée -----------------------------------------------------

  // opts.lobbying (boutique) : moins d'obstacles (× FP.config.shop.lobbyingK).
  function generate(state, opts = {}) {
    const world = state.world, rng = state.rng, g = FP.config.level.grid;
    world.solids = []; world.toxics = []; world.leaks = []; world.bonuses = [];
    world.skyVariant = Math.floor(rng.next() * FP.config.level.skyVariants);
    world.lawnVariant = Math.floor(rng.next() * FP.config.level.lawnVariants);
    const grid = makeGrid(world.width, world.surfaceY + g.topPad, world.height - g.bottomPad);
    generateSafePath(world, rng, state.level);
    placeSignature(state, grid);
    placeSolids(state, grid, opts.lobbying ? FP.config.shop.lobbyingK : 1);
    placeToxics(state, grid);
    placeLeaks(state, grid);
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

  FP.level = { startRun, generate, distToSafePath, pathXAt, depthK, depthBand };
})();
