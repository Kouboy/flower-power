// HUD pixel : ce qui est affiché (logique pure) et place disponible sur l'écran le plus étroit.
const hudRun = () => { const s = FP.state.createRun(2, { W: 440, H: 783 }); FP.level.startRun(s); FP.plant.launch(s); return s; };
FP.test('hud: pollen et combo n’apparaissent que lorsqu’ils sont actifs', () => {
  const s = hudRun();
  let it = FP.hud.items(s);
  FP.assertEqual(it.pollen, null); FP.assertEqual(it.combo, null);
  s.score.flowerBonus = 2; s.score.combo = 1;
  it = FP.hud.items(s); FP.assertEqual(it.pollen, 2); FP.assertEqual(it.combo, null);
  s.score.combo = 3; FP.assertEqual(FP.hud.items(s).combo, 3);
});
FP.test('hud: graines = réserves, sur le total de départ', () => {
  const s = hudRun(); s.plant.reserves = 2;
  const it = FP.hud.items(s);
  FP.assertEqual(it.seeds, 2); FP.assertEqual(it.seedsMax, 3);
});
// Graines ×2 (v4.4.2) : lisibles sur téléphone ; le score ne les chevauche pas.
const seedsW = () => (FP.config.plant.seeds - 1) * FP.hud.SEED_STEP + 6 * FP.hud.SEED_SCALE;
const fitsBeside = (cssW, score) => FP.hud.MARGIN + seedsW() + 4 + FP.font.measure('Ɇ' + score.toLocaleString('fr-FR'), { scale: 2 }) + 2 + FP.hud.MARGIN <= cssW / FP.px.SCALE;
FP.test('hud: graines deux fois plus grandes, posées sur la marge du bas', () => {
  FP.assertEqual(FP.hud.SEED_SCALE, 2);
  FP.assertEqual(FP.hud.layout(400).seedY + 7 * FP.hud.SEED_SCALE, 400 - FP.hud.MARGIN);
});
FP.test('hud: le score ne chevauche pas les graines (7 chiffres au téléphone, 6 sur l’écran le plus étroit)', () => {
  FP.assert(fitsBeside(360, 9999999), 'téléphone 360 px');
  FP.assert(fitsBeside(FP.config.view.minW, 999999), 'écran minimal');
});
FP.test('hud: plus de nombre de fleurs ni d’élan', () => {
  const it = FP.hud.items(hudRun());
  FP.assert(!('flowers' in it) && !('elan' in it));
});
// Milieux (v4.9.0) : nom du milieu en haut, multiplicateur de saison près du score.
FP.test('hud: le nom du milieu et le multiplicateur de saison', () => {
  const s = FP.state.createRun(1, { W: 440, H: 783 }); s.run.milieu = 2;
  FP.assertEqual(FP.hud.items(s).milieu, 'DÉCHARGE'); FP.assertEqual(FP.hud.items(s).mult, 1);
  s.run.saison = 2; FP.assertEqual(FP.hud.items(s).mult, 2);
});
