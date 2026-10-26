// play/coins.js — ramassage des pièces (v4.5.0) : chaque pièce paie et entretient le combo, le chapelet complet paie son bonus.
// Aimant (boutique, v4.6.3) : les jetons à portée s'arrachent de leur place et filent vers la tête, de plus en plus vite.
// Lit     : state.mode, state.plant.tip, state.world.{coins,chains}, state.boosts.{magnet,premium}, FP.config.{coins,shop,text.chain}.
// Écrit   : coins[].{taken,x,y,pulled,v}, chains[].{got,missed,done}, state.events (coin, chainDone) ; les gains passent par FP.scoring.
// Expose  : FP.coinPlay.update(state, dt).
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};

  // Aspiration : un jeton à portée est « tiré » ; il avance vers la pointe à une vitesse qui croît.
  function pull(c, tip, sh, dt) {
    const dx = tip.x - c.x, dy = tip.y - c.y, d = Math.hypot(dx, dy);
    if (!c.pulled) { if (d > sh.magnetRange) return; c.pulled = true; c.v = sh.magnetSpeed; }
    c.v += sh.magnetAccel * dt;
    const step = Math.min(d, c.v * dt);
    if (d > 0) { c.x += dx / d * step; c.y += dy / d * step; }
  }

  function update(state, dt = 1 / 60) {
    const p = state.plant, w = state.world, k = FP.config.coins, b = state.boosts, sh = FP.config.shop;
    if (state.mode !== 'playing' || !p.tip || !w.coins.length) return;
    const value = k.value * (b.premium ? sh.premiumK : 1);   // premium (boutique)
    for (const c of w.coins) {
      if (c.taken) continue;
      const ch = w.chains[c.chain];
      if (b.magnet) pull(c, p.tip, sh, dt);
      if (Math.hypot(c.x - p.tip.x, c.y - p.tip.y) <= k.pickup) {
        c.taken = true; ch.got += 1;
        FP.scoring.awardCoin(state, c.x, c.y, value);
        state.events.push({ type: 'coin', x: c.x, y: c.y, rank: ch.got - 1, chain: c.chain });
        if (ch.got === ch.total && !ch.missed) {
          ch.done = true;
          const amount = k.chainBonus[ch.kind], words = FP.config.text.chain;
          FP.scoring.award(state, c.x, c.y, amount, 'chain');
          state.events.push({ type: 'chainDone', x: c.x, y: c.y, kind: ch.kind, amount, word: words[Math.floor(Math.random() * words.length)] });
        }
      } else if (!c.pulled && c.y > p.tip.y + k.missBelow) ch.missed = true;   // laissée derrière (un jeton aspiré, lui, arrive)
    }
  }

  FP.coinPlay = { update };
})();
