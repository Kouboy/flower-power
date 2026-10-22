// dev/tools/import-sprite.js — importe un déchet généré (fond cyan uni) comme obstacle du jeu.
// Usage : node dev/tools/import-sprite.js <image.png> <kind> <id> <worldWidth>
//   ex.   node dev/tools/import-sprite.js brut/arcade.png arcade arcade01 84
// Étapes : retire le fond cyan, recadre, calcule le contour de collision (silhouette refermée, bord suivi puis
// simplifié), vérifie qu'il couvre l'objet sans déborder, puis écrit assets/obstacles/<id>.png, <id>.json et
// l'entrée <kind> du manifeste. Reste à ajouter <kind> aux tables d'apparition et aux messages de mort (config.js).
'use strict';
const fs = require('fs'), path = require('path');
const png = require('./png.js');

const ASSETS = path.join(__dirname, '..', '..', 'assets', 'obstacles');
const CLOSE_R = 3;          // rayon de fermeture (px source) : comble les trous fins de la silhouette pour la collision
const SIMPLIFY = .022;      // tolérance de simplification, en fraction du plus grand côté
const MIN_COVER = .88, MAX_SPILL = 1.35;   // couverture minimale des pixels opaques ; surface maximale / silhouette refermée

// Fond cyan uni (#00FFFF) et sa frange claire : retirés partout (l'objet ne contient pas de cyan).
function keyOut(im) {
  const p = im.data, W = im.width, H = im.height, bg = (i) => p[i] < 90 && p[i + 1] > 170 && p[i + 2] > 170;
  for (let i = 0; i < p.length; i += 4) if (bg(i)) p[i + 3] = 0;
  for (let k = 0; k < W * H; k++) {
    const i = k * 4, x = k % W;
    if (!p[i + 3]) continue;
    const edge = [x > 0 ? k - 1 : -1, x < W - 1 ? k + 1 : -1, k - W, k + W].some(n => n >= 0 && n < W * H && !p[n * 4 + 3]);
    if (edge && p[i + 2] > p[i] + 50 && p[i + 1] > p[i] + 50) p[i + 3] = 0;
  }
}

function crop(im, pad) {
  let x0 = im.width, y0 = im.height, x1 = -1, y1 = -1;
  for (let y = 0; y < im.height; y++) for (let x = 0; x < im.width; x++) if (im.data[(y * im.width + x) * 4 + 3] >= 128) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  if (x1 < 0) throw new Error('image vide après retrait du fond');
  x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(im.width - 1, x1 + pad); y1 = Math.min(im.height - 1, y1 + pad);
  const w = x1 - x0 + 1, h = y1 - y0 + 1, out = { width: w, height: h, data: Buffer.alloc(w * h * 4) };
  for (let y = 0; y < h; y++) im.data.copy(out.data, y * w * 4, ((y + y0) * im.width + x0) * 4, ((y + y0) * im.width + x0 + w) * 4);
  return out;
}

// Masque morphologique : dilatation puis érosion (fermeture), sur un disque de rayon r.
function morph(mask, W, H, r, dilate) {
  const out = new Uint8Array(W * H), offs = [];
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (dx * dx + dy * dy <= r * r) offs.push([dx, dy]);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let v = dilate ? 0 : 1;
    for (const [dx, dy] of offs) {
      const xx = x + dx, yy = y + dy, m = xx >= 0 && yy >= 0 && xx < W && yy < H ? mask[yy * W + xx] : 0;
      if (dilate && m) { v = 1; break; }
      if (!dilate && !m) { v = 0; break; }
    }
    out[y * W + x] = v;
  }
  return out;
}

// Plus grande composante connexe du masque.
function largest(mask, W, H) {
  const lab = new Int32Array(W * H), sizes = [0];
  for (let s = 0; s < W * H; s++) {
    if (!mask[s] || lab[s]) continue;
    const id = sizes.length, stack = [s]; lab[s] = id; let n = 0;
    while (stack.length) {
      const k = stack.pop(); n++;
      const x = k % W;
      for (const m of [x > 0 ? k - 1 : -1, x < W - 1 ? k + 1 : -1, k - W, k + W]) if (m >= 0 && m < W * H && mask[m] && !lab[m]) { lab[m] = id; stack.push(m); }
    }
    sizes.push(n);
  }
  const best = sizes.indexOf(Math.max(...sizes.slice(1)));
  return lab.map(v => (v === best ? 1 : 0));
}

// Bord extérieur suivi pixel par pixel (voisinage de Moore), dans le sens horaire.
function trace(mask, W, H) {
  const at = (x, y) => x >= 0 && y >= 0 && x < W && y < H && mask[y * W + x];
  let sx = -1, sy = -1;
  for (let y = 0; y < H && sx < 0; y++) for (let x = 0; x < W; x++) if (at(x, y)) { sx = x; sy = y; break; }
  const dirs = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
  const pts = [[sx, sy]];
  let x = sx, y = sy, d = 7;
  for (let guard = 0; guard < W * H * 4; guard++) {
    let found = false;
    for (let k = 0; k < 8; k++) {
      const nd = (d + 6 + k) % 8, nx = x + dirs[nd][0], ny = y + dirs[nd][1];
      if (at(nx, ny)) { x = nx; y = ny; d = nd; found = true; break; }
    }
    if (!found || (x === sx && y === sy)) break;
    pts.push([x, y]);
  }
  return pts;
}

// Ramer–Douglas–Peucker sur un contour fermé.
function simplify(contour, eps) {
  const pts = [...contour, contour[0]];   // contour bouclé : le dernier point rejoint le premier
  const rdp = (a, b) => {
    let worst = -1, dmax = 0;
    const [ax, ay] = pts[a], [bx, by] = pts[b], len = Math.hypot(bx - ax, by - ay) || 1;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs((by - ay) * pts[i][0] - (bx - ax) * pts[i][1] + bx * ay - by * ax) / len;
      if (d > dmax) { dmax = d; worst = i; }
    }
    return dmax > eps ? [...rdp(a, worst).slice(0, -1), ...rdp(worst, b)] : [pts[a], pts[b]];
  };
  let far = 0, fd = 0;
  for (let i = 1; i < contour.length; i++) { const d = Math.hypot(pts[i][0] - pts[0][0], pts[i][1] - pts[0][1]); if (d > fd) { fd = d; far = i; } }
  return [...rdp(0, far).slice(0, -1), ...rdp(far, pts.length - 1).slice(0, -1)];
}

function inside(px, py, poly) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) c = !c;
  }
  return c;
}

function main() {
  const [file, kind, id, ww] = process.argv.slice(2);
  if (!file || !kind || !id || !(Number(ww) > 0)) { console.error('Usage : node dev/tools/import-sprite.js <image.png> <kind> <id> <worldWidth>'); process.exit(2); }
  const raw = png.decode(fs.readFileSync(file));
  keyOut(raw);
  const im = crop(raw, 1), W = im.width, H = im.height;
  const opaque = new Uint8Array(W * H);
  for (let k = 0; k < W * H; k++) opaque[k] = im.data[k * 4 + 3] >= 128 ? 1 : 0;
  const closed = largest(morph(morph(opaque, W, H, CLOSE_R, true), W, H, CLOSE_R, false), W, H);
  const poly = simplify(trace(closed, W, H), Math.max(W, H) * SIMPLIFY).map(([x, y]) => [x + .5, y + .5]);

  // Contrôle : le contour couvre l'objet sans déborder largement.
  let op = 0, cov = 0, polyArea = 0, closedArea = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const k = y * W + x, inP = inside(x + .5, y + .5, poly);
    if (opaque[k]) { op++; if (inP) cov++; }
    if (inP) polyArea++;
    if (closed[k]) closedArea++;
  }
  const cover = cov / op, spill = polyArea / closedArea;
  console.log(`${kind} : ${W}×${H} px, ${poly.length} points, couverture ${(cover * 100).toFixed(1)} %, surface ${(spill * 100).toFixed(0)} % de la silhouette`);
  if (cover < MIN_COVER || spill > MAX_SPILL) { console.error('Contour refusé : couverture ou débordement hors bornes.'); process.exit(1); }

  const r3 = (v) => Math.round(v * 1000) / 1000;
  const asset = {
    format: 'flower-power-asset', formatVersion: 1, id, kind: 'obstacle', variant: 'default', pool: 'standard',
    source: { file: id + '.png', width: W, height: H },
    render: { worldWidth: Number(ww), pivot: [0.5, 0.5], mirrorSafe: true },
    collision: { type: 'polygon', coordinateSpace: 'sourcePixelsRelativeToPivot', points: poly.map(([x, y]) => [r3(x - W / 2), r3(y - H / 2)]), grazeRadius: 16, flyoverEligible: true },
    spawn: { signature: false, maxPerRun: null, weight: 1 }
  };
  fs.writeFileSync(path.join(ASSETS, id + '.png'), png.encode(im));
  fs.writeFileSync(path.join(ASSETS, id + '.json'), JSON.stringify(asset, null, 2) + '\n');
  const manifestFile = path.join(ASSETS, 'manifest.js'), src = fs.readFileSync(manifestFile, 'utf8');
  const head = src.slice(0, src.indexOf('window.FLOWER_POWER_AUTHORED_ASSETS')), json = src.slice(src.indexOf('=') + 1).trim().replace(/;\s*$/, '');
  const all = JSON.parse(json);
  all[kind] = { ...asset, runtime: { gameKind: kind, src: 'assets/obstacles/' + id + '.png', metadata: 'assets/obstacles/' + id + '.json' } };
  fs.writeFileSync(manifestFile, head + 'window.FLOWER_POWER_AUTHORED_ASSETS = ' + JSON.stringify(all) + ';\n');
  console.log(`Écrit : assets/obstacles/${id}.png, ${id}.json ; manifeste mis à jour (${Object.keys(all).length} assets).`);
}

main();
