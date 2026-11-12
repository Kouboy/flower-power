// audio/audio.js — chef d'orchestre du son (Web Audio, aucun fichier) : déblocage au premier geste, événements de la frame →
// effets (FP.sfx, dont les sons du boss : bossTarget, bossSeed, bossWarn, bossLock, bossShot, bossHead, bossBlast, bossCrumble, le rot burp au leakPop, et le jingle bossVictory au bossPeak ; un assaut ne joue ni impact ni jingle de mort) et musique (FP.music), pause quand l'onglet est caché.
// Lit     : les événements de la frame, state (via FP.sfx.drone et FP.music.update ; state.bossFight.destroyed et state.run.milieu pour la durée de bossWarn, la gamme des ramassages et la tonique des sons — v5.10.0 —, state.mode : aucune tonique au menu ni sur l'écran de fin), FP.bossThreats.timing, FP.config.milieux, FP.synth, FP.state.current.
// Écrit   : rien dans l'état.
// Expose  : FP.audio.consume(events, state, dt), FP.audio.sfx(name, intensity?), FP.audio.unlock(),
//           FP.audio.setting() / cycleSetting() / loadSetting() (réglage 'all' | 'sfx' | 'mute', mémorisé sous flower_power_v4_sound),
//           FP.audio._backend (moteur ; remplaçable par un espion dans les tests, null tant que l'audio est muet).
//           FP.audio.UNLOCK_EVENTS. Installe sur window les écouteurs (pointerdown, pointerup, keydown) qui débloquent le son.
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
        apply(b);
        // La musique est planifiée sur sa propre horloge (25 ms), indépendante des images du jeu.
        setInterval(() => { try { FP.music.update(FP.state.current, [], b); } catch (e) { /* musique muette plutôt qu'une erreur */ } }, 25);
        // Onglet caché ou téléphone verrouillé : tout le son se met en pause (l'horloge audio s'arrête avec lui).
        document.addEventListener('visibilitychange', () => { if (document.hidden) b.suspend(); else b.resume(); });
      }
      const ac = FP.audio._backend.context;
      if (ac && ac.state === 'suspended') ac.resume().catch(() => {});
    } catch (e) { /* audio indisponible : le jeu reste muet */ }
  }

  // Réglage du son : tout, effets seuls (musique coupée), muet. Valeur inconnue en stockage → tout.
  const KEY = 'flower_power_v4_sound', ORDER = ['all', 'sfx', 'mute'];
  let current = 'all';
  function loadSetting() {
    const v = FP.storage.readJSON(KEY, null);
    current = v && ORDER.includes(v.setting) ? v.setting : 'all';
    return current;
  }
  function apply(b) {
    if (!b) return;
    try { b.setGain('musicMute', current === 'all' ? 1 : 0, .05); b.setGain('master', current === 'mute' ? 0 : 1, .05); } catch (e) { /* muet plutôt qu'une erreur */ }
  }
  function cycleSetting() {
    current = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length];
    FP.storage.writeJSON(KEY, { setting: current });
    apply(FP.audio._backend);
    sfx('toggle');   // inaudible en « muet », c'est voulu
    return current;
  }

  // Un son d'interface ou de jeu, par son nom (les écrans ui/* appellent ceci directement).
  function sfx(name, intensity) {
    const b = FP.audio._backend;
    if (!b) return;
    try { if (FP.songs.jingles[name]) FP.sfx.jingle(b, name); else FP.sfx.play(b, name, intensity); } catch (e) { /* un son raté ne doit jamais casser une frame */ }
  }

  // Durée de l'avertissement d'une défense de boss au rythme du combat (FP.bossThreats.timing) : le son qui monte la couvre.
  const warnTime = (state) => FP.bossThreats.timing(state.bossFight.destroyed.filter(Boolean).length, FP.config.milieux[state.run.milieu].id).warn;

  // Gamme des ramassages (v5.5.0), tonique et mode des autres sons (v5.10.0) : ceux du milieu en cours (FP.sfx) ; au menu et sur
  // l'écran de fin (thème du titre, en mi), aucun.
  const TITLE = { splash: true, menu: true, over: true, won: true };
  const keyOf = (state) => (state && state.run && !TITLE[state.mode] ? FP.config.milieux[state.run.milieu].id : null);

  // Événements de la frame → effets.
  function play(b, e, state) {
    const key = keyOf(state);
    switch (e.type) {
      case 'runStart': return FP.sfx.play(b, 'start', 1, key);
      case 'stemStart': return FP.sfx.play(b, 'growStart', 1, key);
      case 'bloom': return FP.sfx.play(b, 'crack', 1, key);
      case 'blossom': return FP.sfx.jingle(b, 'blossom', key);
      case 'eco': return e.kind === 'coin' || e.kind === 'chain' ? undefined : FP.sfx.play(b, 'eco', e.combo || 1, key);   // pièce et chapelet ont leurs sons
      case 'coin': return FP.sfx.play(b, 'coin', { rank: e.rank || 0, chain: e.chain || 0 }, key);
      case 'chainDone': return FP.sfx.play(b, 'chain', 1, key);
      case 'germCrack': return FP.sfx.play(b, 'germCrack', 1, key);
      case 'germPop': return FP.sfx.play(b, 'germPop', 1, key);
      case 'shopOpen': return FP.sfx.play(b, 'crumple', 1, key);
      case 'shopTick': return FP.sfx.play(b, 'pencil', 1, key);
      case 'shopOrder': return FP.sfx.play(b, 'register', 1, key);
      case 'shopClose': return FP.sfx.play(b, 'crumpleOut', 1, key);
      case 'grazeStart': return FP.sfx.play(b, 'grazeStart', clamp(e.intensity || .6, .2, 1.6), key);
      case 'pickup': return FP.sfx.play(b, e.kind === 'water' ? 'water' : 'bud', 1, key);
      case 'shieldBreak': return FP.sfx.play(b, 'shieldBreak', 1, key);
      case 'bomb': return FP.sfx.play(b, 'bomb', 1, key);
      case 'death': if (e.cause === 'assault') return;   // l'assaut : l'explosion de la cible (bossTarget) tient lieu de son, pas de jingle de mort
        FP.sfx.play(b, e.cause === 'solid' ? 'hit' : 'acid', 1, key); return FP.sfx.jingle(b, 'death', key);
      case 'bossWarn': return FP.sfx.play(b, 'bossWarn', warnTime(state), key);   // monte sur toute la durée de l'avertissement
      case 'bossTarget': case 'bossSeed': case 'bossLock': case 'bossShot': case 'bossHead': case 'bossBlast': case 'bossCrumble': return FP.sfx.play(b, e.type, 1, key);
      case 'bossPeak': return FP.sfx.jingle(b, 'bossVictory', key);   // la musique s'est tue à la tête transpercée (FP.music) : la victoire éclate dans le silence
      case 'leakPop': return FP.sfx.play(b, 'burp', 1, key);
      case 'toxicEnter': return FP.sfx.play(b, 'contaminate', 1, key);
      case 'bonusSpawn': case 'ready': return FP.sfx.play(b, 'ready', 1, key);
      case 'bossDown': return FP.sfx.play(b, 'bossDown', 1, key);
      case 'growthTick': return FP.sfx.scrape(b, e.k || 0, key);
    }
  }

  function consume(events, state, dt) {
    const b = FP.audio._backend;
    if (!b) return;
    try {
      for (const e of events) play(b, e, state);
      FP.sfx.drone(b, state, events);
      FP.sfx.hum(b, state, events);
      FP.music.update(state, events, b);
    } catch (e) { /* audio muet plutôt qu'une partie figée */ }
  }

  // Gestes qui débloquent le son. Au doigt, le navigateur ne compte que le lever (pointerup) : sans lui, le premier toucher
  // laissait le moteur en pause et la musique du titre muette jusqu'au toucher suivant.
  const UNLOCK_EVENTS = ['pointerdown', 'pointerup', 'keydown'];

  FP.audio = { consume, sfx, unlock, setting: () => current, cycleSetting, loadSetting, UNLOCK_EVENTS, _backend: null };
  loadSetting();

  if (typeof window !== 'undefined' && window.addEventListener) {
    for (const type of UNLOCK_EVENTS) window.addEventListener(type, unlock);
  }
})();
