// world/islands.js — les îlots de la tresse (v5.17.0, spec docs/superpowers/specs/2026-11-19-tresse-ilots-design.md) : la terre entre A
// (world.safePath) et B (world.braid.path), d'un croisement au suivant (et depuis les deux bouts de B). Ils étaient toujours vides (trop
// étroits pour un déchet à sa taille) : des déchets du biome y sont posés, à leur taille (v5.17.1 : ceux qui y tiennent, jamais réduits —
// réduits, des micro-ondes dépassaient des frigos) ; un îlot trop étroit pour en recevoir un a une nappe à sa mesure, allongée dans son
// sens ; à partir du deuxième biome, au plus une tourelle enfouie par îlot, à son endroit le plus large. Tirage propre de la tresse (fourni par world/level.js, après le tracé de B).
// Lit     : state.run.milieu, state.world.{braid, safePath, safeRadius, solidExtra, solids}, FP.config.{braid.islands, braid.toxicBite, level.toxics}, FP.braid.crossings,
//           FP.level.{pathXAt, makeCandidate, objectFits, makeToxic, pathSamples}, FP.levelHazards.toxicClear.
// Écrit   : state.world.solids (déchets des îlots, island : true ; solide de chaque tourelle), state.world.toxics (nappes des îlots, island : true), state.world.turrets ([{ x, y, solid, aim, burst, cooldown }]).
// Expose  : FP.islands.place(state, rng, k = 1) (k : part des déchets d'îlot gardée, l'option lobbying de la boutique), FP.islands.spans(world) → [{ y0, y1 }] (pur), FP.islands.room(world, y) → { lo, hi } | null (pur),
//           FP.islands.turretSolid(x, y, r) (pur).
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  const SCAN = 10;   // pas de lecture de la largeur d'un îlot (px)

  // Les îlots, de bas en haut : d'un bout de B au premier croisement, d'un croisement au suivant, du dernier à l'autre bout.
  function spans(world) {
    const B = world.braid;
    if (!B) return [];
    const cuts = [B.path[0].y, ...FP.braid.crossings(world), B.path[B.path.length - 1].y], out = [];
    for (let i = 1; i < cuts.length; i++) out.push({ y0: cuts[i - 1], y1: cuts[i] });
    return out;
  }

  // L'espace libre de l'îlot à la hauteur y, à l'horizontale : entre le bord de A (marge des déchets comprise) et celui de B.
  function room(world, y) {
    const a = FP.level.pathXAt(world, y), b = FP.level.pathXAt(world, y, world.braid.path), s = Math.sign(b - a);
    const ea = a + s * (world.safeRadius + world.solidExtra), eb = b - s * world.braid.radius;
    return s && (eb - ea) * s > 0 ? { lo: Math.min(ea, eb), hi: Math.max(ea, eb) } : null;
  }

  // L'endroit le plus large de l'îlot entre les hauteurs ya (bas) et yb (haut) : { lo, hi, y } | null.
  function widest(world, ya, yb) {
    let best = null;
    for (let y = ya; y > yb; y -= SCAN) { const f = room(world, y); if (f && (!best || f.hi - f.lo > best.hi - best.lo)) best = { ...f, y }; }
    return best;
  }

  // La tourelle est un obstacle rond (octogone de rayon r) : la toucher tue, la spore la nettoie.
  function turretSolid(x, y, r) {
    const collision = [];
    for (let i = 0; i < 8; i++) collision.push([r * Math.cos(i * Math.PI / 4), r * Math.sin(i * Math.PI / 4)]);
    return { kind: 'turret', turret: true, x, y, a: 0, flip: 1, w: 2 * r, h: 2 * r, pivot: [.5, .5], collision, broadR: r,
      grazeRadius: 0, flyoverEligible: true, signature: false, footprint: collision.map(([u, v]) => ({ x: x + u, y: y + v })) };
  }

  // Un déchet du biome au milieu de l'espace libre, à sa taille (tirage habituel) : jusqu'à islands.tries tirages, le premier qui tient ;
  // v5.17.2 : il peut déborder de l'îlot et mordre islands.bite de la largeur de A et de B (« on est large »).
  function trash(state, rng, x, y) {
    for (let i = 0; i < FP.config.braid.islands.tries; i++) {
      const o = FP.level.makeCandidate(state, rng, { x, y });
      if (o && FP.level.objectFits(state.world, o, FP.config.braid.islands.bite)) { o.island = true; state.world.solids.push(o); return; }
    }
  }

  // Nappe d'un îlot resté vide, à son plus large : la plus grande qui tienne, allongée dans le sens de l'îlot (ry = pool.ryK × rx), hors du
  // couloir de A (marge hazardRadius) et ne mordant que les bords de B (toxicBite), comme les autres nappes (edge exact, sans la règle du centre).
  function pool(state, rng, f, span) {
    const world = state.world, P = FP.config.braid.islands.pool, B = world.braid, pts = FP.level.pathSamples(world), ptsB = FP.level.pathSamples(world, B.path);
    const o = FP.level.makeToxic(rng, (f.lo + f.hi) / 2, f.y, false), bite = (1 - FP.config.braid.toxicBite) * B.radius;
    o.a = rng.range(-P.tilt, P.tilt);
    for (let rx = P.rx[1]; rx >= P.rx[0]; rx -= 2) {
      o.rx = rx; o.ry = Math.min(rx * P.ryK, (span.y0 - span.y1) * .45);
      if (FP.levelHazards.toxicClear(o, pts, world.hazardRadius * P.edgeK) && FP.levelHazards.toxicClear(o, ptsB, bite)) { o.island = true; world.toxics.push(o); return; }
    }
  }

  const holds = (world, s) => world.solids.some(o => o.y <= s.y0 && o.y >= s.y1 && (o.x - FP.level.pathXAt(world, o.y)) * (o.x - FP.level.pathXAt(world, o.y, world.braid.path)) < 0);

  function place(state, rng, k = 1) {
    const world = state.world, I = FP.config.braid.islands, T = I.turret, chance = T.chance[state.run.milieu] || 0;
    for (const s of spans(world)) {
      const best = widest(world, s.y0 - SCAN, s.y1);
      if (rng.next() < chance && best && best.hi - best.lo >= 2 * T.r) {
        const o = turretSolid((best.lo + best.hi) / 2, best.y, T.r);
        if (FP.level.objectFits(world, o)) { world.solids.push(o); world.turrets.push({ x: o.x, y: o.y, solid: o, aim: null, burst: null, cooldown: 0 }); }
      }
      for (let y = s.y0; y > s.y1; y -= I.step) { const f = widest(world, y - SCAN, Math.max(s.y1, y - I.step)); if (f && (k >= 1 || rng.next() < k)) trash(state, rng, (f.lo + f.hi) / 2, f.y); }   // une tranche de step px, à son plus large
      if (best && !holds(world, s)) pool(state, rng, best, s);
    }
  }

  FP.islands = { place, spans, room, turretSolid };
})();
