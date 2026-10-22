// ui/shout.js — le cri de mort (« RACK SERVEUR ! ») en lettres qui tombent et rebondissent, et l'aide de la toute
// première pousse.
// Lit     : state.events (death), state.time, state.mode, state.plant.{stemCount,trail}, state.score.flowers, state.input.down,
//           FP.config.text.{death,deathDefault,shout,help}, FP.font, FP.hud.MARGIN, FP.view.ui.
// Écrit   : state.fx.ui.shout uniquement ({ text, t0 } du dernier cri).
// Expose  : FP.shout.textFor(event), FP.shout.helpFor(state) (purs, testés), FP.shout.draw(g, state) (toile d'interface).
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
    return (at >= 0 ? full.slice(at + 3) : full).toLocaleUpperCase('fr-FR') + ' !';
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

  function draw(g, state) {
    const ui = state.fx.ui || (state.fx.ui = {});
    for (const e of state.events) if (e.type === 'death') ui.shout = { text: textFor(e), t0: state.time };
    if (ui.shout) drawShout(g, ui.shout, state.time);
    const help = helpFor(state);
    if (help) FP.font.draw(g, help, FP.view.ui.w / 2, FP.view.ui.h - FP.hud.MARGIN - 30, { align: 'center' });
  }

  FP.shout = { textFor, helpFor, draw };
})();
