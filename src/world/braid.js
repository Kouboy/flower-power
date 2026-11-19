// world/braid.js — la tresse du Lab (v5.15.0, ?lab ; spec docs/superpowers/specs/2026-11-19-tresse-design.md) : un deuxième chemin sûr, B,
// tracé autour du chemin sûr d'aujourd'hui, A (world.safePath, inchangé). B s'écarte de A d'un côté, revient le croiser, part de l'autre
// côté, et ainsi de suite jusqu'à la surface ; plus étroit que A (radius), il porte les risques et la plupart des pièces.
// Tirage propre (graine ^ salt ^ niveau, fourni par world/level.js) : le tirage du niveau n'est pas décalé.
// Lit     : state.world.{width, viewH, safePath, braid}, FP.config.{lab.braid, level.safePath.maxSlope}, FP.camera.safeX, FP.level.pathXAt.
// Écrit   : rien (world.braid est posé par world/level.js).
// Expose  : FP.braid.trace(world, rng, safePath, safeRadius) → { path: [{ x, y }] (de bas en haut), radius } (pur),
//           FP.braid.crossings(world) → [y] (là où B passe d'un côté de A à l'autre ; pur).
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  const STEP = 40;   // pas vertical entre deux nœuds de B (px ; plus fin, le placement des déchets ralentit)

  function trace(world, rng, safePath, safeRadius) {
    const c = FP.config.lab.braid, W = world.width, y0 = safePath[0].y, y1 = safePath[safePath.length - 1].y, H = y0 - y1;
    const radius = c.radiusK * safeRadius, lo = FP.camera.safeX(W) + 4, hi = W - lo, slope = FP.config.level.safePath.maxSlope;
    const spans = Math.max(4, Math.round(H / (c.cross * world.viewH))), spanH = H / spans, ax = (y) => FP.level.pathXAt(world, y, safePath);
    // Un côté et une amplitude par tronçon : en alternance, sauf quand A colle à un bord (B part alors du côté où il y a de la place).
    let side = rng.next() < .5 ? -1 : 1;
    const plan = [];
    for (let k = 0; k < spans; k++) {
      const mid = ax(y0 - (k + .5) * spanH), want = rng.range(.9, 1) * c.spread * W, room = (s) => (s < 0 ? mid - lo : hi - mid);
      const s = room(side) >= want * .8 || room(side) >= room(-side) ? side : -side;
      plan.push({ side: s, amp: Math.min(want, room(s)), want, room });
      side = -s;
    }
    // Au moins deux croisements dans tous les cas : si B est resté presque toujours du même côté (A longe un bord), on alterne de force,
    // avec un écart plus court du côté serré (la spec l'accepte).
    if (plan.filter((p, k) => k && p.side !== plan[k - 1].side).length < 2) {
      plan.forEach((p, k) => { p.side = k % 2 ? -plan[0].side : plan[0].side; p.amp = Math.min(p.want, p.room(p.side)); });
    }
    const path = [];
    for (let y = y0; y > y1 - 1e-6; y -= STEP) {
      const yy = Math.max(y, y1), u = (y0 - yy) / spanH, k = Math.min(spans - 1, Math.floor(u)), t = u - k, p = plan[k];
      let x = Math.min(hi, Math.max(lo, ax(yy) + p.side * p.amp * Math.sin(Math.PI * t)));
      const prev = path[path.length - 1];
      if (prev) x = Math.min(prev.x + slope * (prev.y - yy), Math.max(prev.x - slope * (prev.y - yy), x));
      path.push({ x, y: yy });
      if (yy === y1) break;
    }
    if (path[path.length - 1].y > y1) path.push({ x: path[path.length - 1].x, y: y1 });
    return { path, radius };
  }

  function crossings(world) {
    const B = world.braid, out = [];
    if (!B) return out;
    let last = 0;
    for (const p of B.path) {
      const d = p.x - FP.level.pathXAt(world, p.y), s = Math.abs(d) < 1 ? 0 : Math.sign(d);
      if (s && last && s !== last) out.push(p.y);
      if (s) last = s;
    }
    return out;
  }

  FP.braid = { trace, crossings };
})();
