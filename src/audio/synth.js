// audio/synth.js — moteur FM façon Mega Drive (YM2612) : voix à 2 opérateurs, batterie en bruit filtré, écho, bus de mixage.
// Lit     : rien de l'état ; reçoit un AudioContext.
// Écrit   : rien dans l'état (le graphe Web Audio uniquement).
// Expose  : FP.synth.create(ac) → moteur { now, note, drum, burst, setGain, setFilter, drone, suspend, resume, context } ;
//           FP.synth.INSTRUMENTS, FP.synth.DRUMS.
// Seul fichier du jeu qui crée des nœuds Web Audio.
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

  // Instruments FM : ratio modulateur/porteuse, indice (profondeur, × fréquence) qui va de index à indexEnd en indexTime,
  // enveloppe (attack, decay, sustain, release), gain, tremolo (Hz), vibrato [Hz, profondeur relative], désaccord (cents),
  // part envoyée dans l'écho (wet).
  const INSTRUMENTS = {
    organ: { ratio: 1, index: .9, indexEnd: .7, attack: .06, sustain: .8, gain: .035, trem: 6.2, wet: .4, release: .15 },
    organ2: { ratio: 2, index: .5, attack: .08, gain: .015, detune: 14, wet: .6 },
    bass: { ratio: .5, index: 1.2, indexEnd: .4, gain: .16, sustain: .5, decay: .12 },
    sitar: { ratio: 3.51, index: 3.2, indexEnd: .6, indexTime: .25, gain: .05, sustain: .4, decay: .2, wet: .5, vibrato: [5.5, .006] },
    slap: { ratio: 1, index: 3.5, indexEnd: .5, indexTime: .06, gain: .17, sustain: .45, decay: .07, release: .05 },
    clav: { ratio: 3, index: 2.2, indexEnd: .3, indexTime: .05, gain: .02, sustain: .2, decay: .03, release: .03 },
    brass: { ratio: 1, index: 2.5, indexEnd: 4, attack: .03, gain: .05, sustain: .8, wet: .3 },
    theremin: { ratio: 1, index: .05, attack: .5, gain: .03, sustain: .9, vibrato: [6, .015], wet: .9, release: .6 },
    bell: { ratio: 3.5, index: 4, indexEnd: .2, indexTime: .4, gain: .06, sustain: .2, decay: .25, release: .4, wet: .3 },
    drill: { ratio: 1.41, index: 1.5, indexEnd: .3, indexTime: .04, gain: .08, sustain: .1, decay: .03, release: .03 },   // ronron de la foreuse, doux
    pluck: { ratio: 2, index: 3, indexEnd: .2, indexTime: .08, gain: .07, sustain: .1, decay: .08, release: .1 }
  };
  const DRUMS = ['kick', 'snare', 'hat', 'openhat', 'tamb'];

  function create(ac) {
    const out = ac.createDynamicsCompressor(); out.connect(ac.destination);
    const master = ac.createGain(); master.connect(out);
    const sfx = ac.createGain(); sfx.connect(master);
    const musicMute = ac.createGain(); musicMute.connect(master);   // interrupteur du réglage « effets seuls », que rien d'autre ne touche
    const song = ac.createGain(); song.gain.value = 0; song.connect(musicMute);
    const filter = ac.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 20000; filter.connect(song);
    const music = ac.createGain(); music.gain.value = .5; music.connect(filter);
    // Écho : retard + rétroaction filtrée, partagé (le côté « spooky »).
    const echo = ac.createGain(), delay = ac.createDelay(1.5), fb = ac.createGain(), lp = ac.createBiquadFilter(), wet = ac.createGain();
    delay.delayTime.value = .33; fb.gain.value = .38; lp.type = 'lowpass'; lp.frequency.value = 2400; wet.gain.value = .32;
    echo.connect(delay); delay.connect(lp); lp.connect(fb); fb.connect(delay); lp.connect(wet); wet.connect(master);
    const layers = {};
    const layer = (name) => layers[name] || (layers[name] = (() => { const g = ac.createGain(); g.connect(music); return g; })());
    const dest = (route) => (route && route.bus === 'sfx' ? sfx : layer((route && route.layer) || 'main'));

    function note(inst, midi, time, dur, vel = 1, route) {
      const o = INSTRUMENTS[inst];
      if (!o) return;
      const t = Math.max(time, ac.currentTime), f = mtof(midi) * (o.detune ? Math.pow(2, o.detune / 1200) : 1);
      const car = ac.createOscillator(), mod = ac.createOscillator(), mg = ac.createGain(), env = ac.createGain();
      car.frequency.setValueAtTime(f, t); mod.frequency.setValueAtTime(f * o.ratio, t);
      const bend = route && route.bend;
      if (bend) { car.frequency.setValueAtTime(f, t + dur * .5); car.frequency.exponentialRampToValueAtTime(f * bend, t + dur); }
      const i0 = (o.index || 1) * f, i1 = (o.indexEnd !== undefined ? o.indexEnd : (o.index || 1) * .3) * f;
      mg.gain.setValueAtTime(i0, t); mg.gain.exponentialRampToValueAtTime(Math.max(.01, i1), t + (o.indexTime || dur));
      const a = o.attack || .005, r = o.release || .08, g = (o.gain || .1) * vel, end = t + dur + r + .1;
      env.gain.setValueAtTime(.0001, t); env.gain.exponentialRampToValueAtTime(Math.max(.0002, g), t + a);
      env.gain.setTargetAtTime(g * (o.sustain !== undefined ? o.sustain : .6), t + a, o.decay || .15);
      env.gain.setTargetAtTime(.0001, t + dur, r / 3);
      if (o.vibrato) { const l = ac.createOscillator(), lg = ac.createGain(); l.frequency.value = o.vibrato[0]; lg.gain.value = f * o.vibrato[1]; l.connect(lg); lg.connect(car.frequency); l.start(t); l.stop(end); }
      let last = env;
      if (o.trem) {
        const l = ac.createOscillator(), lg = ac.createGain(), tg = ac.createGain();
        l.frequency.value = o.trem; lg.gain.value = .45; tg.gain.value = .55; l.connect(lg); lg.connect(tg.gain); env.connect(tg); last = tg; l.start(t); l.stop(end);
      }
      last.connect(dest(route));
      if (o.wet) { const w = ac.createGain(); w.gain.value = o.wet; last.connect(w); w.connect(echo); }
      mod.connect(mg); mg.connect(car.frequency); car.connect(env);
      car.start(t); mod.start(t); car.stop(end); mod.stop(end);
    }

    let noiseBuf = null;
    const buffer = () => {
      if (noiseBuf) return noiseBuf;
      const len = Math.max(1, Math.floor(ac.sampleRate * 1.35)), buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
      let x = 0x6d2b79f5;
      for (let i = 0; i < len; i++) { x = (x * 1664525 + 1013904223) >>> 0; d[i] = (x / 4294967296) * 2 - 1; }
      return (noiseBuf = buf);
    };
    // Bruit filtré bref (batterie, grattement, souffles).
    function burst(time, dur, gain, filterHz, type, route, q) {
      const t = Math.max(time, ac.currentTime), s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
      s.buffer = buffer(); f.type = type || 'lowpass'; f.frequency.value = filterHz; if (q) f.Q.value = q;
      g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(.0002, gain), t + .004);
      g.gain.exponentialRampToValueAtTime(.0001, t + dur);
      s.connect(f); f.connect(g); g.connect(dest(route));
      s.start(t, Math.random() * (s.buffer.duration - dur - .05 > 0 ? s.buffer.duration - dur - .05 : 0)); s.stop(t + dur + .05);
    }

    function drum(kind, time, vel = 1, route) {
      const t = Math.max(time, ac.currentTime);
      if (kind === 'kick') {
        const o = ac.createOscillator(), e = ac.createGain();
        o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + .12);
        e.gain.setValueAtTime(.55 * vel, t); e.gain.exponentialRampToValueAtTime(.0001, t + .28);
        o.connect(e); e.connect(dest(route)); o.start(t); o.stop(t + .3);
      } else if (kind === 'snare') { burst(t, .16, .22 * vel, 1900, 'bandpass', route, .8); note('pluck', 50, t, .05, .5 * vel, route); }
      else if (kind === 'hat') burst(t, .04, .07 * vel, 7500, 'highpass', route);
      else if (kind === 'openhat') burst(t, .18, .07 * vel, 7500, 'highpass', route);
      else if (kind === 'tamb') { burst(t, .09, .06 * vel, 9000, 'bandpass', route, 2); burst(t + .015, .06, .036 * vel, 6000, 'highpass', route); }
    }

    const PARAMS = { master: master.gain, music: music.gain, sfx: sfx.gain, song: song.gain, musicMute: musicMute.gain };
    function setGain(target, value, ramp) {
      const p = target.startsWith('layer:') ? layer(target.slice(6)).gain : PARAMS[target];
      if (!p) return;
      const n = ac.currentTime;
      p.cancelScheduledValues(n);
      if (!ramp) p.setValueAtTime(value, n); else p.setTargetAtTime(value, n, ramp / 3);
    }
    function setFilter(hz, ramp) { filter.frequency.setTargetAtTime(hz, ac.currentTime, (ramp || .2) / 3); }

    // Bourdonnement continu du frôlement, en FM : drone(true, fréquence, filtre, q, gain) ; drone(false, net).
    let drone = null;
    function setDrone(on, freq, filt, q, gain) {
      const n = ac.currentTime;
      if (!on) {
        if (!drone) return;
        const d = drone, fast = freq === true; drone = null;
        d.gain.gain.cancelScheduledValues(n); d.gain.gain.setTargetAtTime(.0001, n, fast ? .018 : .055); d.osc.stop(n + (fast ? .08 : .22)); d.mod.stop(n + (fast ? .08 : .22));
        return;
      }
      if (!drone) {
        const osc = ac.createOscillator(), mod = ac.createOscillator(), mg = ac.createGain(), f = ac.createBiquadFilter(), g = ac.createGain();
        osc.frequency.setValueAtTime(180, n); mod.frequency.setValueAtTime(270, n); mg.gain.setValueAtTime(360, n);   // FM : modulateur ×1,5, indice 2
        mod.connect(mg); mg.connect(osc.frequency); mod.start(n);
        f.type = 'bandpass'; f.frequency.setValueAtTime(900, n); f.Q.setValueAtTime(6, n);
        g.gain.setValueAtTime(.0001, n);
        osc.connect(f); f.connect(g); g.connect(sfx); osc.start(n);
        drone = { osc, mod, mg, filt: f, gain: g };
      }
      drone.osc.frequency.setTargetAtTime(freq, n, .018);
      drone.mod.frequency.setTargetAtTime(freq * 1.5, n, .018); drone.mg.gain.setTargetAtTime(freq * 2, n, .018);
      drone.filt.frequency.setTargetAtTime(filt, n, .018);
      drone.filt.Q.setTargetAtTime(q, n, .028);
      drone.gain.gain.setTargetAtTime(Math.max(.0001, gain), n, .018);
    }

    return { now: () => ac.currentTime, note, drum, burst, setGain, setFilter, drone: setDrone,
      suspend: () => ac.suspend && ac.suspend().catch(() => {}), resume: () => ac.resume && ac.resume().catch(() => {}), context: ac };
  }

  FP.synth = { create, INSTRUMENTS, DRUMS };
})();
