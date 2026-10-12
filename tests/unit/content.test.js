/** Pruebas del contenido nuevo: logros de regiones y del rival, y los dos mercaderes nuevos. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ACHIEVEMENTS, ACHIEVEMENTS_BY_ID } from '../../js/data/achievements.js';
import { MERCHANTS_BY_ID } from '../../js/data/merchants.js';
import { createSeason, finishSeason } from '../../js/game/season.js';
import { defaultProfile, recordSeason, validateProfile } from '../../js/game/profile.js';
import { capacity } from '../../js/game/caravan.js';
import { tireCamels } from '../../js/game/camels.js';
import { rivalNews } from '../../js/game/rival.js';

/** Gana (o termina) una temporada y la suma al perfil. */
function play(profile, opts, tweak = () => {}) {
  const g = createSeason({ events: false, ...opts });
  g.state.gold = 4000;
  g.state.debt.installments.forEach((i) => { i.paid = i.amount; });
  tweak(g);
  finishSeason(g, 'retiro');
  return { g, res: recordSeason(profile, g) };
}

test('hay 49 logros con id único y los mercaderes piden logros que existen', () => {
  assert.equal(ACHIEVEMENTS.length, 49);
  assert.equal(new Set(ACHIEVEMENTS.map((a) => a.id)).size, 49);
  for (const m of Object.values(MERCHANTS_BY_ID)) if (m.requires) assert.ok(ACHIEVEMENTS_BY_ID[m.requires], m.id);
});

test('ganar en una región da su logro y el perfil recuerda dónde ganaste', () => {
  const p = defaultProfile();
  p.regions = ['desierto', 'estepa'];
  const { res } = play(p, { seed: 'logro-estepa', region: 'estepa' });
  assert.ok(res.newAchievements.includes('estepa'));
  assert.deepEqual(p.wonIn, ['estepa']);
  assert.deepEqual(validateProfile(JSON.parse(JSON.stringify(p))).wonIn, ['estepa']);
});

test('ganarle a Kasim da "Más zorro que el Zorro"', () => {
  const p = defaultProfile();
  const { g, res } = play(p, { seed: 'zorro' }, (game) => { game.state.rival.gold = 100; });
  assert.ok(g.state.over.score > g.state.over.rivalGold);
  assert.ok(res.newAchievements.includes('zorro'));
});

test('el Caravanero carga más y sus animales se cansan menos', () => {
  const base = createSeason({ seed: 'c', events: false });
  const car = createSeason({ seed: 'c', merchant: 'caravanero', events: false });
  assert.equal(capacity(car.state), capacity(base.state) + 5 * car.state.camels);
  base.state.camelHp = [100];
  car.state.camelHp = [100];
  tireCamels(base.state, 20);
  tireCamels(car.state, 20);
  assert.ok(car.state.camelHp[0] > base.state.camelHp[0]);
});

test('la Espía del Gremio sabe dónde anda Kasim aunque esté lejos', () => {
  const g = createSeason({ seed: 'espia', merchant: 'espia', events: false });
  const near = new Set([g.state.location, ...g.map.routesByCity[g.state.location].map((r) => (r.a === g.state.location ? r.b : r.a))]);
  g.state.rival.at = g.map.cities.find((c) => !near.has(c.id)).id;
  g.state.rival.to = null;
  assert.match(rivalNews(g), /Kasim/);
});

test('los consejos vistos se guardan en el perfil y se descartan los desconocidos', () => {
  const p = validateProfile({ ...defaultProfile(), hints: { kasim: true, bazar: true, trampa: true, __proto__x: true } });
  assert.deepEqual(p.hints, { kasim: true, bazar: true });
});
