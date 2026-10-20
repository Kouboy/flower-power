// render/view.js — canvas, densité de pixels et format 9:16.
// Lit     : FP.config.view, la taille CSS du canvas #game.
// Écrit   : FP.view.{W,H,DPR}, FP.state.current.world.surfaceY.
// Expose  : FP.view = { canvas, ctx, W, H, DPR, resize() }.
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  const { clamp } = FP.math;

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d', { alpha: false });

  const view = { canvas, ctx, W: 0, H: 0, DPR: 1, resize };

  // Le CSS impose le 9:16 ; on aligne la résolution interne sur la taille affichée.
  function resize() {
    const cfg = FP.config.view;
    view.DPR = Math.min(cfg.dprMax, window.devicePixelRatio || 1);
    const rect = canvas.getBoundingClientRect();
    view.W = Math.max(cfg.minW, Math.floor(rect.width || window.innerWidth));
    view.H = Math.max(cfg.minH, Math.floor(rect.height || window.innerHeight));
    canvas.width = Math.floor(view.W * view.DPR);
    canvas.height = Math.floor(view.H * view.DPR);
    ctx.setTransform(view.DPR, 0, 0, view.DPR, 0, 0);

    const state = FP.state.current;
    if (state) state.world.surfaceY = clamp(view.H * cfg.surfaceRatio, cfg.surfaceMin, cfg.surfaceMax);
  }

  window.addEventListener('resize', resize, { passive: true });
  FP.view = view;
  resize();
})();
