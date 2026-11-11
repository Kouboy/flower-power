// render/boss.js — le corps du boss (v5.1.0 ; habillé des images du milieu depuis la v5.6.0, sinon formes du code) : parois, pompes (cibles) dont le piston bat, tête qui tremble au rythme du flux, plaques ; et ses menaces (liseré de la zone visée, visée depuis la bouche du canon, projectiles). Tuyaux, machines de défense, tourelles et terre : render/boss-pipes.js, boss-machines.js, boss-earth.js (v5.7.0).
// Lit     : state.{time,camera.y,run.milieu,plant.tip,bossFight.{headOpen,destroyed},bossThreats.{rooms,aim,shots}}, state.world.{width,height,viewH,bossLevel.{walls,targets,head,plates,rooms,turrets}} (x, y, collision, off de chaque solide),
//           FP.config.milieux, FP.palette.boss, FP.bossThreats.timing, FP.px (dont layer et blit), FP.bossSkin (images du milieu, v5.6.0 ; sans image : formes du code).
// Écrit   : rien dans l'état (la toile reçue ; un calque en cache, créé à la première utilisation).
// Expose  : FP.bossRender.draw(g, state) (corps : parois, cibles, tête, plaques, tourelles) et FP.bossRender.drawThreats(g, state) (menaces :
//           défenses, visée, projectiles ; v5.6.0, dessinées après tout le reste du monde) — repère d'art, la caméra est appliquée ici ;
//           rien hors niveau de boss ; fillPoly, artPoly (pour boss-fx.js).
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
  function fillPoly(g, pts, color, inset = 0) { FP.bossSkin.spans(pts, inset, (y, a, b) => FP.px.rect(g, a, y, b - a, 1, color)); }

  // Boîte d'un polygone en pixels d'art.
  function box(pts) {
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
  }

  // Images du milieu (v5.6.0, render/boss-skin.js) : null pour chaque rôle sans image prête.
  const skinOf = (id) => ({ matter: FP.bossSkin.image(id, 'matter'), target: FP.bossSkin.image(id, 'target'), head: FP.bossSkin.image(id, 'head'),
    plate: FP.bossSkin.image(id, 'plate') });

  // Paroi : contour, puis la matière du boss ancrée au monde (ox, oy : origine du monde dans g) ou, sans image, reflet, liseré d'ombre
  // à 3 pixels du bord et corps ; rivets réguliers le long du haut.
  function wall(g, pts, M, S, ox, oy) {
    fillPoly(g, pts, M.edge);
    if (S.matter) FP.bossSkin.wall(g, pts, S.matter, ox, oy, 1);
    else { fillPoly(g, pts, M.light, 1); fillPoly(g, pts, M.dark, 2); fillPoly(g, pts, M.body, 3); }
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

  // Cible intacte : bloc incandescent ou son image (fond peint dans le calque) dont le cœur pulse ; sur l'image, un éclat au centre.
  function targetBase(g, pts, M, S) {
    fillPoly(g, pts, M.edge);
    if (S.target) { fillPoly(g, pts, M.dark, 1); FP.bossSkin.piece(g, pts, S.target, 1); } else fillPoly(g, pts, FP.palette.boss.weak[1], 1);
  }
  // Pompe (v5.7.0) : un piston bat au-dessus de la cible, à pumpHz, et la pousse le voit pomper le flux vers le cœur.
  function targetCore(g, pts, t, S, M) {
    const pulse = Math.round((Math.sin(t * 6) + 1) / 2), b = box(pts), cx = Math.round((b.x0 + b.x1) / 2);
    if (!S.target) fillPoly(g, pts, FP.palette.boss.weak[0], 2 + pulse);
    else FP.px.disc(g, cx, Math.round((b.y0 + b.y1) / 2), 1 + pulse, FP.palette.boss.weak[0]);
    const stroke = Math.round((Math.sin(t * FP.TAU * FP.config.boss.pipes.pumpHz) + 1) * 1.5), w = Math.max(2, Math.round((b.x1 - b.x0) / 4));
    FP.px.rect(g, cx - Math.floor(w / 2), Math.round(b.y0) - 2 - stroke, w, 2 + stroke, M.light);
    FP.px.rect(g, cx - Math.floor(w / 2) - 1, Math.round(b.y0) - 3 - stroke, w + 2, 1, M.edge);
  }

  // Tête : bloc sombre tant qu'elle est blindée ; à nu, une lueur pulse au centre ; transpercée, une épave.
  function head(g, pts, open, off, t, M, S) {
    if (off) { wreck(g, pts, t, M); return; }
    const P = FP.palette.boss, b = box(pts), cx = Math.round((b.x0 + b.x1) / 2), cy = Math.round((b.y0 + b.y1) / 2);
    fillPoly(g, pts, M.edge);
    if (!open && S.head) { fillPoly(g, pts, M.dark, 1); FP.bossSkin.piece(g, pts, S.head, 1); return; }
    fillPoly(g, pts, open ? P.glow[0] : M.dark, 1);
    if (!open) return;
    const r = 2 + Math.round((Math.sin(t * 5) + 1) * 1.5);
    FP.px.disc(g, cx, cy, r + 1, P.glow[1]); FP.px.disc(g, cx, cy, r, P.weak[1]); FP.px.disc(g, cx, cy, Math.max(1, r - 2), P.weak[0]);
    // À nu (v5.7.0) : des étincelles jaillissent du cœur privé de son flux.
    const R = Math.round((b.x1 - b.x0) / 2) + 1, f = Math.floor(t * 12);
    for (let k = 0; k < 3; k++) { const a = ((f + k * 5) % 12) / 12 * FP.TAU; FP.px.rect(g, Math.round(cx + Math.cos(a) * R), Math.round(cy + Math.sin(a) * R * .6), 1, 1, P.weak[0]); }
  }

  // Plaque du blindage : son image répétée à l'échelle 1 depuis le coin de la plaque (une plaque haute et étroite ne la déforme pas),
  // ou tôle claire au contour sombre, deux rivets.
  function plate(g, pts, S) {
    const P = FP.palette.boss, b = box(pts);
    if (S.plate) { fillPoly(g, pts, P.plate[1]); FP.bossSkin.wall(g, pts, S.plate, Math.round(b.x0), Math.round(b.y0), 1); return; }
    fillPoly(g, pts, P.plate[1]);
    fillPoly(g, pts, P.plate[0], 1);
    if (b.x1 - b.x0 > 6 && b.y1 - b.y0 > 4) for (const x of [Math.ceil(b.x0) + 2, Math.floor(b.x1) - 3]) FP.px.rect(g, x, Math.ceil(b.y0) + 2, 1, 1, P.plate[1]);
  }

  // --- Pièces fixes : parois, fonds des cibles intactes, plaques en place ; peintes dans le calque, ou en direct sans DOM. ---

  // shift(o) : décalage en x d'une pièce (le tremblement, en direct) ; seen(o) : pièce à peindre.
  function still(g, bl, M, S, cam, shift, seen) {
    for (const o of bl.walls) if (!o.off && seen(o)) wall(g, artPoly(o, cam, shift(o)), M, S, shift(o), -cam);
    for (const tg of bl.targets) if (!tg.solid.off && seen(tg.solid)) targetBase(g, artPoly(tg.solid, cam, shift(tg.solid)), M, S);
    for (const p of bl.plates) if (!p.solid.off && seen(p.solid)) plate(g, artPoly(p.solid, cam, shift(p.solid)), S);
  }

  let cache = null, cachedLevel = null, cachedKey = '';
  const keyOf = (bl, milieu) => milieu + ':' + FP.bossSkin.version() + ':' + bl.targets.map(t => +t.solid.off).join('') + bl.plates.map(p => +p.solid.off).join('') + bl.walls.map(w => +w.off).join('');

  // Le calque du niveau (w × h pixels d'art, du haut du monde), refait si le niveau ou l'état d'une pièce a changé ; null sans DOM.
  function layerFor(state, bl, M, S) {
    const key = keyOf(bl, state.run.milieu);
    if (cache && cachedLevel === bl && cachedKey === key) return cache;
    const l = FP.px.layer(Math.ceil(state.world.width / FP.px.SCALE), Math.ceil(state.world.height / FP.px.SCALE));
    if (!l) return null;
    still(l.g, bl, M, S, 0, () => 0, () => true);
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

  // Liseré de la zone visée (v5.7.0, à la place des hachures) : un cadre fin autour de la moitié de salle qui va être frappée, qui
  // clignote de plus en plus vite pendant l'avertissement (de 2 à 12 Hz) ; la machine elle-même dit ce qui va frapper (render/boss-machines.js).
  function danger(g, r, e, cam, state) {
    if (e.stage !== 'warn') return;
    const A = FP.palette.boss.alert, mid = (r.x0 + r.x1) / 2, H = FP.px.toArt(state.world.viewH), w = FP.config.boss.machines.border;
    const xa = FP.px.toArt(e.half < 0 ? r.x0 : mid), xb = FP.px.toArt(e.half < 0 ? mid : r.x1);
    const ya = Math.max(0, FP.px.toArt(r.y0) - cam), yb = Math.min(H, FP.px.toArt(r.y1) - cam);
    if (yb <= ya) return;
    const W = FP.bossThreats.timing(state.bossFight.destroyed.filter(Boolean).length, FP.config.milieux[state.run.milieu].id).warn;
    const phase = 2 * e.t + 5 * e.t * e.t / W;
    if (Math.floor(phase * 2) % 2) return;
    FP.px.rect(g, xa, ya, xb - xa, w, A[0]); FP.px.rect(g, xa, yb - w, xb - xa, w, A[0]);
    FP.px.rect(g, xa, ya, w, yb - ya, A[1]); FP.px.rect(g, xb - w, ya, w, yb - ya, A[1]);
  }

  // Ligne de visée : de la bouche du canon (render/boss-machines.js) vers la pointe (orange, pointillée) ; une fois figée, rouge et continue, prolongée au-delà du point visé.
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

  // Menaces (v5.6.0 : à part, dessinées après tout le reste du monde, premier plan compris) : défenses, visée, projectiles.
  function drawThreats(g, state) {
    const bl = state.world.bossLevel;
    if (!bl) return;
    const th = state.bossThreats, top = state.camera.y, H = state.world.viewH, cam = FP.px.toArt(top);
    for (const r of bl.rooms) if (th.rooms[r.id] && r.y1 >= top && r.y0 <= top + H) danger(g, r, th.rooms[r.id], cam, state);
    const a = th.aim, tur = a && bl.turrets.find(q => q.id === a.turret), to = a && (a.lockedAt || state.plant.tip);
    if (tur && to) aimLine(g, FP.bossMachines.turretPose(state, tur).muzzle, to, !!a.lockedAt, cam);   // v5.7.0 : depuis la bouche du canon
    for (const s of th.shots) shot(g, s, cam);
  }

  function draw(g, state) {
    const w = state.world, bl = w.bossLevel;
    if (!bl) return;
    const cam = FP.px.toArt(state.camera.y), top = state.camera.y, H = w.viewH, t = state.time;
    const id = FP.config.milieux[state.run.milieu].id, M = FP.palette.boss.milieux[id], S = skinOf(id);
    const seen = (o) => o.y + o.broadR >= top && o.y - o.broadR <= top + H;
    const bands = shaking(state, bl), l = layerFor(state, bl, M, S);
    const shift = (o) => { const y = FP.px.toArt(o.y), b = bands.find(s => y >= s.ya && y <= s.yb); return b ? b.dx : 0; };
    if (l) blitShaken(g, l, cam, Math.ceil(H / FP.px.SCALE) + 1, bands);
    else still(g, bl, M, S, cam, shift, seen);
    for (const tg of bl.targets) {
      if (!seen(tg.solid)) continue;
      const pts = artPoly(tg.solid, cam, shift(tg.solid));
      if (tg.solid.off) wreck(g, pts, t, M); else targetCore(g, pts, t, S, M);
    }
    // Cœur blindé (v5.7.0) : il tremble au rythme des pulsations qui arrivent, tant qu'une pompe tourne.
    const C = FP.config.boss.pipes, fed = !state.bossFight.headOpen && bl.targets.some(q => !q.solid.off);
    const jolt = fed ? (Math.floor(t * C.flowSpeed / C.pulseGap * 2) % 2) * C.headShake : 0;
    if (seen(bl.head.solid)) head(g, artPoly(bl.head.solid, cam, jolt), state.bossFight.headOpen, bl.head.solid.off, t, M, S);
  }

  FP.bossRender = { draw, drawThreats, fillPoly, artPoly };
})();
