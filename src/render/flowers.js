// render/flowers.js — le parterre : chaque fleur est une pousse éclose, avec le visage de son personnage, en pixels d'art.
// Lit     : state.garden.flowers (x, size, maxSize, age, palette, tilt, character), state.world.{surfaceY,viewH}, state.camera.y,
//           FP.view.W, FP.config.{garden,soil}, FP.px, FP.palette.{flowers,stem}, FP.cast (visage du personnage).
// Écrit   : rien dans l'état (cache des fleurs finies, créé à la première utilisation).
// Expose  : FP.flowersRender.draw(actx, state) (repère d'art, caméra appliquée ici), FP.flowersRender.variant(flower), extent(flower) (purs), CACHE_TOP.
// Ne touche pas au DOM au chargement : testable sous Node.
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  const TAU = FP.TAU;
  const SHAPES = ['round', 'pointy', 'cup', 'double'];
  const CACHE_TOP = 50, CACHE_H = 58;   // le cache couvre 50 pixels d'art au-dessus de la base et 8 en dessous (voir extent)

  // Empreinte 32 bits des données de la fleur (aucun tirage : une même fleur donne toujours la même variante).
  function hash(f) {
    const pal = Math.max(0, FP.config.garden.palettes.indexOf(f.palette));
    let h = 2166136261;
    for (const v of [Math.round(f.x * 10), Math.round(f.tilt * 1000), Math.round(f.maxSize * 1000), pal]) {
      h = Math.imul(h ^ (v & 0xffff), 16777619); h = Math.imul(h ^ (v >>> 16), 16777619);
    }
    h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12; h = Math.imul(h, 0x297a2d39); h ^= h >>> 15;
    return h >>> 0;
  }

  function variant(f) {
    const h = hash(f);
    return {
      shape: SHAPES[h % 4], petals: 5 + ((h >>> 2) % 4), hue: ((h >>> 4) % 25) - 12,
      stemK: .85 + ((h >>> 9) % 31) / 100, leafK: .85 + ((h >>> 14) % 31) / 100
    };
  }

  // Décalage de teinte (degrés) d'une couleur #rrggbb.
  function shiftHue(hex, deg) {
    let [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
    const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
    if (!d || !deg) return hex;
    const s = d / (1 - Math.abs(2 * l - 1));
    let h = max === r ? ((g - b) / d) % 6 : (max === g ? (b - r) / d + 2 : (r - g) / d + 4);
    h = ((h * 60 + deg) % 360 + 360) % 360;
    const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2;
    [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
    return '#' + [r, g, b].map(v => Math.round((v + m) * 255).toString(16).padStart(2, '0')).join('');
  }

  // Dimensions en pixels d'art pour une croissance k (0 à 1) : longueur de tige, distance et rayon des pétales.
  function geometry(f, v, k) {
    const s = f.maxSize, open = Math.min(1, Math.max(0, (k - .35) / .5));
    return { len: Math.round((20 + s * 9) * v.stemK * Math.min(1, k * 1.6)), dist: Math.round((4 + 3 * s) * open + 2), pr: Math.max(1, Math.round((2 + s) * open)) };
  }

  // Hauteur atteinte au-dessus de la base par une fleur épanouie (pétale, rayon ou visage le plus haut, contour compris).
  function extent(f) {
    const v = variant(f), g = geometry(f, v, 1);
    return g.len + Math.max(g.dist + g.pr + (v.shape === 'pointy' ? 3 : 1), 12);   // visage : ±12 (render/cast*.js)
  }

  // Une fleur en pixels d'art, base de tige en (bx, by). k = croissance de 0 à 1.
  function drawFlower(g, f, bx, by, k) {
    const { px, palette } = FP, v = variant(f), st = palette.stem;
    const pal = palette.flowers[Math.max(0, FP.config.garden.palettes.indexOf(f.palette)) % palette.flowers.length];
    const petal = pal.petal.map(c => shiftHue(c, v.hue)), { len, dist, pr } = geometry(f, v, k);
    const tx = bx + Math.round(Math.sin(f.tilt) * len), ty = by - len;
    px.line(g, bx, by, tx, ty, st.outline, 3); px.line(g, bx, by, tx, ty, st.body, 1);
    if (k > .4) {
      const ly = by - Math.round(len * .42 * v.leafK), lx = bx + Math.round(Math.sin(f.tilt) * len * .42 * v.leafK);
      for (const side of [-1, 1]) { px.rect(g, lx + (side < 0 ? -4 : 1), ly - 1, 4, 3, st.outline); px.rect(g, lx + (side < 0 ? -3 : 1), ly - 1, 3, 2, st.leaf); }
    }
    if (k < .35) return;                                    // bourgeon encore fermé : la tige pousse d'abord
    const angles = [];
    for (let i = 0; i < v.petals; i++) angles.push(v.shape === 'cup' ? Math.PI + (i + .5) * Math.PI / v.petals : i * TAU / v.petals + f.tilt);
    const ring = (d, r, col) => { for (const a of angles) px.disc(g, tx + Math.round(Math.cos(a) * d), ty + Math.round(Math.sin(a) * d), r, col); };
    const rays = (extra, col, thick) => { for (const a of angles) px.line(g, tx, ty, tx + Math.round(Math.cos(a) * (dist + pr + extra)), ty + Math.round(Math.sin(a) * (dist + pr + extra)), col, thick); };
    ring(dist, pr + 1, st.outline);
    if (v.shape === 'pointy') rays(2, st.outline, 2);
    ring(dist, pr, petal[1]);
    if (v.shape === 'pointy') rays(1, petal[1], 1);
    if (v.shape === 'double') ring(Math.max(2, dist - 3), Math.max(1, pr - 1), petal[0]);
    else for (const a of angles) px.rect(g, tx + Math.round(Math.cos(a) * (dist + 1)) - 1, ty + Math.round(Math.sin(a) * (dist + 1)) - 1, 1, 1, petal[0]);
    // Cœur : la tête de la pousse, avec son visage de fleur (même personnage, plus abruti).
    px.disc(g, tx, ty, 7, st.outline);
    px.disc(g, tx, ty, 6, pal.heart);
    FP.cast.get(f.character).flower(g, tx, ty, pal.heart);
  }

  // Une fleur finie ne bouge plus : elle passe dans le cache, redessiné seulement quand une autre finit de pousser.
  function isFinished(f) {
    const g = FP.config.garden;
    return f.age > g.bakedAge && f.size >= f.maxSize * g.bakedSize;
  }

  let cache = null, cachedList = null, cachedCount = -1, cachedW = -1;

  function drawCache(actx, state, by, finished) {
    const { px } = FP, W = Math.max(1, Math.ceil(FP.view.W / px.SCALE)), list = state.garden.flowers;
    if (!cache) cache = document.createElement('canvas');
    if (list !== cachedList || finished.length !== cachedCount || W !== cachedW) {
      cache.width = W; cache.height = CACHE_H;
      const g = cache.getContext('2d');
      g.clearRect(0, 0, W, CACHE_H);
      for (const f of finished) drawFlower(g, f, px.toArt(f.x), CACHE_TOP, 1);
      cachedList = list; cachedCount = finished.length; cachedW = W;
    }
    actx.drawImage(cache, 0, by - CACHE_TOP);
  }

  function draw(actx, state) {
    const flowers = state.garden.flowers;
    if (!flowers.length) return;
    const { px } = FP, baseY = state.world.surfaceY + FP.config.soil.surfaceOffset;
    // Masquage de la v3 (drawFlowerCache) : centre 68 px au-dessus de la base, marge 185 px.
    const cy = baseY - 68, top = state.camera.y, bottom = state.camera.y + state.world.viewH;
    if (cy + 185 < top || cy - 185 > bottom) return;
    const by = px.toArt(baseY) - px.toArt(state.camera.y);
    const finished = flowers.filter(isFinished);
    if (finished.length) drawCache(actx, state, by, finished);
    for (const f of flowers) if (!isFinished(f)) drawFlower(actx, f, px.toArt(f.x), by, f.size / f.maxSize);
  }

  FP.flowersRender = { draw, variant, extent, CACHE_TOP };
})();
