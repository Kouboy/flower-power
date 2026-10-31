// play/boss.js — le combat de boss (v5.1.0) : état du combat dans state.bossFight (seul à l'écrire).
// Lit     : state.plant.tip, state.world.bossLevel.{targets,plates,head}, FP.config.boss.{targetBonus,assaultShake,freeze}.
// Écrit   : state.bossFight = { destroyed: [bool ×3] (une case par cible, dans l'ordre du plan), headOpen (les trois détruites) } ;
//           off des solides de la cible détruite et de sa plaque ; state.score.eco (FP.scoring.awardFlat), state.camera.shake,
//           state.events (bossTarget { i, x, y } puis bossSeed { x, y } : la graine jaillit de l'épave ; bossHead { x, y } : la tête transpercée),
//           state.flow.freeze (arrêt sur image de la tête transpercée), off de la tête.
// Expose  : FP.boss.update(state, dt) (vide pour l'instant), FP.boss.reset(state) (nouveau boss : aucune cible détruite, tête blindée),
//           FP.boss.destroy(state, i) (assaut de la cible i ; sans effet si elle l'est déjà),
//           FP.boss.pierceHead(state) (la pointe traverse la tête à nu : tête off, secousse, gel, événement ; sans effet si blindée ou déjà ouverte).
// Les cibles détruites survivent à une mort (world/boss.js régénère le niveau avec elles) ; seul reset les remet à zéro.
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

  // Tête à nu transpercée : la pousse n'y meurt pas, l'image se fige un instant puis la tige continue jusqu'à la surface (bloom).
  function pierceHead(state) {
    const bf = state.bossFight, bl = state.world.bossLevel, h = bl && bl.head.solid;
    if (!bf.headOpen || !h || h.off) return;
    h.off = true;
    state.flow.freeze = FP.config.boss.freeze;
    state.camera.shake = Math.max(state.camera.shake, FP.config.boss.assaultShake);
    state.events.push({ type: 'bossHead', x: state.plant.tip.x, y: state.plant.tip.y });
  }

  function update() {}

  FP.boss = { update, reset, destroy, pierceHead };
})();
