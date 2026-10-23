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
