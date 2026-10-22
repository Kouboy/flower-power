// render/soil.js — pelouse et terre en pixels d'art : touffes d'herbe, trois strates tramées, détails clairsemés.
// Lit     : world.{width,height,surfaceY,lawnVariant}, state.{seed,level}, state.camera.y, FP.view.{W,art}, FP.palette.{strata,strataBounds,lawn},
//           FP.config.soil.surfaceOffset.
// Écrit   : rien dans l'état (cache créé à la première utilisation).
// Expose  : FP.soil.draw(actx, state) — repère d'art, la caméra est appliquée ici ; FP.soil.surfaceTop(world) (repère monde) ;
//           FP.soil.grainAt(x, y, seed) — grain noir de la terre (pur, testé).
// Règles de lisibilité (spec §4) : contraste bas, aucun contour, détails rares et proches de leur strate, ni vert acide ni violet.
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};

  let cache = null, cacheKey = '';
  const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
  const TRANSITION = 6;          // rangées tramées entre deux teintes d'une même strate
  const STRATA_TRANSITION = 16;  // rangées tramées entre deux strates
  const WILDFLOWERS = ['#e8d890', '#e0a0b0', '#f0e8d0'];
  const GRAIN = [10, 6, 5];      // #0a0605 : le même noir que le halo tramé autour des obstacles
  const GRAIN_CELL = 32;         // une tache de grain par case de 32 × 32 pixels d'art (en moyenne)

  const surfaceTop = (world) => world.surfaceY + FP.config.soil.surfaceOffset;

  // Pseudo-aléatoire stable (mulberry32) : la même terre pour le même niveau, sans toucher à state.rng.
  function rng(seed) {
    let a = seed >>> 0;
    return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  // Empreinte stable de trois entiers (finaliseur de MurmurHash3).
  function mix(a, b, c) {
    let h = (Math.imul(a, 0x9e3779b1) + Math.imul(b, 0x85ebca77) + Math.imul(c, 0xc2b2ae3d)) | 0;
    h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
    return h >>> 0;
  }

  // Grain noir par petites touches (pur, testé) : des taches tramées comme le halo des obstacles, plus denses au centre,
  // et quelques grains isolés. (x, y) en pixels d'art ; seed : graine du niveau.
  function grainAt(x, y, seed) {
    const cx = Math.floor(x / GRAIN_CELL), cy = Math.floor(y / GRAIN_CELL), h = mix(cx, cy, seed);
    if (h % 100 < 85) {
      const r = 3 + (h >>> 7) % 5, px = cx * GRAIN_CELL + 7 + (h >>> 10) % (GRAIN_CELL - 14), py = cy * GRAIN_CELL + 7 + (h >>> 15) % (GRAIN_CELL - 14);
      const d = Math.hypot(x - px, y - py);
      if (d <= r && BAYER[y & 3][x & 3] < 16 * .7 * (1 - d / r)) return true;
    }
    return mix(x, y, seed + 1) % 1000 < 20;
  }

  const hex = (c) => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));

  // Teintes de haut en bas : chaque strate, de sa teinte claire à sa teinte sombre.
  function tones() {
    const s = FP.palette.strata;
    return [s.humus, s.clay, s.stone].map(t => t.slice().reverse());
  }

  // Couleur d'un pixel de terre : strate selon la profondeur (bord ondulé), 4 bandes par strate,
  // tramage seulement sur les dernières rangées de chaque bande.
  function earthIndex(x, y, top, bottom) {
    const b = FP.palette.strataBounds, H = bottom - top;
    const wave = Math.sin(x * .09) * 2 + Math.sin(x * .031 + 1.3) * 3;
    const d = Math.max(0, Math.min(.9999, (y + wave - top) / H));
    const edges = [0, b.humus, b.clay, 1];
    let g = 0; while (d >= edges[g + 1]) g++;
    const f = (d - edges[g]) / (edges[g + 1] - edges[g]) * 4, band = Math.min(3, Math.floor(f));
    const rows = H * (edges[g + 1] - edges[g]) / 4, into = (f - band) * rows, zone = Math.min(band === 3 && g < 2 ? STRATA_TRANSITION : TRANSITION, rows);
    let next = into > rows - zone ? (into - (rows - zone)) / zone : 0;
    let gi = g, bi = band;
    if (next > 0 && BAYER[y & 3][x & 3] < next * 16) { bi++; if (bi > 3) { bi = 0; gi = Math.min(2, g + 1); if (gi === g) bi = 3; } }
    return gi * 4 + bi;   // index dans la liste à plat des 12 teintes
  }

  function build(w, hArt, topArt, lawnVariant, seed) {
    const { px, palette } = FP;
    cache = cache || document.createElement('canvas');
    cache.width = w; cache.height = hArt;
    const g = cache.getContext('2d');
    g.clearRect(0, 0, w, hArt);

    // Terre : calculée pixel par pixel une seule fois (ImageData), puis mise en cache.
    const groups = tones(), rgb = groups.flat().map(hex);
    const img = g.createImageData(w, hArt - topArt), data = img.data;
    for (let y = topArt; y < hArt; y++) {
      for (let x = 0; x < w; x++) {
        const [r, gg, bb] = y > topArt + 3 && grainAt(x, y, seed) ? GRAIN : rgb[earthIndex(x, y, topArt, hArt)];
        const i = ((y - topArt) * w + x) * 4;
        data[i] = r; data[i + 1] = gg; data[i + 2] = bb; data[i + 3] = 255;
      }
    }
    g.putImageData(img, 0, topArt);

    // Détails clairsemés (≈ 1 par case de 24 × 24) : cailloux, racines, os — une teinte voisine de leur strate, sans contour.
    const rnd = rng(seed);
    for (let cy = topArt + 6; cy < hArt - 4; cy += 24) {
      for (let cx = 0; cx < w; cx += 24) {
        if (rnd() < .15) continue;
        const x = cx + Math.floor(rnd() * 20), y = cy + Math.floor(rnd() * 20);
        const d = (y - topArt) / (hArt - topArt), b = palette.strataBounds;
        const gi = d < b.humus ? 0 : (d < b.clay ? 1 : 2), t = groups[gi];
        const kind = rnd();
        if (gi < 2 && kind < .35) {                                   // racine fine
          let rx = x, ry = y;
          for (let k = 0; k < 4 + Math.floor(rnd() * 4); k++) { px.rect(g, rx, ry, 1, 1, t[3]); rx += rnd() < .5 ? -1 : 1; ry += 1; }
        } else if (gi === 2 && kind < .12) {                          // os
          px.rect(g, x, y, 4, 1, t[0]); px.rect(g, x - 1, y - 1, 1, 3, t[0]); px.rect(g, x + 4, y - 1, 1, 3, t[0]);
        } else {                                                      // caillou
          const s = 1 + Math.floor(rnd() * 2);
          px.rect(g, x, y, s + 1, s, t[1]); px.rect(g, x, y, s, 1, t[0]);
        }
      }
    }

    // Frange sous l'herbe : bord irrégulier d'humus sombre.
    const lawn = palette.lawn[lawnVariant % palette.lawn.length];
    for (let x = 0; x < w; x++) {
      const depth = 2 + ((Math.sin(x * .37) + Math.sin(x * .13 + 2)) > .6 ? 1 : 0);
      px.rect(g, x, topArt, 1, depth, groups[0][3]);
    }
    // Pelouse : un tapis de deux rangées puis des touffes de brins de 2 à 6 pixels, quelques fleurs sauvages.
    px.rect(g, 0, topArt - 2, w, 2, lawn[1]);
    for (let x = 0; x < w; x += 1 + Math.floor(rnd() * 3)) {
      const hgt = 2 + Math.floor(rnd() * 5), lean = rnd() < .5 ? 0 : (rnd() < .5 ? -1 : 1);
      px.line(g, x, topArt - 2, x + lean, topArt - 2 - hgt, lawn[2 + (hgt > 4 ? 1 : 0)]);
      px.rect(g, x, topArt - 2, 1, 1, lawn[0]);
      if (rnd() < .025) px.rect(g, x + lean, topArt - 3 - hgt, 1, 1, WILDFLOWERS[Math.floor(rnd() * WILDFLOWERS.length)]);
    }
  }

  // Seule la tranche visible du cache est recopiée.
  function draw(actx, state) {
    const { px } = FP, world = state.world;
    if (!(world.width > 0 && world.height > 0)) return;
    const w = Math.ceil(Math.max(world.width, FP.view.W) / px.SCALE), hArt = Math.ceil(world.height / px.SCALE);
    const topArt = px.toArt(surfaceTop(world));
    // Graine du niveau (partie + numéro de niveau) : chaque niveau a sa propre terre, détails et grain compris.
    const seed = mix(state.seed | 0, state.level | 0, world.lawnVariant);
    const key = w + '|' + hArt + '|' + topArt + '|' + seed;
    if (key !== cacheKey) { build(w, hArt, topArt, world.lawnVariant, seed); cacheKey = key; }
    const oy = px.toArt(state.camera.y), viewH = FP.view.art.h;
    const y0 = Math.max(0, oy - 8), y1 = Math.min(cache.height, oy + viewH + 8);
    if (y1 > y0) actx.drawImage(cache, 0, y0, cache.width, y1 - y0, 0, y0 - oy, cache.width, y1 - y0);
  }

  FP.soil = { draw, surfaceTop, grainAt };
})();
