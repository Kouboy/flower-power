// Ramassage des pièces (play/coins.js) et gains (FP.scoring.awardCoin) : pièces posées à la main.
const cpRun = () => {
  const s = FP.state.createRun(2, { W: 440, H: 783 }); FP.level.startRun(s); FP.plant.launch(s); s.events.length = 0;
  s.plant.tip = { x: 200, y: 600 };
  return s;
};
// Un chapelet vertical de n pièces au-dessus de (x, y0), rang 0 en bas.
const lay = (s, kind, n, x = 200, y0 = 600) => {
  const w = s.world, chain = w.chains.length;
  w.chains.push({ kind, anchor: 'path', total: n, got: 0, missed: false, done: false });
  for (let i = 0; i < n; i++) w.coins.push({ x, y: y0 - i * 30, chain, rank: i, taken: false });
  return chain;
};
const clearCoins = (s) => { s.world.coins = []; s.world.chains = []; };
const evts = (s, type) => s.events.filter(e => e.type === type);
FP.test('coinPlay: prise à 20 px, pas à 21 (plus large que les collisions)', () => {
  const s = cpRun(); clearCoins(s); lay(s, 'easy', 4, 220, 600);
  FP.coinPlay.update(s); FP.assertEqual(evts(s, 'coin').length, 1);
  const t = cpRun(); clearCoins(t); lay(t, 'easy', 4, 221, 600);
  FP.coinPlay.update(t); FP.assertEqual(evts(t, 'coin').length, 0);
});
FP.test('coinPlay: une pièce sans combo vaut 25 et ne lance pas de combo', () => {
  const s = cpRun(); clearCoins(s); lay(s, 'easy', 4);
  FP.coinPlay.update(s);
  FP.assertEqual(s.score.eco, 25); FP.assertEqual(s.score.combo, 0); FP.assertEqual(s.score.comboTimer, 0);
});
FP.test('scoring: awardCoin entretient le combo sans le monter', () => {
  const s = cpRun(); s.score.combo = 3; s.score.comboTimer = .5;
  FP.scoring.awardCoin(s, 0, 0, 100);
  FP.assertEqual(s.score.eco, 150); FP.assertEqual(s.score.comboTimer, FP.config.scoring.comboWindow); FP.assertEqual(s.score.combo, 3);
  const e = evts(s, 'eco')[0]; FP.assert(e.quiet && e.kind === 'coin');
});
FP.test('coinPlay: chapelet appât complet → +400, combo +1, cri de la liste', () => {
  const s = cpRun(); clearCoins(s); lay(s, 'bait', 4);
  for (let i = 0; i < 4; i++) { s.plant.tip = { x: 200, y: 600 - i * 30 }; FP.coinPlay.update(s); }
  const done = evts(s, 'chainDone');
  FP.assertEqual(done.length, 1); FP.assertEqual(done[0].amount, 400); FP.assert(FP.config.text.chain.includes(done[0].word));
  FP.assertEqual(s.score.combo, 1); FP.assertEqual(s.score.eco, 4 * 25 + 400);
  FP.assert(s.world.chains[0].done);
});
FP.test('coinPlay: deux pièces dans la même image → rangs 0 et 1, un seul chainDone', () => {
  const s = cpRun(); clearCoins(s); lay(s, 'easy', 4, 200, 600);
  s.world.coins[1].y = 596;   // deux pièces sous la pointe
  FP.coinPlay.update(s);
  FP.assertEqual(evts(s, 'coin').map(e => e.rank).join(), '0,1');
  s.plant.tip = { x: 200, y: 540 }; FP.coinPlay.update(s); s.plant.tip = { x: 200, y: 510 }; FP.coinPlay.update(s);
  FP.assertEqual(evts(s, 'chainDone').length, 1);
});
FP.test('coinPlay: une pièce laissée 41 px sous la pointe rate le chapelet', () => {
  const s = cpRun(); clearCoins(s); lay(s, 'bait', 5, 200, 600);
  s.plant.tip = { x: 200, y: 600 - 41 - 0 }; FP.coinPlay.update(s);   // rang 0 laissé à 41 px dessous, rang 1 à 23 px : pas pris
  FP.assert(s.world.chains[0].missed);
  for (let i = 1; i < 5; i++) { s.plant.tip = { x: 200, y: 600 - i * 30 }; FP.coinPlay.update(s); }
  FP.assertEqual(evts(s, 'chainDone').length, 0); FP.assertEqual(evts(s, 'coin').length, 4);
});
FP.test('coinPlay: rien hors du mode playing', () => {
  const s = cpRun(); clearCoins(s); lay(s, 'easy', 4); s.mode = 'dying';
  FP.coinPlay.update(s); FP.assertEqual(evts(s, 'coin').length, 0);
});
FP.test('coinPlay: nouvelle pousse → nouvelles pièces, aucun chainDone hérité', () => {
  const s = cpRun(); clearCoins(s); lay(s, 'easy', 4); FP.coinPlay.update(s);
  FP.plant.prepare(s); s.level += 1; FP.level.generate(s); FP.plant.launch(s); s.events.length = 0;
  FP.assert(s.world.chains.every(c => c.got === 0 && !c.done && !c.missed));
});
FP.test('effects: un gain discret (pièce) ne crée pas de nombre flottant', () => {
  const s = cpRun(); s.events.push({ type: 'eco', x: 1, y: 1, amount: 25, combo: 1, kind: 'coin', quiet: true });
  FP.effects.draw(fakeCtx(), s);
  FP.assertEqual(s.fx.effects.filter(e => e.type === 'eco').length, 0);
});
FP.test('particles: un gain discret (pièce) ne lance pas de gerbe', () => {
  const s = cpRun(); s.events.push({ type: 'eco', x: 1, y: 1, amount: 25, combo: 4, kind: 'coin', quiet: true });
  FP.particles.draw(fakeCtx(), s);
  FP.assertEqual(s.fx.particles.length, 0);
});
FP.test('cheer: le cri suit la pointe', () => {
  const s = cpRun(); s.camera.y = 100; s.plant.tip = { x: 200, y: 600 };
  const a = FP.cheer.anchor(s); s.plant.tip = { x: 240, y: 500 }; const b = FP.cheer.anchor(s);
  FP.assertEqual(a.x, 100); FP.assertEqual(a.y, 250); FP.assertEqual(b.x, 120); FP.assertEqual(b.y, 200);
});
FP.test('effects: le halo d’éclosion s’ouvre au cœur de la fleur, pas sur la pointe', () => {
  const s = cpRun(); s.plant.tip = { x: 220, y: s.world.surfaceY - 1 }; FP.collision.update(s); FP.flow.update(s, 0);
  for (let i = 0; i < 40 && !s.events.some(e => e.type === 'blossom'); i++) { s.events.length = 0; FP.flow.update(s, 1 / 60); }
  const e = s.events.find(e => e.type === 'blossom'); FP.assert(e, 'blossom');
  FP.effects.draw(fakeCtx(), s);
  const fx = s.fx.effects.find(f => f.type === 'bloom'), head = FP.flowersRender.headOf(s.garden.flowers[e.flower], s);
  FP.assertEqual(Math.round(fx.x), Math.round(head.x)); FP.assertEqual(Math.round(fx.y), Math.round(head.y));
  FP.assert(head.y < e.y - 20, 'au-dessus du sol : ' + head.y + ' / ' + e.y);
});
