// ui/font.js — police bitmap de l'interface : glyphes 5×7 dessinés à la main, majuscules seulement (style Mega Drive).
// Lit     : rien (les glyphes sont ici) ; FP.view n'est pas nécessaire : on dessine dans le contexte reçu.
// Écrit   : rien dans l'état ; un cache de glyphes rendus (canvas hors écran, créé au premier dessin).
// Expose  : FP.font.has(ch), FP.font.measure(texte, {scale}), FP.font.wrap(texte, largeurMax, {scale}),
//           FP.font.draw(g, texte, x, y, {color, scale, align, outline}) → largeur ; FP.font.{HEIGHT, INK, COLORS}.
// Unités : pixels d'art. Le texte est mis en capitales ; un caractère inconnu s'affiche « ? ». Pas de getImageData : file:// OK.
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  const HEIGHT = 7, INK = '#1a0a12';
  const COLORS = { cream: '#fff6c8', eco: '#cfff78', gold: '#ffd166', pink: '#ff5fa0', danger: '#ffb08a' };

  // Glyphes : 7 rangées de même longueur (1 à 5 colonnes ; ™ en 7), « # » = pixel plein.
  const G = {
    A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
    B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
    C: ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
    D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
    E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
    F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
    G: ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.###.'],
    H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
    I: ['###', '.#.', '.#.', '.#.', '.#.', '.#.', '###'],
    J: ['..###', '...#.', '...#.', '...#.', '#..#.', '#..#.', '.##..'],
    K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
    L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
    M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
    N: ['#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#', '#...#'],
    O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
    P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
    Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
    R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
    S: ['.###.', '#...#', '#....', '.###.', '....#', '#...#', '.###.'],
    T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
    U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
    V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
    W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'],
    X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
    Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
    Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
    0: ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'],
    1: ['.#.', '##.', '.#.', '.#.', '.#.', '.#.', '###'],
    2: ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
    3: ['####.', '....#', '....#', '.###.', '....#', '....#', '####.'],
    4: ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
    5: ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
    6: ['.###.', '#....', '#....', '####.', '#...#', '#...#', '.###.'],
    7: ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
    8: ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
    9: ['.###.', '#...#', '#...#', '.####', '....#', '....#', '.###.'],
    'Ɇ': ['#####', '#..#.', '#.#..', '####.', '##...', '#....', '#####'],
    '™': ['###.#.#', '.#..###', '.#..#.#', '.......', '.......', '.......', '.......'],
    '×': ['.....', '.....', '#...#', '.#.#.', '..#..', '.#.#.', '#...#'],
    '%': ['##..#', '##.#.', '...#.', '..#..', '.#...', '.#.##', '#..##'],
    '!': ['#', '#', '#', '#', '#', '.', '#'],
    '?': ['.###.', '#...#', '....#', '..##.', '..#..', '.....', '..#..'],
    ':': ['.', '.', '#', '.', '.', '#', '.'],
    "'": ['#', '#', '.', '.', '.', '.', '.'],
    '’': ['.#', '.#', '#.', '..', '..', '..', '..'],
    ',': ['..', '..', '..', '..', '..', '.#', '#.'],
    '.': ['.', '.', '.', '.', '.', '.', '#'],
    '*': ['.....', '#.#.#', '.###.', '#####', '.###.', '#.#.#', '.....'],
    '+': ['.....', '..#..', '..#..', '#####', '..#..', '..#..', '.....'],
    '-': ['...', '...', '...', '###', '...', '...', '...'],
    '/': ['..#', '..#', '.#.', '.#.', '.#.', '#..', '#..'],
    '(': ['.#', '#.', '#.', '#.', '#.', '#.', '.#'],
    ')': ['#.', '.#', '.#', '.#', '.#', '.#', '#.'],
    '©': ['.###.', '#...#', '#.###', '#.#..', '#.###', '#...#', '.###.'],
    ' ': ['...', '...', '...', '...', '...', '...', '...'],
    ' ': ['..', '..', '..', '..', '..', '..', '..'],
    ' ': ['..', '..', '..', '..', '..', '..', '..']
  };

  // Lettres accentuées : la lettre de base réduite à 5 rangées, sous 2 rangées d'accent (Ç : cédille dessous).
  const SMALL = {
    A: ['.###.', '#...#', '#####', '#...#', '#...#'], E: ['#####', '#....', '####.', '#....', '#####'],
    I: ['###', '.#.', '.#.', '.#.', '###'], O: ['.###.', '#...#', '#...#', '#...#', '.###.'],
    U: ['#...#', '#...#', '#...#', '#...#', '.###.'], C: ['.###.', '#....', '#....', '#....', '.###.']
  };
  const ACCENT = { grave: ['.#...', '..#..'], acute: ['...#.', '..#..'], circ: ['..#..', '.#.#.'], trema: ['.#.#.', '.....'] };
  const ACCENT3 = { circ: ['.#.', '#.#'], trema: ['#.#', '...'] };
  for (const [ch, base, acc] of [['À', 'A', 'grave'], ['Â', 'A', 'circ'], ['É', 'E', 'acute'], ['È', 'E', 'grave'], ['Ê', 'E', 'circ'],
    ['Ë', 'E', 'trema'], ['Î', 'I', 'circ'], ['Ï', 'I', 'trema'], ['Ô', 'O', 'circ'], ['Ù', 'U', 'grave'], ['Û', 'U', 'circ'], ['Ü', 'U', 'trema']]) {
    G[ch] = [...(base === 'I' ? ACCENT3 : ACCENT)[acc], ...SMALL[base]];
  }
  G['Ç'] = [...SMALL.C, '..#..', '.##..'];

  const upper = (s) => String(s).toLocaleUpperCase('fr-FR');
  const glyph = (ch) => G[ch] || G['?'];
  const has = (ch) => !!G[upper(ch)];

  function measure(text, opts) {
    const s = (opts && opts.scale) || 1, chars = [...upper(text)];
    if (!chars.length) return 0;
    return (chars.reduce((w, ch) => w + glyph(ch)[0].length, 0) + chars.length - 1) * s;
  }

  // Retour à la ligne glouton sur les espaces ; un mot trop large reste seul sur sa ligne.
  function wrap(text, maxWidth, opts) {
    const lines = [];
    for (const word of String(text).split(' ')) {
      const last = lines[lines.length - 1];
      if (last !== undefined && measure(last + ' ' + word, opts) <= maxWidth) lines[lines.length - 1] = last + ' ' + word;
      else lines.push(word);
    }
    return lines;
  }

  // Un glyphe rendu par (caractère, couleur, échelle, contour) : contour encre sur les 8 voisins et ombre (1, 1), puis la couleur.
  const cache = new Map();
  function rendered(ch, color, s, outline) {
    const key = ch + '|' + color + '|' + s + '|' + outline;
    let c = cache.get(key);
    if (c) return c;
    const rows = glyph(ch), w = rows[0].length * s, h = HEIGHT * s;
    c = document.createElement('canvas');
    c.width = w + 3; c.height = h + 3;
    const g = c.getContext('2d');
    const each = (fn) => rows.forEach((row, y) => [...row].forEach((p, x) => { if (p === '#') fn(1 + x * s, 1 + y * s); }));
    if (outline) {
      g.fillStyle = INK;
      each((x, y) => { for (const [dx, dy] of [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1], [2, 2]]) g.fillRect(x + dx, y + dy, s, s); });
    }
    g.fillStyle = color;
    each((x, y) => g.fillRect(x, y, s, s));
    cache.set(key, c);
    return c;
  }

  function draw(g, text, x, y, opts) {
    const o = opts || {}, s = o.scale || 1, color = o.color || COLORS.cream, outline = o.outline !== false;
    const width = measure(text, { scale: s });
    let cx = Math.round(o.align === 'center' ? x - width / 2 : o.align === 'right' ? x - width : x);
    const cy = Math.round(y);
    for (const ch of upper(text)) {
      const k = G[ch] ? ch : '?';
      g.drawImage(rendered(k, color, s, outline), cx - 1, cy - 1);
      cx += (glyph(k)[0].length + 1) * s;
    }
    return width;
  }

  FP.font = { has, measure, wrap, draw, HEIGHT, INK, COLORS };
})();
