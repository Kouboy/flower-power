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
FP.test('hud: un score énorme ×2 ne chevauche pas les graines sur l’écran le plus étroit', () => {
  const artW = FP.config.view.minW / FP.px.SCALE, seedsW = FP.config.plant.seeds * 8;
  const scoreW = FP.font.measure('Ɇ' + (9999999).toLocaleString('fr-FR'), { scale: 2 }) + 2;
  FP.assert(FP.hud.MARGIN + seedsW + 4 + scoreW + FP.hud.MARGIN <= artW, String(scoreW));
});
FP.test('hud: plus de nombre de fleurs ni d’élan', () => {
  const it = FP.hud.items(hudRun());
  FP.assert(!('flowers' in it) && !('elan' in it));
});
