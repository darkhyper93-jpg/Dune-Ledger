/** Pruebas de las 4 dificultades: deuda, eventos, precios, préstamos y desbloqueo. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DIFFICULTIES, DIFFICULTY_LIST } from '../../js/data/rules.js';
import { createSeason, finishSeason } from '../../js/game/season.js';
import { totalOwed } from '../../js/game/debt.js';
import { eventChance, eventWeights } from '../../js/game/events.js';
import { marketMult } from '../../js/game/market.js';
import { newsMult } from '../../js/game/news.js';
import { takeLoan } from '../../js/game/bank.js';
import { defaultProfile, recordSeason, canPlay } from '../../js/game/profile.js';

const season = (difficulty, seed = 'dif') => createSeason({ seed, difficulty, events: false });

test('las dificultades van de menor a mayor: deuda y sellos', () => {
  assert.deepEqual(DIFFICULTY_LIST.map((d) => d.id), ['facil', 'normal', 'dificil', 'pesadilla']);
  const owed = DIFFICULTY_LIST.map((d) => totalOwed(season(d.id).state.debt));
  assert.deepEqual(owed, [1000, 1500, 2200, 3000]);
  const seals = DIFFICULTY_LIST.map((d) => d.sealMult);
  assert.deepEqual(seals, [1, 1.25, 1.6, 2]);
});

test('en Fácil hay menos eventos de viaje', () => {
  const f = season('facil');
  const n = season('normal');
  const route = n.map.routes[0];
  assert.ok(eventChance(f, route) < eventChance(n, route));
  assert.ok(Math.abs(eventChance(f, route) / eventChance(n, route) - DIFFICULTIES.facil.eventRate) < 1e-9);
});

test('en Difícil y Pesadilla hay más bandidos', () => {
  const n = season('normal');
  const route = n.map.routes.find((r) => r.danger !== 'bajo' && r.terrain !== 'mar');
  assert.ok(route, 'hace falta una ruta peligrosa');
  const base = eventWeights(n, route).bandidos;
  const hard = season('dificil');
  assert.ok(eventWeights(hard, route).bandidos > base);
  assert.ok(eventWeights(season('pesadilla'), route).bandidos >= eventWeights(hard, route).bandidos);
});

test('en Difícil los precios cambian de semana en semana', () => {
  const n = season('normal');
  const d = season('dificil');
  const here = d.state.location;
  // En Normal el multiplicador es sólo el de las noticias.
  for (let day = 1; day <= 60; day += 5) {
    n.state.day = day;
    assert.equal(marketMult(n, here, 'te'), newsMult(n, here, 'te'));
  }
  const seen = new Set();
  for (let day = 1; day <= 60; day += 5) {
    d.state.day = day;
    const m = marketMult(d, here, 'te') / newsMult(d, here, 'te');
    assert.ok(m >= 1 - DIFFICULTIES.dificil.volatility - 1e-9 && m <= 1 + DIFFICULTIES.dificil.volatility + 1e-9);
    seen.add(m.toFixed(4));
  }
  assert.ok(seen.size > 3, 'el precio tiene que moverse');
  // Dentro de la misma semana no cambia (no se puede abusar descansando un día).
  d.state.day = 11;
  const a = marketMult(d, here, 'te');
  d.state.day = 12;
  assert.equal(marketMult(d, here, 'te'), a);
});

test('en Pesadilla el Gremio no presta', () => {
  const g = season('pesadilla');
  const guild = g.map.cities.find((c) => c.type === 'capital');
  g.state.location = guild.id;
  g.state.visited[guild.id] = true;
  const res = takeLoan(g, 100);
  assert.equal(res.ok, false);
  assert.match(res.error, /Pesadilla/);
  const n = season('normal');
  n.state.location = n.map.cities.find((c) => c.type === 'capital').id;
  assert.equal(takeLoan(n, 100).ok, true);
});

test('la Pesadilla se desbloquea ganando en Difícil', () => {
  const p = defaultProfile();
  assert.equal(canPlay(p, 'desierto', 'dificil'), true);
  assert.equal(canPlay(p, 'desierto', 'pesadilla'), false);
  assert.equal(canPlay(p, 'estepa', 'normal'), false);
  const g = season('dificil');
  g.state.gold = 9000;
  g.state.debt.installments.forEach((i) => { i.paid = i.amount; });
  finishSeason(g, 'retiro');
  recordSeason(p, g);
  assert.equal(canPlay(p, 'desierto', 'pesadilla'), true);
  assert.equal(canPlay(p, 'estepa', 'normal'), true);
});
