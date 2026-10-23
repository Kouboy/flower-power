// Cri du chapelet complet (ui/cheer.js) : le mot en grand, le montant dessous ; toujours dans l'écran.
FP.test('cheer: lignes du cri', () => FP.assertEqual(FP.cheer.lines({ word: 'KARMA !', amount: 400 }).join('|'), 'KARMA !|+400'));
FP.test('cheer: le cri reste dans l’écran même pointe au bord', () => {
  for (const word of FP.config.text.chain) {
    const w = FP.cheer.width(word, 2);
    for (const tipX of [0, 3, 75, 147, 150]) {
      const p = FP.cheer.layout(word, tipX, 60, 150);
      FP.assert(p.x >= 0 && p.x + w <= 150, word + ' ' + tipX + ' → ' + p.x + ' + ' + w);
      FP.assert(p.y < 60, 'au-dessus de la pointe');
    }
  }
});
