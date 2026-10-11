/** Pruebas del guardado: ida y vuelta, validación y claves peligrosas. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { saveSeason, loadSeason, safeParse, KEYS, loadProfile, saveProfile, defaultProfile, loadSettings, clearSeason } from '../../js/core/save.js';
import { validateState } from '../../js/game/validate.js';
import { buy } from '../../js/game/actions.js';
import { travel, finishSeason } from '../../js/game/season.js';
import { testGame, MemoryStorage } from './helpers.js';

/** Copia profunda de un estado vía JSON, como lo guardaría el navegador. */
const clone = (o) => JSON.parse(JSON.stringify(o));

test('guardar y cargar devuelve la misma partida', () => {
  const store = new MemoryStorage();
  const g = testGame({ food: 60, water: 60 });
  buy(g, 'te', 3);
  travel(g, g.map.routesByCity[g.state.location][0].id);
  buy(g, 'sal', 2);
  assert.ok(saveSeason(g, store));
  const loaded = loadSeason(store);
  assert.ok(loaded);
  assert.deepEqual(loaded.state, g.state);
  assert.deepEqual(loaded.map.cities, g.map.cities);
});

test('también se guarda una temporada terminada', () => {
  const g = testGame({ gold: 2000 });
  finishSeason(g, 'fin');
  const res = validateState(clone(g.state));
  assert.ok(res.ok, res.error);
});

test('safeParse rechaza __proto__, constructor y prototype', () => {
  assert.throws(() => safeParse('{"__proto__":{"x":1}}'));
  assert.throws(() => safeParse('{"a":{"constructor":{}}}'));
  assert.throws(() => safeParse('{"prototype":1}'));
  assert.deepEqual(safeParse('{"a":1}'), { a: 1 });
});

test('una partida con __proto__ guardada no se carga', () => {
  const store = new MemoryStorage();
  const g = testGame();
  const text = JSON.stringify(g.state).replace('"cargo":{', '"cargo":{"__proto__":{"polluted":true},');
  store.setItem(KEYS.season, text);
  assert.equal(loadSeason(store), null);
  assert.equal({}.polluted, undefined);
});

test('se rechazan valores fuera de rango o ids que no existen', () => {
  const g = testGame();
  const cases = [
    (s) => { s.gold = -5; },
    (s) => { s.gold = 1.5; },
    (s) => { s.day = 61; },
    (s) => { s.camels = 11; },
    (s) => { s.location = 'c999'; },
    (s) => { s.cargo.unobtainium = 3; },
    (s) => { s.cargo.sal = 500; }, // no entra en 2 camellos
    (s) => { s.stock.c0.te = 120; },
    (s) => { s.debt.installments[0].day = 21; },
    (s) => { s.debt.installments[0].paid = 9999; },
    (s) => { s.debt.strikes = 5; },
    (s) => { s.known.c999 = true; },
    (s) => { s.prices = { [s.location]: { day: 1, sell: {}, buy: {} } }; },
    (s) => { s.log.push({ day: 1, text: 'x', kind: 'hackeo' }); },
    (s) => { s.difficulty = 'imposible'; },
    (s) => { s.v = 99; },
    (s) => { s.seed = ''; },
    (s) => { s.undo = 'nada'; },
  ];
  for (const [i, mutate] of cases.entries()) {
    const s = clone(g.state);
    mutate(s);
    assert.equal(validateState(s).ok, false, `caso ${i} debería fallar`);
  }
  assert.equal(validateState(null).ok, false);
  assert.equal(validateState([]).ok, false);
});

test('un JSON roto no rompe la carga', () => {
  const store = new MemoryStorage();
  store.setItem(KEYS.season, '{esto no es json');
  assert.equal(loadSeason(store), null);
  clearSeason(store);
  assert.equal(store.getItem(KEYS.season), null);
});

test('perfil y ajustes: valores raros vuelven a los de fábrica', () => {
  const store = new MemoryStorage();
  store.setItem(KEYS.profile, JSON.stringify({ seals: -1, seasons: 1, wins: 0, bestScore: 0, tutorialDone: false }));
  assert.deepEqual(loadProfile(store), defaultProfile());
  saveProfile({ seals: 12, seasons: 2, wins: 1, bestScore: 900, tutorialDone: true }, store);
  assert.equal(loadProfile(store).seals, 12);
  store.setItem(KEYS.settings, JSON.stringify({ music: 7, sfx: 0.3 }));
  assert.deepEqual(loadSettings(store), { music: 0.5, sfx: 0.3 });
});

test('sin localStorage no explota', () => {
  const g = testGame();
  assert.equal(typeof saveSeason(g), 'boolean');
  assert.equal(loadSeason(), null);
});
