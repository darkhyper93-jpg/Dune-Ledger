/** Pruebas de la tripulación: contratar, roles, rasgos, sueldos, moral y niveles. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ROLES, TRAITS } from '../../js/data/crew.js';
import { hiresHere, hire, fire, levelOf, MAX_CREW, WAGE_DAYS, DESERT_MORALE } from '../../js/game/crew.js';
import { dailyRation, mouths, tripNeeds } from '../../js/game/travel.js';
import { CHANCES, createEvent, optionState } from '../../js/game/events.js';
import { quote } from '../../js/game/market.js';
import { startTrip } from '../../js/game/trip.js';
import { rest, travel } from '../../js/game/season.js';
import { REST_HP } from '../../js/game/camels.js';
import { Rng } from '../../js/core/rng.js';
import { testGame } from './helpers.js';

/** Agrega un tripulante a mano. */
function add(g, role, trait = 'leal', xp = 0, morale = 70) {
  const m = { id: `t${g.state.crew.length + 100}`, name: 'Prueba', role, trait, xp, morale, wage: 12 };
  g.state.crew.push(m);
  return m;
}

test('en la taberna hay 2 o 3 personas para contratar, con rol y rasgo válidos', () => {
  for (let i = 0; i < 15; i++) {
    const g = testGame({}, `tripu-${i}`);
    const list = hiresHere(g);
    assert.ok(list.length >= 2 && list.length <= 3);
    for (const c of list) {
      assert.ok(Object.hasOwn(ROLES, c.role) && Object.hasOwn(TRAITS, c.trait));
      assert.ok(c.wage > 0 && c.name);
    }
  }
});

test('contratar paga la primera semana y suma a la caravana; hasta 5 personas', () => {
  const g = testGame({ gold: 5000 });
  const [c] = hiresHere(g);
  assert.ok(hire(g, c.id).ok);
  assert.equal(g.state.gold, 5000 - c.wage);
  assert.equal(g.state.crew.length, 1);
  assert.equal(mouths(g.state), 1 + 1 + 2);
  for (let i = 0; i < 6; i++) add(g, 'guardia');
  g.state.crew.length = MAX_CREW;
  assert.equal(hire(g, hiresHere(g)[0].id).ok, false);
});

test('despedir saca a la persona', () => {
  const g = testGame();
  const m = add(g, 'cocinero');
  assert.ok(fire(g, m.id).ok);
  assert.equal(g.state.crew.length, 0);
});

test('el codicioso cobra un 50% más', () => {
  const g = testGame();
  const list = hiresHere(g);
  for (const c of list) {
    const base = ROLES[c.role].wage;
    assert.equal(c.wage, c.trait === 'codicioso' ? Math.round(base * 1.5) : base);
  }
});

test('el guía acorta las rutas un día (mínimo 1)', () => {
  const g = testGame({ food: 200, water: 200 });
  add(g, 'guia');
  const route = g.map.routesByCity[g.state.location].find((r) => r.days >= 2) ?? g.map.routesByCity[g.state.location][0];
  startTrip(g, route.id);
  assert.equal(g.state.trip.days, Math.max(1, route.days - 1));
  assert.equal(tripNeeds(g.state, route).days, Math.max(1, route.days - 1));
});

test('con 2 guardias se gana la pelea al menos 70% de las veces', () => {
  const g = testGame();
  const route = g.map.routesByCity[g.state.location][0];
  startTrip(g, route.id);
  const alone = CHANCES.fight(g);
  add(g, 'guardia');
  add(g, 'guardia');
  assert.ok(CHANCES.fight(g) >= 0.7 && CHANCES.fight(g) > alone);
});

test('el cocinero ahorra 25% de comida y 40% en nivel 3', () => {
  const g = testGame({ camels: 5, camelHp: [100, 100, 100, 100, 100] });
  add(g, 'cocinero');
  const m = mouths(g.state); // 1 + 1 + 5 = 7
  assert.equal(dailyRation(g.state, 'food'), Math.ceil(Math.ceil(m / 2) * 0.75));
  g.state.crew[0].xp = 20;
  assert.equal(levelOf(g.state.crew[0]), 3);
  assert.equal(dailyRation(g.state, 'food'), Math.ceil(Math.ceil(m / 2) * 0.6));
  assert.equal(dailyRation(g.state, 'water'), Math.ceil(m / 2));
});

test('el contable compra más barato y vende más caro', () => {
  const g = testGame();
  const here = g.state.location;
  const b = quote(g, here, 'te', 5, 'buy').total;
  const s = quote(g, here, 'te', 5, 'sell').total;
  add(g, 'contable');
  assert.ok(quote(g, here, 'te', 5, 'buy').total < b);
  assert.ok(quote(g, here, 'te', 5, 'sell').total > s);
});

test('el curandero duplica la recuperación de los camellos', () => {
  const g = testGame({ food: 200, water: 200 });
  add(g, 'curandero');
  g.state.camelHp = [20, 20];
  rest(g);
  assert.deepEqual(g.state.camelHp, [20 + REST_HP * 2, 20 + REST_HP * 2]);
});

test('el explorador trae los precios de las vecinas y explora ruinas más seguro', () => {
  const g = testGame({ food: 200, water: 200 });
  add(g, 'explorador');
  const route = g.map.routesByCity[g.state.location][0];
  travel(g, route.id);
  for (const r of g.map.routesByCity[g.state.location]) {
    const nb = r.a === g.state.location ? r.b : r.a;
    assert.ok(g.state.prices[nb], 'precios de la vecina');
  }
  startTrip(g, g.map.routesByCity[g.state.location][0].id);
  g.state.trip.event = createEvent(g, 'ruinas', new Rng('x'));
  const scout = optionState(g, 1);
  assert.ok(scout.available && scout.chance > 0.8);
});

test('sin explorador no se puede mandar al explorador', () => {
  const g = testGame();
  startTrip(g, g.map.routesByCity[g.state.location][0].id);
  g.state.trip.event = createEvent(g, 'ruinas', new Rng('x'));
  assert.equal(optionState(g, 1).available, false);
});

test(`cada ${WAGE_DAYS} días se pagan los sueldos; si no alcanza, baja la moral`, () => {
  const g = testGame({ food: 200, water: 200, gold: 100 });
  const m = add(g, 'guardia', 'leal', 0, 70);
  for (let d = 1; d < WAGE_DAYS; d++) rest(g);
  assert.equal(g.state.gold, 100 - m.wage);
  g.state.gold = 0;
  const before = m.morale;
  for (let d = 0; d < WAGE_DAYS; d++) rest(g);
  assert.ok(g.state.crew[0].morale < before);
});

test('pasar hambre baja la moral y con moral baja la gente se va al llegar (salvo los leales)', () => {
  const g = testGame({ food: 0, water: 200 });
  add(g, 'guardia', 'leal', 0, DESERT_MORALE - 5);
  add(g, 'cocinero', 'valiente', 0, 1);
  const moraleBefore = g.state.crew[0].morale;
  travel(g, g.map.routesByCity[g.state.location][0].id);
  assert.ok(g.state.crew.some((c) => c.trait === 'leal'));
  assert.ok(g.state.crew[0].morale < moraleBefore);
  assert.ok(!g.state.crew.some((c) => c.trait === 'valiente'), 'el de moral 0 se fue');
});

test('los tripulantes ganan experiencia viajando y suben de nivel', () => {
  const g = testGame({ food: 200, water: 200 });
  const m = add(g, 'guardia');
  const route = g.map.routesByCity[g.state.location][0];
  travel(g, route.id);
  assert.equal(g.state.crew[0].xp, route.days);
  m.xp = 7;
  assert.equal(levelOf(m), 1);
  m.xp = 8;
  assert.equal(levelOf(m), 2);
});
