// core/geom.js — géométrie pure, sans état.
// Lit     : rien.
// Écrit   : rien.
// Expose  : FP.geom.distPointToSegment, FP.geom.toWorld, FP.geom.convexPolysOverlap, FP.geom.clampUpAngle.
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};

  function distPointToSegment(px, py, ax, ay, bx, by) {
    const vx = bx - ax, vy = by - ay;
    const l2 = vx * vx + vy * vy || 1;
    const u = Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / l2));
    return Math.hypot(px - (ax + vx * u), py - (ay + vy * u));
  }

  // Point local (x, y) d'un objet {x, y, a} → coordonnées monde.
  function toWorld(o, x, y) {
    const a = o.a || 0, ca = Math.cos(a), sa = Math.sin(a);
    return { x: o.x + x * ca - y * sa, y: o.y + x * sa + y * ca };
  }

  function axisRange(poly, ax, ay) {
    let min = Infinity, max = -Infinity;
    for (const p of poly) {
      const d = p.x * ax + p.y * ay;
      if (d < min) min = d;
      if (d > max) max = d;
    }
    return [min, max];
  }

  // Théorème de l'axe séparateur. Toucher juste le bord n'est pas un chevauchement.
  function convexPolysOverlap(a, b) {
    if (a.length < 3 || b.length < 3) return false;
    for (const poly of [a, b]) {
      for (let i = 0; i < poly.length; i++) {
        const p = poly[i], q = poly[(i + 1) % poly.length];
        const ex = q.x - p.x, ey = q.y - p.y, len = Math.hypot(ex, ey) || 1;
        const ax = -ey / len, ay = ex / len;
        const ar = axisRange(a, ax, ay), br = axisRange(b, ax, ay);
        if (ar[1] <= br[0] + .01 || br[1] <= ar[0] + .01) return false;
      }
    }
    return true;
  }

  // Direction (x, y) ramenée dans un cône de ±maxDeg autour de la verticale montante.
  function clampUpAngle(x, y, maxDeg) {
    const max = maxDeg * Math.PI / 180;
    const a = Math.max(-max, Math.min(max, Math.atan2(x, -y)));
    return { x: Math.sin(a), y: -Math.cos(a) };
  }

  FP.geom = { distPointToSegment, toWorld, convexPolysOverlap, clampUpAngle };
})();
