// world/lab.js — les modules de l'Encounter Lab (assets/lab/circuits.js) posés dans le monde. Au Lab (v5.12.0), un module seul dans un
// niveau à lui : un demi-écran de terre libre au départ, le module, un demi-écran jusqu'à la surface ; rien de tiré au hasard. v5.14.0 :
// un module se pose aussi à une hauteur donnée dans un niveau tiré au hasard (world/modules.js, ?modules) ; un niveau a une liste de modules.
// Lit     : state.run.{lab, labPasses}, state.world.{width,viewH,surfaceY,modules}, window.FLOWER_POWER_LAB, FP.config.{lab.channelMin, plant.seedOffset},
//           FP.geom.sdPoly, FP.catalog.makeSolid (obstacles), FP.level.makeToxic (nappes), FP.createRng.
// Écrit   : (generate, Lab) state.world.{height,baseHeight,growK,solids,toxics,leaks,bonuses,modules,safePath,safeRadius,hazardRadius,solidExtra,coins,chains}.
//           Un module = { index, circuit, mirror, top, bottom, channelMin, walls, soils: [{ kind, poly }], lanes: [{ x0, x1, y0, y1 }], path, alt,
//           turrets: [{ id, x, y, side, period, offset }], live } (pixels du monde) ; live = son état de jeu, recréé avec le niveau :
//           { t, on (horloge, play/lab-hazards.js), pulse: { active, next, k, shots } (play/lab-pulse.js), turret: { aims, shots } (play/lab-turret.js) }.
//           Ses obstacles sont des solides du catalogue, ses nappes des world.toxics, ses limaces des world.leaks (lab : { period, phase, module }).
// Expose  : FP.labLevel.place(circuit, world, mirror, bottom?) (pur), FP.labLevel.heightFor(circuit, world) (pur),
//           FP.labLevel.build(state, circuit, mirror, bottom, index) → { module, solids, toxics, leaks, coins } (sans rien écrire),
//           FP.labLevel.generate(state, circuit?) (niveau du Lab), FP.labLevel.moduleAt(world, y) → module | null (pur),
//           FP.labLevel.soilAt(world, x, y) → 'argile' | 'sable' | null (pur), FP.labLevel.circuitOf(n).
// Murs : solides { kind: 'lab', lab: true, … } (collision et frôlement comme un obstacle ; dessinés par render/lab.js, pas par obstacles.js).
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  const GRAZE = 14;   // bande de frôlement d'un mur, comme un obstacle moyen (px, avant config.graze.reachPad)
  const SLUG_R = 13;  // rayon d'une limace de module, par défaut (px)

  const circuitOf = (n) => window.FLOWER_POWER_LAB[(Math.max(1, Math.min(window.FLOWER_POWER_LAB.length, n | 0)) || 1) - 1];

  // Lab : demi-écran libre au départ (au-dessus de la graine), le module, demi-écran jusqu'à la surface.
  const heightFor = (circuit, world) => world.surfaceY + world.viewH + circuit.height * world.viewH + FP.config.plant.seedOffset;

  // mirror (v5.13.0) : le module retourné gauche-droite (x → 1 − x ; angles, côtés des consoles et voies suivent).
  // bottom (v5.14.0) : bas du module dans le monde ; sans lui, la place du Lab, et les trajets vont de la graine à la surface. Avec lui, les
  // trajets vont de la porte du bas à celle du haut.
  function place(circuit, world, mirror, bottom) {
    const W = world.width, ch = circuit.height * world.viewH, lab = bottom === undefined;
    const b = lab ? heightFor(circuit, world) - FP.config.plant.seedOffset - world.viewH / 2 : bottom, top = b - ch;
    const fx = (x) => (mirror ? 1 - x : x) * W, fy = (y) => top + y * ch;
    const px = ([x, y]) => [fx(x), fy(y)], pt = (p) => { const [x, y] = px(p); return { x, y }; };
    const seed = { x: W / 2, y: b + world.viewH / 2 }, sky = (q) => ({ x: q.x, y: world.surfaceY });
    const route = (pts) => { const r = pts.map(pt); return lab ? [seed, ...r, sky(r[r.length - 1])] : r; };
    return {
      top, bottom: b, channelMin: FP.config.lab.channelMin * W / 360,
      walls: circuit.walls.map(p => p.map(px)),
      soils: circuit.soils.map(z => ({ kind: z.kind, poly: z.poly.map(px) })),
      lanes: circuit.lanes.map(l => { const a = fx(l.x0), c = fx(l.x1); return { x0: Math.min(a, c), x1: Math.max(a, c), y0: fy(l.y0), y1: fy(l.y1) }; }),
      coins: circuit.coins.map(pt), path: route(circuit.path), alt: circuit.alt.map(route),
      obstacles: (circuit.obstacles || []).map(o => ({ kind: o.kind, x: fx(o.x), y: fy(o.y), a: (mirror ? -1 : 1) * (o.a || 0), flip: (mirror ? -1 : 1) * (o.flip || 1), scale: o.scale || 1 })),
      slugs: (circuit.slugs || []).map(s => ({ x0: fx(s.x0), y0: fy(s.y0), x1: fx(s.x1), y1: fy(s.y1), r: s.r || SLUG_R, period: s.period, phase: s.phase || 0 })),
      toxics: (circuit.toxics || []).map(t => ({ x: fx(t.x), y: fy(t.y), rx: t.rx, ry: t.ry })),
      turrets: (circuit.turrets || []).map((q, i) => ({ id: 't' + i, x: fx(q.x), y: fy(q.y), side: (mirror ? -1 : 1) * q.side, period: q.period, offset: q.offset || 0 }))
    };
  }

  // Mur : solide centré sur la boîte du polygone, polygone en repère local (comme les parois des boss).
  function wall(poly) {
    const xs = poly.map(p => p[0]), ys = poly.map(p => p[1]), x = (Math.min(...xs) + Math.max(...xs)) / 2, y = (Math.min(...ys) + Math.max(...ys)) / 2;
    const collision = poly.map(([px, py]) => [px - x, py - y]);
    return { kind: 'lab', lab: true, x, y, a: 0, flip: 1, collision, broadR: Math.max(...collision.map(([a, b]) => Math.hypot(a, b))),
      flyoverEligible: true, grazeRadius: GRAZE, off: false };
  }

  // Limace de module : patrouille sur l'horloge de son module (play/lab-hazards.js), pas sur celle du jeu normal.
  function slug(s, index) {
    const x = (s.x0 + s.x1) / 2, y = (s.y0 + s.y1) / 2, len = Math.hypot(s.x1 - s.x0, s.y1 - s.y0), angle = Math.atan2(s.y1 - s.y0, s.x1 - s.x0);
    return { x, y, len, angle, phase: 0, rate: 0, r: s.r, hitFlash: 0, morph: 'clear', debrisSeed: 0, s: 0, cx: s.x0, cy: s.y0, cr: s.r, crossing: false,
      lab: { period: s.period, phase: s.phase, module: index } };
  }
  const seedOf = (id) => [...id].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261);

  // Un module posé, et ce qu'il ajoute au monde (rien n'est écrit ici).
  function build(state, circuit, mirror, bottom, index) {
    const world = state.world, placed = place(circuit, world, mirror, bottom), rng = FP.createRng(seedOf(circuit.id));
    const module = { index, circuit, mirror, top: placed.top, bottom: placed.bottom, channelMin: placed.channelMin, walls: placed.walls, soils: placed.soils,
      lanes: placed.lanes, path: placed.path, alt: placed.alt, turrets: placed.turrets,
      live: { t: 0, on: false, pulse: { active: false, next: 0, k: 0, shots: [] }, turret: { aims: {}, shots: [] } } };
    return {
      module,
      solids: [...placed.walls.map(wall), ...placed.obstacles.map(o => FP.catalog.makeSolid(o)).filter(Boolean)],
      toxics: placed.toxics.map(t => Object.assign(FP.level.makeToxic(rng, t.x, t.y, false), t.rx ? { rx: t.rx } : {}, t.ry ? { ry: t.ry } : {})),
      leaks: placed.slugs.map(s => slug(s, index)),
      coins: placed.coins
    };
  }

  // Lab : un module explicite (banc d'essai) ; sinon celui de state.run.lab. Miroir un passage réussi sur deux (state.run.labPasses).
  function generate(state, explicit) {
    const world = state.world, circuit = explicit || circuitOf(state.run.lab);
    const mirror = ((state.run.labPasses && state.run.labPasses[circuit.id]) || 0) % 2 === 1, b = build(state, circuit, mirror, undefined, 0);
    world.height = heightFor(circuit, world); world.baseHeight = world.height; world.growK = 1;
    world.solids = b.solids; world.toxics = b.toxics; world.leaks = b.leaks; world.bonuses = [];
    world.modules = [b.module];
    world.safePath = b.module.path.map(p => ({ x: p.x, y: p.y }));
    world.safeRadius = world.hazardRadius = b.module.channelMin / 2; world.solidExtra = 0;
    world.coins = b.coins.map((p, rank) => ({ x: p.x, y: p.y, chain: 0, rank, taken: false }));
    world.chains = b.coins.length ? [{ kind: 'easy', anchor: 'lab', total: b.coins.length, got: 0, missed: false, done: false }] : [];
  }

  const moduleAt = (world, y) => (world.modules || []).find(M => y >= M.top && y <= M.bottom) || null;

  function soilAt(world, x, y) {
    for (const M of world.modules || []) { const z = M.soils.find(s => FP.geom.sdPoly(x, y, s.poly) <= 0); if (z) return z.kind; }
    return null;
  }

  FP.labLevel = { place, heightFor, build, generate, moduleAt, soilAt, circuitOf };
})();
