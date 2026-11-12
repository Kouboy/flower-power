// render/boss-core.js — pompes et cœur des boss dessinés par le code (v5.8.0, boss infiltré) : plus de bloc gris ni d'image fixe, des
// machines animées encastrées dans la machinerie. Pompe : châssis riveté, cuve vitrée où bouillonne le liquide lumineux (la seule chose
// claire : la cible évidente), volant qui tourne, deux pistons en alternance ; cassée : cuve éteinte et fêlée, flaque au pied, volant
// arrêté. Cœur : anneaux rivetés, pales qui tournent (de moins en moins vite à chaque pompe cassée), noyau qui bat ; à nu, pales arrêtées
// et noyau grand ouvert qui pulse fort.
// Lit     : state.bossFight.{destroyed, headOpen}, state.world.bossLevel (mémoire de la toux), FP.config.boss.{core (wheelHz, bladeHz, beat), pipes.pumpHz}, FP.palette.boss.{core, weak,
//           glow}, FP.px, FP.bossRender.fillPoly, FP.bossSkin.{image, tank, piece} (au dessin).
// Écrit   : rien dans l'état (la toile reçue ; une petite mémoire du dessin : quand la dernière pompe a cassé, pour la toux).
// Expose  : FP.bossCore.pump(g, pts, t, M, broken, milieuId) (v5.9.0 : sprite PixelLab animé si le milieu a son image `pump`, sinon le
//           dessin du code, toujours pour une pompe cassée) ; FP.bossCore.heart(g, pts, t, state) (pts : polygone en pixels d'art de l'écran,
//           M : couleurs du biome) ; FP.bossCore.bladeAngle(t, state), FP.bossCore.beat(t, state) → 0..1 (purs).
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};

  const box = (pts) => { const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]); return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) }; };

  // Cuve vitrée (tx, ty, tw, th : pixels d'art) : liquide lumineux qui bouillonne, ou fêlée et éteinte.
  function vessel(g, tx, ty, tw, th, t, broken) {
    const Q = FP.palette.boss.core, W = FP.palette.boss.weak;
    FP.px.rect(g, tx - 1, ty - 1, tw + 2, th + 2, Q.frame); FP.px.rect(g, tx, ty, tw, th, Q.glass);
    if (broken) { FP.px.line(g, tx, ty, tx + tw - 1, ty + th - 1, Q.frame); FP.px.line(g, tx + tw - 1, ty + 1, tx + 1, ty + th - 2, Q.frame); return; }   // fêlures
    const level = Math.round(th * (.55 + .1 * Math.sin(t * 3)));
    FP.px.rect(g, tx, ty + th - level, tw, level, W[1]);
    FP.px.rect(g, tx, ty + th - level, tw, 1, W[0]);   // surface lumineuse
    for (let k = 0; k < 3; k++) {   // bulles qui montent
      const ph = ((t * .9 + k / 3) % 1 + 1) % 1, by = ty + th - 1 - Math.round(ph * (level - 1));
      FP.px.rect(g, tx + 1 + ((k * 5) % Math.max(1, tw - 2)), by, 1, 1, W[0]);
    }
  }

  // Volant : quatre rayons qui tournent (arrêté sur une pompe cassée).
  function wheel(g, wx, wy, r, t, M, broken) {
    FP.px.disc(g, wx, wy, r, M.edge); FP.px.disc(g, wx, wy, Math.max(1, r - 1), M.body);
    const a = broken ? .4 : t * FP.TAU * FP.config.boss.core.wheelHz;
    for (let k = 0; k < 4; k++) { const q = a + k * Math.PI / 2; FP.px.line(g, wx, wy, Math.round(wx + Math.cos(q) * r), Math.round(wy + Math.sin(q) * r), FP.palette.boss.core.wheel); }
  }

  // v5.9.0 : pompe en sprite PixelLab (FP.bossSkin, rôle pump), animée par le code. Large : l'image dans la boîte (proportions gardées,
  // centrée, comme FP.bossSkin.piece), le liquide dans sa cuve (FP.bossSkin.tank, fractions de l'image) et un volant qui tourne sur son
  // flanc gauche. Haute (barre) : l'image en tête de pompe, à la largeur de la barre ; dessous, le tube vitré lumineux.
  function sprite(g, pts, t, M, img, id, b) {
    const x0 = Math.round(b.x0), y0 = Math.round(b.y0), w = Math.round(b.x1 - b.x0), h = Math.round(b.y1 - b.y0);
    if (h > w * 1.2) {
      const ch = Math.min(Math.round(img.height * w / img.width), Math.floor(h / 3));
      FP.bossSkin.piece(g, [[x0, y0], [x0 + w, y0], [x0 + w, y0 + ch], [x0, y0 + ch]], img);
      if (w >= 3 && h - ch >= 4) vessel(g, x0 + 1, y0 + ch + 1, w - 2, h - ch - 2, t, false);
      return;
    }
    FP.bossSkin.piece(g, pts, img);
    const k = Math.min(w / img.width, h / img.height), iw = img.width * k, ih = img.height * k, dx = x0 + (w - iw) / 2, dy = y0 + (h - ih) / 2;
    const T = FP.bossSkin.tank(id) || [.35, .35, .65, .65];
    const tx = Math.round(dx + T[0] * iw), ty = Math.round(dy + T[1] * ih), tw = Math.max(1, Math.round((T[2] - T[0]) * iw)), th = Math.max(2, Math.round((T[3] - T[1]) * ih));
    vessel(g, tx, ty, tw, th, t, false);
    wheel(g, Math.round(dx + iw * .1), Math.round(dy + ih * .5), Math.max(2, Math.round(ih * .1)), t, M, false);
  }

  function pump(g, pts, t, M, broken, id) {
    const b = box(pts), img = !broken && id ? FP.bossSkin.image(id, 'pump') : null;
    if (img) { sprite(g, pts, t, M, img, id, b); return; }
    // Dessin de secours (v5.8.0 ; toujours pour une pompe cassée) : châssis, cuve, volant, pistons.
    const Q = FP.palette.boss.core, W = FP.palette.boss.weak;
    const x0 = Math.round(b.x0), y0 = Math.round(b.y0), w = Math.round(b.x1 - b.x0), h = Math.round(b.y1 - b.y0);
    FP.bossRender.fillPoly(g, pts, M.edge); FP.bossRender.fillPoly(g, pts, M.dark, 1);   // châssis
    for (const [rx, ry] of [[x0 + 2, y0 + 2], [x0 + w - 3, y0 + 2], [x0 + 2, y0 + h - 3], [x0 + w - 3, y0 + h - 3]]) FP.px.rect(g, rx, ry, 1, 1, M.rivet);
    // cuve vitrée au centre ; pompe haute et étroite (brûleurs, barres) : la cuve occupe la largeur, volant au-dessus, pistons dessous
    const tall = h > w * 1.2;
    const tw = tall ? Math.max(1, w - 4) : Math.max(4, Math.round(w * .4)), th = tall ? Math.max(3, Math.round(h * .45)) : Math.max(4, Math.round(h * .6));
    const tx = x0 + Math.round((w - tw) / 2), ty = y0 + Math.round((h - th) / 2);
    vessel(g, tx, ty, tw, th, t, broken);
    if (broken) FP.px.rect(g, Math.max(x0, tx - 2), y0 + h - 1, Math.min(w, tw + 4), 1, W[1]);   // la flaque au pied
    // volant (à gauche de la cuve, ou au-dessus d'une pompe haute) ; pistons qui montent et descendent en alternance (à droite, ou
    // dessous), tous deux tenus dans la boîte de la pompe
    const r = tall ? Math.max(1, Math.min(Math.floor(w / 2) - 1, Math.floor((ty - y0) / 2) - 1)) : Math.max(1, Math.min(Math.floor((tx - x0 - 2) / 2), Math.floor(h / 2) - 2));
    wheel(g, tall ? x0 + Math.floor(w / 2) : x0 + 1 + r, tall ? y0 + Math.floor((ty - y0) / 2) : y0 + Math.round(h / 2), r, t, M, broken);
    const bx0 = tall ? x0 + 2 : tx + tw + 2, bw = tall ? w - 4 : x0 + w - 2 - bx0, top = tall ? ty + th + 2 : y0 + 2, room = y0 + h - 2 - top;
    const pw = Math.floor((bw - 1) / 2);
    if (pw < 1 || room < 3) return;
    for (let k = 0; k < 2; k++) {
      const s = broken ? 0 : Math.sin(t * FP.TAU * FP.config.boss.pipes.pumpHz + k * Math.PI), ph = Math.max(2, Math.min(room - 1, Math.round(room * (.55 + .35 * s))));
      FP.px.rect(g, bx0 + k * (pw + 1), y0 + h - 2 - ph, pw, ph, M.light); FP.px.rect(g, bx0 + k * (pw + 1), y0 + h - 3 - ph, pw, 1, M.edge);
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

  // Mémoire du dessin : quand une pompe vient de casser (nombre de pompes cassées qui monte), le cœur tousse (un battement manqué) et crache
  // des étincelles pendant COUGH s. Repartie à zéro à chaque niveau : une pompe cassée à une tentative précédente ne fait rien tousser.
  const COUGH = 1, SPARKS = 6;
  let mem = { bl: null, n: 0, at: -Infinity };
  function heart(g, pts, t, state) {
    const Q = FP.palette.boss.core, W = FP.palette.boss.weak, G = FP.palette.boss.glow, b = box(pts), open = state.bossFight.headOpen;
    const n = state.bossFight.destroyed.filter(Boolean).length, bl = state.world.bossLevel;
    if (mem.bl !== bl || n < mem.n) mem = { bl, n, at: -Infinity };
    if (n > mem.n) mem = { bl, n, at: t };
    const coughing = t - mem.at >= 0 && t - mem.at < COUGH;
    const cx = Math.round((b.x0 + b.x1) / 2), cy = Math.round((b.y0 + b.y1) / 2), R = Math.max(4, Math.floor(Math.min(b.x1 - b.x0, b.y1 - b.y0) / 2));
    FP.bossRender.fillPoly(g, pts, Q.frame);
    FP.px.disc(g, cx, cy, R, Q.ring[0]); FP.px.disc(g, cx, cy, R - 2, Q.ring[1]);
    for (let k = 0; k < 10; k++) { const q = k / 10 * FP.TAU; FP.px.rect(g, Math.round(cx + Math.cos(q) * (R - 1)), Math.round(cy + Math.sin(q) * (R - 1)), 1, 1, Q.rivet); }
    const p = coughing && t - mem.at < COUGH / 2 ? 0 : beat(t, state);   // la toux : un battement manqué
    if (coughing) for (let k = 0; k < SPARKS; k++) {   // étincelles projetées du bord du cœur
      const q = k / SPARKS * FP.TAU + mem.at * 3, d = R + 1 + Math.round(((t - mem.at) * 14 + k * 3) % 6);
      FP.px.rect(g, Math.round(cx + Math.cos(q) * d), Math.round(cy + Math.sin(q) * d * .7), 1, 1, Q.spark);
    }
    if (!open) {
      const a = bladeAngle(t, state);
      for (let k = 0; k < 6; k++) { const q = a + k * FP.TAU / 6; FP.px.line(g, cx, cy, Math.round(cx + Math.cos(q) * (R - 3)), Math.round(cy + Math.sin(q) * (R - 3)), Q.blade); }
      FP.px.disc(g, cx, cy, 2 + Math.round(p * 2), G[0]); FP.px.disc(g, cx, cy, 1 + Math.round(p), Q.ember);   // blindé : une braise, pas la couleur des cibles
      return;
    }
    const r = Math.max(2, Math.round((R - 3) * (.6 + .4 * p)));   // à nu : grand ouvert, il pulse fort
    FP.px.disc(g, cx, cy, r + 2, G[0]); FP.px.disc(g, cx, cy, r + 1, G[1]); FP.px.disc(g, cx, cy, r, W[1]); FP.px.disc(g, cx, cy, Math.max(1, r - 2), W[0]);
  }

  FP.bossCore = { pump, heart, bladeAngle, beat };
})();
