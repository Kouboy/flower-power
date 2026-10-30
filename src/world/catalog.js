// world/catalog.js — obstacles authorés : JSON de l'Asset Editor → solides prêts à placer.
// Lit     : window.FLOWER_POWER_AUTHORED_ASSETS (assets/obstacles/manifest.js), FP.config.level.padding, FP.geom.toWorld ;
//           avec ?obstacles=dessin (FP.params.obstacles) : FP.drawn (assets/obstacles/dessin/*), FP.silhouette, FP.config.obstacles.drawnInset ;
//           avec ?obstacles=pixel : window.FLOWER_POWER_PIXEL_ASSETS (assets/obstacles/pixel/manifest.js).
// Écrit   : rien.
// Expose  : FP.catalog.assets, FP.catalog.has(kind), FP.catalog.makeSolid({kind,x,y,a,flip,scale}),
//           FP.catalog.visibleFootprint(solid), FP.catalog.filterAssets(raw), FP.catalog.drawnAssets(families, png),
//           FP.catalog.pixelAssets(raw, png), FP.catalog.select(mode) (null : PNG ; 'dessin' : dessinés ; 'pixel' : PixelLab).
// Le JSON est la source de vérité : worldWidth, pivot, mirrorSafe, polygone, grazeRadius, flyoverEligible.
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};

  // Un asset sans polygone exploitable n'aurait pas de collision : on l'écarte.
  function filterAssets(raw) {
    const out = {};
    for (const [key, a] of Object.entries(raw || {})) {
      const pts = a && a.collision && a.collision.points;
      if (Array.isArray(pts) && pts.length >= 3) out[key] = a;
    }
    return out;
  }

  const assets = {};   // fiches en service : PNG, ou dessinées avec ?obstacles=dessin (select)

  // Fiches des obstacles dessinés (v4.14.0) : même format que les fiches PNG, dont elles reprennent les réglages ; la grille
  // (contour compris) tient lieu d'image source et la collision vient de sa silhouette, rétrécie de `inset` pixels.
  const ART = 2;   // pixels CSS par pixel d'art (FP.px.SCALE, que le monde ne lit pas)
  function drawnAssets(families, png) {
    const out = {}, S = FP.silhouette;
    for (const [kind, def] of Object.entries(families)) {
      const p = png[kind];
      if (!p) continue;
      const g = FP.drawn.renderDef(def, 0), pivot = (p.render && p.render.pivot) || [.5, .5];
      const inset = def.inset !== undefined ? def.inset : FP.config.obstacles.drawnInset;
      const points = S.polygon(S.erode(S.mask(g), inset)).map(([x, y]) => [x - pivot[0] * g.w, y - pivot[1] * g.h]);
      const runtime = Object.assign({}, p.runtime);
      delete runtime.src; delete runtime.metadata;
      out[kind] = {
        id: kind, kind: 'obstacle', drawn: true,
        source: { width: g.w, height: g.h },
        render: { worldWidth: g.w * ART, pivot, mirrorSafe: p.render.mirrorSafe },
        collision: { type: 'polygon', points, grazeRadius: p.collision.grazeRadius, flyoverEligible: p.collision.flyoverEligible },
        spawn: p.spawn, runtime
      };
    }
    return out;
  }

  // Fiches des obstacles PixelLab (v4.15.0) : PNG recadrés et collision précalculés par dev/tools/import-pixel.js ; un pixel
  // de l'image = `zoom` pixels d'art, pour que la réduction sur la grille ne rééchantillonne rien. Pivot centré.
  // Une famille sans fiche PNG (propre à PixelLab, v4.16.0) prend les réglages courants des fiches PNG.
  const PIXEL_DEFAULT = {
    render: { mirrorSafe: true }, collision: { grazeRadius: 16, flyoverEligible: true },
    spawn: { signature: false, maxPerRun: null, weight: 1 }, runtime: {}
  };
  function pixelAssets(raw, png) {
    const out = {};
    for (const [kind, r] of Object.entries(raw || {})) {
      const p = png[kind] || Object.assign({}, PIXEL_DEFAULT, { runtime: { gameKind: kind } });
      out[kind] = {
        id: kind, kind: 'obstacle',
        source: { width: r.width, height: r.height },
        render: { worldWidth: r.width * ART * r.zoom, pivot: [.5, .5], mirrorSafe: p.render.mirrorSafe },
        collision: { type: 'polygon', points: r.points, grazeRadius: p.collision.grazeRadius, flyoverEligible: p.collision.flyoverEligible },
        spawn: p.spawn, runtime: Object.assign({}, p.runtime, { src: r.src, metadata: undefined })
      };
    }
    return out;
  }

  // Remplit les fiches en service (même objet, partagé) : PNG (null), dessinées ('dessin') ou PixelLab ('pixel').
  function select(mode) {
    for (const k of Object.keys(assets)) delete assets[k];
    const png = filterAssets(window.FLOWER_POWER_AUTHORED_ASSETS);
    Object.assign(assets, mode === 'dessin' ? drawnAssets(FP.drawn.families, png)
      : mode === 'pixel' ? pixelAssets(window.FLOWER_POWER_PIXEL_ASSETS, png) : png);
  }

  // Rectangle rendu en coordonnées locales (pivot pris en compte, miroir appliqué), élargi de pad.
  function localRect(o, pad) {
    let left = -o.pivot[0] * o.w - pad, right = (1 - o.pivot[0]) * o.w + pad;
    const top = -o.pivot[1] * o.h - pad, bottom = (1 - o.pivot[1]) * o.h + pad;
    if (o.flip < 0) { const l = -right; right = -left; left = l; }
    return [[left, top], [right, top], [right, bottom], [left, bottom]];
  }

  function visibleFootprint(o) {
    return localRect(o, 0).map(([x, y]) => FP.geom.toWorld(o, x, y));
  }

  function paddingFor(a) {
    const explicit = Number(a.spawn && a.spawn.visualPadding);
    if (Number.isFinite(explicit)) return Math.max(0, explicit);
    const p = FP.config.level.padding;
    return a.spawn && a.spawn.signature === true ? p.signature : p.authored;
  }

  function makeSolid({ kind, x, y, a, flip, scale: size = 1 }) {
    const asset = assets[kind];
    if (!asset) return null;
    const render = asset.render || {};
    const srcW = Math.max(1, Number(asset.source && asset.source.width) || 1);
    const srcH = Math.max(1, Number(asset.source && asset.source.height) || 1);
    const w = (Number(render.worldWidth) || 80) * size;   // size : variation de taille par instance (collision comprise)
    const scale = w / srcW;
    const f = render.mirrorSafe === false ? 1 : (flip < 0 ? -1 : 1);

    const o = {
      kind, assetKey: kind, x, y, a: a || 0, flip: f,
      w, h: w * srcH / srcW,
      pivot: render.pivot || [.5, .5],
      collision: asset.collision.points.map(([px, py]) => [px * scale * f, py * scale]),
      grazeRadius: Math.max(0, Number(asset.collision.grazeRadius) || 0),
      flyoverEligible: asset.collision.flyoverEligible !== false,
      signature: !!(asset.spawn && asset.spawn.signature === true)
    };
    let broadR = Math.hypot(o.w, o.h) * .5;
    for (const [px, py] of o.collision) broadR = Math.max(broadR, Math.hypot(px, py));
    o.broadR = broadR;
    o.footprint = localRect(o, paddingFor(asset)).map(([lx, ly]) => FP.geom.toWorld(o, lx, ly));
    return o;
  }

  FP.catalog = {
    assets,
    has: (kind) => Object.prototype.hasOwnProperty.call(assets, kind),
    makeSolid,
    visibleFootprint,
    filterAssets,
    drawnAssets,
    pixelAssets,
    select
  };
  select(FP.params && FP.params.obstacles);
})();
