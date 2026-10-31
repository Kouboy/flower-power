// play/boss.js — le combat de boss (v5.1.0) : état du combat dans state.bossFight (seul à l'écrire).
// Lit     : state.world.bossLevel.{targets,plates}, FP.config.boss.{targetBonus,assaultShake}.
// Écrit   : state.bossFight = { destroyed: [bool ×3] (une case par cible, dans l'ordre du plan), headOpen (les trois détruites) } ;
//           off des solides de la cible détruite et de sa plaque ; state.score.eco (FP.scoring.awardFlat), state.camera.shake,
//           state.events (bossTarget { i, x, y } puis bossSeed { x, y } : la graine jaillit de l'épave).
// Expose  : FP.boss.update(state, dt) (vide pour l'instant), FP.boss.reset(state) (nouveau boss : aucune cible détruite, tête blindée),
//           FP.boss.destroy(state, i) (assaut de la cible i ; sans effet si elle l'est déjà).
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

  function update() {}

  FP.boss = { update, reset, destroy };
})();
