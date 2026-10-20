// play/flow.js — déroulé de partie : mort, éclosion, transitions, fin de partie, messages.
// Lit     : state.mode, state.query, state.plant, state.input.pressed, state.events, FP.config.{flow,text}.
// Écrit   : state.mode, state.flow, state.plant.{reserves,oldTrails}, state.score.flowers, state.level,
//           state.camera.shake, state.events (death, bloom) ; appelle FP.level.generate et FP.plant.prepare/launch.
// Expose  : FP.flow.update(state, dt), FP.flow.simplifyTrail(points, minStep).
// Porté de la v3.43.16 (die, bloom, transitions de update()) ; éclosion visuelle et fondu : étape 6.
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};

  function say(state, text, time) {
    state.flow.message = text;
    state.flow.messageTimer = time;
  }

  // Ancienne trace allégée : un point tous les minStep px, extrémités conservées.
  function simplifyTrail(points, minStep) {
    if (points.length <= 3) return points.map(p => ({ x: p.x, y: p.y }));
    const out = [{ x: points[0].x, y: points[0].y }];
    let last = points[0];
    for (let i = 1; i < points.length - 1; i++) {
      const p = points[i];
      if (Math.hypot(p.x - last.x, p.y - last.y) > minStep) { out.push({ x: p.x, y: p.y }); last = p; }
    }
    const end = points[points.length - 1];
    out.push({ x: end.x, y: end.y });
    return out;
  }

  function bloom(state) {
    const cfg = FP.config.flow, p = state.plant;
    state.score.flowers += 1;
    state.level += 1;
    p.oldTrails.push(simplifyTrail(p.trail, cfg.trailSimplifyPx));
    if (p.oldTrails.length > cfg.oldTrailsMax) p.oldTrails.shift();
    state.events.push({ type: 'bloom', x: p.tip.x, y: p.tip.y });
    state.mode = 'bloom';
    state.flow.timer = cfg.bloomTime;
    state.flow.messageTimer = 0;
  }

  function die(state, solid) {
    const cfg = FP.config.flow, text = FP.config.text, p = state.plant;
    p.reserves -= 1;
    state.events.push({ type: 'death', kind: solid.kind, x: p.tip.x, y: p.tip.y });
    state.camera.shake = Math.max(state.camera.shake, cfg.deathShake);
    if (p.reserves <= 0) { state.mode = 'over'; return; }
    say(state, (text.death[solid.kind] || text.deathDefault) + text.seedsLeft + p.reserves, cfg.deathMessageTime);
    state.mode = 'dying';
    state.flow.timer = cfg.dyingTime;
  }

  function update(state, dt) {
    const cfg = FP.config.flow, f = state.flow;
    for (const e of state.events) if (e.type === 'stemStart') say(state, FP.config.text.stem + e.n, cfg.stemMessageTime);
    if (f.messageTimer > 0) f.messageTimer = Math.max(0, f.messageTimer - dt);

    switch (state.mode) {
      case 'playing':
        if (state.plant.tip.y <= state.world.surfaceY) bloom(state);
        else if (state.query.solid) die(state, state.query.solid);
        break;
      case 'dying':
        f.timer -= dt;
        if (f.timer <= 0) { FP.level.generate(state); FP.plant.launch(state); say(state, FP.config.text.stem + state.plant.stemCount, cfg.stemMessageTime); }
        break;
      case 'bloom':
        f.timer -= dt;
        if (f.timer <= 0) {
          FP.level.generate(state);
          FP.plant.prepare(state);
          state.mode = 'ready';
          say(state, FP.config.text.ready, cfg.readyMessageTime);
        }
        break;
      case 'ready':
        if (state.input.pressed) { FP.plant.launch(state); say(state, FP.config.text.stem + state.plant.stemCount, cfg.stemMessageTime); }
        break;
    }
  }

  FP.flow = { update, simplifyTrail };
})();
