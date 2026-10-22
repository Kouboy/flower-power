// Logo « Flower Power » : disposition des lettres, place du trèfle radioactif, coulures (logique pure).
const overlap = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
FP.test('logo: aucune lettre ne chevauche une autre', () => {
  const L = FP.logo.layout().letters;
  FP.assertEqual(L.map(l => l.ch).join(''), 'FlowerPwer');
  for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) FP.assert(!overlap(L[i], L[j]), L[i].ch + '/' + L[j].ch);
});
FP.test('logo: le trèfle radioactif a sa place entre P et w', () => {
  const { letters, trefoil: o } = FP.logo.layout(), P = letters[6], w = letters[7];
  const box = { x: o.cx - o.r, y: o.cy - o.r, w: 2 * o.r, h: 2 * o.r };
  FP.assert(!overlap(box, P) && !overlap(box, w));
  FP.assert(box.x >= P.x + P.w && box.x + box.w <= w.x);
});
FP.test('logo: tient dans 90 % de l’écran le plus étroit', () => {
  FP.assert(FP.logo.layout().width <= .9 * FP.config.view.minW / FP.px.SCALE, String(FP.logo.layout().width));
});
FP.test('logo: les coulures de FLOWER ne touchent pas POWER', () => {
  const { letters, drips } = FP.logo.layout(), top = Math.min(...letters.slice(6).map(l => l.y));
  const flowerBottom = Math.max(...letters.slice(0, 6).map(l => l.y + l.h));
  for (const d of drips.filter(d => d.y < top)) FP.assert(d.y + 8 < top, 'coulure trop longue à x=' + d.x);
  FP.assert(flowerBottom < top);
});
