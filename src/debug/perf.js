// debug/perf.js — profileur ?perf=1 : temps de mise à jour, de rendu et des grosses tranches de dessin.
// Lit     : FP.params.perf, state.garden.flowers, state.fx.particles, state.world.solids, FP.view.
// Écrit   : rien dans l'état (moyennes internes).
// Expose  : FP.perf = null sans ?perf=1 ; sinon { begin(dt), mark(name, since), draw(ctx, state), stats }.
// Porté de la v3.43.16 (perf, drawPerfHUD, mesures de loop et drawWorld).
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  if (!FP.params.perf) { FP.perf = null; return; }
  const { lerp } = FP.math;

  // Moyennes glissantes : lissées pour rester lisibles à l'œil (FPS un peu plus lent).
  const stats = { fps: 60, update: 0, render: 0, soil: 0, hazards: 0, plant: 0 };

  function begin(dt) {
    stats.fps = lerp(stats.fps, 1 / Math.max(.001, dt), .08);
    return performance.now();
  }

  // Ajoute la durée depuis `since` à la tranche `name` et renvoie l'instant présent (début de la tranche suivante).
  function mark(name, since) {
    const now = performance.now();
    stats[name] = lerp(stats[name], now - since, .10);
    return now;
  }

  function draw(ctx, state) {
    const x = FP.view.W - 8, y = 8, w = 126, h = 112, xx = x - w + 8;
    ctx.save();
    ctx.globalAlpha = .90; ctx.fillStyle = 'rgba(5,7,6,.78)'; ctx.beginPath(); ctx.roundRect(x - w, y, w, h, 8); ctx.fill();
    ctx.globalAlpha = 1; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.font = '700 10px monospace';
    ctx.fillStyle = '#d8ff8b'; ctx.fillText('PERF v4', xx, y + 7);
    ctx.fillStyle = '#e9e2c9';
    ctx.fillText('FPS      ' + stats.fps.toFixed(0), xx, y + 22);
    ctx.fillText('update   ' + stats.update.toFixed(2) + ' ms', xx, y + 34);
    ctx.fillText('render   ' + stats.render.toFixed(2) + ' ms', xx, y + 46);
    ctx.fillText(' soil    ' + stats.soil.toFixed(2), xx, y + 58);
    ctx.fillText(' hazards ' + stats.hazards.toFixed(2), xx, y + 70);
    ctx.fillText(' plant   ' + stats.plant.toFixed(2), xx, y + 82);
    ctx.fillStyle = '#bdb79d';
    ctx.fillText('F ' + state.garden.flowers.length + ' P ' + state.fx.particles.length + ' O ' + state.world.solids.length, xx, y + 96);
    ctx.restore();
  }

  FP.perf = { begin, mark, draw, stats };
})();
