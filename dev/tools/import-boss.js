// dev/tools/import-boss.js — importe les images d'un boss (v5.6.0), retouchées après PixelLab, et met à jour assets/boss/art.js.
// Usage : node dev/tools/import-boss.js <milieuId> <dossier des PNG bruts> [--tank x0,y0,x1,y1]
//   ex.   node dev/tools/import-boss.js friche "../pixellab-boss/friche" --tank .34,.34,.66,.66
// Le dossier contient tout ou partie des fichiers ci-dessous (FILES, au moins un ; v5.9.0). Chacun est recadré sur ses pixels opaques, sauf
// la matière, gardée entière (elle se répète), puis écrit dans assets/boss/art/<milieuId>/. 1 pixel PixelLab = 1 pixel d'art : pas de
// rééchantillonnage. L'entrée du milieu dans art.js est complétée (les rôles absents du dossier sont gardés) ; --tank écrit pumpTank, la
// cuve de la pompe en fractions de son image (le liquide animé y est dessiné, render/boss-core.js).
'use strict';
const fs = require('fs'), path = require('path');
const png = require('./png.js');

const ROOT = path.join(__dirname, '..', '..');
const ART = path.join(ROOT, 'assets', 'boss', 'art.js');
// Rôle de assets/boss/art.js → fichier.
const FILES = { matter: 'matiere', plate: 'plaque', turret: 'tourelle', pump: 'pompe' };   // v5.9.0 : la pompe revient, en sprite animé
const WHOLE = new Set(['matiere']);

const [id, src, flag, tankArg] = process.argv.slice(2);
if (!id || !src || (flag && (flag !== '--tank' || !tankArg))) { console.error('Usage : node dev/tools/import-boss.js <milieuId> <dossier des PNG bruts> [--tank x0,y0,x1,y1]'); process.exit(1); }
const tank = tankArg ? tankArg.split(',').map(Number) : null;
if (tank && (tank.length !== 4 || tank.some(v => !(v >= 0 && v <= 1)) || tank[0] >= tank[2] || tank[1] >= tank[3])) { console.error('--tank : quatre fractions x0,y0,x1,y1'); process.exit(1); }
const present = Object.entries(FILES).filter(([, n]) => fs.existsSync(path.join(src, n + '.png')));
if (!present.length) { console.error('Aucun fichier de ' + Object.values(FILES).map(n => n + '.png').join(', ') + ' dans ' + src); process.exit(1); }
const names = present.map(([, n]) => n);

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
for (const [role, f] of present) entry[role] = at(f);
if (tank) entry.pumpTank = tank;
const text = fs.readFileSync(ART, 'utf8'), m = text.match(/window\.FLOWER_POWER_BOSS_ART = (\{[\s\S]*\});/);
if (!m) { console.error('art.js : objet introuvable'); process.exit(1); }
const all = JSON.parse(m[1].replace(/'/g, '"').replace(/(\w+):/g, '"$1":').replace(/([\[,\s])\.(\d)/g, '$10.$2'));
all[id] = Object.assign(all[id] || {}, entry);
const body = Object.entries(all).map(([k, v]) => '  ' + k + ': ' + JSON.stringify(v).replace(/"/g, '\'').replace(/'(\w+)':/g, '$1: ').replace(/,(?=\S)/g, ', ').replace(/^\{/, '{ ').replace(/\}$/, ' }')).join(',\n');
fs.writeFileSync(ART, text.replace(m[0], 'window.FLOWER_POWER_BOSS_ART = {' + (body ? '\n' + body + '\n' : '') + '};'));
console.log('assets/boss/art.js : ' + id + ' à jour');
