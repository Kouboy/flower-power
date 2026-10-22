// render/hero.js — le héros : une tête-bourgeon à visage, dont l'expression raconte le danger.
// Lit     : state.mode, state.time, state.events (death), state.plant.toxicTimer, state.graze.active, state.query.{grazes,danger},
//           state.input.down, state.power.shield, state.plant.character, FP.config.toxic.burnAt, FP.px, FP.palette.hero, FP.faces, FP.cast.
// Écrit   : rien dans l'état (mémoire d'humeur interne, remise à zéro à chaque nouvelle partie).
// Expose  : FP.hero.mood(state, memory) → memory (pur) ; FP.hero.draw(actx, state, ax, ay, dir) ;
//           FP.hero.paint(actx, ax, ay, id, mood, opts) — une tête de personnage seule (testée) ;
//           FP.hero.face(actx, ax, ay, name, opts) — un visage seul, réutilisé par les fleurs.
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

  // Visage en pixels d'art autour de (ax, ay). opts : { gaze: {x, y}, blink, sweat, dizzy, t, cause, small }.
  function face(g, ax, ay, name, opts = {}) {
    const { px } = FP, c = FP.palette.hero, gx = (opts.gaze && opts.gaze.x) || 0, gy = (opts.gaze && opts.gaze.y) || 0, t = opts.t || 0;
    const eye = (x, y, w = 2, h = 2) => { px.rect(g, ax + x, ay + y, w, h, c.eye); };
    const pupil = (x, y) => px.rect(g, ax + x, ay + y, 1, 1, c.pupil);
    const shut = (x, y, w = 2) => px.rect(g, ax + x, ay + y, w, 1, c.pupil);
    const mouth = (x, y, w, h = 1, col = c.mouth) => px.rect(g, ax + x, ay + y, w, h, col);
    const L = -3, R = 1, EY = -2;   // yeux de 2 × 2 en (−3, −2) et (1, −2)
    switch (name) {
      case 'dead':
        if (opts.cause === 'melt') {                              // visage qui fond : yeux tombants, bouche qui coule
          eye(L, EY + 1, 2, 1); eye(R, EY + 1, 2, 1); pupil(L, EY + 2); pupil(R + 1, EY + 2);
          mouth(-2, 2, 4); mouth(-1, 3, 1, 2); mouth(1, 3, 1, 3);
        } else {                                                  // yeux en croix
          for (const x of [L - 1, R]) for (const [dx, dy] of [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]]) px.rect(g, ax + x + dx, ay + EY - 1 + dy, 1, 1, c.pupil);
          mouth(-2, 2, 4);
        }
        return;
      case 'joy':                                                 // yeux fermés de joie, grand sourire
        shut(L, EY); shut(R, EY); px.rect(g, ax + L, ay + EY - 1, 1, 1, c.pupil); px.rect(g, ax + R + 1, ay + EY - 1, 1, 1, c.pupil);
        mouth(-3, 1, 1); mouth(2, 1, 1); mouth(-2, 2, 4); mouth(-1, 3, 2, 1, c.tongue);
        return;
      case 'sleepy': eye(L, EY + 1, 2, 1); eye(R, EY + 1, 2, 1); shut(L, EY); shut(R, EY); mouth(-1, 2, 2); return;
      case 'asleep':
        shut(L, EY + 1); shut(R, EY + 1); mouth(-1, 2, 2);
        if (!opts.small) { px.rect(g, ax + 4, ay - 6, 2, 1, c.eye); px.rect(g, ax + 5, ay - 5, 1, 1, c.eye); px.rect(g, ax + 4, ay - 4, 2, 1, c.eye); }
        return;
      case 'smirk': eye(L, EY); eye(R, EY); pupil(L + 1, EY + 1); pupil(R + 1, EY + 1); mouth(-1, 2, 3); mouth(2, 1, 1); return;
      case 'blush': eye(L, EY); eye(R, EY); pupil(L, EY + 1); pupil(R + 1, EY + 1); mouth(-1, 2, 2); px.rect(g, ax - 5, ay, 2, 1, c.blush); px.rect(g, ax + 3, ay, 2, 1, c.blush); return;
      case 'wink': eye(L, EY); pupil(L + 1, EY + 1); shut(R, EY + 1); mouth(-2, 2, 3); mouth(1, 1, 1); return;
      case 'tongue': shut(L, EY + 1); shut(R, EY + 1); mouth(-1, 2, 3); mouth(0, 3, 1, 2, c.tongue); return;
      case 'shield':                                              // paupières mi-closes, sourire en coin : sûr de lui
        if (opts.blink) { shut(L, EY + 1); shut(R, EY + 1); } else { eye(L, EY); eye(R, EY); shut(L, EY); shut(R, EY); pupil(L + 1, EY + 1); pupil(R + 1, EY + 1); }
        mouth(-2, 2, 3); mouth(1, 1, 1); return;
    }
    // Humeurs du héros en jeu.
    if (opts.blink && name !== 'alarm') { shut(L, EY + 1); shut(R, EY + 1); }
    else if (name === 'alarm') {                                  // gros yeux ronds
      eye(L - 1, EY - 1, 3, 3); eye(R, EY - 1, 3, 3); pupil(L, EY); pupil(R + 1, EY);
    } else if (name === 'graze') {                                // yeux plissés
      shut(L, EY + 1); shut(R, EY + 1); px.rect(g, ax + L, ay + EY, 1, 1, c.brow); px.rect(g, ax + R + 1, ay + EY, 1, 1, c.brow);
    } else {
      eye(L, EY); eye(R, EY);
      if (name === 'toxic' && opts.dizzy) {                       // pupilles qui tournent
        const k = Math.floor(t * 8) % 4, o = [[0, 0], [1, 0], [1, 1], [0, 1]][k];
        pupil(L + o[0], EY + o[1]); pupil(R + 1 - o[0], EY + 1 - o[1]);
      } else {
        // Regard : vers le côté où la pousse tourne ; tout droit, les pupilles se rapprochent (air concentré sur la route).
        const dy = gy > .35 ? 1 : 0, side = gx > .3 ? 1 : (gx < -.3 ? -1 : 0);
        pupil(L + (side < 0 ? 0 : 1), EY + dy); pupil(R + (side > 0 ? 1 : 0), EY + dy);
      }
      if (name === 'focus') { px.rect(g, ax + L, ay + EY - 2, 2, 1, c.brow); px.rect(g, ax + R, ay + EY - 2, 2, 1, c.brow); px.rect(g, ax + L + 1, ay + EY - 1, 1, 1, c.brow); px.rect(g, ax + R, ay + EY - 1, 1, 1, c.brow); }
    }
    if (name === 'graze') { mouth(-2, 1, 4, 2, c.teeth); mouth(-2, 1, 4); mouth(-2, 2, 1); mouth(1, 2, 1); }
    else if (name === 'alarm') mouth(-1, 2, 2, 2);
    else if (name === 'toxic') { mouth(-2, 2, 1); mouth(-1, 1, 1); mouth(0, 2, 1); mouth(1, 1, 1); mouth(1, 2, 1, 2, c.tongue); }
    else if (name === 'focus') mouth(-2, 2, 4);
    else mouth(-1, 2, 2);
    if (opts.sweat) { px.rect(g, ax + 4, ay - 4, 1, 1, c.sweat); px.rect(g, ax + 4, ay - 3, 2, 2, c.sweat); }
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

  FP.hero = { mood, draw, paint, face };
})();
