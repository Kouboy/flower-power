// play/plant.js — croissance et pilotage de la pousse.
// Lit     : state.input, state.time, state.score.flowers, state.world.{width,height}, FP.config.plant.
// Écrit   : state.plant, state.mode (lancement), state.camera.{y,shake}, state.events (stemStart).
// Expose  : FP.plant.prepare(state), FP.plant.launch(state), FP.plant.speed(state), FP.plant.update(state, dt).
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
    state.camera.y = Math.max(0, w.height - w.viewH);
  }

  function launch(state) {
    const p = state.plant, cfg = FP.config.plant;
    prepare(state);
    p.tip = { x: p.seed.x, y: p.seed.y };
    p.dir = { x: state.rng.range(-cfg.startWobble, cfg.startWobble), y: -1 };
    p.trail = [{ x: p.tip.x, y: p.tip.y }];
    p.guide = { x: p.tip.x, y: p.tip.y - cfg.idleLookAhead };
    p.stemCount += 1;
    state.mode = 'playing';
    state.events.push({ type: 'stemStart', n: p.stemCount });
  }

  // Les tiges accélèrent à chaque pousse, à chaque fleur, et pendant une pousse longue.
  function speed(state) {
    const p = state.plant, s = FP.config.plant.speed;
    const globalRamp = Math.max(0, p.stemCount - 1) * s.perStem + state.score.flowers * s.perFlower;
    const liveRamp = Math.min(s.liveMax, p.stemAge * s.livePerSec);
    const base = Math.min(s.max, s.base + globalRamp + liveRamp) * s.framing;
    return state.input.down ? base * s.controlled : base;
  }

  function update(state, dt) {
    if (state.mode !== 'playing') return;
    const p = state.plant, cfg = FP.config.plant, input = state.input, W = state.world.width;
    p.stemAge += dt;
    const v0 = speed(state);
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
      const turn = clamp((p.guide.x - p.tip.x) / c.turnDivisor, -1, 1);
      desiredX += turn * c.turnGain * lerp(c.sharpTop, c.sharpBottom, y01);
      desiredY = c.desiredY;
    } else {
      p.guide.x = lerp(p.guide.x, p.tip.x, clamp(dt * cfg.idleGuideRate, 0, 1));
      p.guide.y = p.tip.y - cfg.idleLookAhead;
    }

    // La tige peut serpenter, mais jamais faire demi-tour : elle cherche le jour.
    let v = FP.geom.clampUpAngle(desiredX, desiredY, controlled ? cfg.maxAngleControlled : cfg.maxAngleIdle);
    const steer = controlled ? cfg.steerControlled : cfg.steerIdle;
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

  FP.plant = { prepare, launch, speed, update };
})();
