// Exécute dev/check.html en ligne de commande : `node dev/run-checks.js`.
// Charge, dans un contexte isolé, les mêmes <script src> que check.html et lance FP.runTests().
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const devDir = __dirname;
const html = fs.readFileSync(path.join(devDir, 'check.html'), 'utf8');
const srcs = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]);

const context = { console, location: { search: '' }, URLSearchParams };
context.window = context;
vm.createContext(context);

let loadErrors = 0;
for (const src of srcs) {
  const file = path.join(devDir, src);
  try { vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file }); }
  catch (e) { loadErrors++; console.log('✘ chargement ' + src + ' — ' + e.message); }
}

const results = context.FP && context.FP.runTests ? context.FP.runTests() : [];
for (const r of results) console.log((r.ok ? '✔ ' : '✘ ') + r.name + (r.ok ? '' : ' — ' + r.error));
const okCount = results.filter(r => r.ok).length;
console.log(okCount + '/' + results.length + ' OK');
process.exit(okCount === results.length && loadErrors === 0 && results.length > 0 ? 0 : 1);
