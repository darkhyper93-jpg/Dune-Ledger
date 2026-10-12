/** Pruebas del cliente del ranking del desafío (con un fetch falso: nunca toca el servidor). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanNickname, deviceId, submitScore, fetchTop, endpoint, RANKING, TEST_URL } from '../../js/net/leaderboard.js';
import { scoreCode } from '../../js/game/daily.js';
import { MemoryStorage } from './helpers.js';

/** fetch falso que anota los pedidos y responde lo que se le pida. */
function fakeFetch(reply) {
  const calls = [];
  const fn = async (url, opts = {}) => {
    calls.push({ url, opts });
    const r = typeof reply === 'function' ? reply(url, opts) : reply;
    if (r instanceof Error) throw r;
    return { ok: r.status >= 200 && r.status < 300, status: r.status, json: async () => r.body ?? null, text: async () => JSON.stringify(r.body ?? '') };
  };
  fn.calls = calls;
  return fn;
}

test('el apodo se limpia y se valida como en la base', () => {
  assert.equal(cleanNickname('  Lucía  la   Zorra '), 'Lucía la Zorra');
  assert.equal(cleanNickname('ab'), null);
  assert.equal(cleanNickname('<script>'), null);
  assert.equal(cleanNickname('x'.repeat(17)), null);
  assert.equal(cleanNickname('Ñandú_2026'), 'Ñandú_2026');
});

test('cada dispositivo tiene un id fijo de 32 letras hexa', () => {
  const store = new MemoryStorage();
  const a = deviceId(store);
  assert.match(a, /^[0-9a-f]{32}$/);
  assert.equal(deviceId(store), a);
  assert.notEqual(deviceId(new MemoryStorage()), a);
});

test('publicar manda el puntaje con el código y la clave pública', async () => {
  const fetchImpl = fakeFetch({ status: 201 });
  const res = await submitScore({ date: '2026-10-12', nickname: 'Pepa', score: 1500 }, { fetchImpl, storage: new MemoryStorage() });
  assert.deepEqual(res, { ok: true });
  const { url, opts } = fetchImpl.calls[0];
  assert.equal(url, `${RANKING.url}/rest/v1/daily_scores`);
  assert.equal(opts.method, 'POST');
  assert.equal(opts.headers.apikey, RANKING.key);
  // La clave publicable no va como Bearer (Supabase la rechazaría como JWT inválido).
  assert.equal(opts.headers.Authorization, undefined);
  const body = JSON.parse(opts.body);
  assert.equal(body.day, '2026-10-12');
  assert.equal(body.score, 1500);
  assert.equal(body.code, scoreCode('2026-10-12', 1500));
  assert.match(body.device, /^[0-9a-f]{32}$/);
});

test('publicar con puntaje negativo manda 0, como el código', async () => {
  const fetchImpl = fakeFetch({ status: 201 });
  await submitScore({ date: '2026-10-12', nickname: 'Pepa', score: -300 }, { fetchImpl, storage: new MemoryStorage() });
  assert.equal(JSON.parse(fetchImpl.calls[0].opts.body).score, 0);
});

test('errores claros: apodo inválido, ya publicado y sin conexión', async () => {
  const storage = new MemoryStorage();
  const bad = await submitScore({ date: '2026-10-12', nickname: 'a', score: 10 }, { fetchImpl: fakeFetch({ status: 201 }), storage });
  assert.equal(bad.ok, false);
  assert.match(bad.error, /apodo/i);
  const dup = await submitScore({ date: '2026-10-12', nickname: 'Pepa', score: 10 }, { fetchImpl: fakeFetch({ status: 409 }), storage });
  assert.equal(dup.ok, false);
  assert.match(dup.error, /ya/i);
  const off = await submitScore({ date: '2026-10-12', nickname: 'Pepa', score: 10 }, { fetchImpl: fakeFetch(new TypeError('Failed to fetch')), storage });
  assert.equal(off.ok, false);
  assert.match(off.error, /conexión/i);
});

test('el ranking del día se pide ordenado y se devuelve limpio', async () => {
  const rows = [{ nickname: 'Ana', score: 3000 }, { nickname: 'Beto', score: 1200 }];
  const fetchImpl = fakeFetch({ status: 200, body: rows });
  const res = await fetchTop('2026-10-12', { fetchImpl });
  assert.deepEqual(res, { ok: true, rows: [{ nickname: 'Ana', score: 3000 }, { nickname: 'Beto', score: 1200 }] });
  const url = fetchImpl.calls[0].url;
  assert.match(url, /day=eq\.2026-10-12/);
  assert.match(url, /order=score\.desc/);
  assert.match(url, /limit=20/);
  // Filas raras (de otra versión o tocadas) se descartan.
  const weird = await fetchTop('2026-10-12', { fetchImpl: fakeFetch({ status: 200, body: [{ nickname: 5, score: 'x' }, { nickname: 'Ok', score: 10 }] }) });
  assert.deepEqual(weird.rows, [{ nickname: 'Ok', score: 10 }]);
  const off = await fetchTop('2026-10-12', { fetchImpl: fakeFetch(new TypeError('offline')) });
  assert.equal(off.ok, false);
});

test('un navegador manejado por pruebas nunca le habla a la base real', () => {
  assert.equal(endpoint({ webdriver: true }), TEST_URL);
  assert.match(TEST_URL, /\.invalid$/);
  assert.equal(endpoint({ webdriver: false }), RANKING.url);
  assert.equal(endpoint(undefined), RANKING.url);
});
