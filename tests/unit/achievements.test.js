/** Pruebas de estadísticas, logros, códice y cierre de temporada en el perfil. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ACHIEVEMENTS } from '../../js/data/achievements.js';
import { recordSeason, defaultProfile, canBuyMerchant, validateProfile } from '../../js/game/profile.js';
import { MERCHANTS_BY_ID } from '../../js/data/merchants.js';
import { createSeason, finishSeason, rest, travel } from '../../js/game/season.js';
import { buy, sell } from '../../js/game/actions.js';
import { createEvent, resolveOption } from '../../js/game/events.js';
import { startTrip } from '../../js/game/trip.js';
import { offersHere, acceptContract, deliverContract } from '../../js/game/contracts.js';
import { validateState } from '../../js/game/validate.js';
import { Rng } from '../../js/core/rng.js';

/** Temporada de prueba sin eventos, con provisiones de sobra. */
function game(seed = 'logros', merchant = 'aprendiz') {
  const g = createSeason({ seed, merchant, events: false });
  Object.assign(g.state, { food: 200, water: 200 });
  return g;
}

/** Cierra ganando (con todo pagado). */
function win(g) {
  g.state.gold += 2000;
  g.state.debt.installments.forEach((i) => { i.paid = i.amount; });
  return finishSeason(g, 'retiro');
}

test('todos los logros se pueden revisar sin romperse', () => {
  const g = game();
  const over = win(g);
  const profile = defaultProfile();
  for (const a of ACHIEVEMENTS) assert.equal(typeof a.check({ state: g.state, map: g.map, over, profile }), 'boolean', a.id);
});

test('cerrar suma sellos, temporadas, victorias y récord una sola vez', () => {
  const g = game();
  const over = win(g);
  const p = defaultProfile();
  const res = recordSeason(p, g);
  assert.equal(p.seasons, 1);
  assert.equal(p.wins, 1);
  assert.equal(p.seals, over.seals);
  assert.equal(p.totalSeals, over.seals);
  assert.equal(p.bestScore, over.score);
  assert.ok(res.newAchievements.includes('primera') && res.newAchievements.includes('victoria'));
  assert.ok(g.state.over.recorded);
  recordSeason(p, g);
  assert.equal(p.seasons, 1, 'no se cuenta dos veces');
  assert.deepEqual(validateProfile(p), p);
});

test('el códice guarda bienes comerciados, ciudades, eventos y tripulación vista', () => {
  const g = game();
  g.state.gold = 1000;
  buy(g, 'te', 2);
  const p = defaultProfile();
  win(g);
  recordSeason(p, g);
  assert.ok(p.codex.goods.te);
  assert.ok(p.codex.cityTypes[g.map.cityById[g.state.location].type]);
});

test('las estadísticas cuentan ventas, descansos y contratos', () => {
  const g = game();
  g.state.gold = 1000;
  buy(g, 'te', 3);
  sell(g, 'te', 3);
  assert.equal(g.state.stats.sold.te, 3);
  rest(g);
  assert.equal(g.state.stats.restDays, 1);
  const [k] = offersHere(g);
  acceptContract(g, k.id);
  g.state.location = k.to;
  g.state.visited[k.to] = true;
  g.state.cargo[k.goodId] = k.qty;
  deliverContract(g, k.id);
  assert.equal(g.state.stats.contractsDone, 1);
});

test('ganar una pelea y viajar por rutas riesgosas queda anotado', () => {
  const g = game();
  for (let i = 0; i < 2; i++) g.state.crew.push({ id: `t${90 + i}`, name: 'G', role: 'guardia', trait: 'leal', xp: 0, morale: 70, wage: 12 });
  startTrip(g, g.map.routesByCity[g.state.location][0].id);
  for (let i = 0; i < 40 && !g.state.stats.fightsWon; i++) {
    g.state.trip.event = createEvent(g, 'bandidos', new Rng(`p${i}`));
    resolveOption(g, 1, new Rng(`p${i}`));
  }
  assert.ok(g.state.stats.fightsWon >= 1);
  assert.ok(g.state.seen.events.bandidos);
  const h = game('riesgo');
  const route = h.map.routes.find((r) => (r.a === h.state.location || r.b === h.state.location) && r.danger !== 'bajo');
  if (route) {
    travel(h, route.id);
    assert.equal(h.state.stats.riskyTrips, 1);
  }
});

test('el logro de contrabando habilita comprar al Contrabandista', () => {
  const g = game('contra', 'aprendiz');
  g.state.stats.smuggled = 1;
  const p = { ...defaultProfile(), seals: 100 };
  win(g);
  recordSeason(p, g);
  assert.ok(p.achievements.contrabando);
  assert.ok(canBuyMerchant(p, MERCHANTS_BY_ID.contrabandista).ok);
});

test('las estadísticas y lo visto se guardan y validan', () => {
  const g = game();
  g.state.gold = 1000;
  buy(g, 'sal', 2);
  rest(g);
  const res = validateState(JSON.parse(JSON.stringify(g.state)));
  assert.ok(res.ok, res.error);
  assert.deepEqual(res.game.state.stats, g.state.stats);
  assert.deepEqual(res.game.state.seen, g.state.seen);
});
