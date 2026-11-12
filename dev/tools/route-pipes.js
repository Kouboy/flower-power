// dev/tools/route-pipes.js — trace les tuyaux des boss (v5.7.0, boss cohérent) et les écrit dans assets/boss/plans.js.
// Usage : node dev/tools/route-pipes.js
// Pour chaque plan : un tuyau de chaque cible (pompe) jusqu'à la tête, un de chaque mur de l'entrée (v5.9.0, bouche d'aspiration), et une liaison d'un bord à l'autre du plafond (LINKS), cherchés
// sur une grille de GRID px (monde de REF_W × REF_H) par le plus court chemin dans la masse de la machine (murs, tête, cibles ; pas les
// plaques, qui tombent), en préférant le cœur des murs au bord. Là où une cible flotte (Bétonneuse), un tronçon peut passer à l'air
// libre, cher, loin des trajets de référence (au moins channelMin / 2 + MARGIN, sans leurs END derniers px) ; ses indices sont notés dans `open`.
// Le tracé est ensuite simplifié en lignes droites (ligne de vue sur la même grille) ; les proportions sont arrondies au millième.
// Les plans eux-mêmes ne changent pas : seule la ligne `pipes:` de chaque plan est écrite (ou remplacée), juste avant `toxics:`.
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');

const ROOT = path.join(__dirname, '..', '..');
const FILE = path.join(ROOT, 'assets', 'boss', 'plans.js');
const REF_W = 360, REF_H = 700, GRID = 2, MARGIN = 6, DEEP = 8, OPEN_COST = 30, END = 30, IN = 1, EDGE = 14;
const SOLID = { wall: true, head: true, target: true };
// Liaisons du plafond, d'un bord vers l'autre en passant par la tête (proportions).
const LINKS = {
  friche: [[.03, .03], [.35, .03]],   // le plafond gauche jusqu'à la tête : la Bétonneuse n'a pas de masse d'un bord à l'autre
  industrie: [[.03, .2], [.95, .3]],
  decharge: [[.02, .3], [.98, .3]],
  nucleaire: [[.02, .3], [.98, .3]]
};
const CHANNEL = { friche: 52, industrie: 49, decharge: 47, nucleaire: 44 };   // config.boss.ramp[id].channelMin, à REF_W

const ctx = { window: {} }; vm.createContext(ctx);
const text = fs.readFileSync(FILE, 'utf8');
vm.runInContext(text, ctx);
const PLANS = ctx.window.FLOWER_POWER_BOSS_PLANS;

// Distance signée à un polygone (négative dedans), comme FP.geom.sdPoly.
function sdPoly(x, y, pts) {
  let d = Infinity, inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [ax, ay] = pts[j], [bx, by] = pts[i], ex = bx - ax, ey = by - ay, L = ex * ex + ey * ey;
    const t = L ? Math.max(0, Math.min(1, ((x - ax) * ex + (y - ay) * ey) / L)) : 0;
    d = Math.min(d, Math.hypot(x - ax - t * ex, y - ay - t * ey));
    if ((ay > y) !== (by > y) && x < ax + (y - ay) / (by - ay) * ex) inside = !inside;
  }
  return inside ? -d : d;
}
const segDist = (x, y, a, b) => {
  const ex = b[0] - a[0], ey = b[1] - a[1], L = ex * ex + ey * ey, t = L ? Math.max(0, Math.min(1, ((x - a[0]) * ex + (y - a[1]) * ey) / L)) : 0;
  return Math.hypot(x - a[0] - t * ex, y - a[1] - t * ey);
};

function route(id) {
  const plan = PLANS[id], toW = ([x, y]) => [x * REF_W, y * REF_H];
  const solids = plan.pieces.filter(p => SOLID[p.role]).map(p => p.poly.map(toW));
  // Trajets de référence, privés de leurs END derniers px (ils finissent sur leur cible : l'air juste au-dessus d'une cible n'est pas un couloir).
  const cut = (pts) => {
    const out = pts.slice(); let left = END;
    while (out.length > 1 && left > 0) {
      const a = out[out.length - 2], b = out[out.length - 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (L <= left) { out.pop(); left -= L; } else { out[out.length - 1] = [b[0] + (a[0] - b[0]) * left / L, b[1] + (a[1] - b[1]) * left / L]; left = 0; }
    }
    return out;
  };
  const refs = Object.values(plan.paths).map(r => cut(r.map(toW))), half = CHANNEL[id] * REF_W / 360 / 2;
  const nx = REF_W / GRID + 1, ny = REF_H / GRID + 1;
  // L'air libre n'est permis qu'au-dessus du haut de la plus basse des pompes : des colonnes qui pendent du plafond, jamais au cœur des salles.
  // Dans une salle (là où frappent les défenses), l'air libre n'est permis que le long de ses parois (à EDGE px de son bord gauche ou
  // droit), ou juste au-dessus d'une pompe, entre son haut et le haut de sa salle.
  const rooms = plan.rooms.map(r => [r.rect[0] * REF_W, r.rect[1] * REF_H, r.rect[2] * REF_W, r.rect[3] * REF_H]);
  const inR = (r, x, y) => x >= r[0] && x <= r[2] && y >= r[1] && y <= r[3];
  const pumps = plan.pieces.filter(p => p.role === 'target').map(p => {
    const xs = p.poly.map(q => q[0] * REF_W), ys = p.poly.map(q => q[1] * REF_H), cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    const home = rooms.find(r => inR(r, cx, cy));
    return { x0: Math.min(...xs), x1: Math.max(...xs), top: Math.min(...ys), roomTop: home ? home[1] : Math.min(...ys) };
  });
  const airOk = (x, y) => rooms.every(r => !inR(r, x, y) || x - r[0] <= EDGE || r[2] - x <= EDGE ||
    pumps.some(t => x >= t.x0 && x <= t.x1 && y <= t.top + IN + GRID && y >= t.roomTop - IN - GRID));
  const openMaxY = Math.max(...plan.pieces.filter(p => p.role === 'target').map(p => Math.min(...p.poly.map(q => q[1])))) * REF_H + IN + GRID;
  // v5.9.0 : `low` = les mêmes colonnes, sans la limite de hauteur, pour les seuls tuyaux de l'entrée (la muraille de la Bétonneuse
  // n'a pas de masse jusqu'au reste de la machine).
  const depth = new Float32Array(nx * ny), open = new Uint8Array(nx * ny), low = new Uint8Array(nx * ny);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const x = i * GRID, y = j * GRID, k = j * nx + i;
    let d = Infinity; for (const s of solids) d = Math.min(d, sdPoly(x, y, s));
    depth[k] = -d - IN;   // > 0 dans la masse, à IN px au moins du bord (l'arrondi au millième ne fait pas sortir un tuyau)
    if (depth[k] <= 0 && airOk(x, y)) { let r = Infinity; for (const p of refs) for (let q = 1; q < p.length; q++) r = Math.min(r, segDist(x, y, p[q - 1], p[q])); low[k] = r >= half + MARGIN ? 1 : 0; open[k] = y <= openMaxY ? low[k] : 0; }
  }
  // allowOpen : false (dans la masse), true (colonnes sous le plafond), 'low' (colonnes à toute hauteur : tuyaux de l'entrée)
  const air0 = (k, allowOpen) => (allowOpen === 'low' ? low[k] : allowOpen && open[k]);
  const ok = (k, allowOpen) => depth[k] > 0 || air0(k, allowOpen);
  const cost = (k) => (depth[k] > 0 ? 1 + (depth[k] < DEEP ? (DEEP - depth[k]) / 2 : 0) : OPEN_COST);
  const cell = ([x, y]) => Math.round(y * REF_H / GRID) * nx + Math.round(x * REF_W / GRID);

  function search(a, b, allowOpen) {
    const start = cell(a), goal = cell(b), dist = new Float64Array(nx * ny).fill(Infinity), prev = new Int32Array(nx * ny).fill(-1);
    const heap = [[0, start]]; dist[start] = 0;
    const push = (e) => { heap.push(e); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
    while (heap.length) {
      const [d, k] = pop();
      if (k === goal) break;
      if (d > dist[k]) continue;
      const i = k % nx, j = (k - i) / nx;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue;
        const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= nx || jj >= ny) continue;
        const n = jj * nx + ii; if (!ok(n, allowOpen) && n !== goal) continue;
        if (di && !(depth[n] > 0 && depth[k] > 0)) continue;   // à l'air libre, seulement à la verticale : une colonne, pas une diagonale
        const nd = d + cost(n) * Math.hypot(di, dj);
        if (nd < dist[n]) { dist[n] = nd; prev[n] = k; push([nd, n]); }
      }
    }
    if (prev[goal] < 0) {
      let top = Infinity; for (let k = 0; k < dist.length; k++) if (dist[k] < Infinity) top = Math.min(top, Math.floor(k / nx) * GRID);
      throw new Error(id + ' : pas de chemin de ' + a + ' à ' + b + ' (plus haut atteint : y = ' + top + ' px)');
    }
    const cells = []; for (let k = goal; k >= 0; k = prev[k]) cells.push(k);
    cells.reverse();
    return cells.map(k => [(k % nx) * GRID, Math.floor(k / nx) * GRID]);
  }

  // Simplification par ligne de vue. Un tronçon qui touche l'air libre (hors de la masse) est vertical d'un bout à l'autre, et noté `open`.
  const at = ([x, y]) => Math.round(y / GRID) * nx + Math.round(x / GRID);
  const air = (p) => depth[at(p)] < -IN;
  const samples = (p, q) => { const n = Math.max(1, Math.ceil(Math.hypot(q[0] - p[0], q[1] - p[1]))), out = []; for (let s = 0; s <= n; s++) out.push([p[0] + (q[0] - p[0]) * s / n, p[1] + (q[1] - p[1]) * s / n]); return out; };
  const segOk = (p, q, allowOpen) => {
    const ss = samples(p, q), touches = ss.some(air);
    if (!ss.every(s => depth[at(s)] > -IN || air0(at(s), allowOpen))) return false;
    return !touches || p[0] === q[0];
  };
  function simplify(pts, allowOpen) {
    const out = [pts[0]];
    for (let a = 0; a < pts.length - 1;) {
      let b = a + 1;
      for (let c = pts.length - 1; c > a + 1; c--) if (segOk(pts[a], pts[c], allowOpen)) { b = c; break; }
      out.push(pts[b]); a = b;
    }
    return out;
  }
  const centre = (p) => { const xs = p.poly.map(q => q[0]), ys = p.poly.map(q => q[1]); return [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2]; };
  const head = plan.pieces.find(p => p.role === 'head'), r3 = (v) => Math.round(v * 1000) / 1000;
  const toPlan = (pts) => pts.map(([x, y]) => [r3(x / REF_W), r3(y / REF_H)]);
  const pipes = [];
  const add = (from, to, a, b, allowOpen) => {
    const pts = simplify(search(a, b, allowOpen), allowOpen), opens = [];
    for (let i = 1; i < pts.length; i++) {
      if (!segOk(pts[i - 1], pts[i], allowOpen)) throw new Error(id + ' : tronçon invalide ' + pts[i - 1] + ' → ' + pts[i]);
      if (samples(pts[i - 1], pts[i]).some(air)) opens.push(i - 1);
    }
    const pipe = { from, to, pts: toPlan(pts) };
    if (opens.length) pipe.open = opens;
    pipes.push(pipe);
  };
  // Dans la masse si possible, sinon avec des colonnes à l'air libre.
  const either = (from, to, a, b) => { try { add(from, to, a, b, false); } catch (e) { add(from, to, a, b, true); } };
  for (const t of plan.pieces.filter(p => p.role === 'target')) either(t.id, 'head', centre(t), centre(head));
  // La bouche aspire pour le cœur ; là où sa muraille n'a pas de masse jusqu'à lui (Bétonneuse), par des colonnes plus basses.
  for (const t of plan.pieces.filter(p => p.intake)) {
    try { either(t.id, 'head', centre(t), centre(head)); } catch (e) { add(t.id, 'head', centre(t), centre(head), 'low'); }
  }
  either(null, null, LINKS[id][0], LINKS[id][1]);
  return pipes;
}

const fmt = (v) => String(v).replace(/^0\./, '.').replace(/^-0\./, '-.');
const line = (pipes) => '    pipes: [\n' + pipes.map(p => '      { from: ' + (p.from ? "'" + p.from + "'" : 'null') + ', to: ' + (p.to ? "'" + p.to + "'" : 'null') +
  ', pts: [' + p.pts.map(q => '[' + q.map(fmt).join(', ') + ']').join(', ') + ']' + (p.open ? ', open: [' + p.open.join(', ') + ']' : '') + ' }').join(',\n') + '\n    ],\n';

let out = text;
const eol = text.includes('\r\n') ? '\r\n' : '\n';
for (const id of Object.keys(PLANS)) {
  const pipes = route(id), block = line(pipes).replace(/\n/g, eol);
  const start = out.indexOf('  ' + id + ': {'), tox = out.indexOf('    toxics:', start);
  const old = out.lastIndexOf('    pipes: [', tox);
  const from = old > start ? old : tox;
  out = out.slice(0, from) + block + out.slice(tox);
  console.log(id + ' : ' + pipes.map(p => (p.from || 'liaison') + ' ' + p.pts.length + ' pts' + (p.open ? ' (air libre ' + p.open.join(',') + ')' : '')).join(' ; '));
}
fs.writeFileSync(FILE, out);
