// dev/tools/import-pixel.js — importe les obstacles PixelLab (v4.15.0, ?obstacles=pixel ; nouvelles familles v4.16.0) : un PNG transparent par famille.
// Usage : node dev/tools/import-pixel.js <dossier des PNG bruts>
//   ex.   node dev/tools/import-pixel.js "../pixellab-test"
// Étapes : recadre chaque PNG sur ses pixels opaques, écrit assets/obstacles/pixel/<kind>.png, calcule la collision comme
// pour les obstacles dessinés (silhouette rétrécie de config.obstacles.drawnInset, FP.silhouette), puis écrit
// assets/obstacles/pixel/manifest.js. Un pixel PixelLab = ZOOM pixels d'art (1 par défaut) : pas de rééchantillonnage.
'use strict';
const fs = require('fs'), path = require('path');
const png = require('./png.js');

const ROOT = path.join(__dirname, '..', '..');
const OUT = path.join(ROOT, 'assets', 'obstacles', 'pixel');
// Famille du jeu → fichier brut (-sombre, -sale, -sans-herbe, -sans-flaque : retouchés par dev/tools/retouche-pixel.js, à lancer avant) ; zoom entier pour les obstacles que la taille d'origine rendrait trop petits.
const FILES = {
  tire: 'pneu-sombre', trashbag: 'sac', cone: 'cone', nuclear: 'fut', battery: 'batterie', microwave: 'microondes',
  extinguisher: 'extincteur', server: 'serveur', solar: 'solaire-sans-herbe', scooter: 'trottinette', drone: 'drone',
  arcade: 'arcade', sarcophagus: 'sarcophage', trex_signature: 'trex',
  // Familles propres à la version PixelLab (v4.16.0), trois par milieu.
  cart: 'nouveaux/caddie-sans-flaque', mattress: 'nouveaux/matelas-sale', pallet: 'nouveaux/palette',
  oildrum: 'nouveaux/bidon', gear: 'nouveaux/engrenage', pipe: 'nouveaux/tuyau',
  fridge: 'nouveaux/frigo-v2', crt: 'nouveaux/tele', sofa: 'nouveaux/canape',
  hazmat: 'nouveaux/combinaison', gasmask: 'nouveaux/masque', duck: 'nouveaux/canard-v2'
};
const ZOOM = { trex_signature: 2 };

global.window = { FP: {} };
require(path.join(ROOT, 'src', 'world', 'silhouette.js'));
const S = window.FP.silhouette;
const INSET = 1;   // = FP.config.obstacles.drawnInset (config.js n'est pas chargé ici)

function crop(im) {
  let x0 = im.width, y0 = im.height, x1 = -1, y1 = -1;
  for (let y = 0; y < im.height; y++) for (let x = 0; x < im.width; x++) if (im.data[(y * im.width + x) * 4 + 3] >= 128) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  if (x1 < 0) throw new Error('image vide');
  const w = x1 - x0 + 1, h = y1 - y0 + 1, out = { width: w, height: h, data: Buffer.alloc(w * h * 4) };
  for (let y = 0; y < h; y++) Buffer.from(im.data.buffer, im.data.byteOffset).copy(out.data, y * w * 4, ((y + y0) * im.width + x0) * 4, ((y + y0) * im.width + x0 + w) * 4);
  return out;
}

const src = process.argv[2];
if (!src) { console.error('Usage : node dev/tools/import-pixel.js <dossier des PNG bruts>'); process.exit(1); }
fs.mkdirSync(OUT, { recursive: true });
const manifest = {};
for (const [kind, file] of Object.entries(FILES)) {
  const im = crop(png.decode(fs.readFileSync(path.join(src, file + '.png'))));
  const grid = { w: im.width, h: im.height, get: (x, y) => im.data[(y * im.width + x) * 4 + 3] >= 128 };
  const zoom = ZOOM[kind] || 1;
  const points = S.polygon(S.erode(S.mask(grid), INSET)).map(([x, y]) => [x - im.width / 2, y - im.height / 2]);
  fs.writeFileSync(path.join(OUT, kind + '.png'), png.encode(im));
  manifest[kind] = { src: `assets/obstacles/pixel/${kind}.png`, width: im.width, height: im.height, zoom, points };
  console.log(`${kind.padEnd(15)} ${im.width}×${im.height} ×${zoom} → ${im.width * 2 * zoom} px monde, ${points.length} points`);
}
fs.writeFileSync(path.join(OUT, 'manifest.js'),
  '// Généré par dev/tools/import-pixel.js (v4.15.0) : obstacles PixelLab, ?obstacles=pixel. Ne pas modifier à la main.\n' +
  'window.FLOWER_POWER_PIXEL_ASSETS = ' + JSON.stringify(manifest) + ';\n');
