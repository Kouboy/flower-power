// play/powerups.js — flyover → récompense (pollen, goutte, spore), ramassage, spore.
// Lit     : state.mode, state.plant.{tip,dir}, state.world, state.power.shield, FP.config.{flyover,powerups,text},
//           FP.collision.distanceTo, FP.hazards.toxicIntensityAt.
// Écrit   : state.world.{bonuses,solids,toxics,leaks} (apparition, ramassage, nettoyage par la spore), solid.rewarded,
//           state.power.{shield,shieldGrace}, state.score.flowerBonus, state.graze.active (objets effacés),
//           state.events (bonusSpawn, bonusMissed, pickup, bomb) ; messages via FP.flow.say ; gains via FP.scoring.awardFlat.
// Expose  : FP.powerups.assess(state, obj, record), FP.powerups.rewardType(a), FP.powerups.onFlyover(state, obj, record),
//           FP.powerups.update(state, dt).
// Porté de la v3.43.16 (assessFlyover, flyoverRewardType, spawnFlyoverBonus, findFlyoverBonusSpawn, bonusSpawnClear,
// gameplayPowerUpActive, collectBonus, detonateBomb, cycle de vie des bonus dans update()).
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  const { clamp, dist } = FP.math;

  // --- Évaluation -----------------------------------------------------------

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

  // --- Apparition -------------------------------------------------------------

  // Un endroit libre, toujours devant la pousse, hors de tout danger et des autres récompenses.
  function spawnClear(state, x, y, r) {
    const c = FP.config.powerups.spawn, w = state.world, tip = state.plant.tip;
    if (x < c.marginX + r || x > w.width - c.marginX - r) return false;
    if (y < w.surfaceY + c.top || y > w.height - c.bottom) return false;
    const lead = tip.y - w.surfaceY < c.nearSurfaceSpan ? c.leadNearSurface : c.lead;
    if (y > tip.y - lead) return false;
    for (const o of w.solids) {
      const br = o.broadR + r + 8;
      if ((x - o.x) ** 2 + (y - o.y) ** 2 > br * br) continue;
      if (FP.collision.distanceTo(o, x, y) < r + c.solidPad) return false;
    }
    for (const o of w.toxics) if (FP.hazards.toxicIntensityAt(o, x, y) > c.toxicMax) return false;
    for (const l of w.leaks) {
      const ca = Math.cos(l.angle), sa = Math.sin(l.angle);
      if (FP.geom.distPointToSegment(x, y, l.x - ca * l.len * .5, l.y - sa * l.len * .5, l.x + ca * l.len * .5, l.y + sa * l.len * .5) < l.r + r + c.leakPad) return false;
    }
    for (const b of w.bonuses) if (dist(x, y, b.x, b.y) < c.spacing) return false;
    return true;
  }

  // Spawn prédictif : devant la pointe, décalé latéralement (d'abord du côté extérieur à l'obstacle).
  function findSpawn(state, obj, risk) {
    const c = FP.config.powerups.spawn, tip = state.plant.tip;
    const d = FP.geom.clampUpAngle(state.plant.dir.x, state.plant.dir.y, c.dirCone);
    const nx = -d.y, ny = d.x, out = tip.x >= obj.x ? 1 : -1;
    // Près de la surface, on comprime la distance plutôt que de créer une longue zone sans récompense.
    const availableUp = Math.max(0, tip.y - (state.world.surfaceY + c.surfacePad));
    const base = Math.max(c.minAhead, Math.min(c.idealAhead + risk * c.aheadRisk, availableUp - c.aheadSlack));
    const minProjection = availableUp < c.nearSurfaceUp ? c.minProjectionNear : c.minProjection;
    const attempts = [
      [base, 34, out], [base + 10, 42, out], [Math.max(34, base - 10), 46, -out], [base + 18, 28, -out],
      [base + 25, 36, out], [Math.max(32, base - 5), 23, -out], [Math.max(30, base - 16), 18, out], [Math.max(30, base - 16), 18, -out]
    ];
    for (const [ahead, lat, side] of attempts) {
      const x = tip.x + d.x * ahead + nx * lat * side, y = tip.y + d.y * ahead + ny * lat * side;
      if ((x - tip.x) * d.x + (y - tip.y) * d.y < minProjection) continue;
      if (spawnClear(state, x, y, c.probeR)) return { x, y };
    }
    return null;
  }

  // Un seul power-up gameplay à la fois : tant que le bouclier tient, ni goutte ni spore (pas de file d'attente).
  // Le pollen n'est qu'un bonus de score : il reste autorisé. Chaque obstacle ne récompense qu'une fois.
  function onFlyover(state, obj, r) {
    const f = FP.config.flyover, p = FP.config.powerups;
    if (obj.rewarded || !obj.flyoverEligible) return;
    const a = assess(state, obj, r);
    if (!a.qualified || a.risk < f.minRisk || a.effectiveTime < f.minEffective) return;
    const type = rewardType(a);
    obj.rewarded = true;
    if (type !== 'pollen' && state.power.shield) return;
    const pos = findSpawn(state, obj, a.risk);
    if (!pos) return;
    state.world.bonuses.push({
      type, x: pos.x, y: pos.y, r: p.radius[type], phase: state.rng.range(0, FP.TAU),
      forming: p.formMax, formMax: p.formMax, age: 0, originX: obj.x, originY: obj.y
    });
    state.events.push({ type: 'bonusSpawn', kind: type, x: pos.x, y: pos.y });
    FP.flow.say(state, FP.config.text.flyover[type], .95);
  }

  // --- Ramassage --------------------------------------------------------------

  function forgetGrazes(state, removed) {
    for (const o of removed) state.graze.active.delete(o);   // effacés : leurs frôlements ne paient rien
  }

  // Spore : onde de nettoyage ; 2 000 Ɇ par obstacle effacé, sans combo.
  function detonate(state, x, y) {
    const c = FP.config.powerups.spore, w = state.world, R = c.radius;
    const gone = (keep) => (o) => !keep(o);
    const keepSolid = (o) => dist(x, y, o.x, o.y) > R + o.broadR * c.solidK;
    const keepToxic = (o) => dist(x, y, o.x, o.y) > R + Math.max(o.rx, o.ry) * c.toxicK;
    const keepLeak = (l) => {
      const ca = Math.cos(l.angle), sa = Math.sin(l.angle);
      for (let i = 0; i <= 8; i++) { const k = -.5 + i / 8; if (dist(x, y, l.x + ca * l.len * k, l.y + sa * l.len * k) < R + l.r) return false; }
      return true;
    };
    const removed = [...w.solids.filter(gone(keepSolid)), ...w.leaks.filter(gone(keepLeak))];
    const solids = w.solids.length, all = w.solids.length + w.toxics.length + w.leaks.length;
    w.solids = w.solids.filter(keepSolid); w.toxics = w.toxics.filter(keepToxic); w.leaks = w.leaks.filter(keepLeak);
    forgetGrazes(state, removed);
    const solidCleaned = solids - w.solids.length;
    const cleaned = all - (w.solids.length + w.toxics.length + w.leaks.length);
    state.events.push({ type: 'bomb', x, y, r: R });
    if (solidCleaned > 0) FP.scoring.awardFlat(state, x, y, solidCleaned * c.ecoPerSolid);
    const s = cleaned > 1 ? 'S' : '';
    const eco = solidCleaned > 0 ? ' · +' + (solidCleaned * c.ecoPerSolid).toLocaleString('fr-FR') + ' Ɇ' : '';
    FP.flow.say(state, cleaned > 0 ? `SPORE : ${cleaned} DÉPÔT${s} NETTOYÉ${s}${eco}` : 'SPORE : ZONE NETTOYÉE', cleaned > 0 ? 1.35 : 1.18);
    state.camera.shake = Math.max(state.camera.shake, c.shakeBase + c.shakePerSolid * solidCleaned);
  }

  function collect(state, b) {
    const text = FP.config.text.pickup;
    if (b.type === 'water') {
      // La goutte crée une protection physique, visible, à usage unique et sans durée.
      state.power.shield = true;
      FP.flow.say(state, text.water, 1.15);
    } else if (b.type === 'pollen') {
      state.score.flowerBonus += 1;
      FP.flow.say(state, text.pollen, 1.05);
    } else {
      detonate(state, b.x, b.y);
    }
    if (b.type !== 'spore') state.events.push({ type: 'pickup', kind: b.type, x: b.x, y: b.y });
  }

  // --- Système ----------------------------------------------------------------

  function update(state, dt) {
    const p = FP.config.powerups, tip = state.plant.tip, playing = state.mode === 'playing' && tip;
    state.power.shieldGrace = Math.max(0, state.power.shieldGrace - dt);
    const keep = [];
    for (const b of state.world.bonuses) {
      b.age += dt;
      b.forming = Math.max(0, b.forming - dt);
      if (playing && b.forming <= 0 && dist(tip.x, tip.y, b.x, b.y) < b.r + p.pickupPad) { collect(state, b); continue; }
      // Une récompense ratée reste un choix raté : elle disparaît sans rien activer.
      const missed = (tip && b.forming <= 0 && tip.y < b.y - p.missedBehind) || b.age > p.maxAge;
      if (missed) { state.events.push({ type: 'bonusMissed', kind: b.type, x: b.x, y: b.y }); continue; }
      keep.push(b);
    }
    state.world.bonuses = keep;
  }

  FP.powerups = { assess, rewardType, onFlyover, update };
})();
