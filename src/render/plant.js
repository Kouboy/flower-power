// render/plant.js — tige, anciennes tiges, graine endormie, héros et guide du pointeur, en pixels d'art.
// Lit     : state.plant, state.world.milieu, state.input, state.mode, state.time, state.world.viewH, state.camera.y, FP.config.plant.control, FP.plant.speed,
//           FP.px, FP.palette.{stem,seed,strataTone}, FP.soil.surfaceTop, FP.geom.{clampUpAngle,distPointToSegment}, FP.hero, FP.cast, FP.powerupsRender.drawShield.
// Écrit   : rien (le canvas uniquement).
// Expose  : FP.plantRender.drawOld(actx, state) (anciennes tiges, sous les obstacles), FP.plantRender.draw(actx, state) (repère d'art, caméra appliquée ici), FP.plantRender.drawFinger(g, state) (toile d'interface),
//           FP.plantRender.buried(x, y, old) — portion de tige recouverte de terre, FP.plantRender.haloLevel(d, old) — densité
//           du halo tramé autour de la tige et de la graine, FP.plantRender.drill(state) — foreuse devant la tête, FP.plantRender.drillStart(id) — où elle commence (pures, testées),
//           FP.plantRender.seed(g, seed, oy, germ, t) — la graine et sa germination (testée).
// Porté de la v3.43.16 (drawTrail, drawPlant, drawPointer), redessiné en pixels pour la v4.1.0.
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  const TAU = FP.TAU;
  const { clamp, lerp } = FP.math;
  const LEAF_EVERY = 5;   // une feuille tous les 5 points de trace (≈ 43 px)

  // --- Enfouissement : la tige fouit, la terre la recouvre par endroits ---------------------------

  const ROOT = '#7a6248', MYCELIUM = '#d8cfbe';
  const HALO = '#0a0605', HALO_BAND = 3;   // même noir tramé que le halo des obstacles et le grain de la terre
  const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];

  // Densité (niveau de Bayer, 0 à 16) du halo à d pixels d'art du bord de la tige : dense contre la tige, nul au bord de la bande.
  function haloLevel(d, old) {
    if (d >= HALO_BAND) return 0;
    return Math.round(16 * (old ? .3 : .55) * (1 - Math.max(0, d) / HALO_BAND));
  }

  // Halo tramé autour d'un segment (pixels d'art) ; motif ancré sur la grille du monde (y + oy) : il ne scintille pas.
  function haloAround(g, q, oy, old, half) {
    const [ax, ay] = q.a, [bx, by] = q.b, len = Math.max(1, Math.hypot(bx - ax, by - ay)), nx = -(by - ay) / len, ny = (bx - ax) / len;
    // On ne parcourt que la bande : le long du segment, puis de part et d'autre, pixel par pixel.
    for (let t = 0; t <= len; t++) {
      const cx = ax + (bx - ax) * t / len, cy = ay + (by - ay) * t / len;
      for (let k = 0; k < HALO_BAND; k++) {
        const lv = haloLevel(k, old);
        for (const side of [-1, 1]) {
          const x = Math.round(cx + nx * side * (half + k + .5)), y = Math.round(cy + ny * side * (half + k + .5));
          if (BAYER[(y + oy) & 3][x & 3] < lv) FP.px.rect(g, x, y, 1, 1, HALO);
        }
      }
    }
  }

  const CELL = 10;                         // taille (px monde) des portions recouvertes ou non

  // Empreinte stable (finaliseur de MurmurHash3) de deux entiers : ne dépend que de la position, pas de l'ordre des points.
  function mix(a, b, salt) {
    let h = (Math.imul(a, 0x9e3779b1) + Math.imul(b, 0x85ebca77) + Math.imul(salt, 0xc2b2ae3d)) | 0;
    h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
    return h >>> 0;
  }
  const cellHash = (x, y, salt) => mix(Math.floor(x / CELL), Math.floor(y / CELL), salt);

  // Mottes réparties, jamais groupées : par groupe de 4 cases d'une colonne, une case recouverte (tige courante, 25 %),
  // ou une à deux cases laissées visibles (anciennes tiges, ≈ 60 %).
  function buried(x, y, old) {
    const cx = Math.floor(x / CELL), cy = Math.floor(y / CELL), group = Math.floor(cy / 4), slot = ((cy % 4) + 4) % 4, h = mix(cx, group, 1);
    if (!old) return slot === h % 4;
    return slot !== h % 4 && slot !== (h >>> 2) % 4;
  }

  // Profondeur relative (0 = surface, 1 = fond) pour choisir la teinte de terre.
  const depthOf = (world, y) => Math.max(0, Math.min(.999, (y - FP.soil.surfaceTop(world)) / (world.height - FP.soil.surfaceTop(world))));

  // --- Calques (v4.7.5) : dessinés une fois au repère du monde (oy = 0), puis recopiés à chaque image. ---

  const worldLayer = (world) => FP.px.layer(Math.ceil(world.width / FP.px.SCALE) + 2, Math.ceil(world.height / FP.px.SCALE) + 16);
  const rows = (viewH) => Math.ceil(viewH / FP.px.SCALE) + 1;
  const HALO_PAD = 6;   // le halo de la tige en cours ne s'écarte jamais de plus de 5 pixels d'art de son segment
  const segBox = (p0, p1) => {
    const { toArt } = FP.px, ax = toArt(p0.x), ay = toArt(p0.y), bx = toArt(p1.x), by = toArt(p1.y);
    return { x0: Math.min(ax, bx) - HALO_PAD, y0: Math.min(ay, by) - HALO_PAD, x1: Math.max(ax, bx) + HALO_PAD, y1: Math.max(ay, by) + HALO_PAD };
  };
  const haloSeg = (g, p0, p1) => haloAround(g, { a: [FP.px.toArt(p0.x), FP.px.toArt(p0.y)], b: [FP.px.toArt(p1.x), FP.px.toArt(p1.y)] }, 0, false, 2);
  const haloCache = { trail: null, world: null, layer: null, drawn: [] };

  // Halo de la tige en cours : chaque nouveau segment s'y ajoute. Quand la queue de la tige s'efface, on efface sa zone
  // et on y redessine les segments qui la touchent (le halo est d'une seule couleur : l'ordre des segments ne compte pas).
  // null sans calque possible : la tige dessine alors son halo en direct.
  function haloLayer(points, world) {
    const c = haloCache;
    if (c.trail !== points || c.world !== world) {
      const l = worldLayer(world);
      if (!l) return null;
      Object.assign(c, { trail: points, world, layer: l, drawn: [] });
    }
    const d = c.drawn, g = c.layer.g, cut = d.indexOf(points[0]);
    if (cut < 0 || d[d.length - 1] !== points[d.length - cut - 1]) { g.clearRect(0, 0, c.layer.canvas.width, c.layer.canvas.height); d.length = 0; }
    for (let k = 0; k < cut && d.length > 1; k++) {
      const b = segBox(d[0], d[1]);
      d.shift();
      g.clearRect(b.x0, b.y0, b.x1 - b.x0 + 1, b.y1 - b.y0 + 1);
      for (let i = 1; i < d.length; i++) {
        const o = segBox(d[i - 1], d[i]);
        if (o.x0 <= b.x1 && o.x1 >= b.x0 && o.y0 <= b.y1 && o.y1 >= b.y0) haloSeg(g, d[i - 1], d[i]);
      }
    }
    for (let i = d.length; i < points.length; i++) { if (i > 0) haloSeg(g, points[i - 1], points[i]); d.push(points[i]); }
    return c.layer;
  }

  // Tige : tunnel remué derrière la pointe, racines, corps, mottes qui la recouvrent, mycélium au premier plan.
  // Seuls les segments visibles sont dessinés ; halo : calque recopié s'il est fourni, sinon dessiné ici.
  function drawStem(g, points, oy, current, world, viewH, halo = null) {
    if (points.length < 2) return;
    const { px, palette } = FP, c = palette.stem, top = oy - 8, bottom = oy + viewH + 8;
    const seg = [];
    for (let i = 1; i < points.length; i++) {
      const p0 = points[i - 1], p1 = points[i], y0 = px.toArt(p0.y) - oy, y1 = px.toArt(p1.y) - oy;
      if (Math.max(y0, y1) + oy < top || Math.min(y0, y1) + oy > bottom) continue;
      const len = Math.hypot(p1.x - p0.x, p1.y - p0.y) || 1;
      seg.push({ i, p0, p1, a: [px.toArt(p0.x), y0], b: [px.toArt(p1.x), y1], nx: -(p1.y - p0.y) / len, ny: (p1.x - p0.x) / len, mx: (p0.x + p1.x) / 2, my: (p0.y + p1.y) / 2 });
    }
    if (!seg.length) return;
    const n = points.length, line = (q, col, t, dx = 0) => px.line(g, q.a[0] + dx, q.a[1], q.b[0] + dx, q.b[1], col, t);
    // Tunnel : sur les 7 derniers segments, de la terre remuée de part et d'autre.
    if (current) for (const q of seg) if (q.i > n - 8) {
      const d = depthOf(world, q.my), ax = px.toArt(q.mx), ay = px.toArt(q.my) - oy;
      for (const side of [-1, 1]) for (let k = 3; k <= 4; k++) px.rect(g, ax + Math.round(q.nx * k * side), ay + Math.round(q.ny * k * side), 1, 1, palette.strataTone(d, k === 3 ? 0 : 3, world.milieu));
    }
    // Halo de terre tassée autour de la tige, comme autour des obstacles.
    if (halo) FP.px.blit(g, halo, oy, rows(viewH));
    else for (const q of seg) haloAround(g, q, oy, !current, current ? 2 : 1.5);
    // Racines fines qui partent de la tige dans la terre.
    for (const q of seg) {
      const h = cellHash(q.mx, q.my, 2);
      if (h % 9) continue;
      const side = h & 16 ? 1 : -1, len = 3 + (h >>> 5) % 4, ax = px.toArt(q.mx), ay = px.toArt(q.my) - oy;
      const ex = ax + Math.round(q.nx * side * (len + 2)), ey = ay + Math.round(q.ny * side * (len + 2)) + 1;
      px.line(g, ax + Math.round(q.nx * side * 2), ay + Math.round(q.ny * side * 2), ex, ey, ROOT);
      px.rect(g, ex + side, ey + 1, 1, 1, ROOT);
    }
    for (const q of seg) line(q, c.outline, current ? 4 : 3);
    for (const q of seg) line(q, current ? c.body : c.old, 2);
    for (const q of seg) line(q, current ? c.light : c.oldLight, 1, -1);
    if (current) {
      for (let i = LEAF_EVERY; i < n - 3; i += LEAF_EVERY) {
        const p = points[i], ay = px.toArt(p.y) - oy;
        if (ay < -4 || ay > viewH / px.SCALE + 4 || buried(p.x, p.y, false)) continue;
        const a = points[i - 1], b = points[i + 1], len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
        const side = (i / LEAF_EVERY) % 2 ? 1 : -1, nx = -(b.y - a.y) / len * side, ny = (b.x - a.x) / len * side;
        const x = px.toArt(p.x) + Math.round(nx * 3), y = ay + Math.round(ny * 3);
        px.rect(g, x - 2, y - 1, 4, 3, c.outline);
        px.rect(g, x - 1, y - 1, 3, 2, c.leaf);
        px.rect(g, x - 1, y - 1, 1, 1, c.light);
      }
    }
    // Mottes : la terre recouvre la tige par endroits (jamais sur les derniers segments, la pointe reste visible).
    for (const q of seg) {
      if (current && q.i > n - 10) continue;
      if (!buried(q.mx, q.my, !current)) continue;
      const d = depthOf(world, q.my), ax = px.toArt(q.mx), ay = px.toArt(q.my) - oy, h = cellHash(q.mx, q.my, 3);
      px.rect(g, ax - 3, ay - 2, 7, 4, palette.strataTone(d, 2, world.milieu));
      px.rect(g, ax - 2, ay - 3, 5, 1, palette.strataTone(d, 1, world.milieu));
      px.rect(g, ax - 2 + (h % 4), ay - 1, 1, 1, palette.strataTone(d, 0, world.milieu));
      px.rect(g, ax - 4, ay - 1 + (h >>> 3) % 2, 1, 2, palette.strataTone(d, 3, world.milieu));
      px.rect(g, ax + 4, ay - 1 + (h >>> 4) % 2, 1, 2, palette.strataTone(d, 3, world.milieu));
    }
    // Mycélium pâle, en pointillés, qui passe devant la tige.
    for (const q of seg) {
      const h = cellHash(q.mx, q.my, 4);
      if (h % 13) continue;
      const ax = px.toArt(q.mx), ay = px.toArt(q.my) - oy, tilt = ((h >>> 6) % 3) - 1;
      for (let k = -6; k <= 6; k += 2) px.rect(g, ax + Math.round(q.nx * k), ay + Math.round(q.ny * k) + Math.round(k * tilt / 4), 1, 1, MYCELIUM);
    }
  }

  // --- Foreuse : la tête creuse comme une mèche (ROW ROW FIGHT THE POWER) ---------------------------------

  const DRILL = { spinBase: 9, spinGain: 16, lenBase: 4.5, lenGain: 3.5, radius: 4, streak: .55 };   // rad/s, pixels d'art (v4.7.0 : un quart plus petite)
  const DRILL_TONES = ['#b8916a', '#7a5a3e'];   // terre claire remuée, bien visible sur toutes les strates

  // État de la foreuse (pur, testé) : rotation et longueur suivent la vitesse de la pousse ; seulement pendant la pousse.
  function drill(state) {
    if (state.mode !== 'playing' || !state.plant.tip) return { active: false, angle: 0, spin: 0, length: 0, k: 0 };
    const k = Math.max(0, Math.min(1, FP.plant.speed(state) / 190)) * (state.input.down ? 1.15 : 1);
    const spin = DRILL.spinBase + DRILL.spinGain * k;
    return { active: true, angle: state.time * spin, spin, length: Math.round(DRILL.lenBase + DRILL.lenGain * k), radius: DRILL.radius, k };
  }

  // Mèche devant la tête : un cône plein qui se resserre vers l'avant, rayé de bandes diagonales qui défilent
  // avec la rotation (vis de foreuse), contour sombre. Quelques points de vitesse traînent sur les côtés.
  // Distance du centre de la tête où la foreuse commence : au-dessus de la pointe, ou des accessoires qui la remplacent.
  const drillStart = (id) => ((FP.cast.get(id) || {}).tip === false ? 12 : 9);

  function drawDrill(g, state, hx, hy) {
    const d = drill(state);
    if (!d.active) return;
    const { px } = FP, p = state.plant, ux = p.dir.x, uy = p.dir.y, nx = -uy, ny = ux;
    const [light, mid] = DRILL_TONES, L = d.length + 2, phase = d.angle / Math.PI * 2, o = drillStart(p.character);
    for (let t = 0; t <= L; t++) {
      const w = Math.round(DRILL.radius * (1 - t / (L + 1)));
      const cx = hx + ux * (o + t), cy = hy + uy * (o + t);
      for (let s = -w - 1; s <= w + 1; s++) {
        const x = Math.round(cx + nx * s), y = Math.round(cy + ny * s);
        if (Math.abs(s) > w) { px.rect(g, x, y, 1, 1, HALO); continue; }                 // contour du cône
        const band = ((Math.floor(t * .8 + s * .6 + phase) % 3) + 3) % 3;
        px.rect(g, x, y, 1, 1, band === 0 ? light : (band === 1 ? mid : HALO));
      }
    }
    px.rect(g, Math.round(hx + ux * (o + 1 + L)), Math.round(hy + uy * (o + 1 + L)), 1, 1, HALO);    // pointe
    if (d.k > DRILL.streak) for (const side of [-1, 1]) for (let i = 0; i < 3; i++) {
      const o = 8 + (i % 2), back = 2 + i * 3 + ((Math.floor(state.time * 24) + i) % 2);
      px.rect(g, Math.round(hx + nx * side * o - ux * back), Math.round(hy + ny * side * o - uy * back), 1, 1, light);
    }
  }

  // Graine du fond : elle dort en attendant le lancement.
  // germ (0 à 1, v4.7.0) : la graine tremble de plus en plus, se fissure à 1/3 puis 2/3, et un germe vert pointe et grandit.
  function drawSeed(g, seed, oy, germ = 0, t = 0) {
    const { px } = FP, c = FP.palette.seed, shake = germ > 0 ? Math.round(Math.sin(t * 60) * germ * 1.6) : 0;
    const ax = px.toArt(seed.x) + shake, ay = px.toArt(seed.y) - oy;
    // Halo tramé autour de la graine, le même que celui des obstacles et de la tige.
    for (let y = -11; y <= 11; y++) for (let x = -11; x <= 11; x++) {
      const lv = haloLevel(Math.hypot(x, y) - 7.5, false);
      if (lv && BAYER[(ay + y + oy) & 3][(ax + x) & 3] < lv) px.rect(g, ax + x, ay + y, 1, 1, HALO);
    }
    px.disc(g, ax, ay, 7, c.outline);
    px.disc(g, ax, ay, 6, c.body);
    px.rect(g, ax + 1, ay - 3, 4, 8, c.shade);
    px.rect(g, ax - 4, ay - 4, 2, 3, c.light);
    px.rect(g, ax - 3, ay - 1, 2, 1, c.outline); px.rect(g, ax + 1, ay - 1, 2, 1, c.outline);   // yeux fermés
    px.rect(g, ax - 1, ay + 2, 2, 1, c.outline);
    if (germ >= 1 / 3) { px.rect(g, ax - 1, ay - 6, 1, 2, c.outline); px.rect(g, ax, ay - 4, 1, 2, c.outline); px.rect(g, ax - 1, ay - 2, 1, 1, c.outline); }   // 1re fissure
    if (germ >= 2 / 3) { px.rect(g, ax + 2, ay - 6, 1, 2, c.outline); px.rect(g, ax + 3, ay - 4, 1, 2, c.outline); px.rect(g, ax + 2, ay - 2, 2, 1, c.outline); }   // 2e
    if (germ > .15) {   // le germe : une tige verte cernée, une petite feuille au bout
      const st = FP.palette.stem, len = Math.round(2 + germ * 7), top = ay - 7 - len;
      px.rect(g, ax - 1, top, 3, len + 1, st.outline); px.rect(g, ax, top, 1, len, st.body);
      if (germ > .5) { px.rect(g, ax + 1, top, 2, 1, st.leaf); px.rect(g, ax + 1, top - 1, 1, 1, st.outline); }
    }
  }

  // Guide : cible devant la pointe et trajectoire prévue, en pointillés de pixels.
  function drawGuide(g, state, oy) {
    const { px } = FP, p = state.plant, c = FP.config.plant.control;
    const y01 = clamp(state.input.y / state.world.viewH, 0, 1);
    const gx = p.guide.x, gy = p.tip.y - lerp(c.lookAheadTop, c.lookAheadBottom, y01);
    px.ring(g, px.toArt(gx), px.toArt(gy) - oy, 8 + Math.round(Math.sin(state.time * 7)), '#f4e6a8');
    let x = p.tip.x, y = p.tip.y, vx = p.dir.x, vy = p.dir.y;
    for (let i = 0; i < 16; i++) {
      const turn = clamp((gx - x) / c.turnDivisor, -1, 1);
      let v = FP.geom.clampUpAngle(turn * c.turnGain * lerp(c.sharpTop, c.sharpBottom, y01), c.desiredY, 89);
      vx = lerp(vx, v.x, .16); vy = lerp(vy, v.y, .16);
      v = FP.geom.clampUpAngle(vx, vy, 89); vx = v.x; vy = v.y;
      x += vx * 9; y += vy * 9;
      if (i % 2 === 1) px.rect(g, px.toArt(x), px.toArt(y) - oy, 1, 1, '#b8a870');
    }
  }

  // Anciennes tiges : juste après la terre, sous les dangers et les déchets (elles ne brouillent pas le terrain).
  // Dessinées entières dans un calque quand une tige s'ajoute (ou au changement de niveau), recopiées ensuite.
  const oldCache = { key: null, layer: null };
  function drawOld(g, state) {
    const w = state.world, trails = state.plant.oldTrails, oy = FP.px.toArt(state.camera.y);
    if (!trails.length) return;
    const key = w.milieu + ',' + w.width + ',' + w.height + ';' + trails.map(t => t.length + ':' + (t[0] ? t[0].x + ':' + t[0].y : '')).join(';');
    if (oldCache.key !== key) {
      const l = worldLayer(w);
      if (!l) { for (const t of trails) drawStem(g, t, oy, false, w, w.viewH); return; }
      for (const t of trails) drawStem(l.g, t, 0, false, w, w.height);
      Object.assign(oldCache, { key, layer: l });
    }
    FP.px.blit(g, oldCache.layer, oy, rows(w.viewH));
  }

  function draw(g, state) {
    const { px } = FP, p = state.plant, camY = state.camera.y, oy = px.toArt(camY);
    if (p.trail.length) drawStem(g, p.trail, oy, true, state.world, state.world.viewH, haloLayer(p.trail, state.world));
    const seedVisible = p.seed.y + 38 >= camY - 70 && p.seed.y - 38 <= camY + state.world.viewH + 70;
    if (seedVisible && !(p.tip && Math.hypot(p.tip.x - p.seed.x, p.tip.y - p.seed.y) < 24)) drawSeed(g, p.seed, oy, state.mode === 'ready' ? p.germ || 0 : 0, state.time);
    const alive = state.mode === 'playing' || state.mode === 'dying' || state.mode === 'over';
    if (alive && p.tip) {
      if (state.mode === 'playing') FP.powerupsRender.drawShield(g, state);   // membrane sous la tête, comme en v3
      drawDrill(g, state, px.toArt(p.tip.x), px.toArt(p.tip.y) - oy - 3);   // la mèche tourne devant la tête
      FP.hero.draw(g, state, px.toArt(p.tip.x), px.toArt(p.tip.y) - oy - 3, p.dir);
      if (state.mode === 'playing' && state.input.down) drawGuide(g, state, oy);
    }
  }

  // Anneau sous le doigt (toile d'interface, pixels d'art) : plein quand on pilote, un pixel sur trois sinon.
  function drawFinger(g, state) {
    const i = state.input;
    if (!i.active || state.mode !== 'playing') return;
    const { px } = FP, cx = px.toArt(i.screenX), cy = px.toArt(i.y), r = 11 + Math.round(Math.sin(state.time * 7));
    const steps = Math.ceil(TAU * r * 1.4), seen = new Set();
    g.fillStyle = '#fff0ad';
    for (let s = 0; s < steps; s++) {
      const x = cx + Math.round(Math.cos(s / steps * TAU) * r), y = cy + Math.round(Math.sin(s / steps * TAU) * r), k = x + ',' + y;
      if (seen.has(k)) continue;
      seen.add(k);
      if (i.down || seen.size % 3 === 0) g.fillRect(x, y, 1, 1);
    }
  }

  FP.plantRender = { drawOld, draw, drawFinger, buried, haloLevel, drill, drillStart, seed: drawSeed };
})();
