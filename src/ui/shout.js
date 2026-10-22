// ui/shout.js — le cri de mort (« RACK SERVEUR ! ») en lettres qui tombent et rebondissent, et l'aide de la toute
// première pousse.
// Lit     : state.events (death), state.time, state.mode, state.plant.{stemCount,trail}, state.score.flowers, state.input.down,
//           FP.config.text.{death,deathDefault,shout,help}, FP.font, FP.hud.layout, FP.view.ui.
// Écrit   : state.fx.ui.{shout, shoutCue} uniquement (dernier cri ; lettres déjà sonnées).
// Expose  : FP.shout.textFor(event), FP.shout.helpFor(state), FP.shout.cues(state) (purs hors mémoire, testés), FP.shout.draw(g, state).
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  const FALL = .25, STAGGER = .03, DROP = 12, HOLD = 1.2, FADE = .3;
  const HELP_UNTIL = 90;   // points de trace : l'aide s'efface quand la pousse est bien partie (comme en v3)

  // Obstacle : ce qui suit « rupture : » dans le texte de mort ; limace et nappe : cris dédiés.
  function textFor(event) {
    const t = FP.config.text;
    if (event.cause === 'leak') return t.shout.leak;
    if (event.cause === 'toxic') return t.shout.toxic;
    const full = t.death[event.kind] || t.deathDefault, at = full.indexOf(' : ');
    return (at >= 0 ? full.slice(at + 3) : full).toLocaleUpperCase('fr-FR') + '\u00a0!';   // insécable : le « ! » ne part pas seul à la ligne
  }

  function helpFor(state) {
    const p = state.plant;
    if (state.mode !== 'playing' || p.stemCount !== 1 || state.score.flowers !== 0 || p.trail.length >= HELP_UNTIL) return null;
    return state.input.down ? FP.config.text.help.guide : FP.config.text.help.hold;
  }

  // Chaque lettre tombe de DROP pixels avec un rebond, décalée de la précédente ; puis le cri clignote et s'éteint.
  function drawShout(g, s, t) {
    const age = t - s.t0, { w, h } = FP.view.ui, font = FP.font;
    if (age > HOLD + FADE || (age > HOLD && Math.floor(age * 20) % 2)) return;
    const lines = font.wrap(s.text, w - 8, { scale: 2 }), lineH = font.HEIGHT * 2 + 4;
    let i = 0;
    lines.forEach((line, row) => {
      let x = Math.round(w / 2 - font.measure(line, { scale: 2 }) / 2);
      const y0 = Math.round(h / 3) + row * lineH;
      for (const ch of line) {
        const k = Math.max(0, Math.min(1, (age - i * STAGGER) / FALL));
        if (k > 0) {
          const bounce = k < .7 ? -DROP * (1 - k / .7) : -3 * Math.sin((k - .7) / .3 * Math.PI);
          font.draw(g, ch, x, y0 + Math.round(bounce), { scale: 2, color: font.COLORS.danger });
        }
        x += font.measure(ch, { scale: 2 }) + 2;
        i++;
      }
    });
  }

  // Largeur de la toile d'interface (celle de l'écran le plus étroit sous Node, sans toile).
  const uiWidth = () => (FP.view && FP.view.ui ? FP.view.ui.w : FP.config.view.minW / FP.px.SCALE);

  // Sons dus depuis le dernier appel : un « letter » par lettre (hors espaces) qui a fini de tomber, dans l'ordre du dessin.
  function cues(state) {
    const ui = state.fx.ui, s = ui && ui.shout;
    if (!s) return [];
    if (!ui.shoutCue || ui.shoutCue.t0 !== s.t0) ui.shoutCue = { t0: s.t0, n: 0 };
    const age = state.time - s.t0;
    let i = 0, landed = 0;
    for (const line of FP.font.wrap(s.text, uiWidth() - 8, { scale: 2 })) for (const ch of line) { if (!/\s/.test(ch) && age >= i * STAGGER + FALL) landed++; i++; }
    const out = Array(Math.max(0, landed - ui.shoutCue.n)).fill('letter');
    ui.shoutCue.n = Math.max(ui.shoutCue.n, landed);
    return out;
  }

  function draw(g, state) {
    const ui = state.fx.ui || (state.fx.ui = {});
    for (const e of state.events) if (e.type === 'death') ui.shout = { text: textFor(e), t0: state.time };
    for (const c of cues(state)) FP.audio.sfx(c);
    if (ui.shout) drawShout(g, ui.shout, state.time);
    const help = helpFor(state);
    if (help) FP.font.draw(g, help, FP.view.ui.w / 2, FP.hud.layout(FP.view.ui.h).textY, { align: 'center' });   // au-dessus du combo
  }

  FP.shout = { textFor, helpFor, cues, draw };
})();
