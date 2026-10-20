// render/soil.js — ciel, pelouse et terre illustrés, pré-rendus dans un cache offscreen.
// Lit     : world.{width,height,surfaceY,skyVariant,lawnVariant}, FP.config.{palette,soil}.
// Écrit   : rien dans l'état (cache canvas interne).
// Expose  : FP.soil.draw(ctx, world, cameraY, viewW, viewH), FP.soil.surfaceTop(world).
// Le cache couvre max(world.width, viewW) : une fenêtre élargie en cours de run reste couverte.
// Porté de la v3.43.16 (rebuildSoilCache, buildSoilGrainPattern, drawCloudTo, rrLocal).
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  const TAU = FP.TAU;
  const { lerp } = FP.math;

  const cache = document.createElement('canvas');
  const g = cache.getContext('2d');
  let cacheKey = '';
  let grain = null, grainKey = '';

  const surfaceTop = (world) => world.surfaceY + FP.config.soil.surfaceOffset;

  // Pseudo-aléatoire stable dérivé de deux nombres (détails du sol identiques d'une frame à l'autre).
  function rrLocal(a, b, min, max) {
    const v = (Math.sin(a * 12.9898 + b * 78.233) * 43758.5453) % 1;
    return min + (max - min) * Math.abs(v);
  }

  function drawCloud(x, y, s, flip) {
    g.save(); g.translate(x, y); g.scale(s * flip, s);
    g.fillStyle = 'rgba(255,247,218,.78)'; g.strokeStyle = 'rgba(30,39,54,.20)'; g.lineWidth = 2.1;
    g.beginPath(); g.ellipse(-28, 6, 26, 13, 0, 0, TAU); g.ellipse(-7, -2, 30, 18, 0, 0, TAU); g.ellipse(20, 5, 28, 14, 0, 0, TAU); g.ellipse(3, 10, 45, 12, 0, 0, TAU); g.fill();
    g.beginPath(); g.moveTo(-48, 8); g.quadraticCurveTo(-24, -10, -3, 0); g.quadraticCurveTo(16, -16, 44, 8); g.stroke();
    g.restore();
  }

  // Motif de grain 96×96 répétable : poussières sombres, paillettes claires, petites nappes.
  function grainPattern(key) {
    if (grain && grainKey === key) return grain;
    const c = document.createElement('canvas'); c.width = 96; c.height = 96;
    const p = c.getContext('2d');
    for (let i = 0; i < 2400; i++) {
      const x = (i * 37 + key.length * 11 + (i % 7) * 13) % c.width;
      const y = (i * 53 + key.length * 17 + (i % 11) * 7) % c.height;
      const r = (i % 23 === 0) ? 2 : 1;
      const alpha = (i % 10 === 0) ? .22 : ((i % 4 === 0) ? .14 : .10);
      p.fillStyle = (i % 7 === 0) ? `rgba(238,209,154,${alpha})` : (i % 5 === 0 ? `rgba(128,87,62,${alpha})` : `rgba(23,15,12,${alpha})`);
      p.fillRect(x, y, r, r);
    }
    for (let i = 0; i < 36; i++) {
      const x = (i * 29 + 9) % c.width, y = (i * 31 + 17) % c.height;
      p.fillStyle = (i % 2 === 0) ? 'rgba(245,222,171,.08)' : 'rgba(37,25,20,.07)';
      p.beginPath(); p.ellipse(x, y, 4 + (i % 3), 2.5 + ((i * 5) % 3), ((i * 17) % 360) * Math.PI / 180, 0, TAU); p.fill();
    }
    p.globalAlpha = .16; p.strokeStyle = 'rgba(239,219,180,.45)'; p.lineWidth = .75;
    for (let i = 0; i < 54; i++) {
      const x = (i * 19) % c.width, y = (i * 27 + 7) % c.height;
      p.beginPath(); p.moveTo(x, y); p.lineTo(x + 3 + (i % 4), y + ((i % 2) ? 1 : -1)); p.stroke();
    }
    grain = c; grainKey = key;
    return c;
  }

  function drawSky(W, top, surfaceY, sky) {
    const sp = FP.config.palette.skies[sky % FP.config.palette.skies.length];
    const grad = g.createLinearGradient(0, 0, 0, top + 34);
    grad.addColorStop(0, sp[0]); grad.addColorStop(.43, sp[1]); grad.addColorStop(.80, sp[2]); grad.addColorStop(1, sp[3]);
    g.fillStyle = grad; g.fillRect(0, 0, W, top + 34);
    drawCloud(W * .20, surfaceY * .36, .58, 1); drawCloud(W * .74, surfaceY * .30, .48, -1);
    // Grain de papier / poussière atmosphérique.
    g.globalAlpha = .11;
    for (let i = 0; i < 54; i++) {
      const x = Math.abs((i * 83 + sky * 19) % W), y = 7 + Math.abs((i * 47 + sky * 31) % Math.max(12, surfaceY - 12));
      g.fillStyle = (i % 4 === 0) ? '#fff1c8' : (i % 3 === 0 ? '#b0c2bf' : '#465f62');
      g.beginPath(); g.arc(x, y, .7 + (i % 3) * .38, 0, TAU); g.fill();
    }
    g.globalAlpha = 1;
  }

  // Lisière : touffe herbeuse dessinée, bord sombre, brins.
  function drawLawn(W, top, lawnVariant) {
    const lp = FP.config.palette.lawns[lawnVariant % FP.config.palette.lawns.length];
    const edge = (x) => top - 4 + Math.sin(x * .047) * 2.4 + Math.sin(x * .019) * 3.1;
    const grad = g.createLinearGradient(0, top - 17, 0, top + 16);
    grad.addColorStop(0, lp[0]); grad.addColorStop(.50, lp[1]); grad.addColorStop(1, lp[2]);
    g.fillStyle = grad; g.beginPath(); g.moveTo(0, top);
    for (let x = 0; x <= W; x += 14) g.lineTo(x, edge(x));
    g.lineTo(W, top + 16); g.lineTo(0, top + 16); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(48,58,33,.78)'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(0, top);
    for (let x = 0; x <= W; x += 14) g.lineTo(x, edge(x));
    g.stroke();
    g.strokeStyle = 'rgba(195,211,117,.72)'; g.lineWidth = 2.2; g.lineCap = 'round';
    for (let x = 5; x < W; x += 17) {
      const h = 8 + ((x * 37) % 11), y0 = top - 1 + Math.sin(x * .045) * 2;
      g.beginPath(); g.moveTo(x, y0); g.quadraticCurveTo(x + 1.2, y0 - h * .48, x + Math.sin(x * .17) * 3, y0 - h); g.stroke();
      if ((x / 17 | 0) % 4 === 1) { g.beginPath(); g.moveTo(x + 1, y0 - 4); g.lineTo(x - 5, y0 - 10); g.stroke(); }
    }
  }

  // Transition de coupe sous l'herbe : croûte, poches, mottes, racines exposées, brins secs.
  function drawTopsoil(W, top, sky, lawn) {
    g.save();
    g.fillStyle = 'rgba(70,43,29,.42)';
    g.beginPath(); g.moveTo(0, top + 2);
    for (let x = 0; x <= W; x += 11) g.lineTo(x, top + 6 + Math.sin(x * .083 + lawn) * 3.2 + Math.sin(x * .031 + sky) * 2.4);
    for (let x = W; x >= 0; x -= 14) g.lineTo(x, top + 22 + Math.sin(x * .057 + 1.7) * 4.6 + Math.sin(x * .019) * 2.8);
    g.closePath(); g.fill();
    for (let i = 0; i < 48; i++) {
      const x = (i * 73 + 19 + lawn * 11) % Math.max(1, W), y = top + 7 + ((i * 29 + sky * 7) % 24);
      g.fillStyle = i % 5 === 0 ? 'rgba(210,158,105,.26)' : (i % 3 === 0 ? 'rgba(45,28,21,.34)' : 'rgba(112,72,49,.28)');
      g.beginPath(); g.ellipse(x, y, 2.2 + (i % 4) * 1.3, 1.2 + ((i * 5) % 3) * .8, ((i * 31) % 80) * Math.PI / 180, 0, TAU); g.fill();
    }
    for (let i = 0; i < 22; i++) {
      const x = (i * 91 + 37 + lawn * 13) % Math.max(1, W), y = top - 1 - ((i * 7) % 4), s = 1.5 + ((i * 11) % 4) * .7;
      g.fillStyle = i % 3 === 0 ? 'rgba(83,53,35,.78)' : 'rgba(118,76,47,.72)';
      g.beginPath(); g.moveTo(x - s * 1.2, y + s * .2); g.lineTo(x - s * .2, y - s * .8); g.lineTo(x + s, y - s * .2); g.lineTo(x + s * .7, y + s * .8); g.closePath(); g.fill();
    }
    g.lineCap = 'round';
    for (let i = 0; i < 18; i++) {
      const x = 10 + ((i * 67 + 23) % Math.max(20, W - 20)), len = 16 + ((i * 23) % 34);
      g.strokeStyle = i % 4 === 0 ? 'rgba(207,178,121,.50)' : 'rgba(169,137,94,.42)';
      g.lineWidth = 1.35 + (i % 3) * .35;
      g.beginPath(); g.moveTo(x, top + 2);
      g.bezierCurveTo(x + Math.sin(i * 1.8) * 4, top + 9, x + Math.cos(i * .73) * 8, top + len * .62, x + Math.sin(i * .91) * 11, top + len);
      g.stroke();
      if (i % 2 === 0) {
        const by = top + len * .48;
        g.lineWidth = .8; g.beginPath(); g.moveTo(x + Math.sin(i * .6) * 3, by); g.lineTo(x + ((i % 4) - 1.5) * 5, by + 8 + (i % 5)); g.stroke();
      }
    }
    g.strokeStyle = 'rgba(204,176,108,.28)'; g.lineWidth = .8;
    for (let i = 0; i < 28; i++) {
      const x = (i * 47 + 11) % Math.max(1, W), y = top + 5 + ((i * 17) % 20), dx = 3 + ((i * 5) % 6);
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + (i % 2 ? dx : -dx), y + 2 + ((i * 3) % 4)); g.stroke();
    }
    g.restore();
  }

  // Masse de terre : dégradé, bandes, strates, inclusions, grain, racines, fissures, fibres.
  function drawEarth(W, top, wb, sky, lawn) {
    const H = wb - top;
    const grad = g.createLinearGradient(0, top, 0, wb);
    grad.addColorStop(0, '#936342'); grad.addColorStop(.15, '#764a32'); grad.addColorStop(.34, '#543524');
    grad.addColorStop(.57, '#36231a'); grad.addColorStop(.79, '#201510'); grad.addColorStop(1, '#0c0807');
    g.fillStyle = grad; g.fillRect(0, top, W, H);
    for (const b of FP.config.palette.soilBands) {
      const y0 = lerp(top, wb, b.a), y1 = lerp(top, wb, b.b);
      g.fillStyle = b.c; g.fillRect(0, y0, W, y1 - y0);
    }
    drawTopsoil(W, top, sky, lawn);

    for (let y = top + 42; y < wb; y += 58) {
      const k = (y - top) / H;
      g.globalAlpha = .24 - k * .08; g.strokeStyle = k < .30 ? '#c08a5c' : (k < .60 ? '#815b43' : '#4a3329'); g.lineWidth = 3.1;
      g.beginPath(); g.moveTo(-8, y);
      for (let x = 0; x <= W + 12; x += 24) g.lineTo(x, y + Math.sin(x * .036 + y * .018) * 4.5 + Math.sin(x * .011 + y * .006) * 7.5);
      g.stroke();
      g.globalAlpha = .10; g.strokeStyle = '#160e0a'; g.lineWidth = 1.2; g.stroke();
    }

    g.globalAlpha = .46;
    for (let i = 0; i < 148; i++) {
      const x = Math.abs((i * 97 + Math.sin(i * 12.9) * 54) % W), y = top + 24 + Math.abs((i * 173 + Math.cos(i) * 81) % Math.max(1, H - 46));
      const k = (y - top) / H, rw = 2.0 + ((i * 7) % 5), rh = 1.1 + ((i * 11) % 3) * .72;
      g.fillStyle = k < .30 ? (i % 5 === 0 ? '#d0a473' : '#a8754f') : (k < .62 ? (i % 6 === 0 ? '#8f6d55' : '#684733') : (i % 7 === 0 ? '#4d382d' : '#2b1c16'));
      g.beginPath(); g.ellipse(x, y, rw, rh, ((i * 37) % 90) * Math.PI / 180, 0, TAU); g.fill();
      if (i % 9 === 0) { g.globalAlpha = .18; g.strokeStyle = '#ead3a9'; g.lineWidth = .8; g.stroke(); g.globalAlpha = .46; }
    }

    g.globalAlpha = .22;
    for (let i = 0; i < 420; i++) {
      const x = Math.abs((i * 53 + Math.sin(i * 5.7) * 61) % W), y = top + 8 + Math.abs((i * 131 + Math.cos(i * 1.9) * 49) % Math.max(1, H - 14));
      const k = (y - top) / H;
      g.fillStyle = k < .24 ? (i % 5 === 0 ? '#d8ad74' : (i % 2 === 0 ? '#7a5036' : '#5e3c2c')) : (k < .62 ? (i % 4 === 0 ? '#8f694f' : (i % 2 === 0 ? '#5a3a2b' : '#2b1d17')) : (i % 3 === 0 ? '#4b352b' : '#18100d'));
      g.fillRect(x, y, 1 + (i % 3 === 0 ? 1 : 0), 1 + (i % 7 === 0 ? 1 : 0));
    }

    g.globalAlpha = .18;
    for (let i = 0; i < 94; i++) {
      const x = Math.abs((i * 109 + 23) % W), y = top + 14 + Math.abs((i * 89 + Math.sin(i * .8) * 37) % Math.max(1, H - 28));
      const k = (y - top) / H, s = 1.2 + ((i * 3) % 4);
      g.fillStyle = k < .35 ? '#5d3d2d' : (k < .7 ? '#3b261d' : '#1a120f');
      g.beginPath(); g.moveTo(x - s, y); g.lineTo(x + s * .8, y - s * .6); g.lineTo(x + s * 1.1, y + s * .2); g.lineTo(x - s * .4, y + s * .9); g.closePath(); g.fill();
    }

    g.globalAlpha = .34; g.strokeStyle = '#b7a06f'; g.lineWidth = 1.25; g.lineCap = 'round';
    for (let i = 0; i < 34; i++) {
      const x = 8 + ((i * 71 + 13) % Math.max(20, W - 16)), len = 22 + ((i * 29) % 62);
      g.beginPath(); g.moveTo(x, top + 8);
      g.bezierCurveTo(x + Math.sin(i * 2.1) * 8, top + 18 + len * .22, x + Math.cos(i * .9) * 13, top + len * .72, x + Math.sin(i * 1.7) * 18, top + len);
      g.stroke();
      if (i % 3 === 0) { g.beginPath(); g.moveTo(x + Math.sin(i * .9) * 5, top + len * .55); g.lineTo(x - 8 + Math.cos(i) * 6, top + len * .72); g.stroke(); }
    }

    g.globalAlpha = .16; g.strokeStyle = '#130c09'; g.lineWidth = 1.2;
    for (let i = 0; i < 42; i++) {
      const x = Math.abs((i * 61 + Math.sin(i * 8.31) * 41) % W), y = top + 80 + Math.abs((i * 107 + Math.cos(i * 2.2) * 65) % Math.max(1, H - 110));
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + rrLocal(x, y, -13, 17), y + rrLocal(y, x, -5, 8)); g.stroke();
    }
    g.globalAlpha = .10; g.strokeStyle = 'rgba(224,188,132,.30)'; g.lineWidth = .85;
    for (let i = 0; i < 56; i++) {
      const x = Math.abs((i * 41 + Math.sin(i * 1.7) * 57) % W), y = top + 36 + Math.abs((i * 149 + Math.cos(i * 1.2) * 43) % Math.max(1, H - 52));
      g.beginPath(); g.moveTo(x, y);
      g.quadraticCurveTo(x + ((i % 2) ? 7 : -7), y + 4 + ((i * 3) % 8), x + ((i % 3) - 1) * 11, y + 10 + ((i * 7) % 16));
      g.stroke();
    }

    // Couche de grain organique répétée sur toute la masse de terre.
    const pattern = g.createPattern(grainPattern(`${W}|${wb}|${sky}|${lawn}`), 'repeat');
    if (pattern) {
      g.save(); g.fillStyle = pattern;
      g.globalCompositeOperation = 'overlay'; g.globalAlpha = .50; g.fillRect(0, top, W, H);
      g.globalCompositeOperation = 'multiply'; g.globalAlpha = .22; g.fillRect(0, top, W, H);
      g.globalCompositeOperation = 'screen'; g.globalAlpha = .10; g.fillRect(0, top, W, H);
      g.restore();
    }
    g.globalAlpha = 1;
  }

  function rebuild(world, viewW) {
    const W = Math.max(1, Math.ceil(Math.max(world.width, viewW))), wb = Math.max(1, Math.ceil(world.height)), top = surfaceTop(world);
    cache.width = W; cache.height = wb;
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, wb);
    drawSky(W, top, world.surfaceY, world.skyVariant);
    drawLawn(W, top, world.lawnVariant);
    drawEarth(W, top, wb, world.skyVariant, world.lawnVariant);
  }

  // Seule la tranche visible du cache est recopiée.
  function draw(ctx, world, cameraY, viewW, viewH) {
    if (!(world.width > 0 && world.height > 0)) return;
    const key = `${Math.max(world.width, viewW)}|${world.height}|${world.surfaceY}|${world.skyVariant}|${world.lawnVariant}`;
    if (key !== cacheKey) { rebuild(world, viewW); cacheKey = key; }
    const pad = FP.config.soil.viewPad;
    const y0 = Math.max(0, Math.floor(cameraY - pad)), y1 = Math.min(cache.height, Math.ceil(cameraY + viewH + pad));
    if (y1 > y0) ctx.drawImage(cache, 0, y0, cache.width, y1 - y0, 0, y0, cache.width, y1 - y0);
  }

  FP.soil = { draw, surfaceTop };
})();
