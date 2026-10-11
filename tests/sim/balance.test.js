/**
 * Métricas de balance obligatorias (ver docs/DISENO.md, "Balance y pruebas").
 * Juegan cientos de temporadas con bots; si alguna falla, hay que ajustar
 * los números de js/data/ y volver a medir.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runMany, playSeason } from './bots.js';
import { runLoop } from './loop.js';
import { GOODS_BY_ID, ACTIVE_GOODS } from '../../js/data/goods.js';
import { sellPriceAt, buyPriceAt } from '../../js/game/market.js';

const N = 300;

test(`el bot codicioso paga toda la deuda en el 65–80% de las temporadas (Normal, ${N} temporadas)`, () => {
  const r = runMany('greedy', N, 'metrica');
  console.log(`  codicioso: ${(r.winRate * 100).toFixed(1)}% · puntaje mediano ${r.medianScore} · ${r.medianTrips} viajes`);
  assert.ok(r.winRate >= 0.65 && r.winRate <= 0.8, `ganó ${(r.winRate * 100).toFixed(1)}%`);
});

test(`el bot aleatorio paga la deuda en menos del 15% (${N} temporadas)`, () => {
  const r = runMany('random', N, 'metrica');
  console.log(`  aleatorio: ${(r.winRate * 100).toFixed(1)}%`);
  assert.ok(r.winRate < 0.15, `ganó ${(r.winRate * 100).toFixed(1)}%`);
});

test('una ruta en bucle repetida 10 veces nunca gana más de 25% por viaje al final', () => {
  for (let i = 0; i < 30; i++) {
    const { profits, loop } = runLoop(`bucle-${i}`, 10, 5);
    const last = profits[profits.length - 1];
    assert.ok(last <= 0.25, `bucle-${i} (${loop.goodId}): ${(last * 100).toFixed(1)}%`);
  }
});

test('los precios quedan entre 20% y 300% del base durante temporadas enteras', () => {
  let checks = 0;
  const onTurn = (game) => {
    for (const city of game.map.cities) {
      for (const id of ACTIVE_GOODS) {
        const base = GOODS_BY_ID[id].base;
        const stock = game.state.stock[city.id][id];
        for (const p of [sellPriceAt(game.state.seed, city, id, stock), buyPriceAt(game.state.seed, city, id, stock)]) {
          assert.ok(p >= base * 0.2 - 1e-9 && p <= base * 3 + 1e-9, `${id} en ${city.name}: ${p}`);
          checks++;
        }
      }
    }
  };
  for (let i = 0; i < 10; i++) {
    playSeason('greedy', `precios-${i}`, { onTurn });
    playSeason('random', `precios-${i}`, { onTurn });
  }
  assert.ok(checks > 1000);
});

test('duración: una temporada del codicioso tiene entre 20 y 45 viajes (≈15–25 minutos)', () => {
  const r = runMany('greedy', 100, 'duracion');
  assert.ok(r.medianTrips >= 20 && r.medianTrips <= 45, `${r.medianTrips} viajes`);
});
