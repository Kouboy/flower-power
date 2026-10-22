// render/faces.js — briques de visage communes (v4.4.0) : gros yeux globuleux, grandes bouches, une forme par humeur.
// Lit     : FP.px, FP.palette.hero.
// Écrit   : uniquement les pixels du contexte reçu.
// Expose  : FP.faces.{EY, EX, MOODS, ball, pupil, cross, lid, eyes, mouth, sweat}. Coordonnées relatives au centre de la tête.
// Les personnages (render/cast*.js) remplacent les yeux ou la bouche qui les distinguent ; le reste vient d'ici.
// Ne touche pas au DOM : testable sous Node.
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  const EY = -3, EX = [-3, 3];   // centres des deux yeux : ils débordent en haut de la tête
  const MOODS = ['calm', 'focus', 'graze', 'alarm', 'toxic', 'shield', 'dead'];

  const rect = (g, x, y, w, h, c) => FP.px.rect(g, x, y, w, h, c);
  const dot = (g, pts, c) => { for (const [x, y] of pts) rect(g, x, y, 1, 1, c); };
  // Demi-largeur de la rangée dy d'un disque de rayon r (même règle que FP.px.disc).
  const span = (r, dy) => { let h = 0; while ((h + 1) * (h + 1) + dy * dy <= r * r + r) h++; return h; };

  // Œil globuleux en (x, y) : contour r + 1, blanc r.
  function ball(g, x, y, r = 2) { const c = FP.palette.hero; FP.px.disc(g, x, y, r + 1, c.outline); FP.px.disc(g, x, y, r, c.eye); }
  function pupil(g, x, y, w = 2, h = 2) { rect(g, x, y, w, h, FP.palette.hero.pupil); }
  // Croix 5 × 5 centrée en (x, y).
  function cross(g, x, y) {
    for (let i = -2; i <= 2; i++) dot(g, [[x + i, y + i], [x + i, y - i]], FP.palette.hero.pupil);
  }
  // Paupière de peau sur les n rangées du haut d'un œil de rayon r centré en (x, y), trait de paupière dessous.
  function lid(g, x, y, n, skin, r = 2) {
    for (let i = 0; i < n; i++) { const dy = -r + i, h = span(r, dy); rect(g, x - h, y + dy, 2 * h + 1, 1, skin); }
    const dy = Math.min(r, -r + n), h = span(r, dy);
    rect(g, x - h - 1, y + dy, 2 * h + 3, 1, FP.palette.hero.outline);
  }

  // Deux yeux selon l'humeur. o : { gaze: {x, y}, blink, dizzy, t, cause, skin }.
  function eyes(g, ax, ay, mood, o = {}) {
    const c = FP.palette.hero, skin = o.skin || c.skin, y = ay + EY;
    if (mood === 'alarm') { for (const dx of EX) { ball(g, ax + dx, y - 1, 3); pupil(g, ax + dx, y - 1, 1, 1); } return; }
    if (mood === 'graze') {                                       // plissés : chevrons > < de 2 px
      for (const dx of EX) {
        const x = ax + dx, s = dx < 0 ? 1 : -1;
        for (const k of [0, 1]) dot(g, [[x - 2 * s - k * s, y - 2], [x - s - k * s, y - 1], [x - k * s, y], [x - s - k * s, y + 1], [x - 2 * s - k * s, y + 2]], c.outline);
      }
      return;
    }
    for (const dx of EX) ball(g, ax + dx, y);
    if (mood === 'dead') {
      if (o.cause === 'melt') for (const dx of EX) { lid(g, ax + dx, y, 2, skin); pupil(g, ax + dx - 1, y + 1, 1, 1); pupil(g, ax + dx + 1, y + 1, 1, 1); }
      else for (const dx of EX) cross(g, ax + dx, y);
      return;
    }
    if (o.blink) { for (const dx of EX) lid(g, ax + dx, y, 4, skin); return; }
    if (mood === 'toxic') {
      if (o.dizzy) {                                              // pupilles qui tournent, en sens contraire
        const k = Math.floor((o.t || 0) * 8) % 4, p = [[0, 0], [1, 0], [1, 1], [0, 1]][k];
        pupil(g, ax - 5 + 2 * p[0], y - 2 + 2 * p[1]); pupil(g, ax + 3 - 2 * p[0], y - 2 + 2 * (1 - p[1]));
      } else { pupil(g, ax - 3, y - 2); pupil(g, ax + 3, y + 1); }
      return;
    }
    // Regard : vers le côté où la pousse tourne ; tout droit, les pupilles se rapprochent (air concentré sur la route).
    const gx = (o.gaze && o.gaze.x) || 0, gy = (o.gaze && o.gaze.y) || 0;
    const side = gx > .3 ? 1 : (gx < -.3 ? -1 : 0), dy = gy > .35 ? 1 : 0;
    pupil(g, ax - 3 + (side < 0 ? -1 : 0), y + dy); pupil(g, ax + 2 + (side > 0 ? 1 : 0), y + dy);
    if (mood === 'focus') {
      for (const dx of EX) lid(g, ax + dx, y, 1, skin);
      rect(g, ax - 6, y - 4, 3, 1, c.brow); rect(g, ax - 3, y - 3, 2, 1, c.brow); rect(g, ax + 4, y - 4, 3, 1, c.brow); rect(g, ax + 1, y - 3, 2, 1, c.brow);
    } else if (mood === 'shield') for (const dx of EX) lid(g, ax + dx, y, 2, skin);   // mi-closes : sûr de lui
  }

  // Grande bouche selon l'humeur (de x − 4 à x + 3).
  function mouth(g, ax, ay, mood, o = {}) {
    const c = FP.palette.hero, K = c.outline, m = (x, y, w, h = 1, col = c.mouth) => rect(g, ax + x, ay + y, w, h, col);
    if (mood === 'dead' && o.cause === 'melt') { m(-3, 3, 6, 1, K); m(-1, 4, 1, 2); m(1, 4, 1, 3); return; }   // bouche qui coule
    if (mood === 'dead') { m(-3, 3, 6, 1, K); m(-2, 4, 1, 1, c.tongue); return; }
    if (mood === 'alarm') { m(-2, 2, 4, 4, K); m(-1, 3, 2, 2); m(-1, 4, 2, 1, c.tongue); return; }
    if (mood === 'graze') { m(-4, 2, 8, 3, K); m(-3, 3, 6, 1, c.teeth); dot(g, [[ax - 1, ay + 3], [ax + 1, ay + 3]], K); return; }
    if (mood === 'toxic') { dot(g, [[-4, 3], [-3, 2], [-2, 3], [-1, 2], [0, 3], [1, 2], [2, 3], [3, 2]].map(([x, y]) => [ax + x, ay + y]), K); m(0, 4, 2, 2, c.tongue); return; }
    if (mood === 'focus') { m(-3, 3, 6, 1, K); m(3, 2, 1, 1, K); return; }
    if (mood === 'shield') { m(-3, 3, 5, 1, K); m(2, 2, 1, 1, K); m(3, 1, 1, 1, K); return; }   // sourire en coin
    m(-4, 2, 1, 1, K); m(3, 2, 1, 1, K); m(-3, 3, 6, 2, K); m(-2, 3, 4, 1); m(-1, 4, 2, 1, c.tongue);   // calme : grand sourire
  }

  function sweat(g, ax, ay) { const c = FP.palette.hero; rect(g, ax + 8, ay - 7, 1, 1, c.sweat); rect(g, ax + 8, ay - 6, 2, 2, c.sweat); }

  FP.faces = { EY, EX, MOODS, ball, pupil, cross, lid, eyes, mouth, sweat };
})();
