// Un combat de boss joué jusqu'à la victoire (v5.1.0), à W 360, par les vrais systèmes de la boucle (input exclu : l'entrée est écrite à la main).
// Une tige pilotée par cible, dans l'ordre du plan, puis une vers la tête ; les menaces sont vivantes, une mort ailleurs refait la cible.
// Aides : bossRun, MILIEUX (boss.test.js), skipShop (flow.test.js).
const FIGHT_ORDER = FP.loop.UPDATE_ORDER.filter(n => n !== 'input');
const fightStep = (s, dt) => { s.time += dt; for (const n of FIGHT_ORDER) if (FP[n] && FP[n].update) FP[n].update(s, dt); s.events.length = 0; };

// Esquive : la pointe passe dans la moitié épargnée d'une salle (14 px au-delà du milieu, en virant à fond tant qu'elle n'y est pas) si le trajet reste dans l'autre. Elle attend le dernier
// moment (le temps de traverser, avant le coup) pour ne pas s'écarter du trajet plus que nécessaire, et ne bouge pas si elle sort de la salle avant le coup ;
// à moins de DODGE_REACH px de sa cible, elle fonce dessus. v5.1.0 (boss plus durs, repos plus court) : pendant le repos, elle attend dans
// la moitié opposée à celle de son trajet le prochain avertissement (le coup tombera loin de sa cible), sauf si
// elle atteint la cible avant ce coup (DODGE_ETA fois le temps en ligne droite ; l'assaut finit la tige). Sans cela, elle esquivait deux
// fois de suite du même côté et dépassait sa cible. Relecture (galerie de la Bétonneuse, vanne d'un seul côté du milieu) : juste
// avant d'entrer dans une salle au repos, si sa cible est nettement d'un côté du milieu (DODGE_SIDE px) et à moins d'un cycle de la
// défense (avertissement, coup, repos) de montée, elle entre de l'autre côté si le passage le permet (une demi-largeur de canal) : le
// premier coup tombera loin de la cible. Pendant un coup, si sa cible est hors d'atteinte avant le prochain avertissement,
// elle attend près du milieu, côté épargné, plutôt que de filer vers un trajet lointain (elle ne pourrait plus repasser au repos). Constantes réglées sur les plans et les menaces actuels : à revoir si l'un ou l'autre change.
const DODGE_SPEED = 40, DODGE_SLACK = .6, DODGE_REACH = 50, DODGE_ETA = 1.25;   // vitesse latérale supposée (px/s), marge (s), portée de l'assaut (px), marge sur le temps d'arrivée
const DODGE_SIDE = 20, DODGE_ENTRY = 40;   // écart au milieu qui fait choisir l'entrée (px), distance sous la salle où elle se place (px)
const dodge = (s, placed, p, target) => {
  const tip = s.plant.tip, reach = FP.collision.distanceTo(target, tip.x, tip.y);
  if (reach < DODGE_REACH) return p;
  const tm = FP.bossThreats.timing(s.bossFight.destroyed.filter(Boolean).length, FP.config.milieux[s.run.milieu].id);
  const dy = tip.y - (target.y + Math.max(...target.collision.map(q => q[1])));   // montée jusqu'au bas de la cible
  for (const r of placed.rooms) {
    const st = s.bossThreats.rooms[r.id], mid = (r.rect[0] + r.rect[2]) / 2;
    if ((!st || st.stage === 'idle') && tip.y > r.rect[3] && tip.y < r.rect[3] + DODGE_ENTRY && tip.x >= r.rect[0] && tip.x <= r.rect[2]
      && Math.abs(target.x - mid) > DODGE_SIDE && dy / FP.plant.speed(s) < tm.warn + tm.strike + tm.rest) {
      const x = mid - (target.x < mid ? -1 : 1) * 14;
      if (FP.bossPlan.clearance(placed, x, tip.y) >= placed.channelMin / 2) return { x, y: tip.y - 30 };   // entrer du côté opposé à la cible
    }
    if (!st || tip.y < r.rect[1] || tip.y > r.rect[3]) continue;
    if (st.stage === 'rest') {
      const side = p.x < mid ? -1 : 1;
      if (DODGE_ETA * reach / FP.plant.speed(s) < tm.rest - st.t + tm.warn) continue;
      return { x: mid - side * 14, y: tip.y - 30 };   // de l'autre côté du milieu jusqu'au prochain avertissement
    }
    if (st.stage !== 'warn' && st.stage !== 'strike') continue;
    const safe = mid - st.half * 14;   // abscisse limite de la moitié épargnée
    // cible hors d'atteinte avant le prochain avertissement : elle reste près du milieu, côté épargné, pour repasser de l'autre côté au repos
    const until = (st.stage === 'warn' ? tm.warn - st.t + tm.strike : tm.strike - st.t) + tm.rest, hold = dy / FP.plant.speed(s) > until;
    if ((tip.x - safe) * st.half <= 0 && (p.x - safe) * st.half <= 0) { if (hold) return { x: safe, y: tip.y - 30 }; continue; }   // déjà du bon côté, et le trajet y reste
    const goal = { x: (p.x - safe) * st.half > 0 || hold ? safe : p.x, y: tip.y - 30 };
    if (st.stage === 'warn') {
      const left = tm.warn - st.t;
      if (left > Math.abs(tip.x - goal.x) / DODGE_SPEED + DODGE_SLACK || (tip.y - r.rect[1]) / FP.plant.speed(s) < left) continue;
    }
    if ((tip.x - safe) * st.half > 0) goal.turn = -st.half;   // encore dans la moitié visée : virage à fond (au doigt)
    return goal;
  }
  return p;
};

// Rend { stems, retries, minReserves, bosses, milieu, saison, mode, destroyed, headOpen } ; stems = pousses lancées, retries = mortes ailleurs que sur une cible.
const playBossFight = (milieu) => {
  const s = bossRun(360, milieu), dt = 1 / 60, c = FP.config.plant.control, H = s.world.viewH;
  // v5.3.0 : chaque pousse régénère le niveau, dont la hauteur suit la vitesse de lancement : les trajets se recalculent à chaque pousse.
  let placed = FP.bossPlan.toWorld(s.world.bossLevel.plan, s.world);
  const ids = s.world.bossLevel.targets.map(t => t.id);
  FP.plant.prepare(s); s.mode = 'ready'; s.plant.germ = 0;
  const out = { stems: 0, retries: 0, minReserves: s.plant.reserves, bosses: 0, milieu: 0, saison: 1, mode: '' };
  let was = 'ready', path = null, i = 1, won = false;
  for (let f = 0; f < 60 * 60 * 8 && !won; f++) {
    const bf = s.bossFight, k = bf.destroyed.indexOf(false);
    if (s.mode === 'playing') {
      if (was !== 'playing') { out.stems++; i = 1; placed = FP.bossPlan.toWorld(s.world.bossLevel.plan, s.world); path = placed.paths[k >= 0 ? ids[k] : 'head']; }
      const tip = s.plant.tip;
      while (i < path.length - 1 && tip.y <= path[i].y) i++;
      const p = dodge(s, placed, path[i], k >= 0 ? s.world.bossLevel.targets[k].solid : s.world.bossLevel.head.solid), look = FP.math.clamp(tip.y - p.y, c.lookAheadBottom, c.lookAheadTop);
      s.input = { ...s.input, down: true, touch: !!p.turn, key: false, active: true, x: p.x, screenX: p.turn > 0 ? s.world.width : 0, pressed: false,
        y: p.turn ? H : (c.lookAheadTop - look) / (c.lookAheadTop - c.lookAheadBottom) * H };
    } else s.input = { ...s.input, down: s.mode === 'ready', pressed: false, key: false, active: true, x: s.plant.seed.x, y: H / 2 };
    const modeBefore = s.mode, destroyedBefore = bf.destroyed.filter(Boolean).length;
    fightStep(s, dt);
    if (modeBefore === 'playing' && s.mode === 'dying' && s.bossFight.destroyed.filter(Boolean).length === destroyedBefore) out.retries++;
    out.minReserves = Math.min(out.minReserves, s.plant.reserves);
    if (s.mode === 'shop') skipShop(s);
    if (s.run.bosses > 0 && (s.mode === 'ready' || s.mode === 'won')) won = true;
    was = modeBefore;
    if (s.mode === 'over') break;   // partie perdue : le combat s'arrête là (les assertions le diront)
  }
  Object.assign(out, { bosses: s.run.bosses, milieu: s.run.milieu, saison: s.run.saison, mode: s.mode, destroyed: s.bossFight.destroyed.slice(), headOpen: s.bossFight.headOpen });
  return out;
};

FP.test('bossFight: un combat complet par boss, de la première cible à la victoire', () => {
  MILIEUX.forEach((name, m) => {
    const r = playBossFight(m), next = (m + 1) % 4;
    FP.assertEqual(r.bosses, 1, name + ' : boss vaincu ' + JSON.stringify(r));
    FP.assertEqual(r.milieu, next, name + ' : milieu suivant ' + JSON.stringify(r));
    FP.assertEqual(r.saison, m === 3 ? 2 : 1, name + ' : saison ' + JSON.stringify(r));
    FP.assert(r.destroyed.length === 3 && r.destroyed.every(d => d === false) && r.headOpen === false, name + ' : combat remis à zéro ' + JSON.stringify(r));
    FP.assert(r.stems >= 4 && r.stems <= 10, name + ' : ' + r.stems + ' pousses ' + JSON.stringify(r));
    FP.assert(r.minReserves > 0, name + ' : réserve à zéro ' + JSON.stringify(r));
    console.log('bossFight ' + name + ' : ' + JSON.stringify(r));
  });
});

// --- Défenses toujours esquivables (revue finale v5.1.0) : une pointe qui entre dans une salle, où que ce soit le long de ses
// entrées, et vire à fond vers l'autre moitié dès l'avertissement, n'est jamais touchée par le coup. Avertissement le plus court
// (warnMin : les trois cibles détruites), tirs coupés ; deux vitesses : la tige la plus lente d'un premier boss (run.steps pousses
// réussies, autant de fleurs, sans Compost) et la plus rapide (speed.max).
// Entrées d'une salle : ses cases libres (cibles et plaques tombées) qu'on atteint depuis la graine sans la traverser, par le bas ou
// par un côté (jamais par le haut : la tige ne redescend pas), entre les bords où la pointe rebondit (plant.edge) ; une tous les
// DODGE_STEP px, à 4 px au moins d'une pièce. Une mort hors de la salle (la pointe en est sortie avant le coup) ne compte pas.
// Aides : floodGrid, floodFull, flood, roomCells, goneWith (bossplan.test.js).
const DODGE_STEP = 10;
const roomEntries = (s, placed, rect) => {
  const g = floodGrid(s, placed), inside = roomCells(g, rect), gone = goneWith(placed, [true, true, true], false);
  const seen = flood(g, floodFull(g, placed, gone, inside), [g.seed]), full = floodFull(g, placed, gone), out = [];
  const rest = { ...placed, pieces: placed.pieces.filter(p => !gone(p)) };
  for (const k of inside) {
    if (full[k]) continue;
    const i = k % g.nx, x = g.cx(i), y = g.cy((k - i) / g.nx);
    if (x < FP.config.plant.edge || x > s.world.width - FP.config.plant.edge) continue;
    if (!(seen[k + g.nx] || (i > 0 && seen[k - 1]) || (i < g.nx - 1 && seen[k + 1]))) continue;
    if (FP.bossPlan.clearance(rest, x, y) < 4 || out.some(q => Math.hypot(q.x - x, q.y - y) < DODGE_STEP)) continue;
    out.push({ x, y });
  }
  return out;
};
// Rend '' (esquivé) ou la raison de l'échec.
const dodgeFrom = (W, milieu, room, at, fast) => {
  const s = bossRun(W, milieu);
  s.bossFight.destroyed = [true, true, true]; s.bossFight.headOpen = true; FP.level.generate(s);
  FP.plant.launch(s); s.events.length = 0;
  const p = s.plant, r = s.world.bossLevel.rooms.find(q => q.id === room), mid = (r.x0 + r.x1) / 2, H = s.world.viewH;
  p.stemCount = fast ? 1e3 : FP.config.run.steps + 1; s.score.flowers = fast ? 0 : FP.config.run.steps;
  p.tip = { x: at.x, y: at.y }; p.dir = { x: 0, y: -1 }; p.trail = [{ x: at.x, y: at.y }]; p.guide = { x: at.x, y: at.y - 140 };
  let away = at.x < mid ? 1 : -1;   // vers l'autre moitié ; une fois la salle éveillée, à l'opposé de la moitié avertie (entrée sur le milieu)
  let woke = false;
  for (let f = 0; f < 60 * 4; f++) {
    s.bossThreats.cooldown = 1e9;   // pas de tir : seule la défense est jugée
    const past = (p.tip.x - mid) * away > 12;   // passée de l'autre côté : elle cesse de virer
    s.input = { ...s.input, down: true, touch: true, key: false, active: true, x: p.tip.x, screenX: past ? W / 2 : (away > 0 ? W : 0), pressed: false, y: H };
    fightStep(s, 1 / 60);
    const st = s.bossThreats.rooms[room];
    const inRoom = p.tip.x >= r.x0 && p.tip.x <= r.x1 && p.tip.y >= r.y0 && p.tip.y <= r.y1;
    if (s.mode !== 'playing') return s.mode === 'bloom' || (!inRoom && s.flow.overReason !== FP.config.text.death.defense) ? '' : `mort (${s.flow.overReason}) en (${p.tip.x | 0}, ${p.tip.y | 0})`;
    if (st && st.stage !== 'idle' && !woke) { woke = true; away = -st.half; }
    if (woke && (st.stage === 'rest' || st.stage === 'idle')) return '';
  }
  return woke ? 'jamais fini' : 'la salle ne s’éveille pas';
};

FP.test('bossFight: une défense s’esquive depuis chaque entrée de salle, vite ou lentement', () => {
  for (const W of PLAN_WIDTHS) MILIEUX.forEach((name, milieu) => {
    const s = bossRun(W, milieu), placed = FP.bossPlan.toWorld(s.world.bossLevel.plan, s.world);
    for (const room of placed.rooms) {
      const entries = roomEntries(s, placed, room.rect);
      FP.assert(entries.length > 0, `${name} ${room.id} sans entrée W=${W}`);
      for (const at of entries) for (const fast of [false, true]) {
        const err = dodgeFrom(W, milieu, room.id, at, fast);
        FP.assert(!err, `${name} ${room.id} W=${W} entrée (${at.x | 0}, ${at.y | 0}) ${fast ? 'rapide' : 'lente'} : ${err}`);
      }
    }
  });
});

// --- La galerie de la Bétonneuse menace vraiment (relecture v5.1.0) : de la meurtrière à sa vanne, une tige reste dans sa section
// plus longtemps que l'avertissement et la moitié du coup (vitesse de base, premier rythme) ; pilotée droit sur la vanne sans esquiver,
// elle est emportée par la coulée ; le robot qui esquive l'atteint. Rend la raison de la mort ('assaut' : la vanne touchée).
const towardVanne = (W, k, avoid) => {
  const s = bossRun(W, 0), dt = 1 / 60, c = FP.config.plant.control, H = s.world.viewH;
  const placed = FP.bossPlan.toWorld(s.world.bossLevel.plan, s.world), t = s.world.bossLevel.targets[k], path = placed.paths[t.id];
  FP.plant.prepare(s); FP.plant.launch(s); s.events.length = 0;
  let i = 1;
  for (let f = 0; f < 60 * 20 && s.mode === 'playing'; f++) {
    const tip = s.plant.tip;
    while (i < path.length - 1 && tip.y <= path[i].y) i++;
    const p = avoid ? dodge(s, placed, path[i], t.solid) : path[i], look = FP.math.clamp(tip.y - p.y, c.lookAheadBottom, c.lookAheadTop);
    s.input = { ...s.input, down: true, touch: !!p.turn, key: false, active: true, x: p.x, screenX: p.turn > 0 ? s.world.width : 0, pressed: false,
      y: p.turn ? H : (c.lookAheadTop - look) / (c.lookAheadTop - c.lookAheadBottom) * H };
    fightStep(s, dt);
  }
  return s.mode === 'dying' ? s.flow.overReason || 'assaut' : s.mode;
};

FP.test('bossFight: la galerie de la Bétonneuse frappe la tige qui file droit sur sa vanne, pas celle qui esquive', () => {
  const tm = FP.bossThreats.timing(0, 'friche'), need = tm.warn + tm.strike / 2;
  for (const W of PLAN_WIDTHS) {
    const s = bossRun(W, 0), placed = FP.bossPlan.toWorld(s.world.bossLevel.plan, s.world);
    s.world.bossLevel.targets.forEach((t, k) => {
      const room = placed.rooms.find(r => r.id.startsWith('galerie') && inRect(r.rect, t.solid.x, t.solid.y)), at = `${t.id} W=${W}`;
      const inside = pathSamples(placed.paths[t.id]).filter(q => inRect(room.rect, q.x, q.y) && FP.geom.sdPoly(q.x, q.y, worldPoly(t.solid)) > 0);
      const len = inside.length ? inside[0].left - inside[inside.length - 1].left : 0;
      FP.assert(len / FP.config.plant.speed.base > need, `${at} : ${(len / FP.config.plant.speed.base).toFixed(2)} s dans la section ≤ ${need.toFixed(2)} s`);
      if (W === 280 || W === 440) return;   // pilotage réel à 300 et 360 (le banc est long) ; la géométrie est vérifiée partout
      FP.assertEqual(towardVanne(W, k, false), FP.config.text.death.defense, 'droit sur la vanne : ' + at);
      FP.assertEqual(towardVanne(W, k, true), 'assaut', 'en esquivant : ' + at);
    });
  }
});
