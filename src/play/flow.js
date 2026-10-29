// play/flow.js — déroulé de partie : mort, éclosion, transitions, fin de partie.
// Lit     : state.mode, state.query, state.plant, state.input.pressed, state.events, state.rng, state.boosts.filter, state.world.{surfaceY,width},
//           FP.config.{flow,text,toxic,garden,soil,boss}.
// Écrit   : state.mode, state.flow, state.run (seul à l'écrire : milieu, pousses, boss, saison, carton), state.garden.flowers (création, croissance), state.plant.{reserves,oldTrails,corruption,toxicTimer,recentToxic}, state.score.flowers,
//           state.level, state.camera.shake, state.score.eco et state.events (death, bloom, blossom, toxicEnter, ready, bossDown) ; appelle FP.level.generate, FP.plant.prepare/launch,
//           FP.scoring.awardFlat (bonus du boss) et FP.boss.reset (milieu suivant).
// Expose  : FP.flow.update(state, dt), FP.flow.simplifyTrail(points, minStep), FP.flow.afterShop(state, after) (fin du bon de commande),
//           FP.flow.continueAfterWin(state) (écran de fin → saison suivante).
//           Entre deux pousses (et après la dernière mort), FP.shop.open ouvre le bon de commande (mode shop). Les textes à l'écran sont l'affaire de ui/*.
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
        palette: g.palettes[Math.floor(rng.next() * g.palettes.length)], tilt: rng.range(-g.tilt, g.tilt),
        character: state.plant.character   // clones de la pousse
      });
    }
  }

  // Chaque pollen ramassé ajoute une fleur (et fait avancer d'autant de niveaux, comme en v3).
  function bloom(state) {
    const cfg = FP.config.flow, p = state.plant, count = 1 + state.score.flowerBonus;
    state.boosts = {};   // fin de pousse : les achats de la boutique s'arrêtent là
    const main = state.garden.flowers.length;   // la fleur principale de l'éclosion (le halo s'ouvre sur son cœur)
    plantFlowers(state, count);
    state.score.flowers += count;
    state.level += count;
    // Milieux (v4.9.0) : une éclosion fait avancer d'une pousse (pollen ou non) ; celle du niveau de boss le bat.
    const r = state.run;
    if (r.boss) {
      r.bosses += 1; r.card = { kind: 'victory', t0: state.time }; state.flow.next = 'milieu';
      FP.scoring.awardFlat(state, p.tip.x, state.world.surfaceY, FP.config.boss.bonus);
      state.events.push({ type: 'bossDown', x: p.tip.x, y: state.world.surfaceY });
    }
    else if ((r.step += 1) >= FP.config.run.steps) { r.boss = true; state.flow.next = 'boss'; }
    p.oldTrails.push(simplifyTrail(p.trail, cfg.trailSimplifyPx));
    if (p.oldTrails.length > cfg.oldTrailsMax) p.oldTrails.shift();
    // bloom : la motte se fend (terre projetée) ; blossom, hatchDelay plus tard : la fleur sort (anneau doré, pétales).
    const burst = { x: p.tip.x, y: state.world.surfaceY + FP.config.soil.surfaceOffset - 9, count, bonus: state.score.flowerBonus, flower: main };
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
    state.boosts = {};   // fin de pousse : les achats de la boutique s'arrêtent là
    p.reserves -= 1;
    state.events.push({ type: 'death', cause, kind, x: p.tip.x, y: p.tip.y });
    state.camera.shake = Math.max(state.camera.shake, cfg.deathShake);   // .28 pour toute mort, comme en v3
    state.flow.overReason = reason;   // gardé pour le certificat si la dernière chance est refusée
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
        if (f.next === 'milieu') nextMilieu(state);   // boss vaincu : le nouveau niveau est celui du milieu suivant
        FP.level.generate(state);
        FP.plant.prepare(state);
        f.stage = 'fadeIn'; f.timer = cfg.fadeInTime; f.fade = 1;
      }
    } else if (f.stage === 'fadeIn') {
      f.fade = clamp(f.timer / cfg.fadeInTime, 0, 1);
      if (f.timer <= 0) {
        f.fade = 0; f.stage = 'show';
        const next = f.next; f.next = null;
        if (f.won) { f.won = false; state.mode = 'won'; f.timer = cfg.wonDelay; }   // première saison terminée : écran de fin
        else if (next === 'boss') FP.shop.open(state, { after: 'bloom' });       // bon de commande avant le boss, puis « prête »
        else afterShop(state, 'bloom');
      }
    }
  }

  // Milieu suivant (après un boss) ; après le dernier, saison suivante au premier milieu, et l'écran de fin la toute première fois.
  function nextMilieu(state) {
    const r = state.run;
    r.milieu += 1; r.step = 0; r.boss = false;
    FP.boss.reset(state);
    if (r.milieu >= FP.config.milieux.length) {
      r.milieu = 0; r.saison += 1;
      if (!r.won) { r.won = true; state.flow.won = true; }
    }
    r.card = { kind: 'milieu', t0: state.time };
  }

  // Nappe toxique : pas de choc mais une exposition qui dévie la croissance, puis brûle la pointe.
  function expose(state, dt) {
    const t = FP.config.toxic, p = state.plant;
    if (state.query.toxic > 0) {
      p.toxicTimer += dt * t.exposureRate * FP.plant.speed(state) / t.refSpeed;   // à la distance parcourue, pas au temps
      p.corruption = Math.max(p.corruption, t.corruption);
      if (p.recentToxic <= 0) {
        p.recentToxic = t.messageCooldown;
        state.events.push({ type: 'toxicEnter', x: p.tip.x, y: p.tip.y });
      }
      if (p.toxicTimer > t.burnAt && !state.boosts.filter) die(state, 'toxic', null, FP.config.text.deathToxic);   // Filtre à charbon (boutique)
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
        if (f.timer <= 0) {
          if (p.reserves <= 0) FP.shop.open(state, { after: 'last' });   // dernière chance : la Graine Bio™ est garantie
          else { FP.level.generate(state); FP.plant.prepare(state); toReady(state); }
        }
        break;
      case 'bloom':
        f.timer -= dt;
        bloomStages(state, cfg);
        break;
      case 'won':   // écran de fin : un appui, passé un court délai, lance la saison suivante
        f.timer -= dt;
        if (f.timer <= 0 && state.input.pressed) continueAfterWin(state);
        break;
      case 'ready':
        germinate(state, dt, cfg);
        break;
    }
  }

  // Fin du bon de commande : on reprend là où la pousse s'était arrêtée.
  function afterShop(state, after) {
    if (after === 'last') {
      if (state.plant.reserves <= 0) { state.mode = 'over'; return; }
      if (!state.boosts.lobbying) { FP.level.generate(state); FP.plant.prepare(state); }   // Lobbying a déjà regénéré le niveau
    }
    toReady(state);
  }

  // Après l'écran de fin : la saison suivante commence (son carton de milieu est déjà prêt).
  function continueAfterWin(state) { toReady(state); }

  // Toute pousse attend sur sa graine qu'on la fasse germer (v4.7.0).
  // Sur le niveau de boss (après le bon, une mort ou la dernière chance), son carton rappelle l'objectif à chaque graine.
  function toReady(state) {
    state.mode = 'ready'; state.plant.germ = 0; state.events.push({ type: 'ready' });
    if (state.run.boss) state.run.card = { kind: 'boss', t0: state.time };
  }

  // Germination : maintenir remplit (germTime), lâcher vide (germBack) ; deux fissures à 1/3 et 2/3, puis la pousse part.
  // Au clavier, on ne peut pas « maintenir » : un appui fait germer d'un coup.
  function germinate(state, dt, cfg) {
    const p = state.plant, before = p.germ || 0, i = state.input;
    p.germ = i.key ? 1 : (i.down ? Math.min(1, before + dt / cfg.germTime) : Math.max(0, before - dt / cfg.germBack));
    for (const th of [1 / 3, 2 / 3]) if (before < th && p.germ >= th) state.events.push({ type: 'germCrack', x: p.seed.x, y: p.seed.y });
    if (p.germ >= 1) { state.events.push({ type: 'germPop', x: p.seed.x, y: p.seed.y }); state.run.card = null; FP.plant.launch(state); }
  }

  FP.flow = { update, simplifyTrail, afterShop, continueAfterWin };
})();
