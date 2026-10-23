// play/shop.js — boutique de fin de pousse (v4.6.0) : bon de commande de 3 articles (un à −50 %), achetés au score.
// Lit     : state.seed, state.score.eco, state.time, state.mode, FP.config.shop, FP.createRng.
// Écrit   : state.shop, state.shopVisits, state.mode ('shop'), state.events (shopOpen, shopTick).
// Expose  : FP.shop.open(state, { after }), FP.shop.total(state), FP.shop.canCheck(state, i), FP.shop.toggle(state, i),
//           FP.shop.co2(state). after : 'death' | 'bloom' | 'last' (dernière chance : la Graine Bio™ est garantie).
// Tirage propre (graine ^ salt ^ passage) : state.rng n'est jamais consommé.
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  const STEP = 25;

  function open(state, { after }) {
    const c = FP.config.shop, visit = (state.shopVisits += 1), lastChance = after === 'last';
    const rng = FP.createRng((state.seed ^ c.salt ^ Math.imul(visit, 2654435761)) >>> 0);
    const pool = c.items.slice(), picked = [];
    for (let i = 0; i < 3; i++) picked.push(pool.splice(Math.floor(rng.next() * pool.length), 1)[0]);
    if (lastChance && !picked.some(it => it.id === 'seed')) picked[2] = c.items.find(it => it.id === 'seed');
    const promo = Math.floor(rng.next() * 3);
    const items = picked.map((it, i) => ({
      id: it.id, base: it.price, promo: i === promo, checked: false,
      price: i === promo ? Math.round(it.price * c.promo / STEP) * STEP : it.price
    }));
    state.shop = { visit, after, lastChance, items, transport: c.transports[Math.floor(rng.next() * c.transports.length)], phase: 'in', t0: state.time };
    state.mode = 'shop';
    state.events.push({ type: 'shopOpen' });
  }

  const total = (state) => state.shop.items.reduce((t, it) => t + (it.checked ? it.price : 0), 0);
  // Cochable : déjà coché (on peut décocher), ou payable avec ce qui reste du score une fois le total retiré.
  const canCheck = (state, i) => { const it = state.shop.items[i]; return it.checked || it.price <= state.score.eco - total(state); };

  function toggle(state, i) {
    const sh = state.shop;
    if (!sh || sh.phase !== 'idle' || !sh.items[i] || !canCheck(state, i)) return;
    sh.items[i].checked = !sh.items[i].checked;
    state.events.push({ type: 'shopTick' });
  }

  function co2(state) {
    const mass = (id) => FP.config.shop.items.find(it => it.id === id).co2;
    return Math.round(state.shop.items.reduce((t, it) => t + (it.checked ? mass(it.id) : 0), 0) * 10) / 10;
  }

  FP.shop = { open, total, canCheck, toggle, co2 };
})();
