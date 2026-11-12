// render/boss-machines.js — les machines de défense des boss (v5.7.0, boss cohérent) : chaque salle porte sa défense, dans chacune de ses
// moitiés, sous forme d'une vraie machine — goulotte de béton ou émetteur de radiation au plafond, buses de vapeur ou brûleurs sur la paroi
// extérieure. Au repos, la machine attend ; à l'avertissement, elle se prépare (gouttes, bouffées, veilleuses, lueur et arcs) ; au coup,
// son effet remplit toute la moitié frappée (rideau de béton, jets de vapeur, nappe de flammes, rideau vert). Zones et durées inchangées
// (play/boss-threats.js) ; le liseré de la zone visée est dessiné avec les autres menaces (render/boss.js, drawThreats).
// Lit     : state.{time, camera.y, run.milieu, plant.tip, bossFight.destroyed, bossThreats.{rooms, aim, burst, cooldown, shots}},
//           state.world.{viewH, bossLevel.{rooms, turrets, head}}, FP.config.{milieux, boss.{machines (drops, puffs, arcs), turret, shot.track,
//           ramp[id].shot.gap}}, FP.bossThreats.timing, FP.bossSkin.{image, piece}, FP.palette.boss.{milieux, machines, aim, weak}, FP.px.
// Écrit   : rien dans l'état (la toile reçue).
// Expose  : FP.bossMachines.layout(room, half, defense) → { kind, mount: 'ceiling' | 'wall', side (-1 gauche, 1 droite), x0, y0, x1, y1 }
//           (pur, pixels du monde : la moitié de salle et l'emplacement de sa machine) ;
//           FP.bossMachines.turretPose(state, q) → { x, y, angle, muzzle: { x, y }, lens (0..1), recoil (px d'art) } (pur) ;
//           FP.bossMachines.armEnd(bl, q) → { x, y } (bout de la console de la tourelle, dans un mur) ou null ;
//           FP.bossMachines.draw(g, state) : machines, puis tourelles.
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  const MOUNT = { beton: 'ceiling', radiation: 'ceiling', vapeur: 'wall', flamme: 'wall' };
  const HOUSING = 6, NOZZLE_GAP = 12, SHAKE_HZ = 30;   // hauteur d'une machine de plafond, écart entre deux buses (px d'art)

  function layout(room, half, defense) {
    const mid = (room.x0 + room.x1) / 2;
    return { kind: defense, mount: MOUNT[defense], side: half < 0 ? -1 : 1, x0: half < 0 ? room.x0 : mid, y0: room.y0, x1: half < 0 ? mid : room.x1, y1: room.y1 };
  }

  // Boîte en pixels d'art de l'écran.
  const artBox = (b, cam) => ({ xa: FP.px.toArt(b.x0), xb: FP.px.toArt(b.x1), ya: FP.px.toArt(b.y0) - cam, yb: FP.px.toArt(b.y1) - cam });
  // Buses ou brûleurs le long de la paroi extérieure : leurs y (art, écran).
  const nozzles = (a) => { const out = []; for (let y = a.ya + HOUSING; y < a.yb - 4; y += NOZZLE_GAP) out.push(y); return out; };
  const wallX = (a, side) => (side < 0 ? a.xa : a.xb - 4);

  // --- Repos : le corps de la machine. ---
  function idle(g, b, a, M, Q) {
    if (b.mount === 'ceiling') {
      const w = Math.min(24, Math.round((a.xb - a.xa) / 2)), x = Math.round((a.xa + a.xb - w) / 2);
      FP.px.rect(g, x - 1, a.ya, w + 2, HOUSING + 1, M.edge); FP.px.rect(g, x, a.ya, w, HOUSING, M.dark);
      if (b.kind === 'beton') FP.px.rect(g, x + 2, a.ya + HOUSING - 1, w - 4, 1, Q.slot);   // la trappe fermée de la goulotte
      else FP.px.disc(g, x + Math.floor(w / 2), a.ya + HOUSING, 2, Q.ray[1]);   // la lentille éteinte de l'émetteur
      return;
    }
    const x = wallX(a, b.side);
    for (const y of nozzles(a)) { FP.px.rect(g, x, y, 4, 4, M.edge); FP.px.rect(g, x + 1, y + 1, 2, 2, b.kind === 'flamme' ? Q.pilot : M.light); }
  }

  // --- Avertissement : la machine se prépare (p de 0 à 1 sur la durée de l'avertissement). ---
  function warn(g, b, a, t, p, Q, K) {
    const cx = Math.round((a.xa + a.xb) / 2), h = Math.max(1, a.yb - a.ya - HOUSING);
    if (b.kind === 'beton') {
      for (let k = 0; k < K.drops; k++) {
        const y = a.ya + HOUSING + Math.floor((t * 50 + k * 23) % h), x = cx + ((k * 7) % 15) - 7 + (Math.floor(t * 30) % 2);
        FP.px.rect(g, x, y, 1, 2, Q.concrete[k % 3]);
      }
    } else if (b.kind === 'radiation') {
      FP.px.rect(g, cx - 3, a.ya + HOUSING, 6, Math.round(p * h * .4), Q.ray[1]);
      for (let k = 0; k < K.arcs; k++) {
        const x0 = cx + ((Math.floor(t * 20) + k * 9) % 17) - 8, y0 = a.ya + HOUSING + ((Math.floor(t * 15) + k * 5) % Math.max(1, Math.round(h * .5)));
        FP.px.line(g, x0, y0, x0 + 3, y0 + 2, Q.ray[0]);
      }
    } else {
      const x = wallX(a, b.side), dir = -b.side;
      for (const y of nozzles(a)) {
        if (b.kind === 'flamme') { const r = 1 + Math.round(p * 2); FP.px.disc(g, x + 2 + dir * 3, y + 2, r, p > .5 ? Q.flame[1] : Q.pilot); }
        else {
          FP.px.rect(g, x + 1, y + 1, 2, 2, Q.hot);
          for (let k = 0; k < K.puffs; k++) if ((Math.floor(t * 10) + k + y) % 3 === 0) FP.px.rect(g, x + 2 + dir * (4 + k * 3), y + 1 - (k % 2), 2, 2, Q.steam[k % 2]);
        }
      }
    }
  }

  // --- Coup (v5.8.0 : sur fond transparent, sans aplat) : l'effet de la machine se dessine par-dessus le décor, assez dense pour se lire
  // comme une zone (chaque rangée en porte sur au moins machines.cover de sa largeur). Béton : coulées verticales d'une colonne sur deux,
  // qui glissent vers le bas ; flammes : langues d'une colonne sur deux, qui ondulent vers le haut ; vapeur : un jet par rangée depuis la
  // paroi, de longueur qui varie ; radiation : pointillés verts qui défilent, et des éclairs. ---
  function strike(g, b, a, t, H, Q) {
    const ya = Math.max(0, a.ya), yb = Math.min(H, a.yb), w = a.xb - a.xa, h = yb - ya;
    if (h <= 0 || w <= 0) return;
    if (b.kind === 'beton' || b.kind === 'flamme') {
      const C = b.kind === 'beton' ? Q.concrete : Q.flame, v = b.kind === 'beton' ? 70 : -90;
      for (let x = a.xa; x < a.xb; x += 2) {
        const k = (x - a.xa) >> 1, phase = ((Math.floor(t * v) + k * 7) % 9 + 9) % 9, dx = b.kind === 'flamme' ? Math.round(Math.sin(t * 9 + k) * .6) : 0;
        FP.px.rect(g, x + dx, ya, 1, h, C[(k + (phase > 5 ? 1 : 0)) % 3]);
        for (let y = ya + phase; y < yb; y += 9) FP.px.rect(g, x + dx, y, 1, 2, C[(k + 2) % 3]);   // grumeaux, étincelles qui défilent
      }
    } else if (b.kind === 'vapeur') {
      for (let y = ya; y < yb; y++) {
        const k = y - ya, len = Math.round(w * (.45 + .4 * ((Math.sin(t * 11 + k * 1.7) + 1) / 2))), x0 = b.side < 0 ? a.xa : a.xb - len;
        FP.px.rect(g, x0, y, len, 1, Q.steam[(k + Math.floor(t * 14)) % 3 ? 1 : 0]);
      }
    } else {
      const off = Math.floor(t * 24);
      for (let x = a.xa + (off % 2); x < a.xb; x += 2) {   // voile vert : colonnes qui scintillent, des nœuds clairs qui remontent
        const k = (x - a.xa) >> 1; FP.px.rect(g, x, ya, 1, h, Q.ray[1]);
        for (let y = yb - 1 - ((off + k * 5) % 7); y >= ya; y -= 7) FP.px.rect(g, x, y, 1, 2, Q.ray[0]);
      }
      for (let k = 0; k < 3; k++) { const x0 = a.xa + ((off * 3 + k * 17) % w), y0 = ya + ((off * 5 + k * 29) % h); FP.px.line(g, x0, y0, x0 + 4, y0 + 6, Q.ray[0]); }
    }
  }

  // --- Tourelles (v5.7.0) : socle vissé au mur, canon qui pivote vers la pousse pendant la visée, lentille qui passe de l'orange au rouge,
  // recul et éclair juste après le tir. Au repos, le canon regarde l'intérieur de la salle. ---
  function turretPose(state, q) {
    const T = FP.config.boss.turret, th = state.bossThreats, bl = state.world.bossLevel, room = bl.rooms.find(r => r.id === q.room);
    const aim = th.aim && th.aim.turret === q.id ? th.aim : null, burst = th.burst && th.burst.turret === q.id ? th.burst : null;
    const to = aim ? (aim.lockedAt || state.plant.tip) : burst ? burst.to : null;   // pendant la rafale (v5.8.0), le canon reste sur le point figé
    const rest = room && q.x > (room.x0 + room.x1) / 2 ? Math.PI : 0;
    const angle = to ? Math.atan2(to.y - q.y, to.x - q.x) : rest;
    let recoil = 0, age = -1;
    if (burst) age = burst.t - (burst.n - 1) * FP.config.boss.shot.burstGap;   // depuis le dernier tir de la rafale
    else if (!th.aim) {   // juste après la rafale : depuis son dernier tir (le délai repart à ce moment-là), s'il vient bien de cette tourelle
      const id = FP.config.milieux[state.run.milieu].id, a = FP.config.boss.ramp[id].shot.gap - th.cooldown;
      if (th.shots.some(s => Math.hypot(s.x - s.vx * a - q.x, s.y - s.vy * a - q.y) < 12)) age = a;
    }
    if (age >= 0 && age < T.recoilTime) recoil = T.recoil * (1 - age / T.recoilTime);
    const reach = (T.barrel - recoil) * FP.px.SCALE;
    return { x: q.x, y: q.y, angle, muzzle: { x: q.x + Math.cos(angle) * reach, y: q.y + Math.sin(angle) * reach },
      lens: aim ? Math.min(1, aim.t / FP.config.boss.shot.track) : 0, recoil };
  }

  // Bout de la console d'une tourelle (v5.8.0) : le premier point dans un mur, en partant de la tourelle vers la gauche, la droite, le haut
  // ou le bas (le plus proche, à au plus ARM px) ; null s'il n'y en a pas. En cache par niveau.
  const ARM = 90, armCache = new Map();
  let armFor = null;
  function armEnd(bl, q) {
    if (armFor !== bl) { armCache.clear(); armFor = bl; }
    if (armCache.has(q.id)) return armCache.get(q.id);
    const walls = bl.walls.map(o => o.collision.map(([x, y]) => [o.x + x, o.y + y]));
    let best = null;
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) for (let d = 4; d <= ARM && (!best || d < best.d); d += 2) {
      const x = q.x + dx * d, y = q.y + dy * d;
      if (walls.some(P => FP.geom.sdPoly(x, y, P) <= 0)) { best = { x, y, d }; break; }
    }
    const end = best && { x: best.x, y: best.y };
    armCache.set(q.id, end);
    return end;
  }

  function turrets(g, state, bl, cam, M, img) {
    if (bl.head.solid.off) return;   // boss transpercé : ses tourelles tombent avec ses parois
    const T = FP.config.boss.turret, A = FP.palette.boss.aim, top = state.camera.y, H = state.world.viewH, r = Math.floor(T.size / 2);
    for (const q of bl.turrets) {
      if (q.y < top - 20 || q.y > top + H + 20) continue;
      const e = state.bossThreats.rooms[q.room], dx = e && e.stage === 'warn' ? (Math.floor(state.time * SHAKE_HZ) % 2 ? 1 : -1) : 0;   // la salle avertie tremble
      const p = turretPose(state, q), x = FP.px.toArt(q.x) + dx, y = FP.px.toArt(q.y) - cam;
      // Console de fixation (v5.8.0 : la tourelle est avancée vers l'intérieur) : rivetée jusqu'au mur le plus proche (armEnd).
      const end = armEnd(bl, q);
      if (end) {
        const ex = FP.px.toArt(end.x) + dx, ey = FP.px.toArt(end.y) - cam;
        if (ey === y) { const xa = Math.min(ex, x), xb = Math.max(ex, x); FP.px.rect(g, xa, y - 2, xb - xa, 5, M.edge); FP.px.rect(g, xa, y - 1, xb - xa, 3, M.dark); for (let k = xa + 3; k < xb - 2; k += 6) FP.px.rect(g, k, y, 1, 1, M.rivet); }
        else { const ya = Math.min(ey, y), yb = Math.max(ey, y); FP.px.rect(g, x - 2, ya, 5, yb - ya, M.edge); FP.px.rect(g, x - 1, ya, 3, yb - ya, M.dark); for (let k = ya + 3; k < yb - 2; k += 6) FP.px.rect(g, x, k, 1, 1, M.rivet); }
      }
      if (img) FP.bossSkin.piece(g, [[x - r, y - r], [x + r, y - r], [x + r, y + r], [x - r, y + r]], img);
      else { FP.px.disc(g, x, y, r, M.edge); FP.px.disc(g, x, y, r - 1, M.dark); FP.px.disc(g, x, y, r - 4, M.light); }
      const mx = FP.px.toArt(p.muzzle.x) + dx, my = FP.px.toArt(p.muzzle.y) - cam;
      FP.px.line(g, x, y, mx, my, M.edge, 3); FP.px.line(g, x, y, mx, my, M.body);
      if (p.lens > 0) FP.px.disc(g, mx, my, 1 + Math.round(p.lens * 1.5), p.lens < .6 ? A[0] : A[1]);
      if (p.recoil > T.recoil / 2) FP.px.disc(g, Math.round(mx + Math.cos(p.angle) * 3), Math.round(my + Math.sin(p.angle) * 3), 3, FP.palette.boss.weak[0]);
    }
  }

  function draw(g, state) {
    const bl = state.world.bossLevel;
    if (!bl || bl.head.solid.off) return;   // boss transpercé : ses machines tombent avec ses parois
    const id = FP.config.milieux[state.run.milieu].id, M = FP.palette.boss.milieux[id], Q = FP.palette.boss.machines, K = FP.config.boss.machines;
    const cam = FP.px.toArt(state.camera.y), top = state.camera.y, H = Math.ceil(state.world.viewH / FP.px.SCALE), t = state.time;
    const W = FP.bossThreats.timing(state.bossFight.destroyed.filter(Boolean).length, id).warn;
    for (const r of bl.rooms) {
      if (r.y1 < top || r.y0 > top + state.world.viewH) continue;
      const e = state.bossThreats.rooms[r.id];
      for (const half of [-1, 1]) {
        const b = layout(r, half, r.defense), a = artBox(b, cam), hit = e && e.half === half;
        if (hit && e.stage === 'strike') strike(g, b, a, t, H, Q);
        idle(g, b, a, M, Q);
        if (hit && e.stage === 'warn') warn(g, b, a, e.t, Math.min(1, e.t / W), Q, K);
      }
    }
    turrets(g, state, bl, cam, M, FP.bossSkin.image(id, 'turret'));
  }

  FP.bossMachines = { layout, turretPose, armEnd, draw };
})();
