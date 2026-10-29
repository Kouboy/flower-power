// render/palette.js — palettes nommées du rendu pixel (d'après docs/art/reference-crepuscule.png).
// Lit     : rien.
// Écrit   : rien.
// Expose  : FP.palette.{milieux (décor par milieu : sky, strata, lawn), strataBounds, strataTone(d, k, milieu), stem, seed, hero, cast, coin, flowers,
//           toxic, slug, danger, boss, decor()}.
// Les teintes de `danger` (violet chimique) signalent les dangers : interdites au décor, distinctes de la pousse.
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};

  // Décor de chaque milieu (v4.9.0) : ciel (du zénith à l'horizon, 8 bandes, une liste par nuance tirée), terre (4 teintes
  // proches par strate, assombries et désaturées : règle de lisibilité n° 1) et pelouse (une liste de 4 par nuance).
  // La friche garde le crépuscule pollué de la v4.1 (rose, orange, violet, voilé) ; aucun milieu n'emprunte le violet des dangers.
  const milieux = {
    friche: {
      sky: [
        ['#2e1452', '#482078', '#702880', '#b84080', '#c03870', '#d86850', '#f09060', '#f0b890'],
        ['#3a1a4a', '#5a2470', '#8a3070', '#c84a68', '#e06a50', '#f08a50', '#f4a868', '#f8d0a0'],
        ['#22103e', '#3a1868', '#58207a', '#86307e', '#a83a7a', '#c0506a', '#d07070', '#e0a090'],
        ['#2c2040', '#463458', '#64466a', '#8a5a74', '#a46a72', '#b88070', '#c89a80', '#d8bca0']
      ],
      strata: { humus: ['#130d0e', '#181110', '#1d1512', '#221914'], clay: ['#2a1a10', '#311f12', '#382414', '#3f2a17'], stone: ['#18140f', '#1d1813', '#221c17', '#28211b'] },
      lawn: [['#1c2e14', '#2c4a1e', '#3e6426', '#58802e'], ['#202c12', '#34461a', '#4a5e22', '#66782a'], ['#182a18', '#264426', '#365c30', '#4c7438'], ['#262a14', '#3a421c', '#525a24', '#6c722e']]
    },
    // Zone industrielle : smog gris qui vire au jaune soufre sur l'horizon ; terre grise et ocre ; herbe jaunie.
    industrie: {
      sky: [
        ['#1e1c1a', '#2e2b26', '#45402f', '#5e5636', '#7d7238', '#a0913a', '#c8b448', '#e6d070'],
        ['#1a1a1c', '#2a2a2c', '#3e3c38', '#58543e', '#746c42', '#948848', '#b4a656', '#d0c47a'],
        ['#201c18', '#302a22', '#4a3e2c', '#665432', '#866a34', '#a88238', '#c89c48', '#e0bc6a']
      ],
      strata: { humus: ['#141414', '#191918', '#1e1d1b', '#23221f'], clay: ['#2a2418', '#30291b', '#372f1e', '#3e3521'], stone: ['#161819', '#1b1d1f', '#202325', '#26292b'] },
      lawn: [['#22261a', '#343a20', '#4a5026', '#62682c'], ['#26261a', '#3a3a20', '#505026', '#68682e']]
    },
    // Décharge : ciel brun-vert de fumées ; terre brune jonchée ; herbe morte.
    decharge: {
      sky: [
        ['#1c1a12', '#2a2616', '#3c341a', '#524620', '#6a5a26', '#84702e', '#a08a3a', '#bca450'],
        ['#181c14', '#24281a', '#343820', '#464a26', '#5c5e2c', '#727234', '#8c8a40', '#a8a454'],
        ['#1e1814', '#2c221a', '#3e3020', '#544028', '#6c5230', '#86663a', '#a07c48', '#b8965e']
      ],
      strata: { humus: ['#15110c', '#1a150e', '#1f1910', '#241d12'], clay: ['#29200f', '#2f2511', '#362a13', '#3d3016'], stone: ['#1a1712', '#1f1c16', '#24201a', '#2a251e'] },
      lawn: [['#262014', '#3a3018', '#50421e', '#685626'], ['#22220f', '#363414', '#4c481a', '#646020']]
    },
    // Site nucléaire : nuit verdâtre, lune pâle ; terre bleu-gris ; herbe grise, morte.
    nucleaire: {
      sky: [
        ['#0a120e', '#0e1a14', '#12241a', '#183020', '#1e3c28', '#284a30', '#365a3a', '#4a6e48'],
        ['#0a0e12', '#0e161a', '#121e22', '#18282a', '#1e3232', '#283e3a', '#344c44', '#46604e'],
        ['#0c100c', '#121a12', '#182418', '#20301e', '#283c24', '#32482a', '#3e5632', '#50683e']
      ],
      strata: { humus: ['#0f1114', '#131619', '#171a1e', '#1b1f23'], clay: ['#191d24', '#1d222a', '#212730', '#262c36'], stone: ['#121519', '#16191e', '#1a1e23', '#1e2228'] },
      lawn: [['#1a2420', '#26342e', '#344640', '#465a52'], ['#1c221e', '#2a322c', '#3a443c', '#4c584e']]
    }
  };
  // Profondeur relative (0 = surface, 1 = fond) où commence la strate suivante.
  const strataBounds = { humus: .22, clay: .62 };

  // Tige : contour, ombre, corps, reflet ; ancienne tige plus sombre.
  const stem = { outline: '#141c0c', shade: '#2e4a1a', body: '#4f7a2a', light: '#8fbf4a', old: '#2a3a1c', oldLight: '#44602a', leaf: '#5e8c30' };

  // Graine du fond, endormie.
  const seed = { outline: '#2e2016', body: '#b8915c', shade: '#8e6b44', light: '#dcc08a' };

  // Héros (tête-bourgeon) et ses visages.
  const hero = {
    outline: '#141c0c', skin: '#7fb04a', skinShade: '#5a8a34', skinLight: '#a8d066', toxic: '#9bb84a', toxicShade: '#6e8a2e',
    eye: '#f4ecd8', pupil: '#140c08', mouth: '#5a1e1e', teeth: '#f4ecd8', tongue: '#e0606a', sweat: '#7ac8f0', brow: '#1e2a12'
  };

  // Personnages des pousses (v4.4.0, render/cast*.js) : accessoires et mutations. Aucun violet de danger.
  const cast = {
    band: '#e07a3a', bandDot: '#f8d070', red: '#d86a5a', glow: '#d8f050', crest: '#e0508a', crestLight: '#f6a0b8',
    metal: '#9aa4b0', drool: '#bfe8f8', frame: '#3a2a1a', glass: '#cfe8f0', shine: '#ffffff', nose: '#d84a3a', noseLight: '#f08a70',
    stache: '#5a3a1e', tint: '#c87a2a', shroom: '#c83a2a', shroomDot: '#f4ecd8', stalk: '#e8dcc0',
    shell: '#b8915c', shellLight: '#dcc08a', shellDark: '#8e6b44', fly: '#2a2a2a', pink: '#f0a0a0', tongueDark: '#b84050'
  };

  // Jeton ÉcoCrédits™ rouillé (v4.5.0, render/coins.js) : cuivre oxydé, vert-de-gris, Ɇ gravé, coulure de boue.
  const coin = { ink: '#140c08', copper: '#b8692e', light: '#d88a48', shine: '#f0b070', rust: '#8a4a20', verdigris: '#5fa88a', verdigrisDark: '#3f7a64', engrave: '#6a3414', mud: '#4a3a20' };

  // Fleurs : une palette par palette de jeu (config.garden.palettes, même ordre) — pétales clair / moyen / ombre,
  // cœur clair (il porte le visage du héros).
  const flowers = [
    { petal: ['#f8d070', '#f0a848', '#b86a28'], heart: '#e8b860' },
    { petal: ['#f6a0b8', '#e06a90', '#a83a62'], heart: '#f0c860' },
    { petal: ['#f0ece0', '#d0c8b4', '#988c78'], heart: '#e8b048' },
    { petal: ['#b8a0f0', '#8a6ad8', '#5a40a0'], heart: '#f0d070' },
    { petal: ['#f08a5a', '#d05a3a', '#902e22'], heart: '#f4d890' }
  ];

  // Dangers en violet chimique (v4.1.0) : la pousse est verte, ce qui est toxique est violet.
  const toxic = { ink: '#1a0a26', dark: '#3c1660', mid: '#7a2cc8', light: '#b45cff', glow: '#e6a0ff' };
  const slug = { outline: '#1a0a26', body: '#9446d0', clear: '#b070e8', shade: '#4a1a70', spot: '#ffb0f0', eye: '#f0e040', flash: '#ffd8ff' };
  // Teintes vives qui signalent un danger : interdites au décor, loin des verts de la pousse (tests dans dev/tests/px.test.js).
  const danger = [toxic.mid, toxic.light, toxic.glow, slug.body, slug.clear, slug.spot, slug.flash];

  // Boss provisoire (v4.12.0, render/boss.js) : blocs par milieu (corps, reflet, ombre, contour, rouille, coulure, rivet), plus ce qui est commun.
  // weak : blanc-jaune incandescent réservé aux points faibles (aucun décor, aucun obstacle ne l'emploie) ; trap : rayures jaune / noir ;
  // jet : jet de liquide de refroidissement (ni vert de pousse, ni violet de danger) ; glow : lueur d'avertissement ; smoke : fumée des trous.
  const boss = {
    milieux: {
      friche: { body: '#6e6b66', light: '#8d8a84', dark: '#43403c', edge: '#24211f', rust: '#8a4a2a', drip: '#aaa69e', rivet: '#b4b0a8' },
      industrie: { body: '#5e5048', light: '#86705c', dark: '#3a2e28', edge: '#1e1713', rust: '#a0522a', drip: '#c49068', rivet: '#c8a888' },
      decharge: { body: '#585c38', light: '#7a7e4c', dark: '#34381f', edge: '#1a1c0e', rust: '#7a4a24', drip: '#9c9c5c', rivet: '#b0b070' },
      nucleaire: { body: '#5a6862', light: '#7c8c84', dark: '#34403c', edge: '#161c1a', rust: '#6a5a3a', drip: '#9ab0a4', rivet: '#b0c4b8' }
    },
    weak: ['#ffff80', '#ffe838'], trap: ['#f0c000', '#14100a'], plate: ['#d8c8a0', '#14100a'],
    jet: ['#a8d8e8', '#5a9cc0'], glow: ['#e86a28', '#ff9a3a'], smoke: ['#5a5650', '#8a867e'], hole: '#0c0806'
  };

  // Teinte de terre du milieu id à une profondeur relative d (0 = surface, 1 = fond) ; k de 0 (claire) à 3 (sombre).
  function strataTone(d, k, id) {
    const s = milieux[id].strata, t = d < strataBounds.humus ? s.humus : (d < strataBounds.clay ? s.clay : s.stone);
    return t[3 - Math.max(0, Math.min(3, k))];
  }

  // Toutes les teintes de décor de tous les milieux (test : aucune n'approche une teinte de danger).
  const decor = () => Object.values(milieux).flatMap(m => [...m.sky.flat(), ...m.strata.humus, ...m.strata.clay, ...m.strata.stone, ...m.lawn.flat()]);

  FP.palette = { milieux, strataBounds, strataTone, stem, seed, hero, cast, coin, flowers, toxic, slug, danger, boss, decor };
})();
