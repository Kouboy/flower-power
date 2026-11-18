// play/lab-stats.js — la mesure de l'Encounter Lab (v5.12.0) : pour chaque circuit, les passages réussis (éclosion), les morts et leurs
// causes, le temps passé dans le circuit, les frôlements payés et les pièces prises, gardés dans le navigateur du testeur
// (localStorage) pour que l'utilisateur relève le tableau (?lab=…&stats ; &stats=reset le vide).
// Lit     : state.{events (eco de kind solid ou leak : frôlement payé ; coin ; bloom ; death), plant.tip}, state.run.lab, state.world.{modules[0], coins},
//           window.FLOWER_POWER_LAB, FP.params.stats, window.localStorage (chaque accès protégé : sans stockage, la mesure vit en mémoire).
// Écrit   : localStorage['flower_power_lab_stats'] = { [id]: { runs, deaths, causes: { [kind]: n }, time, grazes, coins, coinsTotal } }.
// Expose  : FP.labStats.update(state, dt), FP.labStats.summary() → [{ id, name, runs, deaths, avgTime, grazesPerRun, coinsPerRun, coinsTotal,
//           causes }] (dans l'ordre des circuits), FP.labStats.reset().
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  const KEY = 'flower_power_lab_stats';
  let data = null, cur = null;   // data : la mesure (copie en mémoire du stockage) ; cur : le passage en cours

  function load() {
    if (data) return data;
    try { data = JSON.parse(window.localStorage.getItem(KEY) || '{}') || {}; } catch (e) { data = {}; }
    return data;
  }
  function save() { try { window.localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* sans stockage : en mémoire */ } }
  function reset() { data = {}; cur = null; try { window.localStorage.removeItem(KEY); } catch (e) { /* rien à vider */ } }

  const entry = (id) => { const d = load(); return d[id] || (d[id] = { runs: 0, deaths: 0, causes: {}, time: 0, grazes: 0, coins: 0, coinsTotal: 0 }); };

  function finish(state, died) {
    const e = entry(cur.id);
    if (died) { e.deaths += 1; e.causes[died] = (e.causes[died] || 0) + 1; }
    else { e.runs += 1; e.time += cur.time; e.grazes += cur.grazes; e.coins += cur.coins; }
    e.coinsTotal = state.world.coins.length;
    cur = null; save();
  }

  function update(state, dt) {
    const L = state.run.lab ? state.world.modules[0] : null, tip = state.plant.tip;   // v5.14.0 : la mesure reste propre au Lab
    if (!L) return;
    if (!cur || cur.id !== L.circuit.id || cur.level !== L) cur = { id: L.circuit.id, level: L, time: 0, grazes: 0, coins: 0 };
    if (tip && tip.y >= L.top && tip.y <= L.bottom) cur.time += dt;
    for (const ev of state.events) {
      if (!cur) break;
      if (ev.type === 'eco' && (ev.kind === 'solid' || ev.kind === 'leak')) cur.grazes += 1;
      else if (ev.type === 'coin') cur.coins += 1;
      else if (ev.type === 'bloom') finish(state, null);
      else if (ev.type === 'death') finish(state, ev.kind || ev.cause || '?');
    }
  }

  const round = (v) => Math.round(v * 10) / 10;
  function summary() {
    return window.FLOWER_POWER_LAB.map(c => {
      const e = load()[c.id] || { runs: 0, deaths: 0, causes: {}, time: 0, grazes: 0, coins: 0, coinsTotal: 0 }, n = e.runs || 1;
      return { id: c.id, name: c.name, runs: e.runs, deaths: e.deaths, avgTime: e.runs ? round(e.time / n) : 0, grazesPerRun: e.runs ? round(e.grazes / n) : 0,
        coinsPerRun: e.runs ? round(e.coins / n) : 0, coinsTotal: e.coinsTotal, causes: e.causes };
    });
  }

  if (FP.params && FP.params.stats === 'reset') reset();
  FP.labStats = { update, summary, reset };
})();
