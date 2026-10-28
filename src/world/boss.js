// world/boss.js — le niveau de boss : 4 tronçons accrochés tour à tour aux flancs, leurs points faibles, leurs défenses, la trappe.
// Lit     : state.{seed,level,rng (non consommé)}, state.run.{saison,milieu}, state.bossFight.pierced, state.world.{width,height,surfaceY},
//           FP.config.{boss,level.safePath,plant.seedOffset,milieux}, FP.createRng, FP.collision.distanceTo, FP.level.{makeToxic,distToSafePath}, FP.geom.
// Écrit   : state.world.{bossLevel,solids,toxics,leaks,bonuses,safePath,safeRadius} ; puis FP.coins.place écrit state.world.{coins,chains}.
//           bossLevel = { segments: [{ side, x0, x1, y0, y1, solid }], weak: [{ i, x, y }], defenses: [{ i, type, side, x, y, reach, solid }], trap: { y0, y1, openedAt (null tant que fermée, -Infinity si déjà ouverte à la génération), solid } }.
// Expose  : FP.bossLevel.generate(state).
// Graine propre : empreinte de (state.seed, saison, milieu), jamais state.rng : le niveau est le même d'une tentative à l'autre.
// Solides du boss : { kind: 'boss' | 'defense' | 'trap', boss: true, x, y, a: 0, flip: 1, collision (local), broadR, flyoverEligible: false, off }.
// `off` : ignoré par la collision (défense au repos, trappe ouverte). Tronçon i = i-ième du bas ; side -1 = accroché à gauche.
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};

  const TRIES = 40;   // essais par nappe
  const rect = (hw, hh) => [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]];

  function makeSolid(kind, x, y, collision, off) {
    let broadR = 0;
    for (const [px, py] of collision) broadR = Math.max(broadR, Math.hypot(px, py));
    return { kind, boss: true, x, y, a: 0, flip: 1, collision, broadR, flyoverEligible: false, grazeRadius: 0, off };
  }

  // Empreinte de (graine, saison, milieu) : deux tentatives du même boss tirent la même suite.
  function bossRng(state) {
    const h = (state.seed ^ Math.imul(state.run.saison, 0x9e3779b1) ^ Math.imul(state.run.milieu + 1, 0x85ebca6b)) >>> 0;
    const rng = FP.createRng(h);
    rng.next();
    return rng;
  }

  // Rayon du couloir : celui d'un niveau normal × corridorK, borné pour que la pointe qui longe le flanc touche encore le point faible.
  function corridorRadius(state) {
    const p = FP.config.level.safePath, c = FP.config.boss;
    const normal = Math.max(p.radiusMin, p.radiusBase + state.level * p.radiusPerLevel);
    return Math.min(normal * c.corridorK, c.weakOut + c.weakHit - 2);
  }

  // Tronçons du bas vers le haut, séparés d'un intervalle où le couloir change de flanc.
  function buildSegments(world, c, r, rng) {
    const W = world.width, segW = W * c.segWidth, gap = r * 3;
    const zoneTop = world.surfaceY + c.top, zoneBottom = world.height - c.bottom;
    const slot = (zoneBottom - zoneTop) / c.segments, thick = slot - gap;
    let side = rng.next() < .5 ? -1 : 1;
    const segments = [];
    for (let i = 0; i < c.segments; i++, side = -side) {
      const y1 = zoneBottom - i * slot, y0 = y1 - thick;
      const x0 = side < 0 ? 0 : W - segW, x1 = side < 0 ? segW : W;
      const solid = makeSolid('boss', (x0 + x1) / 2, (y0 + y1) / 2, rect(segW / 2, thick / 2), false);
      segments.push({ side, x0, x1, y0, y1, solid });
    }
    return segments;
  }

  const faceX = (seg) => (seg.side < 0 ? seg.x1 : seg.x0);

  function buildWeak(c, segments) {
    return segments.map((seg, i) => ({ i, x: faceX(seg) - seg.side * c.weakOut, y: (seg.y0 + seg.y1) / 2 }));
  }

  function buildDefenses(world, c, segments, milieuId) {
    const d = c.defense, pair = c.pairs[milieuId];
    return segments.map((seg, i) => {
      const x = faceX(seg), y = seg.y0 + d.mountK * (seg.y1 - seg.y0);
      return {
        i, type: pair[i % 2], side: seg.side, x, y, reach: d.reach * (world.width - (seg.x1 - seg.x0)),
        solid: makeSolid('defense', x, y, rect(1, 1), true)   // au repos : un point à l'attache (play/boss.js l'anime)
      };
    });
  }

  function buildTrap(world, c, pierced) {
    const y0 = world.surfaceY + c.trap.gap, y1 = y0 + c.trap.thick;
    const open = pierced.every(Boolean);
    return { y0, y1, openedAt: open ? -Infinity : null, solid: makeSolid('trap', world.width / 2, (y0 + y1) / 2, rect(world.width / 2, c.trap.thick / 2), open) };
  }

  // Couloir : part de la graine, longe chaque flanc à r + 1 (nœud au bord bas, à mi-hauteur, au bord haut), change de flanc en diagonale
  // dans l'intervalle entre deux tronçons, finit juste sous la trappe.
  function buildPath(world, c, r, segments, trap) {
    const d = r + 1, q = r * .9, path = [{ x: world.width / 2, y: world.height - FP.config.plant.seedOffset }];
    const lane = (seg) => faceX(seg) - seg.side * d;
    segments.forEach((seg, i) => {
      const x = lane(seg), mid = (seg.y0 + seg.y1) / 2;
      path.push({ x, y: i === 0 ? seg.y1 : seg.y1 + q }, { x, y: mid }, { x, y: i === segments.length - 1 ? seg.y0 : seg.y0 - q });
    });
    const top = segments[segments.length - 1];
    path.push({ x: lane(top), y: trap.y1 + 10 });
    world.safePath = path;
  }

  // Deux nappes dans le couloir, côté ouvert (loin du flanc et du chemin), hors de portée des points faibles.
  function buildToxics(world, c, rng, segments, weak, r) {
    const k = FP.config.level.toxics;
    const order = segments.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rng.next() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    for (const i of order) {
      if (world.toxics.length >= c.toxics) break;
      const seg = segments[i];
      for (let t = 0; t < TRIES; t++) {
        const y = seg.y0 + rng.range(.1, .9) * (seg.y1 - seg.y0), x = seg.side < 0 ? world.width - rng.range(10, 60) : rng.range(10, 60);
        const o = FP.level.makeToxic(rng, x, y, false), reach = Math.max(o.rx, o.ry);
        const clear = weak.every(w => Math.hypot(w.x - o.x, w.y - o.y) > c.weakHit + reach) &&
          FP.level.distToSafePath(world, o.x, o.y) > r + reach * k.safeK + k.safeExtra;
        if (clear) { world.toxics.push(o); break; }
      }
    }
  }

  function generate(state) {
    const world = state.world, c = FP.config.boss, rng = bossRng(state), r = corridorRadius(state);
    world.solids = []; world.toxics = []; world.leaks = []; world.bonuses = [];
    world.safeRadius = r;
    const milieuId = FP.config.milieux[state.run.milieu].id;
    const segments = buildSegments(world, c, r, rng), weak = buildWeak(c, segments);
    const defenses = buildDefenses(world, c, segments, milieuId), trap = buildTrap(world, c, state.bossFight.pierced);
    world.solids.push(...segments.map(s => s.solid), ...defenses.map(d => d.solid), trap.solid);
    world.bossLevel = { segments, weak, defenses, trap };
    buildPath(world, c, r, segments, trap);
    buildToxics(world, c, rng, segments, weak, r);
    FP.coins.place(state);
  }

  FP.bossLevel = { generate };
})();
