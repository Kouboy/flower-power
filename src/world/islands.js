// world/islands.js — les îlots de la tresse (v5.17.0, spec docs/superpowers/specs/2026-11-19-tresse-ilots-design.md) : la terre entre A
// (world.safePath) et B (world.braid.path), d'un croisement au suivant (et depuis les deux bouts de B). Ils étaient toujours vides (trop
// étroits pour un déchet à sa taille) : des déchets du biome y sont posés, réduits si besoin ; à partir du deuxième biome, au plus une
// tourelle enfouie par îlot, à son endroit le plus large. Tirage propre de la tresse (fourni par world/level.js, après le tracé de B).
// Lit     : state.run.milieu, state.world.{braid, safePath, safeRadius, solidExtra, solids}, FP.config.braid.islands, FP.braid.crossings,
//           FP.level.{pathXAt, makeCandidate, objectFits}, FP.catalog.makeSolid.
// Écrit   : state.world.solids (déchets des îlots ; solide de chaque tourelle), state.world.turrets ([{ x, y, solid, aim, burst, cooldown }]).
// Expose  : FP.islands.place(state, rng), FP.islands.spans(world) → [{ y0, y1 }] (pur), FP.islands.room(world, y) → { lo, hi } | null (pur),
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

  // La tourelle est un obstacle rond (octogone de rayon r) : la toucher tue, la spore la nettoie.
  function turretSolid(x, y, r) {
    const collision = [];
    for (let i = 0; i < 8; i++) collision.push([r * Math.cos(i * Math.PI / 4), r * Math.sin(i * Math.PI / 4)]);
    return { kind: 'turret', turret: true, x, y, a: 0, flip: 1, w: 2 * r, h: 2 * r, pivot: [.5, .5], collision, broadR: r,
      grazeRadius: 0, flyoverEligible: true, signature: false, footprint: collision.map(([u, v]) => ({ x: x + u, y: y + v })) };
  }

  // Un déchet du biome au milieu de l'espace libre ; s'il ne tient pas, le même, de plus en plus petit (jusqu'à minScale).
  function trash(state, rng, x, y) {
    const world = state.world, c = FP.level.makeCandidate(state, rng, { x, y });
    if (!c) return;
    for (let k = 1; k >= FP.config.braid.islands.minScale - 1e-9; k -= .1) {
      const o = k === 1 ? c : FP.catalog.makeSolid({ kind: c.kind, x, y, a: c.a, flip: c.flip, scale: k });
      if (FP.level.objectFits(world, o)) { world.solids.push(o); return; }
    }
  }

  function place(state, rng) {
    const world = state.world, I = FP.config.braid.islands, T = I.turret, chance = T.chance[state.run.milieu] || 0;
    for (const s of spans(world)) {
      let best = null;
      for (let y = s.y0 - SCAN; y > s.y1; y -= SCAN) { const f = room(world, y); if (f && (!best || f.hi - f.lo > best.hi - best.lo)) best = { ...f, y }; }
      if (rng.next() < chance && best && best.hi - best.lo >= 2 * T.r) {
        const o = turretSolid((best.lo + best.hi) / 2, best.y, T.r);
        if (FP.level.objectFits(world, o)) { world.solids.push(o); world.turrets.push({ x: o.x, y: o.y, solid: o, aim: null, burst: null, cooldown: 0 }); }
      }
      for (let y = s.y0 - I.step / 2; y > s.y1; y -= I.step) { const f = room(world, y); if (f) trash(state, rng, (f.lo + f.hi) / 2, y); }
    }
  }

  FP.islands = { place, spans, room, turretSolid };
})();
