// ui/hud.js — HUD en pixels d'art, dans les coins du bas : graines restantes, ÉcoCrédits™, et seulement quand ils sont actifs,
// le pollen et le combo ; « TOUCHER POUR POUSSER » entre deux niveaux.
// Lit     : state.mode, state.time, state.plant.reserves, state.score.{eco,flowerBonus,combo}, FP.config.{plant.seeds,text.ready},
//           FP.palette.seed, FP.font, FP.view.ui.
// Écrit   : state.fx.ui.hud uniquement (animations : score affiché, graines perdues, rebonds).
// Expose  : FP.hud.items(state) (pur, testé), FP.hud.draw(g, state) (toile d'interface), FP.hud.MARGIN.
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  const MARGIN = 4;                 // pixels d'art depuis les bords
  const SEED_STEP = 8, LOST_TIME = .4, CRACK_TIME = .25;
  const EMPTY = '#3a2a1e', SPROUT = '#7fb04a';

  // Ce que le HUD affiche : pas de fleurs (le parterre en tient lieu), pas d'élan.
  function items(state) {
    const sc = state.score;
    return {
      seeds: state.plant.reserves, seedsMax: FP.config.plant.seeds, eco: sc.eco,
      pollen: sc.flowerBonus > 0 ? sc.flowerBonus : null, combo: sc.combo > 1 ? sc.combo : null,
      ready: state.mode === 'ready'
    };
  }

  function memo(state, it) {
    const ui = state.fx.ui || (state.fx.ui = {});
    return ui.hud || (ui.hud = { shownEco: it.eco, seeds: it.seeds, lostAt: [], pollen: null, pollenAt: -9, combo: null, comboAt: -9, last: state.time });
  }

  // Graine : ovale brun avec reflet et pousse ; vide et sombre une fois perdue ; fendue juste après la perte.
  function seed(g, x, y, state, full, crack) {
    const p = FP.palette.seed;
    g.fillStyle = FP.font.INK;
    g.fillRect(x + 1, y, 4, 1); g.fillRect(x, y + 1, 6, 5); g.fillRect(x + 1, y + 6, 4, 1);
    g.fillStyle = full ? p.body : EMPTY; g.fillRect(x + 1, y + 1, 4, 5);
    if (!full) return;
    g.fillStyle = p.shade; g.fillRect(x + 3, y + 2, 2, 4);
    g.fillStyle = p.light; g.fillRect(x + 2, y + 2, 1, 2);
    g.fillStyle = SPROUT; g.fillRect(x + 2, y - 1, 2, 1);
    if (crack) { g.fillStyle = FP.font.INK; g.fillRect(x + 2, y + 1, 1, 2); g.fillRect(x + 3, y + 3, 1, 3); }
  }

  function flower(g, x, y) {
    g.fillStyle = FP.font.INK; g.fillRect(x - 1, y - 1, 8, 8);
    g.fillStyle = FP.font.COLORS.pink;
    for (const [dx, dy] of [[1, 0], [0, 1], [2, 1], [1, 2]]) g.fillRect(x + dx * 2, y + dy * 2, 2, 2);
    g.fillStyle = FP.font.COLORS.gold; g.fillRect(x + 2, y + 2, 2, 2);
  }

  function draw(g, state) {
    const it = items(state), m = memo(state, it), t = state.time, { w, h } = FP.view.ui, font = FP.font;
    const dt = Math.max(0, Math.min(.1, t - m.last));
    m.last = t;

    // Graines : celles perdues depuis la dernière frame se fendent puis s'éteignent.
    for (let i = it.seeds; i < m.seeds; i++) m.lostAt[i] = t;
    m.seeds = it.seeds;
    const seedY = h - MARGIN - 7;
    for (let i = 0; i < it.seedsMax; i++) {
      const lost = t - (m.lostAt[i] !== undefined ? m.lostAt[i] : -9);
      const full = i < it.seeds || lost < LOST_TIME, crack = i >= it.seeds && lost < LOST_TIME && lost >= 0;
      seed(g, MARGIN + i * SEED_STEP, seedY, state, full && !(crack && lost > CRACK_TIME), crack);
    }

    // Score : compteur d'arcade qui rattrape le vrai score en ~0,5 s ; un score qui baisse (nouveau run) est repris tel quel.
    m.shownEco = it.eco < m.shownEco ? it.eco : m.shownEco + (it.eco - m.shownEco) * Math.min(1, dt * 8);
    if (Math.abs(it.eco - m.shownEco) < 1) m.shownEco = it.eco;
    const scoreY = h - MARGIN - font.HEIGHT * 2;
    font.draw(g, 'Ɇ' + Math.round(m.shownEco).toLocaleString('fr-FR'), w - MARGIN, scoreY, { scale: 2, color: font.COLORS.eco, align: 'right' });

    // Pollen et combo : apparaissent d'un petit bond, au-dessus des graines et du score.
    if (it.pollen !== m.pollen) { if (it.pollen) m.pollenAt = t; m.pollen = it.pollen; }
    if (it.pollen) {
      const y = seedY - 12 - (t - m.pollenAt < .15 ? 2 : 0);
      flower(g, MARGIN + 1, y);
      font.draw(g, '+' + it.pollen, MARGIN + 10, y, { color: font.COLORS.pink });
    }
    if (it.combo !== m.combo) { if (it.combo) m.comboAt = t; m.combo = it.combo; }
    if (it.combo) font.draw(g, 'COMBO ×' + it.combo, w - MARGIN, scoreY - 11 - (t - m.comboAt < .12 ? 1 : 0), { color: font.COLORS.gold, align: 'right' });

    if (it.ready && Math.floor(t * 2) % 2 === 0) font.draw(g, FP.config.text.ready, w / 2, h - 34, { align: 'center' });
  }

  FP.hud = { items, draw, MARGIN };
})();
