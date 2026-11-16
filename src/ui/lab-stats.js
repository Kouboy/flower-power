// ui/lab-stats.js — le tableau de la mesure de l'Encounter Lab (v5.12.0), sur l'écran titre quand l'adresse porte &stats : une ligne par
// circuit (passages réussis et morts, puis temps moyen, frôlements et pièces par passage, causes des morts), lisible au format téléphone,
// à capturer à l'écran.
// Lit     : FP.labStats.summary, FP.font, FP.hud.safe, FP.view.ui.
// Écrit   : rien (la toile d'interface uniquement).
// Expose  : FP.labStatsView.draw(g, state).
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  const VEIL = 'rgba(8, 6, 4, .86)', ROW = 9;
  const CAUSES = { lab: 'MUR', pulse: 'GAZ' };   // noms lisibles des causes de mort (les autres en capitales)

  function draw(g, state) {
    const { w, h } = FP.view.ui, S = FP.hud.safe(), font = FP.font, C = font.COLORS, rows = FP.labStats.summary();
    g.fillStyle = VEIL; g.fillRect(0, 0, w, h);
    let y = S.top + 4;
    font.draw(g, 'LAB — MESURE', w / 2, y, { align: 'center', color: C.gold }); y += ROW + 6;
    for (const r of rows) {
      font.draw(g, r.name, S.left, y, { color: C.cream }); y += ROW;
      font.draw(g, r.runs + ' RÉUSSIS · ' + r.deaths + ' MORTS', S.left + 4, y, { color: C.eco }); y += ROW;
      font.draw(g, String(r.avgTime).replace('.', ',') + ' S · ' + String(r.grazesPerRun).replace('.', ',') + ' FRÔL. · ' + String(r.coinsPerRun).replace('.', ',') + '/' + r.coinsTotal + ' PIÈCES', S.left + 4, y, { color: C.cream }); y += ROW;
      const causes = Object.entries(r.causes).map(([k, n]) => (CAUSES[k] || k.toUpperCase()) + ' ×' + n).join(' · ');
      if (causes) { font.draw(g, causes, S.left + 4, y, { color: C.pink }); y += ROW; }
      y += 4;
    }
  }

  FP.labStatsView = { draw };
})();
