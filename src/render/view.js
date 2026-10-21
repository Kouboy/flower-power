// render/view.js — canvas, densité de pixels et format 9:16.
// Lit     : FP.config.view, la taille CSS du canvas #game.
// Écrit   : FP.view.{W,H,DPR} uniquement (jamais l'état de jeu).
// Expose  : FP.view = { canvas, ctx, W, H, DPR, resize() }.
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d', { alpha: false });

  const view = { canvas, ctx, W: 0, H: 0, DPR: 1, resize };

  // Le CSS impose le 9:16 ; on aligne la résolution interne sur la taille affichée.
  // Sous la taille minimale, les deux côtés grandissent du même facteur : l'image est réduite, jamais écrasée.
  function resize() {
    const cfg = FP.config.view;
    view.DPR = Math.min(cfg.dprMax, window.devicePixelRatio || 1);
    const rect = canvas.getBoundingClientRect();
    let w = rect.width || window.innerWidth, h = rect.height || window.innerHeight;
    if (!(w > 0 && h > 0)) { w = cfg.minW; h = cfg.minH; }   // vue cachée au chargement : taille minimale
    const k = Math.max(1, cfg.minW / w, cfg.minH / h);
    view.W = Math.floor(w * k);
    view.H = Math.floor(h * k);
    canvas.width = Math.floor(view.W * view.DPR);
    canvas.height = Math.floor(view.H * view.DPR);
    ctx.setTransform(view.DPR, 0, 0, view.DPR, 0, 0);
  }

  window.addEventListener('resize', resize, { passive: true });
  FP.view = view;
  resize();
})();
