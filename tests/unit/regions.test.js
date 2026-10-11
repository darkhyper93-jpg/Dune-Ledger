/** Pruebas de las 5 regiones: mapas, monturas, bienes, impuestos y eventos propios. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { REGIONS, getRegion } from '../../js/data/regions.js';
import { createSeason, finishSeason } from '../../js/game/season.js';
import { generateMap, bestNeighborMargin, MIN_ROUTE_MARGIN } from '../../js/game/map-gen.js';
import { capacity } from '../../js/game/caravan.js';
import { tripNeeds } from '../../js/game/travel.js';
import { quote } from '../../js/game/market.js';
import { totalOwed } from '../../js/game/debt.js';
import { canTrade } from '../../js/game/perks.js';
import { eventAllowed } from '../../js/game/events.js';
import { EVENTS_BY_ID } from '../../js/data/events.js';
import { validateState } from '../../js/game/validate.js';
import { defaultProfile, recordSeason } from '../../js/game/profile.js';

const season = (region, seed = 'region') => createSeason({ seed, region, events: false });

test('hay 5 regiones y la primera es el Desierto de Sal', () => {
  assert.equal(REGIONS.length, 5);
  assert.equal(REGIONS[0].id, 'desierto');
  assert.equal(new Set(REGIONS.map((r) => r.id)).size, 5);
  for (const r of REGIONS) assert.ok(r.name && r.desc && r.mount.one && r.mount.capacity > 0);
  assert.throws(() => getRegion('marte'));
});

test('todos los mapas de todas las regiones cumplen las reglas', () => {
  for (const r of REGIONS) {
    for (let i = 0; i < 12; i++) {
      const map = generateMap(`reglas-${i}`, r.id);
      for (const c of map.cities) {
        const d = map.routesByCity[c.id].length;
        assert.ok(d >= 2 && d <= 4, `${r.id}: ${d} rutas`);
        assert.ok(bestNeighborMargin(map, `reglas-${i}`, c.id, r.id) >= MIN_ROUTE_MARGIN, `${r.id} ${c.name}`);
      }
    }
  }
});

test('la Costa tiene muchos puertos y rutas por mar entre ellos', () => {
  let sea = 0;
  for (let i = 0; i < 10; i++) {
    const map = generateMap(`costa-${i}`, 'costa');
    assert.ok(map.cities.filter((c) => c.type === 'puerto').length >= 4);
    for (const r of map.routes) {
      const both = map.cityById[r.a].type === 'puerto' && map.cityById[r.b].type === 'puerto';
      assert.equal(r.terrain === 'mar', both);
      if (both) sea++;
    }
  }
  assert.ok(sea > 0);
});

test('en la Estepa se viaja a caballo: más rápido y con menos carga', () => {
  const g = season('estepa');
  assert.equal(capacity(g.state), 2 * getRegion('estepa').mount.capacity);
  assert.ok(capacity(g.state) < capacity(season('desierto').state));
  const route = g.map.routes.find((r) => r.days >= 3) ?? g.map.routes[0];
  assert.ok(tripNeeds(g.state, route).days < route.days || route.days === 1);
});

test('el jade sólo existe en las Montañas de Jade, y vale mucho', () => {
  const j = season('jade');
  const d = season('desierto');
  const mine = j.map.cities.find((c) => c.type === 'minera');
  assert.ok(canTrade(j.state, 'jade', mine.type));
  assert.ok(!canTrade(d.state, 'jade', 'minera'));
  let mont = 0;
  let total = 0;
  for (let i = 0; i < 10; i++) {
    for (const r of generateMap(`m-${i}`, 'jade').routes) { total++; if (r.terrain === 'montana') mont++; }
  }
  assert.ok(mont / total > 0.3, `montaña ${mont}/${total}`);
});

test('en el Reino del Sultán se paga impuesto al vender y la deuda es más alta', () => {
  const s = season('sultan');
  assert.equal(totalOwed(s.state.debt), Math.round(300 * 1.2) + Math.round(500 * 1.2) + Math.round(700 * 1.2));
  const here = s.state.location;
  const taxed = quote(s, here, 'te', 10, 'sell').total;
  s.state.region = 'desierto';
  const free = quote(s, here, 'te', 10, 'sell').total;
  assert.ok(Math.abs(taxed / free - 0.95) < 0.02, `${taxed} vs ${free}`);
});

test('cada región tiene sus propios eventos', () => {
  const costa = season('costa');
  const sea = costa.map.routes.find((r) => r.terrain === 'mar');
  const land = costa.map.routes.find((r) => r.terrain !== 'mar');
  if (sea) assert.ok(eventAllowed(costa, sea, EVENTS_BY_ID.piratas));
  assert.ok(!eventAllowed(costa, land, EVENTS_BY_ID.piratas));
  const estepa = season('estepa');
  assert.ok(eventAllowed(estepa, estepa.map.routes[0], EVENTS_BY_ID.estampida));
  assert.ok(!eventAllowed(costa, costa.map.routes[0], EVENTS_BY_ID.estampida));
});

test('una temporada de cada región se guarda y se carga igual', () => {
  for (const r of REGIONS) {
    const g = season(r.id, `guardar-${r.id}`);
    const res = validateState(JSON.parse(JSON.stringify(g.state)));
    assert.ok(res.ok, `${r.id}: ${res.error}`);
    assert.deepEqual(res.game.map.cities, g.map.cities);
  }
  const bad = JSON.parse(JSON.stringify(season('costa').state));
  bad.region = 'marte';
  assert.equal(validateState(bad).ok, false);
});

test('ganar en una región desbloquea la siguiente', () => {
  const p = defaultProfile();
  assert.deepEqual(p.regions, ['desierto']);
  const g = season('desierto');
  g.state.gold = 5000;
  g.state.debt.installments.forEach((i) => { i.paid = i.amount; });
  finishSeason(g, 'retiro');
  recordSeason(p, g);
  assert.deepEqual(p.regions, ['desierto', 'estepa']);
});

test('una partida guardada antes de las regiones (versión 2) se sigue cargando', () => {
  const g = season('desierto', 'vieja');
  const old = JSON.parse(JSON.stringify(g.state));
  old.v = 2;
  delete old.region;
  delete old.mode;
  delete old.daily;
  delete old.cargo.jade;
  delete old.costBasis.jade;
  for (const row of Object.values(old.stock)) delete row.jade;
  for (const p of Object.values(old.prices)) { delete p.sell.jade; delete p.buy.jade; }
  const res = validateState(old);
  assert.ok(res.ok, res.error);
  assert.equal(res.game.state.region, 'desierto');
  assert.equal(res.game.state.mode, 'temporada');
  assert.equal(res.game.state.cargo.jade, 0);
  assert.deepEqual(res.game.map.cities, g.map.cities);
  assert.equal(res.game.state.gold, g.state.gold);
});
