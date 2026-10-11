/**
 * Balance de regiones y dificultades (decisión propia, ver docs/DECISIONES.md):
 * las métricas obligatorias se miden en el Desierto en Normal; acá se cuida
 * que las otras regiones sean jugables sin mejoras y que las dificultades
 * queden en orden.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runMany, playSeason } from './bots.js';
import { REGIONS } from '../../js/data/regions.js';
import { GOODS_BY_ID, ACTIVE_GOODS } from '../../js/data/goods.js';
import { cityPrices } from '../../js/game/market.js';

const N = 80;
const pct = (r) => `${(r.winRate * 100).toFixed(1)}%`;

test(`cada región es jugable: el codicioso gana entre 40% y 85% (${N} temporadas)`, () => {
  for (const region of REGIONS.filter((r) => r.id !== 'desierto')) {
    const r = runMany('greedy', N, 'region', { region: region.id });
    console.log(`  ${region.name}: ${pct(r)} · ${r.medianTrips} viajes`);
    assert.ok(r.winRate >= 0.4 && r.winRate <= 0.85, `${region.name}: ${pct(r)}`);
    assert.ok(r.medianTrips >= 15 && r.medianTrips <= 45, `${region.name}: ${r.medianTrips} viajes`);
  }
});

test(`las dificultades quedan en orden: Fácil > Normal > Difícil > Pesadilla (${N} temporadas)`, () => {
  const rates = ['facil', 'normal', 'dificil', 'pesadilla'].map((difficulty) => {
    const r = runMany('greedy', N, 'dificultad', { difficulty });
    console.log(`  ${difficulty}: ${pct(r)}`);
    return r.winRate;
  });
  for (let i = 1; i < rates.length; i++) assert.ok(rates[i] < rates[i - 1], `${rates}`);
  assert.ok(rates[3] >= 0.15, 'la Pesadilla tiene que poder ganarse');
});

test('en Pesadilla, con el vaivén, los precios siguen entre 20% y 300% del base', () => {
  let checks = 0;
  const onTurn = (game) => {
    for (const city of game.map.cities) {
      const prices = cityPrices(game, city.id, ACTIVE_GOODS);
      for (const id of ACTIVE_GOODS) {
        const base = GOODS_BY_ID[id].base;
        for (const p of [prices.buy[id], prices.sell[id]]) {
          assert.ok(p >= base * 0.2 - 1e-9 && p <= base * 3 + 1e-9, `${id} en ${city.name}: ${p}`);
          checks++;
        }
      }
    }
  };
  for (let i = 0; i < 4; i++) playSeason('greedy', `vaiven-${i}`, { difficulty: 'pesadilla', onTurn });
  assert.ok(checks > 1000);
});
