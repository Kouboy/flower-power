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
// Déroulé : la boutique s'intercale entre deux pousses.
const crash = (s) => { s.query = { ...s.query, solid: { kind: 'cone' }, leak: 0, toxic: 0 }; FP.flow.update(s, 0); s.query = { ...s.query, solid: null }; };
const until = (s, mode, max = 900) => { for (let i = 0; i < max && s.mode !== mode; i++) { s.time += 1 / 60; FP.shop.update(s, 1 / 60); FP.flow.update(s, 1 / 60); } return s.mode; };
const settle = (s) => { for (let i = 0; i < 60 && s.shop; i++) { s.time += 1 / 60; FP.shop.update(s, 1 / 60); } };
FP.test('flow: la 3e pousse finie ouvre le bon ; les autres enchaînent directement', () => {
  const s = shopRun(); s.plant.reserves = 3; crash(s);   // 1re pousse
  FP.assertEqual(until(s, 'playing'), 'playing'); FP.assert(!s.shop);
  crash(s); FP.assertEqual(until(s, 'playing'), 'playing');   // 2e
  s.plant.reserves = 3; s.plant.tip = { x: 220, y: s.world.surfaceY - 1 }; FP.collision.update(s); FP.flow.update(s, 0);   // 3e : éclosion
  FP.assertEqual(until(s, 'shop'), 'shop');
});
FP.test('flow: mort → bon de commande → nouvelle pousse', () => {
  const s = shopRun(); s.plant.reserves = 3; s.plant.stemCount = 3; crash(s);
  FP.assertEqual(until(s, 'shop'), 'shop'); FP.assertEqual(s.shop.after, 'death');
  settle(s); FP.assert(s.shop === null || s.shop.phase === 'idle');
  FP.shop.decline(s); settle(s); FP.assertEqual(s.mode, 'playing');
});
FP.test('flow: éclosion → bon de commande → prête', () => {
  const s = shopRun(); s.plant.stemCount = 3; s.plant.tip = { x: 220, y: s.world.surfaceY - 1 }; FP.collision.update(s); FP.flow.update(s, 0);
  FP.assertEqual(until(s, 'shop'), 'shop'); FP.assertEqual(s.shop.after, 'bloom');
  settle(s); FP.shop.decline(s); settle(s); FP.assertEqual(s.mode, 'ready');
});
FP.test('flow: la dernière mort ouvre toujours le bon de dernière chance', () => {
  const s = shopRun(); s.plant.reserves = 1; s.plant.stemCount = 1; crash(s);
  FP.assertEqual(until(s, 'shop'), 'shop'); FP.assert(s.shop.lastChance);
});
FP.test('flow: dernière mort refusée → certificat avec la cause d’origine', () => {
  const s = shopRun(); s.plant.reserves = 1; crash(s);
  FP.assertEqual(until(s, 'shop'), 'shop'); FP.assert(s.shop.lastChance);
  settle(s); FP.shop.decline(s); settle(s);
  FP.assertEqual(s.mode, 'over'); FP.assertEqual(s.flow.overReason, FP.config.text.death.cone || FP.config.text.deathDefault);
});
FP.test('flow: dernière mort + graine achetée → la partie continue', () => {
  const s = shopRun(); s.plant.reserves = 1; s.score.eco = 9000; crash(s); until(s, 'shop'); settle(s);
  const i = s.shop.items.findIndex(it => it.id === 'seed'); FP.shop.toggle(s, i); FP.shop.order(s); settle(s);
  FP.assertEqual(s.mode, 'playing'); FP.assertEqual(s.plant.reserves, 1);
});
FP.test('shop: un toucher par réflexe à l’ouverture ne commande rien', () => {
  const s = shopRun(), e = s.score.eco; FP.shop.open(s, { after: 'death' }); s.shop.items[0].checked = true;
  FP.shop.order(s); FP.shop.decline(s);
  FP.assertEqual(s.shop.phase, 'in'); FP.assertEqual(s.score.eco, e);
});
// Relecture finale : dernière chance, caméra et musique pendant le bon.
FP.test('shop: lobbying acheté en dernière chance est bien livré', () => {
  const s = shopRun(5); s.level = 6; s.plant.reserves = 1; s.score.eco = 9000; crash(s); until(s, 'shop'); settle(s);
  s.shop.items = [{ id: 'seed', price: 2500, base: 2500, promo: false, checked: false }, { id: 'lobbying', price: 900, base: 900, promo: false, checked: false },
    { id: 'beer', price: 600, base: 600, promo: false, checked: false }];
  FP.shop.toggle(s, 0); FP.shop.toggle(s, 1); FP.shop.order(s);
  const solids = s.world.solids.length; settle(s);
  FP.assertEqual(s.mode, 'playing'); FP.assertEqual(s.world.solids.length, solids);
});
FP.test('shop: en dernière chance, seule la graine se coche d’abord', () => {
  const s = shopRun(); s.score.eco = 9000; opened(s, 'last');
  const seed = s.shop.items.findIndex(i => i.id === 'seed'), other = [0, 1, 2].find(i => i !== seed);
  FP.assert(!FP.shop.canCheck(s, other)); FP.shop.toggle(s, other); FP.assert(!s.shop.items[other].checked);
  FP.shop.toggle(s, seed); FP.assert(FP.shop.canCheck(s, other)); FP.shop.toggle(s, other); FP.assert(s.shop.items[other].checked);
  FP.shop.toggle(s, seed); FP.assert(!s.shop.items[other].checked, 'décocher la graine décoche le reste');
});
FP.test('camera: pas de saut de zoom à l’ouverture du bon', () => {
  const s = shopRun(); s.mode = 'ready'; const z = FP.camera.totalZoom(s); s.mode = 'shop'; FP.assertEqual(FP.camera.totalZoom(s), z);
});
FP.test('music: pendant le bon, la musique reste en veille comme avant de pousser', () => {
  const s = shopRun(); s.mode = 'ready'; const a = JSON.stringify(FP.music.layersFor(s)); s.mode = 'shop';
  FP.assertEqual(JSON.stringify(FP.music.layersFor(s)), a);
});
FP.test('shop: le bon qui s’en va fait un bruit de papier (refus et commande)', () => {
  const s = shopRun(); opened(s); s.events.length = 0; FP.shop.decline(s);
  FP.assert(s.events.some(e => e.type === 'shopClose'), 'refus');
  const t = shopRun(); opened(t); FP.shop.toggle(t, 0); FP.shop.order(t); t.events.length = 0;
  t.time += FP.config.shop.stampTime * .5; FP.shop.update(t, 0); FP.assert(!t.events.some(e => e.type === 'shopClose'), 'pas avant le tiroir-caisse');
  t.time += FP.config.shop.stampTime; FP.shop.update(t, 0); FP.assertEqual(t.events.filter(e => e.type === 'shopClose').length, 1);
  t.time += .01; FP.shop.update(t, 0); FP.assertEqual(t.events.filter(e => e.type === 'shopClose').length, 1);
});
