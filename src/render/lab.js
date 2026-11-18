// render/lab.js — l'Encounter Lab (v5.12.0) : murs de béton neutre (arêtes, fissures, taches de terre ; ni rivets ni tuyaux, pour ne pas
// ressembler aux boss), poches d'argile (ocre, lisse, au bord net et plus clair) et de sable (grain pâle, rides, grains qui volent derrière la
// pointe). Murs et sols peints une fois par circuit dans un calque ; le reste en direct. Par-dessus tout (drawThreats) : les buses de
// l'impulsion, allumées pendant l'annonce, la colonne de gaz qui remonte, et une flèche au bas de l'écran quand la buse annoncée est
// sous l'écran. Rien hors du Lab.
// Lit     : state.{camera.y, time, plant.tip}, state.world.{width, height, viewH, labLevel}, FP.labLevel.soilAt, FP.palette.lab, FP.px (dont layer
//           et blit), FP.bossSkin.spans, FP.labTurretView (tourelles), state.labPulse.shots (impulsion), FP.camera.zoomFrame (bas visible).
// Écrit   : rien dans l'état (la toile reçue ; le calque en cache par circuit et taille de niveau).
// Expose  : FP.labRender.draw(g, state), FP.labRender.drawThreats(g, state).
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

  // Menace : buses (grille au pied de chaque voie d'impulsion, allumée pendant l'annonce), colonnes de gaz, flèche hors écran.
  function drawThreats(g, state) {
    const w = state.world, L = w.labLevel, st = state.labPulse;
    if (L) FP.labTurretView.draw(g, state);   // v5.13.0 : tourelles des modules
    if (!L || !L.circuit.pulse) return;
    const P = FP.palette.lab, cam = FP.px.toArt(state.camera.y), H = Math.ceil(w.viewH / FP.px.SCALE), t = state.time;
    // Bas réellement visible (le cadrage zoome la toile du monde autour de son point focal) : une buse plus bas est hors cadre.
    const f = FP.camera.zoomFrame(state), vis = Math.floor(f ? (f.fy + (w.viewH - f.fy) / f.z) / FP.px.SCALE : H);
    const warned = new Set(st && st.level === L ? st.shots.filter(s => s.warn > 0).map(s => s.lane) : []);
    for (const i of L.circuit.pulse.lanes) {
      const l = L.lanes[i], x0 = FP.px.toArt(l.x0) + 1, x1 = FP.px.toArt(l.x1) - 1, y = FP.px.toArt(l.y1) - cam;
      const lit = warned.has(i);
      if (y >= -4 && y <= vis - 2) {
        FP.px.rect(g, x0, y - 2, x1 - x0, 4, P.concrete[3]);
        for (let x = x0 + 1; x < x1 - 1; x += 3) FP.px.rect(g, x, y - 1, 2, 2, lit ? P.glow : P.crack);
      } else if (warned.has(i) && y > vis - 2) {   // flèche au bas du cadre visible, sur la voie
        const cx = Math.round((x0 + x1) / 2);
        for (let k = 0; k < 4; k++) FP.px.rect(g, cx - k, vis - 6 + k, 2 * k + 1, 1, P.glow);
      }
    }
    if (!st || st.level !== L) return;
    for (const s of st.shots) {
      if (s.solid.off) continue;
      const o = s.solid, hw = o.collision[1][0], hh = o.collision[2][1];
      const xa = FP.px.toArt(o.x - hw), xb = FP.px.toArt(o.x + hw), ya = FP.px.toArt(o.y - hh) - cam, yb = FP.px.toArt(o.y + hh) - cam;
      for (let y = Math.max(0, ya); y < Math.min(H, yb); y++) {
        const k = y + cam, wob = Math.round(Math.sin(k * .35 + t * 9) * 2);
        for (let x = xa + 1 + ((k + Math.floor(t * 20)) % 2); x < xb - 1; x += 2) FP.px.rect(g, x + (x % 4 === 0 ? wob : 0), y, 1, 1, P.gas[(x + k) % 3 === 0 ? 0 : 1]);
      }
      for (let x = xa; x < xb; x += 2) FP.px.rect(g, x, Math.max(0, ya), 2, 1, P.gas[0]);   // le front, plus dense
    }
  }

  FP.labRender = { draw, drawThreats };
})();
