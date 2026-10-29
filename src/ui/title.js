// ui/title.js — écran titre arcade. Au lancement, il est figé sous « PRESS TO START » (écran d'accueil) : le premier appui
// débloque le son, passe en plein écran sur écran tactile et réveille le titre (logo animé, « TOUCHER POUR POUSSER »).
// Lit     : state.mode, state.time, FP.config.text.{ready,pressStart,footer,record,saison,playtest}, FP.config.milieux, FP.params.sansboss, FP.scoring.records, FP.logo, FP.font, FP.view.ui.
// Écrit   : wake() — appelé par ui/menu.js au premier appui — passe state.mode de 'splash' à 'menu' et note state.fx.ui.awakeAt.
// Expose  : FP.title.draw(g, state), FP.title.clock(state), FP.title.wake(state), FP.title.wantsFullscreen(pointerType),
//           FP.title.iconRect(w, h), FP.title.hitIcon(artX, artY, w, h) (icône du réglage du son ; purs, testés), FP.title.playtestLine(params),
//           FP.title.recordLine(records) (progression la plus lointaine, pure, testée).
// Lit aussi : FP.audio.setting() (état de l'icône).
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  const FOOTER = '#c9a87a';

  // Temps de l'animation du titre : arrêté sur l'écran d'accueil, puis compté depuis le réveil.
  function clock(state) {
    if (state.mode === 'splash') return 0;
    const ui = state.fx.ui;
    return Math.max(0, state.time - ((ui && ui.awakeAt) || 0));
  }

  function wake(state) {
    const ui = state.fx.ui || (state.fx.ui = {});
    state.mode = 'menu';
    ui.awakeAt = state.time;
  }

  // Plein écran seulement au doigt ou au stylet : un clic de souris ou une touche laissent la fenêtre telle quelle.
  const wantsFullscreen = (pointerType) => pointerType === 'touch' || pointerType === 'pen';

  // Icône du réglage du son : coin haut droit, 12 × 10 pixels d'art ; zone de toucher agrandie de 6 px pour le doigt.
  const ICON = { w: 12, h: 10, margin: 4, touch: 6 };
  const iconRect = (w, h) => ({ x: w - ICON.margin - ICON.w, y: ICON.margin, w: ICON.w, h: ICON.h });
  function hitIcon(ax, ay, w, h) {
    const r = iconRect(w, h), t = ICON.touch;
    return ax >= r.x - t && ax <= r.x + r.w + t && ay >= r.y - t && ay <= r.y + r.h + t;
  }
  // Haut-parleur pixel : deux ondes (tout), une onde et une note barrée (effets seuls), une croix (muet).
  function drawIcon(g, w, h, setting) {
    const { x, y } = iconRect(w, h), INK = FP.font.INK, C = FP.font.COLORS;
    const px = (dx, dy, c, ww = 1, hh = 1) => { g.fillStyle = c; g.fillRect(x + dx, y + dy, ww, hh); };
    px(0, 2, INK, 7, 6); px(1, 3, C.cream, 2, 4); px(3, 1, INK, 4, 8); px(4, 2, C.cream, 2, 6);   // corps et pavillon
    if (setting === 'mute') { for (let i = 0; i < 4; i++) { px(8 + i, 3 + i, C.danger); px(11 - i, 3 + i, C.danger); } return; }
    px(8, 3, C.cream, 1, 4);   // première onde
    if (setting === 'all') { px(10, 2, C.cream); px(11, 3, C.cream, 1, 4); px(10, 7, C.cream); return; }
    px(10, 1, C.gold, 1, 6); px(9, 6, C.gold, 2, 2); px(9, 2, C.danger, 3, 1);   // note barrée : pas de musique
  }

  // Record de progression (v4.9.0) : « Record : DÉCHARGE », « Record : saison 2 » ; rien tant qu'on n'a pas quitté la friche.
  function recordLine(records) {
    const r = records.reach, text = FP.config.text;
    if (!r || (r.saison === 1 && r.milieu === 0)) return null;
    return text.record + ' ' + (r.saison > 1 ? text.saison + ' ' + r.saison : FP.config.milieux[r.milieu].name);
  }

  // Repère de la version playtest (v4.13.0) : affiché sous le logo quand l'adresse porte ?sansboss=1.
  const playtestLine = (params) => (params && params.sansboss ? FP.config.text.playtest : null);

  function draw(g, state) {
    const { w, h } = FP.view.ui, t = state.time, text = FP.config.text, L = FP.logo.layout(), splash = state.mode === 'splash';
    // ×2 quand il tient dans 90 % de la largeur (écran d'ordinateur) ; sur téléphone, ×1 est déjà le maximum.
    const s = L.width * 2 <= w * .9 ? 2 : 1;
    g.save(); g.translate(Math.round(w / 2 - L.width * s / 2), Math.round(h * .3 - (s - 1) * L.height / 2)); g.scale(s, s);
    FP.logo.draw(g, 0, 0, clock(state));
    g.restore();
    const tag = playtestLine(FP.params);
    if (tag) FP.font.draw(g, tag, w / 2, Math.round(h * .3 + (s + 1) * L.height / 2 + 6), { align: 'center', color: FOOTER });
    if (Math.floor(t * 1.8) % 2 === 0) FP.font.draw(g, splash ? text.pressStart : text.ready, w / 2, h - 46, { align: 'center' });
    const record = splash ? null : recordLine(FP.scoring.records);
    if (record) FP.font.draw(g, record, w / 2, h - 60, { align: 'center', color: FP.font.COLORS.gold });
    FP.font.draw(g, text.footer[0], w / 2, h - 20, { align: 'center', color: FOOTER });
    FP.font.draw(g, text.footer[1], w / 2, h - 11, { align: 'center', color: FOOTER });
    if (!splash) drawIcon(g, w, h, FP.audio.setting());
  }

  FP.title = { draw, clock, wake, wantsFullscreen, iconRect, hitIcon, recordLine, playtestLine };
})();
