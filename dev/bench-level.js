// Banc de génération : node dev/bench-level.js
// Chronomètre 50 générations de niveau à deux largeurs de fenêtre (étroite et habituelle) et affiche la médiane.
// Charge les mêmes scripts que dev/check.html, sans les tests.
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');

const devDir = __dirname;
const html = fs.readFileSync(path.join(devDir, 'check.html'), 'utf8');
const srcs = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]).filter(s => !s.includes('tests/') && !s.includes('harness'));
const ctx = { console, location: { search: '' }, URLSearchParams, Math };
ctx.window = ctx; vm.createContext(ctx);
for (const s of srcs) vm.runInContext(fs.readFileSync(path.join(devDir, s), 'utf8'), ctx, { filename: s });
const FP = ctx.FP;

const RUNS = 50;
for (const W of [300, 440]) {
  const times = [];
  for (let seed = 1; seed <= RUNS; seed++) {
    const s = FP.state.createRun(seed, { W, H: Math.round(W * 16 / 9) });
    const t0 = process.hrtime.bigint();
    FP.level.startRun(s);
    times.push(Number(process.hrtime.bigint() - t0) / 1e6);
  }
  times.sort((a, b) => a - b);
  console.log(`W=${W} : médiane ${times[RUNS >> 1].toFixed(1)} ms, max ${times[RUNS - 1].toFixed(1)} ms`);
}
