// render/powerups.js — récompenses de flyover (naissance, glyphes) et membrane du bouclier organique, en pixels d'art.
// Lit     : state.time, state.mode, state.world.{bonuses,viewH}, state.camera.y, state.plant.tip, state.power.shield,
//           FP.config.soil.viewPad, FP.px.
// Écrit   : rien (le canvas uniquement).
// Expose  : FP.powerupsRender.drawBonuses(actx, state), FP.powerupsRender.drawShield(actx, state) — repère d'art,
//           caméra appliquée ici (drawShield est appelé par render/plant.js, sous la tête du héros).
// Porté de la v3.43.16 (drawBonuses, drawBonusManifestation, drawBonusGlyph, drawAssetSource/Spore/Pollen, drawOrganicShield).
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  const TAU = FP.TAU;
  const { clamp } = FP.math;
  const INK = '#141a10';
  const TINT = { water: '#9de7ff', spore: '#cfff68', pollen: '#fff0a2' };

  // Goutte prise entre deux racines : contour, corps bleu, ombre, reflet.
  function drawSource(g, x, y) {
    const { px } = FP;
    px.line(g, x - 8, y - 7, x - 7, y + 7, '#4e3925', 2); px.line(g, x + 8, y - 7, x + 7, y + 7, '#4e3925', 2);
    px.rect(g, x - 6, y + 4, 13, 3, '#3d2e20');
    px.disc(g, x, y + 1, 5, INK); px.line(g, x, y - 7, x, y - 3, INK, 3);
    px.disc(g, x, y + 1, 4, '#7ee0f3'); px.rect(g, x, y - 5, 1, 3, '#7ee0f3');
    px.rect(g, x - 3, y + 2, 7, 2, '#2b8ba0'); px.rect(g, x - 2, y - 1, 2, 2, '#e9ffff');
  }

  // Spore : chapeau crème moucheté, pied, filaments qui tournent.
  function drawSpore(g, x, y, t) {
    const { px } = FP;
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + t * .75; px.rect(g, x + Math.round(Math.cos(a) * 10), y + 6 + Math.round(Math.sin(a) * 4), 1, 1, '#dcffc4'); }
    px.rect(g, x - 3, y, 7, 8, INK); px.rect(g, x - 2, y, 5, 7, '#ddd4b8');
    for (let dy = -6; dy <= 0; dy++) { const h = Math.round(Math.sqrt(Math.max(0, 1 - (dy / 6) ** 2)) * 8); px.rect(g, x - h - 1, y + dy - 1, 2 * h + 3, 1, INK); }
    for (let dy = -5; dy <= 0; dy++) { const h = Math.round(Math.sqrt(Math.max(0, 1 - (dy / 6) ** 2)) * 7); px.rect(g, x - h, y + dy - 1, 2 * h + 1, 1, '#efe7d3'); }
    for (const [dx, dy] of [[-4, -4], [0, -6], [4, -4], [-1, -2], [5, -2]]) px.rect(g, x + dx, y + dy, 2, 1, '#95bf4f');
  }

  // Pollen : bouton jaune entre deux feuilles, grains qui tournent autour.
  function drawPollen(g, x, y, t) {
    const { px } = FP;
    px.line(g, x, y + 9, x, y, '#253612', 2);
    px.rect(g, x - 6, y + 3, 5, 3, '#203010'); px.rect(g, x - 5, y + 3, 4, 2, '#4d7a33');
    px.rect(g, x + 2, y + 3, 5, 3, '#203010'); px.rect(g, x + 2, y + 3, 4, 2, '#4d7a33');
    px.disc(g, x, y - 3, 5, '#261913'); px.disc(g, x, y - 3, 4, '#f0d65a'); px.disc(g, x, y - 3, 1, '#fff0a0');
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + t * .8; px.rect(g, x + Math.round(Math.cos(a) * 7), y - 3 + Math.round(Math.sin(a) * 5), 1, 1, '#ffeb78'); }
  }

  function drawGlyph(g, b, x, y, t) {
    const bob = b.forming > 0 ? 0 : Math.round(Math.sin(t * 3 + b.phase));
    if (b.type === 'water') drawSource(g, x, y + bob);
    else if (b.type === 'spore') drawSpore(g, x, y + bob, t);
    else drawPollen(g, x, y + bob, t);
  }

  // Filament qui semble extraire la récompense de l'obstacle puis la condense devant la pousse.
  function drawForming(g, b, oy, t) {
    const { px } = FP, p = clamp(1 - b.forming / Math.max(.01, b.formMax), 0, 1);
    const ox = b.originX, oyw = b.originY, bx = (ox + b.x) * .5 + (b.x - ox) * .08, by = (oyw + b.y) * .5 - 18;
    const at = (u) => { const m = 1 - u; return [px.toArt(m * m * ox + 2 * m * u * bx + u * u * b.x), px.toArt(m * m * oyw + 2 * m * u * by + u * u * b.y) - oy]; };
    for (let i = 0; i <= 16; i += 2) { const [x, y] = at(i / 16); px.rect(g, x, y, 1, 1, '#a8d070'); }
    for (let i = 0; i < 5; i++) {
      const u = clamp(p * 1.35 - i * .13, 0, 1);
      if (u > 0) { const [x, y] = at(u); px.disc(g, x, y, u > .6 ? 1 : 0, TINT[b.type]); }
    }
    const cx = px.toArt(b.x), cy = px.toArt(b.y) - oy;
    px.ring(g, cx, cy, Math.round(12 * (1 - p) + 4), TINT[b.type]);
    if (p > .55) drawGlyph(g, b, cx, cy, t);
  }

  function drawBonuses(g, state) {
    const { px } = FP, oy = px.toArt(state.camera.y), t = state.time;
    const pad = FP.config.soil.viewPad + 100, top = state.camera.y - pad, bottom = state.camera.y + state.world.viewH + pad;
    for (const b of state.world.bonuses) {
      if (b.y < top || b.y > bottom) continue;
      if (b.forming > 0) { drawForming(g, b, oy, t); continue; }
      const cx = px.toArt(b.x), cy = px.toArt(b.y) - oy;
      // Poche lumineuse tramée autour de la récompense.
      for (let y = -14; y <= 14; y++) for (let x = -14; x <= 14; x++) {
        const d = x * x + y * y;
        if (d < 196 && d > 64 && ((x + y * 3 + Math.floor(t * 4)) & 7) === 0) px.rect(g, cx + x, cy + y, 1, 1, TINT[b.type]);
      }
      drawGlyph(g, b, cx, cy, t);
    }
  }

  // Membrane organique : anneau qui ondule, voile tramé, trois nervures, un reflet.
  function drawShield(g, state) {
    const { px } = FP, tip = state.plant.tip, t = state.time;
    if (state.mode !== 'playing' || !tip || !state.power.shield) return;
    const ax = px.toArt(tip.x), ay = px.toArt(tip.y) - px.toArt(state.camera.y) - 3;
    const r = 12 + Math.round(.5 + .5 * Math.sin(t * 4.2));
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
      const d = x * x + y * y;
      if (d <= r * r + r && d > (r - 3) * (r - 3) && ((x + y + Math.floor(t * 6)) & 3) === 0) px.rect(g, ax + x, ay + y, 1, 1, '#8ee0c2');
    }
    for (let i = 0; i < 24; i++) {
      const an = i * TAU / 24, wob = 1 + Math.sin(an * 3 + t * 2) * .05;
      px.rect(g, ax + Math.round(Math.cos(an) * r * wob), ay + Math.round(Math.sin(an) * r * wob * .92), 1, 1, '#c8fde2');
    }
    for (let i = 0; i < 3; i++) { const an = -1.1 + i * .9; px.line(g, ax + Math.round(Math.cos(an) * 4), ay + Math.round(Math.sin(an) * 4), ax + Math.round(Math.cos(an) * (r - 3)), ay + Math.round(Math.sin(an) * (r - 3)), '#a8f0d0'); }
    px.rect(g, ax - Math.round(r * .45), ay - Math.round(r * .55), 2, 3, '#effff2');
  }

  FP.powerupsRender = { drawBonuses, drawShield };
})();
