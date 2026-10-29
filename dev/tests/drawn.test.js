// Obstacles dessinés (v4.14.0) : règles communes à toutes les familles de FP.drawn.families (spec : un seul tenant, même
// rétréci ; couleurs permises ; 4 variantes, une silhouette ; collision fidèle ; contour teinté).
(function () {
  const S = FP.silhouette, png = FP.catalog.filterAssets(window.FLOWER_POWER_AUTHORED_ASSETS);
  const kinds = Object.keys(FP.drawn.families);
  const forbidden = new Set(FP.palette.danger.concat(FP.palette.boss.weak).map(c => c.toLowerCase()));
  const insetOf = (def) => (def.inset !== undefined ? def.inset : FP.config.obstacles.drawnInset);
  const sameMask = (a, b) => a.on.every((v, i) => v === b.on[i]);

  FP.test('dessin: au moins une famille', () => FP.assert(kinds.length > 0));
  for (const k of kinds) {
    const def = FP.drawn.families[k];
    FP.test(`dessin ${k} : taille de la fiche PNG`, () => {
      FP.assert(png[k], 'fiche PNG du même nom');
      FP.assert(Math.abs(def.w - png[k].render.worldWidth / 2) <= 1, def.w + ' / ' + png[k].render.worldWidth);
    });
    FP.test(`dessin ${k} : reste dans son cadre`, () => {
      for (let v = 0; v < 4; v++) {
        let out = 0;
        const g = FP.drawn.grid(def.w, def.h), set = g.set;
        g.set = (x, y, c, ink) => { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= def.w || y >= def.h) out++; set(x, y, c, ink); };
        def.paint(g, v);
        FP.assertEqual(out, 0, 'variante ' + v);
      }
    });
    FP.test(`dessin ${k} : d’un seul tenant, même rétréci`, () => {
      const m = S.mask(FP.drawn.render(k, 0));
      FP.assertEqual(S.components(m), 1, 'dessin');
      FP.assertEqual(S.components(S.erode(m, insetOf(def))), 1, 'rétréci');
    });
    FP.test(`dessin ${k} : couleurs permises`, () => {
      for (let v = 0; v < 4; v++) {
        const g = FP.drawn.render(k, v);
        for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) { const c = g.get(x, y); FP.assert(!c || !forbidden.has(c.toLowerCase()), c); }
      }
    });
    FP.test(`dessin ${k} : 4 variantes, une silhouette`, () => {
      const g0 = FP.drawn.render(k, 0), m0 = S.mask(g0);
      let differs = false;
      for (let v = 1; v < 4; v++) {
        const g = FP.drawn.render(k, v);
        FP.assert(sameMask(m0, S.mask(g)), 'silhouette de la variante ' + v);
        for (let y = 0; y < g.h && !differs; y++) for (let x = 0; x < g.w; x++) if (g.get(x, y) !== g0.get(x, y)) { differs = true; break; }
      }
      FP.assert(differs, 'variantes toutes identiques');
    });
    FP.test(`dessin ${k} : déterministe`, () => {
      const a = FP.drawn.render(k, 2), b = FP.drawn.render(k, 2);
      for (let y = 0; y < a.h; y++) for (let x = 0; x < a.w; x++) FP.assertEqual(a.get(x, y), b.get(x, y));
    });
    FP.test(`dessin ${k} : collision fidèle`, () => {
      const m = S.erode(S.mask(FP.drawn.render(k, 0)), insetOf(def)), p = S.polygon(m), c = S.coverage(m, p);
      FP.assert(p.length >= 3 && p.length <= 48, String(p.length));
      FP.assert(c.inside >= .95 && c.outside < .03, JSON.stringify(c));
    });
    FP.test(`dessin ${k} : contour teinté`, () => {
      const g = FP.drawn.render(k, 0);
      for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
        const c = g.get(x, y);
        if (!c) continue;
        const edge = [[-1, 0], [1, 0], [0, -1], [0, 1]].some(([dx, dy]) => !g.get(x + dx, y + dy));
        if (edge) FP.assert(c !== '#000000' && c !== '#160e14', c);
      }
    });
  }
})();
