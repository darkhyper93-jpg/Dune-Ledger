/**
 * Informe rápido de balance: juega N temporadas con cada bot y muestra
 * la tasa de victorias, el puntaje mediano y los viajes por temporada.
 * Uso: npm run balance -- 300
 */
import { runMany } from '../tests/sim/bots.js';

const n = Number(process.argv[2] ?? 200);
for (const kind of ['greedy', 'prudent', 'random']) {
  const t = Date.now();
  const r = runMany(kind, n, 'balance');
  console.log(`${kind.padEnd(7)} gana ${(r.winRate * 100).toFixed(1)}%  puntaje mediano ${r.medianScore}  viajes ${r.medianTrips}  (${Date.now() - t} ms)`);
}
