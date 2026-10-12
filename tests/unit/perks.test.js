/** Pruebas de mercaderes y mejoras del Gremio aplicados a una temporada. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSeason, rest } from '../../js/game/season.js';
import { totalOwed } from '../../js/game/debt.js';
import { capacity, provisionCap } from '../../js/game/caravan.js';
import { dailyRation } from '../../js/game/travel.js';
import { quote } from '../../js/game/market.js';
import { buy, buyProvision } from '../../js/game/actions.js';
import { CHANCES, createEvent, resolveOption } from '../../js/game/events.js';
import { startTrip } from '../../js/game/trip.js';
import { travelDays } from '../../js/game/map-gen.js';
import { tireCamels } from '../../js/game/camels.js';
import { Rng } from '../../js/core/rng.js';

/** Temporada sin eventos con mercader y mejoras. */
const season = (merchant = 'aprendiz', upgrades = {}, seed = 'ventajas') => createSeason({ seed, merchant, upgrades, events: false });

test('el Aprendiz arranca con lo de siempre', () => {
  const g = season();
  assert.equal(g.state.merchant, 'aprendiz');
  assert.equal(g.state.gold, 300);
  assert.equal(g.state.camels, 2);
  assert.equal(totalOwed(g.state.debt), 1900);
});

test('el Viejo Sultán: 500 de oro, 4 camellos y el doble de deuda', () => {
  const g = season('sultan');
  assert.equal(g.state.gold, 500);
  assert.equal(g.state.camels, 4);
  assert.equal(g.state.camelHp.length, 4);
  assert.equal(totalOwed(g.state.debt), 3800);
});

test('mejoras de inicio: oro, camellos, provisiones, fama y prórroga', () => {
  const g = season('aprendiz', { oro: 2, camello: 1, provisiones: 3, fama: 1, plazo: 2 });
  assert.equal(g.state.gold, 400);
  assert.equal(g.state.camels, 3);
  assert.equal(g.state.food, 35);
  assert.ok(Object.values(g.state.rep).every((r) => r === 10));
  assert.deepEqual(g.state.debt.installments.map((i) => i.day), [25, 45, 60]);
});

test('alforjas y odres: más carga y más provisiones', () => {
  const g = season('aprendiz', { carga: 2, odres: 1 });
  assert.equal(capacity(g.state), 2 * 24);
  assert.equal(provisionCap(g.state), 250);
  g.state.gold = 5000;
  assert.ok(buyProvision(g, 'water', 220).ok);
});

test('el mapa del abuelo muestra las ciudades a dos rutas', () => {
  const g = season('aprendiz', { mapa: 1 });
  const d = travelDays(g.map, g.state.location);
  const twoHops = new Set();
  for (const r of g.map.routesByCity[g.state.location]) {
    const nb = r.a === g.state.location ? r.b : r.a;
    for (const r2 of g.map.routesByCity[nb]) twoHops.add(r2.a === nb ? r2.b : r2.a);
  }
  for (const id of twoHops) assert.ok(g.state.known[id], `${id} a ${d[id]} días`);
});

test('la Nómada gasta la mitad de agua y conoce los oasis', () => {
  const g = season('nomada');
  const a = season();
  assert.equal(dailyRation(g.state), Math.ceil(dailyRation(a.state) / 2));
  for (const c of g.map.cities) if (c.type === 'oasis') assert.ok(g.state.known[c.id]);
});

test('el Contrabandista puede comerciar armas en la ciudad santa', () => {
  const g = season('contrabandista');
  const santa = g.map.cities.find((c) => c.type === 'santa');
  Object.assign(g.state, { location: santa.id, gold: 5000 });
  g.state.visited[santa.id] = true;
  assert.ok(buy(g, 'armas', 1).ok);
});

test('al Contrabandista los controles le fallan más o menos la mitad de las veces', () => {
  let kept = 0;
  for (let i = 0; i < 400; i++) {
    const g = season('contrabandista');
    g.state.cargo.armas = 2;
    startTrip(g, g.map.routesByCity[g.state.location][0].id);
    g.state.trip.event = createEvent(g, 'control', new Rng(`c${i}`));
    resolveOption(g, 0, new Rng(`c${i}`));
    if (g.state.cargo.armas === 2) kept++;
  }
  assert.ok(kept > 150 && kept < 250, `${kept}`);
});

test('el Negociante compra un 8% más barato', () => {
  const g = season('negociante');
  const a = season();
  const here = a.state.location;
  assert.ok(quote(g, here, 'te', 10, 'buy').total < quote(a, here, 'te', 10, 'buy').total * 0.95);
});

test('la Capitana empieza con 2 guardias leales y pelea mejor', () => {
  const g = season('capitana');
  assert.equal(g.state.crew.filter((m) => m.role === 'guardia' && m.trait === 'leal').length, 2);
  startTrip(g, g.map.routesByCity[g.state.location][0].id);
  const a = season();
  a.state.crew = JSON.parse(JSON.stringify(g.state.crew));
  startTrip(a, a.map.routesByCity[a.state.location][0].id);
  assert.ok(Math.abs(CHANCES.fight(g) - Math.min(0.95, CHANCES.fight(a) + 0.2)) < 1e-9);
});

test('el Cartógrafo ve todo el mapa y todos los precios', () => {
  const g = season('cartografo');
  for (const c of g.map.cities) {
    assert.ok(g.state.known[c.id]);
    assert.ok(g.state.prices[c.id]);
  }
  for (const r of g.map.routes) assert.ok(g.state.knownRoutes[r.id]);
});

test('camellos de raza: se cansan menos', () => {
  const g = season('aprendiz', { resistentes: 3 });
  tireCamels(g.state, 10);
  assert.deepEqual(g.state.camelHp, [93, 93]);
});

test('amigo en la taberna y escuela de guardias abaratan sueldos', () => {
  const g = season('aprendiz', { taberna: 2, guardias: 1 }, 'sueldos');
  const base = season('aprendiz', {}, 'sueldos');
  const cheap = g.state.hire.offers[g.state.location].list;
  const normal = base.state.hire.offers[base.state.location].list;
  cheap.forEach((c, i) => {
    const factor = 0.8 * (c.role === 'guardia' ? 0.8 : 1);
    assert.equal(c.wage, Math.max(1, Math.round(normal[i].wage * factor)));
  });
});

test('una temporada sin mercader conocido no se puede crear', () => {
  assert.throws(() => createSeason({ seed: 'x', merchant: 'dragon' }));
  rest(season());
});
