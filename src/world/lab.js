// world/lab.js — le niveau de l'Encounter Lab (v5.12.0) : un micro-circuit fait à la main (assets/lab/circuits.js) posé dans un niveau
// à lui : un demi-écran de terre libre au départ, le circuit, un demi-écran jusqu'à la surface. Ni obstacles, ni nappes, ni limaces
// tirés au hasard : seul le circuit compose le niveau (murs de béton, sols, voies d'impulsion, traînée de pièces).
// Lit     : state.run.lab, state.world.{width,viewH,surfaceY}, window.FLOWER_POWER_LAB, FP.config.{lab.channelMin, plant.seedOffset}, FP.geom.sdPoly.
// Écrit   : state.world.{height,baseHeight,growK,solids,toxics,leaks,bonuses,labLevel,safePath,safeRadius,hazardRadius,solidExtra,coins,chains}.
//           labLevel = { circuit, top, bottom, channelMin, walls, soils: [{ kind, poly }], lanes: [{ x0, x1, y0, y1 }], path, alt } (pixels du monde).
// Expose  : FP.labLevel.place(circuit, world) (pur), FP.labLevel.heightFor(circuit, world) (pur), FP.labLevel.generate(state),
//           FP.labLevel.soilAt(world, x, y) → 'argile' | 'sable' | null (pur).
// Murs : solides { kind: 'lab', lab: true, … } (collision et frôlement comme un obstacle ; dessinés par render/lab.js, pas par obstacles.js).
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  const GRAZE = 14;   // bande de frôlement d'un mur, comme un obstacle moyen (px, avant config.graze.reachPad)

  const circuitOf = (n) => window.FLOWER_POWER_LAB[(Math.max(1, Math.min(window.FLOWER_POWER_LAB.length, n | 0)) || 1) - 1];

  // Demi-écran libre au départ (au-dessus de la graine), le circuit, demi-écran jusqu'à la surface.
  const heightFor = (circuit, world) => world.surfaceY + world.viewH + circuit.height * world.viewH + FP.config.plant.seedOffset;

  function place(circuit, world) {
    const W = world.width, ch = circuit.height * world.viewH, bottom = heightFor(circuit, world) - FP.config.plant.seedOffset - world.viewH / 2, top = bottom - ch;
    const px = ([x, y]) => [x * W, top + y * ch], pt = (p) => { const [x, y] = px(p); return { x, y }; };
    const seed = { x: W / 2, y: bottom + world.viewH / 2 }, sky = (q) => ({ x: q.x, y: world.surfaceY });
    const route = (pts) => { const r = pts.map(pt); return [seed, ...r, sky(r[r.length - 1])]; };
    return {
      top, bottom, channelMin: FP.config.lab.channelMin * W / 360,
      walls: circuit.walls.map(p => p.map(px)),
      soils: circuit.soils.map(z => ({ kind: z.kind, poly: z.poly.map(px) })),
      lanes: circuit.lanes.map(l => ({ x0: l.x0 * W, x1: l.x1 * W, y0: top + l.y0 * ch, y1: top + l.y1 * ch })),
      coins: circuit.coins.map(pt), path: route(circuit.path), alt: circuit.alt.map(route)
    };
  }

  // Mur : solide centré sur la boîte du polygone, polygone en repère local (comme les parois des boss).
  function wall(poly) {
    const xs = poly.map(p => p[0]), ys = poly.map(p => p[1]), x = (Math.min(...xs) + Math.max(...xs)) / 2, y = (Math.min(...ys) + Math.max(...ys)) / 2;
    const collision = poly.map(([px, py]) => [px - x, py - y]);
    return { kind: 'lab', lab: true, x, y, a: 0, flip: 1, collision, broadR: Math.max(...collision.map(([a, b]) => Math.hypot(a, b))),
      flyoverEligible: true, grazeRadius: GRAZE, off: false };
  }

  function generate(state) {
    const world = state.world, circuit = circuitOf(state.run.lab), placed = place(circuit, world);
    world.height = heightFor(circuit, world); world.baseHeight = world.height; world.growK = 1;
    world.solids = placed.walls.map(wall);
    world.toxics = []; world.leaks = []; world.bonuses = [];
    world.labLevel = { circuit, top: placed.top, bottom: placed.bottom, channelMin: placed.channelMin, walls: placed.walls, soils: placed.soils,
      lanes: placed.lanes, path: placed.path, alt: placed.alt };
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
