// render/flowers.js — fleurs illustrées du parterre (cache pour les fleurs finies, dessin animé pour celles qui poussent).
// Lit     : state.garden.flowers (x, size, maxSize, age, palette, tilt), state.world.{surfaceY,viewH}, state.camera.y,
//           FP.view.W, FP.config.{garden,soil}.
// Écrit   : rien dans l'état (canvas de cache interne).
// Expose  : FP.flowersRender.draw(ctx, state) (repère monde).
// Porté de la v3.43.16 (drawIllustratedFlower, rebuildFlowerCache, drawFlowerCache, partie fleurs de drawPlant).
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  const TAU = FP.TAU;
  const CACHE_TOP = -126, CACHE_H = 144;   // le cache couvre 126 px au-dessus de la base et 18 px en dessous

  const cache = document.createElement('canvas');
  const cg = cache.getContext('2d');
  // Le cache dépend de la liste de fleurs du run (nouvelle à chaque partie), du nombre de fleurs finies et de la largeur.
  let cachedList = null, cachedCount = -1, cachedW = -1;

  // Tige contourée comme la pousse souterraine, deux feuilles, cinq pétales irréguliers, cœur ponctué.
  function drawFlower(g, f, baseY, size, animated) {
    const s = Math.max(.04, size), pal = f.palette;
    const stemLen = 44 + f.maxSize * 18, seed = f.x * .071 + f.tilt * 3.1;
    g.save(); g.translate(f.x, baseY); g.rotate(f.tilt + (animated ? Math.sin(f.age * 1.4) * .022 : 0));
    g.lineCap = 'round'; g.lineJoin = 'round';
    g.strokeStyle = '#354727'; g.lineWidth = 5.4;
    g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(-5, -stemLen * .36, 0, -stemLen); g.stroke();
    g.strokeStyle = '#7fa75c'; g.lineWidth = 3.1;
    g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(-4, -stemLen * .35, 0, -stemLen + 1); g.stroke();
    g.strokeStyle = 'rgba(205,218,137,.62)'; g.lineWidth = .9;
    g.beginPath(); g.moveTo(1, -5); g.quadraticCurveTo(-1, -stemLen * .38, 1, -stemLen + 3); g.stroke();
    for (const [lx, ly, la] of [[-8, -stemLen * .43, -.82], [8, -stemLen * .25, .82]]) {
      g.save(); g.translate(lx, ly); g.rotate(la);
      g.fillStyle = '#718f50'; g.strokeStyle = '#354727'; g.lineWidth = 1.7;
      g.beginPath(); g.ellipse(0, 0, 5.7, 10.6, 0, 0, TAU); g.fill(); g.stroke();
      g.strokeStyle = 'rgba(211,220,143,.55)'; g.lineWidth = .9; g.beginPath(); g.moveTo(0, 7); g.lineTo(0, -7); g.stroke();
      g.restore();
    }
    g.translate(0, -stemLen);
    for (let i = 0; i < 5; i++) {
      const irregular = .92 + .12 * Math.sin(seed + i * 3.73);
      const plen = (12.2 + 2.2 * Math.sin(seed * .7 + i * 1.93)) * s, pw = (6.5 + .8 * Math.cos(seed + i * 2.4)) * s;
      g.save(); g.rotate(i * TAU / 5 + .08 * Math.sin(seed + i * 2.1));
      g.fillStyle = pal[i % pal.length]; g.strokeStyle = 'rgba(82,59,42,.78)'; g.lineWidth = Math.max(1.1, 1.5 * s);
      g.beginPath(); g.ellipse(0, -plen * .72, pw * irregular, plen, 0, 0, TAU); g.fill(); g.stroke();
      g.restore();
    }
    g.fillStyle = pal[2]; g.strokeStyle = 'rgba(76,57,38,.86)'; g.lineWidth = Math.max(1.1, 1.6 * s);
    g.beginPath(); g.arc(0, 0, 5.8 * s, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = 'rgba(91,69,35,.72)';
    for (let i = 0; i < 4; i++) { const a = i * TAU / 4 + seed; g.beginPath(); g.arc(Math.cos(a) * 2.4 * s, Math.sin(a) * 2.4 * s, 1.05 * s, 0, TAU); g.fill(); }
    g.restore();
  }

  // Une fleur finie ne bouge plus : elle passe dans le cache, redessiné seulement quand une autre finit de pousser.
  function isFinished(f) {
    const g = FP.config.garden;
    return f.age > g.bakedAge && f.size >= f.maxSize * g.bakedSize;
  }

  function drawCache(ctx, state, baseY, finished) {
    const W = Math.max(1, Math.ceil(FP.view.W));
    const list = state.garden.flowers;
    if (list !== cachedList || finished.length !== cachedCount || W !== cachedW) {
      cache.width = W; cache.height = CACHE_H;
      cg.clearRect(0, 0, W, CACHE_H);
      for (const f of finished) drawFlower(cg, f, -CACHE_TOP, f.maxSize, false);
      cachedList = list; cachedCount = finished.length; cachedW = W;
    }
    ctx.drawImage(cache, 0, baseY + CACHE_TOP);
  }

  function draw(ctx, state) {
    const flowers = state.garden.flowers;
    if (!flowers.length) return;
    const baseY = state.world.surfaceY + FP.config.soil.surfaceOffset;
    // Masquage de la v3 (drawFlowerCache) : centre 68 px au-dessus de la base, marge 185 px.
    const cy = baseY - 68, top = state.camera.y, bottom = state.camera.y + state.world.viewH;
    if (cy + 185 < top || cy - 185 > bottom) return;            // parterre hors de l'écran
    const finished = flowers.filter(isFinished);
    if (finished.length) drawCache(ctx, state, baseY, finished);
    for (const f of flowers) if (!isFinished(f)) drawFlower(ctx, f, baseY, f.size, true);
  }

  FP.flowersRender = { draw };
})();
