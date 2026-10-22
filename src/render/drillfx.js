// render/drillfx.js — effets de la foreuse (ROW ROW FIGHT THE POWER) : fissures devant la mèche, onde de forage à chaque
// battement de croissance, étincelles quand la mèche racle un obstacle.
// Lit     : state.mode, state.time, state.events (growthTick), state.plant.{tip,dir}, state.camera.y, state.graze.active,
//           state.query.grazes, FP.plantRender.drill, FP.px.
// Écrit   : state.fx.drill uniquement (réservé au rendu) ; aléatoire purement visuel (Math.random).
// Expose  : FP.drillFx.drawUnder(actx, state) (fissures, sous la plante), FP.drillFx.drawOver(actx, state) (ondes et étincelles,
//           devant la tête) — repère d'art, caméra appliquée ici ; FP.drillFx.sparkSources(state) (pur, testé).
// Ne touche pas au DOM : testable sous Node. L'intensité suit la vitesse de la pousse (FP.plantRender.drill).
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  const TAU = FP.TAU;
  const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
  const CRACK = '#0a0605', DIRT = '#b8916a', DIRT_DARK = '#7a5a3e', SPARKS = ['#fff0a0', '#ffd060', '#ff9030'];
  const HEAD = 3;   // le centre de la tête est 3 pixels d'art au-dessus de la pointe (render/plant.js)
  const AHEAD = 40, CRACK_AHEAD = 62;   // px monde : ondes au bout de la mèche, fissures dans la terre encore intacte devant
  const rand = (a, b) => a + (b - a) * Math.random();

  // D'où partent les étincelles : un point au bord de la tête, du côté de chaque obstacle frôlé (les limaces ne font pas
  // d'étincelles : pas de métal). strength = intensité du frôlement.
  function sparkSources(state) {
    const tip = state.plant.tip, out = [];
    if (state.mode !== 'playing' || !tip) return out;
    for (const g of (state.query && state.query.grazes) || []) {
      if (g.kind !== 'solid' || !state.graze.active.has(g.obj)) continue;
      const dx = g.obj.x - tip.x, dy = g.obj.y - tip.y, d = Math.hypot(dx, dy) || 1;
      out.push({ x: tip.x + dx / d * 12, y: tip.y + dy / d * 12, nx: dx / d, ny: dy / d, strength: g.intensity });
    }
    return out;
  }

  function store(state) {
    return state.fx.drill || (state.fx.drill = { cracks: [], rings: [], sparks: [], last: null });
  }

  // Nouveaux effets de la frame : fissures et onde au battement de croissance, étincelles au frôlement.
  function spawn(state, fx, dt) {
    const d = FP.plantRender.drill(state);
    if (!d.active) return d;
    const p = state.plant, ux = p.dir.x, uy = p.dir.y, t = state.time;
    for (const e of state.events) {
      if (e.type !== 'growthTick') continue;
      fx.rings.push({ t0: t, x: p.tip.x + ux * AHEAD, y: p.tip.y + uy * AHEAD - HEAD * 2 });
      if (Math.random() < .45 + .45 * d.k) {
        const base = Math.atan2(uy, ux) + rand(-.9, .9), pts = [[p.tip.x + ux * CRACK_AHEAD, p.tip.y + uy * CRACK_AHEAD - HEAD * 2]];
        for (let i = 0; i < 3; i++) { const a = base + rand(-.6, .6), l = rand(5, 9); const [x, y] = pts[pts.length - 1]; pts.push([x + Math.cos(a) * l, y + Math.sin(a) * l]); }
        fx.cracks.push({ t0: t, pts });
      }
    }
    for (const s of sparkSources(state)) {
      const n = Math.random() < dt * 60 * (.4 + s.strength) ? 1 + (Math.random() < s.strength ? 1 : 0) : 0;
      for (let i = 0; i < n; i++) {
        const tx = -s.ny, ty = s.nx, side = Math.random() < .5 ? -1 : 1, v = rand(60, 140);
        fx.sparks.push({ x: s.x, y: s.y, vx: (tx * side * .8 - s.nx * .4 - ux * .6) * v, vy: (ty * side * .8 - s.ny * .4 - uy * .6) * v, life: rand(.15, .35), c: SPARKS[(Math.random() * 3) | 0] });
      }
    }
    return d;
  }

  // Pixel qui s'estompe : il disparaît selon le motif de Bayer quand a baisse (pas de transparence).
  const keep = (x, y, a) => BAYER[y & 3][x & 3] < a * 16;

  // Passe 1, sous la plante : fissures dans la terre devant la mèche (elles ne doivent pas brouiller le visage).
  function drawUnder(g, state) {
    if (!state.fx) return;
    const fx = store(state), { px } = FP, t = state.time, oy = px.toArt(state.camera.y);
    fx.dt = fx.last === null ? 0 : Math.max(0, Math.min(.05, t - fx.last));
    fx.last = t;
    spawn(state, fx, fx.dt);
    // Fissures : elles se propagent en .12 s, puis s'effacent en .5 s.
    fx.cracks = fx.cracks.filter(c => t - c.t0 < .6);
    for (const c of fx.cracks) {
      const age = t - c.t0, shown = Math.min(c.pts.length - 1, Math.ceil(age / .12 * (c.pts.length - 1))), a = 1 - Math.max(0, age - .1) / .5;
      for (let i = 1; i <= shown; i++) {
        const [x0, y0] = c.pts[i - 1], [x1, y1] = c.pts[i];
        const ax = px.toArt(x0), ay = px.toArt(y0) - oy, bx = px.toArt(x1), by = px.toArt(y1) - oy, n = Math.max(Math.abs(bx - ax), Math.abs(by - ay), 1);
        for (let k = 0; k <= n; k++) {
          const x = Math.round(ax + (bx - ax) * k / n), y = Math.round(ay + (by - ay) * k / n);
          if (!keep(x, y + oy, a)) continue;
          px.rect(g, x, y, 1, 1, CRACK);
          px.rect(g, x + 1, y - 1, 1, 1, DIRT_DARK);   // lèvre de terre soulevée : la fissure se lit sur terre sombre
        }
      }
    }
  }

  // Passe 2, devant la tête : ondes de forage et étincelles passent par-dessus, comme des débris projetés.
  function drawOver(g, state) {
    if (!state.fx || !state.fx.drill) return;
    const fx = state.fx.drill, { px } = FP, t = state.time, oy = px.toArt(state.camera.y), dt = fx.dt || 0;
    // Onde de forage : un anneau tramé qui s'élargit devant la mèche.
    fx.rings = fx.rings.filter(r => t - r.t0 < .3);
    for (const r of fx.rings) {
      const k = (t - r.t0) / .3, rad = Math.round(3 + 9 * k), cx = px.toArt(r.x), cy = px.toArt(r.y) - oy;
      for (let i = 0; i < 28; i++) { const an = i / 28 * TAU, x = cx + Math.round(Math.cos(an) * rad), y = cy + Math.round(Math.sin(an) * rad); if (keep(x, y + oy, (1 - k) * .8)) px.rect(g, x, y, 1, 1, i % 2 ? DIRT : DIRT_DARK); }
    }
    // Étincelles : petites, vives, freinées.
    fx.sparks = fx.sparks.filter(sp => (sp.life -= dt) > 0);
    for (const sp of fx.sparks) {
      sp.x += sp.vx * dt; sp.y += sp.vy * dt; sp.vx *= .9; sp.vy = sp.vy * .9 + 120 * dt;
      px.rect(g, px.toArt(sp.x), px.toArt(sp.y) - oy, 1, 1, sp.c);
    }
  }

  FP.drillFx = { drawUnder, drawOver, sparkSources };
})();
