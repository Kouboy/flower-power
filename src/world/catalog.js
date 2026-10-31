// world/catalog.js — fiches des obstacles (PixelLab, assets/obstacles/manifest.js) → solides prêts à placer.
// Lit     : window.FLOWER_POWER_OBSTACLES (généré par dev/tools/import-pixel.js), FP.config.level.padding, FP.geom.toWorld.
// Écrit   : rien.
// Expose  : FP.catalog.assets, FP.catalog.has(kind), FP.catalog.makeSolid({kind,x,y,a,flip,scale}),
//           FP.catalog.visibleFootprint(solid), FP.catalog.filterAssets(raw).
// La fiche est la source de vérité : worldWidth, pivot, mirrorSafe, polygone, grazeRadius, flyoverEligible.
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

  const assets = filterAssets(window.FLOWER_POWER_OBSTACLES);   // fiches en service

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
    filterAssets
  };
})();
