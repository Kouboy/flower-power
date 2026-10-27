// Certificat de fin : contenu (record battu ou non), place sur l'écran le plus étroit, garde de relance.
const overRun = () => { const s = FP.state.createRun(6, { W: 440, H: 783 }); s.mode = 'over';
  s.score.flowers = 7; s.score.eco = 12450; s.plant.stemCount = 3; s.flow.overReason = 'rupture : rack serveur'; return s; };
FP.test('certificat: valeurs et record battu', () => {
  const s = overRun(); s.score.recordBefore = { flowers: 5, eco: 20000 };
  const c = FP.certificate.lines(s), t = FP.config.text.certificate;
  FP.assertEqual(c.rows[0].label, t.flowers); FP.assertEqual(c.rows[0].value, '7');
  FP.assertEqual(c.rows[1].value, 'Ɇ' + (12450).toLocaleString('fr-FR'));
  FP.assertEqual(c.rows[2].label, t.stems); FP.assertEqual(c.rows[2].value, '3');
  FP.assertEqual(c.rows[4].value, t.beaten); FP.assert(c.rows[4].beaten);
  FP.assertEqual(c.cause, 'RUPTURE : RACK SERVEUR');
});
FP.test('certificat: record non battu → record à battre sur deux lignes', () => {
  const s = overRun(); s.score.recordBefore = { flowers: 9, eco: 99000 };
  const r = FP.certificate.lines(s).rows;
  FP.assert(!r[4].beaten);   // v4.9.0 : la ligne des sites passe avant le record
  FP.assertEqual(r[4].value, '9 FLEURS'); FP.assertEqual(r[5].label, ''); FP.assertEqual(r[5].value, 'Ɇ' + (99000).toLocaleString('fr-FR'));
});
FP.test('certificat: sans record d’avant-partie, tout score > 0 bat le record', () => {
  FP.assert(FP.certificate.lines(overRun()).rows[4].beaten);
});
FP.test('certificat: chaque ligne tient sur la feuille de l’écran le plus étroit', () => {
  const s = overRun(); s.score.eco = 999999; s.plant.stemCount = 99; s.score.recordBefore = { flowers: 99, eco: 999999 };
  const paper = FP.config.view.minW / FP.px.SCALE - 2 * FP.certificate.MARGIN - 2 * FP.certificate.PADDING;
  for (const r of FP.certificate.lines(s).rows) FP.assert(FP.font.measure(r.label) + 6 + FP.font.measure(r.value) <= paper, r.label + ' ' + r.value);
});
FP.test('certificat: relance refusée avant le tampon, acceptée après', () => {
  const s = overRun(); s.fx.ui = {};
  FP.assert(!FP.certificate.canRestart(s));
  s.fx.ui.overAt = s.time - .5; FP.assert(!FP.certificate.canRestart(s));
  s.fx.ui.overAt = s.time - FP.certificate.READY_AT; FP.assert(FP.certificate.canRestart(s));
});
FP.test('certificat: la relance attend toujours le tampon, même s’il tombe tard', () => {
  const s = overRun(); s.fx.ui = { overAt: s.time - (FP.certificate.READY_AT + .1), readyAfter: FP.certificate.READY_AT + .5 };
  FP.assert(!FP.certificate.canRestart(s), 'le tampon n’est pas encore tombé');
  s.fx.ui.overAt = s.time - (FP.certificate.READY_AT + .5); FP.assert(FP.certificate.canRestart(s));
});
FP.test('certificat: le libellé du record à battre vient de la config', () => {
  const s = overRun(), t = FP.config.text.certificate, keep = t.flowersUnit;
  s.score.recordBefore = { flowers: 9, eco: 99000 };
  try { t.flowersUnit = 'FLEURETTES'; FP.assertEqual(FP.certificate.lines(s).rows[4].value, '9 FLEURETTES'); } finally { t.flowersUnit = keep; }
});
FP.test('certificate: on compte les fleurs écloses', () => FP.assertEqual(FP.config.text.certificate.flowers, 'FLEURS ÉCLOSES'));
// Milieux (v4.9.0) : les sites réhabilités (boss vaincus).
FP.test('certificate: les sites réhabilités', () => {
  const s = overRun(), t = FP.config.text.certificate; s.run.bosses = 2;
  const row = FP.certificate.lines(s).rows.find(r => r.label === t.sites);
  FP.assertEqual(row && row.value, '2/4');
  s.run.saison = 2; s.run.bosses = 5; FP.assertEqual(FP.certificate.lines(s).rows.find(r => r.label === t.sites).value, '5');
});
