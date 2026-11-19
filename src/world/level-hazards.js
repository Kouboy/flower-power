// world/level-hazards.js — nappes et limaces d'un niveau tiré au hasard (sorti de world/level.js en v5.14.0, sans changement).
// Lit     : state.{rng, difficulty}, state.world.{width,height,surfaceY,hazardRadius,safePath,braid (v5.15.0 : la tresse),solids,toxics,leaks}, FP.config.{level.toxics,
//           level.leaks, difficulty.levelAtMax}, FP.camera.safeX (limaces), FP.geom.distPointToSegment, FP.config.lab.braid.toxicBite, FP.level.{pickCell, cellPos, countFor,
//           pathSamples, segmentToSafePath, distToSafePath, pathXAt, depthK, makeToxic}.
// Écrit   : state.world.{toxics, leaks (crossing : barre le chemin sûr, v4.17.0)}.
// Expose  : FP.levelHazards.placeToxics(state, grid), FP.levelHazards.placeLeaks(state, grid).
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  const { clamp } = FP.math;
  const { pickCell, cellPos, countFor, pathSamples, segmentToSafePath, distToSafePath, pathXAt, depthK, makeToxic } = FP.level;   // chargé avant

  // L'ellipse de la nappe, élargie de margin, ne contient aucun point du chemin sûr.
  function toxicClear(o, pts, margin) {
    const ca = Math.cos(-o.a), sa = Math.sin(-o.a), rx = o.rx + margin, ry = o.ry + margin, reach = Math.max(rx, ry);
    for (const p of pts) {
      if (Math.abs(p.y - o.y) > reach) continue;
      const dx = p.x - o.x, dy = p.y - o.y, u = (dx * ca - dy * sa) / rx, v = (dx * sa + dy * ca) / ry;
      if (u * u + v * v <= 1) return false;
    }
    return true;
  }

  function placeToxics(state, grid) {
    const world = state.world, rng = state.rng, c = FP.config.level.toxics, pts = pathSamples(world);
    const B = world.braid, ptsB = B ? pathSamples(world, B.path) : null, bite = B ? -FP.config.lab.braid.toxicBite * B.radius : 0;   // v5.15.0 : la tresse
    const count = countFor(c, state);
    for (let i = 0; i < count; i++) {
      // v4.2.3 : à tour de rôle dans les trois tiers de la hauteur (v3 : réservées aux profondeurs, la surface restait propre).
      const third = i % 3;
      let placed = false;
      for (let tries = 0; tries < c.tries && !placed; tries++) {
        const cell = pickCell(grid, rng, cl => cl.r > 0 && cl.r < grid.rows - 1 &&
          (tries > c.relaxAfter || Math.min(2, Math.floor(depthK(world, cl.y) * 3)) === third));
        const pos = cellPos(grid, rng, cell, c.jitter), big = depthK(world, pos.y) > c.bigDepth;
        const o = makeToxic(rng, pos.x, pos.y, big);
        // Une nappe peut déborder du cadre, mais on doit en voir assez pour l'anticiper.
        const visible = (Math.min(world.width, o.x + o.rx) - Math.max(0, o.x - o.rx)) / (2 * o.rx);
        // Loin du chemin (centre), et l'ellipse elle-même ne s'en approche pas à moins d'une demi-marge.
        if (visible >= c.minVisible && distToSafePath(world, o.x, o.y) > world.hazardRadius + Math.max(o.rx, o.ry) * c.safeK + c.safeExtra &&
          toxicClear(o, pts, world.hazardRadius * .5) && (!B || toxicClear(o, ptsB, bite))) { world.toxics.push(o); placed = true; }   // B : bords mordus, milieu libre
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
    const world = state.world, rng = state.rng, c = FP.config.level.leaks, W = world.width, safe = FP.camera.safeX(W);   // v5.11.0 : bande sûre
    const count = countFor(c, state);
    // v4.17.0 : dans les derniers niveaux, une part des limaces peut barrer le chemin sûr (on passe en attendant son moment).
    const x = c.cross, crossK = clamp((state.difficulty - x.fromLevel) / (FP.config.difficulty.levelAtMax - x.fromLevel), 0, 1);
    for (let i = 0; i < count; i++) {
      let placed = false;
      const crossing = crossK > 0 && rng.next() < crossK * x.chanceAtMax;   // aucun tirage en plus avant fromLevel
      for (let tries = 0; tries < c.tries && !placed; tries++) {
        let pos;
        if (crossing || rng.next() < c.nearRouteChance) {
          const y = rng.range(world.surfaceY + c.routeTop, world.height - c.routeBottom);
          const side = rng.next() < .5 ? -1 : 1;
          const route = world.braid && rng.next() < .5 ? world.braid.path : world.safePath;   // v5.15.0 : au Lab, une fois sur deux autour de B
          pos = { x: clamp(pathXAt(world, y, route) + side * rng.range(c.routeOffset[0], c.routeOffset[1]), safe, W - safe), y };
        } else {
          const cell = pickCell(grid, rng, cl => cl.r > 0 && cl.r < grid.rows - 1 && (tries > c.relaxAfter || depthK(world, cl.y) > c.minDepth));
          pos = cellPos(grid, rng, cell, c.jitter);
        }
        const k = depthK(world, pos.y);
        // Angles très variés : les axes purs deviennent rares.
        const angle = rng.next() < c.angledChance
          ? Math.PI * c.shape.angles[Math.floor(rng.next() * c.shape.angles.length)] + rng.range(-c.angleJitter, c.angleJitter)
          : (rng.next() < .5 ? 0 : Math.PI * .5);
        const len = rng.range(c.len[0], c.len[1]) + Math.min(c.lenLevelMax, state.difficulty * c.lenPerLevel) * rng.next() + k * c.lenDepth;
        const leak = {
          x: pos.x, y: pos.y, len, angle, phase: rng.range(0, 6.28), rate: rng.range(c.rate[0], c.rate[1]), r: rng.range(c.r[0], c.r[1]),
          hitFlash: 0, morph: c.shape.morphs[Math.floor(rng.next() * c.shape.morphs.length)], debrisSeed: Math.floor(rng.next() * 99),
          s: 0, cx: 0, cy: 0, cr: 0, crossing
        };
        // Position de départ = celle de la première frame (pas de saut visible).
        const k0 = (Math.sin(leak.phase) + 1) * .5 - .5;
        leak.cx = pos.x + Math.cos(angle) * len * k0; leak.cy = pos.y + Math.sin(angle) * len * k0; leak.cr = leak.r;
        const pts = leakPoints(leak);
        // v5.11.0 (zones sûres) : tout le trajet, corps compris, reste dans la bande que le cadrage laisse voir (FP.camera.safeX).
        const inBounds = pts.every(p => p.x - leak.r >= safe && p.x + leak.r <= W - safe && p.y > world.surfaceY + c.top && p.y < world.height - c.bottom);
        const notBuried = !nearSolid(world, pos.x, pos.y, c.solidPad) && !nearToxic(world, pos.x, pos.y, c.toxicPad);
        const breathing = !nearLeak(world, pos.x, pos.y, c.spacingCenter) && pts.every(p => !nearLeak(world, p.x, p.y, c.spacingPath));
        // Une limace peut mettre la pression près du chemin, jamais le condamner.
        const ca = Math.cos(angle) * len / 2, sa = Math.sin(angle) * len / 2;
        const clear = world.hazardRadius * c.safeK + leak.r;
        // Limace qui barre le chemin : à un bout de sa course au moins, elle doit le laisser libre (avec de la marge).
        const pathOpen = crossing
          ? Math.max(distToSafePath(world, pos.x - ca, pos.y - sa), distToSafePath(world, pos.x + ca, pos.y + sa)) >= clear + x.clearPad
          : segmentToSafePath(world, pos.x - ca, pos.y - sa, pos.x + ca, pos.y + sa) >= clear;
        // v5.15.0, la tresse : une limace peut barrer B dès le début, à condition de laisser libre un bout de sa course (à la largeur de B).
        const B = world.braid, bClear = B ? B.radius + leak.r : 0, onB = (px, py) => FP.level.distToSafePath(world, px, py, B.path);
        const braidOpen = !B || segmentToSafePath(world, pos.x - ca, pos.y - sa, pos.x + ca, pos.y + sa, B.path) >= bClear ||
          Math.max(onB(pos.x - ca, pos.y - sa), onB(pos.x + ca, pos.y + sa)) >= bClear + x.clearPad;
        if (inBounds && notBuried && breathing && pathOpen && braidOpen) { world.leaks.push(leak); placed = true; }
      }
    }
  }

  FP.levelHazards = { placeToxics, placeLeaks };
})();
