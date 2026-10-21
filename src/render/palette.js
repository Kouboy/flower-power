// render/palette.js — palettes nommées du rendu pixel (d'après docs/art/reference-crepuscule.png).
// Lit     : rien.
// Écrit   : rien.
// Expose  : FP.palette.{sky, strata, strataBounds, lawn, stem, seed, hero, flowers, danger, decor()}.
// Le vert acide et le violet de `danger` signalent les dangers : ils sont interdits dans le décor (test dev/tests/px.test.js).
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};

  // Ciel : du zénith à l'horizon. Quatre nuances du même crépuscule pollué (rose, orange, violet, voilé).
  const sky = [
    ['#2e1452', '#482078', '#702880', '#b84080', '#c03870', '#d86850', '#f09060', '#f0b890'],
    ['#3a1a4a', '#5a2470', '#8a3070', '#c84a68', '#e06a50', '#f08a50', '#f4a868', '#f8d0a0'],
    ['#22103e', '#3a1868', '#58207a', '#86307e', '#a83a7a', '#c0506a', '#d07070', '#e0a090'],
    ['#2c2040', '#463458', '#64466a', '#8a5a74', '#a46a72', '#b88070', '#c89a80', '#d8bca0']
  ];

  // Terre : assombrie et désaturée par rapport à la planche (règle de lisibilité n° 1), 4 teintes proches par strate.
  const strata = {
    humus: ['#130d0e', '#181110', '#1d1512', '#221914'],
    clay: ['#2a1a10', '#311f12', '#382414', '#3f2a17'],
    stone: ['#18140f', '#1d1813', '#221c17', '#28211b']
  };
  // Profondeur relative (0 = surface, 1 = fond) où commence la strate suivante.
  const strataBounds = { humus: .22, clay: .62 };

  // Pelouse : quatre variantes d'un vert « sain », loin du vert acide des dangers.
  const lawn = [
    ['#1c2e14', '#2c4a1e', '#3e6426', '#58802e'],
    ['#202c12', '#34461a', '#4a5e22', '#66782a'],
    ['#182a18', '#264426', '#365c30', '#4c7438'],
    ['#262a14', '#3a421c', '#525a24', '#6c722e']
  ];

  // Tige : contour, ombre, corps, reflet ; ancienne tige plus sombre.
  const stem = { outline: '#141c0c', shade: '#2e4a1a', body: '#4f7a2a', light: '#8fbf4a', old: '#2a3a1c', oldLight: '#44602a', leaf: '#5e8c30' };

  // Graine du fond, endormie.
  const seed = { outline: '#2e2016', body: '#b8915c', shade: '#8e6b44', light: '#dcc08a' };

  // Héros (tête-bourgeon) et ses visages.
  const hero = {
    outline: '#141c0c', skin: '#7fb04a', skinShade: '#5a8a34', skinLight: '#a8d066', toxic: '#9bb84a', toxicShade: '#6e8a2e',
    eye: '#f4ecd8', pupil: '#140c08', mouth: '#5a1e1e', teeth: '#f4ecd8', tongue: '#e0606a', blush: '#e07a7a', sweat: '#7ac8f0', brow: '#1e2a12'
  };

  // Fleurs : une palette par palette de jeu (config.garden.palettes, même ordre) — pétales clair / moyen / ombre,
  // cœur clair (il porte le visage du héros).
  const flowers = [
    { petal: ['#f8d070', '#f0a848', '#b86a28'], heart: '#e8b860' },
    { petal: ['#f6a0b8', '#e06a90', '#a83a62'], heart: '#f0c860' },
    { petal: ['#f0ece0', '#d0c8b4', '#988c78'], heart: '#e8b048' },
    { petal: ['#b8a0f0', '#8a6ad8', '#5a40a0'], heart: '#f0d070' },
    { petal: ['#f08a5a', '#d05a3a', '#902e22'], heart: '#f4d890' }
  ];

  const danger = ['#b4ff3a', '#d8ff58', '#7a3cff', '#c13cff'];

  const decor = () => [...sky.flat(), ...strata.humus, ...strata.clay, ...strata.stone, ...lawn.flat()];

  FP.palette = { sky, strata, strataBounds, lawn, stem, seed, hero, flowers, danger, decor };
})();
