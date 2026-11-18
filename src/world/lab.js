// world/lab.js — le niveau de l'Encounter Lab (v5.12.0) : un micro-circuit fait à la main (assets/lab/circuits.js) posé dans un niveau
// à lui : un demi-écran de terre libre au départ, le circuit, un demi-écran jusqu'à la surface. Ni obstacles, ni nappes, ni limaces
// tirés au hasard : seul le circuit compose le niveau (murs de béton, sols, voies d'impulsion, traînée de pièces).
// Lit     : state.run.{lab, labPasses}, state.world.{width,viewH,surfaceY}, window.FLOWER_POWER_LAB, FP.config.{lab.channelMin, plant.seedOffset}, FP.geom.sdPoly,
//           FP.catalog.makeSolid (obstacles), FP.level.makeToxic (nappes), FP.createRng.
// Écrit   : state.world.{height,baseHeight,growK,solids,toxics,leaks,bonuses,labLevel,safePath,safeRadius,hazardRadius,solidExtra,coins,chains}.
//           labLevel = { circuit, mirror, top, bottom, channelMin, walls, soils: [{ kind, poly }], lanes: [{ x0, x1, y0, y1 }], path, alt,
//           turrets: [{ id, x, y, side, period, offset }] } (pixels du monde) ; v5.13.0 : obstacles (solides du catalogue), nappes (world.toxics),
//           limaces (world.leaks, avec lab : { period, phase }, mues par play/lab-hazards.js).
// Expose  : FP.labLevel.place(circuit, world, mirror) (pur), FP.labLevel.heightFor(circuit, world) (pur), FP.labLevel.generate(state, circuit?),
//           FP.labLevel.soilAt(world, x, y) → 'argile' | 'sable' | null (pur).
// Murs : solides { kind: 'lab', lab: true, … } (collision et frôlement comme un obstacle ; dessinés par render/lab.js, pas par obstacles.js).
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  const GRAZE = 14;   // bande de frôlement d'un mur, comme un obstacle moyen (px, avant config.graze.reachPad)
  const SLUG_R = 13;  // rayon d'une limace de module, par défaut (px)

  const circuitOf = (n) => window.FLOWER_POWER_LAB[(Math.max(1, Math.min(window.FLOWER_POWER_LAB.length, n | 0)) || 1) - 1];

  // Demi-écran libre au départ (au-dessus de la graine), le circuit, demi-écran jusqu'à la surface.
  const heightFor = (circuit, world) => world.surfaceY + world.viewH + circuit.height * world.viewH + FP.config.plant.seedOffset;

  // mirror (v5.13.0) : le module retourné gauche-droite (x → 1 − x ; angles, côtés des consoles et voies suivent).
  function place(circuit, world, mirror) {
    const W = world.width, ch = circuit.height * world.viewH, bottom = heightFor(circuit, world) - FP.config.plant.seedOffset - world.viewH / 2, top = bottom - ch;
    const fx = (x) => (mirror ? 1 - x : x) * W, fy = (y) => top + y * ch;
    const px = ([x, y]) => [fx(x), fy(y)], pt = (p) => { const [x, y] = px(p); return { x, y }; };
    const seed = { x: W / 2, y: bottom + world.viewH / 2 }, sky = (q) => ({ x: q.x, y: world.surfaceY });
    const route = (pts) => { const r = pts.map(pt); return [seed, ...r, sky(r[r.length - 1])]; };
    return {
      top, bottom, channelMin: FP.config.lab.channelMin * W / 360,
      walls: circuit.walls.map(p => p.map(px)),
      soils: circuit.soils.map(z => ({ kind: z.kind, poly: z.poly.map(px) })),
      lanes: circuit.lanes.map(l => { const a = fx(l.x0), b = fx(l.x1); return { x0: Math.min(a, b), x1: Math.max(a, b), y0: fy(l.y0), y1: fy(l.y1) }; }),
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

  // Limace de module : patrouille sur l'horloge du module (play/lab-hazards.js), pas sur celle du jeu normal (lab : { period, phase }).
  function slug(s) {
    const x = (s.x0 + s.x1) / 2, y = (s.y0 + s.y1) / 2, len = Math.hypot(s.x1 - s.x0, s.y1 - s.y0), angle = Math.atan2(s.y1 - s.y0, s.x1 - s.x0);
    return { x, y, len, angle, phase: 0, rate: 0, r: s.r, hitFlash: 0, morph: 'clear', debrisSeed: 0, s: 0, cx: s.x0, cy: s.y0, cr: s.r, crossing: false,
      lab: { period: s.period, phase: s.phase } };
  }
  const seedOf = (id) => [...id].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261);

  // circuit : un module explicite (banc d'essai) ; sinon celui de state.run.lab. Miroir un passage réussi sur deux (state.run.labPasses).
  function generate(state, explicit) {
    const world = state.world, circuit = explicit || circuitOf(state.run.lab);
    const mirror = ((state.run.labPasses && state.run.labPasses[circuit.id]) || 0) % 2 === 1, placed = place(circuit, world, mirror);
    world.height = heightFor(circuit, world); world.baseHeight = world.height; world.growK = 1;
    world.solids = [...placed.walls.map(wall), ...placed.obstacles.map(o => FP.catalog.makeSolid(o)).filter(Boolean)];
    const rng = FP.createRng(seedOf(circuit.id));
    world.toxics = placed.toxics.map(t => Object.assign(FP.level.makeToxic(rng, t.x, t.y, false), t.rx ? { rx: t.rx } : {}, t.ry ? { ry: t.ry } : {}));
    world.leaks = placed.slugs.map(slug); world.bonuses = [];
    world.labLevel = { circuit, mirror, top: placed.top, bottom: placed.bottom, channelMin: placed.channelMin, walls: placed.walls, soils: placed.soils,
      lanes: placed.lanes, path: placed.path, alt: placed.alt, turrets: placed.turrets };
    world.safePath = placed.path.map(p => ({ x: p.x, y: p.y }));
    world.safeRadius = world.hazardRadius = placed.channelMin / 2; world.solidExtra = 0;
    world.coins = placed.coins.map((p, rank) => ({ x: p.x, y: p.y, chain: 0, rank, taken: false }));
    world.chains = placed.coins.length ? [{ kind: 'easy', anchor: 'lab', total: placed.coins.length, got: 0, missed: false, done: false }] : [];
  }

  function soilAt(world, x, y) {
    const L = world.labLevel;
    if (!L) return null;
    const z = L.soils.find(s => FP.geom.sdPoly(x, y, s.poly) <= 0);
    return z ? z.kind : null;
  }

  FP.labLevel = { place, heightFor, generate, soilAt, circuitOf };
})();
