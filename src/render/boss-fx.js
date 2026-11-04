// render/boss-fx.js — les effets du combat de boss (v5.1.0) : explosion d'une cible et de la tête, plaque qui tombe, graine qui revient
// au compteur du HUD avec un gros « +1 GRAINE ».
// Lit     : state.{events, time, camera.y, plant.reserves}, state.world.{viewH, width, bossLevel.plates} (solid, target), FP.palette.{boss,seed}, FP.px, FP.font, FP.hud.{seedCenter, SEED_SCALE},
//           FP.bossRender.{fillPoly, artPoly}.
// Écrit   : state.fx.boss uniquement { bursts, flights, plates } (effets horodatés avec state.time, éteints d'eux-mêmes).
// Expose  : FP.bossFx.update(state) (une fois par frame, avant le dessin : events → effets), FP.bossFx.draw(g, state) (toile d'art, monde),
//           FP.bossFx.drawUi(g, state) (toile d'interface : graine en vol, « +1 GRAINE », éclat sur le compteur),
//           FP.bossFx.seedFlight(t, from, to) → { x, y, scale } (pur : de l'épave au compteur, en FLIGHT secondes), FP.bossFx.counter(state) → { x, y } (la graine rendue dans le HUD),
//           FP.bossFx.FLIGHT. Tout en pixels d'art entiers.
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  const TAU = Math.PI * 2;
  const FLIGHT = .9, POP = .25;                 // vol de la graine ; éclat à l'arrivée (s)
  const RISE = .35, LIFT = 14, START = 2, PEAK = 5;   // montée (part du vol), hauteur gagnée (px), taille au départ et au sommet (× pixel d'art)
  const LABEL = '+1 GRAINE', LABEL_SCALE = 3;
  const BOOM = { target: { life: .7, size: 1 }, head: { life: 1.05, size: 2 } }, PLATE_LIFE = .7, FALL = 260;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  const store = (state) => state.fx.boss || (state.fx.boss = { bursts: [], flights: [], plates: [] });

  // Événements de la frame → effets ; ceux qui ont fini sont retirés.
  function update(state) {
    const fx = store(state), t0 = state.time, bl = state.world.bossLevel;
    for (const e of state.events) {
      if (e.type === 'bossTarget') {
        fx.bursts.push({ x: e.x, y: e.y, t0, kind: 'target' });
        const p = bl && bl.plates.find(q => q.target === e.i);
        if (p) fx.plates.push({ solid: p.solid, t0 });
      } else if (e.type === 'bossHead') fx.bursts.push({ x: e.x, y: e.y, t0, kind: 'head' });
      else if (e.type === 'bossSeed') fx.flights.push({ x: e.x, y: e.y, t0 });
    }
    const alive = (f, life) => state.time - f.t0 < life;
    fx.bursts = fx.bursts.filter(b => alive(b, BOOM[b.kind].life));
    fx.plates = fx.plates.filter(p => alive(p, PLATE_LIFE));
    fx.flights = fx.flights.filter(f => alive(f, FLIGHT + POP));
  }

  // Position du compteur de graines où la graine rendue atterrit : la dernière graine pleine (toile d'interface, de hauteur FP.view.ui.h).
  const counter = (state) => FP.hud.seedCenter(Math.max(0, state.plant.reserves - 1), Math.ceil(state.world.viewH / FP.px.SCALE));

  // Vol (pur) : la graine monte de l'épave en grossissant, puis file vers le compteur en rétrécissant à la taille du HUD.
  function seedFlight(t, from, to) {
    const u = clamp(t / FLIGHT, 0, 1), end = FP.hud.SEED_SCALE;
    if (u >= 1) return { x: to.x, y: to.y, scale: end };
    if (u < RISE) { const k = 1 - Math.pow(1 - u / RISE, 2); return { x: from.x, y: from.y - LIFT * k, scale: START + (PEAK - START) * k }; }
    const k = (u - RISE) / (1 - RISE), e = k * k, y0 = from.y - LIFT;
    return { x: from.x + (to.x - from.x) * e, y: y0 + (to.y - y0) * e, scale: PEAK + (end - PEAK) * e };
  }

  // Explosion : éclair blanc, anneau qui s'ouvre (blanc → jaune → orange), éclats qui partent en étoile.
  function burst(g, b, cam, t) {
    const B = FP.palette.boss.boom, def = BOOM[b.kind], k = (t - b.t0) / def.life, s = def.size;
    const x = FP.px.toArt(b.x), y = FP.px.toArt(b.y) - cam, r = Math.round((8 + 30 * k) * s);
    if (k < .3) FP.px.disc(g, x, y, Math.round((9 - 20 * k) * s), B[0]);
    FP.px.disc(g, x, y, Math.round(r * .55 * (1 - k * .6)), B[Math.min(4, 1 + Math.floor(k * 4))]);
    FP.px.ring(g, x, y, r, B[Math.min(4, 2 + Math.floor(k * 3))], 2 * s);
    for (let i = 0; i < 10 * s; i++) {
      const a = i * TAU / (10 * s) + (i % 3) * .2, d = r * (.5 + .7 * ((i * 7) % 5) / 5), q = k < .6 ? 2 : 1;
      FP.px.rect(g, x + Math.cos(a) * d, y + Math.sin(a) * d, q, q, B[3 + (i & 1)]);
    }
  }

  // Plaque qui tombe : elle chute en accélérant et clignote avant de disparaître.
  function plate(g, p, cam, t) {
    const age = t - p.t0, o = p.solid, P = FP.palette.boss;
    if (age > PLATE_LIFE * .6 && Math.floor(age * 24) % 2) return;
    const pts = FP.bossRender.artPoly({ x: o.x, y: o.y + FALL * age * age, collision: o.collision }, cam);
    FP.bossRender.fillPoly(g, pts, P.plate[1]); FP.bossRender.fillPoly(g, pts, P.plate[0], 1);
  }

  function draw(g, state) {
    const fx = state.fx.boss;
    if (!fx) return;
    const cam = FP.px.toArt(state.camera.y), t = state.time;
    for (const p of fx.plates) plate(g, p, cam, t);
    for (const b of fx.bursts) burst(g, b, cam, t);
  }

  // Graine de k pixels par case (grille 6 × 8 du HUD), centrée sur (cx, cy).
  function seedSprite(g, cx, cy, k) {
    const p = FP.palette.seed, x = cx - 3 * k, y = cy - 4 * k, r = (col, dx, dy, w, h) => FP.px.rect(g, x + dx * k, y + dy * k, w * k, h * k, col);
    r(FP.font.INK, 1, 0, 4, 1); r(FP.font.INK, 0, 1, 6, 5); r(FP.font.INK, 1, 6, 4, 1);
    r(p.body, 1, 1, 4, 5); r(p.shade, 3, 2, 2, 4); r(p.light, 2, 2, 1, 2); r('#7fb04a', 2, -1, 2, 1);
  }

  // Interface : pour chaque graine rendue, la graine en vol et « +1 GRAINE » au-dessus de l'épave pendant tout le vol, puis un éclat sur le compteur.
  function drawUi(g, state) {
    const fx = state.fx.boss;
    if (!fx || !fx.flights.length) return;
    const font = FP.font, w = Math.ceil(state.world.width / FP.px.SCALE), h = Math.ceil(state.world.viewH / FP.px.SCALE), to = counter(state);
    for (const f of fx.flights) {
      const age = state.time - f.t0;
      const from = { x: FP.px.toArt(f.x), y: clamp(FP.px.toArt(f.y) - FP.px.toArt(state.camera.y), 12, h - 12) };
      if (age >= FLIGHT) {
        const k = (age - FLIGHT) / POP;
        FP.px.ring(g, to.x, to.y, Math.round(4 + 10 * k), k < .5 ? font.COLORS.gold : FP.palette.boss.weak[1], 2);
        continue;
      }
      const s = seedFlight(age, from, to);
      seedSprite(g, Math.round(s.x), Math.round(s.y), Math.max(1, Math.round(s.scale)));
      const half = Math.ceil(font.measure(LABEL, { scale: LABEL_SCALE }) / 2), bounce = Math.round(Math.abs(Math.sin(age * 14)) * 3);
      font.draw(g, LABEL, clamp(from.x, half + 4, w - half - 4), from.y - 26 - bounce, { scale: LABEL_SCALE, color: font.COLORS.gold, align: 'center' });
    }
  }

  FP.bossFx = { update, draw, drawUi, seedFlight, counter, FLIGHT };
})();
