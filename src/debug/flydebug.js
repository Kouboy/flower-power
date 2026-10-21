// debug/flydebug.js — réglage du flyover ?flydebug=1 : bandeau qui explique chaque décision de récompense.
// Lit     : FP.params.flydebug, state.events (flyover, bonusMissed), state.time, FP.view.W.
// Écrit   : rien dans l'état (dernier texte retenu en interne).
// Expose  : FP.flydebug = null sans ?flydebug=1 ; sinon { draw(ctx, state), text(event) } ;
//           FP._createFlydebug() — même outil hors paramètre d'URL, réservé aux tests.
// Porté de la v3.43.16 (flyDebugText, flyDebugTimer et leurs formats, bandeau de drawHUD).
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  const pct = (v) => (v * 100 | 0) + '%';

  function create() {
    // Le bandeau appartient à une partie : state.time repart de zéro à chaque nouveau run.
    let owner = null, shown = '', until = -1;

    // Texte et durée d'affichage (s) de chaque décision, formats de la v3.
    function text(e) {
      if (e.type === 'bonusMissed') return [`${e.kind.toUpperCase()} raté · gate ${e.gate}`, 1.5];
      if (e.type !== 'flyover') return null;
      switch (e.outcome) {
        case 'spawn': return [`${e.kind.toUpperCase()} · ${e.time.toFixed(2)}s (${e.effective.toFixed(2)} utile) · ${pct(e.risk)}`, 2.6];
        case 'blocked': return [`${e.kind.toUpperCase()} bloqué · power-up actif · ${pct(e.risk)}`, 2.0];
        case 'noSpot': return [`FLY ${e.time.toFixed(2)}s · ${pct(e.risk)} · spawn bloqué`, 2.2];
        case 'notQualified': return [`pas flyover · ${e.time.toFixed(2)}s · prog ${pct(e.progress)} · risque ${pct(e.risk)}`, 1.65];
      }
      return null;
    }

    function draw(ctx, state) {
      if (state !== owner) { owner = state; shown = ''; }
      for (const e of state.events) {
        const t = text(e);
        if (t) { shown = t[0]; until = state.time + t[1]; }
      }
      if (!shown || state.time >= until) return;
      const W = FP.view.W;
      ctx.save();
      ctx.font = '700 12px ui-monospace,SFMono-Regular,Consolas,monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillStyle = 'rgba(7,5,4,.70)'; ctx.beginPath(); ctx.roundRect(28, 68, W - 56, 24, 12); ctx.fill();
      ctx.fillStyle = '#d8ff58'; ctx.fillText(shown, W / 2, 73);
      ctx.restore();
    }

    return { draw, text };
  }

  FP._createFlydebug = create;
  FP.flydebug = FP.params.flydebug ? create() : null;
})();
