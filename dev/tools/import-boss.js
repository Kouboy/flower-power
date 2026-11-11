// dev/tools/import-boss.js — importe les images d'un boss (v5.6.0), retouchées après PixelLab, et met à jour assets/boss/art.js.
// Usage : node dev/tools/import-boss.js <milieuId> <dossier des PNG bruts>
//   ex.   node dev/tools/import-boss.js friche "../pixellab-boss/friche"
// Le dossier contient les 8 fichiers ci-dessous (FILES). Chacun est recadré sur ses pixels opaques, sauf la matière,
// gardée entière (elle se répète), puis écrit dans assets/boss/art/<milieuId>/. 1 pixel PixelLab = 1 pixel d'art : pas de rééchantillonnage.
'use strict';
const fs = require('fs'), path = require('path');
const png = require('./png.js');

const ROOT = path.join(__dirname, '..', '..');
const ART = path.join(ROOT, 'assets', 'boss', 'art.js');
// Rôle de assets/boss/art.js → fichier.
const FILES = { matter: 'matiere', target: 'cible', head: 'tete', plate: 'plaque', turret: 'tourelle' };
const WHOLE = new Set(['matiere']);

const [id, src] = process.argv.slice(2);
if (!id || !src) { console.error('Usage : node dev/tools/import-boss.js <milieuId> <dossier des PNG bruts>'); process.exit(1); }
const names = Object.values(FILES).flat(), missing = names.filter(n => !fs.existsSync(path.join(src, n + '.png')));
if (missing.length) { console.error('Fichiers manquants dans ' + src + ' : ' + missing.map(n => n + '.png').join(', ')); process.exit(1); }

const out = path.join(ROOT, 'assets', 'boss', 'art', id);
fs.mkdirSync(out, { recursive: true });
for (const n of names) {
  const im = png.decode(fs.readFileSync(path.join(src, n + '.png')));
  const kept = WHOLE.has(n) ? im : png.crop(im);
  fs.writeFileSync(path.join(out, n + '.png'), png.encode(kept));
  console.log(n + '.png : ' + kept.width + '×' + kept.height);
}

// Réécrit l'entrée du milieu dans art.js (les autres milieux sont gardés tels quels).
const at = (n) => 'assets/boss/art/' + id + '/' + n + '.png';
const entry = {};
for (const [role, f] of Object.entries(FILES)) entry[role] = Array.isArray(f) ? f.map(at) : at(f);
const text = fs.readFileSync(ART, 'utf8'), m = text.match(/window\.FLOWER_POWER_BOSS_ART = (\{[\s\S]*\});/);
if (!m) { console.error('art.js : objet introuvable'); process.exit(1); }
const all = Object.assign(JSON.parse(m[1].replace(/'/g, '"').replace(/(\w+):/g, '"$1":')), { [id]: entry });
const body = Object.entries(all).map(([k, v]) => '  ' + k + ': ' + JSON.stringify(v).replace(/"/g, '\'').replace(/'(\w+)':/g, '$1: ').replace(/,(?=\S)/g, ', ').replace(/^\{/, '{ ').replace(/\}$/, ' }')).join(',\n');
fs.writeFileSync(ART, text.replace(m[0], 'window.FLOWER_POWER_BOSS_ART = {' + (body ? '\n' + body + '\n' : '') + '};'));
console.log('assets/boss/art.js : ' + id + ' à jour');
