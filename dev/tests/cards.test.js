// Cartons de milieu, de boss, de victoire et écran de fin (ui/cards.js, v4.9.0).
const cardRun = (kind, milieu = 0, saison = 1) => { const s = FP.state.createRun(2, { W: 440, H: 783 }); s.mode = 'ready'; Object.assign(s.run, { milieu, saison, card: kind ? { kind, t0: 0 } : null }); return s; };
FP.test('font: guillemets français et tiret long', () => {
  for (const ch of ['«', '»', '—']) { FP.assert(FP.font.has(ch), ch); FP.assert(FP.font.measure(ch) > 0, ch); }
});
FP.test('font: les noms, lignes et boss des milieux n’ont que des glyphes connus', () => {
  for (const m of FP.config.milieux) for (const s of [m.name, m.line, m.boss.name, m.boss.order]) for (const ch of s.toLocaleUpperCase('fr-FR')) FP.assert(FP.font.has(ch), JSON.stringify(ch) + ' dans ' + s);
});
FP.test('cards: chaque carton a son texte', () => {
  const t = (s) => JSON.stringify(FP.cards.textFor(s));
  FP.assertEqual(t(cardRun('milieu', 1)), JSON.stringify({ title: 'MILIEU 2/4', lines: ['ZONE INDUSTRIELLE', 'Taux d\'emploi local : 0,3 robot par habitant.'] }));
  FP.assertEqual(t(cardRun('milieu', 0, 2)), JSON.stringify({ title: 'SAISON 2 — MILIEU 1/4', lines: ['FRICHE URBAINE', 'Futur éco-quartier. Livraison prévue : jamais.'] }));
  FP.assertEqual(t(cardRun('boss', 3)), JSON.stringify({ title: 'BOSS', lines: ['LE RÉACTEUR « NEUTRE EN CARBONE »', 'PERCE SES 4 BARRES DE CONTRÔLE', '(combat en préparation)'] }));
  FP.assertEqual(t(cardRun('victory', 2)), JSON.stringify({ title: 'BOSS VAINCU', lines: ['L\'INCINÉRATEUR À ÉNERGIE VERTE'] }));
  const won = cardRun(null, 0, 2); won.mode = 'won';
  FP.assertEqual(t(won), JSON.stringify({ title: 'SITE RÉHABILITÉ', lines: ['Le site est officiellement déclaré réhabilité.', 'Les actionnaires vous remercient.', 'Toucher pour la saison 2'] }));
});
FP.test('cards: aucun carton hors moment', () => {
  const s = cardRun(null); s.mode = 'playing'; FP.assertEqual(FP.cards.textFor(s), null);
});
FP.test('cards: tous les textes tiennent sur l’écran le plus étroit et n’utilisent que des glyphes connus', () => {
  const W = FP.config.view.minW / FP.px.SCALE - 16, states = [];
  for (let m = 0; m < 4; m++) for (const saison of [1, 12]) for (const kind of ['milieu', 'boss', 'victory']) states.push(cardRun(kind, m, saison));
  const won = cardRun(null, 0, 12); won.mode = 'won'; states.push(won);
  for (const s of states) {
    const c = FP.cards.textFor(s);
    FP.assert(FP.font.wrap(c.title, W, { scale: 2 }).length <= 3, c.title);
    for (const l of c.lines) FP.assert(FP.font.wrap(l, W).length <= 3, l);
    for (const ch of (c.title + c.lines.join('')).toLocaleUpperCase('fr-FR')) FP.assert(FP.font.has(ch), JSON.stringify(ch));
  }
});
FP.test('music: l’écran de fin joue le thème du titre', () => {
  const s = cardRun(null); s.mode = 'won'; FP.assertEqual(JSON.stringify(FP.music.songFor(s)), JSON.stringify({ song: 'title', gain: 1 }));
});
