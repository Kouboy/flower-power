// render/view.js — canvas, densité de pixels et format 9:16.
// Lit     : FP.config.view, la taille CSS du canvas #game.
// Écrit   : FP.view.{W,H,DPR,art,ui,safe} uniquement (jamais l'état de jeu).
// Expose  : FP.view = { canvas, ctx, W, H, DPR, art, ui, resize() } ; art = { canvas, ctx, w, h } est la toile monde
//           à mi-résolution (1 pixel d'art = FP.px.SCALE pixels CSS), agrandie sans lissage par render/frame.js ;
//           ui = { canvas, ctx, w, h } est la toile d'interface (même grain, transparente), agrandie sans secousse ni zoom ;
//           safe = { top, right, bottom, left } (v5.11.0) : marges système du téléphone (encoche, barre d'accueil — style.css les expose
//           en --safe-*) qui empiètent sur le canvas, en pixels d'interface (lues par FP.hud.safe).
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d', { alpha: false });

  // Toile monde : hors du DOM, jamais lissée.
  const artCanvas = document.createElement('canvas');
  const art = { canvas: artCanvas, ctx: artCanvas.getContext('2d', { alpha: false }), w: 1, h: 1 };

  // Toile d'interface : même taille que la toile monde, mais transparente (posée par-dessus le jeu).
  const uiCanvas = document.createElement('canvas');
  const ui = { canvas: uiCanvas, ctx: uiCanvas.getContext('2d'), w: 1, h: 1 };

  const view = { canvas, ctx, W: 0, H: 0, DPR: 1, art, ui, safe: { top: 0, right: 0, bottom: 0, left: 0 }, resize };

  // Marge système d'un côté (px CSS, env(safe-area-inset-*) via style.css), moins ce qui sépare déjà le canvas du bord de l'écran.
  const inset = (side) => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--safe-' + side)) || 0;
  function safeArea(rect, k) {
    const gap = { top: rect.top, left: rect.left, bottom: window.innerHeight - rect.bottom, right: window.innerWidth - rect.right };
    const out = {};
    for (const s of ['top', 'right', 'bottom', 'left']) out[s] = Math.max(0, inset(s) - gap[s]) * k;
    return out;
  }

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
    art.w = Math.ceil(view.W / FP.px.SCALE);
    art.h = Math.ceil(view.H / FP.px.SCALE);
    artCanvas.width = art.w; artCanvas.height = art.h;   // redimensionner remet le contexte à zéro
    art.ctx.imageSmoothingEnabled = false;
    ui.w = art.w; ui.h = art.h;
    view.safe = rect.width > 0 ? safeArea(rect, ui.w / rect.width) : { top: 0, right: 0, bottom: 0, left: 0 };
    uiCanvas.width = ui.w; uiCanvas.height = ui.h;
    ui.ctx.imageSmoothingEnabled = false;
  }

  window.addEventListener('resize', resize, { passive: true });
  FP.view = view;
  resize();
})();
