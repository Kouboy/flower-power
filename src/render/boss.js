// render/boss.js — le boss, provisoire (v5.1.0 : formes simples dessinées par le code, sans image) : parois, cibles, tête, plaques du blindage, et ses menaces (hachures de la défense, visée des tourelles, projectiles).
// Lit     : state.{time,camera.y,run.milieu,plant.tip,bossFight.{headOpen,destroyed},bossThreats.{rooms,aim,shots}}, state.world.{width,height,viewH,bossLevel.{walls,targets,head,plates,rooms,turrets}} (x, y, collision, off de chaque solide),
//           FP.config.milieux, FP.palette.boss, FP.bossThreats.timing, FP.px (dont layer et blit).
// Écrit   : rien dans l'état (la toile reçue ; un calque en cache, créé à la première utilisation).
// Expose  : FP.bossRender.draw(g, state) — repère d'art, la caméra est appliquée ici ; rien hors niveau de boss ; fillPoly, artPoly (pour boss-fx.js).
// Cible détruite (off) : épave sombre qui fume ; plaque tombée ou paroi effondrée (off) : rien ; tête à nu (bossFight.headOpen) : lueur qui pulse ; tête transpercée (off) : épave.
// Calque (revue finale) : parois, plaques et cibles intactes (sans leur cœur qui pulse) sont peintes une fois, sur toute la hauteur du niveau,
// puis recopiées ; le calque est refait à chaque génération et quand une cible, une plaque ou une paroi (effondrée à la mort du boss : off,
// plus dessinée) change d'état. Sans DOM (sous Node), FP.px.layer
// vaut null : tout est peint en direct, de la même façon.
// Avertissement d'une défense : la salle tremble (ses rangées du calque et ses tourelles, ± 1 pixel d'art en x).
// Ne touche pas au DOM au chargement : chargeable dans dev/check.html.
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  const SHAKE_HZ = 30, SHAKE_PAD = 4;   // tremblement de la salle avertie : bascules par seconde, rangées en plus au-dessus et au-dessous

  // Solide → polygone en pixels d'art (caméra appliquée), décalé de dx en x.
  const artPoly = (o, cam, dx = 0) => o.collision.map(([x, y]) => [FP.px.toArt(o.x + x) + dx, FP.px.toArt(o.y + y) - cam]);

  // Polygone quelconque (concave compris), rempli rangée par rangée (règle pair-impair) ; inset rogne chaque bout de rangée
  // et les rangées du haut et du bas (contour d'autant de pixels laissé à la couleur d'en dessous).
  function fillPoly(g, pts, color, inset = 0) {
    let lo = Infinity, hi = -Infinity;
    for (const p of pts) { lo = Math.min(lo, p[1]); hi = Math.max(hi, p[1]); }
    for (let y = Math.ceil(lo) + inset; y <= Math.floor(hi) - inset; y++) {
      const xs = [];
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i], q = pts[(i + 1) % pts.length];
        if ((p[1] <= y + .5) === (q[1] <= y + .5)) continue;
        xs.push(p[0] + (y + .5 - p[1]) / (q[1] - p[1]) * (q[0] - p[0]));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const a = Math.round(xs[k]) + inset, b = Math.round(xs[k + 1]) - inset;
        if (b > a) FP.px.rect(g, a, y, b - a, 1, color);
      }
    }
  }

  // Boîte d'un polygone en pixels d'art.
  function box(pts) {
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
  }

  // Paroi : contour, reflet, liseré d'ombre à 3 pixels du bord, corps, rivets réguliers le long du haut.
  function wall(g, pts, M) {
    fillPoly(g, pts, M.edge);
    fillPoly(g, pts, M.light, 1);
    fillPoly(g, pts, M.dark, 2);
    fillPoly(g, pts, M.body, 3);
    const b = box(pts);
    for (let x = Math.ceil(b.x0) + 4; x < b.x1 - 4; x += 9) FP.px.rect(g, x, Math.ceil(b.y0) + 2, 1, 1, M.rivet);
  }

  // Épave (cible détruite, tête transpercée) : trou sombre d'où monte de la fumée.
  function wreck(g, pts, t, M) {
    const P = FP.palette.boss, b = box(pts), cx = Math.round((b.x0 + b.x1) / 2);
    fillPoly(g, pts, M.edge);
    fillPoly(g, pts, P.hole, 1);
    for (let j = 0; j < 3; j++) {
      const rise = Math.floor((t * 9 + j * 6) % 18);
      FP.px.disc(g, cx + Math.round(Math.sin(t * 2 + j * 2.1) * 2) + (j - 1) * Math.round((b.x1 - b.x0) / 4), Math.round(b.y0) - rise, rise < 9 ? 1 : 2, P.smoke[rise < 9 ? 0 : 1]);
    }
  }

  // Cible intacte : bloc incandescent (fond peint dans le calque) dont le cœur pulse.
  function targetBase(g, pts, M) { fillPoly(g, pts, M.edge); fillPoly(g, pts, FP.palette.boss.weak[1], 1); }
  const targetCore = (g, pts, t) => fillPoly(g, pts, FP.palette.boss.weak[0], 2 + Math.round((Math.sin(t * 6) + 1) / 2));

  // Tête : bloc sombre tant qu'elle est blindée ; à nu, une lueur pulse au centre ; transpercée, une épave.
  function head(g, pts, open, off, t, M) {
    if (off) { wreck(g, pts, t, M); return; }
    const P = FP.palette.boss, b = box(pts), cx = Math.round((b.x0 + b.x1) / 2), cy = Math.round((b.y0 + b.y1) / 2);
    fillPoly(g, pts, M.edge);
    fillPoly(g, pts, open ? P.glow[0] : M.dark, 1);
    if (!open) return;
    const r = 2 + Math.round((Math.sin(t * 5) + 1) * 1.5);
    FP.px.disc(g, cx, cy, r + 1, P.glow[1]); FP.px.disc(g, cx, cy, r, P.weak[1]); FP.px.disc(g, cx, cy, Math.max(1, r - 2), P.weak[0]);
  }

  // Plaque du blindage : tôle claire au contour sombre, deux rivets.
  function plate(g, pts) {
    const P = FP.palette.boss, b = box(pts);
    fillPoly(g, pts, P.plate[1]);
    fillPoly(g, pts, P.plate[0], 1);
    if (b.x1 - b.x0 > 6 && b.y1 - b.y0 > 4) for (const x of [Math.ceil(b.x0) + 2, Math.floor(b.x1) - 3]) FP.px.rect(g, x, Math.ceil(b.y0) + 2, 1, 1, P.plate[1]);
  }

  // --- Pièces fixes : parois, fonds des cibles intactes, plaques en place ; peintes dans le calque, ou en direct sans DOM. ---

  // shift(o) : décalage en x d'une pièce (le tremblement, en direct) ; seen(o) : pièce à peindre.
  function still(g, bl, M, cam, shift, seen) {
    for (const o of bl.walls) if (!o.off && seen(o)) wall(g, artPoly(o, cam, shift(o)), M);
    for (const tg of bl.targets) if (!tg.solid.off && seen(tg.solid)) targetBase(g, artPoly(tg.solid, cam, shift(tg.solid)), M);
    for (const p of bl.plates) if (!p.solid.off && seen(p.solid)) plate(g, artPoly(p.solid, cam, shift(p.solid)));
  }

  let cache = null, cachedLevel = null, cachedKey = '';
  const keyOf = (bl, milieu) => milieu + ':' + bl.targets.map(t => +t.solid.off).join('') + bl.plates.map(p => +p.solid.off).join('') + bl.walls.map(w => +w.off).join('');

  // Le calque du niveau (w × h pixels d'art, du haut du monde), refait si le niveau ou l'état d'une pièce a changé ; null sans DOM.
  function layerFor(state, bl, M) {
    const key = keyOf(bl, state.run.milieu);
    if (cache && cachedLevel === bl && cachedKey === key) return cache;
    const l = FP.px.layer(Math.ceil(state.world.width / FP.px.SCALE), Math.ceil(state.world.height / FP.px.SCALE));
    if (!l) return null;
    still(l.g, bl, M, 0, () => 0, () => true);
    cache = l; cachedLevel = bl; cachedKey = key;
    return l;
  }

  // Salles en avertissement : leurs rangées d'art absolues [ya, yb] et le décalage du moment (± 1).
  function shaking(state, bl) {
    const out = [], dx = Math.floor(state.time * SHAKE_HZ) % 2 ? 1 : -1;
    for (const r of bl.rooms) {
      const e = state.bossThreats.rooms[r.id];
      if (e && e.stage === 'warn') out.push({ id: r.id, ya: FP.px.toArt(r.y0) - SHAKE_PAD, yb: FP.px.toArt(r.y1) + SHAKE_PAD, dx });
    }
    return out;
  }

  // Recopie de la tranche visible du calque, rangée par bande : les bandes des salles averties décalées de leur dx.
  function blitShaken(g, l, oy, h, bands) {
    let y = oy;
    const cut = (to, dx) => {
      const sy = Math.max(0, y), sh = Math.min(to, oy + h, l.canvas.height) - sy;
      if (sh > 0) g.drawImage(l.canvas, 0, sy, l.canvas.width, sh, dx, sy - oy, l.canvas.width, sh);
      y = Math.max(y, to);
    };
    for (const b of bands.slice().sort((p, q) => p.ya - q.ya)) { if (b.ya > y) cut(b.ya, 0); cut(b.yb + 1, b.dx); }
    cut(oy + h, 0);
  }

  // --- Menaces : zone de la défense (hachures), visée des tourelles, projectiles. ---

  // Hachures en escalier à 45° (marches de STEP pixels) dans le rectangle [xa, xb] × [ya, yb] de l'écran d'art ; w : largeur d'une bande.
  const STEP = 6, PERIOD = 16;
  function hatches(g, xa, xb, ya, yb, w, color) {
    for (let y = ya; y < yb; y += STEP) {
      const h = Math.min(STEP, yb - y);
      for (let sx = xa - (yb - ya) - PERIOD; sx < xb; sx += PERIOD) {
        const x0 = Math.max(xa, sx + (y - ya)), x1 = Math.min(xb, sx + (y - ya) + w);
        if (x1 > x0) FP.px.rect(g, x0, y, x1 - x0, h, color);
      }
    }
  }

  // Défense d'une salle : avertissement (hachures qui clignotent de plus en plus vite, jusqu'au coup), coup (bandes pleines et larges, cadre).
  function danger(g, r, e, cam, state) {
    if (e.stage !== 'warn' && e.stage !== 'strike') return;
    const P = FP.palette.boss, mid = (r.x0 + r.x1) / 2, H = FP.px.toArt(state.world.viewH);
    const xa = FP.px.toArt(e.half < 0 ? r.x0 : mid), xb = FP.px.toArt(e.half < 0 ? mid : r.x1);
    const ya = Math.max(0, FP.px.toArt(r.y0) - cam), yb = Math.min(H, FP.px.toArt(r.y1) - cam);
    if (yb <= ya) return;
    if (e.stage === 'strike') {
      hatches(g, xa, xb, ya, yb, 11, P.hatch[1]); hatches(g, xa, xb, ya, yb, 5, P.hatch[0]);
      FP.px.rect(g, xa, ya, xb - xa, 1, P.hatch[0]); FP.px.rect(g, xa, yb - 1, xb - xa, 1, P.hatch[0]);
      return;
    }
    const W = FP.bossThreats.timing(state.bossFight.destroyed.filter(Boolean).length, FP.config.milieux[state.run.milieu].id).warn;
    const phase = 2 * e.t + 5 * e.t * e.t / W;    // clignotement de 2 à 12 Hz
    if (Math.floor(phase * 2) % 2 === 0) hatches(g, xa, xb, ya, yb, 6, P.hatch[0]);
    FP.px.rect(g, xa, ya, xb - xa, 1, P.hatch[1]); FP.px.rect(g, xa, yb - 1, xb - xa, 1, P.hatch[1]);
  }

  // Ligne de visée : de la tourelle vers la pointe (orange, pointillée) ; une fois figée, rouge et continue, prolongée au-delà du point visé.
  function aimLine(g, tur, to, locked, cam) {
    const P = FP.palette.boss, ax = FP.px.toArt(tur.x), ay = FP.px.toArt(tur.y) - cam;
    const dx = FP.px.toArt(to.x) - ax, dy = FP.px.toArt(to.y) - cam - ay, len = Math.hypot(dx, dy) || 1, reach = locked ? 400 : len;
    for (let d = 4; d < reach; d += 2) {
      if (!locked && Math.floor(d / 4) % 2) continue;
      FP.px.rect(g, ax + dx / len * d, ay + dy / len * d, 1, 1, locked ? P.aim[1] : P.aim[0]);
    }
  }

  // Projectile : noyau clair dans un halo rouge, avec une traînée de deux points.
  function shot(g, s, cam) {
    const P = FP.palette.boss, x = FP.px.toArt(s.x), y = FP.px.toArt(s.y) - cam, sp = Math.hypot(s.vx, s.vy) || 1;
    for (let k = 2; k >= 1; k--) FP.px.disc(g, x - s.vx / sp * k * 4, y - s.vy / sp * k * 4, 1, P.shot[0]);
    FP.px.disc(g, x, y, FP.px.toArt(FP.config.boss.shot.r), P.shot[0]);
    FP.px.disc(g, x, y, Math.max(1, FP.px.toArt(FP.config.boss.shot.r) - 2), P.shot[1]);
  }

  // Tourelle : socle et lentille (rouge quand elle vise), décalée de dx quand sa salle tremble.
  function turret(g, q, aiming, cam, M, dx) {
    const x = FP.px.toArt(q.x) + dx, y = FP.px.toArt(q.y) - cam;
    FP.px.disc(g, x, y, 4, M.edge); FP.px.disc(g, x, y, 3, M.light); FP.px.disc(g, x, y, 1, aiming ? FP.palette.boss.weak[1] : M.dark);
  }

  function threats(g, state, bl, cam, M, bands) {
    const th = state.bossThreats, top = state.camera.y, H = state.world.viewH;
    for (const r of bl.rooms) if (th.rooms[r.id] && r.y1 >= top && r.y0 <= top + H) danger(g, r, th.rooms[r.id], cam, state);
    for (const q of bl.head.solid.off ? [] : bl.turrets) {   // boss transpercé : ses tourelles tombent avec ses parois
      if (q.y < top - 10 || q.y > top + H + 10) continue;
      const b = bands.find(s => s.id === q.room);
      turret(g, q, !!th.aim && th.aim.turret === q.id, cam, M, b ? b.dx : 0);
    }
    const a = th.aim, tur = a && bl.turrets.find(q => q.id === a.turret), to = a && (a.lockedAt || state.plant.tip);
    if (tur && to) aimLine(g, tur, to, !!a.lockedAt, cam);
    for (const s of th.shots) shot(g, s, cam);
  }

  function draw(g, state) {
    const w = state.world, bl = w.bossLevel;
    if (!bl) return;
    const cam = FP.px.toArt(state.camera.y), top = state.camera.y, H = w.viewH, t = state.time;
    const M = FP.palette.boss.milieux[FP.config.milieux[state.run.milieu].id];
    const seen = (o) => o.y + o.broadR >= top && o.y - o.broadR <= top + H;
    const bands = shaking(state, bl), l = layerFor(state, bl, M);
    const shift = (o) => { const y = FP.px.toArt(o.y), b = bands.find(s => y >= s.ya && y <= s.yb); return b ? b.dx : 0; };
    if (l) blitShaken(g, l, cam, Math.ceil(H / FP.px.SCALE) + 1, bands);
    else still(g, bl, M, cam, shift, seen);
    for (const tg of bl.targets) {
      if (!seen(tg.solid)) continue;
      const pts = artPoly(tg.solid, cam, shift(tg.solid));
      if (tg.solid.off) wreck(g, pts, t, M); else targetCore(g, pts, t);
    }
    if (seen(bl.head.solid)) head(g, artPoly(bl.head.solid, cam), state.bossFight.headOpen, bl.head.solid.off, t, M);
    threats(g, state, bl, cam, M, bands);
  }

  FP.bossRender = { draw, fillPoly, artPoly };
})();
