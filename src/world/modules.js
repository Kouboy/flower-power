// world/modules.js — les modules du Lab en partie normale (v5.14.0, ?modules ; spec docs/superpowers/specs/2026-11-18-modules-en-partie-design.md).
// À partir du 2e niveau de chaque biome (ni Lab, ni boss), un ou plusieurs modules de la sélection du biome, tirés sans remise, en miroir
// au hasard ; autant que la hauteur du niveau le permet, au moins un. Leurs bandes (du bas vers le haut) se partagent l'espace libre ; le
// chemin sûr tiré passe par leurs portes (et suit leur trajet de référence dans la bande) ; rien de tiré au hasard dans une bande.
// Tirage propre (graine ^ salt ^ niveau) : state.rng n'est pas touché par le choix ; sans ?modules, aucun tirage.
// Appels, dans world/level.js : generate (après la hauteur), joinPath (après le chemin sûr), finish (après les pièces).
// Lit     : state.{seed, level, run.{modules, lab, boss, step, milieu}}, state.world.{width, height, viewH, surfaceY, safePath, modules},
//           FP.config.{lab.modules, milieux, plant.seedOffset}, window.FLOWER_POWER_LAB, FP.labLevel.build, FP.createRng.
// Écrit   : state.world.modules (les modules posés ; module.inLevel ; module.pending = ce qu'ils ajoutent au monde, retiré par finish) ;
//           state.world.safePath (joinPath) ; state.world.{solids, toxics, leaks, coins, chains} (finish : le contenu des modules).
// Expose  : FP.levelModules.{eligible(state), pick(state, rng) (pur), bands(world, picks) (pur), generate(state), joinPath(world),
//           finish(state), blocked(world, y0, y1) (pur)}.
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  const C = () => FP.config.lab.modules;

  const eligible = (state) => { const r = state.run; return !!r.modules && !r.lab && !r.boss && r.step >= C().from; };

  // Hauteurs (monde) entre lesquelles les modules se posent : sous la surface (marge top), au-dessus du départ (marge bottom).
  const span = (world) => ({ hi: world.surfaceY + C().top * world.viewH, lo: world.height - FP.config.plant.seedOffset - C().bottom * world.viewH });

  // Sélection du biome mélangée ; on garde chaque module qui tient encore (au moins un : le niveau le plus court a la place d'1,5 écran).
  function pick(state, rng) {
    const w = state.world, ids = C().sets[FP.config.milieux[state.run.milieu].id] || [];
    const pool = ids.map(id => window.FLOWER_POWER_LAB.find(m => m.id === id)).filter(Boolean);
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rng.next() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    const { hi, lo } = span(w), out = [];
    let used = 0;
    for (const circuit of pool) {
      const need = used + (out.length ? C().gap * w.viewH : 0) + circuit.height * w.viewH;
      if (need <= lo - hi + 1e-6) { used = need; out.push({ circuit, mirror: rng.next() < .5 }); }
    }
    return out;
  }

  // Bas de chaque module (monde), du bas vers le haut : l'espace libre est réparti à parts égales sous, entre et au-dessus des modules.
  function bands(world, picks) {
    const { hi, lo } = span(world), gap = C().gap * world.viewH;
    const used = picks.reduce((h, p) => h + p.circuit.height * world.viewH, 0) + gap * Math.max(0, picks.length - 1);
    const extra = Math.max(0, lo - hi - used) / (picks.length + 1), out = [];
    let y = lo - extra;
    for (const p of picks) { out.push(y); y -= p.circuit.height * world.viewH + gap + extra; }
    return out;
  }

  function generate(state) {
    if (!eligible(state)) return;
    const rng = FP.createRng((state.seed ^ C().salt ^ Math.imul(state.level, 2654435761)) >>> 0), picks = pick(state, rng);
    state.world.modules = bands(state.world, picks).map((bottom, i) => {
      const b = FP.labLevel.build(state, picks[i].circuit, picks[i].mirror, bottom, i);
      b.module.inLevel = true;   // posé dans un niveau tiré au hasard : sa bande est réservée (blocked) ; pas au Lab
      b.module.pending = { solids: b.solids, toxics: b.toxics, leaks: b.leaks, coins: b.coins };
      return b.module;
    });
  }

  // Le chemin sûr quitte ses nœuds près d'un module (approach) et emprunte son trajet de référence, de la porte du bas à celle du haut.
  // Le départ et l'arrivée (sous la surface) restent : si l'un tombe près d'un module, il passe à l'aplomb de la porte voisine.
  function joinPath(world) {
    const mods = world.modules;
    if (!mods.length) return;
    const a = C().approach * world.viewH, near = (y) => mods.some(M => y >= M.top - a && y <= M.bottom + a);
    const order = [...mods].sort((m, n) => n.bottom - m.bottom), P = world.safePath, first = P[0], last = P[P.length - 1], out = [];
    let k = 0;
    for (const p of P) {
      while (k < order.length && p.y < order[k].top - a) out.push(...order[k++].path.map(q => ({ x: q.x, y: q.y })));
      if (!near(p.y)) out.push(p);
    }
    while (k < order.length) out.push(...order[k++].path.map(q => ({ x: q.x, y: q.y })));
    if (out[0] !== first) out.unshift({ x: out[0].x, y: first.y });
    if (out[out.length - 1] !== last) out.push({ x: out[out.length - 1].x, y: last.y });
    world.safePath = out;
  }

  // Le contenu des modules rejoint le monde, une fois le tirage au hasard fini (il ne le voit donc pas comme un obstacle à éviter).
  function finish(state) {
    const w = state.world;
    for (const M of w.modules) {
      const p = M.pending;
      if (!p) continue;
      w.solids.push(...p.solids); w.toxics.push(...p.toxics); w.leaks.push(...p.leaks);
      const chain = w.chains.length;
      p.coins.forEach((q, rank) => w.coins.push({ x: q.x, y: q.y, chain, rank, taken: false }));
      if (p.coins.length) w.chains.push({ kind: 'easy', anchor: 'lab', total: p.coins.length, got: 0, missed: false, done: false });
      delete M.pending;
    }
  }

  const blocked = (world, y0, y1) => {
    const mods = world.modules;
    if (!mods || !mods.length) return false;
    const pad = C().pad;
    return mods.some(M => M.inLevel && y1 >= M.top - pad && y0 <= M.bottom + pad);
  };

  FP.levelModules = { eligible, pick, bands, generate, joinPath, finish, blocked };
})();
