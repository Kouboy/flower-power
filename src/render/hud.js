// render/hud.js — informations à l'écran (repère écran, hors zoom).
// Lit     : state.mode, state.flow.{message,messageTimer}, state.plant.{reserves,stemCount,trail,corruption},
//           state.score.{flowers,eco,flowerBonus,combo}, state.power.shield, state.flow.overReason, state.input.down, FP.scoring.records, FP.view, FP.config.text.
// Écrit   : rien (le canvas uniquement).
// Expose  : FP.hud.draw(ctx, state).
// Porté de la v3.43.16 (drawHUD, panneau de fin de die()).
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  const { clamp } = FP.math;
  const FONT = 'system-ui,-apple-system,Segoe UI,sans-serif';
  const SIGIL = 'Ɇ';
  const fmt = (n) => n.toLocaleString('fr-FR');

  function box(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
    ctx.fillStyle = 'rgba(12,9,7,.56)'; ctx.fill();
    ctx.strokeStyle = 'rgba(255,238,181,.18)'; ctx.stroke();
  }

  function drawPanels(ctx, state, W, H) {
    const boxY = H - 78, boxW = 146, boxH = 64;
    ctx.font = `700 14px ${FONT}`; ctx.textBaseline = 'top'; ctx.textAlign = 'left';
    box(ctx, 12, boxY, boxW, boxH, 15);
    const sc = state.score;
    ctx.fillStyle = '#ffeeb5'; ctx.fillText('fleurs ' + sc.flowers, 24, boxY + 8);
    ctx.fillStyle = '#cfff78'; ctx.fillText(SIGIL + ' ' + fmt(sc.eco), 24, boxY + 28);
    ctx.fillStyle = sc.flowerBonus > 0 ? '#fff0a6' : '#c9b68b'; ctx.fillText('pollen +' + sc.flowerBonus, 24, boxY + 47);
    box(ctx, W - boxW - 12, boxY, boxW, boxH, 15);
    ctx.fillStyle = '#d9c798'; ctx.fillText('graines ' + state.plant.reserves, W - boxW, boxY + 8);
    ctx.fillStyle = '#bda982'; ctx.fillText('élan ' + Math.round(100 + Math.max(0, state.plant.stemCount - 1) * 3) + '%', W - boxW, boxY + 28);
    ctx.fillStyle = sc.combo > 1 ? '#cfff78' : '#bda982'; ctx.fillText(sc.combo > 1 ? 'combo x' + sc.combo : 'frôlement : ' + SIGIL, W - boxW, boxY + 47);
  }

  // Ligne d'effet au-dessus des panneaux : tout ce qui agit sur la pousse en cours (v3 : effect).
  function drawEffect(ctx, state, W, H) {
    const t = FP.config.text, parts = [];
    if (state.plant.corruption > 0) parts.push(t.corrupted);
    if (state.power.shield) parts.push(t.shield);
    if (state.score.flowerBonus > 0) parts.push('pollen +' + state.score.flowerBonus);
    if (!parts.length) return;
    ctx.font = `650 13px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.beginPath(); ctx.roundRect(38, H - 92, W - 76, 22, 11); ctx.fillStyle = 'rgba(12,9,7,.48)'; ctx.fill();
    ctx.fillStyle = '#fff1b7'; ctx.fillText(parts.join(' · '), W / 2, H - 88);
  }

  function drawMessage(ctx, state, W) {
    const f = state.flow;
    if (f.messageTimer <= 0 || !f.message) return;
    ctx.globalAlpha = clamp(f.messageTimer, 0, 1);
    // Le message rétrécit pour tenir dans la largeur (les raisons de mort sont longues sur écran étroit).
    ctx.font = `800 20px ${FONT}`;
    const fit = Math.min(1, (W - 24) / Math.max(1, ctx.measureText(f.message).width));
    ctx.font = `800 ${Math.max(12, Math.floor(20 * fit))}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
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

  // Fin de partie : score, ÉcoCrédits™ et records (panneau de die() en v3).
  function drawOver(ctx, state, W, H) {
    const sc = state.score, r = FP.scoring.records, y0 = H * .32;
    ctx.fillStyle = 'rgba(9,7,5,.62)'; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffefb4'; ctx.font = `850 30px ${FONT}`;
    ctx.fillText(sc.flowers + ' fleur' + (sc.flowers > 1 ? 's' : ''), W / 2, y0);
    // Cause de la mort (v3 : <p>${reason}</p>), réduite pour tenir dans la largeur.
    const reason = state.flow.overReason;
    if (reason) {
      ctx.font = `700 16px ${FONT}`;
      const fit = Math.min(1, (W - 32) / Math.max(1, ctx.measureText(reason).width));
      ctx.font = `700 ${Math.max(11, Math.floor(16 * fit))}px ${FONT}`; ctx.fillStyle = '#ffb08a';
      ctx.fillText(reason, W / 2, y0 + 30);
    }
    ctx.font = `600 16px ${FONT}`;
    const lines = [
      ['#ead9b2', 'Tiges tentées : ' + state.plant.stemCount],
      ['#cfff78', 'ÉcoCrédits™ : ' + SIGIL + ' ' + fmt(sc.eco)],
      ['#ead9b2', 'Meilleur score fleurs : ' + r.flowers],
      ['#ead9b2', 'Meilleurs ÉcoCrédits™ : ' + SIGIL + ' ' + fmt(r.eco)]
    ];
    lines.forEach(([c, t], i) => { ctx.fillStyle = c; ctx.fillText(t, W / 2, y0 + 64 + i * 26); });
    ctx.fillStyle = '#fff1b7'; ctx.font = `800 18px ${FONT}`;
    ctx.fillText('TOUCHE POUR RECOMMENCER', W / 2, y0 + 64 + lines.length * 26 + 28);
  }

  function draw(ctx, state) {
    if (state.mode === 'menu') return;
    const { W, H } = FP.view;
    ctx.save();
    drawPanels(ctx, state, W, H);
    if (state.mode !== 'over') drawEffect(ctx, state, W, H);
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
