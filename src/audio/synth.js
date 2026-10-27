// audio/synth.js — moteur FM façon Mega Drive (YM2612) : voix à 2 opérateurs, batterie en bruit filtré, écho, bus de mixage.
// Lit     : rien de l'état ; reçoit un AudioContext.
// Écrit   : rien dans l'état (le graphe Web Audio uniquement).
// Expose  : FP.synth.create(ac) → moteur { now, note, drum, burst, setGain, setFilter, setTreble, hum, drone, suspend, resume, context } ;
//           FP.synth.INSTRUMENTS, FP.synth.DRUMS, FP.synth.MAX_VOICES (plafond de voix, au-delà duquel la musique se tait).
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
    // Reggae de la boutique (v4.6.0) : skank de clavinet avec écho, bubble d'orgue sec et court.
    skank: { ratio: 3, index: 2.2, indexEnd: .3, indexTime: .05, gain: .03, sustain: .2, decay: .03, release: .03, wet: .35 },
    bubble: { ratio: 1, index: 1.1, indexEnd: .8, attack: .01, gain: .05, sustain: .55, decay: .06, release: .05 },
    // Jetons (v4.7.1) : verre FM, cristallin (rapport ×3), qui s'adoucit en résonnant, avec de l'écho.
    glass: { ratio: 3, index: 1.8, indexEnd: .25, indexTime: .2, gain: .11, attack: .006, sustain: .35, decay: .2, release: .7, wet: .4 },
    // Effets de la boutique (v4.6.0), en FM pur : grains inharmoniques à indice énorme qui s'effondre (crayon, papier),
    // bip de caisse, « clonk » du tiroir, pièces qui tintent.
    grainA: { ratio: 1.41, index: 9, indexEnd: .5, indexTime: .03, gain: .035, attack: .002, sustain: .3, decay: .015, release: .01 },
    grainB: { ratio: 2.71, index: 9, indexEnd: .5, indexTime: .03, gain: .035, attack: .002, sustain: .3, decay: .015, release: .01 },
    grainC: { ratio: 3.31, index: 9, indexEnd: .5, indexTime: .03, gain: .035, attack: .002, sustain: .3, decay: .015, release: .01 },
    beep: { ratio: 1, index: .6, indexEnd: .6, gain: .05, attack: .002, sustain: .9, release: .01 },
    clonk: { ratio: 1.41, index: 4, indexEnd: .3, indexTime: .08, gain: .22, sustain: .2, decay: .05, release: .05 },
    tinkle: { ratio: 2.76, index: 2.5, indexEnd: .2, gain: .02, sustain: .2, decay: .03, release: .05 },
    pluck: { ratio: 2, index: 3, indexEnd: .2, indexTime: .08, gain: .07, sustain: .1, decay: .08, release: .1 },
    // Musiques des milieux (v4.10.0) : usine, décharge, centrale, et les thèmes de boss.
    metal: { ratio: 1.41, index: 6, indexEnd: .5, indexTime: .08, gain: .06, sustain: .1, decay: .06, release: .12, wet: .2 },   // tôle frappée
    siren: { ratio: 1, index: .4, attack: .3, gain: .03, sustain: .9, release: .4, wet: .4 },
    hum2: { ratio: .5, index: 2, indexEnd: 3.5, attack: .5, gain: .03, sustain: .9, release: .5 },                                  // bourdon de machine
    strings: { ratio: 1.002, index: 1.6, indexEnd: 1, attack: .03, gain: .028, sustain: .7, decay: .2, release: .2, wet: .4, detune: 8 },
    cowbell: { ratio: 1.48, index: 2, indexEnd: .4, indexTime: .05, gain: .04, sustain: .15, decay: .06, release: .08 },
    slide: { ratio: 1, index: .1, attack: .02, gain: .035, sustain: .9, release: .1, wet: .3 },                                    // sifflet à coulisse
    choir: { ratio: 2, index: .4, attack: .4, gain: .025, sustain: .9, vibrato: [5.5, .01], wet: .8, release: .6 },
    sbrass: { ratio: 1, index: 2.5, indexEnd: 3.5, attack: .04, gain: .045, sustain: .8, wet: .3, vibrato: [5, .006] },          // cuivres de pub
    rslap: { ratio: 1, index: 4, indexEnd: .8, indexTime: .04, gain: .17, sustain: .5, decay: .05, release: .03, detune: -12 },   // slap robotique
    accordion: { ratio: 2, index: 1.2, attack: .02, gain: .028, sustain: .8, trem: 9, detune: 10, wet: .2 },
    melodica: { ratio: 1, index: 1.2, attack: .05, gain: .03, sustain: .8, vibrato: [5, .012], wet: .3 },
    horn: { ratio: 1, index: 2.2, indexEnd: 3, attack: .04, gain: .045, sustain: .75, wet: .3, detune: 15 },                      // cuivres fatigués
    upright: { ratio: 1, index: .8, indexEnd: .3, attack: .015, gain: .2, sustain: .4, decay: .2, release: .08 },                 // contrebasse
    pulse: { ratio: 1, index: 1.8, indexEnd: .8, gain: .15, sustain: .6, decay: .1, release: .04 },
    arp: { ratio: 2, index: 1.4, indexEnd: .4, indexTime: .06, gain: .03, sustain: .3, decay: .06, release: .06, wet: .4 },
    pad: { ratio: 1.003, index: .8, attack: .7, gain: .028, sustain: .9, release: .9, wet: .7 },
    growl: { ratio: .5, index: 5, indexEnd: 4, gain: .11, sustain: .9, decay: .1, release: .05, trem: 4.2, detune: -15 },         // basse qui gronde
    saws: { ratio: 1, index: 3, indexEnd: 2.2, attack: .12, gain: .022, sustain: .8, decay: .1, release: .08, wet: .3 },          // accords qui pompent
    doom: { ratio: .5, index: 6, indexEnd: 2.5, indexTime: .15, gain: .13, sustain: .7, decay: .1, release: .05, detune: -8 },    // basse sale des boss
    sub: { ratio: 1, index: .2, gain: .2, sustain: .9, release: .05 },
    lowbrass: { ratio: 1, index: 3.5, indexEnd: 5, attack: .03, gain: .06, sustain: .85, wet: .25, detune: -10 }
  };
  const DRUMS = ['kick', 'snare', 'hat', 'openhat', 'tamb', 'clap', 'steam', 'lid', 'tick', 'guiro', 'cowbell'];
  // Plafond de voix (v4.7.5) : trop de voix à la fois font craquer le son d'un téléphone modeste. Au-delà, les notes de
  // musique sont sautées ; les effets jouent toujours.
  const MAX_VOICES = 40;

  function create(ac) {
    const out = ac.createDynamicsCompressor(); out.connect(ac.destination);
    const master = ac.createGain(); master.connect(out);
    const sfx = ac.createGain(); sfx.connect(master);
    const musicMute = ac.createGain(); musicMute.connect(master);   // interrupteur du réglage « effets seuls », que rien d'autre ne touche
    const song = ac.createGain(); song.gain.value = 0; song.connect(musicMute);
    const filter = ac.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 20000; filter.connect(song);
    // Plateau d'aigus (sono de supermarché pour le reggae de la boutique), neutre par défaut.
    const treble = ac.createBiquadFilter(); treble.type = 'highshelf'; treble.frequency.value = 2800; treble.gain.value = 0; treble.connect(filter);
    const music = ac.createGain(); music.gain.value = .5; music.connect(treble);
    // Écho : retard + rétroaction filtrée, partagé (le côté « spooky »).
    const echo = ac.createGain(), delay = ac.createDelay(1.5), fb = ac.createGain(), lp = ac.createBiquadFilter(), wet = ac.createGain();
    delay.delayTime.value = .33; fb.gain.value = .38; lp.type = 'lowpass'; lp.frequency.value = 2400; wet.gain.value = .32;
    echo.connect(delay); delay.connect(lp); lp.connect(fb); fb.connect(delay); lp.connect(wet); wet.connect(master);
    const layers = {};
    const layer = (name) => layers[name] || (layers[name] = (() => { const g = ac.createGain(); g.connect(music); return g; })());
    const dest = (route) => (route && route.bus === 'sfx' ? sfx : layer((route && route.layer) || 'main'));

    // Voix en cours (heures de fin) ; false si la note de musique doit être sautée.
    let voices = [];
    function voice(route, end) {
      if (voices.length >= MAX_VOICES) { const n = ac.currentTime; voices = voices.filter(e => e > n); }
      if (voices.length >= MAX_VOICES && !(route && route.bus === 'sfx')) return false;
      voices.push(end);
      return true;
    }

    // Nœuds partagés (v4.7.5), créés à la première demande et gardés : envois vers l'écho (un par dosage), oscillateurs
    // lents des trémolos et vibratos (un par vitesse), filtres des bruits (un par réglage et par sortie, fréquence au pas de 50 Hz).
    const sends = {}, lfos = {}, trems = {}, filters = new Map();
    const send = (w) => sends[w] || (sends[w] = (() => { const g = ac.createGain(); g.gain.value = w; g.connect(echo); return g; })());
    const lfo = (hz) => lfos[hz] || (lfos[hz] = (() => { const l = ac.createOscillator(); l.frequency.value = hz; l.start(); return l; })());
    const trem = (hz) => trems[hz] || (trems[hz] = (() => { const g = ac.createGain(); g.gain.value = .45; lfo(hz).connect(g); return g; })());
    function sharedFilter(type, hz, q, to) {
      const f50 = Math.round(hz / 50) * 50, key = type + ':' + f50 + ':' + (q || 0);
      let m = filters.get(to);
      if (!m) filters.set(to, (m = {}));
      if (!m[key]) { const f = ac.createBiquadFilter(); f.type = type; f.frequency.value = f50; if (q) f.Q.value = q; f.connect(to); m[key] = f; }
      return m[key];
    }

    // Voix permanentes (v4.7.5) : un son répété très souvent (route.mono = sa clé) rejoue sur les mêmes nœuds, relancés à
    // chaque note ; sans trémolo, vibrato ni écho. Les rampes partent de la valeur en cours : pas de clic d'une note à l'autre.
    const monos = {};
    function restart(params, t) { for (const p of params) p.cancelScheduledValues(t); }
    function monoNote(o, f, t, dur, vel, route) {
      const v = monos[route.mono] || (monos[route.mono] = (() => {
        const car = ac.createOscillator(), mod = ac.createOscillator(), mg = ac.createGain(), env = ac.createGain();
        env.gain.value = .0001; mod.connect(mg); mg.connect(car.frequency); car.connect(env); env.connect(dest(route));
        car.start(); mod.start();
        return { car, mod, mg, env };
      })());
      const i0 = (o.index || 1) * f, i1 = (o.indexEnd !== undefined ? o.indexEnd : (o.index || 1) * .3) * f;
      const a = o.attack || .005, r = o.release || .08, g = (o.gain || .1) * vel;
      restart([v.car.frequency, v.mod.frequency, v.mg.gain, v.env.gain], t);
      v.car.frequency.setValueAtTime(f, t); v.mod.frequency.setValueAtTime(f * o.ratio, t);
      v.mg.gain.setTargetAtTime(i0, t, .001); v.mg.gain.setTargetAtTime(Math.max(.01, i1), t + .003, (o.indexTime || dur) / 3);
      v.env.gain.setTargetAtTime(Math.max(.0002, g), t, a / 3);
      v.env.gain.setTargetAtTime(g * (o.sustain !== undefined ? o.sustain : .6), t + a, o.decay || .15);
      v.env.gain.setTargetAtTime(.0001, t + dur, r / 3);
    }
    function monoBurst(t, dur, gain, filterHz, type, route, q) {
      const v = monos[route.mono] || (monos[route.mono] = (() => {
        const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
        s.buffer = buffer(); s.loop = true; g.gain.value = .0001;
        s.connect(g); g.connect(f); f.connect(dest(route)); s.start();
        return { f, g };
      })());
      restart([v.g.gain, v.f.frequency, v.f.Q], t);
      v.f.type = type || 'lowpass'; v.f.frequency.setValueAtTime(filterHz, t); v.f.Q.setValueAtTime(q || 1, t);
      v.g.gain.setTargetAtTime(Math.max(.0002, gain), t, .0015);
      v.g.gain.setTargetAtTime(.0001, t + .004, Math.max(.002, dur - .004) / 7);
    }

    function note(inst, midi, time, dur, vel = 1, route) {
      const o = INSTRUMENTS[inst];
      if (!o) return;
      const cents = (o.detune || 0) + ((route && route.detune) || 0);   // désaccord de l'instrument, plus celui de la note
      const t = Math.max(time, ac.currentTime), f = mtof(midi) * (cents ? Math.pow(2, cents / 1200) : 1);
      if (route && route.mono) return monoNote(o, f, t, dur, vel, route);
      if (!voice(route, t + dur + (o.release || .08) + .1)) return;
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
      // Trémolo et vibrato : l'oscillateur lent partagé est débranché de la note quand elle se tait (sinon elle resterait en vie).
      const unhook = [];
      if (o.vibrato) { const l = lfo(o.vibrato[0]), lg = ac.createGain(); lg.gain.value = f * o.vibrato[1]; l.connect(lg); lg.connect(car.frequency); unhook.push(() => l.disconnect(lg)); }
      let last = env;
      if (o.trem) {
        const tg = ac.createGain(), tr = trem(o.trem);
        tg.gain.value = .55; tr.connect(tg.gain); env.connect(tg); last = tg; unhook.push(() => tr.disconnect(tg.gain));
      }
      if (unhook.length) car.onended = () => { for (const u of unhook) u(); };
      last.connect(dest(route));
      if (o.wet) last.connect(send(o.wet));
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
    // Bruit filtré bref (batterie, grattement, souffles) : enveloppe propre, filtre partagé.
    function burst(time, dur, gain, filterHz, type, route, q) {
      const t = Math.max(time, ac.currentTime);
      if (route && route.mono) return monoBurst(t, dur, gain, filterHz, type, route, q);
      if (!voice(route, t + dur + .05)) return;
      const s = ac.createBufferSource(), g = ac.createGain();
      s.buffer = buffer();
      g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(.0002, gain), t + .004);
      g.gain.exponentialRampToValueAtTime(.0001, t + dur);
      s.connect(g); g.connect(sharedFilter(type || 'lowpass', filterHz, q, dest(route)));
      s.start(t, Math.random() * (s.buffer.duration - dur - .05 > 0 ? s.buffer.duration - dur - .05 : 0)); s.stop(t + dur + .05);
    }

    function drum(kind, time, vel = 1, route) {
      const t = Math.max(time, ac.currentTime);
      if (kind === 'kick') {
        if (!voice(route, t + .3)) return;
        const o = ac.createOscillator(), e = ac.createGain();
        o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + .12);
        e.gain.setValueAtTime(.55 * vel, t); e.gain.exponentialRampToValueAtTime(.0001, t + .28);
        o.connect(e); e.connect(dest(route)); o.start(t); o.stop(t + .3);
      } else if (kind === 'snare') { burst(t, .16, .22 * vel, 1900, 'bandpass', route, .8); note('pluck', 50, t, .05, .5 * vel, route); }
      else if (kind === 'hat') burst(t, .04, .07 * vel, 7500, 'highpass', route);
      else if (kind === 'openhat') burst(t, .18, .07 * vel, 7500, 'highpass', route);
      else if (kind === 'tamb') { burst(t, .09, .06 * vel, 9000, 'bandpass', route, 2); burst(t + .015, .06, .036 * vel, 6000, 'highpass', route); }
      // Percussions des milieux (v4.10.0) : clap, vapeur, couvercle de poubelle, tic de compteur, râpe, cloche à vache.
      else if (kind === 'clap') { for (const d of [0, .012, .024]) burst(t + d, d === .024 ? .12 : .02, .15 * vel, 1400, 'bandpass', route, 1.5); }
      else if (kind === 'steam') burst(t, .3, .06 * vel, 5000, 'highpass', route);
      else if (kind === 'lid') { burst(t, .12, .08 * vel, 3800, 'bandpass', route, 4); note('metal', 88, t, .08, .4 * vel, route); }
      else if (kind === 'tick') burst(t, .012, .12 * vel, 5000, 'highpass', route);
      else if (kind === 'guiro') { for (let i = 0; i < 6; i++) burst(t + i * .014, .012, .06 * vel, 4200, 'bandpass', route, 3); }
      else if (kind === 'cowbell') { note('cowbell', 80, t, .1, vel, route); note('cowbell', 87, t, .1, .6 * vel, route); }
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
    function setTreble(db, ramp) { treble.gain.setTargetAtTime(db, ac.currentTime, (ramp || .2) / 3); }

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

    // Grincement continu de la nappe toxique (v4.7.0) : FM inharmonique (×1,41), indice et gain pilotés ; hum(false[, net]) l'éteint.
    let hum = null;
    function setHum(on, freq, index, gain) {
      const n = ac.currentTime;
      if (!on) {
        if (!hum) return;
        const h = hum, fast = freq === true; hum = null;
        h.gain.gain.cancelScheduledValues(n); h.gain.gain.setTargetAtTime(.0001, n, fast ? .015 : .08); h.osc.stop(n + (fast ? .08 : .35)); h.mod.stop(n + (fast ? .08 : .35));
        return;
      }
      if (!hum) {
        const osc = ac.createOscillator(), mod = ac.createOscillator(), mg = ac.createGain(), g = ac.createGain();
        osc.frequency.setValueAtTime(freq, n); mod.frequency.setValueAtTime(freq * 1.41, n); mg.gain.setValueAtTime(freq * index, n);
        mod.connect(mg); mg.connect(osc.frequency); g.gain.setValueAtTime(.0001, n);
        osc.connect(g); g.connect(sfx); osc.start(n); mod.start(n);
        hum = { osc, mod, mg, gain: g };
      }
      hum.osc.frequency.setTargetAtTime(freq, n, .05); hum.mod.frequency.setTargetAtTime(freq * 1.41, n, .05);
      hum.mg.gain.setTargetAtTime(freq * index, n, .05); hum.gain.gain.setTargetAtTime(Math.max(.0001, gain), n, .05);
    }

    return { now: () => ac.currentTime, note, drum, burst, setGain, setFilter, setTreble, hum: setHum, drone: setDrone,
      suspend: () => ac.suspend && ac.suspend().catch(() => {}), resume: () => ac.resume && ac.resume().catch(() => {}), context: ac };
  }

  FP.synth = { create, INSTRUMENTS, DRUMS, MAX_VOICES };
})();
