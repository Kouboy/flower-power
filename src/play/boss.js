// play/boss.js — le combat de boss (v5.1.0) : état du combat dans state.bossFight (seul à l'écrire).
// Lit     : state.plant.tip, state.world.bossLevel.{targets,plates,head,walls}, FP.config.boss.{targetBonus,assaultShake,death}, FP.collision.distanceTo.
// Écrit   : state.bossFight = { destroyed: [bool ×3] (une case par cible, dans l'ordre du plan), headOpen (les trois détruites),
//             collapse?: { t, walls: [{ at, blown, down }], peak } (cinématique de destruction, retirée à sa fin) } ;
//           off des solides de la cible détruite et de sa plaque, de la tête, puis de chaque paroi qui s'effondre ; state.score.eco (FP.scoring.awardFlat), state.camera.shake,
//           state.events (bossTarget { i, x, y } puis bossSeed { x, y } : la graine jaillit de l'épave ; bossHead { x, y } : la tête transpercée ;
//             bossBlast { i, x, y } : une paroi explose et se fissure ; bossCrumble { i } : elle s'effondre ; bossPeak { x, y } : le paroxysme),
//           state.flow.{freeze, warp} (la cinématique : la pousse figée, le jeu au ralenti).
// Expose  : FP.boss.reset(state) (nouveau boss : aucune cible détruite, tête blindée),
//           FP.boss.destroy(state, i) (assaut de la cible i ; sans effet si elle l'est déjà),
//           FP.boss.pierceHead(state) (la pointe traverse la tête à nu : tête off, cinématique ; sans effet si blindée ou déjà ouverte),
//           FP.boss.update(state, dt) (déroule la cinématique : explosions en chaîne depuis la tête, parois qui s'effondrent, paroxysme).
// Les cibles détruites survivent à une mort (world/boss.js régénère le niveau avec elles) ; seul reset les remet à zéro.
// Cinématique (retours de playtest) : config.boss.death.time s de temps réel au ralenti death.scale, soit G = time × scale s de jeu de gel
// (flow.freeze) ; la paroi i explose à chain × G × (sa distance à la tête / la plus grande), se fissure, s'effondre crack × G plus tard ;
// au paroxysme (peak × G) toutes sont tombées.
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};

  function reset(state) { state.bossFight = { destroyed: [false, false, false], headOpen: false }; }

  // Assaut : la cible explose et reste détruite, sa plaque tombe, la tête s'ouvre quand les trois le sont. La mort de la pousse
  // et la graine rendue sont l'affaire de play/flow.js.
  function destroy(state, i) {
    const bf = state.bossFight, bl = state.world.bossLevel, cfg = FP.config.boss;
    if (!bl || bf.destroyed[i]) return;
    const t = bl.targets[i], plate = bl.plates.find(p => p.target === i);
    bf.destroyed[i] = true;
    t.solid.off = true; plate.solid.off = true;
    bf.headOpen = bf.destroyed.every(Boolean);
    FP.scoring.awardFlat(state, t.solid.x, t.solid.y, cfg.targetBonus);
    state.camera.shake = Math.max(state.camera.shake, cfg.assaultShake);
    state.events.push({ type: 'bossTarget', i, x: t.solid.x, y: t.solid.y });
    state.events.push({ type: 'bossSeed', x: t.solid.x, y: t.solid.y });
  }

  const gel = () => FP.config.boss.death.time * FP.config.boss.death.scale;   // durée de la cinématique en temps de jeu

  // Tête à nu transpercée : la pousse n'y meurt pas ; la cinématique commence (pousse figée, ralenti), puis la tige continue jusqu'à la surface (bloom).
  function pierceHead(state) {
    const bf = state.bossFight, bl = state.world.bossLevel, h = bl && bl.head.solid, D = FP.config.boss.death;
    if (!bf.headOpen || !h || h.off) return;
    h.off = true;
    const d = bl.walls.map(w => FP.collision.distanceTo(w, h.x, h.y)), far = Math.max(1e-6, ...d);
    bf.collapse = { t: 0, peak: false, walls: d.map(v => ({ at: D.chain * gel() * Math.max(0, v) / far, blown: false, down: false })) };
    state.flow.freeze = gel();
    state.flow.warp = { stop: 0, slow: D.time, scale: D.scale };
    state.camera.shake = Math.max(state.camera.shake, D.shake);
    state.events.push({ type: 'bossHead', x: state.plant.tip.x, y: state.plant.tip.y });
  }

  // Cinématique : chaque paroi explose à son heure, se fissure, puis s'effondre (off) ; au paroxysme, toutes sont tombées.
  function update(state, dt) {
    const bf = state.bossFight, c = bf && bf.collapse, bl = state.world.bossLevel;
    if (!c || !bl) return;
    const D = FP.config.boss.death, G = gel(), h = bl.head.solid;
    c.t += dt;
    bl.walls.forEach((w, i) => {
      const k = c.walls[i];
      if (!k.blown && c.t >= k.at) { k.blown = true; state.events.push({ type: 'bossBlast', i, x: w.x, y: w.y }); state.camera.shake = Math.max(state.camera.shake, D.shake * .6); }
      if (!k.down && (c.t >= k.at + D.crack * G || c.t >= D.peak * G)) { k.down = true; w.off = true; state.events.push({ type: 'bossCrumble', i }); }
    });
    if (!c.peak && c.t >= D.peak * G) { c.peak = true; state.camera.shake = Math.max(state.camera.shake, D.shake); state.events.push({ type: 'bossPeak', x: h.x, y: h.y }); }
    if (c.t >= G) delete bf.collapse;
  }

  FP.boss = { reset, destroy, pierceHead, update };
})();
