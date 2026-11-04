// Un combat de boss joué jusqu'à la victoire (v5.1.0), à W 360, par les vrais systèmes de la boucle (input exclu : l'entrée est écrite à la main).
// Une tige pilotée par cible, dans l'ordre du plan, puis une vers la tête ; les menaces sont vivantes, une mort ailleurs refait la cible.
// Aides : bossRun, MILIEUX (boss.test.js), skipShop (flow.test.js).
const FIGHT_ORDER = FP.loop.UPDATE_ORDER.filter(n => n !== 'input');
const fightStep = (s, dt) => { s.time += dt; for (const n of FIGHT_ORDER) if (FP[n] && FP[n].update) FP[n].update(s, dt); s.events.length = 0; };

// Esquive : la pointe passe dans la moitié épargnée d'une salle (14 px au-delà du milieu) si le trajet reste dans l'autre. Elle attend le dernier
// moment (le temps de traverser, avant le coup) pour ne pas s'écarter du trajet plus que nécessaire, et ne bouge pas si elle sort de la salle avant le coup.
const DODGE_SPEED = 40, DODGE_SLACK = .6;   // vitesse latérale supposée (px/s) et marge (s)
const dodge = (s, placed, p) => {
  const tip = s.plant.tip;
  for (const r of placed.rooms) {
    const st = s.bossThreats.rooms[r.id];
    if (!st || (st.stage !== 'warn' && st.stage !== 'strike') || tip.y < r.rect[1] || tip.y > r.rect[3]) continue;
    const mid = (r.rect[0] + r.rect[2]) / 2;
    const safe = mid - st.half * 14;   // abscisse limite de la moitié épargnée
    if ((tip.x - safe) * st.half <= 0 && (p.x - safe) * st.half <= 0) continue;   // déjà du bon côté, et le trajet y reste
    const goal = { x: (p.x - safe) * st.half > 0 ? safe : p.x, y: tip.y - 30 };
    if (st.stage === 'warn') {
      const left = FP.bossThreats.timing(s.bossFight.destroyed.filter(Boolean).length).warn - st.t;
      if (left > Math.abs(tip.x - goal.x) / DODGE_SPEED + DODGE_SLACK || (tip.y - r.rect[1]) / FP.plant.speed(s) < left) continue;
    }
    return goal;
  }
  return p;
};

// Rend { stems, retries, minReserves, bosses, milieu, saison, mode } ; stems = pousses lancées, retries = mortes ailleurs que sur une cible.
const playBossFight = (milieu) => {
  const s = bossRun(360, milieu), dt = 1 / 60, c = FP.config.plant.control, H = s.world.viewH;
  const placed = FP.bossPlan.toWorld(s.world.bossLevel.plan, s.world), ids = s.world.bossLevel.targets.map(t => t.id);
  FP.plant.prepare(s); s.mode = 'ready'; s.plant.germ = 0;
  const out = { stems: 0, retries: 0, minReserves: s.plant.reserves, bosses: 0, milieu: 0, saison: 1, mode: '' };
  let was = 'ready', path = null, i = 1, won = false;
  for (let f = 0; f < 60 * 60 * 8 && !won; f++) {
    const bf = s.bossFight, k = bf.destroyed.indexOf(false);
    if (s.mode === 'playing') {
      if (was !== 'playing') { out.stems++; i = 1; path = placed.paths[k >= 0 ? ids[k] : 'head']; }
      const tip = s.plant.tip;
      while (i < path.length - 1 && tip.y <= path[i].y) i++;
      const p = dodge(s, placed, path[i]), look = FP.math.clamp(tip.y - p.y, c.lookAheadBottom, c.lookAheadTop);
      s.input = { ...s.input, down: true, touch: false, key: false, active: true, x: p.x, screenX: 0, pressed: false, y: (c.lookAheadTop - look) / (c.lookAheadTop - c.lookAheadBottom) * H };
    } else s.input = { ...s.input, down: s.mode === 'ready', pressed: false, key: false, active: true, x: s.plant.seed.x, y: H / 2 };
    const reservesBefore = s.plant.reserves, modeBefore = s.mode, destroyedBefore = bf.destroyed.filter(Boolean).length;
    fightStep(s, dt);
    if (modeBefore === 'playing' && s.mode === 'dying' && s.bossFight.destroyed.filter(Boolean).length === destroyedBefore) out.retries++;
    out.minReserves = Math.min(out.minReserves, s.plant.reserves);
    if (s.mode === 'shop') skipShop(s);
    if (s.run.bosses > 0 && (s.mode === 'ready' || s.mode === 'won')) won = true;
    was = modeBefore;
    if (reservesBefore < 0) break;
  }
  Object.assign(out, { bosses: s.run.bosses, milieu: s.run.milieu, saison: s.run.saison, mode: s.mode, fight: JSON.stringify(s.bossFight) });
  return out;
};

FP.test('bossFight: un combat complet par boss, de la première cible à la victoire', () => {
  MILIEUX.forEach((name, m) => {
    const r = playBossFight(m), next = (m + 1) % 4;
    FP.assertEqual(r.bosses, 1, name + ' : boss vaincu ' + JSON.stringify(r));
    FP.assertEqual(r.milieu, next, name + ' : milieu suivant ' + JSON.stringify(r));
    FP.assertEqual(r.saison, m === 3 ? 2 : 1, name + ' : saison ' + JSON.stringify(r));
    FP.assertEqual(r.fight, '{"destroyed":[false,false,false],"headOpen":false}', name + ' : combat remis à zéro');
    FP.assert(r.stems >= 4 && r.stems <= 10, name + ' : ' + r.stems + ' pousses ' + JSON.stringify(r));
    FP.assert(r.minReserves > 0, name + ' : réserve à zéro ' + JSON.stringify(r));
    console.log('bossFight ' + name + ' : ' + JSON.stringify(r));
  });
});
