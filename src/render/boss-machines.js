// render/boss-machines.js — les machines de défense des boss (v5.7.0, boss cohérent) : chaque salle porte sa défense, dans chacune de ses
// moitiés, sous forme d'une vraie machine — goulotte de béton ou émetteur de radiation au plafond, buses de vapeur ou brûleurs sur la paroi
// extérieure. Au repos, la machine attend ; à l'avertissement, elle se prépare (gouttes, bouffées, veilleuses, lueur et arcs) ; au coup,
// son effet remplit toute la moitié frappée (rideau de béton, jets de vapeur, nappe de flammes, rideau vert). Zones et durées inchangées
// (play/boss-threats.js) ; le liseré de la zone visée est dessiné avec les autres menaces (render/boss.js, drawThreats).
// Lit     : state.{time, camera.y, run.milieu, bossFight.destroyed, bossThreats.rooms}, state.world.{viewH, bossLevel.rooms},
//           FP.config.{milieux, boss.machines (drops, puffs, arcs)}, FP.bossThreats.timing, FP.palette.boss.{milieux, machines}, FP.px.
// Écrit   : rien dans l'état (la toile reçue).
// Expose  : FP.bossMachines.layout(room, half, defense) → { kind, mount: 'ceiling' | 'wall', side (-1 gauche, 1 droite), x0, y0, x1, y1 }
//           (pur, pixels du monde : la moitié de salle et l'emplacement de sa machine) ; FP.bossMachines.draw(g, state).
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  const MOUNT = { beton: 'ceiling', radiation: 'ceiling', vapeur: 'wall', flamme: 'wall' };
  const HOUSING = 6, NOZZLE_GAP = 12;   // hauteur d'une machine de plafond, écart entre deux buses (px d'art)

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

  // --- Coup : un aplat remplit toute la moitié frappée, puis des traînées dans le sens de l'effet (béton et flammes à la verticale,
  // vapeur à l'horizontale depuis la paroi, rayon en bandes qui pulsent). ---
  function strike(g, b, a, t, H, Q) {
    const ya = Math.max(0, a.ya), yb = Math.min(H, a.yb), w = a.xb - a.xa, h = yb - ya;
    if (h <= 0) return;
    const base = { beton: Q.concrete[1], vapeur: Q.steam[1], flamme: Q.flame[1], radiation: Q.ray[1] }[b.kind];
    FP.px.rect(g, a.xa, ya, w, h, base);
    if (b.kind === 'beton' || b.kind === 'flamme') {   // coulées qui descendent, langues qui montent
      const C = b.kind === 'beton' ? Q.concrete : Q.flame, v = b.kind === 'beton' ? 60 : -80;
      for (let x = a.xa; x < a.xb; x += 3) {
        const k = (x - a.xa) / 3, len = 6 + (k * 7) % 11, y0 = ya + (((Math.floor(t * v) + k * 13) % h) + h) % h;
        FP.px.rect(g, x, y0, 1, Math.min(len, yb - y0), C[k % 2 ? 0 : 2]);
      }
    } else if (b.kind === 'vapeur') {   // jets horizontaux qui partent de la paroi
      for (let y = ya; y < yb; y += 3) {
        const k = (y - ya) / 3, len = Math.round(w * (.4 + ((k * 5) % 6) / 10)), x0 = b.side < 0 ? a.xa : a.xb - len;
        FP.px.rect(g, x0, y, len, 1, Q.steam[(k + Math.floor(t * 12)) % 2 ? 0 : 1]);
      }
    } else {   // rideau vert : bandes claires qui pulsent
      for (let y = ya + ((Math.floor(t * 30) % 6) + 6) % 6; y < yb; y += 6) FP.px.rect(g, a.xa, y, w, 2, Q.ray[0]);
    }
  }

  function draw(g, state) {
    const bl = state.world.bossLevel;
    if (!bl) return;
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
  }

  FP.bossMachines = { layout, draw };
})();
