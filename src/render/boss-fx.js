// render/boss-fx.js — les effets du combat de boss (v5.1.0) : explosion d'une cible, de la tête et des parois à la mort du boss (bossBlast),
// graine qui revient au compteur du HUD
// avec un gros « +1 GRAINE ». Retours de playtest : le point faible détruit éclate (éclair blanc 2 images, éclats tirés de son polygone qui
// retombent, gerbe d'étincelles et de jetons), sa plaque se détache en tournoyant et tombe.
// Lit     : state.{events, time, camera.y, plant.reserves}, state.world.{viewH, width, bossLevel.{targets,plates,walls}} (solid, target), FP.config.boss.hit,
//           FP.palette.{boss,seed,coin}, FP.px, FP.font, FP.hud.{seedCenter, SEED_SCALE}, FP.bossRender.{fillPoly, artPoly}.
// Écrit   : state.fx.boss uniquement { bursts, flights (départ { from } en pixels de la toile d'interface, pris à l'assaut), plates, shards, sparks,
//           flash: { t0, frames } | null } (effets horodatés avec state.time, éteints d'eux-mêmes ; l'éclair compte ses images).
// Expose  : FP.bossFx.update(state) (une fois par frame, avant le dessin : events → effets), FP.bossFx.draw(g, state) (toile d'art, monde),
//           FP.bossFx.drawUi(g, state) (toile d'interface : graine en vol, « +1 GRAINE », éclat sur le compteur),
//           FP.bossFx.seedFlight(t, from, to) → { x, y, scale } (pur : de l'épave au compteur, en FLIGHT secondes), FP.bossFx.counter(state) → { x, y } (la graine rendue dans le HUD),
//           FP.bossFx.flying(state) → graines encore en vol (le HUD les retire du compteur jusqu'à l'atterrissage),
//           FP.bossFx.shatter(poly, n, power, seed) → morceaux { x, y, vx, vy, spin, size } tirés du polygone (pur ; repris par render/boss-death.js),
//           FP.bossFx.shardAt(piece, age) → { x, y, a } (pur : projeté puis retombant, gravité config.boss.hit.gravity),
//           FP.bossFx.platePose(plate, age) → { x, y, a } (pur : la plaque se détache, tournoie et tombe), FP.bossFx.FLIGHT. Tout en pixels d'art entiers.
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  const TAU = Math.PI * 2;
  const FLIGHT = .9, POP = .25;                 // vol de la graine ; éclat à l'arrivée (s)
  const RISE = .35, LIFT = 14, START = 2, PEAK = 5;   // montée (part du vol), hauteur gagnée (px), taille au départ et au sommet (× pixel d'art)
  const LABEL = '+1 GRAINE', LABEL_SCALE = 3;
  const BOOM = { target: { life: .7, size: 1.4 }, head: { life: 1.05, size: 2 }, blast: { life: .8, size: 1.2 } };
  const FLASH_FRAMES = 2, FLASH_MAX = .25;      // l'éclair : deux images, jamais plus d'un quart de seconde de jeu
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // Point du monde → toile d'interface (pixels d'art, caméra du moment), gardé dans le cadre.
  const onScreen = (state, p) => ({ x: FP.px.toArt(p.x), y: clamp(FP.px.toArt(p.y) - FP.px.toArt(state.camera.y), 12, Math.ceil(state.world.viewH / FP.px.SCALE) - 12) });

  const store = (state) => state.fx.boss || (state.fx.boss = { bursts: [], flights: [], plates: [], shards: [], sparks: [], flash: null });

  // Hasard reproductible (même assaut, mêmes éclats) : suite congruentielle tirée d'une graine entière.
  function rand(seed) { let s = seed >>> 0 || 1; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); }
  const seedOf = (x, y) => (Math.round(x) * 73856093) ^ (Math.round(y) * 19349663);
  const worldPoly = (o) => o.collision.map(([x, y]) => [o.x + x, o.y + y]);

  // Morceaux d'un polygone (monde) : n points tirés dedans, projetés depuis son centre (power px/s), vers le haut surtout.
  function shatter(poly, n, power, seed) {
    const r = rand(seed), xs = poly.map(p => p[0]), ys = poly.map(p => p[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, out = [];
    for (let i = 0; i < n; i++) {
      let x = cx, y = cy;
      for (let k = 0; k < 6; k++) { const px = x0 + r() * (x1 - x0), py = y0 + r() * (y1 - y0); if (FP.geom.pointInPoly(px, py, poly)) { x = px; y = py; break; } }
      const a = Math.atan2(y - cy, x - cx) || r() * TAU, v = power * (.5 + .7 * r());
      out.push({ x, y, vx: Math.cos(a) * v * .8, vy: -Math.abs(Math.sin(a)) * v * .6 - power * (.3 + .5 * r()), spin: (r() - .5) * 18, size: 1 + Math.floor(r() * 3) });
    }
    return out;
  }
  const fall = (o, age) => ({ x: o.x + o.vx * age, y: o.y + o.vy * age + FP.config.boss.hit.gravity * age * age / 2, a: o.spin * age });
  const shardAt = (piece, age) => fall(piece, age);
  // La plaque : centre de son solide, petit bond vers le haut, dérive et tournoiement fixés à l'assaut.
  const platePose = (p, age) => fall({ x: p.solid.x, y: p.solid.y, vx: p.vx, vy: p.vy, spin: p.spin }, age);

  // Point faible détruit : explosion, éclair, éclats de la cible, plaque qui se détache, gerbe d'étincelles et de jetons.
  function hit(fx, state, e, t0) {
    const H = FP.config.boss.hit, bl = state.world.bossLevel, tg = bl && bl.targets[e.i], seed = seedOf(e.x, e.y), r = rand(seed ^ 0x2545f491);
    fx.bursts.push({ x: e.x, y: e.y, t0, kind: 'target' });
    fx.flash = { t0, frames: FLASH_FRAMES };
    if (tg) for (const p of shatter(worldPoly(tg.solid), H.shards, 160, seed)) fx.shards.push({ ...p, t0 });
    const pl = bl && bl.plates.find(q => q.target === e.i);
    if (pl) fx.plates.push({ solid: pl.solid, t0, vx: (pl.solid.x < state.world.width / 2 ? -1 : 1) * (30 + 30 * r()), vy: -90, spin: (r() < .5 ? -1 : 1) * (5 + 4 * r()) });
    for (let i = 0; i < H.sparks; i++) {
      const a = -Math.PI / 2 + (r() - .5) * 2.4, v = 120 + 220 * r();
      fx.sparks.push({ x: e.x, y: e.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, spin: 0, t0, token: i % 3 === 0 });
    }
  }

  // Mort du boss : une paroi explose — trois explosions, au centre et vers deux de ses coins, décalées d'un instant.
  function blast(fx, state, e, t0) {
    const w = state.world.bossLevel && state.world.bossLevel.walls[e.i];
    if (!w) return;
    const pts = worldPoly(w), a = pts[e.i % pts.length], b = pts[(e.i + Math.ceil(pts.length / 2)) % pts.length];
    fx.bursts.push({ x: w.x, y: w.y, t0, kind: 'blast' }, { x: (w.x + a[0]) / 2, y: (w.y + a[1]) / 2, t0: t0 + .08, kind: 'blast' }, { x: (w.x + b[0]) / 2, y: (w.y + b[1]) / 2, t0: t0 + .16, kind: 'blast' });
  }

  // Événements de la frame → effets ; ceux qui ont fini sont retirés. L'éclair perd une image à chaque frame.
  function update(state) {
    const fx = store(state), t0 = state.time, H = FP.config.boss.hit;
    if (fx.flash && --fx.flash.frames <= 0) fx.flash = null;
    for (const e of state.events) {
      if (e.type === 'bossTarget') hit(fx, state, e, t0);
      else if (e.type === 'bossHead') fx.bursts.push({ x: e.x, y: e.y, t0, kind: 'head' });
      else if (e.type === 'bossBlast') blast(fx, state, e, t0);
      else if (e.type === 'bossSeed') fx.flights.push({ from: onScreen(state, e), t0 });   // départ figé à l'écran : la caméra peut bouger pendant le vol
    }
    const alive = (f, life) => state.time - f.t0 < life;
    fx.bursts = fx.bursts.filter(b => alive(b, BOOM[b.kind].life));
    fx.plates = fx.plates.filter(p => alive(p, H.plateLife));
    fx.shards = fx.shards.filter(p => alive(p, H.shardLife));
    fx.sparks = fx.sparks.filter(p => alive(p, H.shardLife));
    fx.flights = fx.flights.filter(f => alive(f, FLIGHT + POP));
  }

  // Graines rendues encore en vol (pas encore atterries sur le compteur).
  const flying = (state) => { const fx = state.fx.boss; return fx ? fx.flights.filter(f => state.time - f.t0 < FLIGHT).length : 0; };

  // Position du compteur de graines où la graine rendue atterrit : la case que le HUD a vidée pour elle, la dernière de la réserve
  // (toile d'interface, de hauteur FP.view.ui.h).
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
    FP.px.ring(g, x, y, r, B[Math.min(4, 2 + Math.floor(k * 3))], Math.max(1, Math.round(2 * s)));
    for (let i = 0; i < 10 * s; i++) {
      const a = i * TAU / (10 * s) + (i % 3) * .2, d = r * (.5 + .7 * ((i * 7) % 5) / 5), q = k < .6 ? 2 : 1;
      FP.px.rect(g, x + Math.cos(a) * d, y + Math.sin(a) * d, q, q, B[3 + (i & 1)]);
    }
  }

  // Plaque qui se détache : elle tournoie en tombant (polygone tourné autour de son centre) et clignote avant de disparaître.
  function plate(g, p, cam, t) {
    const age = t - p.t0, P = FP.palette.boss, at = platePose(p, age), c = Math.cos(at.a), s = Math.sin(at.a);
    if (age > FP.config.boss.hit.plateLife * .7 && Math.floor(age * 24) % 2) return;
    const pts = FP.bossRender.artPoly({ x: at.x, y: at.y, collision: p.solid.collision.map(([x, y]) => [x * c - y * s, x * s + y * c]) }, cam);
    FP.bossRender.fillPoly(g, pts, P.plate[1]); FP.bossRender.fillPoly(g, pts, P.plate[0], 1);
  }

  // Éclat : carré de 1 à 3 pixels d'art qui bascule (largeur et hauteur échangées au rythme de sa rotation).
  function shard(g, p, cam, t, colors) {
    const at = shardAt(p, t - p.t0), flip = Math.sin(at.a) > 0, w = p.size + (flip ? 1 : 0), h = p.size + (flip ? 0 : 1);
    FP.px.rect(g, FP.px.toArt(at.x), FP.px.toArt(at.y) - cam, w, h, colors[p.size % colors.length]);
  }

  // Étincelle (deux pixels) ou jeton (disque cuivré au reflet clair) de la gerbe.
  function spark(g, p, cam, t) {
    const at = shardAt(p, t - p.t0), x = FP.px.toArt(at.x), y = FP.px.toArt(at.y) - cam;
    if (p.token) { FP.px.disc(g, x, y, 2, FP.palette.coin.copper); FP.px.rect(g, x - 1, y - 1, 1, 1, FP.palette.coin.shine); }
    else FP.px.rect(g, x, y, 2, 1, FP.palette.boss.boom[(Math.round(x + y) & 1) + 1]);
  }

  function draw(g, state) {
    const fx = state.fx.boss;
    if (!fx) return;
    const cam = FP.px.toArt(state.camera.y), t = state.time, P = FP.palette.boss;
    for (const p of fx.plates) plate(g, p, cam, t);
    for (const b of fx.bursts) burst(g, b, cam, t);
    for (const p of fx.shards) shard(g, p, cam, t, [P.weak[0], P.weak[1], P.boom[3]]);
    for (const p of fx.sparks) spark(g, p, cam, t);
    if (fx.flash && t - fx.flash.t0 < FLASH_MAX) {   // débordant d'un écran de chaque côté : le zoom de la caméra n'en montre jamais le bord
      const w = Math.ceil(state.world.width / FP.px.SCALE), h = Math.ceil(state.world.viewH / FP.px.SCALE);
      FP.px.rect(g, -w, -h, 3 * w, 3 * h, P.flash);
    }
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
    const font = FP.font, w = Math.ceil(state.world.width / FP.px.SCALE), to = counter(state);
    for (const f of fx.flights) {
      const age = state.time - f.t0, from = f.from;
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

  FP.bossFx = { update, draw, drawUi, seedFlight, counter, flying, shatter, shardAt, platePose, FLIGHT };
})();
