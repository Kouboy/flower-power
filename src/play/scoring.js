// play/scoring.js — ÉcoCrédits™, combo et records.
// Lit     : state.score, state.run.{saison,milieu,won}, FP.config.{scoring,storageKey}, FP.storage.
// Écrit   : state.score.{eco,combo,comboTimer}, state.camera.shake, state.events (eco) ;
//           FP.scoring.records (persistant entre les runs, hors de FP.state) et le stockage local.
// Expose  : FP.scoring.award(state, x, y, base, kind), FP.scoring.awardCoin(state, x, y, base), FP.scoring.awardFlat(state, x, y, amount), FP.scoring.update(state, dt),
//           FP.scoring.records ({ flowers, eco, reach: { saison, milieu }, won }), FP.scoring.load(backend?), FP.scoring.save(backend?),
//           FP.scoring.reachBeyond(a, b) (pur). Tous les gains sont multipliés par la saison (v4.9.0).
// Porté de la v3.43.16 (addEcoCredits, best/bestEco).
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};

  const START = () => ({ saison: 1, milieu: 0 });
  const EMPTY = () => ({ flowers: 0, eco: 0, reach: START(), won: false });
  // Multiplicateur de saison (v4.9.0) : ×1, ×2, ×3… sur tous les gains.
  const saison = (state) => (state.run ? state.run.saison : 1);
  // a va plus loin que b dans la partie (saison, puis milieu).
  const reachBeyond = (a, b) => a.saison > b.saison || (a.saison === b.saison && a.milieu > b.milieu);
  const COIN_STEP = 5;

  function load(backend) {
    const raw = FP.storage.readJSON(FP.config.storageKey, null, backend);
    const n = (v) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : 0);
    if (!raw) return EMPTY();
    const r = raw.reach || {}, reach = { saison: Math.max(1, Math.floor(n(r.saison)) || 1), milieu: Math.min(3, Math.floor(n(r.milieu))) };   // ancien record : valeurs par défaut
    return { flowers: n(raw.flowers), eco: n(raw.eco), reach, won: raw.won === true };
  }

  function save(backend) {
    return FP.storage.writeJSON(FP.config.storageKey, FP.scoring.records, backend);
  }

  // Chaque gain enchaîné en moins de 2 s fait monter le combo (+22 % par cran, ×8 au plus).
  function award(state, x, y, base, kind) {
    const c = FP.config.scoring, s = state.score;
    s.combo = s.comboTimer > 0 ? Math.min(c.comboMax, s.combo + 1) : 1;
    s.comboTimer = c.comboWindow;
    const amount = Math.max(c.minAmount, Math.round(base * saison(state) * (1 + (s.combo - 1) * c.comboGain) / c.step) * c.step);
    s.eco += amount;
    state.events.push({ type: 'eco', x, y, amount, combo: s.combo, kind });
    state.camera.shake = Math.max(state.camera.shake, c.shakeBase + Math.min(c.shakeMax, s.combo * c.shakePerCombo));
  }

  // Pièce (v4.5.0) : payée au multiplicateur du combo en cours, qu'elle entretient (délai relancé) sans le faire monter ;
  // sans combo en cours, elle vaut sa base et n'en lance pas. Gain discret : pas de nombre flottant (render/effects.js).
  // Arrondi propre aux pièces (v4.7.4) : au multiple de COIN_STEP, sans le minimum de 25 des autres gains.
  function awardCoin(state, x, y, base) {
    const c = FP.config.scoring, s = state.score, live = s.comboTimer > 0 && s.combo > 0;
    const amount = Math.max(COIN_STEP, Math.round(base * saison(state) * (live ? 1 + (s.combo - 1) * c.comboGain : 1) / COIN_STEP) * COIN_STEP);
    if (live) s.comboTimer = c.comboWindow;
    s.eco += amount;
    state.events.push({ type: 'eco', x, y, amount, combo: live ? s.combo : 1, kind: 'coin', quiet: true });
  }

  // Gain fixe (spore) : arrondi à 25, sans toucher au combo.
  function awardFlat(state, x, y, amount) {
    const c = FP.config.scoring;
    const value = Math.max(c.minAmount, Math.round(amount * saison(state) / c.step) * c.step);
    state.score.eco += value;
    state.events.push({ type: 'eco', x, y, amount: value, combo: 1, kind: 'spore', flat: true });
    state.camera.shake = Math.max(state.camera.shake, c.flatShakeBase + Math.min(c.flatShakeMax, value / c.flatShakeDiv));
  }

  function update(state, dt) {
    const s = state.score, r = FP.scoring.records;
    if (s.comboTimer > 0) {
      s.comboTimer -= dt;
      if (s.comboTimer <= 0) { s.comboTimer = 0; s.combo = 0; }
    }
    const run = state.run, further = run && reachBeyond(run, r.reach), won = run && run.won && !r.won;
    if (s.flowers > r.flowers || s.eco > r.eco || further || won) {
      r.flowers = Math.max(r.flowers, s.flowers);
      r.eco = Math.max(r.eco, s.eco);
      if (further) r.reach = { saison: run.saison, milieu: run.milieu };
      if (won) r.won = true;
      save();
    }
  }

  FP.scoring = { award, awardCoin, awardFlat, update, load, save, reachBeyond, records: EMPTY() };
  FP.scoring.records = load();
})();
