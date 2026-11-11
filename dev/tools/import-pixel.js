// dev/tools/import-pixel.js — importe les obstacles PixelLab (v4.15.0 ; obstacles officiels du jeu depuis la v5.0.0).
// Usage : node dev/tools/import-pixel.js <dossier des PNG bruts>
//   ex.   node dev/tools/import-pixel.js "../pixellab-test"
// Étapes : recadre chaque PNG sur ses pixels opaques, écrit assets/obstacles/<kind>.png, calcule la collision depuis la
// silhouette rétrécie d'un pixel (dev/tools/silhouette.js), puis écrit les fiches dans assets/obstacles/manifest.js.
// Un pixel PixelLab = ZOOM pixels d'art (1 par défaut, 2 pixels CSS par pixel d'art) : pas de rééchantillonnage.
'use strict';
const fs = require('fs'), path = require('path');
const png = require('./png.js');

const ROOT = path.join(__dirname, '..', '..');
const OUT = path.join(ROOT, 'assets', 'obstacles');
const ART = 2;     // pixels CSS par pixel d'art (FP.px.SCALE)
const INSET = 1;   // pixels retirés à la silhouette avant le calcul de la collision
// Famille du jeu → fichier brut (-sombre, -sale, -sans-herbe, -sans-flaque : retouchés par dev/tools/retouche-pixel.js, à lancer avant) ; zoom entier pour les obstacles que la taille d'origine rendrait trop petits.
const FILES = {
  tire: 'pneu-sombre', trashbag: 'sac', cone: 'cone', nuclear: 'fut', battery: 'batterie', microwave: 'microondes',
  extinguisher: 'extincteur', server: 'serveur', solar: 'solaire-sans-herbe', scooter: 'trottinette', drone: 'drone',
  arcade: 'arcade', sarcophagus: 'sarcophage', trex_signature: 'trex',
  cart: 'nouveaux/caddie-sans-flaque', mattress: 'nouveaux/matelas-sale', pallet: 'nouveaux/palette',
  oildrum: 'nouveaux/bidon', gear: 'nouveaux/engrenage', pipe: 'nouveaux/tuyau',
  fridge: 'nouveaux/frigo-v2', crt: 'nouveaux/tele', sofa: 'nouveaux/canape',
  hazmat: 'nouveaux/combinaison', gasmask: 'nouveaux/masque', duck: 'nouveaux/canard-v2'
};
const ZOOM = { trex_signature: 2 };
// Le T-Rex est la signature rare (au plus un par run, placé à part) et ne se retourne pas (son panneau a un sens).
const SIGNATURE = { trex_signature: true };
const GRAZE_RADIUS = 16;

global.window = { FP: {} };
require(path.join(__dirname, 'silhouette.js'));
const S = window.FP.silhouette;

const src = process.argv[2];
if (!src) { console.error('Usage : node dev/tools/import-pixel.js <dossier des PNG bruts>'); process.exit(1); }
fs.mkdirSync(OUT, { recursive: true });
const manifest = {};
for (const [kind, file] of Object.entries(FILES)) {
  const im = png.crop(png.decode(fs.readFileSync(path.join(src, file + '.png'))));
  const grid = { w: im.width, h: im.height, get: (x, y) => im.data[(y * im.width + x) * 4 + 3] >= 128 };
  const zoom = ZOOM[kind] || 1, signature = !!SIGNATURE[kind];
  const points = S.polygon(S.erode(S.mask(grid), INSET)).map(([x, y]) => [x - im.width / 2, y - im.height / 2]);
  fs.writeFileSync(path.join(OUT, kind + '.png'), png.encode(im));
  manifest[kind] = {
    id: kind, kind: 'obstacle',
    source: { width: im.width, height: im.height },
    render: { worldWidth: im.width * ART * zoom, pivot: [.5, .5], mirrorSafe: !signature },
    collision: { type: 'polygon', points, grazeRadius: GRAZE_RADIUS, flyoverEligible: true },
    spawn: { signature },
    runtime: { src: `assets/obstacles/${kind}.png` }
  };
  console.log(`${kind.padEnd(15)} ${im.width}×${im.height} ×${zoom} → ${im.width * ART * zoom} px monde, ${points.length} points`);
}
fs.writeFileSync(path.join(OUT, 'manifest.js'),
  '// Généré par dev/tools/import-pixel.js : fiches des obstacles (PixelLab). Ne pas modifier à la main.\n' +
  'window.FLOWER_POWER_OBSTACLES = ' + JSON.stringify(manifest) + ';\n');
