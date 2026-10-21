// Outils de réglage : absents sans paramètre d'URL (le banc n'en passe aucun).
FP.test('debug: profileur absent par défaut', () => FP.assertEqual(FP.perf, null));
FP.test('debug: flydebug absent par défaut', () => FP.assertEqual(FP.flydebug, null));
