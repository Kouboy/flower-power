// Bon de commande (ui/order.js) : mise en page pure, zones de toucher, textes qui tiennent.
const SIZES = [[FP.config.view.minW / FP.px.SCALE, FP.config.view.minH / FP.px.SCALE], [206, 458], [220, 392]];
const inside = (b, W, H) => b.x >= 0 && b.y >= 0 && b.x + b.w <= W && b.y + b.h <= H;
const boxesOf = (L) => [...L.lines, L.order, L.decline];
FP.test('orderForm: tout tient dans l’écran, même le plus petit', () => {
  for (const [W, H] of SIZES) { const L = FP.orderForm.layout(W, H); FP.assert(inside(L.sheet, W, H) && boxesOf(L).every(b => inside(b, W, H)), W + '×' + H); }
});
FP.test('orderForm: zones de toucher hautes d’au moins 20 et sans chevauchement', () => {
  for (const [W, H] of SIZES) {
    const bs = boxesOf(FP.orderForm.layout(W, H));
    FP.assert(bs.every(b => b.h >= 20), 'hauteur');
    for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++) {
      const a = bs[i], b = bs[j]; FP.assert(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y, 'chevauchement ' + i + '/' + j);
    }
  }
});
FP.test('orderForm: hit trouve chaque ligne et chaque bouton ; hors de la feuille → rien', () => {
  const [W, H] = SIZES[1], L = FP.orderForm.layout(W, H), mid = (b) => [b.x + b.w / 2, b.y + b.h / 2];
  L.lines.forEach((b, i) => FP.assertEqual(JSON.stringify(FP.orderForm.hitAt(L, ...mid(b))), JSON.stringify({ kind: 'line', i })));
  FP.assertEqual(FP.orderForm.hitAt(L, ...mid(L.order)).kind, 'order');
  FP.assertEqual(FP.orderForm.hitAt(L, ...mid(L.decline)).kind, 'decline');
  FP.assertEqual(FP.orderForm.hitAt(L, 1, 1), null);
  FP.assertEqual(FP.orderForm.hitAt(L, L.sheet.x + 2, L.sheet.y + 2), null);   // sur la feuille mais hors des zones
});
FP.test('orderForm: les textes du bon tiennent dans leur ligne', () => {
  const t = FP.config.text.shop, m = (s) => FP.font.measure(s), cw = FP.orderForm.layout(...SIZES[0]).contentW;
  const price = Math.max(...FP.config.shop.items.map(i => m(FP.orderForm.money(i.price))));
  for (const it of FP.config.shop.items) {
    FP.assert(FP.orderForm.BOX + m(t.names[it.id]) <= cw, 'nom ' + it.id);
    FP.assert(m(t.lines[it.id]) + 4 + price <= cw, 'ligne ' + it.id);
  }
  for (const tr of FP.config.shop.transports) FP.assert(m(t.by + tr) <= cw, tr);
  FP.assert(m('99,9 KG CO2 ' + t.offset) <= cw && m(t.from + '000042') <= cw && m(t.fine) <= cw && m(t.fine2) <= cw);
});
