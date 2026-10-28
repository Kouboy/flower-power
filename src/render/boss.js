// render/boss.js — le boss, provisoire (dessiné en blocs par le code, sans image) : tronçons, panneau au nom du boss, points faibles, défenses, trappe, flèche.
// Lit     : state.{time,camera.y,run.milieu,bossFight.pierced}, state.world.{width,viewH,bossLevel}, les solides de défense (x, y, a, collision : leur forme en cours),
//           FP.boss.stageAt, FP.config.{boss,milieux}, FP.palette.boss, FP.px, FP.font (au dessin seulement, jamais au chargement), FP.math.clamp.
// Écrit   : trap._slide, trap._t sur la trappe — caches de rendu (ouverture en coulissant), jamais lus par la simulation.
// Expose  : FP.bossRender.draw(g, state) — repère d'art, la caméra est appliquée ici ; rien hors niveau de boss ;
//           FP.bossRender.arrowFor(state) → { x, y, dir: 'up' | 'down' } | null (pur) : x en pixels du monde, y en pixels d'écran (depuis le haut de la vue).
// Ne touche pas au DOM au chargement : chargeable dans dev/check.html. Seul le texte du panneau demande un DOM (sans lui, un panneau nu).
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  const lcg = (s) => () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const SLIDE_SPEED = 1.6, TICK = 6;   // ouverture de la trappe (par seconde) ; pas des pointillés d'avertissement (pixels d'art)

  // Prochain point faible non percé (le plus bas : on monte), si l'écran ne le montre pas : flèche collée au bord, du côté où il se trouve.
  function arrowFor(state) {
    const w = state.world, bl = w.bossLevel;
    if (!bl) return null;
    const next = bl.weak.find(k => !state.bossFight.pierced[k.i]);
    if (!next) return null;
    const top = state.camera.y, H = w.viewH, m = FP.config.boss.arrowMargin;
    if (next.y >= top && next.y <= top + H) return null;
    const up = next.y < top;
    return { x: FP.math.clamp(next.x, m, w.width - m), y: up ? m : H - m, dir: up ? 'up' : 'down' };
  }

  // Polygone convexe, rempli rangée par rangée.
  function fillPoly(g, pts, color) {
    let lo = Infinity, hi = -Infinity;
    for (const p of pts) { lo = Math.min(lo, p[1]); hi = Math.max(hi, p[1]); }
    for (let y = Math.ceil(lo); y <= Math.floor(hi); y++) {
      let a = Infinity, b = -Infinity;
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i], q = pts[(i + 1) % pts.length];
        if ((p[1] <= y + .5) === (q[1] <= y + .5)) continue;
        const x = p[0] + (y + .5 - p[1]) / (q[1] - p[1]) * (q[0] - p[0]);
        a = Math.min(a, x); b = Math.max(b, x);
      }
      if (b >= a) FP.px.rect(g, a, y, Math.max(1, b - a), 1, color);
    }
  }

  // Tronçon : corps, joints de tôle, ombre et contour côté couloir, rivets, plaques de rouille et leurs coulées, coulures luisantes.
  function segment(g, v, seg, i, M) {
    const { px } = FP, x0 = v.ax(seg.x0), x1 = v.ax(seg.x1), y0 = v.ay(seg.y0), y1 = v.ay(seg.y1), w = x1 - x0, h = y1 - y0, r = lcg(977 * (i + 1));
    const faceX = seg.side < 0 ? x1 : x0, inner = seg.side < 0 ? x1 - 4 : x0 + 3;
    px.rect(g, x0, y0, w, h, M.body);
    px.rect(g, x0, y0 + 1, w, 1, M.light);
    for (let y = y0 + 22; y < y1 - 6; y += 22) px.rect(g, x0, y, w, 1, M.dark);
    for (let x = x0 + 30; x < x1 - 6; x += 30) px.rect(g, x, y0, 1, h, M.dark);
    px.rect(g, inner, y0, 4, h, M.dark);
    px.rect(g, x0, y0, w, 1, M.edge); px.rect(g, x0, y1 - 1, w, 1, M.edge);
    px.rect(g, seg.side < 0 ? x1 - 1 : x0, y0, 1, h, M.edge);
    for (let x = x0 + 5; x < x1 - 3; x += 9) { px.rect(g, x, y0 + 4, 2, 2, M.rivet); px.rect(g, x, y1 - 7, 2, 2, M.rivet); }
    for (let k = 0; k < 7; k++) {
      const rx = x0 + 4 + Math.floor(r() * (w - 20)), ry = y0 + 6 + Math.floor(r() * (h - 24)), rw = 4 + Math.floor(r() * 9), rh = 2 + Math.floor(r() * 4);
      px.rect(g, rx, ry, rw, rh, M.rust); px.rect(g, rx + 1 + Math.floor(r() * (rw - 2)), ry + rh, 1, 3 + Math.floor(r() * 7), M.rust);
    }
    for (let k = 0; k < 5; k++) {
      const dx = x0 + 6 + Math.floor(r() * (w - 14)), len = 5 + Math.floor(r() * 10);
      px.rect(g, dx, y0 + 2, 2, len, M.drip); px.rect(g, dx, y0 + 2 + len, 2, 1, M.light);
    }
  }

  // Panneau au nom du boss sur le tronçon le plus haut ; sans DOM (tests sous Node) ou si le texte ne tient pas : panneau nu.
  function plate(g, v, seg, name) {
    const { px } = FP, [bg, ink] = FP.palette.boss.plate, x0 = v.ax(seg.x0), w = v.ax(seg.x1) - x0, y0 = v.ay(seg.y0), h = v.ay(seg.y1) - y0;
    let lines = typeof document !== 'undefined' && FP.font ? FP.font.wrap(name, w - 20) : [];
    let ph = lines.length ? lines.length * (FP.font.HEIGHT + 2) + 6 : 10;
    if (lines.length && ph > h - 10) { lines = []; ph = 10; }
    const pw = lines.length ? Math.max(...lines.map(l => FP.font.measure(l))) + 8 : w - 20, px0 = Math.round(x0 + (w - pw) / 2), py0 = Math.round(y0 + (h - ph) / 2);
    px.rect(g, px0 - 1, py0 - 1, pw + 2, ph + 2, ink); px.rect(g, px0, py0, pw, ph, bg);
    for (const [bx, by] of [[1, 1], [pw - 2, 1], [1, ph - 2], [pw - 2, ph - 2]]) px.rect(g, px0 + bx, py0 + by, 1, 1, ink);
    lines.forEach((l, k) => FP.font.draw(g, l, px0 + pw / 2, py0 + 3 + k * (FP.font.HEIGHT + 2), { align: 'center', color: ink, outline: false }));
  }

  // Point faible : bouton incandescent qui pulse dans un anneau de cible, sur un support ; percé : trou noir qui fume.
  function weak(g, v, k, seg, pierced, t, M) {
    const { px } = FP, P = FP.palette.boss, x = v.ax(k.x), y = v.ay(k.y), R = px.toArt(FP.config.boss.weakR), fx = v.ax(seg.side < 0 ? seg.x1 : seg.x0);
    px.rect(g, Math.min(x, fx), y - 3, Math.abs(fx - x), 6, M.edge); px.rect(g, Math.min(x, fx), y - 2, Math.abs(fx - x), 4, M.dark);
    if (pierced) {
      px.disc(g, x, y, R - 1, M.edge); px.disc(g, x, y, R - 3, P.hole);
      for (let j = 0; j < 3; j++) {
        const rise = (t * 9 + j * 6) % 18;
        px.disc(g, x + Math.round(Math.sin(t * 2 + j * 2.1) * 2), y - R - rise, rise < 9 ? 1 : 2, P.smoke[rise < 9 ? 0 : 1]);
      }
      return;
    }
    const p = 2 + Math.round((Math.sin(t * 6) + 1));   // 2 à 4
    px.disc(g, x, y, R + 1, M.edge); px.disc(g, x, y, R, M.dark); px.ring(g, x, y, R, P.weak[1], 1);
    px.disc(g, x, y, p, P.weak[1]); px.disc(g, x, y, p - 1, P.weak[0]);
    for (const [dx, dy, w, h] of [[-1, -R - 3, 2, 3], [-1, R, 2, 3], [-R - 3, -1, 3, 2], [R, -1, 3, 2]]) px.rect(g, x + dx, y + dy, w, h, P.weak[1]);
  }

  // Forme locale (x0, x1, y0, y1) → polygone en pixels d'art, par la position et l'angle du solide.
  function place(v, o, x0, x1, y0, y1) {
    const c = Math.cos(o.a), s = Math.sin(o.a), S = FP.px.SCALE;
    return [[x0, y0], [x1, y0], [x1, y1], [x0, y1]].map(([lx, ly]) => [(o.x + lx * c - ly * s) / S, (o.y + lx * s + ly * c) / S - v.cam]);
  }

  // Défense en coup : sa forme vivante, en blocs ; le jet est un jet de liquide, pas un bloc.
  function strike(g, v, df, M, t) {
    const o = df.solid, q = o.collision, x0 = q[0][0], y0 = q[0][1], x1 = q[2][0], y1 = q[2][1], P = FP.palette.boss, e = 2;
    if (df.type === 'jet') {
      fillPoly(g, place(v, o, x0, x1, y0, y1), P.jet[1]);
      const m = (y1 - y0) * .25; fillPoly(g, place(v, o, x0, x1, y0 + m, y1 - m), P.jet[0]);
      for (let j = 0; j < 4; j++) { const f = (t * 3 + j * .25) % 1, p = place(v, o, x1 - 4 - f * 12, x1 - 4 - f * 12 + 2, -1, 1)[0]; FP.px.rect(g, p[0], p[1], 2, 2, P.jet[0]); }
      return;
    }
    fillPoly(g, place(v, o, x0, x1, y0, y1), M.edge);
    fillPoly(g, place(v, o, x0 + e, x1 - e, y0 + e, y1 - e), M.body);
    fillPoly(g, place(v, o, x0 + e, x1 - e, y0 + e, y0 + e + (y1 - y0) / 4), M.light);
    fillPoly(g, place(v, o, x0 + e, x1 - e, y1 - e - (y1 - y0) / 4, y1 - e), M.dark);
    if (df.type === 'piston') { fillPoly(g, place(v, o, x1 - 10, x1, y0 - 3, y1 + 3), M.edge); fillPoly(g, place(v, o, x1 - 8, x1 - 2, y0 - 1, y1 + 1), M.rust); }
    else for (const lx of [x1 * .3, x1 * .65, x1 - 6]) { const p = place(v, o, lx, lx + 2, (y0 + y1) / 2 - 1, (y0 + y1) / 2 + 1)[0]; FP.px.rect(g, p[0], p[1], 2, 2, M.rivet); }
  }

  // Attache sur le flanc : bloc, buse ou pivot selon la défense ; en `warn` elle tremble, une lueur monte, et un pointillé annonce la trajectoire.
  function mount(g, v, df, M, st, t) {
    const { px } = FP, P = FP.palette.boss, dir = -df.side, fx = v.ax(df.x), y = v.ay(df.y), shake = st.stage === 'warn' ? Math.round(Math.sin(t * 70)) : 0;
    const bx = (dir > 0 ? fx : fx - 6) + shake, by = y - 5 + shake;
    if (df.type === 'arm') {
      px.disc(g, fx + dir * 2 + shake, y, 5, M.edge); px.disc(g, fx + dir * 2 + shake, y, 4, M.dark); px.ring(g, fx + dir * 2 + shake, y, 3, M.light); px.rect(g, fx + dir * 2 + shake, y, 1, 1, M.rivet);
    } else {
      px.rect(g, bx - 1, by - 1, 8, 12, M.edge); px.rect(g, bx, by, 6, 10, M.dark); px.rect(g, bx, by, 6, 2, M.light);
      if (df.type === 'jet') { px.rect(g, dir > 0 ? bx + 4 : bx, by + 3, 2, 4, P.hole); px.rect(g, bx + 3, by + 3, 1, 4, P.jet[1]); } else px.rect(g, bx + 1, by + 4, 4, 2, M.rivet);
    }
    if (st.stage !== 'warn') return;
    const gl = 3 + Math.round(st.k * 3);
    px.disc(g, fx + dir * 4, y, gl, P.glow[0]); px.disc(g, fx + dir * 4, y, Math.max(1, gl - 2), P.glow[1]);
    if (df.type !== 'arm') for (let xx = fx + dir * 9, n = 0; n < df.reach / px.SCALE / TICK; n++, xx += dir * TICK) if (n % 2 === 0) px.rect(g, xx, y, 3, 1, P.glow[0]);
  }

  // Trappe : rayures jaune et noir en travers ; une fois ouverte, les deux moitiés coulissent vers les bords.
  function trap(g, v, tr, W, t) {
    const { px } = FP, P = FP.palette.boss, y = v.ay(tr.y0), h = v.ay(tr.y1) - y, dt = Math.min(.1, Math.max(0, t - (tr._t === undefined ? t : tr._t)));
    tr._t = t; tr._slide = Math.max(0, Math.min(1, (tr._slide || 0) + (tr.solid.off ? 1 : -1) * SLIDE_SPEED * dt));
    const half = W / 2, s = tr._slide * half, edge = (xa, xb) => {
      xa = Math.max(0, xa); xb = Math.min(W, xb);
      if (xb <= xa) return;
      px.rect(g, xa, y, xb - xa, h, P.trap[1]);
      for (let j = 0; j < h; j++) for (let sx = xa - (xa % 8) - 8 + j; sx < xb; sx += 8) {
        const a = Math.max(xa, sx), b = Math.min(xb, sx + 4);
        if (b > a) px.rect(g, a, y + j, b - a, 1, P.trap[0]);
      }
    };
    edge(-s, half - s); edge(half + s, W + s);
  }

  function arrow(g, a, t) {
    const { px } = FP, P = FP.palette.boss, sgn = a.dir === 'up' ? 1 : -1, bob = Math.round(Math.sin(t * 8) * 2) * -sgn, x = px.toArt(a.x), y = px.toArt(a.y) + bob;
    for (let r = 0; r < 9; r++) {   // pointe côté bord ; rangée r de largeur 2r + 1
      const yy = sgn > 0 ? y + r : y - r;
      px.rect(g, x - r - 1, yy, 2 * r + 3, 1, P.plate[1]);
      if (r < 8) px.rect(g, x - r, yy, 2 * r + 1, 1, r < 4 ? P.weak[0] : P.weak[1]);
    }
  }

  function draw(g, state) {
    const w = state.world, bl = w.bossLevel;
    if (!bl) return;
    const { px } = FP, cam = px.toArt(state.camera.y), H = w.viewH, top = state.camera.y, t = state.time, W = px.toArt(w.width);
    const v = { cam, ax: px.toArt, ay: (y) => px.toArt(y) - cam };
    const M = FP.palette.boss.milieux[FP.config.milieux[state.run.milieu].id], pierced = state.bossFight.pierced;
    const seen = (y0, y1, pad = 0) => y1 >= top - pad && y0 <= top + H + pad;
    bl.segments.forEach((seg, i) => { if (seen(seg.y0, seg.y1)) segment(g, v, seg, i, M); });
    const roof = bl.segments[bl.segments.length - 1];
    if (seen(roof.y0, roof.y1)) plate(g, v, roof, FP.config.milieux[state.run.milieu].boss.name);
    if (seen(bl.trap.y0, bl.trap.y1)) trap(g, v, bl.trap, W, t);
    for (const k of bl.weak) if (seen(k.y - 20, k.y + 20)) weak(g, v, k, bl.segments[k.i], pierced[k.i], t, M);
    const nPierced = pierced.filter(Boolean).length;
    for (const df of bl.defenses) {
      if (!seen(df.y, df.y, df.reach)) continue;
      const st = FP.boss.stageAt(df.i, t, nPierced);
      mount(g, v, df, M, st, t);
      if (st.stage === 'strike') strike(g, v, df, M, t);
    }
    const a = arrowFor(state);
    if (a) arrow(g, a, t);
  }

  FP.bossRender = { draw, arrowFor };
})();
