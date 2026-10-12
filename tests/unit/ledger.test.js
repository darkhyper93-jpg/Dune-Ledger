/** Pruebas del libro mayor: cuánto se compró y vendió de cada bien y adónde fue el oro. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ledgerView, noteFlow, FLOWS } from '../../js/game/ledger.js';
import { buy, sell, undo, buyProvision, buyCamel, payGuild } from '../../js/game/actions.js';
import { buyGear } from '../../js/game/gear.js';
import { rest } from '../../js/game/season.js';
import { validateState } from '../../js/game/validate.js';
import { ACTIVE_GOODS } from '../../js/data/goods.js';
import { canTrade } from '../../js/game/perks.js';
import { testGame } from './helpers.js';

/** Temporada de prueba con el libro abierto desde el oro que se pide. */
function fresh(patch = {}) {
  const g = testGame(patch);
  g.state.stats.ledger.start = g.state.gold;
  return g;
}

/** Un bien que se puede comerciar en la ciudad actual. */
function tradable(g) {
  const type = g.map.cityById[g.state.location].type;
  return ACTIVE_GOODS.find((id) => canTrade(g.state, id, type));
}

test('arranca vacío, con el oro inicial anotado', () => {
  const g = testGame();
  const v = ledgerView(g.state);
  assert.equal(v.start, g.state.gold);
  assert.deepEqual(v.rows, []);
  assert.equal(v.other, 0);
  assert.deepEqual(v.flows.map((f) => f.id), FLOWS.map((f) => f.id));
});

test('compras y ventas por bien, con la ganancia de lo vendido', () => {
  const g = fresh({ gold: 2000 });
  const id = tradable(g);
  const b = buy(g, id, 6);
  const s = sell(g, id, 4);
  const v = ledgerView(g.state);
  const row = v.rows.find((r) => r.goodId === id);
  assert.equal(row.bought, 6);
  assert.equal(row.spent, b.total);
  assert.equal(row.sold, 4);
  assert.equal(row.revenue, s.total);
  assert.equal(row.profit, s.profit);
  assert.equal(v.tradeNet, s.total - b.total);
});

test('deshacer también borra el asiento', () => {
  const g = fresh({ gold: 2000 });
  const id = tradable(g);
  buy(g, id, 3);
  undo(g);
  assert.deepEqual(ledgerView(g.state).rows, []);
});

test('provisiones, animales y equipo van a su cuenta; lo demás queda en "otros"', () => {
  const g = fresh({ gold: 3000 });
  const p = buyProvision(g, 'water', 5);
  const c = buyCamel(g);
  const start = ledgerView(g.state).start;
  let v = ledgerView(g.state);
  assert.equal(v.flows.find((f) => f.id === 'provisiones').amount, -p.total);
  assert.equal(v.flows.find((f) => f.id === 'animales').amount, -c.total);
  // Oro que aparece sin pasar por ninguna cuenta (por ejemplo, un evento).
  g.state.gold += 77;
  v = ledgerView(g.state);
  assert.equal(v.other, 77);
  assert.equal(v.now, g.state.gold);
  assert.equal(start + v.tradeNet + v.flows.reduce((s, f) => s + f.amount, 0) + v.other, g.state.gold);
});

test('pagar al Gremio y comprar equipo se anotan', () => {
  const g = fresh({ gold: 3000 });
  const capital = g.map.cities.find((c) => c.type === 'capital');
  g.state.location = capital.id;
  g.state.visited[capital.id] = true;
  const paid = payGuild(g, 200);
  assert.ok(paid.ok);
  assert.ok(buyGear(g, 'lampara').ok);
  const v = ledgerView(g.state);
  assert.equal(v.flows.find((f) => f.id === 'gremio').amount, -200);
  assert.ok(v.flows.find((f) => f.id === 'equipo').amount < 0);
  assert.equal(v.other, 0);
});

test('los sueldos de la semana se anotan', () => {
  const g = fresh({ gold: 3000, food: 50, water: 50 });
  g.state.crew = [{ id: 'x', name: 'Amira', role: 'guardia', trait: 'leal', xp: 0, morale: 70, wage: 12 }];
  while (g.state.day % 7 !== 6) g.state.day += 1;
  rest(g);
  assert.equal(ledgerView(g.state).flows.find((f) => f.id === 'sueldos').amount, -12);
});

test('el mejor y el peor negocio salen de las ganancias por bien', () => {
  const g = testGame();
  noteFlow(g.state, 'provisiones', -5);
  g.state.stats.ledger.goods = { sal: { bq: 5, bt: 50, sq: 5, st: 120, p: 70 }, seda: { bq: 2, bt: 200, sq: 2, st: 150, p: -50 } };
  const v = ledgerView(g.state);
  assert.equal(v.best.goodId, 'sal');
  assert.equal(v.worst.goodId, 'seda');
  assert.deepEqual(v.rows.map((r) => r.goodId), ['sal', 'seda']);
});

test('se guarda, se carga y una partida vieja sin libro arranca uno vacío', () => {
  const g = fresh({ gold: 2000 });
  buy(g, tradable(g), 2);
  const res = validateState(JSON.parse(JSON.stringify(g.state)));
  assert.ok(res.ok, res.error);
  assert.deepEqual(res.game.state.stats.ledger, g.state.stats.ledger);
  const old = JSON.parse(JSON.stringify(g.state));
  delete old.stats.ledger;
  const loaded = validateState(old);
  assert.ok(loaded.ok, loaded.error);
  assert.equal(loaded.game.state.stats.ledger.start, null);
  assert.equal(ledgerView(loaded.game.state).other, null);
  const bad = JSON.parse(JSON.stringify(g.state));
  bad.stats.ledger.goods.trampa = { bq: 1, bt: 1, sq: 1, st: 1, p: 1 };
  assert.equal(validateState(bad).ok, false);
});
