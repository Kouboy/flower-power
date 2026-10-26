// play/plant.js — croissance et pilotage de la pousse.
// Lit     : state.input (dont touch : doigt → joystick), state.time, state.rng, state.boosts (boutique), FP.config.{cast,shop}, state.score.flowers, state.world.{width,height,viewH}, state.plant.corruption, FP.config.plant.
// Écrit   : state.plant, state.mode (lancement), state.camera.{y,shake}, state.events (stemStart, growthTick) ;
//           remise à zéro par pousse de state.power.{shield,shieldGrace} et state.score.flowerBonus.
// Expose  : FP.plant.prepare(state), FP.plant.launch(state), FP.plant.speed(state), FP.plant.update(state, dt), FP.plant.stickTurn(screenX, width).
// Porté de la v3.43.16 (prepareStem, launchPreparedStem, partie « croissance » de update()).
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  const { clamp, lerp } = FP.math;

  // Graine posée au fond, pousse pas encore lancée.
  function prepare(state) {
    const p = state.plant, w = state.world;
    p.seed = { x: w.width / 2, y: w.height - FP.config.plant.seedOffset };
    p.tip = null;
    p.trail = [];
    p.stemAge = 0;
    p.corruption = 0; p.toxicTimer = 0; p.recentToxic = 0;
    p.scrapeTimer = 0;                    // la nouvelle tige gratte dès sa première frame
    // Chaque pousse repart sans bouclier ni pollen (v3 : prepareStem).
    state.power.shield = false; state.power.shieldGrace = 0; state.score.flowerBonus = 0;
    state.camera.y = Math.max(0, w.height - w.viewH);
  }

  // Personnage suivant de la pioche ; pioche vide → les 16 remélangés (Fisher-Yates, générateur propre à la pioche).
  function nextCharacter(p) {
    if (!p.cast.length) {
      p.cast = FP.config.cast.ids.slice();
      for (let i = p.cast.length - 1; i > 0; i--) { const j = Math.floor(p.castRng.next() * (i + 1)); [p.cast[i], p.cast[j]] = [p.cast[j], p.cast[i]]; }
    }
    return p.cast.shift();
  }

  function launch(state) {
    const p = state.plant, cfg = FP.config.plant;
    prepare(state);
    p.tip = { x: p.seed.x, y: p.seed.y };
    p.dir = { x: state.rng.range(-cfg.startWobble, cfg.startWobble), y: -1 };
    p.trail = [{ x: p.tip.x, y: p.tip.y }];
    p.guide = { x: p.tip.x, y: p.tip.y - cfg.idleLookAhead };
    p.stemCount += 1;
    p.character = nextCharacter(p);
    // Achats de la boutique (v4.6.0) : appliqués après prepare, qui remet le bouclier à zéro.
    if (state.boosts.membrane) state.power.shield = true;
    if (state.boosts.spore) { state.boosts.spore = false; FP.powerups.detonate(state, p.seed.x, p.seed.y); }
    state.mode = 'playing';
    state.events.push({ type: 'stemStart', n: p.stemCount });
  }

  // Joystick au doigt : tiers gauche → −1, tiers droit → +1 (virage maximal) ; tiers central → proportionnel à l'écart au
  // milieu de l'écran (0 au centre, ±1 à la limite du tiers : aucun saut).
  function stickTurn(screenX, width) { return clamp((screenX - width / 2) / (width / 6), -1, 1); }

  // Les tiges accélèrent à chaque pousse, à chaque fleur, et pendant une pousse longue.
  function speed(state) {
    const p = state.plant, s = FP.config.plant.speed;
    const globalRamp = Math.max(0, p.stemCount - 1) * s.perStem + state.score.flowers * s.perFlower;
    const liveRamp = Math.min(s.liveMax, p.stemAge * s.livePerSec);
    const base = Math.min(s.max, s.base + globalRamp + liveRamp) * s.framing * (p.corruption > 0 ? FP.config.plant.corrupted.speed : 1);
    const slow = state.boosts.compost ? FP.config.shop.compostK : 1;   // Compost lent (boutique)
    return (state.input.down ? base * s.controlled : base) * slow;
  }

  // La pointe qui creuse : un seul battement pour le grattement (audio) et les débris (rendu), comme en v3.
  // L'irrégularité est purement sensorielle : Math.random, pour ne pas décaler les tirages du niveau.
  function growthTick(state, dt, v) {
    const p = state.plant, t = FP.config.plant.tick;
    p.scrapeTimer -= dt;
    if (p.scrapeTimer > 0) return;
    const k = clamp(v / t.speedRef, 0, 1), near = p.tip.y < state.world.surfaceY + t.nearDist;
    p.scrapeTimer = lerp(t.slow, t.fast, k) * (near ? t.nearMul : 1) * lerp(t.jitterMin, t.jitterMax, Math.random());
    state.events.push({ type: 'growthTick', k, near });
  }

  function update(state, dt) {
    if (state.mode !== 'playing') return;
    const p = state.plant, cfg = FP.config.plant, input = state.input, W = state.world.width;
    p.stemAge += dt;
    const v0 = speed(state);
    growthTick(state, dt, v0);
    const controlled = input.down;

    let desiredX = Math.sin(state.time * cfg.swayFreq + p.tip.y * cfg.swayDepth) * cfg.swayAmp;
    let desiredY = -1;

    if (controlled) {
      // Le doigt n'est pas une cible à suivre au millimètre : il indique une intention latérale
      // devant la pointe. Haut de l'écran = courbe ample, bas = correction plus nerveuse.
      const c = cfg.control;
      const y01 = clamp(input.y / state.world.viewH, 0, 1);
      const lookAhead = lerp(c.lookAheadTop, c.lookAheadBottom, y01);
      p.guide.x = lerp(p.guide.x, input.x, clamp(dt * c.guideRate, 0, 1));
      p.guide.y = p.tip.y - lookAhead;
      // Au doigt (v4.7.0) : joystick sur la largeur de l'écran, quelle que soit la position de la tige ; à la souris, on vise le pointeur.
      const turn = input.touch ? stickTurn(input.screenX, state.world.width) : clamp((p.guide.x - p.tip.x) / c.turnDivisor, -1, 1);
      desiredX += turn * c.turnGain * lerp(c.sharpTop, c.sharpBottom, y01);
      desiredY = c.desiredY;
    } else {
      p.guide.x = lerp(p.guide.x, p.tip.x, clamp(dt * cfg.idleGuideRate, 0, 1));
      p.guide.y = p.tip.y - cfg.idleLookAhead;
    }

    const corrupted = p.corruption > 0, cc = cfg.corrupted;
    if (corrupted) {
      // Dans la terre contaminée, on ne perd pas de vie : la croissance se tord dans la main.
      desiredX += Math.sin(state.time * cc.swayFreq + p.tip.y * cc.swayDepth) * cc.swayAmp + Math.sin(state.time * cc.swayFreq2) * cc.swayAmp2;
      desiredY = Math.min(desiredY + cc.lift, cc.minUp);
    }

    // La tige peut serpenter, mais jamais faire demi-tour : elle cherche le jour.
    let v = FP.geom.clampUpAngle(desiredX, desiredY, controlled ? (corrupted ? cc.maxAngle : cfg.maxAngleControlled) : cfg.maxAngleIdle);
    const steer = controlled ? (corrupted ? cc.steerControlled : cfg.steerControlled) : (corrupted ? cc.steerIdle : cfg.steerIdle);
    p.dir.x = lerp(p.dir.x, v.x, clamp(dt * steer, 0, 1));
    p.dir.y = lerp(p.dir.y, v.y, clamp(dt * steer, 0, 1));
    v = FP.geom.clampUpAngle(p.dir.x, p.dir.y, cfg.maxAngleControlled);
    p.dir.x = v.x; p.dir.y = v.y;

    p.tip.x += p.dir.x * v0 * dt;
    p.tip.y += p.dir.y * v0 * dt;
    p.tip.x = clamp(p.tip.x, cfg.edge, W - cfg.edge);
    if (p.tip.x <= cfg.bounceZone || p.tip.x >= W - cfg.bounceZone) {
      p.dir.x *= cfg.bounce;
      state.camera.shake = Math.max(state.camera.shake, cfg.bounceShake);
    }
    const floor = state.world.height - cfg.floorOffset;
    if (p.tip.y > floor) { p.tip.y = floor; p.dir.y = -Math.abs(p.dir.y); }

    const last = p.trail[p.trail.length - 1];
    if (Math.hypot(p.tip.x - last.x, p.tip.y - last.y) > cfg.trailStep) {
      p.trail.push({ x: p.tip.x, y: p.tip.y });
      if (p.trail.length > cfg.trailMax) p.trail.shift();
    }
  }

  FP.plant = { prepare, launch, speed, update, stickTurn };
})();
