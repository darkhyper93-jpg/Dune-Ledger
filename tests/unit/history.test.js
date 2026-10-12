/** Pruebas del registro día a día (para el gráfico) y del historial de temporadas del perfil. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSeason, rest, finishSeason } from '../../js/game/season.js';
import { worthNow, HISTORY_LIMIT } from '../../js/game/history.js';
import { validateState } from '../../js/game/validate.js';
import { defaultProfile, recordSeason, validateProfile, PROFILE_HISTORY } from '../../js/game/profile.js';

const fresh = () => createSeason({ seed: 'historia', events: false });

test('la temporada anota tu patrimonio y el de Kasim cada día', () => {
  const g = fresh();
  assert.deepEqual(g.state.history, [{ day: 1, me: worthNow(g.state), rival: 400 }]);
  for (let i = 0; i < 4; i++) rest(g);
  assert.equal(g.state.history.length, 5);
  assert.deepEqual(g.state.history.map((h) => h.day), [1, 2, 3, 4, 5]);
  // El patrimonio descuenta la deuda: al empezar es negativo.
  assert.ok(g.state.history[0].me < 0);
});

test('el registro tiene un tope (el modo libre puede durar mucho)', () => {
  const g = createSeason({ seed: 'libre-largo', mode: 'libre', events: false });
  g.state.food = 999;
  g.state.water = 999;
  for (let i = 0; i < HISTORY_LIMIT + 20; i++) {
    g.state.food = 50;
    g.state.water = 50;
    rest(g);
  }
  assert.equal(g.state.history.length, HISTORY_LIMIT);
  assert.equal(g.state.history.at(-1).day, g.state.day);
});

test('el registro se guarda, se carga y las partidas viejas arrancan sin él', () => {
  const g = fresh();
  rest(g);
  const res = validateState(JSON.parse(JSON.stringify(g.state)));
  assert.ok(res.ok, res.error);
  assert.deepEqual(res.game.state.history, g.state.history);
  const old = JSON.parse(JSON.stringify(g.state));
  delete old.history;
  assert.deepEqual(validateState(old).game.state.history, []);
});

test('el perfil guarda las últimas temporadas, la más nueva primero', () => {
  const p = defaultProfile();
  for (let i = 0; i < PROFILE_HISTORY + 3; i++) {
    const g = createSeason({ seed: `h-${i}`, events: false });
    g.state.gold = 1000 + i;
    finishSeason(g, 'fin');
    recordSeason(p, g);
  }
  assert.equal(p.history.length, PROFILE_HISTORY);
  const last = p.history[0];
  assert.equal(last.region, 'desierto');
  assert.equal(last.mode, 'temporada');
  assert.equal(typeof last.score, 'number');
  assert.ok(p.history[0].score >= p.history[1].score);
  assert.deepEqual(validateProfile(JSON.parse(JSON.stringify(p))).history, p.history);
});
