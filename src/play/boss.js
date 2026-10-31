// play/boss.js — le combat de boss (v5.1.0) : état du combat dans state.bossFight (seul à l'écrire).
// Lit     : rien pour l'instant (assauts, plaques qui tombent et tête vulnérable viendront ici).
// Écrit   : state.bossFight = { destroyed: [bool ×3] (une case par cible, dans l'ordre du plan), headOpen }.
// Expose  : FP.boss.update(state, dt) (vide pour l'instant), FP.boss.reset(state) (nouveau boss : aucune cible détruite, tête blindée).
// Les cibles détruites survivent à une mort (world/boss.js régénère le niveau avec elles) ; seul reset les remet à zéro.
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};

  function reset(state) { state.bossFight = { destroyed: [false, false, false], headOpen: false }; }

  function update() {}

  FP.boss = { update, reset };
})();
