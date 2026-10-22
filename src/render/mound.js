// render/mound.js — émergence en motte de taupe : la pelouse gonfle au-dessus de la pointe qui approche, se fend à
// l'éclosion, puis retombe en un petit tas de terre qui reste au pied de la fleur tout le run.
// Lit     : state.mode, state.time, state.events (bloom), state.plant.tip, state.world.{surfaceY,lawnVariant}, state.camera.y,
//           FP.config.flow.hatchDelay, FP.palette.lawn, FP.soil.surfaceTop, FP.px.
// Écrit   : state.fx.mound uniquement (réservé au rendu) ; aléatoire purement visuel (Math.random).
// Expose  : FP.mound.draw(actx, state) (repère d'art, caméra appliquée ici) ; FP.mound.swell(state) (pur, testé).
// Ne touche pas au DOM : testable sous Node. La gerbe de terre de la fente est dans render/particles.js (événement bloom).
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  const RANGE = 80;               // px monde sous la surface où la motte commence à gonfler
  const MAX_H = 13, HEAP_H = 3;    // hauteur de la motte pleine, puis du tas qui reste (pixels d'art)
  const CRACK_TIME = .1, SETTLE = .35;
  const CRACK = '#0a0605', DIRT = '#b8916a', DIRT_DARK = '#7a5a3e', DIRT_DEEP = '#4e3826';
  const rand = (a, b) => a + (b - a) * Math.random();

  // Gonflement : k de 0 (loin) à 1 (la pointe touche la surface), centré sur la pointe. Seulement pendant la pousse.
  function swell(state) {
    const tip = state.plant.tip;
    if (state.mode !== 'playing' || !tip) return { k: 0, x: 0 };
    const k = Math.max(0, Math.min(1, 1 - (tip.y - state.world.surfaceY) / RANGE));
    return { k, x: tip.x };
  }

  function store(state) {
    return state.fx.mound || (state.fx.mound = { open: null, heaps: [], crumbs: [], last: null });
  }

  // Demi-largeur de la rangée r (0 = la base) d'un dôme de hauteur h et de demi-largeur w.
  const halfAt = (r, h, w) => Math.round(w * Math.sqrt(Math.max(0, 1 - ((r + .5) / h) ** 2)));

  // Dôme de pelouse soulevée, éclairé par la gauche. side : -1 moitié gauche, 1 moitié droite, 0 entier ; gap écarte les moitiés.
  function dome(g, cx, base, h, w, lawn, side, gap) {
    const { px } = FP;
    for (let r = 0; r < h; r++) {
      const hw = halfAt(r, h, w), y = base - 1 - r;
      let x0 = cx - hw, x1 = cx + hw;
      if (side < 0) { x1 = cx - gap; x0 -= gap; }
      if (side > 0) { x0 = cx + gap; x1 += gap; }
      if (x1 < x0) continue;
      const lit = Math.round(cx - hw / 3) - (side < 0 ? gap : 0), shade = Math.round(cx + hw / 2) + (side > 0 ? gap : 0);
      px.rect(g, x0, y, x1 - x0 + 1, 1, lawn[1]);
      if (lit > x0) px.rect(g, x0, y, Math.min(lit, x1 + 1) - x0, 1, lawn[2]);
      if (shade <= x1) px.rect(g, Math.max(shade, x0), y, x1 - Math.max(shade, x0) + 1, 1, lawn[0]);
      if (r === h - 1 && h > 2) px.rect(g, x0, y, Math.max(1, Math.min(lit, x1 + 1) - x0 + 2), 1, lawn[3]);   // crête éclairée : le dôme se détache de l'herbe
      // Faces de terre à vif le long de la fente.
      if (side < 0) px.rect(g, x1, y, 1, 1, r < h * .5 ? DIRT_DARK : DIRT);
      if (side > 0) px.rect(g, x0, y, 1, 1, r < h * .5 ? DIRT_DARK : DIRT);
    }
    // Brins d'herbe sur le dessus.
    if (h >= 3 && side === 0) for (const dx of [-2, 1, 3]) px.rect(g, cx + dx, base - h - 1, 1, dx === 1 ? 2 : 1, lawn[3]);
  }

  // Le tas qui reste : bas, dans les tons de terre retournée, sans contour (il ne doit pas brouiller la surface).
  function heap(g, cx, base) {
    const { px } = FP;
    px.rect(g, cx - 5, base - 1, 11, 1, DIRT_DEEP);
    px.rect(g, cx - 3, base - 2, 7, 1, DIRT_DARK);
    px.rect(g, cx - 3, base - 2, 2, 1, DIRT);
    px.rect(g, cx - 1, base - 3, 3, 1, DIRT_DARK);
    px.rect(g, cx, base - 2, 1, 1, CRACK);   // le trou d'où la tige est sortie
  }

  function draw(g, state) {
    if (!state.fx) return;
    const fx = store(state), { px } = FP, t = state.time, world = state.world;
    const dt = fx.last === null ? 0 : Math.max(0, Math.min(.05, t - fx.last));
    fx.last = t;
    const oy = px.toArt(state.camera.y), base = px.toArt(FP.soil.surfaceTop(world)) - 2 - oy;
    if (base < -20 || base > FP.view.art.h + 20) return;
    const lawn = FP.palette.lawn[(world.lawnVariant || 0) % FP.palette.lawn.length];

    for (const e of state.events) if (e.type === 'bloom') fx.open = { x: e.x, t0: t };

    for (const hx of fx.heaps) heap(g, px.toArt(hx), base);

    // Gonflement : la motte grossit, tremble quand la pointe est tout près, des miettes roulent sur ses flancs.
    const s = swell(state);
    if (s.k > 0 && !fx.open) {
      const h = Math.round(MAX_H * s.k ** 1.2), w = Math.round(2 + h * 1.1);
      const cx = px.toArt(s.x) + (s.k > .55 ? ((t * 30) | 0) % 2 : 0);
      if (h > 0) dome(g, cx, base, h, w, lawn, 0, 0);
      if (s.k > .3 && Math.random() < dt * 9 * s.k) {
        const side = Math.random() < .5 ? -1 : 1;
        fx.crumbs.push({ x: cx + side * rand(0, 2), y: base - h + oy, vx: side * rand(8, 22), vy: rand(-12, 0), life: rand(.3, .55), c: Math.random() < .5 ? DIRT_DARK : lawn[0] });
      }
    }

    // Fente : la fissure descend du sommet, les deux moitiés s'écartent, puis tout retombe en tas.
    if (fx.open) {
      const a = t - fx.open.t0, cx = px.toArt(fx.open.x), hatch = FP.config.flow.hatchDelay, w = Math.round(2 + MAX_H * 1.1);
      if (a < CRACK_TIME) {
        dome(g, cx, base, MAX_H, w, lawn, 0, 0);
        const depth = Math.ceil(a / CRACK_TIME * MAX_H);
        for (let r = 0; r < depth; r++) px.rect(g, cx + (r % 3 === 1 ? 1 : 0), base - MAX_H + r, 1, 1, CRACK);
      } else if (a < hatch + SETTLE) {
        const p = Math.min(1, (a - CRACK_TIME) / (hatch - CRACK_TIME)), q = Math.max(0, (a - hatch) / SETTLE);
        const gap = Math.round(1 + 4 * p - 3 * q), h = Math.round(MAX_H * (1 - .35 * p) * (1 - q) + HEAP_H * q);
        px.rect(g, cx - gap + 1, base - 2, Math.max(1, 2 * gap - 1), 2, DIRT_DEEP);   // terre à vif au fond de la fente
        dome(g, cx, base, h, w, lawn, -1, gap);
        dome(g, cx, base, h, w, lawn, 1, gap);
      } else {
        fx.heaps.push(fx.open.x);
        heap(g, cx, base);
        fx.open = null;
      }
    }

    fx.crumbs = fx.crumbs.filter(c => (c.life -= dt) > 0);
    for (const c of fx.crumbs) {
      c.x += c.vx * dt; c.vy += 160 * dt; c.y = Math.min(base + oy - 1, c.y + c.vy * dt);   // y absolu : elles ne glissent pas avec la caméra
      px.rect(g, Math.round(c.x), Math.round(c.y) - oy, 1, 1, c.c);
    }
  }

  FP.mound = { draw, swell };
})();
