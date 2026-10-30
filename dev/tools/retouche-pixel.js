// dev/tools/retouche-pixel.js — retouches locales des PNG PixelLab bruts, avant dev/tools/import-pixel.js (v4.18.0).
// Usage : node dev/tools/retouche-pixel.js <dossier des PNG bruts>  (lancé depuis la racine du dépôt)
// Écrit pneu-sombre.png, nouveaux/matelas-sale.png, solaire-sans-herbe.png et nouveaux/caddie-sans-flaque.png à côté des originaux.
const fs = require('fs'), path = require('path'), png = require('./png.js');
const dir = process.argv[2];
function remap(file, out, map, extra) {
  const im = png.decode(fs.readFileSync(path.join(dir, file)));
  for (let y = 0; y < im.height; y++) for (let x = 0; x < im.width; x++) {
    const i = (y * im.width + x) * 4; if (!im.data[i + 3]) continue;
    const k = [0, 1, 2].map(c => im.data[i + c]).join(',');
    let col = map[k];
    if (extra) col = extra(x, y, k, col) || col;
    if (col) for (let c = 0; c < 3; c++) im.data[i + c] = col[c];
  }
  fs.writeFileSync(path.join(dir, out), png.encode(im));
}
remap('pneu.png', 'pneu-sombre.png', { '99,92,110': [60, 55, 62], '51,45,63': [35, 31, 38], '27,21,36': [19, 16, 21] });
// Matelas : dessus blanc menthe → beige jauni ; taches grises → moisissure ; flancs gris → toile sale.
const TOP = '225,251,208', STAIN = [128, 102, 56], MOLD = [104, 112, 64];
const blobs = [[22, 24, 5], [44, 20, 4], [62, 28, 3.5]];   // taches d'urine (x, y, rayon) sur le dessus
remap('nouveaux/matelas.png', 'nouveaux/matelas-sale.png', {
  [TOP]: [196, 178, 128], '152,157,145': MOLD, '147,162,140': [158, 140, 100], '135,134,130': [136, 118, 86],
  '88,87,86': [92, 76, 54], '95,94,92': [98, 82, 60]
}, (x, y, k) => {
  if (k !== TOP) return null;
  for (const [bx, by, r] of blobs) { const d = Math.hypot((x - bx) / 1.6, y - by); if (d < r) return d > r - 1.4 ? STAIN : [168, 142, 88]; }
  return null;
});
// Panneau solaire : PixelLab y pose toujours une touffe d'herbe ; on retire le vert sous les pieds (à partir de la ligne 43).
(function () {
  const f = path.join(dir, 'solaire-v3.png'), im = png.decode(fs.readFileSync(f));
  for (let y = 43; y < im.height; y++) for (let x = 0; x < im.width; x++) {
    const i = (y * im.width + x) * 4, [r, g, b] = im.data.subarray(i, i + 3);
    if (im.data[i + 3] && g > r + 15 && g > b + 20) im.data[i + 3] = 0;
  }
  fs.writeFileSync(path.join(dir, 'solaire-sans-herbe.png'), png.encode(im));
})();
// Caddie : la flaque sous les roues l'élargit trop (216 px de monde) ; on retire le vert et ses reflets des 17 dernières lignes opaques.
(function () {
  const im = png.decode(fs.readFileSync(path.join(dir, 'nouveaux/caddie-v2.png')));
  let bottom = 0;
  for (let y = 0; y < im.height; y++) for (let x = 0; x < im.width; x++) if (im.data[(y * im.width + x) * 4 + 3]) bottom = y;
  for (let y = bottom - 16; y <= bottom; y++) for (let x = 0; x < im.width; x++) {
    const i = (y * im.width + x) * 4, [r, g, b] = im.data.subarray(i, i + 3);
    if (im.data[i + 3] && ((g > r + 15 && g > b + 20) || Math.min(r, g, b) > 200)) im.data[i + 3] = 0;   // vert et reflets blancs
  }
  fs.writeFileSync(path.join(dir, 'nouveaux/caddie-sans-flaque.png'), png.encode(im));
})();
