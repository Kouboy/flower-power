// render/obstacles.js — obstacles PNG et leur ancrage sombre dans la terre.
// Lit     : world.solids (x, y, a, flip, w, h, pivot, collision, grazeRadius, broadR, kind), FP.sprites, FP.config.soil.
// Écrit   : o._stencil sur chaque solide — cache de rendu uniquement, jamais lu par la simulation.
// Expose  : FP.obstacles.draw(ctx, world, cameraY, viewH).
// Porté de la v3.43.16 (ensureObstacleStencilCache, drawObstacleSoilAnchorUnder, drawPixelSolidSprite).
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  const TAU = FP.TAU;

  // Pochoir stable : dégradé flou le long du polygone de collision, effiloché par des miettes.
  // Calculé une fois par obstacle pour éviter le scintillement des filtres recalculés à chaque frame.
  function buildStencil(o) {
    const pts = o.collision;   // déjà retourné si flip = -1 : on dessine sans miroir du contexte
    const grazePad = Math.max(12, o.grazeRadius || 14);
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const [x, y] of pts) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
    const pad = Math.max(18, grazePad * 3.2);
    const c = document.createElement('canvas');
    c.width = Math.max(8, Math.ceil((maxX - minX) + pad * 2));
    c.height = Math.max(8, Math.ceil((maxY - minY) + pad * 2));
    const g = c.getContext('2d');

    g.save();
    g.translate(-minX + pad, -minY + pad);
    g.lineJoin = 'round'; g.lineCap = 'round';
    const trace = () => {
      g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
      g.closePath();
    };
    g.filter = 'blur(8px)'; g.strokeStyle = 'rgba(18,11,8,.16)'; g.lineWidth = Math.max(24, grazePad * 2.9); trace(); g.stroke();
    g.filter = 'blur(4px)'; g.strokeStyle = 'rgba(26,16,12,.26)'; g.lineWidth = Math.max(14, grazePad * 1.8); trace(); g.stroke();
    g.filter = 'blur(1px)'; g.strokeStyle = 'rgba(36,22,16,.32)'; g.lineWidth = Math.max(7, grazePad * .9); trace(); g.stroke();
    g.filter = 'none'; g.fillStyle = 'rgba(22,13,10,.10)'; trace(); g.fill();
    g.restore();

    // Miettes stables : graine dérivée de la famille et de la position (chaque obstacle a sa frange).
    const key = `${o.kind}|${Math.round(o.x)}|${Math.round(o.y)}`;
    let seed = 0;
    for (let i = 0; i < key.length; i++) seed = (seed * 1664525 + key.charCodeAt(i) + 1013904223) >>> 0;
    const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    const cx = c.width * .5, cy = c.height * .5;
    const rx = Math.max(8, (maxX - minX) * .5 + grazePad * 1.7), ry = Math.max(8, (maxY - minY) * .5 + grazePad * 1.5);

    g.save();
    g.globalCompositeOperation = 'destination-out';
    const specks = Math.max(170, Math.round((c.width * c.height) / 22));
    for (let i = 0; i < specks; i++) {
      const x = rnd() * c.width, y = rnd() * c.height;
      const dx = (x - cx) / rx, dy = (y - cy) / ry, r = Math.sqrt(dx * dx + dy * dy);
      if (r < .62 || r > 1.38) continue;
      const outer = Math.min(1, Math.max(0, (r - .62) / .76));
      if (rnd() > .28 + outer * .84) continue;
      const s = (rnd() < .26 ? 2 : 1) + (outer > .62 && rnd() < .34 ? 1 : 0);
      g.globalAlpha = .08 + outer * .30;
      if (rnd() < .65) g.fillRect(x, y, s, s);
      else { g.beginPath(); g.arc(x, y, s * .55, 0, TAU); g.fill(); }
    }
    g.globalAlpha = .10; g.lineWidth = 1;
    for (let i = 0; i < 22; i++) {
      const a = rnd() * TAU, k = .82 + rnd() * .34;
      const x = cx + Math.cos(a) * rx * k, y = cy + Math.sin(a) * ry * k, len = 2 + rnd() * 5.5;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len); g.stroke();
    }
    g.restore();

    g.save();
    for (let i = 0; i < Math.max(46, Math.round((c.width + c.height) / 6)); i++) {
      const x = rnd() * c.width, y = rnd() * c.height;
      const dx = (x - cx) / rx, dy = (y - cy) / ry, r = Math.sqrt(dx * dx + dy * dy);
      if (r < .66 || r > 1.28 || rnd() > .36) continue;
      g.fillStyle = rnd() < .5 ? 'rgba(35,22,16,.10)' : 'rgba(82,55,38,.07)';
      g.fillRect(x, y, 1 + (rnd() > .72 ? 1 : 0), 1);
    }
    g.restore();

    return { canvas: c, offX: minX - pad, offY: minY - pad };
  }

  function drawAnchor(ctx, o) {
    if (!o._stencil) o._stencil = buildStencil(o);
    ctx.save();
    ctx.translate(o.x, o.y); ctx.rotate(o.a);
    ctx.globalCompositeOperation = 'multiply';
    ctx.drawImage(o._stencil.canvas, o._stencil.offX, o._stencil.offY);
    ctx.restore();
  }

  function drawSprite(ctx, o) {
    const img = FP.sprites.get(o.assetKey);
    if (!img) return;   // PNG pas encore chargé ou manquant : la collision existe quand même
    ctx.save();
    ctx.translate(o.x, o.y); ctx.rotate(o.a);
    if (o.flip !== 1) ctx.scale(o.flip, 1);
    ctx.drawImage(img, -o.pivot[0] * o.w, -o.pivot[1] * o.h, o.w, o.h);
    ctx.restore();
  }

  function draw(ctx, world, cameraY, viewH) {
    const viewPad = FP.config.soil.viewPad;
    const top = cameraY - viewPad, bottom = cameraY + viewH + viewPad;
    for (const o of world.solids) {
      const pad = Math.max(44, o.broadR) + 90;
      if (o.y + pad < top || o.y - pad > bottom) continue;
      drawAnchor(ctx, o);
      drawSprite(ctx, o);
    }
  }

  FP.obstacles = { draw };
})();
