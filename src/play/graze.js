// play/graze.js — frôlement : suivre chaque obstacle ou limace frôlé, payer des ÉcoCrédits™ à la sortie.
// Lit     : state.mode, state.query.{solid,leak,grazes}, state.plant.tip, FP.config.graze.
// Écrit   : state.graze.active (Map objet → frôlement), leak.hitFlash (limace frôlée), state.events (grazeStart).
// Expose  : FP.graze.update(state, dt). À la fin d'un frôlement payant : FP.scoring.award, puis pour un obstacle
//           FP.powerups.onFlyover (le frôlement mesure ce que l'évaluation du flyover demande).
// Porté de la v3.43.16 (updateEcoGrazes, beginOrUpdateGraze, finishGraze, cancelEcoGrazes).
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  const { lerp } = FP.math;

  function multiplier(g, info) {
    if (info.kind === 'leak') return g.leakMul;
    return g.premium[info.obj.kind] || 1;
  }

  function track(state, info, dt) {
    const g = FP.config.graze, active = state.graze.active;
    let r = active.get(info.obj);
    if (!r) {
      r = {
        time: 0, score: 0, peak: 0, lastX: info.x, lastY: info.y, kind: info.kind, mul: multiplier(g, info),
        // Flyover : position de départ par rapport à l'objet, durée « utile » pondérée par la proximité.
        startRelY: state.plant.tip.y - (info.obj.y || 0), intensityTime: 0, effectiveTime: 0
      };
      active.set(info.obj, r);
      state.events.push({ type: 'grazeStart', kind: info.kind, intensity: info.intensity });
    }
    r.time += dt;
    r.peak = Math.max(r.peak, info.intensity);
    r.lastX = lerp(r.lastX, info.x, g.smooth);
    r.lastY = lerp(r.lastY, info.y, g.smooth);
    r.intensityTime += info.intensity * dt;
    r.effectiveTime += dt * (g.effBase + g.effGain * info.intensity);
    // Avant minTime, le frôlement chauffe mais ne rapporte rien.
    if (r.time > g.minTime) {
      const hot = Math.pow(info.intensity, g.hotExp) * g.hotGain;
      const close = Math.pow(r.peak, g.closeExp) * g.closeGain;
      r.score += dt * (g.base + hot + close) * r.mul;
    }
    if (info.kind === 'leak') info.obj.hitFlash = Math.max(info.obj.hitFlash || 0, g.leakFlashBase + g.leakFlashGain * info.intensity);
  }

  // Sortie de la bande : bonus de durée et de proximité maximale, arrondi à 25.
  function finish(state, obj, r) {
    const g = FP.config.graze;
    if (r.time < g.minTime || r.score < g.minScore) return;
    const hold = Math.min(g.holdMax, Math.max(0, r.time - g.minTime) * g.holdPerSec);
    const peak = Math.pow(r.peak, g.peakExp) * g.peakGain;
    const amount = Math.round((r.score + hold + peak) / g.step) * g.step;
    if (amount >= g.minAward) FP.scoring.award(state, r.lastX, r.lastY, amount, r.kind);
    if (r.kind === 'solid') FP.powerups.onFlyover(state, obj, r);
  }

  function update(state, dt) {
    const active = state.graze.active, q = state.query;
    // Hors jeu, ou contact : tout frôlement en cours est perdu, sans paiement.
    if (state.mode !== 'playing' || q.solid || q.leak > 0) { active.clear(); return; }
    const seen = new Set();
    for (const info of q.grazes) { track(state, info, dt); seen.add(info.obj); }
    for (const [obj, r] of active) {
      if (!seen.has(obj)) { active.delete(obj); finish(state, obj, r); }
    }
  }

  FP.graze = { update };
})();
