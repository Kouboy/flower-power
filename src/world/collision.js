// world/collision.js — requête unique de la pointe contre les dangers, une fois par frame.
// Lit     : state.mode, state.plant.tip, state.world.{solids (ceux marqués `off` sont ignorés),toxics,leaks} (leak.cx/cy/cr calculés par world/hazards.js),
//           state.boosts.beer, FP.hazards.toxicIntensityAt, FP.config.{hazards,graze}. Un solide de kind 'target' non détruit va dans query.target, jamais dans query.solid ;
//           la tête à nu (headOpen) va dans query.head, la tête blindée dans query.solid (une paroi).
// Écrit   : state.query = { solid, target, head, danger, near, toxic, leak, leakHit, pops, grazes } ; leak.hitFlash de chaque limace touchée.
//           pops : avec la bière (limaces saoules, v5.2.0), les limaces touchées, qui éclatent (play/leakpop.js) au lieu de tuer :
//           ni leak ni leakHit, et leur couronne ne fait plus monter danger.
//           target : la cible de boss intacte touchée (assaut, play/flow.js), prioritaire sur solid.
//           head : la tête de boss à nu touchée (transpercée, play/flow.js) ; la membrane ne la touche pas.
//           grazes : un élément { obj, kind:'solid'|'leak', intensity, x, y } par frôlement en cours (play/graze.js).
// Expose  : FP.collision.update(state), FP.collision.queryPoint(world, x, y, headOpen, drunk), FP.collision.grazeBand(solid),
//           FP.collision.distanceTo(solid, x, y) (distance signée au polygone).
// Porté de la v3.43.16 (queryTipHazards, pixelMaskDistance, solidGrazeBand) — polygones authorés uniquement.
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};

  const EMPTY = () => ({ solid: null, target: null, head: null, danger: 0, near: null, toxic: 0, leak: 0, leakHit: null, pops: [], grazes: [] });

  // Bande de frôlement autour du polygone : seulement si l'obstacle accepte le flyover.
  const grazeBand = (o) => (o.flyoverEligible ? o.grazeRadius : 0);

  // Distance signée de (x, y) au polygone de collision, dans le repère local de l'obstacle.
  function distanceTo(o, x, y) {
    const dx = x - o.x, dy = y - o.y;
    const ca = Math.cos(-o.a), sa = Math.sin(-o.a);
    return FP.geom.sdPoly(dx * ca - dy * sa, dx * sa + dy * ca, o.collision);
  }

  function querySolids(q, solids, x, y, headOpen) {
    for (const o of solids) {
      if (o.off) continue;                                   // défense au repos, cible détruite, plaque tombée, tête transpercée
      const band = grazeBand(o), br = o.broadR + band + FP.config.graze.broadPad;
      const dx = x - o.x, dy = y - o.y;
      if (dx * dx + dy * dy > br * br) continue;             // broad phase
      const d = distanceTo(o, x, y);
      if (d <= 0) {
        if (o.kind === 'target') { if (!q.target) q.target = o; }   // v5.1.0 : une cible n'est pas une paroi, c'est un assaut
        else if (o.kind === 'head' && headOpen) { if (!q.head) q.head = o; }   // tête à nu : on la transperce
        else if (!q.solid) q.solid = o;
        continue;
      }
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

  function queryLeaks(q, leaks, x, y, drunk) {
    const h = FP.config.hazards;
    for (const l of leaks) {
      const d = Math.hypot(x - l.cx, y - l.cy);
      if (inContact(l, x, y)) {
        if (drunk) q.pops.push(l);
        else { q.leak += h.leakHitGain * (1 - d / (l.cr + h.leakHitPad)); if (!q.leakHit) q.leakHit = l; }
        continue;
      }
      const inner = l.r + h.leakGrazeInner, outer = l.r + h.leakGrazeOuter;
      if (d > inner && d < outer) {
        const intensity = Math.max(0, Math.min(1, 1 - (d - inner) / (outer - inner)));
        if (intensity > FP.config.graze.minIntensity) {
          q.grazes.push({ obj: l, kind: 'leak', intensity, x: l.cx, y: l.cy });
          if (!drunk) q.danger = Math.max(q.danger, Math.min(h.leakDangerMax, intensity));
        }
      }
    }
  }

  function queryPoint(world, x, y, headOpen, drunk) {
    const q = EMPTY();
    querySolids(q, world.solids, x, y, headOpen);
    for (const o of world.toxics || []) q.toxic += FP.hazards.toxicIntensityAt(o, x, y);
    queryLeaks(q, world.leaks || [], x, y, drunk);
    return q;
  }

  function update(state) {
    const tip = state.plant.tip;
    state.query = state.mode === 'playing' && tip ? queryPoint(state.world, tip.x, tip.y, !!(state.bossFight && state.bossFight.headOpen), !!state.boosts.beer) : EMPTY();
    // Toutes les limaces touchées clignotent (v3), pas seulement la première.
    if (state.query.leakHit) for (const l of state.world.leaks) if (inContact(l, tip.x, tip.y)) l.hitFlash = FP.config.hazards.hitFlash;
  }

  FP.collision = { update, queryPoint, grazeBand, distanceTo };
})();
