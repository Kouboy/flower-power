// world/boss.js — le niveau de boss (v5.1.0), construit depuis le plan du milieu (assets/boss/plans.js) : parois, cibles, tête, plaques,
// salles et tourelles ; nappes aux emplacements du plan ; chemin sûr = trajet de référence vers la tête.
// Lit     : state.{seed,rng (non consommé)}, state.run.{saison,milieu}, state.bossFight.destroyed, state.world.{width,height,surfaceY},
//           FP.config.{boss.toxics,milieux}, window.FLOWER_POWER_BOSS_PLANS, FP.bossPlan.toWorld, FP.createRng, FP.level.makeToxic, FP.coins.place.
// Écrit   : state.bossThreats, state.world.{bossLevel,solids,toxics,leaks,bonuses,safePath,safeRadius} ; puis FP.coins.place écrit state.world.{coins,chains}.
//           bossLevel = { plan, walls: [solid], targets: [{ id, i, plate (id de sa plaque), solid }], head: { solid },
//             plates: [{ id, target (indice i de sa cible), solid }], rooms: [{ id, x0, y0, x1, y1, defense, turrets, zone (solide 'defense', off) }], turrets: [{ id, x, y, room }],
//             pipes: [{ from, to, open, target, pts }] (v5.7.0 : tuyaux de la machine, décor) }.
//           state.bossThreats remis à { rooms: {}, shots: [], aim: null, burst: null, cooldown: 0 } (écrit ensuite par play/boss-threats.js).
// Expose  : FP.bossLevel.generate(state).
// Graine propre : empreinte de (state.seed, saison, milieu), jamais state.rng : le niveau est le même d'une tentative à l'autre.
// Solides du boss : { kind: 'boss' (paroi) | 'target' | 'head' | 'plate' | 'defense' (zone d'une salle, off hors coup), boss: true, x, y, a: 0, flip: 1, collision (local), broadR,
//           flyoverEligible: false, grazeRadius: 0, off } ; `off` (ignoré par la collision) : cible détruite ou plaque tombée, dès la génération.
// Cible i = i-ième pièce `target` du plan ; une tourelle (centre de sa pièce) n'est pas un solide.
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  const KIND = { wall: 'boss', target: 'target', head: 'head', plate: 'plate', defense: 'defense' };

  // Solide centré sur la boîte du polygone (coordonnées du monde), polygone gardé en repère local.
  function makeSolid(kind, poly, off) {
    const xs = poly.map(p => p[0]), ys = poly.map(p => p[1]);
    const x = (Math.min(...xs) + Math.max(...xs)) / 2, y = (Math.min(...ys) + Math.max(...ys)) / 2;
    const collision = poly.map(([px, py]) => [px - x, py - y]);
    let broadR = 0;
    for (const [px, py] of collision) broadR = Math.max(broadR, Math.hypot(px, py));
    return { kind, boss: true, x, y, a: 0, flip: 1, collision, broadR, flyoverEligible: false, grazeRadius: 0, off };
  }

  // Empreinte de (graine, saison, milieu) : deux tentatives du même boss tirent la même suite.
  function bossRng(state) {
    const h = (state.seed ^ Math.imul(state.run.saison, 0x9e3779b1) ^ Math.imul(state.run.milieu + 1, 0x85ebca6b)) >>> 0;
    const rng = FP.createRng(h);
    rng.next();
    return rng;
  }

  function build(plan, placed, destroyed) {
    const bl = { plan, walls: [], targets: [], head: null, plates: [], rooms: [], turrets: [] };
    const targetOf = {};
    for (const p of placed.pieces) if (p.role === 'target') targetOf[p.plate] = Object.keys(targetOf).length;
    for (const p of placed.pieces) {
      if (p.role === 'turret') {
        const xs = p.poly.map(q => q[0]), ys = p.poly.map(q => q[1]), room = placed.rooms.find(r => r.turrets.includes(p.id));
        bl.turrets.push({ id: p.id, x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2, room: room ? room.id : null });
        continue;
      }
      if (p.role === 'wall') bl.walls.push(makeSolid(KIND.wall, p.poly, false));
      else if (p.role === 'head') bl.head = { solid: makeSolid(KIND.head, p.poly, false) };
      else if (p.role === 'target') { const i = bl.targets.length; bl.targets.push({ id: p.id, i, plate: p.plate, solid: makeSolid(KIND.target, p.poly, !!destroyed[i]) }); }
      else { const i = targetOf[p.id]; bl.plates.push({ id: p.id, target: i, solid: makeSolid(KIND.plate, p.poly, !!destroyed[i]) }); }
    }
    // zone (≠ la chaîne `defense`, le type de défense) : le solide de la défense de la salle, éteint (off) ; play/boss-threats.js le règle sur la moitié visée pendant le coup.
    for (const r of placed.rooms) {
      const [x0, y0, x1, y1] = r.rect;
      bl.rooms.push({ id: r.id, x0, y0, x1, y1, defense: r.defense, turrets: r.turrets, zone: makeSolid(KIND.defense, [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], true) });
    }
    // Tuyaux (v5.7.0) : décor de la machine, jamais solides ; target = indice de la cible (pompe) qui l'alimente, -1 pour une liaison.
    bl.pipes = placed.pipes.map(p => ({ ...p, target: p.from ? bl.targets.findIndex(t => t.id === p.from) : -1 }));
    return bl;
  }

  function generate(state) {
    const world = state.world, rng = bossRng(state);
    const plan = window.FLOWER_POWER_BOSS_PLANS[FP.config.milieux[state.run.milieu].id], placed = FP.bossPlan.toWorld(plan, world);
    const bl = build(plan, placed, state.bossFight.destroyed);
    world.bossLevel = bl;
    world.solids = [...bl.walls, ...bl.targets.map(t => t.solid), bl.head.solid, ...bl.plates.map(p => p.solid), ...bl.rooms.map(r => r.zone)];
    state.bossThreats = { rooms: {}, shots: [], aim: null, burst: null, cooldown: 0 };   // les menaces repartent de zéro avec le niveau
    world.toxics = placed.toxics.slice(0, FP.config.boss.toxics).map(t => FP.level.makeToxic(rng, t.x, t.y, false));
    world.leaks = []; world.bonuses = [];
    world.safePath = placed.paths.head.map(p => ({ x: p.x, y: p.y }));
    world.safeRadius = placed.channelMin / 2;   // le canal le plus étroit laisse passer la pousse : les chapelets « entre deux » s'y règlent
    FP.coins.place(state);
  }

  FP.bossLevel = { generate };
})();
