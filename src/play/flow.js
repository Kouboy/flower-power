// play/flow.js — déroulé de partie : mort, éclosion, transitions, fin de partie, messages.
// Lit     : state.mode, state.query, state.plant, state.input.pressed, state.events, state.world.surfaceY, FP.config.{flow,text,toxic}.
// Écrit   : state.mode, state.flow, state.plant.{reserves,oldTrails,corruption,toxicTimer,recentToxic}, state.score.flowers,
//           state.level, state.camera.shake, state.events (death, bloom, toxicEnter) ; appelle FP.level.generate et FP.plant.prepare/launch.
// Expose  : FP.flow.update(state, dt), FP.flow.simplifyTrail(points, minStep), FP.flow.say(state, text, time).
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

  // Chaque pollen ramassé ajoute une fleur (et fait avancer d'autant de niveaux, comme en v3).
  function bloom(state) {
    const cfg = FP.config.flow, p = state.plant, count = 1 + state.score.flowerBonus;
    state.score.flowers += count;
    state.level += count;
    p.oldTrails.push(simplifyTrail(p.trail, cfg.trailSimplifyPx));
    if (p.oldTrails.length > cfg.oldTrailsMax) p.oldTrails.shift();
    state.events.push({ type: 'bloom', x: p.tip.x, y: p.tip.y });
    state.mode = 'bloom';
    state.flow.timer = cfg.bloomTime;
    state.flow.messageTimer = 0;
  }

  // cause : 'solid' | 'leak' | 'toxic' ; kind : famille de l'obstacle (cause solid uniquement).
  function die(state, cause, kind, reason) {
    const cfg = FP.config.flow, text = FP.config.text, p = state.plant;
    p.reserves -= 1;
    state.events.push({ type: 'death', cause, kind, x: p.tip.x, y: p.tip.y });
    state.camera.shake = Math.max(state.camera.shake, cfg.deathShake);   // .28 pour toute mort, comme en v3
    if (p.reserves <= 0) { state.mode = 'over'; return; }
    say(state, reason + text.seedsLeft + p.reserves, cfg.deathMessageTime);
    state.mode = 'dying';
    state.flow.timer = cfg.dyingTime;
  }

  // Nappe toxique : pas de choc mais une exposition qui dévie la croissance, puis brûle la pointe.
  function expose(state, dt) {
    const t = FP.config.toxic, p = state.plant;
    if (state.query.toxic > 0) {
      p.toxicTimer += dt * t.exposureRate;
      p.corruption = Math.max(p.corruption, t.corruption);
      if (p.recentToxic <= 0) {
        say(state, FP.config.text.toxicEnter, t.messageTime);
        p.recentToxic = t.messageCooldown;
        state.events.push({ type: 'toxicEnter', x: p.tip.x, y: p.tip.y });
      }
      if (p.toxicTimer > t.burnAt) die(state, 'toxic', null, FP.config.text.deathToxic);
    } else {
      p.toxicTimer = Math.max(0, p.toxicTimer - dt * t.recoveryRate);
    }
  }

  function update(state, dt) {
    const cfg = FP.config.flow, f = state.flow, p = state.plant;
    p.corruption = Math.max(0, p.corruption - dt);
    p.recentToxic = Math.max(0, p.recentToxic - dt);
    for (const e of state.events) if (e.type === 'stemStart') say(state, FP.config.text.stem + e.n, cfg.stemMessageTime);
    if (f.messageTimer > 0) f.messageTimer = Math.max(0, f.messageTimer - dt);

    switch (state.mode) {
      case 'playing': {
        const q = state.query, text = FP.config.text;
        if (state.plant.tip.y <= state.world.surfaceY) bloom(state);
        else if (q.solid) die(state, 'solid', q.solid.kind, text.death[q.solid.kind] || text.deathDefault);
        else if (q.leak > 0) die(state, 'leak', null, text.deathLeak);
        else expose(state, dt);
        break;
      }
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

  FP.flow = { update, simplifyTrail, say };
})();
