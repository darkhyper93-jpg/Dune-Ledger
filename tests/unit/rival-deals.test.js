/** Pruebas de los tratos con Kasim: comprarle la carga, la apuesta de carrera y su sabotaje. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSeason, travel, rest } from '../../js/game/season.js';
import { rivalOffer, buyRivalCargo, canBet, placeBet, BET } from '../../js/game/rival-deals.js';
import { eventAllowed } from '../../js/game/events.js';
import { EVENTS_BY_ID } from '../../js/data/events.js';
import { validateState } from '../../js/game/validate.js';
import { otherEnd } from '../../js/game/map-gen.js';

/** Temporada con Kasim saliendo hoy de tu ciudad hacia una vecina, con carga. */
function departing(seed = 'tratos') {
  const g = createSeason({ seed, events: false });
  const r = g.state.rival;
  const route = g.map.routesByCity[g.state.location][0];
  Object.assign(r, { at: g.state.location, to: otherEnd(route, g.state.location), days: route.days + 2, left: route.days + 2, cargo: { goodId: 'te', qty: 8, cost: 160 } });
  return { g, route };
}

test('Kasim ofrece su carga sólo el día que sale de tu ciudad', () => {
  const { g } = departing();
  const offer = rivalOffer(g);
  assert.deepEqual(offer, { goodId: 'te', qty: 8, price: 192 });
  g.state.rival.left -= 1;
  assert.equal(rivalOffer(g), null);
});

test('comprarle la carga pasa la mercadería, paga y lo deja yendo vacío', () => {
  const { g } = departing();
  g.state.gold = 500;
  const rivalGold = g.state.rival.gold;
  assert.ok(buyRivalCargo(g).ok);
  assert.equal(g.state.cargo.te, 8);
  assert.equal(g.state.gold, 500 - 192);
  assert.equal(g.state.rival.gold, rivalGold + 192);
  assert.equal(g.state.rival.cargo, null);
  assert.equal(buyRivalCargo(g).ok, false);
});

test('sin oro o sin lugar no se le puede comprar', () => {
  const { g } = departing();
  g.state.gold = 50;
  assert.equal(buyRivalCargo(g).ok, false);
});

test('la apuesta se gana llegando antes que Kasim', () => {
  const { g, route } = departing('carrera');
  g.state.gold = 300;
  assert.ok(canBet(g).ok);
  assert.ok(placeBet(g).ok);
  assert.equal(g.state.gold, 300 - BET.stake);
  assert.equal(canBet(g).ok, false, 'una sola apuesta a la vez');
  travel(g, route.id);
  // Kasim tarda 2 días más que la ruta: llegaste antes.
  assert.equal(g.state.bet, null);
  assert.ok(g.state.gold >= 300 - BET.stake + BET.stake * BET.payout - 50, `oro ${g.state.gold}`);
  assert.equal(g.state.stats.betsWon, 1);
});

test('si Kasim llega primero, la apuesta se pierde', () => {
  const { g } = departing('carrera-perdida');
  g.state.rival.left = 1;
  g.state.rival.days = 1;
  g.state.gold = 300;
  assert.ok(placeBet(g).ok);
  rest(g);
  rest(g);
  assert.equal(g.state.bet, null);
  assert.equal(g.state.stats.betsWon ?? 0, 0);
});

test('Kasim sabotea sólo si le sacás mucha ventaja', () => {
  const g = createSeason({ seed: 'sabotaje', events: false });
  const route = g.map.routes[0];
  assert.equal(eventAllowed(g, route, EVENTS_BY_ID['matones-kasim']), false);
  g.state.gold = 4000;
  g.state.rival.gold = 300;
  assert.equal(eventAllowed(g, route, EVENTS_BY_ID['matones-kasim']), true);
});

test('la apuesta se guarda y se valida', () => {
  const { g } = departing();
  g.state.gold = 300;
  placeBet(g);
  const res = validateState(JSON.parse(JSON.stringify(g.state)));
  assert.ok(res.ok, res.error);
  assert.deepEqual(res.game.state.bet, g.state.bet);
  const bad = JSON.parse(JSON.stringify(g.state));
  bad.bet.to = 'marte';
  assert.equal(validateState(bad).ok, false);
});
