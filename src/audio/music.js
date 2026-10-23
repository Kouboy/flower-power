// audio/music.js — direction musicale : quel morceau pour quel moment, couches selon le jeu, tempo selon les éclosions,
// veille entre deux niveaux, baisses de volume (mort, fleur qui sort, frôlement), et pilotage du séquenceur.
// Lit     : state.mode, state.score.flowers, state.plant.{tip,corruption,toxicTimer}, state.world.{surfaceY,height},
//           state.graze.active, state.query.grazes, FP.certificate.canRestart, FP.songs, FP.sequencer.
// Écrit   : rien dans l'état (le moteur audio uniquement).
// Expose  : FP.music.{songFor (variante de jeu selon la pousse), layersFor, tempoFor, filterFor, grazeDuck} (purs, testés), FP.music.update(state, events, backend),
//           FP.music.MUSIC_GAIN.
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  const MUSIC_GAIN = .5, TITLE_FADE = 1, OUT_FADE = .5;
  const DEATH_DUCK = Math.pow(10, -9 / 20), DEATH_TIME = 1, BLOSSOM_TIME = 1.2, OPEN = 20000, ASLEEP = 900;
  const IN_GAME = { playing: true, dying: true, bloom: true, ready: true, shop: true };
  const STANDBY = { ready: true, shop: true };   // veille : avant de pousser et pendant le bon de commande

  function songFor(state) {
    if (!state || state.mode === 'splash') return { song: null, gain: 0 };   // le son n'est pas encore débloqué
    if (state.mode === 'menu') return { song: 'title', gain: 1 };
    if (state.mode === 'over') return FP.certificate && FP.certificate.canRestart(state) ? { song: 'title', gain: .5 } : { song: null, gain: 0 };
    // Une variante de la musique de jeu par pousse, en boucle : la nouvelle tige démarre sur sa propre progression.
    return { song: 'game' + ((Math.max(1, state.plant.stemCount) - 1) % FP.songs.gameVariants.length), gain: 1 };
  }

  // Frôlement le plus fort en cours (0 à 1).
  function grazeLevel(state) {
    if (state.mode !== 'playing') return 0;
    let i = 0;
    for (const g of (state.query && state.query.grazes) || []) if (state.graze.active.has(g.obj)) i = Math.max(i, g.intensity || 0);
    return Math.min(1, i);
  }

  function layersFor(state) {
    const off = { groove: 0, clav: 0, perc: 0, organ: 0, sitar: 0, ghost: 0 };
    if (!IN_GAME[state.mode]) return off;
    if (STANDBY[state.mode]) return { ...off, groove: 1 };   // veille : basse et batterie seules (filtrées)
    const p = state.plant, w = state.world, tip = p.tip;
    const depth = tip ? (tip.y - w.surfaceY) / Math.max(1, w.height - w.surfaceY) : 1;
    return { groove: 1, clav: 1, perc: grazeLevel(state), organ: p.corruption > 0 || p.toxicTimer > 0 ? 1 : 0, sitar: depth < 1 / 3 ? 1 : 0, ghost: 1 };
  }

  const tempoFor = (state) => Math.min(125, 100 + 3.5 * state.score.flowers);
  const filterFor = (state) => (STANDBY[state.mode] ? ASLEEP : OPEN);
  const grazeDuck = (intensity) => Math.pow(10, -6 * intensity / 20);

  // État par moteur : lecteur, baisse en cours (une seule à la fois), dernières valeurs envoyées.
  const memos = new WeakMap();
  function memoFor(backend) {
    let m = memos.get(backend);
    if (!m) memos.set(backend, m = { player: FP.sequencer.createPlayer(backend), duckUntil: -1, gain: null, filter: null });
    return m;
  }

  function update(state, events, backend) {
    if (!backend || !state) return;
    const m = memoFor(backend), p = m.player, now = backend.now(), want = songFor(state);
    if (want.song !== p.current()) {
      if (!want.song) p.stop(OUT_FADE);
      else p.play(want.song, { fade: want.song === 'title' ? TITLE_FADE : 0, gain: want.gain, bpm: want.song === 'title' ? 0 : tempoFor(state),
        atBar: want.song.startsWith('game') && !!p.current() && p.current().startsWith('game') });   // variante suivante : relais en fin de mesure
    }
    if (p.current() && p.current().startsWith('game')) { p.setTempo(tempoFor(state)); p.setLayers(layersFor(state)); }
    for (const e of events || []) {
      if (e.type === 'death') m.duckUntil = Math.max(m.duckUntil, now + DEATH_TIME);
      if (e.type === 'blossom') m.duckUntil = Math.max(m.duckUntil, now + BLOSSOM_TIME);
    }
    const gain = MUSIC_GAIN * (now < m.duckUntil ? DEATH_DUCK : 1) * grazeDuck(grazeLevel(state));
    if (m.gain === null || Math.abs(gain - m.gain) > .005) { backend.setGain('music', gain, .1); m.gain = gain; }
    const filter = filterFor(state);
    if (filter !== m.filter) { backend.setFilter(filter, .3); m.filter = filter; }
    p.update(now);
  }

  FP.music = { songFor, layersFor, tempoFor, filterFor, grazeDuck, update, MUSIC_GAIN };
})();
