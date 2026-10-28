// world/collision.js — requête unique de la pointe contre les dangers, une fois par frame.
// Lit     : state.mode, state.plant.tip, state.world.{solids (ceux marqués `off` sont ignorés),toxics,leaks} (leak.cx/cy/cr calculés par world/hazards.js),
//           FP.hazards.toxicIntensityAt, FP.config.{hazards,graze}.
// Écrit   : state.query = { solid, danger, near, toxic, leak, leakHit, grazes } ; leak.hitFlash de chaque limace touchée.
//           grazes : un élément { obj, kind:'solid'|'leak', intensity, x, y } par frôlement en cours (play/graze.js).
// Expose  : FP.collision.update(state), FP.collision.queryPoint(world, x, y), FP.collision.grazeBand(solid),
//           FP.collision.distanceTo(solid, x, y) (distance signée au polygone).
// Porté de la v3.43.16 (queryTipHazards, pixelMaskDistance, solidGrazeBand) — polygones authorés uniquement.
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};

  const EMPTY = () => ({ solid: null, danger: 0, near: null, toxic: 0, leak: 0, leakHit: null, grazes: [] });

  // Bande de frôlement autour du polygone : seulement si l'obstacle accepte le flyover.
  const grazeBand = (o) => (o.flyoverEligible ? o.grazeRadius : 0);

  // Distance signée de (x, y) au polygone de collision, dans le repère local de l'obstacle.
  function distanceTo(o, x, y) {
    const dx = x - o.x, dy = y - o.y;
    const ca = Math.cos(-o.a), sa = Math.sin(-o.a);
    return FP.geom.sdPoly(dx * ca - dy * sa, dx * sa + dy * ca, o.collision);
  }

  function querySolids(q, solids, x, y) {
    for (const o of solids) {
      if (o.off) continue;                                   // défense au repos, trappe ouverte
      const band = grazeBand(o), br = o.broadR + band + FP.config.graze.broadPad;
      const dx = x - o.x, dy = y - o.y;
      if (dx * dx + dy * dy > br * br) continue;             // broad phase
      const d = distanceTo(o, x, y);
      if (d <= 0) { if (!q.solid) q.solid = o; continue; }
      if (d < band) {
        const intensity = Math.max(0, Math.min(1, 1 - d / band));
        if (intensity > FP.config.graze.minIntensity) {
          q.grazes.push({ obj: o, kind: 'solid', intensity, x, y });
          if (intensity > q.danger) { q.danger = intensity; q.near = o; }
        }
      }
    }
  }

  // Contact : dans le corps (+6 px) ; frôlement : couronne de r+7 à r+38, qui fait zoomer la caméra.
  const inContact = (l, x, y) => Math.hypot(x - l.cx, y - l.cy) < l.cr + FP.config.hazards.leakHitPad;

  function queryLeaks(q, leaks, x, y) {
    const h = FP.config.hazards;
    for (const l of leaks) {
      const d = Math.hypot(x - l.cx, y - l.cy);
      if (inContact(l, x, y)) {
        q.leak += h.leakHitGain * (1 - d / (l.cr + h.leakHitPad));
        if (!q.leakHit) q.leakHit = l;
        continue;
      }
      const inner = l.r + h.leakGrazeInner, outer = l.r + h.leakGrazeOuter;
      if (d > inner && d < outer) {
        const intensity = Math.max(0, Math.min(1, 1 - (d - inner) / (outer - inner)));
        if (intensity > FP.config.graze.minIntensity) {
          q.grazes.push({ obj: l, kind: 'leak', intensity, x: l.cx, y: l.cy });
          q.danger = Math.max(q.danger, Math.min(h.leakDangerMax, intensity));
        }
      }
    }
  }

  function queryPoint(world, x, y) {
    const q = EMPTY();
    querySolids(q, world.solids, x, y);
    for (const o of world.toxics || []) q.toxic += FP.hazards.toxicIntensityAt(o, x, y);
    queryLeaks(q, world.leaks || [], x, y);
    return q;
  }

  function update(state) {
    const tip = state.plant.tip;
    state.query = state.mode === 'playing' && tip ? queryPoint(state.world, tip.x, tip.y) : EMPTY();
    // Toutes les limaces touchées clignotent (v3), pas seulement la première.
    if (state.query.leakHit) for (const l of state.world.leaks) if (inContact(l, tip.x, tip.y)) l.hitFlash = FP.config.hazards.hitFlash;
  }

  FP.collision = { update, queryPoint, grazeBand, distanceTo };
})();
