// play/difficulty.js — difficulté en dents de scie (v4.13.0) : elle suit l'avancée dans les milieux, pas le nombre de niveaux.
// Chaque milieu monte de son départ à son sommet sur ses pousses ; le suivant repart un peu sous ce sommet ; le boss se joue
// au sommet de son milieu ; le pollen avance la difficulté dans le milieu en cours ; saison 2 et suivantes au maximum.
// Lit     : FP.config.{run,difficulty,milieux}.
// Écrit   : rien (pur ; play/flow.js range le résultat dans state.difficulty).
// Expose  : FP.difficulty.steps(run) → pousses par milieu ; FP.difficulty.at(run) → d de 0 à 1 ;
//           FP.difficulty.level(run) → niveau équivalent (d × levelAtMax) pour les réglages par niveau de la génération.
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};

  const steps = (run) => (run.playtest ? FP.config.run.playtest.steps : FP.config.run.steps);

  function at(run) {
    if (run.saison > 1) return 1;
    const M = FP.config.milieux.length, m = run.milieu, S = steps(run);
    const peak = (m + 1) / M, start = m === 0 ? 0 : m / M - FP.config.difficulty.drop;
    if (run.boss) return peak;
    return start + (peak - start) * Math.min(1, (run.step + run.push) / Math.max(1, S - 1));
  }

  const level = (run) => at(run) * FP.config.difficulty.levelAtMax;

  FP.difficulty = { steps, at, level };
})();
