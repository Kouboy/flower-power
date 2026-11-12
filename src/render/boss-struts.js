// render/boss-struts.js — les structures de liaison des boss (v5.8.0, boss infiltré) : le squelette de la machine dans laquelle on
// s'infiltre. Poutrelles rivetées et câbles qui traversent un couloir d'un mur à l'autre, grands engrenages accrochés aux murs qui
// tournent (plus vite à chaque pompe cassée, arrêtés à la mort du boss). Opaques, fixés au monde (pas de parallaxe), sans collision ;
// dessinés devant la pousse et les effets, sous les menaces. Jamais sur une pompe, la tête, une plaque ni une tourelle ; jamais de
// traversée dans une salle (là où frappent les défenses) ; au plus maxPerScreen traversées par hauteur d'écran.
// Lit     : state.{seed, time, camera.y, bossFight.destroyed}, state.world.{width, height, viewH, bossLevel.{walls, targets, head, plates,
//           turrets, rooms}}, FP.config.boss.{struts (gap, maxPerScreen, beam, gear, gearHz, gearBoost, clear), turret.size}, FP.bossPlan.zone,
//           FP.palette.boss.strut, FP.px (dont layer et blit), FP.geom.sdPoly, FP.createRng.
// Écrit   : rien dans l'état (la toile reçue ; le placement en cache par niveau ; poutrelles et câbles dans un calque, refait quand un mur
//           tombe ; sans DOM, en direct).
// Expose  : FP.bossStruts.place(bl, world, seed) → [{ kind: 'beam' | 'cable', walls: [a, b], x0, y0, x1, y1 } | { kind: 'gear', walls: [a],
//           cx, cy, r }] (pur, pixels du monde) ; FP.bossStruts.gearAngle(t, state) (pur) ; FP.bossStruts.draw(g, state).
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  const STEP = 2, ROW = 10;   // pas du balayage horizontal et vertical (px)

  const polyOf = (o) => o.collision.map(([x, y]) => [o.x + x, o.y + y]);

  function place(bl, world, seed) {
    const K = FP.config.boss.struts, H = world.viewH, W = world.width, z = FP.bossPlan.zone(world), rng = FP.createRng((seed ^ 0x5717) >>> 0);
    const walls = bl.walls.map(polyOf), prot = [...bl.targets.map(t => t.solid), bl.head.solid, ...bl.plates.map(p => p.solid)].map(polyOf);
    const tr = FP.config.boss.turret.size / 2 * FP.px.SCALE;
    const wallAt = (x, y) => walls.findIndex(p => FP.geom.sdPoly(x, y, p) < 0);
    const inRoom = (x, y) => bl.rooms.some(r => x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1);
    const safe = (x, y, pad) => prot.every(p => FP.geom.sdPoly(x, y, p) >= K.clear + pad) && bl.turrets.every(q => Math.hypot(x - q.x, y - q.y) >= tr + K.clear + pad);
    const out = [], crosses = [], gears = [], spacing = Math.max(H / K.maxPerScreen, H * K.gap);
    // Balayage fin (une rangée tous les ROW px) : à chaque hauteur, les intervalles libres bornés par deux murs (couloirs ou salles).
    for (let y = z.top + ROW; y < z.bottom; y += ROW) {
      const free = []; let start = null;
      for (let x = 0; x <= W; x += STEP) {
        const wall = x < W && wallAt(x, y) >= 0;
        if (!wall && start === null) start = x;
        if ((wall || x >= W) && start !== null) { free.push([start, x]); start = null; }
      }
      for (const [xa, xb] of free) {
        if (xa <= 0 || xb >= W || xb - xa < 16) continue;
        const a = wallAt(xa - STEP, y), b = wallAt(xb + STEP, y);
        if (a < 0 || b < 0) continue;
        // traversée (couloir seulement, au plus une tous les `spacing`) : poutrelle ou câble, légèrement en biais
        if (xb - xa <= H && !crosses.some(c => Math.abs(c - y) < spacing)) {
          const tilt = (rng.next() - .5) * 12, seg = [xa, y - tilt, xb, y + tilt];
          let ok = true;
          for (let k = 0; k <= 12 && ok; k++) { const px = seg[0] + (seg[2] - seg[0]) * k / 12, py = seg[1] + (seg[3] - seg[1]) * k / 12; if (inRoom(px, py) || !safe(px, py, 0)) ok = false; }
          if (ok) { out.push({ kind: rng.next() < .6 ? 'beam' : 'cable', walls: [a, b], x0: seg[0], y0: seg[1], x1: seg[2], y1: seg[3] }); crosses.push(y); }
        }
        // engrenage sur un bord (couloir ou salle), à moitié dans le mur, au plus un tous les spacing / 2
        if (!gears.some(c => Math.abs(c - y) < spacing / 2)) {
          // débord dans le passage : 45 % du rayon, au plus 30 % de sa largeur (un engrenage ne bouche pas un couloir étroit)
          const r = Math.min((K.gear[0] + (K.gear[1] - K.gear[0]) * rng.next()) * FP.px.SCALE, (xb - xa) * .3 / .45), left = rng.next() < .5, cx = left ? xa - r * .55 : xb + r * .55;
          let fine = r >= K.gear[0] * FP.px.SCALE * .75;
          for (let k = 0; k < 16 && fine; k++) { const q = k / 16 * Math.PI * 2; if (!safe(cx + Math.cos(q) * r, y + Math.sin(q) * r, 0)) fine = false; }
          if (fine) { out.push({ kind: 'gear', walls: [left ? a : b], cx, cy: y, r }); gears.push(y); }
        }
      }
    }
    return out;
  }

  function gearAngle(t, state) {
    const bl = state.world.bossLevel, K = FP.config.boss.struts;
    if (!bl || bl.head.solid.off) return 0;
    return t * FP.TAU * (K.gearHz + K.gearBoost * state.bossFight.destroyed.filter(Boolean).length);
  }

  // Poutrelle : âme sombre, semelles claires, rivets, goussets aux deux bouts ; câble : chaînette qui pend.
  function beam(g, e, cam, S, w) {
    const x0 = FP.px.toArt(e.x0), y0 = FP.px.toArt(e.y0) - cam, x1 = FP.px.toArt(e.x1), y1 = FP.px.toArt(e.y1) - cam;
    FP.px.line(g, x0, y0, x1, y1, S.edge, w); FP.px.line(g, x0, y0, x1, y1, S.body, Math.max(1, w - 2));
    const L = Math.max(1, Math.hypot(x1 - x0, y1 - y0)), nx = -(y1 - y0) / L, ny = (x1 - x0) / L, h = Math.floor(w / 2) - 1;
    FP.px.line(g, Math.round(x0 + nx * h), Math.round(y0 + ny * h), Math.round(x1 + nx * h), Math.round(y1 + ny * h), S.light);
    for (let d = 4; d < L - 3; d += 7) FP.px.rect(g, Math.round(x0 + (x1 - x0) * d / L), Math.round(y0 + (y1 - y0) * d / L), 1, 1, S.rivet);
    for (const [x, y] of [[x0, y0], [x1, y1]]) FP.px.rect(g, x - 2, y - w, 4, 2 * w, S.edge);   // goussets
  }
  function cable(g, e, cam, S) {
    const x0 = FP.px.toArt(e.x0), y0 = FP.px.toArt(e.y0) - cam, x1 = FP.px.toArt(e.x1), y1 = FP.px.toArt(e.y1) - cam, n = Math.max(2, Math.abs(x1 - x0));
    const sag = Math.max(4, Math.round(n * .15));
    for (let k = 0; k <= n; k++) { const s = k / n; FP.px.rect(g, Math.round(x0 + (x1 - x0) * s), Math.round(y0 + (y1 - y0) * s + sag * 4 * s * (1 - s)), 1, 2, k % 4 < 2 ? S.edge : S.cable); }
  }
  function gear(g, e, cam, S, a) {
    const cx = FP.px.toArt(e.cx), cy = FP.px.toArt(e.cy) - cam, r = Math.round(e.r / FP.px.SCALE), teeth = Math.max(8, Math.round(r * .9));
    for (let k = 0; k < teeth; k++) { const q = a + k * FP.TAU / teeth; FP.px.rect(g, Math.round(cx + Math.cos(q) * r) - 1, Math.round(cy + Math.sin(q) * r) - 1, 3, 3, S.edge); }
    FP.px.disc(g, cx, cy, r, S.edge); FP.px.disc(g, cx, cy, r - 1, S.body); FP.px.disc(g, cx, cy, Math.round(r * .55), S.edge);
    for (let k = 0; k < 4; k++) { const q = a + k * Math.PI / 2; FP.px.line(g, cx, cy, Math.round(cx + Math.cos(q) * (r - 2)), Math.round(cy + Math.sin(q) * (r - 2)), S.light); }
    FP.px.disc(g, cx, cy, 2, S.rivet);
  }

  let cache = null, cachedFor = null, layer = null, layerFor = null, layerKey = '';
  const standing = (bl, e) => e.walls.every(i => !bl.walls[i].off);
  function crossings(g, bl, cam, H) {
    const S = FP.palette.boss.strut, w = FP.config.boss.struts.beam;
    for (const e of cache) {
      if (e.kind === 'gear' || !standing(bl, e)) continue;
      if (H !== null && (Math.max(e.y0, e.y1) / FP.px.SCALE < cam - w || Math.min(e.y0, e.y1) / FP.px.SCALE > cam + H + w)) continue;
      if (e.kind === 'beam') beam(g, e, cam, S, w); else cable(g, e, cam, S);
    }
  }

  function draw(g, state) {
    const w = state.world, bl = w.bossLevel;
    if (!bl) return;
    if (cachedFor !== bl) { cache = place(bl, w, state.seed); cachedFor = bl; }
    const cam = FP.px.toArt(state.camera.y), H = Math.ceil(w.viewH / FP.px.SCALE), key = bl.walls.map(q => +q.off).join('');
    if (layerFor !== bl || layerKey !== key) {
      layer = FP.px.layer(Math.ceil(w.width / FP.px.SCALE), Math.ceil(w.height / FP.px.SCALE));
      if (layer) crossings(layer.g, bl, 0, null);
      layerFor = bl; layerKey = key;
    }
    if (layer) FP.px.blit(g, layer, cam, H + 1); else crossings(g, bl, cam, H);
    const S = FP.palette.boss.strut, a = gearAngle(state.time, state);
    for (const e of cache) {
      if (e.kind !== 'gear' || !standing(bl, e)) continue;
      const y = e.cy / FP.px.SCALE - cam, r = e.r / FP.px.SCALE;
      if (y + r < 0 || y - r > H) continue;
      gear(g, e, cam, S, a);
    }
  }

  FP.bossStruts = { place, gearAngle, draw };
})();
