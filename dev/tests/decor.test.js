// Décors des milieux (v4.11.0) : chaque milieu a son ciel, son horizon, ses accessoires et son sous-sol (render/decor-*.js),
// testés sur un faux contexte qui retient chaque rectangle peint.
const recCtx = () => ({ rects: [], set fillStyle(c) { this._c = c; }, get fillStyle() { return this._c; },
  fillRect(x, y, w, h) { this.rects.push({ x, y, w, h, c: this._c }); }, drawImage() {}, clearRect() {} });
const decorRng = (s) => () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
const decorRgb = (h) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const decorDist = (a, b) => Math.hypot(...decorRgb(a).map((v, i) => v - decorRgb(b)[i]));
function checkDecor(id) {
  const D = FP.decor[id], known = new Set([...D.palette, ...FP.palette.decor()]), pal = FP.palette.milieux[id].sky[0];
  for (const f of ['skyStatic', 'back', 'horizon', 'front', 'layout', 'surface', 'under', 'glow']) FP.assert(typeof D[f] === 'function', id + ' ' + f);
  for (const c of D.palette) for (const d of FP.palette.danger) FP.assert(decorDist(c, d) >= 60, id + ' ' + c + ' trop proche de ' + d);
  const used = (g) => g.rects.forEach(r => FP.assert(known.has(r.c), id + ' teinte hors palette ' + r.c));
  for (const [w, h] of [[180, 50], [220, 70], [400, 120]]) {
    let g = recCtx(); D.skyStatic(g, w, h, pal); D.back(g, w, h, 0, 3.7, pal); used(g);
    g = recCtx(); D.horizon(g, w, h); D.front(g, w, h, 0, 3.7); used(g);
    FP.assert(g.rects.every(r => r.y >= 0 && r.y + r.h <= h + 1), id + ' horizon hors du ciel (' + w + '×' + h + ')');
    const cols = new Set(); g.rects.forEach(r => { if (r.y + r.h >= h - 2) for (let x = Math.max(0, r.x); x < Math.min(w, r.x + r.w); x++) cols.add(x); });
    FP.assert(cols.size > w * .5, id + ' horizon troué (' + w + ')');
  }
  const top = 100, bottom = 1900, L = D.layout(300, top, bottom, decorRng(5));
  FP.assertEqual(JSON.stringify(L), JSON.stringify(D.layout(300, top, bottom, decorRng(5))));
  FP.assert(JSON.stringify(L) !== JSON.stringify(D.layout(300, top, bottom, decorRng(6))), id + ' : même décor pour deux niveaux');
  FP.assert(L.under.length >= (bottom - top) / 300 && L.under.length <= (bottom - top) / 50, id + ' densité ' + L.under.length);
  FP.assert(L.under.some(u => u.y > top + (bottom - top) * .66), id + ' : rien dans le bas du niveau');
  let g = recCtx(); D.surface(g, L, top - 2); used(g);
  FP.assert(g.rects.every(r => r.y >= top - 2 - 22 && r.y + r.h <= top + 1), id + ' accessoire trop haut');
  const cover = new Set(); g.rects.forEach(r => { for (let x = Math.round(r.x); x < r.x + r.w; x++) cover.add(x); });
  FP.assert(cover.size <= 300 / 3, id + ' accessoires trop larges : ' + cover.size);
  g = recCtx(); D.under(g, L); used(g);
  FP.assert(g.rects.every(r => r.y >= top && r.y < bottom && Math.max(...decorRgb(r.c)) >= 10), id + ' sous-sol hors terre ou noir pur');
  g = recCtx(); D.glow(g, L, top - 2, 600, 400, 2.3); used(g);
  FP.assert(g.rects.every(r => r.y >= -8 - 22 && r.y <= 400 + 8), id + ' glow hors de la tranche visible');
}
FP.test('decor: friche', () => checkDecor('friche'));
