// play/powerups.js — flyover → récompense (pollen, goutte, spore), bouclier organique.
// Lit     : state.plant.tip, FP.config.flyover.
// Écrit   : (étape suivante) state.world.bonuses, state.power.
// Expose  : FP.powerups.assess(state, obj, record), FP.powerups.rewardType(a), FP.powerups.onFlyover(state, obj, record).
// Porté de la v3.43.16 (assessFlyover, flyoverRewardType).
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  const { clamp } = FP.math;

  // Un flyover qualifié : parti de dessous ou d'à côté, sorti au-dessus, avec une vraie progression.
  function assess(state, obj, r) {
    const f = FP.config.flyover;
    const h = Math.max(f.minH, obj.h || 0);
    const exitRelY = state.plant.tip.y - obj.y;
    const minAdvance = clamp(h * f.advanceK, f.advanceMin, f.advanceMax);
    const advance = r.startRelY - exitRelY;
    const startedBelow = r.startRelY > -clamp(h * f.belowK, f.belowMin, f.belowMax);
    const exitedAbove = exitRelY < -clamp(h * f.aboveK, f.aboveMin, f.aboveMax);
    const progress = clamp(advance / Math.max(f.progressMin, h * f.progressK), 0, 1);
    const avg = r.time > 0 ? r.intensityTime / r.time : 0;
    const duration = clamp((r.effectiveTime - f.effOffset) / f.effSpan, 0, 1);
    const proximity = clamp(avg * f.proxAvg + r.peak * f.proxPeak, 0, 1);
    const risk = clamp(duration * f.riskDuration + proximity * f.riskProximity + progress * f.riskProgress, 0, 1);
    const qualified = r.time >= f.minTime && r.peak >= f.minPeak && startedBelow && exitedAbove &&
      advance >= minAdvance && progress >= f.minProgress;
    return { qualified, risk, progress, effectiveTime: r.effectiveTime, rawTime: r.time };
  }

  // La durée décide d'abord de la nature du cadeau ; le risque sert de garde-fou.
  function rewardType(a) {
    const f = FP.config.flyover;
    if (a.effectiveTime >= f.spore.time && a.risk >= f.spore.risk) return 'spore';
    if (a.effectiveTime >= f.water.time && a.risk >= f.water.risk) return 'water';
    return 'pollen';
  }

  function onFlyover() { /* apparition de la récompense : tâche suivante */ }

  FP.powerups = { assess, rewardType, onFlyover };
})();
