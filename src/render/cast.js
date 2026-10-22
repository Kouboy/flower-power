// render/cast.js — le casting des pousses (v4.4.0) : registre et personnages 1 à 8 (suite dans render/cast2.js).
// Lit     : FP.px, FP.faces, FP.palette.{hero, cast}.
// Écrit   : uniquement les pixels du contexte reçu.
// Expose  : FP.cast.define(def), FP.cast.get(id), FP.cast.pen(g, ax, ay) (outils de dessin relatifs, pour cast2.js).
// def = { id, tip? (pointe du bourgeon, vrai par défaut), back?, eyes?, mouth?, front?, flower } ; les couches reçoivent
// (g, ax, ay, mood, o) — voir FP.hero.paint — et flower(g, ax, ay, heart) dessine le visage sur le cœur de la fleur.
// Dessins d'après docs/art/maquette-visages-1-7.html ; tout tient dans ±12 pixels autour du centre.
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  const defs = {};
  const define = (def) => { defs[def.id] = def; };
  const get = (id) => defs[id];

  // Outils relatifs au centre (ax, ay) : rectangle, disque, points, anneau.
  function pen(g, ax, ay) {
    return {
      R: (x, y, w, h, c) => FP.px.rect(g, ax + x, ay + y, w, h, c),
      D: (x, y, r, c) => FP.px.disc(g, ax + x, ay + y, r, c),
      P: (pts, c) => { for (const [x, y] of pts) FP.px.rect(g, ax + x, ay + y, 1, 1, c); },
      O: (x, y, r, c) => FP.px.ring(g, ax + x, ay + y, r, c, 1)
    };
  }
  const H = () => FP.palette.hero, C = () => FP.palette.cast, F = FP.faces;
  const calmish = (mood, o) => (mood === 'calm' || mood === 'focus' || mood === 'shield') && !o.blink;

  define({ id: 'hippie',                                          // bandeau, paupières lourdes, yeux injectés
    back(g, ax, ay) { const { R } = pen(g, ax, ay), c = C(); R(-6, -7, 13, 2, c.band); R(-2, -7, 1, 1, c.bandDot); R(6, -5, 1, 3, c.band); R(7, -4, 1, 3, c.band); },
    eyes(g, ax, ay, mood, o) {
      F.eyes(g, ax, ay, mood, o);
      if (mood !== 'calm' || o.blink) return;
      const { R } = pen(g, ax, ay);
      for (const x of F.EX) { F.lid(g, ax + x, ay + F.EY, 2, o.skin); R(x - 2, F.EY + 1, 1, 1, C().red); R(x + 2, F.EY + 1, 1, 1, C().red); }
    },
    flower(g, ax, ay, heart) {
      const { R } = pen(g, ax, ay), c = C();
      R(-6, -7, 13, 2, c.band); R(6, -5, 1, 3, c.band);
      for (const x of F.EX) F.ball(g, ax + x, ay + F.EY);
      F.pupil(g, ax - 5, ay + F.EY - 1); F.pupil(g, ax + 4, ay + F.EY + 1);   // pupilles qui divergent
      for (const x of F.EX) F.lid(g, ax + x, ay + F.EY, 1, heart);
      F.mouth(g, ax, ay, 'calm');
    } });

  // Bouche à deux énormes incisives.
  function bunnyTeeth(g, ax, ay) {
    const { R } = pen(g, ax, ay), K = H().outline, T = H().teeth;
    R(-3, 2, 6, 1, K); R(-2, 3, 4, 3, K); R(-2, 3, 2, 2, T); R(1, 3, 2, 2, T); R(0, 3, 1, 3, K);
  }
  // Yeux qui louchent vers le nez.
  function crossEyed(g, ax, ay) { for (const x of F.EX) F.ball(g, ax + x, ay + F.EY); F.pupil(g, ax - 2, ay + F.EY); F.pupil(g, ax + 1, ay + F.EY); }

  define({ id: 'lapin',
    mouth: bunnyTeeth,
    flower(g, ax, ay) { const { R } = pen(g, ax, ay); crossEyed(g, ax, ay); bunnyTeeth(g, ax, ay); R(3, 3, 1, 4, C().drool); R(3, 7, 1, 1, C().drool); } });

  // Paupière de peau sur les n rangées du haut d'un œil de rayon r.
  function bigLid(g, ax, ay, x, y, r, n, skin) {
    const span = (dy) => { let h = 0; while ((h + 1) * (h + 1) + dy * dy <= r * r + r) h++; return h; };
    for (let i = 0; i < n; i++) { const dy = -r + i, h = span(dy); FP.px.rect(g, ax + x - h, ay + y + dy, 2 * h + 1, 1, skin); }
    const dy = Math.min(r, -r + n), h = span(dy);
    FP.px.rect(g, ax + x - h - 1, ay + y + dy, 2 * h + 3, 1, H().outline);
  }

  define({ id: 'cyclope',                                         // un seul œil énorme
    eyes(g, ax, ay, mood, o) {
      const { R, P } = pen(g, ax, ay), y = F.EY - 1;
      if (mood === 'graze') { for (const k of [0, 1]) P([[-3, y - 1 + k], [-2, y + k], [-1, y + 1 + k], [0, y + 1 + k], [1, y + 1 + k], [2, y + k], [3, y - 1 + k]], H().outline); return; }
      F.ball(g, ax, ay + y, mood === 'alarm' ? 4 : 3);
      if (mood === 'dead') { F.cross(g, ax, ay + y); return; }
      if (mood === 'alarm') { F.pupil(g, ax, ay + y, 1, 1); return; }
      if (o.blink) { bigLid(g, ax, ay, 0, y, 3, 6, o.skin); return; }
      if (mood === 'toxic') { const k = Math.floor((o.t || 0) * 8) % 4, p = [[1, -3], [1, 0], [-2, 0], [-2, -3]][o.dizzy ? k : 0]; F.pupil(g, ax + p[0], ay + y + p[1]); return; }
      const gx = (o.gaze && o.gaze.x) || 0, side = gx > .3 ? 1 : (gx < -.3 ? -1 : 0);
      F.pupil(g, ax - 1 + side, ay + y - 1 + ((o.gaze && o.gaze.y > .35) ? 1 : 0), 3, 3);
      if (mood === 'focus') { bigLid(g, ax, ay, 0, y, 3, 1, o.skin); R(-3, y - 5, 7, 1, H().brow); }
      else if (mood === 'shield') bigLid(g, ax, ay, 0, y, 3, 3, o.skin);
    },
    flower(g, ax, ay) {
      const { R, P } = pen(g, ax, ay), h = H();
      F.ball(g, ax, ay + F.EY - 1, 3); F.pupil(g, ax, ay + F.EY - 4);   // l'œil roule vers le haut
      R(-3, 2, 6, 3, h.outline); R(-2, 3, 4, 1, h.teeth); P([[-2, 3], [0, 3], [1, 3]], C().metal); R(-2, 4, 4, 1, h.mouth);
    } });

  define({ id: 'binoclard',                                       // grosses lunettes rondes autour des yeux communs
    front(g, ax, ay, mood) {
      const { R, O } = pen(g, ax, ay), c = C(), big = mood === 'alarm', y = big ? F.EY - 1 : F.EY;
      for (const x of F.EX) O(x, y, big ? 4 : 3, c.frame);
      R(-1, y - 1, 3, 1, c.frame); R(-7, y - 1, 1, 1, c.frame); R(7, y - 1, 1, 1, c.frame);
      if (mood !== 'dead' && mood !== 'graze') for (const x of F.EX) R(x + 1, y - 2, 1, 1, c.shine);
    },
    flower(g, ax, ay) {
      const { R, O, P } = pen(g, ax, ay), c = C(), h = H();
      F.ball(g, ax - 3, ay + F.EY + 1); F.ball(g, ax + 3, ay + F.EY);
      O(-3, F.EY + 1, 3, c.frame); O(3, F.EY, 3, c.frame); R(-1, F.EY - 1, 3, 1, c.frame);   // de travers
      F.pupil(g, ax - 3, ay + F.EY + 1); F.pupil(g, ax + 2, ay + F.EY);
      P([[2, F.EY - 2], [3, F.EY - 1], [4, F.EY - 1], [5, F.EY]], c.frame);                    // verre fêlé
      R(-3, 3, 6, 1, h.outline); R(-1, 4, 3, 2, h.tongue);
    } });

  define({ id: 'langue',                                          // grande langue qui pend sur le côté
    mouth(g, ax, ay) { const { R } = pen(g, ax, ay), h = H(); R(-3, 3, 6, 1, h.outline); R(0, 3, 3, 1, h.mouth); R(0, 4, 3, 2, h.tongue); R(1, 6, 2, 1, h.tongue); R(1, 5, 1, 1, C().tongueDark); },
    flower(g, ax, ay) {
      const { R } = pen(g, ax, ay), h = H();
      crossEyed(g, ax, ay);
      R(-3, 2, 6, 2, h.outline); R(-1, 3, 3, 1, h.mouth); R(-1, 4, 3, 4, h.tongue); R(0, 5, 1, 2, C().tongueDark); R(-3, 4, 1, 3, C().drool);
    } });

  define({ id: 'antennes', tip: false,                            // deux antennes qui brillent
    back(g, ax, ay) { const { R, D } = pen(g, ax, ay), c = C(); R(-4, -10, 1, 4, H().skinShade); R(3, -10, 1, 4, H().skinShade); D(-4, -11, 1, c.glow); D(3, -11, 1, c.glow); },
    flower(g, ax, ay) {
      F.ball(g, ax - 4, ay + F.EY + 1); F.ball(g, ax + 4, ay + F.EY + 1); F.ball(g, ax, ay + F.EY - 2);   // trois yeux
      F.pupil(g, ax - 4, ay + F.EY + 1); F.pupil(g, ax + 3, ay + F.EY); F.pupil(g, ax, ay + F.EY - 3);
      F.mouth(g, ax, ay, 'calm');
    } });

  // Crête rose à la place de la pointe.
  function crest(g, ax, ay) {
    const { R } = pen(g, ax, ay), c = C();
    for (const [x, h] of [[-3, 3], [-2, 4], [-1, 5], [0, 6], [1, 5], [2, 4], [3, 3]]) R(x, -6 - h, 1, h, c.crest);
    R(0, -12, 1, 2, c.crestLight); R(-1, -10, 1, 2, c.crestLight);
  }
  define({ id: 'punk', tip: false,
    back: crest,
    flower(g, ax, ay) {
      const { R, P } = pen(g, ax, ay), h = H();
      crest(g, ax, ay); crossEyed(g, ax, ay);
      R(-4, 2, 8, 3, h.outline); R(-3, 3, 6, 1, h.teeth); P([[-3, 3], [-1, 3], [1, 3]], C().metal);   // bagues
    } });

  define({ id: 'pendouille',                                      // l'œil droit sorti de l'orbite, au bout du nerf
    eyes(g, ax, ay, mood, o) {
      const { R } = pen(g, ax, ay), h = H(), lx = -3, y = F.EY, dx = 5, dy = 6;
      F.ball(g, ax + lx, ay + y); R(4, -1, 1, 4, h.tongue); R(3, -2, 3, 1, h.outline); F.ball(g, ax + dx, ay + dy);
      if (mood === 'dead') { F.cross(g, ax + lx, ay + y); F.cross(g, ax + dx, ay + dy); return; }
      if (mood === 'alarm') { F.pupil(g, ax + lx, ay + y, 1, 1); F.pupil(g, ax + dx, ay + dy, 1, 1); return; }
      if (mood === 'graze') { R(lx - 2, y, 5, 2, h.outline); F.pupil(g, ax + dx - 1, ay + dy); return; }
      if (o.blink) { F.lid(g, ax + lx, ay + y, 4, o.skin); F.lid(g, ax + dx, ay + dy, 4, o.skin); return; }
      F.pupil(g, ax + lx, ay + y); F.pupil(g, ax + dx, ay + dy + 1);
      if (mood === 'toxic') F.pupil(g, ax + lx - 2, ay + y - 2);
      else if (calmish(mood, o) && mood !== 'calm') F.lid(g, ax + lx, ay + y, mood === 'shield' ? 2 : 1, o.skin);
    },
    mouth(g, ax, ay) { F.mouth(g, ax, ay, 'focus'); },             // l'air ahuri : bouche en trait
    flower(g, ax, ay) {
      const { R } = pen(g, ax, ay), h = H();
      for (const x of [-4, 4]) { R(x, 1, 1, 4, h.tongue); F.ball(g, ax + x, ay + 8); F.pupil(g, ax + x, ay + 9); }
      R(-3, 1, 6, 1, h.outline); R(-2, 2, 4, 1, h.mouth);
    } });

  FP.cast = { define, get, pen };
})();
