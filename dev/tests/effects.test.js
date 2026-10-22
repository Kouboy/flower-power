// Gains « +Ɇ » : ils naissent et restent au-dessus de la tête, à gauche puis à droite (logique pure).
FP.test('effects: les « +Ɇ » restent au-dessus de la pointe, du côté choisi, en la suivant', () => {
  for (const side of [-1, 1]) for (const k of [0, .3, .7, 1]) {
    const tip = { x: 200, y: 900 }, p = FP.effects.labelPos({ side, x: 0, y: 0 }, tip, k);
    FP.assert(p.y < tip.y - 30, 'au-dessus : ' + p.y);
    FP.assert(side < 0 ? p.x < tip.x - 10 : p.x > tip.x + 10, 'sur le côté : ' + p.x);
    FP.assertEqual(p.align, side < 0 ? 'right' : 'left');   // ancré par le bord côté tête : deux gains ne se chevauchent pas
    const moved = FP.effects.labelPos({ side, x: 0, y: 0 }, { x: 200, y: 700 }, k);
    FP.assertEqual(Math.round(p.y - moved.y), 200);   // il suit la pointe
  }
});
FP.test('effects: sans pointe, le « +Ɇ » reste là où il est né', () => {
  const p = FP.effects.labelPos({ side: 1, x: 120, y: 340 }, null, 0);
  FP.assertEqual(p.x, 120); FP.assertEqual(p.y, 340);
});
