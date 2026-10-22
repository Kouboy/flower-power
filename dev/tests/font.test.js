// Police bitmap de l'interface : glyphes, mesures, retour à la ligne (logique pure).
FP.test('font: les textes de mort et de l’interface n’ont que des glyphes connus', () => {
  const t = FP.config.text, all = [...Object.values(t.death), t.deathDefault, t.deathLeak, t.deathToxic,
    t.ready, ...Object.values(t.shout), ...Object.values(t.help), t.again, ...t.footer, ...Object.values(t.certificate),
    '0123456789Ɇ×+-%', (1234567).toLocaleString('fr-FR')];
  for (const s of all) for (const ch of s.toLocaleUpperCase('fr-FR')) FP.assert(FP.font.has(ch), 'glyphe manquant : ' + JSON.stringify(ch) + ' dans ' + s);
});
FP.test('font: largeur = chasses + 1 px entre glyphes, ×2 double', () => {
  FP.assertEqual(FP.font.measure('A'), 5);
  FP.assertEqual(FP.font.measure('AA'), 11);
  FP.assertEqual(FP.font.measure('AA', { scale: 2 }), 22);
  FP.assert(FP.font.measure('I') < 5, 'I plus étroit');
  FP.assertEqual(FP.font.measure('a'), FP.font.measure('A'), 'minuscules affichées en capitales');
});
FP.test('font: espaces insécables (U+00A0, U+202F) étroites, glyphe inconnu → ?', () => {
  FP.assert(FP.font.has(' ') && FP.font.has(' '));
  FP.assert(FP.font.measure('1 2') < FP.font.measure('1 2') + 1);
  FP.assertEqual(FP.font.measure('§'), FP.font.measure('?'));
});
FP.test('font: retour à la ligne glouton sur les espaces', () => {
  const lines = FP.font.wrap('RUPTURE : TROTTINETTE FOSSILE', 80);
  FP.assert(lines.length >= 2);
  for (const l of lines) FP.assert(FP.font.measure(l) <= 80 || !l.includes(' '), l);
  FP.assertEqual(lines.join(' '), 'RUPTURE : TROTTINETTE FOSSILE');
});
