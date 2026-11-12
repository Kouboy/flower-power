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
const fitsBeside = (cssW, score) => FP.hud.MARGIN + seedsW() + 2 + FP.font.measure('Ɇ' + score.toLocaleString('fr-FR'), { scale: 2 }) + 2 + FP.hud.MARGIN <= cssW / FP.px.SCALE;
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

// v5.11.0 (zones sûres) : au moins 16 px CSS (8 px d'interface) de chaque bord, et la marge système du téléphone (encoche, barre
// d'accueil, FP.view.safe) plus 8 px CSS quand elle est plus grande.
const withSafe = (safe, fn) => { const v = FP.view; FP.view = { ...(v || {}), ui: (v && v.ui) || { w: 180, h: 400 }, safe }; try { fn(); } finally { FP.view = v; } };
FP.test('hud: marges sûres, encoche et barre d’accueil comprises', () => {
  FP.assertEqual(FP.hud.MARGIN, 8);
  withSafe(undefined, () => { const s = FP.hud.safe(); FP.assertEqual(JSON.stringify(s), JSON.stringify({ top: 8, right: 8, bottom: 8, left: 8 })); });
  withSafe({ top: 24, right: 0, bottom: 17, left: 6 }, () => {
    const s = FP.hud.safe(); FP.assertEqual(JSON.stringify(s), JSON.stringify({ top: 28, right: 8, bottom: 21, left: 10 }));
    const L = FP.hud.layout(400); FP.assertEqual(L.seedY + 7 * FP.hud.SEED_SCALE, 400 - 21, 'graines au-dessus de la barre d’accueil');
    FP.assertEqual(FP.hud.seedCenter(0, 400).x, 10 + 3 * FP.hud.SEED_SCALE, 'graines décalées du bord');
    FP.assertEqual(FP.cheer.layout('KARMA', 0, 200, 180).x, 10, 'cri ramené dans la marge');
  });
});
