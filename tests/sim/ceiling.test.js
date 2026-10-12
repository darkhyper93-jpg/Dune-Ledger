/**
 * Techo del balance: además de medir bots que juegan como una persona
 * promedio, ninguna estrategia simple tiene que ganar casi siempre. El bot
 * "explotador" hace lo que encontró la revisión de diseño (no agranda la
 * caravana y toma todo el préstamo posible); antes ganaba el 96%.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runMany, PROFILES } from './bots.js';

const N = 200;

test(`ninguna estrategia simple gana más del 90% en Normal (explotador, ${N} temporadas)`, () => {
  const r = runMany('exploit', N, 'techo');
  console.log(`  explotador: ${(r.winRate * 100).toFixed(1)}% · puntaje mediano ${r.medianScore}`);
  assert.ok(r.winRate <= 0.9, `ganó ${(r.winRate * 100).toFixed(1)}%`);
});

test(`el préstamo no es una mejora gratis: suma a lo sumo 5 puntos de victorias (${N} temporadas)`, () => {
  PROFILES.exploitNoLoan = { ...PROFILES.exploit, loanUntil: 0 };
  try {
    const withLoan = runMany('exploit', N, 'techo').winRate;
    const without = runMany('exploitNoLoan', N, 'techo').winRate;
    console.log(`  con préstamo ${(withLoan * 100).toFixed(1)}% · sin préstamo ${(without * 100).toFixed(1)}%`);
    assert.ok(withLoan - without <= 0.05, `el préstamo suma ${((withLoan - without) * 100).toFixed(1)} puntos`);
  } finally {
    delete PROFILES.exploitNoLoan;
  }
});

test('agrandar la caravana rinde: con 4 camellos el puntaje mediano supera al de 2 (150 temporadas)', () => {
  const median = (cap) => {
    PROFILES.capTest = { ...PROFILES.greedy, maxCamels: cap };
    try {
      return runMany('capTest', 150, 'caravana').medianScore;
    } finally {
      delete PROFILES.capTest;
    }
  };
  const two = median(2);
  const four = median(4);
  console.log(`  mediana con 2 camellos ${two} · con 4 camellos ${four}`);
  assert.ok(four > two, `4 camellos: ${four}, 2 camellos: ${two}`);
});
