// world/hazards.js — dangers diffus : limaces de lixiviat en mouvement, intensité des zones toxiques.
// Lit     : state.time, state.world.leaks, state.plant.{stemCount,stemAge}, state.score.flowers, state.boosts.beer, FP.config.{hazards,shop.beerK}.
// Écrit   : leak.{s,cx,cy,cr} (phase intégrée, position et rayon du corps cette frame), leak.hitFlash (décroissance).
// Expose  : FP.hazards.update(state, dt), FP.hazards.leakSpeedScale(state), FP.hazards.toxicIntensityAt(o, x, y),
//           FP.hazards.leakHeading(leak) (sens de marche : 1 ou −1).
// Porté de la v3.43.16 (limaceSpeedScale, toxicIntensityAt, trajet des limaces de queryTipHazards / drawHazards).
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  const { clamp } = FP.math;

  // Les limaces suivent l'élan général : plus la partie avance, plus le lixiviat s'agite (plafonné).
  function leakSpeedScale(state) {
    const h = FP.config.hazards, p = state.plant;
    return 1 + Math.min(h.leakScaleMax, Math.max(0, p.stemCount - 1) * h.leakPerStem + state.score.flowers * h.leakPerFlower + p.stemAge * h.leakPerSec);
  }

  // 0 hors de l'ellipse ; à l'intérieur, de .18 au bord jusqu'à 1 au cœur.
  function toxicIntensityAt(o, x, y) {
    const h = FP.config.hazards;
    const ca = Math.cos(-o.a), sa = Math.sin(-o.a), dx = x - o.x, dy = y - o.y;
    const nx = (dx * ca - dy * sa) / Math.max(1, o.rx), ny = (dx * sa + dy * ca) / Math.max(1, o.ry);
    const q = Math.sqrt(nx * nx + ny * ny);
    return q >= 1 ? 0 : clamp((1 - q) / h.toxicFalloff, h.toxicMin, 1);
  }

  // Position sur le trajet, de −.5 à .5.
  const leakOffset = (l) => (Math.sin(l.s + l.phase) + 1) * .5 - .5;
  // Sens de marche : 1 vers +angle, −1 en retour (signe de la dérivée de leakOffset, la phase s ne fait que croître).
  const leakHeading = (l) => (Math.cos(l.s + l.phase) < 0 ? -1 : 1);

  // Va-et-vient sinusoïdal le long du trajet ; le corps « respire » légèrement.
  // La phase est intégrée (s += vitesse·dt) : la vitesse réelle reste plafonnée par leakSpeedScale.
  // (La v3 multipliait le temps total par l'échelle, ce qui accélérait sans fin et faisait sauter les limaces.)
  function update(state, dt) {
    const h = FP.config.hazards, t = state.time, scale = leakSpeedScale(state);
    for (const l of state.world.leaks) {
      l.s += dt * l.rate * h.leakRateK * scale * (state.boosts.beer ? FP.config.shop.beerK : 1);   // Bière anti-limaces (boutique)
      const k = leakOffset(l);
      l.cx = l.x + Math.cos(l.angle) * l.len * k;
      l.cy = l.y + Math.sin(l.angle) * l.len * k;
      l.cr = l.r + Math.sin(t * h.leakWobbleFreq + l.phase) * h.leakWobble;
      l.hitFlash = Math.max(0, l.hitFlash - dt);
    }
  }

  FP.hazards = { update, leakSpeedScale, toxicIntensityAt, leakHeading };
})();
