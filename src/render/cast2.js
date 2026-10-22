// render/cast2.js — le casting des pousses (v4.4.0), personnages 9 à 16 (registre et 1 à 8 dans render/cast.js).
// Lit     : FP.px, FP.faces, FP.cast.{define, pen, crossEyed}, FP.palette.{hero, cast}.
// Écrit   : uniquement les pixels du contexte reçu.
// Expose  : rien de neuf (les personnages s'inscrivent par FP.cast.define).
// Dessins d'après docs/art/maquette-visages-8-16.html ; tout tient dans ±12 pixels autour du centre.
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  const { define, pen, crossEyed } = FP.cast, F = FP.faces;
  const H = () => FP.palette.hero, C = () => FP.palette.cast;

  define({ id: 'depareille',                                      // un œil énorme, un minuscule, qui regardent ailleurs
    eyes(g, ax, ay, mood, o) {
      const { R } = pen(g, ax, ay), h = H(), by = F.EY - 1, sy = F.EY + 1;
      if (mood === 'graze') { R(-6, F.EY, 6, 2, h.outline); R(2, F.EY, 3, 1, h.outline); return; }
      F.ball(g, ax - 3, ay + by, 3); F.ball(g, ax + 4, ay + sy, 1);
      if (mood === 'dead') { F.cross(g, ax - 3, ay + by); R(4, sy, 1, 1, h.pupil); return; }
      if (mood === 'alarm') { F.pupil(g, ax - 3, ay + by, 1, 1); return; }
      if (o.blink) { F.lid(g, ax - 3, ay + by, 6, o.skin, 3); R(3, sy, 3, 1, h.outline); return; }
      if (mood === 'toxic') {                                      // vertige : la grosse pupille tourne
        const k = o.dizzy ? Math.floor((o.t || 0) * 8) % 4 : 0, p = [[-2, -2], [0, -2], [0, 0], [-2, 0]][k];
        F.pupil(g, ax - 3 + p[0], ay + by + p[1]); R(4, sy - 1, 1, 1, h.pupil); return;
      }
      F.pupil(g, ax - 5, ay + by - 2); R(4, sy + 1, 1, 1, h.pupil);
      if (mood === 'focus' || mood === 'shield') F.lid(g, ax - 3, ay + by, mood === 'focus' ? 1 : 3, o.skin, 3);
    },
    flower(g, ax, ay) {
      const { R } = pen(g, ax, ay), h = H();
      F.ball(g, ax - 3, ay + F.EY - 1, 3); F.ball(g, ax + 4, ay + F.EY + 1, 1);
      F.pupil(g, ax - 2, ay + F.EY); R(4, F.EY, 1, 1, h.pupil);
      R(-3, 3, 6, 1, h.outline); R(2, 2, 1, 1, h.outline);
    } });

  define({ id: 'unedent',                                         // bouche édentée, une seule dent
    mouth(g, ax, ay) { const { R } = pen(g, ax, ay), h = H(); R(-4, 2, 1, 1, h.outline); R(3, 2, 1, 1, h.outline); R(-3, 3, 6, 2, h.outline); R(-2, 3, 4, 1, h.mouth); R(1, 3, 1, 2, h.teeth); },
    flower(g, ax, ay) {
      const { R } = pen(g, ax, ay), h = H();
      for (const x of F.EX) F.ball(g, ax + x, ay + F.EY);
      F.pupil(g, ax - 3, ay + F.EY - 2); F.pupil(g, ax + 3, ay + F.EY - 2);   // yeux au plafond
      R(-3, 2, 6, 3, h.outline); R(-2, 3, 4, 1, h.mouth); R(-1, 2, 1, 2, h.teeth); R(2, 4, 1, 4, C().drool);
    } });

  // Gros nez rouge entre les yeux.
  function nose(g, ax, ay) { const { R, D } = pen(g, ax, ay), c = C(); D(0, 0, 2, H().outline); D(0, 0, 1, c.nose); R(-1, -1, 1, 1, c.noseLight); }
  define({ id: 'patate',
    front: nose,
    flower(g, ax, ay) { crossEyed(g, ax, ay); F.mouth(g, ax, ay, 'calm'); nose(g, ax, ay); } });

  define({ id: 'gourou',                                          // grosse moustache, sourcils broussailleux
    front(g, ax, ay, mood) {
      const { R } = pen(g, ax, ay), c = C();
      R(-5, 1, 11, 2, c.stache); R(-6, 2, 1, 2, c.stache); R(6, 2, 1, 2, c.stache); R(-1, 1, 3, 1, H().outline);
      if (mood === 'calm' || mood === 'focus' || mood === 'shield') { R(-6, F.EY - 4, 4, 1, c.stache); R(3, F.EY - 4, 4, 1, c.stache); }
    },
    flower(g, ax, ay) {
      const { R, D } = pen(g, ax, ay), c = C();
      for (const x of F.EX) { D(x, F.EY, 3, c.frame); D(x, F.EY, 2, c.tint); R(x - 1, F.EY - 1, 1, 1, c.glass); }   // lunettes teintées
      R(-5, 1, 11, 2, c.stache); R(-7, -1, 2, 3, c.stache); R(6, -1, 2, 3, c.stache);                          // moustache en guidon
      R(-1, 3, 3, 1, H().mouth);
    } });

  define({ id: 'champi', tip: false,                              // un champignon a poussé sur le crâne
    back(g, ax, ay) {
      const { R } = pen(g, ax, ay), c = C(), K = H().outline;
      R(0, -8, 2, 2, c.stalk);
      R(-1, -12, 5, 1, K); R(-2, -11, 7, 1, K); R(-1, -11, 5, 1, c.shroom); R(-3, -10, 9, 1, K); R(-2, -10, 7, 1, c.shroom); R(-3, -9, 9, 1, K);
      R(-1, -10, 1, 1, c.shroomDot); R(2, -11, 1, 1, c.shroomDot);
    },
    flower(g, ax, ay) {
      const { R } = pen(g, ax, ay), c = C();
      for (const [x, y] of [[-3, -9], [3, -8]]) { R(x, y + 1, 1, 2, c.stalk); R(x - 1, y, 3, 1, c.shroom); R(x, y - 1, 1, 1, c.shroom); }   // les petits
      crossEyed(g, ax, ay); F.mouth(g, ax, ay, 'calm');
    } });

  define({ id: 'coquille', tip: false,                            // un bout de sa graine en casque
    back(g, ax, ay) {
      const { R, D, P } = pen(g, ax, ay), c = C(), K = H().outline;
      D(0, -5, 5, K); D(0, -5, 4, c.shell); R(-5, -4, 11, 1, K); P([[-4, -5], [-2, -4], [0, -5], [2, -4], [4, -5]], K);
      R(-2, -8, 2, 1, c.shellLight); R(2, -7, 1, 1, c.shellDark);
    },
    flower(g, ax, ay) {
      const { R, D } = pen(g, ax, ay), c = C();
      for (const x of F.EX) F.ball(g, ax + x, ay + F.EY);
      D(-2, -5, 5, H().outline); D(-2, -5, 4, c.shell); R(-7, -3, 11, 1, H().outline); R(-4, -8, 2, 1, c.shellLight);   // glisse sur un œil
      F.pupil(g, ax + 3, ay + F.EY); F.mouth(g, ax, ay, 'calm');
    } });

  // Bouche grande ouverte.
  function gape(g, ax, ay) { const { R } = pen(g, ax, ay), h = H(); R(-3, 1, 6, 5, h.outline); R(-2, 2, 4, 3, h.mouth); R(-1, 4, 2, 1, h.tongue); }
  define({ id: 'gobemouche',                                      // bouche béante, regard vide au plafond
    eyes(g, ax, ay, mood, o) {
      if (mood !== 'calm' || o.blink) { F.eyes(g, ax, ay, mood, o); return; }
      for (const x of F.EX) F.ball(g, ax + x, ay + F.EY);
      F.pupil(g, ax - 3, ay + F.EY - 2); F.pupil(g, ax + 2, ay + F.EY - 2);
    },
    mouth(g, ax, ay, mood) { if (mood === 'calm') gape(g, ax, ay); else F.mouth(g, ax, ay, 'alarm'); },
    flower(g, ax, ay) {
      const { R, P } = pen(g, ax, ay), c = C();
      for (const x of F.EX) F.ball(g, ax + x, ay + F.EY);
      F.pupil(g, ax - 4, ay + F.EY); F.pupil(g, ax + 3, ay + F.EY + 1);
      gape(g, ax, ay);
      R(6, -8, 1, 1, c.fly); P([[5, -9], [7, -9]], c.glass); P([[4, -6], [5, -5], [7, -6]], c.fly);   // une mouche lui tourne autour
    } });

  define({ id: 'groucho',                                         // sourcils épais, lunettes noires, nez rose, moustache
    eyes(g, ax, ay, mood, o) {
      if (mood !== 'alarm' && mood !== 'graze') pen(g, ax, ay).R(-7, F.EY - 1, 15, 1, H().outline);   // monture
      F.eyes(g, ax, ay, mood, o);
    },
    front(g, ax, ay, mood) {
      const { R, D } = pen(g, ax, ay), h = H(), K = h.outline;
      const by = mood === 'alarm' ? F.EY - 6 : (mood === 'focus' ? F.EY - 3 : F.EY - 4);   // les sourcils parlent
      R(-7, by, 6, 2, K); R(2, by, 6, 2, K);
      D(0, 1, 2, K); D(0, 1, 1, C().pink);
      R(-4, 3, 9, 2, K); R(-5, 4, 1, 1, K); R(5, 4, 1, 1, K);
      // La moustache cache la bouche commune : le danger se redit dessous.
      if (mood === 'alarm') R(-1, 5, 3, 2, h.mouth); else if (mood === 'dead') R(-1, 5, 3, 1, h.mouth);
      else if (mood === 'graze') { R(-3, 5, 6, 2, K); R(-2, 5, 4, 1, h.teeth); R(0, 5, 1, 1, K); }
      else if (mood === 'toxic') { pen(g, ax, ay).P([[-3, 6], [-2, 5], [-1, 6], [0, 5], [1, 6], [2, 5]], K); R(0, 6, 2, 2, h.tongue); }
    },
    flower(g, ax, ay) {
      const { R, D } = pen(g, ax, ay), h = H(), K = h.outline;
      for (const x of F.EX) F.ball(g, ax + x, ay + F.EY - 1);
      F.pupil(g, ax - 3, ay + F.EY - 3); F.pupil(g, ax + 2, ay + F.EY - 3);
      R(-7, F.EY - 6, 6, 2, K); R(2, F.EY - 6, 6, 2, K);
      R(-7, F.EY + 1, 15, 1, K); for (const x of F.EX) { D(x, F.EY + 2, 3, K); D(x, F.EY + 2, 2, h.eye); }   // les lunettes tombent sur le nez
      R(-4, F.EY + 1, 2, 1, C().glass);
      D(0, 2, 2, K); D(0, 2, 1, C().pink); R(-5, 4, 11, 2, K); R(-6, 3, 1, 2, K); R(6, 3, 1, 2, K);
    } });
})();
