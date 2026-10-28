// ui/cards.js — cartons des milieux (v4.9.0) : entrée d'un milieu, annonce du boss, boss vaincu, et l'écran de fin de saison.
// Lit     : state.mode, state.run.{milieu,saison,card}, state.time, state.flow.timer (écran de fin), FP.config.{milieux,text.cards,flow.wonDelay},
//           FP.font, FP.view.ui.
// Écrit   : rien dans l'état (la toile d'interface uniquement).
// Expose  : FP.cards.textFor(state) → { title, lines } | null (pur, testé), FP.cards.draw(g, state).
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  const FADE = .3, VEIL = 'rgba(8, 4, 6, .82)', BAND = 'rgba(8, 4, 6, .6)';

  function textFor(state) {
    const t = FP.config.text.cards, r = state.run;
    if (state.mode === 'won') return { title: t.won.title, lines: [...t.won.lines, t.won.next + ' ' + r.saison] };
    if (!r.card) return null;
    const m = FP.config.milieux[r.milieu], n = FP.config.milieux.length;
    if (r.card.kind === 'milieu') {
      const place = t.milieu + ' ' + (r.milieu + 1) + '/' + n;
      return { title: r.saison > 1 ? t.saison + ' ' + r.saison + ' — ' + place : place, lines: [m.name, m.line] };
    }
    if (r.card.kind === 'boss') return { title: t.boss, lines: [m.boss.name, m.boss.order] };
    return { title: t.victory, lines: [m.boss.name] };
  }

  // Bloc centré au tiers haut (au centre pour l'écran de fin, sur un voile) : titre doré à l'échelle 2, lignes en dessous.
  function draw(g, state) {
    const c = textFor(state);
    if (!c) return;
    const font = FP.font, { w, h } = FP.view.ui, max = w - 16, won = state.mode === 'won';
    const age = won ? FP.config.flow.wonDelay - state.flow.timer : state.time - state.run.card.t0;
    if (age < FADE && Math.floor(age * 30) % 2) return;   // apparition : quelques clignotements
    const title = font.wrap(c.title, max, { scale: 2 }), lines = c.lines.flatMap(l => font.wrap(l, max));
    const rowT = font.HEIGHT * 2 + 4, rowL = font.HEIGHT + 4, total = title.length * rowT + 6 + lines.length * rowL;
    let y = Math.round(won ? (h - total) / 2 : h / 4 - total / 2);
    g.fillStyle = won ? VEIL : BAND;   // écran de fin : voile entier ; carton : bandeau qui détache le texte du terrain
    if (won) g.fillRect(0, 0, w, h); else g.fillRect(0, y - 6, w, total + 12);
    for (const l of title) { font.draw(g, l, w / 2, y, { scale: 2, align: 'center', color: font.COLORS.gold }); y += rowT; }
    y += 6;
    lines.forEach((l, i) => { font.draw(g, l, w / 2, y, { align: 'center', color: i === 0 && !won ? font.COLORS.cream : font.COLORS.eco }); y += rowL; });
  }

  FP.cards = { textFor, draw };
})();
