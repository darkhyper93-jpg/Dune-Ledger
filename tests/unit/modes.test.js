/** Pruebas de los modos de la etapa 6: desafío diario y modo libre. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSeason, finishSeason, rest, canFinish, lastDay } from '../../js/game/season.js';
import { createDaily, dailyDate, scoreCode, readScoreCode } from '../../js/game/daily.js';
import { totalOwed } from '../../js/game/debt.js';
import { takeLoan } from '../../js/game/bank.js';
import { canTravel } from '../../js/game/travel.js';
import { validateState } from '../../js/game/validate.js';
import { defaultProfile, recordSeason, validateProfile } from '../../js/game/profile.js';

test('la fecha del desafío es el día local en formato AAAA-MM-DD', () => {
  assert.equal(dailyDate(new Date(2026, 9, 11, 23, 59)), '2026-10-11');
  assert.equal(dailyDate(new Date(2026, 0, 5, 0, 1)), '2026-01-05');
});

test('el desafío diario es igual para todos: mismo mapa, Aprendiz, sin mejoras', () => {
  const a = createDaily('2026-10-11', { events: false });
  const b = createDaily('2026-10-11', { events: false });
  assert.deepEqual(a.map.cities, b.map.cities);
  assert.equal(a.state.location, b.state.location);
  assert.equal(a.state.mode, 'diario');
  assert.equal(a.state.merchant, 'aprendiz');
  assert.deepEqual(a.state.upgrades, {});
  assert.equal(a.state.region, 'desierto');
  assert.equal(a.state.difficulty, 'normal');
  const other = createDaily('2026-10-12', { events: false });
  assert.notDeepEqual(other.map.cities, a.map.cities);
});

test('el código de puntaje se lee de vuelta y no se puede inventar', () => {
  const code = scoreCode('2026-10-11', 4870);
  assert.match(code, /^DL-2026-10-11-4870-[0-9a-z]{3}$/);
  assert.deepEqual(readScoreCode(code), { ok: true, date: '2026-10-11', score: 4870 });
  assert.deepEqual(readScoreCode(` ${code}\n`), { ok: true, date: '2026-10-11', score: 4870 });
  assert.equal(readScoreCode(code.replace('4870', '9870')).ok, false);
  assert.equal(readScoreCode('DL-2026-10-11-4870').ok, false);
  assert.equal(readScoreCode('hola').ok, false);
  // Un puntaje negativo se muestra como 0.
  assert.match(scoreCode('2026-10-11', -300), /^DL-2026-10-11-0-/);
});

test('modo libre: sin deuda, sin préstamos y sin límite de 60 días', () => {
  const g = createSeason({ seed: 'libre', mode: 'libre', events: false });
  assert.equal(g.state.mode, 'libre');
  assert.equal(totalOwed(g.state.debt), 0);
  assert.ok(lastDay(g.state) > 300);
  const capital = g.map.cities.find((c) => c.type === 'capital').id;
  g.state.location = capital;
  g.state.visited[capital] = true;
  assert.equal(takeLoan(g, 100).ok, false);
  g.state.day = 70;
  g.state.food = 50;
  g.state.water = 50;
  assert.equal(rest(g).ok, true);
  assert.equal(g.state.day, 71);
  const route = g.map.routesByCity[g.state.location][0];
  assert.equal(canTravel(g, route.id).ok, true);
  assert.equal(canFinish(g), true);
  const res = validateState(JSON.parse(JSON.stringify(g.state)));
  assert.ok(res.ok, res.error);
});

test('el modo libre no da sellos, logros ni temporadas', () => {
  const p = defaultProfile();
  const g = createSeason({ seed: 'libre', mode: 'libre', events: false });
  g.state.gold = 9000;
  const over = finishSeason(g, 'fin');
  assert.equal(over.seals, 0);
  const res = recordSeason(p, g);
  assert.deepEqual(res.newAchievements, []);
  assert.equal(p.seals, 0);
  assert.equal(p.seasons, 0);
});

test('el desafío cuenta una sola vez por día: las repeticiones son de práctica', () => {
  const p = defaultProfile();
  const play = (gold) => {
    const g = createDaily('2026-10-11', { events: false });
    g.state.gold = gold;
    g.state.debt.installments.forEach((i) => { i.paid = i.amount; });
    finishSeason(g, 'retiro');
    return { g, res: recordSeason(p, g) };
  };
  const first = play(2000);
  assert.ok(first.g.state.over.official);
  assert.equal(p.daily.date, '2026-10-11');
  assert.equal(p.daily.score, Math.round(first.g.state.over.score));
  assert.equal(p.daily.published, false);
  const seals = p.seals;
  assert.ok(seals > 0);
  const again = play(5000);
  assert.equal(again.g.state.over.official, false);
  assert.equal(p.seals, seals);
  assert.equal(p.daily.score, Math.round(first.g.state.over.score));
  assert.deepEqual(validateProfile(JSON.parse(JSON.stringify(p))).daily, p.daily);
});

test('una partida del desafío se guarda y se carga igual', () => {
  const g = createDaily('2026-10-11', { events: false });
  const res = validateState(JSON.parse(JSON.stringify(g.state)));
  assert.ok(res.ok, res.error);
  assert.equal(res.game.state.daily, '2026-10-11');
  const bad = JSON.parse(JSON.stringify(g.state));
  bad.mode = 'trampa';
  assert.equal(validateState(bad).ok, false);
});
