// audio/music.js — direction musicale : quel morceau pour quel moment (milieu et boss du niveau), couches selon le jeu,
// tempo selon la progression dans le milieu,
// veille entre deux niveaux, baisses de volume (mort, fleur qui sort, frôlement), et pilotage du séquenceur.
// Lit     : state.mode, state.run.step, state.bossFight.pierced, FP.config.boss.tempoPerPierce, state.plant.{tip,corruption,toxicTimer,stemCount}, state.world.{surfaceY,height,milieu,boss},
//           state.graze.active, state.query.grazes, FP.certificate.canRestart, FP.songs, FP.sequencer.
// Écrit   : rien dans l'état (le moteur audio uniquement).
// Expose  : FP.music.{songFor (morceau du milieu du niveau, sa variante selon la pousse, thème du boss, reggae en boutique), layersFor,
//           tempoFor, relay (relais en fin de mesure ?), filterFor, trebleFor, grazeDuck} (purs, testés), FP.music.update(state, events, backend),
//           FP.music.MUSIC_GAIN.
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  const MUSIC_GAIN = .8, TITLE_FADE = 1, OUT_FADE = .5;
  const DEATH_DUCK = Math.pow(10, -9 / 20), DEATH_TIME = 1, BLOSSOM_TIME = 1.2, OPEN = 20000, ASLEEP = 900;
  const IN_GAME = { playing: true, dying: true, bloom: true, ready: true, shop: true };
  const STANDBY = { ready: true, shop: true };   // une seule couche : veille avant de pousser, reggae de la boutique (sa seule couche)

  function songFor(state) {
    if (!state || state.mode === 'splash') return { song: null, gain: 0 };   // le son n'est pas encore débloqué
    if (state.mode === 'menu' || state.mode === 'won') return { song: 'title', gain: 1 };   // écran de fin de saison (v4.9.0) : le thème du titre
    if (state.mode === 'shop') return { song: 'shop', gain: 1 };   // reggae de la boutique
    if (state.mode === 'over') return FP.certificate && FP.certificate.canRestart(state) ? { song: 'title', gain: .5 } : { song: null, gain: 0 };
    // Le morceau du niveau généré (v4.10.0) : il change sous le noir du fondu, quand le niveau est régénéré. Sur un niveau
    // de boss, le thème du boss ; sinon une variante par pousse, en boucle : la nouvelle tige démarre sur sa propre progression.
    if (state.flow.won) return { song: 'title', gain: 1 };   // 4e boss battu : droit à l'écran de fin, sans repasser par la friche
    const id = state.world.milieu;
    if (state.world.boss) return { song: id + 'Boss', gain: 1 };
    return { song: id + ((Math.max(1, state.plant.stemCount) - 1) % FP.songs.variants(id)), gain: 1 };
  }
  const isGame = (name) => !!name && name !== 'title' && name !== 'shop';   // un morceau de jeu (pas le titre ni la boutique)
  // Relais en fin de mesure entre deux variantes du même milieu ; tout autre changement coupe net.
  const milieuOf = (name) => name.replace(/\d+$/, '');
  const relay = (from, to) => isGame(from) && isGame(to) && /\d$/.test(from) && /\d$/.test(to) && milieuOf(from) === milieuOf(to);

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
    const sitar = w.boss || depth < 1 / 3 ? 1 : 0;   // sur un niveau de boss, la mélodie de surface reste ouverte
    return { groove: 1, clav: 1, perc: grazeLevel(state), organ: p.corruption > 0 || p.toxicTimer > 0 ? 1 : 0, sitar, ghost: 1 };
  }

  // Tempo propre au morceau, +4 BPM par pousse réussie dans le milieu ; un boss s'emballe de tempoPerPierce par point faible percé.
  function tempoFor(state) {
    const song = FP.songs[songFor(state).song], bpm = song ? song.bpm : 100;
    return state.world.boss ? bpm + FP.config.boss.tempoPerPierce * state.bossFight.pierced.filter(Boolean).length : bpm + 4 * state.run.step;
  }
  const filterFor = (state) => (state.mode === 'ready' ? ASLEEP : OPEN);
  const TREBLE = 7;   // dB d'aigus en plus pour le reggae de la boutique : sono de supermarché
  const trebleFor = (state) => (state.mode === 'shop' ? TREBLE : 0);
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
      else p.play(want.song, { fade: want.song === 'title' ? TITLE_FADE : 0, gain: want.gain, bpm: isGame(want.song) ? tempoFor(state) : 0,
        atBar: relay(p.current(), want.song) });   // variante suivante : relais en fin de mesure
    }
    if (isGame(p.current())) { p.setTempo(tempoFor(state)); p.setLayers(layersFor(state)); }
    if (p.current() === 'shop') p.setLayers(layersFor(state));
    for (const e of events || []) {
      if (e.type === 'death') m.duckUntil = Math.max(m.duckUntil, now + DEATH_TIME);
      if (e.type === 'blossom') m.duckUntil = Math.max(m.duckUntil, now + BLOSSOM_TIME);
    }
    const gain = MUSIC_GAIN * (now < m.duckUntil ? DEATH_DUCK : 1) * grazeDuck(grazeLevel(state));
    if (m.gain === null || Math.abs(gain - m.gain) > .005) { backend.setGain('music', gain, .1); m.gain = gain; }
    const filter = filterFor(state);
    if (filter !== m.filter) { backend.setFilter(filter, .3); m.filter = filter; }
    const treble = trebleFor(state);
    if (treble !== m.treble && backend.setTreble) { backend.setTreble(treble, .3); m.treble = treble; }
    p.update(now);
  }

  FP.music = { songFor, layersFor, tempoFor, relay, filterFor, trebleFor, grazeDuck, update, MUSIC_GAIN };
})();
