// ui/cheer.js — cri du chapelet complet (v4.5.0) : « KARMA ! » en lettres dorées qui tombent et rebondissent au-dessus de la
// pointe. Le montant s'affiche déjà avec le gain (render/effects.js) : le cri n'est que le mot.
// Petit cri de la bière (v5.2.0) : « SANTÉ ! » en petites lettres crème, qui monte au-dessus de la pointe quand une limace éclate.
// Lit     : state.events (chainDone, leakPop), state.time, state.camera.y, state.plant.tip, FP.config.text.pop, FP.font, FP.px.SCALE, FP.view.ui, FP.hud.safe (v5.11.0 : marges sûres).
// Écrit   : state.fx.ui.{cheer, pop} uniquement (dernier cri ; dernier « SANTÉ ! »).
// Expose  : FP.cheer.textFor(event), FP.cheer.width(text, scale), FP.cheer.layout(word, tipX, tipY, uiW, scale?), FP.cheer.anchor(state) (purs, testés),
//           FP.cheer.draw(g, state).
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  const FALL = .18, STAGGER = .025, DROP = 8, LIFE = 1, RISE = 34, GAP = 2;
  const POP_LIFE = .8, POP_RISE = 20, POP_FLOAT = 12;   // « SANTÉ ! » : durée (s), hauteur au-dessus de la pointe, montée (px d'interface)

  const textFor = (e) => e.word;
  // Largeur dessinée lettre à lettre (comme le cri de mort) : chaque lettre + GAP, sans le dernier.
  const width = (text, scale) => [...text].reduce((w, ch) => w + FP.font.measure(ch, { scale }) + GAP, -GAP);

  // La pointe dans le repère d'interface : le cri la suit (comme le « +Ɇ » du gain), au lieu de défiler avec le terrain.
  const anchor = (state) => ({ x: state.plant.tip.x / FP.px.SCALE, y: (state.plant.tip.y - state.camera.y) / FP.px.SCALE });

  // Coin haut-gauche du mot : centré au-dessus de la pointe, ramené dans l'écran (marges sûres du HUD).
  function layout(word, tipX, tipY, uiW, scale = 2) {
    const w = width(word, scale), S = FP.hud.safe();
    return { x: Math.round(Math.max(S.left, Math.min(uiW - S.right - w, tipX - w / 2))), y: Math.round(tipY - (scale === 2 ? RISE : POP_RISE)) };
  }

  // Largeur de la toile d'interface (celle de l'écran le plus étroit sous Node, sans toile).
  const uiWidth = () => (FP.view && FP.view.ui ? FP.view.ui.w : FP.config.view.minW / FP.px.SCALE);

  // Le petit cri monte en clignotant sur sa fin, puis s'efface.
  function drawPop(g, state, ui) {
    const p = ui.pop, age = state.time - p.t0, font = FP.font;
    if (age > POP_LIFE) { ui.pop = null; return; }
    if (age > POP_LIFE * .6 && Math.floor(age * 20) % 2) return;
    const a = anchor(state), at = layout(p.text, a.x, a.y, uiWidth(), 1);
    let x = at.x;
    for (const ch of p.text) { font.draw(g, ch, x, at.y - Math.round(POP_FLOAT * age / POP_LIFE), { color: font.COLORS.cream }); x += font.measure(ch) + GAP; }
  }

  function draw(g, state) {
    const ui = state.fx.ui || (state.fx.ui = {}), font = FP.font;
    for (const e of state.events) {
      if (e.type === 'chainDone') ui.cheer = { text: textFor(e), t0: state.time };
      else if (e.type === 'leakPop') ui.pop = { text: FP.config.text.pop, t0: state.time };
    }
    if (!state.plant.tip) return;
    if (ui.pop) drawPop(g, state, ui);
    const c = ui.cheer;
    if (!c) return;
    const age = state.time - c.t0;
    if (age > LIFE) { ui.cheer = null; return; }
    if (age > LIFE * .75 && Math.floor(age * 20) % 2) return;   // clignote avant de s'éteindre
    const a = anchor(state), p = layout(c.text, a.x, a.y, uiWidth());
    let x = p.x, i = 0;
    for (const ch of c.text) {
      const k = Math.max(0, Math.min(1, (age - i * STAGGER) / FALL));
      if (k > 0) font.draw(g, ch, x, p.y + Math.round(k < .7 ? -DROP * (1 - k / .7) : -2 * Math.sin((k - .7) / .3 * Math.PI)), { scale: 2, color: font.COLORS.gold });
      x += font.measure(ch, { scale: 2 }) + GAP; i++;
    }
  }

  FP.cheer = { textFor, width, layout, anchor, draw };
})();
