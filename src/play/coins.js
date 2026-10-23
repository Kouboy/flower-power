// play/coins.js — ramassage des pièces (v4.5.0) : chaque pièce paie et entretient le combo, le chapelet complet paie son bonus.
// Lit     : state.mode, state.plant.tip, state.world.{coins,chains}, state.boosts.{magnet,premium}, FP.config.{coins,shop,text.chain}.
// Écrit   : coins[].taken, chains[].{got,missed,done}, state.events (coin, chainDone) ; les gains passent par FP.scoring.
// Expose  : FP.coinPlay.update(state).
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};

  function update(state) {
    const p = state.plant, w = state.world, k = FP.config.coins, b = state.boosts, sh = FP.config.shop;
    if (state.mode !== 'playing' || !p.tip || !w.coins.length) return;
    const reach = k.pickup * (b.magnet ? sh.magnetK : 1), value = k.value * (b.premium ? sh.premiumK : 1);   // aimant, premium (boutique)
    for (const c of w.coins) {
      if (c.taken) continue;
      const ch = w.chains[c.chain];
      if (Math.hypot(c.x - p.tip.x, c.y - p.tip.y) <= reach) {
        c.taken = true; ch.got += 1;
        FP.scoring.awardCoin(state, c.x, c.y, value);
        state.events.push({ type: 'coin', x: c.x, y: c.y, rank: ch.got - 1 });
        if (ch.got === ch.total && !ch.missed) {
          ch.done = true;
          const amount = k.chainBonus[ch.kind], words = FP.config.text.chain;
          FP.scoring.award(state, c.x, c.y, amount, 'chain');
          state.events.push({ type: 'chainDone', x: c.x, y: c.y, kind: ch.kind, amount, word: words[Math.floor(Math.random() * words.length)] });
        }
      } else if (c.y > p.tip.y + k.missBelow) ch.missed = true;   // laissée derrière : plus de bonus pour ce chapelet
    }
  }

  FP.coinPlay = { update };
})();
