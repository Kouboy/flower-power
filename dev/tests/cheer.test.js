// Cri du chapelet complet (ui/cheer.js) : le mot seul (le montant s'affiche déjà avec le gain) ; toujours dans l'écran.
FP.test('cheer: le cri est le mot tiré', () => FP.assertEqual(FP.cheer.textFor({ word: 'KARMA !', amount: 400 }), 'KARMA !'));
FP.test('cheer: le cri reste dans l’écran, avec sa marge, même pointe au bord', () => {
  for (const word of FP.config.text.chain) {
    const w = FP.cheer.width(word, 2);
    for (const tipX of [0, 3, 75, 147, 150]) {
      const p = FP.cheer.layout(word, tipX, 60, 150);
      FP.assert(p.x >= FP.hud.MARGIN && p.x + w <= 150 - FP.hud.MARGIN, word + ' ' + tipX + ' → ' + p.x + ' + ' + w);
      FP.assert(p.y < 60, 'au-dessus de la pointe');
    }
  }
});
