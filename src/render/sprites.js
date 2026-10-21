// render/sprites.js — chargement des PNG authorés.
// Lit     : FP.catalog.assets (runtime.src).
// Écrit   : rien dans l'état.
// Expose  : FP.sprites.get(assetKey) → HTMLImageElement prêt, ou null (pas encore chargé, en échec ou inconnu).
// Un PNG manquant ne bloque rien : l'obstacle garde sa collision, il n'est simplement pas dessiné.
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  const images = {};

  for (const [key, a] of Object.entries(FP.catalog.assets)) {
    const img = new Image();
    const entry = { img, ready: false };
    img.onload = () => { entry.ready = true; };
    img.onerror = () => { console.warn('Flower Power : PNG non chargé', img.src); };
    img.src = a.runtime.src;   // chemin exact (source.file n'a pas la même casse que le fichier)
    images[key] = entry;
  }

  FP.sprites = {
    get(key) {
      const e = images[key];
      return e && e.ready ? e.img : null;
    }
  };
})();
