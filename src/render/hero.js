// render/hero.js — le héros : une tête-bourgeon à visage, dont l'expression raconte le danger.
// Lit     : state.mode, state.time, state.events (death), state.plant.toxicTimer, state.graze.active, state.query.{grazes,danger},
//           state.input.down, state.power.shield, state.plant.character, FP.config.toxic.burnAt, FP.px, FP.palette.hero, FP.faces, FP.cast.
// Écrit   : rien dans l'état (mémoire d'humeur interne, remise à zéro à chaque nouvelle partie).
// Expose  : FP.hero.mood(state, memory) → memory (pur) ; FP.hero.draw(actx, state, ax, ay, dir) ;
//           FP.hero.paint(actx, ax, ay, id, mood, opts) — une tête de personnage seule (testée).
// Les visages restent droits (lisibles) : seul le regard suit la pousse. Ne touche pas au DOM : testable sous Node.
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};

  const HOLD = .25;   // tenue minimale d'une humeur (s), contre le clignotement entre deux humeurs

  // Humeur selon l'état, par priorité : mort, toxique, frôlement, alerte, bouclier, concentration, calme.
  function mood(state, memory) {
    const t = state.time, p = state.plant;
    let cause = memory && state.mode !== 'playing' ? memory.cause : null;
    for (const e of state.events) if (e.type === 'death') cause = e.cause === 'solid' ? 'solid' : 'melt';
    const grazes = (state.query && state.query.grazes) || [];
    const dizzy = p.toxicTimer / FP.config.toxic.burnAt > .6;
    const sweat = grazes.some(g => g.intensity > .7);
    let name = 'calm';
    if ((state.mode === 'dying' || state.mode === 'over') && cause) name = 'dead';
    else if (p.toxicTimer > 0) name = 'toxic';
    else if (state.graze.active.size > 0) name = 'graze';
    else if (state.query && state.query.danger > .45) name = 'alarm';
    else if (state.power && state.power.shield) name = 'shield';   // sous la membrane : sûr de lui
    else if (state.input.down) name = 'focus';
    if (memory && name !== memory.name && name !== 'dead' && t - memory.since < HOLD) name = memory.name;
    return { name, since: memory && memory.name === name ? memory.since : t, cause, sweat, dizzy };
  }

  // Clignement : une fois par fenêtre de 3,5 s, à un instant pseudo-aléatoire, pendant 0,12 s.
  function blinking(t) {
    const k = Math.floor(t / 3.5), o = Math.abs(Math.sin(k * 12.9898) * 43758.5453) % 1 * 3.3;
    return t - k * 3.5 - o >= 0 && t - k * 3.5 - o < .12;
  }

  // Tête-bourgeon (15 px) : feuilles basses, pointe, contour, chair, ombre, reflet. Teinte verdâtre dans le toxique.
  function head(g, ax, ay, toxic, tip) {
    const { px } = FP, c = FP.palette.hero, skin = toxic ? c.toxic : c.skin, shade = toxic ? c.toxicShade : c.skinShade;
    px.disc(g, ax - 7, ay + 5, 2, c.outline); px.disc(g, ax + 7, ay + 5, 2, c.outline);
    px.disc(g, ax - 7, ay + 5, 1, shade); px.disc(g, ax + 7, ay + 5, 1, shade);
    if (tip) { px.rect(g, ax - 1, ay - 9, 2, 2, c.outline); px.rect(g, ax, ay - 8, 1, 1, skin); }
    px.disc(g, ax, ay, 7, c.outline);
    px.disc(g, ax, ay, 6, skin);
    px.rect(g, ax - 5, ay + 4, 11, 2, shade); px.rect(g, ax - 3, ay + 6, 7, 1, shade);
    px.rect(g, ax - 5, ay + 1, 1, 2, c.skinLight);
  }

  // Une tête de personnage dans une humeur : tête, couches du personnage, yeux et bouche (communs sauf exception), sueur.
  // o : { gaze: {x, y}, blink, sweat, dizzy, t, cause }. La bouche du personnage ne sort qu'au calme et en concentration.
  function paint(g, ax, ay, id, mood, o = {}) {
    const def = FP.cast.get(id) || {}, toxic = mood === 'toxic', c = FP.palette.hero;
    const opts = { ...o, skin: toxic ? c.toxic : c.skin };
    head(g, ax, ay, toxic, def.tip !== false);
    if (def.back) def.back(g, ax, ay, mood, opts);
    (def.eyes || FP.faces.eyes)(g, ax, ay, mood, opts);
    if (def.mouth && (mood === 'calm' || mood === 'focus')) def.mouth(g, ax, ay, mood, opts); else FP.faces.mouth(g, ax, ay, mood, opts);
    if (def.front) def.front(g, ax, ay, mood, opts);
    if (o.sweat) FP.faces.sweat(g, ax, ay);
  }

  let owner = null, memory = null;

  function draw(g, state, ax, ay, dir) {
    if (state !== owner) { owner = state; memory = null; }
    memory = mood(state, memory);
    paint(g, ax, ay, state.plant.character, memory.name, { gaze: dir, blink: memory.name !== 'dead' && blinking(state.time), sweat: memory.sweat, dizzy: memory.dizzy, t: state.time, cause: memory.cause });
  }

  FP.hero = { mood, draw, paint };
})();
