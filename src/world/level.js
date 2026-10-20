// world/level.js — génération d'un niveau à partir de la graine du run.
// Lit     : state.rng, state.level, state.world.{width,height,viewH,surfaceY}, state.signature,
//           FP.config.{level,spawnTables,signature}, FP.catalog, FP.geom.
// Écrit   : state.world.{skyVariant,lawnVariant,safePath,safeRadius,solids}, state.signature.
// Expose  : FP.level.startRun(state), FP.level.generate(state),
//           FP.level.distToSafePath(world,x,y), FP.level.depthK(world,y), FP.level.depthBand(world,y).
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
    world.safeRadius = p.radiusBase + Math.min(p.radiusMax, level * p.radiusPerLevel);
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
    for (const p of FP.catalog.visibleFootprint(o)) {
      if (p.x < f.edgeX || p.x > W - f.edgeX) return false;
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
    const flip = entry.noFlip ? 1 : (rng.next() < .5 ? -1 : 1);
    return FP.catalog.makeSolid({ kind: entry.kind, x: pos.x, y: pos.y, a, flip });
  }

  // Le grand PNG signature réserve sa place AVANT le mobilier courant.
  function placeSignature(state, grid) {
    const sig = state.signature, cfg = FP.config.signature, world = state.world, rng = state.rng;
    if (!sig.armed || sig.spawned || state.level < sig.targetLevel || !FP.catalog.has('trex_signature')) return;
    for (let tries = 0; tries < cfg.tries && !sig.spawned; tries++) {
      const cell = pickCell(grid, rng, c => c.r > 1 && c.r < grid.rows - 2 && depthK(world, c.y) > cfg.minDepth);
      const pos = cellPos(grid, rng, cell, cfg.jitter);
      const o = FP.catalog.makeSolid({ kind: 'trex_signature', x: pos.x, y: pos.y, a: rng.range(-cfg.angle, cfg.angle), flip: 1 });
      if (objectFits(world, o)) { world.solids.push(o); sig.spawned = true; }
      else cell.used = false;
    }
  }

  function placeSolids(state, grid) {
    const world = state.world, rng = state.rng, s = FP.config.level.solids;
    const worldScale = clamp((world.height - world.surfaceY) / (world.viewH - world.surfaceY), 1, s.worldScaleMax);
    const count = Math.round((s.base + Math.min(s.maxExtra, Math.floor(state.level * s.perLevel))) * worldScale * s.scale * s.framing);
    const bands = ['upper', 'middle', 'deep'];
    for (let i = 0; i < count; i++) {
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
      // Pas de place : on accepte un décor moins dense plutôt que de superposer deux assets.
    }
  }

  // --- Points d'entrée -----------------------------------------------------

  function generate(state) {
    const world = state.world, rng = state.rng, g = FP.config.level.grid;
    world.solids = [];
    world.skyVariant = Math.floor(rng.next() * 4);
    world.lawnVariant = Math.floor(rng.next() * 4);
    const grid = makeGrid(world.width, world.surfaceY + g.topPad, world.height - g.bottomPad);
    generateSafePath(world, rng, state.level);
    placeSignature(state, grid);
    placeSolids(state, grid);
  }

  // Début de run : tirage du T-Rex signature, puis premier niveau.
  function startRun(state) {
    const cfg = FP.config.signature, rng = state.rng;
    state.signature.armed = rng.next() < cfg.chance;
    state.signature.spawned = false;
    state.signature.targetLevel = cfg.minLevel + Math.floor(rng.next() * (cfg.maxLevel - cfg.minLevel + 1));
    generate(state);
  }

  FP.level = { startRun, generate, distToSafePath, depthK, depthBand };
})();
