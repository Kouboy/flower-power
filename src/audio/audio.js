// audio/audio.js — chef d'orchestre du son (Web Audio, aucun fichier) : déblocage au premier geste, événements de la frame →
// effets (FP.sfx) et musique (FP.music), pause quand l'onglet est caché.
// Lit     : les événements de la frame, state (via FP.sfx.drone et FP.music.update), FP.synth, FP.state.current.
// Écrit   : rien dans l'état.
// Expose  : FP.audio.consume(events, state, dt), FP.audio.sfx(name, intensity?), FP.audio.unlock(),
//           FP.audio._backend (moteur ; remplaçable par un espion dans les tests, null tant que l'audio est muet).
//           Installe sur window les écouteurs pointerdown / keydown qui débloquent le son.
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  const { clamp } = FP.math;

  // Les navigateurs n'autorisent le son qu'après un geste du joueur.
  function unlock() {
    try {
      if (!FP.audio._backend) {
        const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
        if (!AC) return;
        const b = FP.audio._backend = FP.synth.create(new AC());
        // La musique est planifiée sur sa propre horloge (25 ms), indépendante des images du jeu.
        setInterval(() => { try { FP.music.update(FP.state.current, [], b); } catch (e) { /* musique muette plutôt qu'une erreur */ } }, 25);
        // Onglet caché ou téléphone verrouillé : tout le son se met en pause (l'horloge audio s'arrête avec lui).
        document.addEventListener('visibilitychange', () => { if (document.hidden) b.suspend(); else b.resume(); });
      }
      const ac = FP.audio._backend.context;
      if (ac && ac.state === 'suspended') ac.resume().catch(() => {});
    } catch (e) { /* audio indisponible : le jeu reste muet */ }
  }

  // Un son d'interface ou de jeu, par son nom (les écrans ui/* appellent ceci directement).
  function sfx(name, intensity) {
    const b = FP.audio._backend;
    if (!b) return;
    try { if (FP.songs.jingles[name]) FP.sfx.jingle(b, name); else FP.sfx.play(b, name, intensity); } catch (e) { /* un son raté ne doit jamais casser une frame */ }
  }

  // Événements de la frame → effets.
  function play(b, e) {
    switch (e.type) {
      case 'runStart': return FP.sfx.play(b, 'start');
      case 'stemStart': return FP.sfx.play(b, 'growStart');
      case 'bloom': return FP.sfx.play(b, 'crack');
      case 'blossom': return FP.sfx.jingle(b, 'blossom');
      case 'eco': return FP.sfx.play(b, 'eco', e.combo || 1);
      case 'grazeStart': return FP.sfx.play(b, 'grazeStart', clamp(e.intensity || .6, .2, 1.6));
      case 'pickup': return FP.sfx.play(b, e.kind === 'water' ? 'water' : 'bud');
      case 'shieldBreak': return FP.sfx.play(b, 'shieldBreak');
      case 'bomb': return FP.sfx.play(b, 'bomb');
      case 'death': FP.sfx.play(b, e.cause === 'solid' ? 'hit' : 'acid'); return FP.sfx.jingle(b, 'death');
      case 'toxicEnter': return FP.sfx.play(b, 'contaminate');
      case 'bonusSpawn': case 'ready': return FP.sfx.play(b, 'ready');
      case 'growthTick': return FP.sfx.scrape(b, e.k || 0);
    }
  }

  function consume(events, state, dt) {
    const b = FP.audio._backend;
    if (!b) return;
    try {
      for (const e of events) play(b, e);
      FP.sfx.drone(b, state, events);
      FP.music.update(state, events, b);
    } catch (e) { /* audio muet plutôt qu'une partie figée */ }
  }

  FP.audio = { consume, sfx, unlock, _backend: null };

  if (typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
  }
})();
