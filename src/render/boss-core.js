// render/boss-core.js — pompes et cœur des boss dessinés par le code (v5.8.0, boss infiltré) : plus de bloc gris ni d'image fixe, des
// machines animées encastrées dans la machinerie. Pompe : châssis riveté, cuve vitrée où bouillonne le liquide lumineux (la seule chose
// claire : la cible évidente), volant qui tourne, deux pistons en alternance ; cassée : cuve éteinte et fêlée, flaque au pied, volant
// arrêté. Cœur : anneaux rivetés, pales qui tournent (de moins en moins vite à chaque pompe cassée), noyau qui bat ; à nu, pales arrêtées
// et noyau grand ouvert qui pulse fort.
// Lit     : state.bossFight.{destroyed, headOpen}, FP.config.boss.{core (wheelHz, bladeHz, beat), pipes.pumpHz}, FP.palette.boss.{core, weak,
//           glow}, FP.px, FP.bossRender.fillPoly (au dessin).
// Écrit   : rien dans l'état (la toile reçue).
// Expose  : FP.bossCore.pump(g, pts, t, M, broken) ; FP.bossCore.heart(g, pts, t, state) (pts : polygone en pixels d'art de l'écran,
//           M : couleurs du biome) ; FP.bossCore.bladeAngle(t, state), FP.bossCore.beat(t, state) → 0..1 (purs).
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};

  const box = (pts) => { const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]); return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) }; };

  function pump(g, pts, t, M, broken) {
    const C = FP.config.boss.core, Q = FP.palette.boss.core, W = FP.palette.boss.weak, b = box(pts);
    const x0 = Math.round(b.x0), y0 = Math.round(b.y0), w = Math.round(b.x1 - b.x0), h = Math.round(b.y1 - b.y0);
    FP.bossRender.fillPoly(g, pts, M.edge); FP.bossRender.fillPoly(g, pts, M.dark, 1);   // châssis
    for (const [rx, ry] of [[x0 + 2, y0 + 2], [x0 + w - 3, y0 + 2], [x0 + 2, y0 + h - 3], [x0 + w - 3, y0 + h - 3]]) FP.px.rect(g, rx, ry, 1, 1, M.rivet);
    // cuve vitrée au centre
    const tw = Math.max(4, Math.round(w * .4)), th = Math.max(4, Math.round(h * .6)), tx = x0 + Math.round((w - tw) / 2), ty = y0 + Math.round((h - th) / 2);
    FP.px.rect(g, tx - 1, ty - 1, tw + 2, th + 2, Q.frame); FP.px.rect(g, tx, ty, tw, th, Q.glass);
    if (!broken) {
      const level = Math.round(th * (.55 + .1 * Math.sin(t * 3)));
      FP.px.rect(g, tx, ty + th - level, tw, level, W[1]);
      FP.px.rect(g, tx, ty + th - level, tw, 1, W[0]);   // surface lumineuse
      for (let k = 0; k < 3; k++) {   // bulles qui montent
        const ph = ((t * .9 + k / 3) % 1 + 1) % 1, by = ty + th - 1 - Math.round(ph * (level - 1));
        FP.px.rect(g, tx + 1 + ((k * 5) % Math.max(1, tw - 2)), by, 1, 1, W[0]);
      }
    } else {
      FP.px.line(g, tx, ty, tx + tw - 1, ty + th - 1, Q.frame); FP.px.line(g, tx + tw - 1, ty + 1, tx + 1, ty + th - 2, Q.frame);   // fêlures
      FP.px.rect(g, tx - 2, y0 + h - 1, tw + 4, 1, W[1]);   // la flaque au pied
    }
    // volant (à gauche de la cuve) : quatre rayons qui tournent ; pistons (à droite) qui montent et descendent en alternance
    const r = Math.max(2, Math.min(Math.floor((tx - x0 - 2) / 2), Math.floor(h / 2) - 2)), wx = x0 + 1 + r, wy = y0 + Math.round(h / 2);
    FP.px.disc(g, wx, wy, r, M.edge); FP.px.disc(g, wx, wy, Math.max(1, r - 1), M.body);
    const a = broken ? .4 : t * FP.TAU * C.wheelHz;
    for (let k = 0; k < 4; k++) { const q = a + k * Math.PI / 2; FP.px.line(g, wx, wy, Math.round(wx + Math.cos(q) * r), Math.round(wy + Math.sin(q) * r), Q.wheel); }
    const px0 = tx + tw + 2, pw = Math.max(1, Math.floor((x0 + w - 2 - px0) / 2) - 1);
    for (let k = 0; k < 2; k++) {
      const s = broken ? 0 : Math.sin(t * FP.TAU * FP.config.boss.pipes.pumpHz + k * Math.PI), ph = Math.max(2, Math.round(h * .35 + s * h * .2));
      FP.px.rect(g, px0 + k * (pw + 1), y0 + h - 2 - ph, pw, ph, M.light); FP.px.rect(g, px0 + k * (pw + 1), y0 + h - 3 - ph, pw, 1, M.edge);
    }
  }

  // Pales : un tour à bladeHz, ralenti d'un quart par pompe cassée ; arrêtées à nu.
  function bladeAngle(t, state) {
    const bf = state.bossFight;
    if (bf.headOpen) return 0;
    return t * FP.TAU * FP.config.boss.core.bladeHz * Math.max(0, 1 - .25 * bf.destroyed.filter(Boolean).length);
  }
  // Battement du noyau (0..1) : bref et sec, plus fort à nu.
  const beat = (t, state) => { const p = (Math.sin(t * FP.TAU * FP.config.boss.core.beat * (state.bossFight.headOpen ? 1.6 : 1)) + 1) / 2; return p * p * p; };

  function heart(g, pts, t, state) {
    const Q = FP.palette.boss.core, W = FP.palette.boss.weak, G = FP.palette.boss.glow, b = box(pts), open = state.bossFight.headOpen;
    const cx = Math.round((b.x0 + b.x1) / 2), cy = Math.round((b.y0 + b.y1) / 2), R = Math.max(4, Math.floor(Math.min(b.x1 - b.x0, b.y1 - b.y0) / 2));
    FP.bossRender.fillPoly(g, pts, Q.frame);
    FP.px.disc(g, cx, cy, R, Q.ring[0]); FP.px.disc(g, cx, cy, R - 2, Q.ring[1]);
    for (let k = 0; k < 10; k++) { const q = k / 10 * FP.TAU; FP.px.rect(g, Math.round(cx + Math.cos(q) * (R - 1)), Math.round(cy + Math.sin(q) * (R - 1)), 1, 1, Q.rivet); }
    const p = beat(t, state);
    if (!open) {
      const a = bladeAngle(t, state);
      for (let k = 0; k < 6; k++) { const q = a + k * FP.TAU / 6; FP.px.line(g, cx, cy, Math.round(cx + Math.cos(q) * (R - 3)), Math.round(cy + Math.sin(q) * (R - 3)), Q.blade); }
      FP.px.disc(g, cx, cy, 2 + Math.round(p * 2), G[0]); FP.px.disc(g, cx, cy, 1 + Math.round(p), W[1]);
      return;
    }
    const r = Math.max(2, Math.round((R - 3) * (.6 + .4 * p)));   // à nu : grand ouvert, il pulse fort
    FP.px.disc(g, cx, cy, r + 2, G[0]); FP.px.disc(g, cx, cy, r + 1, G[1]); FP.px.disc(g, cx, cy, r, W[1]); FP.px.disc(g, cx, cy, Math.max(1, r - 2), W[0]);
  }

  FP.bossCore = { pump, heart, bladeAngle, beat };
})();
