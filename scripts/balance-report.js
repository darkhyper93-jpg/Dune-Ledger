/**
 * Informe rápido de balance: juega N temporadas con cada bot y muestra
 * la tasa de victorias, el puntaje mediano y los viajes por temporada.
 * Uso: npm run balance -- 300 [región] [dificultad]
 * Con región "todas" recorre las 5 regiones (sólo el bot codicioso y el prudente).
 */
import { runMany } from '../tests/sim/bots.js';
import { REGIONS } from '../js/data/regions.js';

const n = Number(process.argv[2] ?? 200);
const regionArg = process.argv[3] ?? 'desierto';
const difficulty = process.argv[4] ?? 'normal';
const regions = regionArg === 'todas' ? REGIONS.map((r) => r.id) : [regionArg];
const kinds = regionArg === 'todas' ? ['greedy', 'prudent'] : ['greedy', 'prudent', 'random'];
for (const region of regions) {
  for (const kind of kinds) {
    const t = Date.now();
    const r = runMany(kind, n, 'balance', { region, difficulty });
    console.log(`${region.padEnd(8)} ${difficulty.padEnd(9)} ${kind.padEnd(7)} gana ${(r.winRate * 100).toFixed(1)}%  puntaje mediano ${r.medianScore}  viajes ${r.medianTrips}  (${Date.now() - t} ms)`);
  }
}
