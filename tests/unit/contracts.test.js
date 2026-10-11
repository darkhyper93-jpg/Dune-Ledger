/** Pruebas de contratos: ofertas, aceptar, entregar y vencer. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { offersHere, refreshOffers, acceptContract, deliverContract, MAX_ACTIVE, FAIL_REP, DONE_REP } from '../../js/game/contracts.js';
import { travelDays } from '../../js/game/map-gen.js';
import { isTradedIn } from '../../js/data/goods.js';
import { sellPriceAt } from '../../js/game/market.js';
import { canPayHere } from '../../js/game/debt.js';
import { rest } from '../../js/game/season.js';
import { validateState } from '../../js/game/validate.js';
import { testGame } from './helpers.js';

/** Lleva la caravana a una ciudad (como si hubiera llegado). */
function moveTo(g, cityId) {
  g.state.location = cityId;
  g.state.visited[cityId] = true;
  g.state.known[cityId] = true;
  refreshOffers(g, cityId);
}

test('las distancias en días siguen el camino más corto', () => {
  const g = testGame();
  const d = travelDays(g.map, g.state.location);
  assert.equal(d[g.state.location], 0);
  for (const r of g.map.routesByCity[g.state.location]) {
    const other = r.a === g.state.location ? r.b : r.a;
    assert.ok(d[other] <= r.days);
  }
  for (const c of g.map.cities) assert.ok(Number.isFinite(d[c.id]));
});

test('la taberna ofrece 2 contratos y, donde hay Gremio, uno más', () => {
  for (let i = 0; i < 20; i++) {
    const g = testGame({}, `contratos-${i}`);
    const here = g.map.cityById[g.state.location];
    const offers = offersHere(g);
    assert.equal(offers.length, canPayHere(here) ? 3 : 2, here.name);
  }
});

test('cada oferta es posible y paga mejor que el mercado', () => {
  for (let i = 0; i < 20; i++) {
    const g = testGame({}, `ofertas-${i}`);
    const days = travelDays(g.map, g.state.location);
    for (const k of offersHere(g)) {
      const dest = g.map.cityById[k.to];
      assert.notEqual(k.to, g.state.location);
      assert.ok(isTradedIn(k.goodId, dest.type) && isTradedIn(k.goodId, g.map.cityById[g.state.location].type));
      assert.ok(k.qty > 0 && Number.isInteger(k.qty));
      assert.ok(k.deadline >= g.state.day + days[k.to] + 2 && k.deadline <= 60, `${k.deadline}`);
      const market = sellPriceAt(g.state.seed, dest, k.goodId, 50) * k.qty;
      assert.ok(k.reward > market, `${k.reward} vs ${market}`);
    }
  }
});

test('aceptar pasa el contrato a activos y hace conocida la ciudad destino', () => {
  const g = testGame();
  const [k] = offersHere(g);
  assert.ok(acceptContract(g, k.id).ok);
  assert.equal(g.state.contracts.active.length, 1);
  assert.ok(g.state.known[k.to]);
  assert.ok(!offersHere(g).some((o) => o.id === k.id));
  assert.equal(acceptContract(g, k.id).ok, false);
});

test(`no se pueden tener más de ${MAX_ACTIVE} contratos activos`, () => {
  const g = testGame();
  let accepted = 0;
  for (const city of g.map.cities) {
    moveTo(g, city.id);
    for (const offer of offersHere(g)) if (acceptContract(g, offer.id).ok) accepted++;
  }
  assert.equal(accepted, MAX_ACTIVE);
  assert.equal(g.state.contracts.active.length, MAX_ACTIVE);
});

test('entregar en destino con la carga paga la recompensa y sube la reputación', () => {
  const g = testGame();
  const [k] = offersHere(g);
  acceptContract(g, k.id);
  assert.equal(deliverContract(g, k.id).ok, false, 'no estás en destino');
  moveTo(g, k.to);
  assert.equal(deliverContract(g, k.id).ok, false, 'no tenés la carga');
  g.state.cargo[k.goodId] = k.qty + 2;
  const gold = g.state.gold;
  assert.ok(deliverContract(g, k.id).ok);
  assert.equal(g.state.gold, gold + k.reward);
  assert.equal(g.state.cargo[k.goodId], 2);
  assert.equal(g.state.rep[g.map.cityById[k.to].zone], DONE_REP);
  assert.equal(g.state.contracts.active.length, 0);
});

test('un contrato vencido se pierde y baja la reputación', () => {
  const g = testGame({ food: 200, water: 200 });
  const [k] = offersHere(g);
  acceptContract(g, k.id);
  while (g.state.day <= k.deadline) rest(g);
  assert.equal(g.state.contracts.active.length, 0);
  assert.equal(g.state.rep[g.map.cityById[k.to].zone], -FAIL_REP);
  assert.ok(g.state.log.some((l) => l.text.includes('venció')));
});

test('las ofertas son siempre las mismas para la misma semilla', () => {
  assert.deepEqual(offersHere(testGame({}, 'igual')), offersHere(testGame({}, 'igual')));
});

test('los contratos se guardan y se validan', () => {
  const g = testGame();
  const [k] = offersHere(g);
  acceptContract(g, k.id);
  const raw = JSON.parse(JSON.stringify(g.state));
  const res = validateState(raw);
  assert.ok(res.ok, res.error);
  assert.deepEqual(res.game.state.contracts, g.state.contracts);
  raw.contracts.active[0].goodId = 'oro';
  assert.equal(validateState(raw).ok, false);
});
