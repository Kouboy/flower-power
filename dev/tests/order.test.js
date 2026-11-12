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

// v5.9.0 : sans les moyens, le bouton COMMANDER est grisé (ni vert ni crème).
FP.test('order: COMMANDER grisé sans les moyens', () => {
  const view = FP.view, font = FP.font.draw; FP.view = { ...(view || {}), ui: { w: 200, h: 356 } };
  FP.font.draw = (g, text, x, y, o) => { g.fillStyle = o.color; g.fillRect(Math.round(x), y, 1, 1); return 0; };   // pas de toile sous Node : un point à la couleur du texte
  try {
    const paint = (eco) => {
      const s = FP.state.createRun(3, { W: 440, H: 783 }); FP.level.startRun(s); FP.plant.launch(s); s.score.eco = eco;
      FP.shop.open(s, { after: 'death' }); s.shop.phase = 'idle'; s.shop.t0 = s.time - 10;
      const rects = []; const g = { set fillStyle(c) { this._c = c; }, get fillStyle() { return this._c; }, fillRect(x, y, w, h) { rects.push({ x, y, w, h, c: this._c }); }, drawImage() {} };
      FP.orderForm.draw(g, s);
      const b = FP.orderForm.layout(200, 356).order;
      return rects.filter(r => r.x >= b.x && r.x < b.x + b.w && r.y >= b.y - 2 && r.y < b.y + b.h + 2).map(r => r.c);
    };
    const rich = paint(1e6), poor = paint(0), lit = ['#4f9a2c', '#fff6c8'];
    FP.assert(rich.some(c => lit.includes(c)), 'bouton vert quand on peut acheter');
    FP.assert(poor.length > 0 && !poor.some(c => lit.includes(c)), 'bouton grisé sans les moyens');
  } finally { FP.view = view; FP.font.draw = font; }
});
