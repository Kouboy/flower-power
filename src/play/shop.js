// play/shop.js — boutique de fin de pousse (v4.6.0) : bon de commande de 3 articles (un à −50 %), achetés au score.
// Lit     : state.seed, state.score.eco, state.time, state.mode, FP.config.shop, FP.createRng.
// Écrit   : state.shop, state.shopVisits, state.mode ('shop'), state.events (shopOpen, shopTick, shopOrder) ; à la commande :
//           state.score.eco, state.plant.reserves, state.boosts ; Lobbying regénère le niveau (FP.level.generate, FP.plant.prepare).
// Expose  : FP.shop.open(state, { after }), FP.shop.total(state), FP.shop.canCheck(state, i), FP.shop.toggle(state, i),
//           FP.shop.co2(state), FP.shop.order(state), FP.shop.decline(state), FP.shop.update(state). after : 'death' | 'bloom' | 'last'
//           (dernière chance : la Graine Bio™ est garantie). Les effets (state.boosts) valent pour la pousse suivante :
//           FP.plant.launch applique membrane et spore, les autres systèmes lisent leur drapeau ; la fin de pousse les efface.
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

  // Effet d'un article : la graine tout de suite, le reste en drapeau pour la pousse suivante.
  function applyItem(state, id) {
    if (id === 'seed') state.plant.reserves += 1;
    else state.boosts[id] = true;
  }

  // Commande : rien de coché → comme un refus. Lobbying d'abord (le niveau est regénéré), puis les autres articles.
  function order(state) {
    const sh = state.shop;
    if (!sh || sh.phase !== 'idle') return;
    const bought = sh.items.filter(it => it.checked).map(it => it.id);
    if (!bought.length) { decline(state); return; }
    state.score.eco = Math.max(0, state.score.eco - total(state));
    if (bought.includes('lobbying')) { FP.level.generate(state, { lobbying: true }); FP.plant.prepare(state); }
    for (const id of bought) if (id !== 'lobbying') applyItem(state, id);
    sh.phase = 'ordered'; sh.t0 = state.time;
    state.events.push({ type: 'shopOrder', items: bought });
  }

  function decline(state) {
    const sh = state.shop;
    if (!sh || sh.phase !== 'idle') return;
    sh.phase = 'declined'; sh.t0 = state.time;
  }

  // Phases du bon : apparition → attente des coches → (tampon puis envol) ou sortie, puis le déroulé reprend la main.
  function update(state) {
    const sh = state.shop, c = FP.config.shop;
    if (state.mode !== 'shop' || !sh) return;
    const age = state.time - sh.t0;
    if (sh.phase === 'in' && age >= c.inTime) sh.phase = 'idle';
    const done = (sh.phase === 'ordered' && age >= c.stampTime + c.outTime) || (sh.phase === 'declined' && age >= c.inTime);
    if (done) { state.shop = null; FP.flow.afterShop(state, sh.after); }
  }

  FP.shop = { open, total, canCheck, toggle, co2, order, decline, update };
})();
