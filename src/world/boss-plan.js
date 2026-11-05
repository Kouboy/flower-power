// world/boss-plan.js — plans de boss composés à la main (v5.1.0) : passage des proportions du plan aux coordonnées du monde.
// Lit     : FP.config.boss.{top,bottom,ramp[id].channelMin}, FP.config.plant.seedOffset, FP.geom.sdPoly ; un plan de window.FLOWER_POWER_BOSS_PLANS
//           (assets/boss/plans.js) et un monde { width, height, surfaceY }, passés en argument.
// Écrit   : rien (fonctions pures).
// Expose  : FP.bossPlan.zone(world) → { top, bottom } : de surfaceY + config.boss.top à height - config.boss.bottom ;
//           FP.bossPlan.toWorld(plan, world) → { pieces: [{ id, role, plate, poly }], rooms: [{ id, rect, defense, turrets }],
//             paths: { id: [{ x, y }] }, toxics: [{ x, y }], channelMin } : x × largeur, y sur la hauteur de la zone ;
//             chaque trajet commence à la graine (x = W / 2, y = height - plant.seedOffset), ajoutée devant les points du plan ;
//             channelMin = config.boss.ramp[id].channelMin × W / 360, id = milieu du plan (réglage propre à chaque boss, donné pour un monde de 360 px de large) ;
//           FP.bossPlan.clearance(placed, x, y) → distance signée à la plus proche pièce wall, head ou plate (négative dedans).
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  const REF_WIDTH = 360;   // largeur de monde pour laquelle config.boss.ramp[id].channelMin est donné
  const SOLID = { wall: true, head: true, plate: true };

  function zone(world) {
    const c = FP.config.boss;
    return { top: world.surfaceY + c.top, bottom: world.height - c.bottom };
  }

  // Milieu d'un plan : sa clé dans window.FLOWER_POWER_BOSS_PLANS.
  const idOf = (plan) => Object.keys(window.FLOWER_POWER_BOSS_PLANS).find(id => window.FLOWER_POWER_BOSS_PLANS[id] === plan);

  function toWorld(plan, world) {
    const z = zone(world), W = world.width, H = z.bottom - z.top;
    const px = ([x, y]) => [x * W, z.top + y * H];
    const seed = { x: W / 2, y: world.height - FP.config.plant.seedOffset };
    const paths = {};
    for (const id of Object.keys(plan.paths)) {
      paths[id] = [seed].concat(plan.paths[id].map(p => { const [x, y] = px(p); return { x, y }; }));
    }
    return {
      pieces: plan.pieces.map(p => ({ id: p.id, role: p.role, plate: p.plate || null, poly: p.poly.map(px) })),
      rooms: plan.rooms.map(r => {
        const [x0, y0] = px([r.rect[0], r.rect[1]]), [x1, y1] = px([r.rect[2], r.rect[3]]);
        return { id: r.id, rect: [x0, y0, x1, y1], defense: r.defense, turrets: r.turrets.slice() };
      }),
      paths,
      toxics: plan.toxics.map(t => { const [x, y] = px(t); return { x, y }; }),
      channelMin: FP.config.boss.ramp[idOf(plan)].channelMin * W / REF_WIDTH
    };
  }

  function clearance(placed, x, y) {
    let d = Infinity;
    for (const p of placed.pieces) if (SOLID[p.role]) d = Math.min(d, FP.geom.sdPoly(x, y, p.poly));
    return d;
  }

  FP.bossPlan = { zone, toWorld, clearance };
})();
