// ui/certificate.js — écran de fin : un « certificat d'éco-responsabilité » qui monte sur le jeu assombri, ses lignes qui
// s'écrivent, puis le tampon « VALIDÉ* » qui s'abat ; la relance n'est possible qu'après le tampon.
// Lit     : state.time, state.score.{flowers,eco,recordBefore}, state.plant.stemCount, state.flow.overReason,
//           FP.config.text.{certificate,again}, FP.font, FP.view.ui.
// Écrit   : state.fx.ui.overAt uniquement (instant du premier dessin de la fin de partie).
// Expose  : FP.certificate.lines(state), FP.certificate.canRestart(state) (purs, testés), FP.certificate.draw(g, state),
//           FP.certificate.{READY_AT, MARGIN, PADDING}.
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  const MARGIN = 10, PADDING = 4;
  const VEIL = .3, RISE = .35, LINE_STEP = .12, SLAM = .12, READY_AT = 1.9;
  const PAPER = '#efe6c8', BAND = '#d8ccaa', TRIM = '#7ed636', TEXT = '#2a3a1c', LABEL = '#5a4a3a', RED = '#c0392b';
  const fmt = (n) => n.toLocaleString('fr-FR');

  function lines(state) {
    const t = FP.config.text.certificate, sc = state.score, rb = sc.recordBefore || { flowers: 0, eco: 0 };
    const beaten = sc.flowers > rb.flowers || sc.eco > rb.eco;
    const rows = [
      { label: t.flowers, value: fmt(sc.flowers) },
      { label: t.eco, value: 'Ɇ' + fmt(sc.eco) },
      { label: t.stems, value: fmt(state.plant.stemCount) },
      beaten ? { label: t.record, value: t.beaten, beaten: true } : { label: t.record, value: fmt(rb.flowers) + ' FLEURS', beaten: false }
    ];
    if (!beaten) rows.push({ label: '', value: 'Ɇ' + fmt(rb.eco) });
    return { title: t.title, subtitle: t.subtitle, rows, cause: (state.flow.overReason || '').toLocaleUpperCase('fr-FR'), note: t.note, stamp: t.stamp };
  }

  function canRestart(state) {
    const ui = state.fx.ui;
    return !!ui && ui.overAt !== undefined && ui.overAt !== null && state.time - ui.overAt >= READY_AT;
  }

  // Voile : damier d'encre mis en cache à la taille de l'écran, dévoilé de haut en bas.
  let veil = null;
  function veilFor(w, h) {
    if (veil && veil.width === w && veil.height === h) return veil;
    veil = document.createElement('canvas'); veil.width = w; veil.height = h;
    const g = veil.getContext('2d'); g.fillStyle = FP.font.INK;
    for (let y = 0; y < h; y++) for (let x = y & 1; x < w; x += 2) g.fillRect(x, y, 1, 1);
    return veil;
  }

  const ease = (k) => 1 - Math.pow(1 - k, 3);
  const clamp01 = (k) => Math.max(0, Math.min(1, k));

  function draw(g, state) {
    const ui = state.fx.ui || (state.fx.ui = {});
    if (ui.overAt === undefined || ui.overAt === null) ui.overAt = state.time;
    const age = state.time - ui.overAt, { w, h } = FP.view.ui, font = FP.font, c = lines(state);
    const kv = clamp01(age / VEIL);
    if (kv > 0) g.drawImage(veilFor(w, h), 0, 0, w, Math.ceil(h * kv), 0, 0, w, Math.ceil(h * kv));

    // Contenu de la feuille, dans l'ordre d'écriture.
    const inner = w - 2 * MARGIN - 2 * PADDING, causeLines = font.wrap(c.cause, inner);
    const items = [
      { h: 16, draw: (x, y) => font.draw(g, c.title, w / 2, y, { scale: 2, color: TEXT, align: 'center', outline: false }) },
      { h: 13, draw: (x, y) => font.draw(g, c.subtitle, w / 2, y, { color: TEXT, align: 'center', outline: false }) },
      ...c.rows.map(r => ({ h: 10, draw: (x, y) => {
        font.draw(g, r.label, x, y, { color: LABEL, outline: false });
        font.draw(g, r.value, x + inner, y, { color: r.beaten ? RED : TEXT, align: 'right', outline: false });
      } })),
      { h: 10, draw: (x, y) => font.draw(g, FP.config.text.certificate.cause, x, y + 3, { color: LABEL, outline: false }) },
      ...causeLines.map(l => ({ h: 9, draw: (x, y) => font.draw(g, l, x, y, { color: TEXT, outline: false }) }))
    ];
    const stampAt = VEIL + RISE + items.length * LINE_STEP, stampH = 26;
    const ph = 8 + items.reduce((s, it) => s + it.h, 0) + stampH + 14, pw = w - 2 * MARGIN;
    const py0 = Math.max(6, Math.round((h - ph) / 2) - 8), kr = clamp01((age - VEIL) / RISE);
    if (kr <= 0) return;
    const shake = age > stampAt && age < stampAt + SLAM + .15 ? (Math.floor(age * 60) % 2 ? 1 : -1) : 0;
    const px = MARGIN + shake, py = Math.round(py0 + (1 - ease(kr)) * (h - py0));

    g.fillStyle = font.INK; g.fillRect(px - 1, py - 1, pw + 2, ph + 2);
    g.fillStyle = PAPER; g.fillRect(px, py, pw, ph);
    g.fillStyle = BAND; g.fillRect(px, py, pw, 3);
    g.fillStyle = TRIM; g.fillRect(px + 3, py + 5, pw - 6, 1); g.fillRect(px + 3, py + ph - 5, pw - 6, 1);

    let y = py + 9;
    const shown = Math.floor((age - VEIL - RISE) / LINE_STEP) + 1;
    items.forEach((it, i) => { if (i < shown) it.draw(px + PADDING, y); y += it.h; });

    // Tampon : il s'abat (×2 puis ×1), penché, avec une petite secousse de la feuille.
    if (age >= stampAt) {
      const s = age < stampAt + SLAM ? 2 : 1, tw = font.measure(c.stamp, { scale: s }), bw = tw + 8 * s, bh = font.HEIGHT * s + 8;
      g.save(); g.translate(px + pw - PADDING - 34, y + 12); g.rotate(-.25);
      g.fillStyle = RED; g.fillRect(-bw / 2, -bh / 2, bw, 2); g.fillRect(-bw / 2, bh / 2 - 2, bw, 2); g.fillRect(-bw / 2, -bh / 2, 2, bh); g.fillRect(bw / 2 - 2, -bh / 2, 2, bh);
      font.draw(g, c.stamp, 0, -font.HEIGHT * s / 2, { scale: s, color: RED, align: 'center', outline: false });
      g.restore();
      font.draw(g, c.note, px + PADDING, py + ph - 14, { color: LABEL, outline: false });
    }
    if (age >= READY_AT && Math.floor(age * 2) % 2 === 0) font.draw(g, FP.config.text.again, w / 2, Math.min(h - 12, py + ph + 8), { align: 'center' });
  }

  FP.certificate = { lines, canRestart, draw, READY_AT, MARGIN, PADDING };
})();
