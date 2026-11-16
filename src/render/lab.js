// render/lab.js — l'Encounter Lab (v5.12.0) : murs de béton neutre (arêtes, fissures, taches de terre ; ni rivets ni tuyaux, pour ne pas
// ressembler aux boss), poches d'argile (ocre, lisse, au bord net et plus clair) et de sable (grain pâle, rides, grains qui volent derrière la
// pointe). Murs et sols peints une fois par circuit dans un calque ; le reste en direct. Rien hors du Lab.
// Lit     : state.{camera.y, time, plant.tip}, state.world.{width, height, viewH, labLevel}, FP.labLevel.soilAt, FP.palette.lab, FP.px (dont layer
//           et blit), FP.bossSkin.spans.
// Écrit   : rien dans l'état (la toile reçue ; le calque en cache par circuit et taille de niveau).
// Expose  : FP.labRender.draw(g, state).
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};

  const hash = (a, b) => { let h = (Math.imul(a | 0, 0x9e3779b1) ^ Math.imul(b | 0, 0x85ebca6b)) >>> 0; h ^= h >>> 15; return (Math.imul(h, 0x2c1b3c6d) >>> 0) / 4294967296; };
  const art = (poly, cam) => poly.map(([x, y]) => [FP.px.toArt(x), FP.px.toArt(y) - cam]);

  // Sol : aplat de base, texture (argile lisse, sable en grain avec des rides), puis un bord net et clair.
  function soil(g, z, cam, P, H) {
    const C = P[z.kind], pts = art(z.poly, cam);
    FP.bossSkin.spans(pts, 0, (y, a, b) => {
      if (H !== null && (y < -1 || y > H + 1)) return;
      FP.px.rect(g, a, y, b - a, 1, C[1]);
      for (let x = a + 1; x < b - 1; x++) {
        const r = hash(x, y + cam);
        if (z.kind === 'sable' ? r < .16 || (y + cam + Math.round(x * .5)) % 6 === 0 : r < .05) FP.px.rect(g, x, y, 1, 1, C[2]);
      }
      FP.px.rect(g, a, y, 1, 1, C[0]); FP.px.rect(g, b - 1, y, 1, 1, C[0]);
    });
    const ys = pts.map(p => p[1]), xs = pts.map(p => p[0]);
    FP.px.rect(g, Math.min(...xs), Math.min(...ys), Math.max(...xs) - Math.min(...xs), 1, C[0]);
    FP.px.rect(g, Math.min(...xs), Math.max(...ys) - 1, Math.max(...xs) - Math.min(...xs), 1, C[0]);
  }

  // Mur : béton (deux teintes en plaques), arêtes sombres, fissures et taches de terre tirées d'un hasard fixé par la position.
  function wall(g, poly, cam, P, H) {
    const pts = art(poly, cam);
    FP.bossSkin.spans(pts, 0, (y, a, b) => {
      if (H !== null && (y < -1 || y > H + 1)) return;
      const wy = y + cam;
      FP.px.rect(g, a, y, b - a, 1, P.concrete[1]);
      for (let x = a + 1; x < b - 1; x++) {
        const r = hash(x, wy);
        if ((Math.floor(x / 14) + Math.floor(wy / 10)) % 2 === 0 && r < .5) FP.px.rect(g, x, y, 1, 1, P.concrete[2]);
        else if (r < .03) FP.px.rect(g, x, y, 1, 1, P.dirt);
        else if (r > .985) FP.px.rect(g, x, y, 1, 1, P.crack);
      }
      FP.px.rect(g, a, y, 1, 1, P.concrete[3]); FP.px.rect(g, b - 1, y, 1, 1, P.concrete[3]);
    });
    FP.bossSkin.spans(pts, 1, (y, a, b) => { if (hash(Math.round(a), y + cam) < .04) FP.px.rect(g, a + 1, y, Math.min(4, b - a - 2), 1, P.concrete[0]); });   // éclats clairs sur l'arête
  }

  function paint(g, L, cam, P, H) {
    for (const z of L.soils) soil(g, z, cam, P, H);
    for (const w of L.walls) wall(g, w, cam, P, H);
  }

  let layer = null, layerKey = '';
  function draw(g, state) {
    const w = state.world, L = w.labLevel;
    if (!L) return;
    const P = FP.palette.lab, cam = FP.px.toArt(state.camera.y), H = Math.ceil(w.viewH / FP.px.SCALE), key = [L.circuit.id, w.width, w.height].join('|');
    if (layerKey !== key) {
      layer = FP.px.layer(Math.ceil(w.width / FP.px.SCALE), Math.ceil(w.height / FP.px.SCALE));
      if (layer) paint(layer.g, L, 0, P, null);
      layerKey = key;
    }
    if (layer) FP.px.blit(g, layer, cam, H + 1); else paint(g, L, cam, P, H);
    // Grains de sable qui volent derrière la pointe.
    const tip = state.plant.tip;
    if (tip && FP.labLevel.soilAt(w, tip.x, tip.y) === 'sable') {
      for (let k = 0; k < 6; k++) {
        const ph = (state.time * 3 + k / 6) % 1, x = FP.px.toArt(tip.x) + Math.round(Math.sin(k * 2.3 + state.time * 5) * 6 * ph), y = FP.px.toArt(tip.y) - cam + Math.round(4 + 10 * ph);
        FP.px.rect(g, x, y, 1, 1, P.sable[ph < .5 ? 0 : 2]);
      }
    }
  }

  FP.labRender = { draw };
})();
