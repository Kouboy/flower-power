// play/flow.js — déroulé de partie : mort, éclosion, transitions, fin de partie.
// Lit     : state.mode, state.query, state.plant, state.input.pressed, state.events, state.rng, state.world.{surfaceY,width},
//           FP.config.{flow,text,toxic,garden,soil}.
// Écrit   : state.mode, state.flow, state.garden.flowers (création, croissance), state.plant.{reserves,oldTrails,corruption,toxicTimer,recentToxic}, state.score.flowers,
//           state.level, state.camera.shake, state.events (death, bloom, blossom, toxicEnter, ready) ; appelle FP.level.generate et FP.plant.prepare/launch.
// Expose  : FP.flow.update(state, dt), FP.flow.simplifyTrail(points, minStep). Les textes à l'écran sont l'affaire de ui/*.
// Porté de la v3.43.16 (die, bloom, transitions de update()) ; éclosion visuelle et fondu : étape 6.
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};


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

  // Les fleurs de l'éclosion, en éventail autour de la pointe, bornées à l'écran.
  function plantFlowers(state, count) {
    const g = FP.config.garden, rng = state.rng, bonus = state.score.flowerBonus, W = state.world.width;
    const spread = Math.min(g.spreadMax, g.spreadBase + bonus * g.spreadPerBonus), mid = (count - 1) / 2;
    for (let i = 0; i < count; i++) {
      const offset = (i - mid) * (count === 1 ? 0 : spread / Math.max(1, mid + 1)) + rng.range(-g.jitter, g.jitter);
      state.garden.flowers.push({
        x: FP.math.clamp(state.plant.tip.x + offset, g.edge, W - g.edge),
        size: 0, maxSize: i === 0 ? 1 : rng.range(g.extraSize[0], g.extraSize[1]), age: -FP.config.flow.hatchDelay,   // pousse quand la motte s'est fendue
        palette: g.palettes[Math.floor(rng.next() * g.palettes.length)], tilt: rng.range(-g.tilt, g.tilt)
      });
    }
  }

  // Chaque pollen ramassé ajoute une fleur (et fait avancer d'autant de niveaux, comme en v3).
  function bloom(state) {
    const cfg = FP.config.flow, p = state.plant, count = 1 + state.score.flowerBonus;
    plantFlowers(state, count);
    state.score.flowers += count;
    state.level += count;
    p.oldTrails.push(simplifyTrail(p.trail, cfg.trailSimplifyPx));
    if (p.oldTrails.length > cfg.oldTrailsMax) p.oldTrails.shift();
    // bloom : la motte se fend (terre projetée) ; blossom, hatchDelay plus tard : la fleur sort (anneau doré, pétales).
    const burst = { x: p.tip.x, y: state.world.surfaceY + FP.config.soil.surfaceOffset - 9, count, bonus: state.score.flowerBonus };
    state.events.push({ type: 'bloom', ...burst });
    state.flow.blossom = burst;
    state.camera.shake = Math.max(state.camera.shake, cfg.hatchShake);
    state.mode = 'bloom';
    state.flow.timer = cfg.bloomTime;
    state.flow.stage = 'show'; state.flow.fade = 0;
  }

  // cause : 'solid' | 'leak' | 'toxic' ; kind : famille de l'obstacle (cause solid uniquement).
  function die(state, cause, kind, reason) {
    const cfg = FP.config.flow, p = state.plant;
    p.reserves -= 1;
    state.events.push({ type: 'death', cause, kind, x: p.tip.x, y: p.tip.y });
    state.camera.shake = Math.max(state.camera.shake, cfg.deathShake);   // .28 pour toute mort, comme en v3
    if (p.reserves <= 0) { state.mode = 'over'; state.flow.overReason = reason; return; }
    state.mode = 'dying';
    state.flow.timer = cfg.dyingTime;
  }

  // Éclosion (v3 : bloom → fadeOut → fadeIn → ready) : on admire, fondu au noir, nouveau niveau sous le noir,
  // puis retour sur la graine. Le niveau n'est régénéré qu'au passage fadeOut → fadeIn.
  function bloomStages(state, cfg) {
    const f = state.flow, clamp = FP.math.clamp;
    if (f.stage === 'show') {
      if (f.blossom && cfg.bloomTime - f.timer >= cfg.hatchDelay) { state.events.push({ type: 'blossom', ...f.blossom }); f.blossom = null; }
      if (f.timer <= 0) { f.stage = 'fadeOut'; f.timer = cfg.fadeOutTime; f.fade = 0; }
    } else if (f.stage === 'fadeOut') {
      f.fade = clamp(1 - f.timer / cfg.fadeOutTime, 0, 1);
      if (f.timer <= 0) {
        FP.level.generate(state);
        FP.plant.prepare(state);
        f.stage = 'fadeIn'; f.timer = cfg.fadeInTime; f.fade = 1;
      }
    } else if (f.stage === 'fadeIn') {
      f.fade = clamp(f.timer / cfg.fadeInTime, 0, 1);
      if (f.timer <= 0) {
        f.fade = 0; f.stage = 'show';
        state.mode = 'ready';
        state.events.push({ type: 'ready' });
      }
    }
  }

  // Nappe toxique : pas de choc mais une exposition qui dévie la croissance, puis brûle la pointe.
  function expose(state, dt) {
    const t = FP.config.toxic, p = state.plant;
    if (state.query.toxic > 0) {
      p.toxicTimer += dt * t.exposureRate;
      p.corruption = Math.max(p.corruption, t.corruption);
      if (p.recentToxic <= 0) {
        p.recentToxic = t.messageCooldown;
        state.events.push({ type: 'toxicEnter', x: p.tip.x, y: p.tip.y });
      }
      if (p.toxicTimer > t.burnAt) die(state, 'toxic', null, FP.config.text.deathToxic);
    } else {
      p.toxicTimer = Math.max(0, p.toxicTimer - dt * t.recoveryRate);
    }
  }

  function update(state, dt) {
    const cfg = FP.config.flow, f = state.flow, p = state.plant, gr = FP.config.garden.growRate;
    for (const fl of state.garden.flowers) { fl.age += dt; if (fl.age > 0) fl.size = Math.min(fl.maxSize, fl.size + dt * gr * fl.maxSize); }
    p.corruption = Math.max(0, p.corruption - dt);
    p.recentToxic = Math.max(0, p.recentToxic - dt);

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
        if (f.timer <= 0) { FP.level.generate(state); FP.plant.launch(state); }
        break;
      case 'bloom':
        f.timer -= dt;
        bloomStages(state, cfg);
        break;
      case 'ready':
        if (state.input.pressed) FP.plant.launch(state);
        break;
    }
  }

  FP.flow = { update, simplifyTrail };
})();
