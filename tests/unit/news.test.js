/** Pruebas de noticias de mercado y rumores. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NEWS } from '../../js/data/news.js';
import { newsMult, rumorsAt, activeNews, newsText, tickNews } from '../../js/game/news.js';
import { cityPrices } from '../../js/game/market.js';
import { rest } from '../../js/game/season.js';
import { testGame } from './helpers.js';

/** Crea una noticia a mano sobre la ciudad actual (por tipo de ciudad). */
function newsHere(g, patch = {}) {
  const tpl = NEWS.find((n) => n.scope === 'type' && n.cityType === g.map.cityById[g.state.location].type) ?? null;
  const city = g.map.cityById[g.state.location];
  const item = { tpl: 'prueba', goods: ['te'], mult: 2, cityType: city.type, zone: null, rumorDay: 1, startDay: 3, endDay: 6, real: true, ...patch };
  g.state.news.items.push(item);
  return { item, tpl };
}

test('cada noticia de los datos es válida', () => {
  for (const n of NEWS) {
    assert.ok(n.id && n.text && n.goods.length > 0);
    assert.ok(n.mult === 2 || n.mult === 0.5);
    assert.ok(n.scope === 'type' || n.scope === 'zone');
  }
});

test('a lo largo de la temporada sale una noticia cada 7 a 10 días', () => {
  const g = testGame({ food: 200, water: 200 });
  const seen = new Set();
  for (let d = 1; d < 60; d++) {
    rest(g);
    for (const n of g.state.news.items) seen.add(n.rumorDay);
  }
  const days = [...seen].sort((a, b) => a - b);
  assert.ok(days.length >= 5 && days.length <= 9, `${days.length} noticias`);
  for (let i = 1; i < days.length; i++) assert.ok(days[i] - days[i - 1] >= 7 && days[i] - days[i - 1] <= 10);
});

test('una noticia verdadera y activa multiplica el precio sólo donde corresponde', () => {
  const g = testGame();
  const here = g.state.location;
  const before = cityPrices(g, here, ['te', 'sal']);
  newsHere(g);
  g.state.day = 4;
  assert.equal(newsMult(g, here, 'te'), 2);
  assert.equal(newsMult(g, here, 'sal'), 1);
  const after = cityPrices(g, here, ['te', 'sal']);
  assert.ok(after.sell.te > before.sell.te);
  assert.equal(after.sell.sal, before.sell.sal);
  const other = g.map.cities.find((c) => c.type !== g.map.cityById[here].type);
  assert.equal(newsMult(g, other.id, 'te'), 1);
});

test('un rumor falso nunca cambia los precios', () => {
  const g = testGame();
  newsHere(g, { real: false });
  g.state.day = 4;
  assert.equal(newsMult(g, g.state.location, 'te'), 1);
});

test('la noticia empieza el día indicado y se termina después de endDay', () => {
  const g = testGame();
  newsHere(g);
  g.state.day = 2;
  assert.equal(newsMult(g, g.state.location, 'te'), 1);
  g.state.day = 6;
  assert.equal(newsMult(g, g.state.location, 'te'), 2);
  g.state.day = 7;
  assert.equal(newsMult(g, g.state.location, 'te'), 1);
});

test('antes de confirmarse es un rumor; después, una noticia (si era verdad)', () => {
  const g = testGame();
  const { item } = newsHere(g);
  newsHere(g, { real: false, goods: ['sal'] });
  g.state.day = 2;
  assert.equal(rumorsAt(g.state).length, 2);
  assert.equal(activeNews(g.state).length, 0);
  g.state.day = 4;
  assert.equal(rumorsAt(g.state).length, 0);
  assert.deepEqual(activeNews(g.state), [item]);
});

test('al confirmarse o desmentirse queda en el diario', () => {
  const g = testGame({ food: 200, water: 200 });
  newsHere(g, { startDay: 2 });
  newsHere(g, { startDay: 2, real: false, goods: ['sal'] });
  g.state.day = 1;
  tickNews(g);
  g.state.day = 2;
  tickNews(g);
  assert.ok(g.state.log.some((l) => l.text.startsWith('Se confirmó')));
  assert.ok(g.state.log.some((l) => l.text.startsWith('Era falso')));
});

test('el texto nombra la zona cuando la noticia es de una zona', () => {
  const tpl = NEWS.find((n) => n.scope === 'zone');
  const txt = newsText({ tpl: tpl.id, zone: 'norte' });
  assert.ok(txt.includes('Norte'), txt);
});
