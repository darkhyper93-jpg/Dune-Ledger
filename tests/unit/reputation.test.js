/** Pruebas de zonas del mapa y reputación. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateMap } from '../../js/game/map-gen.js';
import { ZONES, changeRep, repBuyFactor, zoneOf } from '../../js/game/reputation.js';
import { quote } from '../../js/game/market.js';
import { testGame } from './helpers.js';

test('cada ciudad pertenece a una de las 3 zonas y todas las zonas tienen ciudades', () => {
  for (let i = 0; i < 30; i++) {
    const map = generateMap(`zonas-${i}`);
    for (const c of map.cities) assert.ok(ZONES.some((z) => z.id === c.zone), c.zone);
    for (const z of ZONES) assert.ok(map.cities.filter((c) => c.zone === z.id).length >= 3, z.id);
  }
});

test('la zona norte está arriba de la sur', () => {
  const map = generateMap('zonas-orden');
  const avg = (z) => { const cs = map.cities.filter((c) => c.zone === z); return cs.reduce((s, c) => s + c.y, 0) / cs.length; };
  assert.ok(avg('norte') < avg('centro') && avg('centro') < avg('sur'));
});

test('la reputación arranca en 0 y queda entre -100 y 100', () => {
  const g = testGame();
  for (const z of ZONES) assert.equal(g.state.rep[z.id], 0);
  changeRep(g.state, 'norte', 250);
  assert.equal(g.state.rep.norte, 100);
  changeRep(g.state, 'norte', -400);
  assert.equal(g.state.rep.norte, -100);
});

test('buena reputación da descuento al comprar; mala, recargo', () => {
  assert.equal(repBuyFactor(0), 1);
  assert.ok(Math.abs(repBuyFactor(100) - 0.95) < 1e-9);
  assert.ok(Math.abs(repBuyFactor(50) - 0.975) < 1e-9);
  assert.ok(Math.abs(repBuyFactor(-100) - 1.1) < 1e-9);
});

test('la reputación de la zona cambia lo que cuesta comprar en sus ciudades', () => {
  const g = testGame();
  const here = g.state.location;
  const zone = zoneOf(g.map, here);
  const base = quote(g, here, 'te', 10, 'buy').total;
  g.state.rep[zone] = 100;
  assert.ok(quote(g, here, 'te', 10, 'buy').total < base);
  g.state.rep[zone] = -100;
  assert.ok(quote(g, here, 'te', 10, 'buy').total > base);
});
