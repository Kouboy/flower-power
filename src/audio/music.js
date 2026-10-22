// audio/music.js — direction musicale : quel morceau pour quel moment de la partie, et pilotage du séquenceur.
// Lit     : state.mode, FP.songs, FP.sequencer.
// Écrit   : rien dans l'état (le moteur audio uniquement).
// Expose  : FP.music.songFor(state) (pur, testé) → { song: 'title'|'game'|null, gain } ; FP.music.update(state, events, backend).
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  const TITLE_FADE = 1, OUT_FADE = .5;

  function songFor(state) {
    if (!state || state.mode === 'splash') return { song: null, gain: 0 };   // le son n'est pas encore débloqué
    if (state.mode === 'menu') return { song: 'title', gain: 1 };
    return { song: 'game', gain: 1 };
  }

  // Un lecteur par moteur (le vrai moteur Web Audio, ou un espion dans les tests).
  const players = new WeakMap();
  const playerFor = (backend) => players.get(backend) || (players.set(backend, FP.sequencer.createPlayer(backend)), players.get(backend));

  function update(state, events, backend) {
    if (!backend || !state) return;
    const p = playerFor(backend), want = songFor(state);
    if (want.song !== p.current()) {
      if (!want.song) p.stop(OUT_FADE);
      else p.play(want.song, { fade: want.song === 'title' ? TITLE_FADE : 0, gain: want.gain });
    }
    p.update(backend.now());
  }

  FP.music = { songFor, update };
})();
