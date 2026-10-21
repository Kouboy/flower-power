// Enfouissement de la tige : quelles portions la terre recouvre (fonction pure de la position, pas de l'ordre des points).
const buriedShare = (old) => { const r = FP.createRng(5); let n = 0; for (let i = 0; i < 4000; i++) if (FP.plantRender.buried(r.range(0, 440), r.range(0, 2000), old)) n++; return n / 4000; };
FP.test('plantRender: une même position est toujours recouverte de la même façon', () => {
  for (let i = 0; i < 50; i++) FP.assertEqual(FP.plantRender.buried(i * 17.3, 900 + i * 11.1, false), FP.plantRender.buried(i * 17.3, 900 + i * 11.1, false));
});
FP.test('plantRender: environ un quart de la tige courante est sous la terre', () => { const s = buriedShare(false); FP.assert(s >= .15 && s <= .35, String(s)); });
FP.test('plantRender: les anciennes tiges sont davantage enfouies', () => { const s = buriedShare(true); FP.assert(s >= .5 && s <= .7, String(s)); });
FP.test('plantRender: les mottes sont réparties, pas groupées', () => {
  for (const x of [220, 221.5, 80, 300]) {
    const flags = [];
    for (let y = 1800; y > 200; y -= 8.6) flags.push(FP.plantRender.buried(x, y, false) ? 1 : 0);
    for (let i = 0; i + 12 <= flags.length; i++) { const n = flags.slice(i, i + 12).reduce((a, b) => a + b, 0); FP.assert(n <= 6, 'x=' + x + ' : ' + n + ' segments recouverts sur 12'); }
  }
});
