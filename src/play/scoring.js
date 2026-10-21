// play/scoring.js — ÉcoCrédits™, combo et records.
// Lit     : state.score, FP.config.{scoring,storageKey}, FP.storage.
// Écrit   : state.score.{eco,combo,comboTimer}, state.camera.shake, state.events (eco) ;
//           FP.scoring.records (persistant entre les runs, hors de FP.state) et le stockage local.
// Expose  : FP.scoring.award(state, x, y, base, kind), FP.scoring.update(state, dt),
//           FP.scoring.records, FP.scoring.load(backend?), FP.scoring.save(backend?).
// Porté de la v3.43.16 (addEcoCredits, best/bestEco).
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};

  const EMPTY = () => ({ flowers: 0, eco: 0 });

  function load(backend) {
    const raw = FP.storage.readJSON(FP.config.storageKey, null, backend);
    const n = (v) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : 0);
    return raw ? { flowers: n(raw.flowers), eco: n(raw.eco) } : EMPTY();
  }

  function save(backend) {
    return FP.storage.writeJSON(FP.config.storageKey, FP.scoring.records, backend);
  }

  // Chaque gain enchaîné en moins de 2 s fait monter le combo (+22 % par cran, ×8 au plus).
  function award(state, x, y, base, kind) {
    const c = FP.config.scoring, s = state.score;
    s.combo = s.comboTimer > 0 ? Math.min(c.comboMax, s.combo + 1) : 1;
    s.comboTimer = c.comboWindow;
    const amount = Math.max(c.minAmount, Math.round(base * (1 + (s.combo - 1) * c.comboGain) / c.step) * c.step);
    s.eco += amount;
    state.events.push({ type: 'eco', x, y, amount, combo: s.combo, kind });
    state.camera.shake = Math.max(state.camera.shake, c.shakeBase + Math.min(c.shakeMax, s.combo * c.shakePerCombo));
  }

  function update(state, dt) {
    const s = state.score, r = FP.scoring.records;
    if (s.comboTimer > 0) {
      s.comboTimer -= dt;
      if (s.comboTimer <= 0) { s.comboTimer = 0; s.combo = 0; }
    }
    if (s.flowers > r.flowers || s.eco > r.eco) {
      r.flowers = Math.max(r.flowers, s.flowers);
      r.eco = Math.max(r.eco, s.eco);
      save();
    }
  }

  FP.scoring = { award, update, load, save, records: EMPTY() };
  FP.scoring.records = load();
})();
