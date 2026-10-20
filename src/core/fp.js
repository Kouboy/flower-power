// core/fp.js — espace de noms global et utilitaires sans état.
// Lit     : location.search (une fois, au chargement).
// Écrit   : rien.
// Expose  : FP.TAU, FP.math, FP.createRng, FP.parseParams, FP.params, FP.storage.
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};

  FP.TAU = Math.PI * 2;

  FP.math = {
    clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
    lerp: (a, b, k) => a + (b - a) * k,
    dist: (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by)
  };

  // Même générateur congruentiel que la v3, pour pouvoir comparer les graines.
  FP.createRng = (seed) => {
    let s = seed >>> 0;
    const next = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    return { seed, next, range: (a, b) => a + (b - a) * next() };
  };

  FP.parseParams = (search) => {
    const q = new URLSearchParams(search || '');
    const seed = q.get('seed');
    return {
      seed: /^\d+$/.test(seed || '') ? Number(seed) : null,
      perf: q.get('perf') === '1',
      flydebug: q.get('flydebug') === '1',
      freecam: q.get('freecam') === '1'
    };
  };

  FP.params = FP.parseParams(typeof location !== 'undefined' ? location.search : '');

  // localStorage peut être absent ou lever (file://, mode strict) : on ne plante jamais.
  const defaultBackend = () => {
    try { return window.localStorage || null; } catch (e) { return null; }
  };

  FP.storage = {
    readNumber(key, fallback, backend = defaultBackend()) {
      try {
        const raw = backend ? backend.getItem(key) : null;
        const n = raw === null ? NaN : Number(raw);
        return Number.isFinite(n) ? n : fallback;
      } catch (e) { return fallback; }
    },
    write(key, value, backend = defaultBackend()) {
      try { if (!backend) return false; backend.setItem(key, String(value)); return true; }
      catch (e) { return false; }
    }
  };
})();
