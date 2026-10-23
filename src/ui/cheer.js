// ui/cheer.js — cri du chapelet complet (v4.5.0) : « KARMA ! » en lettres dorées qui tombent et rebondissent au-dessus de la
// pointe, le montant (« +400 ») dessous.
// Lit     : state.events (chainDone), state.time, state.camera.y, FP.font, FP.px.SCALE, FP.view.ui.
// Écrit   : state.fx.ui.cheer uniquement (dernier cri).
// Expose  : FP.cheer.lines(event), FP.cheer.width(text, scale), FP.cheer.layout(word, tipX, tipY, uiW) (purs, testés),
//           FP.cheer.draw(g, state).
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  const FALL = .18, STAGGER = .025, DROP = 8, LIFE = 1, RISE = 34, GAP = 2;

  const lines = (e) => [e.word, '+' + e.amount];
  // Largeur dessinée lettre à lettre (comme le cri de mort) : chaque lettre + GAP, sans le dernier.
  const width = (text, scale) => [...text].reduce((w, ch) => w + FP.font.measure(ch, { scale }) + GAP, -GAP);

  // Coin haut-gauche du mot : centré au-dessus de la pointe, ramené dans l'écran.
  function layout(word, tipX, tipY, uiW) {
    const w = width(word, 2);
    return { x: Math.round(Math.max(0, Math.min(uiW - w, tipX - w / 2))), y: Math.round(tipY - RISE) };
  }

  function draw(g, state) {
    const ui = state.fx.ui || (state.fx.ui = {}), S = FP.px.SCALE, font = FP.font, uiW = FP.view.ui.w;
    for (const e of state.events) if (e.type === 'chainDone') ui.cheer = { lines: lines(e), x: e.x, y: e.y, t0: state.time };
    const c = ui.cheer;
    if (!c) return;
    const age = state.time - c.t0;
    if (age > LIFE) { ui.cheer = null; return; }
    if (age > LIFE * .75 && Math.floor(age * 20) % 2) return;   // clignote avant de s'éteindre
    const [word, amount] = c.lines, tipX = c.x / S, p = layout(word, tipX, (c.y - state.camera.y) / S, uiW);
    let x = p.x, i = 0;
    for (const ch of word) {
      const k = Math.max(0, Math.min(1, (age - i * STAGGER) / FALL));
      if (k > 0) font.draw(g, ch, x, p.y + Math.round(k < .7 ? -DROP * (1 - k / .7) : -2 * Math.sin((k - .7) / .3 * Math.PI)), { scale: 2, color: font.COLORS.gold });
      x += font.measure(ch, { scale: 2 }) + GAP; i++;
    }
    if (age > word.length * STAGGER) {
      const aw = font.measure(amount);
      font.draw(g, amount, Math.round(Math.max(0, Math.min(uiW - aw, tipX - aw / 2))), p.y + font.HEIGHT * 2 + 3, { color: font.COLORS.gold });
    }
  }

  FP.cheer = { lines, width, layout, draw };
})();
