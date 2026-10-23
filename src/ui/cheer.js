// ui/cheer.js — cri du chapelet complet (v4.5.0) : « KARMA ! » en lettres dorées qui tombent et rebondissent au-dessus de la
// pointe. Le montant s'affiche déjà avec le gain (render/effects.js) : le cri n'est que le mot.
// Lit     : state.events (chainDone), state.time, state.camera.y, state.plant.tip, FP.font, FP.px.SCALE, FP.view.ui, FP.hud.MARGIN.
// Écrit   : state.fx.ui.cheer uniquement (dernier cri).
// Expose  : FP.cheer.textFor(event), FP.cheer.width(text, scale), FP.cheer.layout(word, tipX, tipY, uiW), FP.cheer.anchor(state) (purs, testés),
//           FP.cheer.draw(g, state).
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  const FALL = .18, STAGGER = .025, DROP = 8, LIFE = 1, RISE = 34, GAP = 2;

  const textFor = (e) => e.word;
  // Largeur dessinée lettre à lettre (comme le cri de mort) : chaque lettre + GAP, sans le dernier.
  const width = (text, scale) => [...text].reduce((w, ch) => w + FP.font.measure(ch, { scale }) + GAP, -GAP);

  // La pointe dans le repère d'interface : le cri la suit (comme le « +Ɇ » du gain), au lieu de défiler avec le terrain.
  const anchor = (state) => ({ x: state.plant.tip.x / FP.px.SCALE, y: (state.plant.tip.y - state.camera.y) / FP.px.SCALE });

  // Coin haut-gauche du mot : centré au-dessus de la pointe, ramené dans l'écran (marge du HUD).
  function layout(word, tipX, tipY, uiW) {
    const w = width(word, 2), m = FP.hud.MARGIN;
    return { x: Math.round(Math.max(m, Math.min(uiW - m - w, tipX - w / 2))), y: Math.round(tipY - RISE) };
  }

  function draw(g, state) {
    const ui = state.fx.ui || (state.fx.ui = {}), font = FP.font;
    for (const e of state.events) if (e.type === 'chainDone') ui.cheer = { text: textFor(e), t0: state.time };
    const c = ui.cheer;
    if (!c || !state.plant.tip) return;
    const age = state.time - c.t0;
    if (age > LIFE) { ui.cheer = null; return; }
    if (age > LIFE * .75 && Math.floor(age * 20) % 2) return;   // clignote avant de s'éteindre
    const a = anchor(state), p = layout(c.text, a.x, a.y, FP.view.ui.w);
    let x = p.x, i = 0;
    for (const ch of c.text) {
      const k = Math.max(0, Math.min(1, (age - i * STAGGER) / FALL));
      if (k > 0) font.draw(g, ch, x, p.y + Math.round(k < .7 ? -DROP * (1 - k / .7) : -2 * Math.sin((k - .7) / .3 * Math.PI)), { scale: 2, color: font.COLORS.gold });
      x += font.measure(ch, { scale: 2 }) + GAP; i++;
    }
  }

  FP.cheer = { textFor, width, layout, anchor, draw };
})();
