/** Pruebas de la caravana rival: viaja, compite por los mercados y se compara al final. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSeason, rest, finishSeason } from '../../js/game/season.js';
import { rivalDay, rivalNews, rivalWorth, RIVAL } from '../../js/game/rival.js';
import { validateState } from '../../js/game/validate.js';
import { otherEnd } from '../../js/game/map-gen.js';

const fresh = (seed = 'rival') => createSeason({ seed, events: false });

test('la caravana rival arranca en otra ciudad, con oro y sin carga', () => {
  const g = fresh();
  const r = g.state.rival;
  assert.ok(r);
  assert.notEqual(r.at, g.state.location);
  assert.ok(g.map.cityById[r.at]);
  assert.equal(r.gold, RIVAL.startGold);
  assert.equal(r.cargo, null);
});

test('el rival viaja por rutas reales y comercia al llegar', () => {
  const g = fresh();
  const r = g.state.rival;
  let trips = 0;
  for (let d = 0; d < 40; d++) {
    const before = r.to;
    rivalDay(g);
    if (r.to && r.to !== before) {
      // Sale por una ruta que existe desde donde está.
      assert.ok(g.map.routesByCity[r.at].some((route) => otherEnd(route, r.at) === r.to), 'ruta inexistente');
      trips++;
    }
    g.state.day = Math.min(60, g.state.day + 1);
  }
  assert.ok(trips >= 4, `sólo ${trips} viajes`);
  assert.ok(r.gold !== RIVAL.startGold, 'tendría que haber ganado o perdido algo');
});

test('cuando el rival compra en una ciudad, ese bien se encarece ahí', () => {
  const g = fresh('rival-stock');
  const r = g.state.rival;
  // Forzamos que llegue hoy a su ciudad y compre.
  const city = r.at;
  const before = { ...g.state.stock[city] };
  r.left = 0;
  r.to = null;
  rivalDay(g);
  assert.ok(r.cargo, 'tendría que haber cargado algo');
  assert.ok(g.state.stock[city][r.cargo.goodId] < before[r.cargo.goodId]);
});

test('las noticias del rival sólo llegan si está cerca', () => {
  const g = fresh();
  const r = g.state.rival;
  r.at = g.state.location;
  r.to = null;
  assert.match(rivalNews(g), /Kasim/);
  const far = g.map.cities.find((c) => c.id !== g.state.location && !g.map.routesByCity[g.state.location].some((route) => otherEnd(route, g.state.location) === c.id));
  r.at = far.id;
  r.to = null;
  assert.equal(rivalNews(g), null);
});

test('el rival se guarda, se carga y al final se compara con vos', () => {
  const g = fresh();
  for (let i = 0; i < 5; i++) rest(g);
  const res = validateState(JSON.parse(JSON.stringify(g.state)));
  assert.ok(res.ok, res.error);
  assert.deepEqual(res.game.state.rival, g.state.rival);
  const bad = JSON.parse(JSON.stringify(g.state));
  bad.rival.at = 'marte';
  assert.equal(validateState(bad).ok, false);
  const over = finishSeason(g, 'fin');
  assert.equal(over.rivalGold, rivalWorth(g.state));
});
