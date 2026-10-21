// core/fp.js — espace de noms global et utilitaires sans état.
// Lit     : location.search (une fois, au chargement).
// Écrit   : rien.
// Expose  : FP.TAU, FP.math, FP.createRng, FP.parseParams, FP.params, FP.storage (write, readJSON, writeJSON, useBackend — banc d'essai).
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
      // Graine sur 32 bits, comme le générateur : au-delà, elle serait tronquée en silence.
      seed: /^\d+$/.test(seed || '') && Number(seed) <= 4294967295 ? Number(seed) : null,
      perf: q.get('perf') === '1',
      flydebug: q.get('flydebug') === '1',
      freecam: q.get('freecam') === '1'
    };
  };

  FP.params = FP.parseParams(typeof location !== 'undefined' ? location.search : '');

  // localStorage peut être absent ou lever (file://, mode strict) : on ne plante jamais.
  // useBackend : réservé au banc d'essai (dev/harness.js), pour que les tests ne touchent jamais au vrai stockage.
  let override = null;
  const defaultBackend = () => {
    if (override) return override;
    try { return window.localStorage || null; } catch (e) { return null; }
  };

  FP.storage = {
    useBackend(backend) { override = backend; },
    // Objet JSON : fallback si absent, illisible ou pas un objet.
    readJSON(key, fallback, backend = defaultBackend()) {
      try {
        const raw = backend ? backend.getItem(key) : null;
        const v = raw === null ? null : JSON.parse(raw);
        return v && typeof v === 'object' ? v : fallback;
      } catch (e) { return fallback; }
    },
    writeJSON(key, value, backend = defaultBackend()) {
      try { if (!backend) return false; backend.setItem(key, JSON.stringify(value)); return true; }
      catch (e) { return false; }
    },
    write(key, value, backend = defaultBackend()) {
      try { if (!backend) return false; backend.setItem(key, String(value)); return true; }
      catch (e) { return false; }
    }
  };
})();
