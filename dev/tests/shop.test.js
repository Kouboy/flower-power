// Boutique de fin de pousse (play/shop.js) : tirage, coches, total, CO₂, commande, effets, déroulé.
const shopRun = (seed = 3) => { const s = FP.state.createRun(seed, { W: 440, H: 783 }); FP.level.startRun(s); FP.plant.launch(s); s.events.length = 0; s.score.eco = 5000; return s; };
const opened = (s, after = 'death') => { FP.shop.open(s, { after }); s.shop.phase = 'idle'; return s.shop; };
const priced = (s, prices) => { s.shop.items.forEach((it, i) => { it.price = prices[i]; it.checked = false; }); };
FP.test('shop: trois articles distincts, une seule promo à −50 %', () => {
  const ids = FP.config.shop.items.map(i => i.id);
  for (let v = 1; v <= 30; v++) {
    const s = shopRun(); s.shopVisits = v - 1; const sh = opened(s);
    FP.assertEqual(new Set(sh.items.map(i => i.id)).size, 3);
    FP.assert(sh.items.every(i => ids.includes(i.id)));
    const promos = sh.items.filter(i => i.promo);
    FP.assertEqual(promos.length, 1);
    FP.assertEqual(promos[0].price, Math.round(promos[0].base * FP.config.shop.promo / 25) * 25);
  }
});
FP.test('shop: même graine et même passage, même offre ; state.rng intact', () => {
  const a = shopRun(), b = shopRun(); const r = b.rng.next();
  opened(a); const ra = a.rng.next(); opened(b);
  FP.assertEqual(JSON.stringify(a.shop.items), JSON.stringify(b.shop.items));
  FP.assertEqual(ra, r);
});
FP.test('shop: dernière chance → la graine est toujours là', () => {
  for (let v = 1; v <= 50; v++) { const s = shopRun(); s.shopVisits = v; opened(s, 'last'); FP.assert(s.shop.lastChance && s.shop.items.some(i => i.id === 'seed'), 'visite ' + v); }
});
FP.test('shop: impossible de dépasser le score', () => {
  const s = shopRun(); s.score.eco = 1000; opened(s); priced(s, [700, 600, 100]);
  FP.shop.toggle(s, 0);
  FP.assert(!FP.shop.canCheck(s, 1)); FP.shop.toggle(s, 1);
  FP.assert(!s.shop.items[1].checked); FP.assertEqual(FP.shop.total(s), 700);
  FP.assert(FP.shop.canCheck(s, 2));
});
FP.test('shop: un article au prix exact du score est cochable', () => {
  const s = shopRun(); s.score.eco = 700; opened(s); priced(s, [700, 600, 100]);
  FP.shop.toggle(s, 0); FP.assert(s.shop.items[0].checked);
});
FP.test('shop: CO₂ nul sans article, somme des masses sinon', () => {
  const s = shopRun(); opened(s);
  FP.assertEqual(FP.shop.co2(s), 0);
  FP.shop.toggle(s, 0); FP.shop.toggle(s, 2);
  const mass = (id) => FP.config.shop.items.find(i => i.id === id).co2;
  FP.assertEqual(FP.shop.co2(s), Math.round((mass(s.shop.items[0].id) + mass(s.shop.items[2].id)) * 10) / 10);
});
FP.test('shop: pas de coche pendant l’apparition', () => {
  const s = shopRun(); FP.shop.open(s, { after: 'death' });
  FP.assertEqual(s.shop.phase, 'in'); FP.shop.toggle(s, 0); FP.assert(!s.shop.items[0].checked);
});
// Commande : on force le contenu du bon, puis la pousse suivante est lancée.
const buy = (s, ids, price = 100) => {
  FP.shop.open(s, { after: 'death' }); s.shop.phase = 'idle';
  s.shop.items = ids.map(id => ({ id, price, base: price, promo: false, checked: true }));
  FP.shop.order(s);
};
const nextStem = (s, ids) => { FP.plant.prepare(s); buy(s, ids); FP.plant.launch(s); s.events.length = 0; return s; };
FP.test('shop: la graine ajoute une graine', () => { const s = shopRun(), r = s.plant.reserves; nextStem(s, ['seed']); FP.assertEqual(s.plant.reserves, r + 1); });
FP.test('shop: la membrane donne le bouclier', () => FP.assert(nextStem(shopRun(), ['membrane']).power.shield));
FP.test('shop: l’aimant double le rayon de ramassage', () => {
  const s = nextStem(shopRun(), ['magnet']); s.world.coins = []; s.world.chains = [];
  s.world.chains.push({ kind: 'easy', anchor: 'path', total: 4, got: 0, missed: false, done: false });
  s.world.coins.push({ x: s.plant.tip.x + 20, y: s.plant.tip.y, chain: 0, rank: 0, taken: false });
  FP.coinPlay.update(s); FP.assert(s.world.coins[0].taken);
});
FP.test('shop: premium double la valeur d’une pièce', () => {
  const s = nextStem(shopRun(), ['premium']), e0 = s.score.eco; s.world.coins = []; s.world.chains = [];
  s.world.chains.push({ kind: 'easy', anchor: 'path', total: 4, got: 0, missed: false, done: false });
  s.world.coins.push({ x: s.plant.tip.x, y: s.plant.tip.y, chain: 0, rank: 0, taken: false });
  FP.coinPlay.update(s); FP.assertEqual(s.score.eco - e0, 2 * FP.config.coins.value);
});
FP.test('shop: le compost ralentit la pousse', () => {
  const s = nextStem(shopRun(), ['compost']), slow = FP.plant.speed(s); s.boosts.compost = false;
  FP.assert(Math.abs(slow / FP.plant.speed(s) - .8) < 1e-9);
});
FP.test('shop: la bière ralentit les limaces', () => {
  const s = nextStem(shopRun(), ['beer']);
  s.world.leaks = [{ x: 200, y: 600, len: 80, angle: 1.5, phase: 0, rate: 1, r: 8, hitFlash: 0, s: 0, cx: 200, cy: 600, cr: 8 }];
  FP.hazards.update(s, .1); const slow = s.world.leaks[0].s;
  s.boosts.beer = false; s.world.leaks[0].s = 0; FP.hazards.update(s, .1);
  FP.assert(Math.abs(slow / s.world.leaks[0].s - .3) < 1e-9, slow + ' / ' + s.world.leaks[0].s);
});
FP.test('shop: le filtre empêche la brûlure des nappes', () => {
  const burn = (ids) => { const s = nextStem(shopRun(), ids); s.plant.toxicTimer = FP.config.toxic.burnAt + .1;
    s.query = { ...s.query, solid: null, leak: 0, toxic: 1 }; FP.flow.update(s, .016); return s.mode; };
  FP.assertEqual(burn(['filter']), 'playing'); FP.assert(burn(['membrane']) !== 'playing');
});
FP.test('shop: la spore déblaie la graine au lancement', () => {
  const s = shopRun(); FP.plant.prepare(s); buy(s, ['spore']); s.events.length = 0; FP.plant.launch(s);
  FP.assert(s.events.some(e => e.type === 'bomb'));
});
FP.test('shop: lobbying regénère le niveau avec moins d’obstacles', () => {
  for (let seed = 1; seed <= 6; seed++) {
    const a = shopRun(seed), b = shopRun(seed); a.level = b.level = 6;
    FP.level.generate(b); buy(a, ['lobbying']);
    FP.assert(a.world.solids.length < b.world.solids.length, 'graine ' + seed + ' : ' + a.world.solids.length + ' / ' + b.world.solids.length);
  }
});
FP.test('shop: lobbying et membrane ensemble gardent le bouclier', () => FP.assert(nextStem(shopRun(), ['lobbying', 'membrane']).power.shield));
FP.test('shop: la commande débite le score, jamais sous zéro', () => {
  const s = shopRun(); s.score.eco = 1000; buy(s, ['magnet', 'beer'], 400); FP.assertEqual(s.score.eco, 200);
  const t = shopRun(); t.score.eco = 300; buy(t, ['magnet'], 500); FP.assertEqual(t.score.eco, 0);
});
FP.test('shop: les effets ne survivent pas à la pousse d’après, la graine si', () => {
  const s = nextStem(shopRun(), ['membrane', 'magnet', 'seed']), r = s.plant.reserves;
  s.plant.tip = { x: 220, y: s.world.surfaceY - 1 }; FP.collision.update(s); FP.flow.update(s, 0);   // éclosion : fin de la pousse
  FP.plant.prepare(s); FP.plant.launch(s);
  FP.assert(!s.power.shield && !s.boosts.magnet); FP.assertEqual(s.plant.reserves, r);
});
FP.test('shop: refuser n’achète rien', () => {
  const s = shopRun(), e = s.score.eco; FP.shop.open(s, { after: 'death' }); s.shop.phase = 'idle'; FP.shop.toggle(s, 0); FP.shop.decline(s);
  FP.assertEqual(s.score.eco, e); FP.assertEqual(s.shop.phase, 'declined');
});
