// render/hud.js — informations à l'écran (repère écran, hors zoom).
// Lit     : state.mode, state.flow.{message,messageTimer}, state.plant.{reserves,stemCount,trail}, state.score.flowers,
//           state.input.down, FP.view, FP.config.text.
// Écrit   : rien (le canvas uniquement).
// Expose  : FP.hud.draw(ctx, state).
// Porté de la v3.43.16 (drawHUD) ; ÉcoCrédits™, combo et pollen arrivent aux étapes 4 et 5.
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  const { clamp } = FP.math;
  const FONT = 'system-ui,-apple-system,Segoe UI,sans-serif';

  function box(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
    ctx.fillStyle = 'rgba(12,9,7,.56)'; ctx.fill();
    ctx.strokeStyle = 'rgba(255,238,181,.18)'; ctx.stroke();
  }

  function drawPanels(ctx, state, W, H) {
    const boxY = H - 78, boxW = 146, boxH = 64;
    ctx.font = `700 14px ${FONT}`; ctx.textBaseline = 'top'; ctx.textAlign = 'left';
    box(ctx, 12, boxY, boxW, boxH, 15);
    ctx.fillStyle = '#ffeeb5'; ctx.fillText('fleurs ' + state.score.flowers, 24, boxY + 8);
    box(ctx, W - boxW - 12, boxY, boxW, boxH, 15);
    ctx.fillStyle = '#d9c798'; ctx.fillText('graines ' + state.plant.reserves, W - boxW, boxY + 8);
    ctx.fillStyle = '#bda982'; ctx.fillText('élan ' + Math.round(100 + Math.max(0, state.plant.stemCount - 1) * 3) + '%', W - boxW, boxY + 28);
  }

  function drawMessage(ctx, state, W) {
    const f = state.flow;
    if (f.messageTimer <= 0 || !f.message) return;
    ctx.globalAlpha = clamp(f.messageTimer, 0, 1);
    ctx.font = `800 20px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillStyle = 'rgba(0,0,0,.38)'; ctx.fillText(f.message, W / 2 + 1, 41);
    ctx.fillStyle = '#fff0ae'; ctx.fillText(f.message, W / 2, 40);
    ctx.globalAlpha = 1;
  }

  function drawReady(ctx, W, H) {
    ctx.globalAlpha = .92; ctx.font = `800 18px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.beginPath(); ctx.roundRect(34, H - 126, W - 68, 34, 17); ctx.fillStyle = 'rgba(7,5,4,.56)'; ctx.fill();
    ctx.fillStyle = '#fff0ae'; ctx.fillText(FP.config.text.ready, W / 2, H - 118);
    ctx.globalAlpha = 1;
  }

  // Fin de partie minimale ; l'écran de records arrive à l'étape 6.
  function drawOver(ctx, state, W, H) {
    ctx.fillStyle = 'rgba(9,7,5,.62)'; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffefb4'; ctx.font = `850 30px ${FONT}`;
    const n = state.score.flowers;
    ctx.fillText(n + ' fleur' + (n > 1 ? 's' : ''), W / 2, H * .40);
    ctx.fillStyle = '#ead9b2'; ctx.font = `600 16px ${FONT}`;
    ctx.fillText('Plus de graines · tiges tentées : ' + state.plant.stemCount, W / 2, H * .40 + 40);
    ctx.fillStyle = '#fff1b7'; ctx.font = `800 18px ${FONT}`;
    ctx.fillText('TOUCHE POUR RECOMMENCER', W / 2, H * .40 + 86);
  }

  function draw(ctx, state) {
    if (state.mode === 'menu') return;
    const { W, H } = FP.view;
    ctx.save();
    drawPanels(ctx, state, W, H);
    if (state.mode === 'ready') drawReady(ctx, W, H);
    drawMessage(ctx, state, W);
    if (state.mode === 'playing' && state.score.flowers === 0 && state.plant.trail.length < 90) {
      ctx.globalAlpha = .76; ctx.font = `600 13px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillStyle = '#ead9b2';
      ctx.fillText(state.input.down ? 'guide la pointe' : 'maintiens pour pousser', W / 2, H - 28);
      ctx.globalAlpha = 1;
    }
    if (state.mode === 'over') drawOver(ctx, state, W, H);
    ctx.restore();
  }

  FP.hud = { draw };
})();
