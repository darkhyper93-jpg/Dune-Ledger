/**
 * Balance del contenido opcional (crónicas y bazar): un bot que también
 * compra equipo y sigue la crónica no puede ganar mucho más que el bot
 * base (el contenido no rompe el juego), y las crónicas tienen que poder
 * terminarse jugando normalmente.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runMany, playSeason } from './bots.js';
import { REGIONS } from '../../js/data/regions.js';

const N = 60;

test(`con crónicas y equipo no se gana mucho más fácil (${N} temporadas por región)`, () => {
  for (const r of REGIONS) {
    const base = runMany('greedy', N, 'extras', { region: r.id });
    const ext = runMany('greedy', N, 'extras', { region: r.id, extras: true });
    console.log(`  ${r.name}: base ${(base.winRate * 100).toFixed(1)}% · con extras ${(ext.winRate * 100).toFixed(1)}%`);
    assert.ok(ext.winRate <= base.winRate + 0.15, `${r.name}: ${ext.winRate} contra ${base.winRate}`);
  }
});

test('cada crónica se puede terminar jugando normalmente', () => {
  for (const r of REGIONS) {
    let done = 0;
    for (let i = 0; i < 30; i++) if (playSeason('greedy', `cronica-${i}`, { region: r.id, extras: true }).game.state.chronicle.step >= 3) done++;
    console.log(`  ${r.name}: ${done}/30 crónicas completas`);
    assert.ok(done >= 6, `${r.name}: sólo ${done}/30`);
  }
});
