/** Pruebas del clima de temporada: se elige por semilla y cambia eventos, agua y precios. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CLIMATES, CLIMATES_BY_ID } from '../../js/data/climates.js';
import { createSeason } from '../../js/game/season.js';
import { createDaily } from '../../js/game/daily.js';
import { climateOf } from '../../js/game/climate.js';
import { eventWeights } from '../../js/game/events.js';
import { dailyRation } from '../../js/game/travel.js';
import { marketMult } from '../../js/game/market.js';
import { provisionPrices } from '../../js/game/caravan.js';
import { validateState } from '../../js/game/validate.js';

const withClimate = (id, seed = 'clima') => {
  const g = createSeason({ seed, events: false });
  g.state.climate = id;
  return g;
};

test('hay 5 climas y la semilla elige siempre el mismo', () => {
  assert.equal(CLIMATES.length, 5);
  const a = createSeason({ seed: 'misma', events: false });
  const b = createSeason({ seed: 'misma', events: false });
  assert.equal(a.state.climate, b.state.climate);
  assert.ok(CLIMATES_BY_ID[a.state.climate]);
  // Con muchas semillas salen todos.
  const seen = new Set();
  for (let i = 0; i < 80; i++) seen.add(createSeason({ seed: `c-${i}`, events: false }).state.climate);
  assert.equal(seen.size, 5);
  // El desafío del día: mismo clima para todos.
  assert.equal(createDaily('2026-10-12', { events: false }).state.climate, createDaily('2026-10-12', { events: false }).state.climate);
});

test('con tormentas salen más tormentas', () => {
  const calm = withClimate('templado');
  const storm = withClimate('tormentas');
  const route = calm.map.routes.find((r) => r.terrain === 'arena' || r.terrain === 'piedra');
  assert.ok(eventWeights(storm, route).tormenta > eventWeights(calm, route).tormenta);
});

test('con sequía se toma más agua y los dátiles valen más', () => {
  const calm = withClimate('templado');
  const dry = withClimate('sequia');
  assert.ok(dailyRation(dry.state) > dailyRation(calm.state));
  const here = calm.state.location;
  assert.ok(marketMult(dry, here, 'datiles') > marketMult(calm, here, 'datiles'));
});

test('con cosecha la comida y los dátiles son más baratos', () => {
  const calm = withClimate('templado');
  const crop = withClimate('cosecha');
  const city = calm.map.cityById[calm.state.location];
  assert.ok(provisionPrices(city, crop.state).food < provisionPrices(city, calm.state).food);
  assert.ok(marketMult(crop, city.id, 'datiles') < marketMult(calm, city.id, 'datiles'));
});

test('con ferias la Capital paga más los lujos', () => {
  const calm = withClimate('templado');
  const fair = withClimate('ferias');
  const capital = calm.map.cities.find((c) => c.type === 'capital').id;
  assert.ok(marketMult(fair, capital, 'seda') > marketMult(calm, capital, 'seda'));
  assert.equal(marketMult(fair, capital, 'sal'), marketMult(calm, capital, 'sal'));
});

test('el clima se guarda; una partida vieja sin clima queda templada', () => {
  const g = withClimate('sequia');
  const res = validateState(JSON.parse(JSON.stringify(g.state)));
  assert.ok(res.ok, res.error);
  assert.equal(res.game.state.climate, 'sequia');
  const old = JSON.parse(JSON.stringify(g.state));
  delete old.climate;
  assert.equal(validateState(old).game.state.climate, 'templado');
  assert.equal(climateOf({}).id, 'templado');
});
