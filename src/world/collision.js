// world/collision.js — requête unique de la pointe contre les obstacles, une fois par frame.
// Lit     : state.mode, state.plant.tip, state.world.solids (x, y, a, collision, grazeRadius, flyoverEligible, broadR).
// Écrit   : state.query = { solid, danger, near }.
// Expose  : FP.collision.update(state), FP.collision.queryPoint(world, x, y), FP.collision.grazeBand(solid).
// Porté de la v3.43.16 (queryTipHazards, pixelMaskDistance, solidGrazeBand) — polygones authorés uniquement.
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};

  const EMPTY = () => ({ solid: null, danger: 0, near: null });

  // Bande de frôlement autour du polygone : seulement si l'obstacle accepte le flyover.
  const grazeBand = (o) => (o.flyoverEligible ? o.grazeRadius : 0);

  // Distance signée de (x, y) au polygone de collision, dans le repère local de l'obstacle.
  function distanceTo(o, x, y) {
    const dx = x - o.x, dy = y - o.y;
    const ca = Math.cos(-o.a), sa = Math.sin(-o.a);
    return FP.geom.sdPoly(dx * ca - dy * sa, dx * sa + dy * ca, o.collision);
  }

  function queryPoint(world, x, y) {
    const q = EMPTY();
    for (const o of world.solids) {
      const band = grazeBand(o), br = o.broadR + band + 10;
      const dx = x - o.x, dy = y - o.y;
      if (dx * dx + dy * dy > br * br) continue;             // broad phase
      const d = distanceTo(o, x, y);
      if (d <= 0) { if (!q.solid) q.solid = o; continue; }
      if (d < band) {
        const intensity = Math.max(0, Math.min(1, 1 - d / band));
        if (intensity > .02 && intensity > q.danger) { q.danger = intensity; q.near = o; }
      }
    }
    return q;
  }

  function update(state) {
    const tip = state.plant.tip;
    state.query = state.mode === 'playing' && tip ? queryPoint(state.world, tip.x, tip.y) : EMPTY();
  }

  FP.collision = { update, queryPoint, grazeBand };
})();
