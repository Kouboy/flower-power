// audio/sequencer.js — séquenceur : lit une partition (FP.songs) et envoie ses notes au moteur un peu en avance sur l'horloge audio.
// Lit     : FP.songs, FP.synth.DRUMS.
// Écrit   : rien dans l'état.
// Expose  : FP.sequencer.notesBetween(song, fromBeat, toBeat) (pur, testé), FP.sequencer.createPlayer(backend), FP.sequencer.LOOKAHEAD.
// Temps en « beats » (noire = 1) ; le tempo ne change qu'en début de mesure ; après un gel, on repart de maintenant sans rattrapage.
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  const LOOKAHEAD = .2;   // secondes planifiées d'avance

  // Notes dont le début tombe dans [fromBeat, toBeat), boucle dépliée (beat absolu).
  function notesBetween(song, fromBeat, toBeat) {
    const L = song.bars * song.beatsPerBar, out = [];
    for (let k = Math.floor(fromBeat / L); k * L < toBeat; k++) {
      for (const note of song.notes) {
        const beat = note.beat + k * L;
        if (beat >= fromBeat && beat < toBeat) out.push({ note, beat });
      }
    }
    return out.sort((a, b) => a.beat - b.beat);
  }

  function createPlayer(backend) {
    let name = null, song = null, anchorTime = 0, anchorBeat = 0, bpm = 120, pending = null, next = 0, layers = {}, swing = 0, queued = null;
    const timeOf = (beat) => anchorTime + (beat - anchorBeat) * 60 / bpm;
    const beatAt = (time) => anchorBeat + (time - anchorTime) * bpm / 60;

    function play(songName, opts = {}) {
      // opts.atBar : relais à la fin de la mesure en cours (d'une variante de jeu à l'autre), sans doubler les notes déjà planifiées.
      if (opts.atBar && song && FP.songs[songName]) { name = songName; queued = { song: FP.songs[songName], opts }; return; }
      queued = null;
      name = songName; song = FP.songs[songName] || null;
      if (!song) return;
      bpm = opts.bpm || pending || song.bpm; pending = null;   // opts.bpm : repartir au tempo acquis (variante suivante)
      anchorTime = backend.now(); anchorBeat = 0; next = 0; swing = song.swing || 0;
      if (opts.fade) { backend.setGain('song', 0, 0); backend.setGain('song', opts.gain === undefined ? 1 : opts.gain, opts.fade); }
      else backend.setGain('song', opts.gain === undefined ? 1 : opts.gain, 0);
    }
    function stop(fade) { if (song) backend.setGain('song', 0, fade || 0); name = null; song = null; queued = null; }
    function setTempo(value) { if (!song) { bpm = value; return; } if (Math.abs(value - bpm) > 1e-6) pending = value; else pending = null; }
    // Couches : rampes plus rapides à la montée (0,2 s) qu'à la descente (0,4 s), sauf le tout premier réglage ; seulement ce qui change.
    function setLayers(map) {
      for (const [k, v] of Object.entries(map)) {
        if (layers[k] !== undefined && Math.abs(layers[k] - v) < .01) continue;
        backend.setGain('layer:' + k, v, layers[k] === undefined ? 0 : (v > layers[k] ? .2 : .4));   // premier réglage : immédiat
        layers[k] = v;
      }
    }

    function emit(n, beat) {
      // Boîte à rythmes qui boite : retard aléatoire sur caisse claire et charleston (morceaux avec « swing »).
      const late = swing && (n.inst === 'snare' || n.inst === 'hat' || n.inst === 'openhat') ? Math.random() * swing : 0;
      const t = timeOf(beat) + late, route = { bus: 'music', layer: n.layer, bend: n.bend, detune: n.detune };
      if (FP.synth.DRUMS.includes(n.inst)) backend.drum(n.inst, t, n.vel === undefined ? 1 : n.vel, route);
      else backend.note(n.inst, n.midi, t, n.dur * 60 / bpm, n.vel === undefined ? 1 : n.vel, route);
    }

    function update(now) {
      if (!song) return;
      if (timeOf(next) < now - .05) next = beatAt(now);   // gel (onglet caché, débogueur) : pas de rattrapage
      const bpb = song.beatsPerBar;
      for (let guard = 0; guard < 64; guard++) {
        const horizon = beatAt(now + LOOKAHEAD);
        if (next >= horizon) return;
        const barEnd = (Math.floor(next / bpb + 1e-9) + 1) * bpb, end = Math.min(barEnd, horizon);
        for (const { note, beat } of notesBetween(song, next, end)) emit(note, beat);
        next = end;
        if (end === barEnd && queued) { const q = queued; queued = null; anchorTime = timeOf(barEnd); anchorBeat = 0; next = 0; song = q.song; swing = song.swing || 0; bpm = q.opts.bpm || pending || bpm; pending = null; continue; }
        if (end === barEnd && pending) { anchorTime = timeOf(barEnd); anchorBeat = barEnd; bpm = pending; pending = null; }
      }
    }

    return { play, stop, setTempo, setLayers, update, current: () => name };
  }

  FP.sequencer = { notesBetween, createPlayer, LOOKAHEAD };
})();
