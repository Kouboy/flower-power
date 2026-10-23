// ui/order.js — bon de commande en papier recyclé (v4.6.0), posé de travers par-dessus le jeu assombri.
// Lit     : state.shop, state.score.eco, state.time, FP.shop.{total,canCheck,co2}, FP.config.{shop,text.shop}, FP.font, FP.view.ui.
// Écrit   : rien (le canvas uniquement).
// Expose  : FP.orderForm.layout(uiW, uiH), FP.orderForm.hitAt(layout, ax, ay), FP.orderForm.money(n) (purs, testés),
//           FP.orderForm.hit(state, ax, ay), FP.orderForm.draw(g, state), FP.orderForm.BOX.
// Pixels d'art de la toile d'interface. Ne touche pas au DOM au chargement : testable sous Node.
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  const PAD = 7, ROW = 9, LINE_H = 22, BTN_H = 20, BOX = 11, MAX_W = 176, TILT = 32;
  const C = { paper: '#e6dcc0', speck: '#cbbf9e', speck2: '#d8ccab', ink: '#2a2016', faint: '#6a5a40', off: '#a89a7a', dash: '#8a7a5a',
    check: '#3a8a2a', promo: '#d0306a', red: '#c03028', green: '#4f9a2c', greenDark: '#2e5a1a', cream: '#fff6c8', veil: 'rgba(10, 6, 4, .55)' };

  const money = (n) => 'Ɇ' + Math.round(n).toLocaleString('fr-FR');

  // Feuille centrée ; de haut en bas : en-tête (2 rangées), trait, 3 lignes d'article, trait, livraison (2), total, boutons, mentions (2).
  function layout(uiW, uiH) {
    const w = Math.min(uiW - 8, MAX_W), contentW = w - 2 * PAD;
    const h = PAD + 2 * ROW + 6 + 3 * LINE_H + 6 + 2 * ROW + ROW + 4 + BTN_H + 6 + 2 * ROW + PAD;
    const x = Math.floor((uiW - w) / 2), y = Math.max(4, Math.floor((uiH - h) / 2) - 10), cx = x + PAD;
    let yy = y + PAD + 2 * ROW + 6;
    const lines = [0, 1, 2].map(i => ({ x: cx, y: yy + i * LINE_H, w: contentW, h: LINE_H - 1 }));
    yy += 3 * LINE_H + 6;
    const totalY = yy + 2 * ROW, btnY = totalY + ROW + 4, half = Math.floor((contentW - 6) / 2);
    return { sheet: { x, y, w, h }, contentW, lines, delivery: yy, totalY, fineY: btnY + BTN_H + 6,
      order: { x: cx, y: btnY, w: half, h: BTN_H }, decline: { x: cx + contentW - half, y: btnY, w: half, h: BTN_H } };
  }

  const inBox = (b, ax, ay) => ax >= b.x && ax < b.x + b.w && ay >= b.y && ay < b.y + b.h;
  function hitAt(L, ax, ay) {
    for (let i = 0; i < L.lines.length; i++) if (inBox(L.lines[i], ax, ay)) return { kind: 'line', i };
    if (inBox(L.order, ax, ay)) return { kind: 'order' };
    if (inBox(L.decline, ax, ay)) return { kind: 'decline' };
    return null;
  }
  const hit = (state, ax, ay) => (state.shop ? hitAt(layout(FP.view.ui.w, FP.view.ui.h), ax, ay) : null);

  // Décalage vertical de la feuille selon la phase : elle monte, attend, s'envole (commande) ou redescend (refus).
  function offsetY(sh, t, uiH) {
    const c = FP.config.shop, age = t - sh.t0, k = (v) => Math.max(0, Math.min(1, v));
    if (sh.phase === 'in') return Math.round((1 - Math.sqrt(k(age / c.inTime))) * uiH);
    if (sh.phase === 'ordered') return -Math.round(k((age - c.stampTime) / c.outTime) ** 2 * uiH);
    if (sh.phase === 'declined') return Math.round(k(age / c.inTime) ** 2 * uiH);
    return 0;
  }

  const text = (g, s, x, y, color, align) => FP.font.draw(g, s, x, y, { color, outline: false, align });
  const rect = (g, x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  const dashes = (g, x, y, w) => { for (let i = 0; i < w; i += 4) rect(g, x + i, y, 2, 1, C.dash); };

  // Papier recyclé : bords en escalier (feuille légèrement de travers), fond, taches régulières.
  function paper(g, b) {
    const shift = (y) => Math.floor((b.h - y) / TILT);   // environ −1,5° : un pixel tous les TILT
    rect(g, b.x + shift(0) - 1, b.y - 1, b.w + 2, 1, C.ink);
    for (let y = 0; y < b.h; y++) { rect(g, b.x + shift(y) - 1, b.y + y, b.w + 2, 1, C.ink); rect(g, b.x + shift(y), b.y + y, b.w, 1, C.paper); }
    rect(g, b.x - 1, b.y + b.h, b.w + 2, 1, C.ink);
    for (let i = 0; i < b.w * b.h / 40; i++) {
      const px = (i * 37) % b.w, py = (i * 53 + Math.floor(i / 7)) % b.h;
      rect(g, b.x + px + shift(py), b.y + py, 1, 1, i % 3 ? C.speck : C.speck2);
    }
  }

  // Une ligne d'article : case, nom ; dessous, ligne d'explication et prix (promo en rose, avec son tampon « -50% »).
  function item(g, state, it, i, cx, right, by) {
    const t = FP.config.text.shop, ok = FP.shop.canCheck(state, i), ink = ok ? C.ink : C.off;
    rect(g, cx, by, 8, 8, ink); rect(g, cx + 1, by + 1, 6, 6, C.paper);
    if (it.checked) for (const [px, py] of [[1, 3], [2, 4], [3, 5], [4, 4], [5, 3], [6, 2], [7, 1], [8, 0]]) rect(g, cx + px, by + py, 2, 2, C.check);
    text(g, t.names[it.id], cx + BOX, by + 1, ink);
    text(g, t.lines[it.id], cx + BOX, by + ROW + 2, ok ? C.faint : C.off);
    text(g, money(it.price), right, by + ROW + 2, it.promo ? C.promo : ink, 'right');
    if (it.promo) {
      const tw = FP.font.measure('-50%') + 4, tx = right - tw + 3, ty = by - 3;
      rect(g, tx, ty, tw, ROW + 1, C.promo); rect(g, tx + 1, ty + 1, tw - 2, ROW - 1, C.paper);
      text(g, '-50%', tx + 2, ty + 1, C.promo);
    }
  }

  function draw(g, state) {
    const sh = state.shop;
    if (!sh) return;
    const { w: W, h: H } = FP.view.ui, t = FP.config.text.shop, L = layout(W, H), dy = offsetY(sh, state.time, H);
    rect(g, 0, 0, W, H, C.veil);
    const s = { ...L.sheet, y: L.sheet.y + dy }, cx = s.x + PAD, right = s.x + s.w - PAD, y0 = s.y + PAD, mid = s.x + s.w / 2;
    paper(g, s);
    text(g, sh.lastChance ? t.last : t.title, mid, y0, sh.lastChance ? C.red : C.ink, 'center');
    text(g, t.from + String(sh.visit).padStart(6, '0'), mid, y0 + ROW, C.faint, 'center');
    dashes(g, cx, y0 + 2 * ROW + 2, L.contentW);
    sh.items.forEach((it, i) => item(g, state, it, i, cx, right, L.lines[i].y + dy + 2));
    dashes(g, cx, L.delivery + dy - 4, L.contentW);
    // Livraison : bilan CO₂ satirique, sans effet en jeu.
    text(g, t.by + sh.transport, cx, L.delivery + dy, C.faint);
    text(g, String(FP.shop.co2(state)).replace('.', ',') + ' KG CO2 ' + t.offset, right, L.delivery + dy + ROW, C.faint, 'right');
    text(g, t.total, cx, L.totalY + dy, C.ink); text(g, money(FP.shop.total(state)), right, L.totalY + dy, C.ink, 'right');
    const o = { ...L.order, y: L.order.y + dy }, d = { ...L.decline, y: L.decline.y + dy };
    rect(g, o.x, o.y, o.w, o.h, C.ink); rect(g, o.x + 1, o.y + 1, o.w - 2, o.h - 4, C.green); rect(g, o.x + 1, o.y + o.h - 3, o.w - 2, 2, C.greenDark);
    text(g, t.order, o.x + o.w / 2, o.y + 6, C.cream, 'center');
    rect(g, d.x, d.y, d.w, d.h, C.ink); rect(g, d.x + 1, d.y + 1, d.w - 2, d.h - 2, C.paper);
    text(g, sh.lastChance ? t.giveUp : t.decline, d.x + d.w / 2, d.y + 6, C.ink, 'center');
    text(g, t.fine, mid, L.fineY + dy, C.faint, 'center'); text(g, t.fine2, mid, L.fineY + dy + ROW, C.faint, 'center');
    // Tampon « VALIDÉ » qui s'abat sur la commande.
    if (sh.phase === 'ordered') {
      const k = Math.min(1, (state.time - sh.t0) / (FP.config.shop.stampTime * .5)), sw = FP.font.measure(t.stamp, { scale: 2 }) + 8;
      const sx = Math.round(mid - sw / 2), sy = Math.round(L.totalY + dy - 22 - (1 - k) * 12);
      rect(g, sx, sy, sw, 20, C.check); rect(g, sx + 2, sy + 2, sw - 4, 16, C.paper);
      FP.font.draw(g, t.stamp, sx + 4, sy + 3, { scale: 2, color: C.check, outline: false });
    }
  }

  FP.orderForm = { layout, hitAt, hit, money, draw, BOX };
})();
