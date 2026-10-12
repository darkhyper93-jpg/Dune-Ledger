/**
 * Libro mayor de la temporada: lo que compraste y vendiste de cada bien
 * (con la ganancia de lo vendido) y adónde fue el oro: provisiones,
 * animales, sueldos, pagos al Gremio y equipo. Lo que no pasa por ninguna
 * de esas cuentas (eventos, contratos, el banco, Kasim) queda en "otros",
 * calculado como la diferencia con el oro de la bolsa.
 *
 * Vive dentro de `state.stats` para que deshacer una compra también borre
 * su asiento.
 */

/** Cuentas de gastos e ingresos que no son comercio, en el orden en que se muestran. */
export const FLOWS = [
  { id: 'provisiones', name: 'Provisiones' },
  { id: 'animales', name: 'Animales' },
  { id: 'sueldos', name: 'Sueldos' },
  { id: 'gremio', name: 'Pagos al Gremio' },
  { id: 'equipo', name: 'Equipo e inversiones' },
];

/** Ids de las cuentas, para validar. */
export const FLOW_IDS = FLOWS.map((f) => f.id);

/**
 * Libro vacío.
 * @param {number|null} start oro al empezar (null si no se sabe: partida vieja)
 */
export function initialLedger(start) {
  return { start, goods: {}, flows: Object.fromEntries(FLOW_IDS.map((id) => [id, 0])) };
}

/** El libro de la temporada (lo crea si una prueba armó el estado a mano). */
function book(state) {
  if (!state.stats.ledger) state.stats.ledger = initialLedger(null);
  return state.stats.ledger;
}

/**
 * Anota una compra o una venta de un bien.
 * @param {object} state
 * @param {'buy'|'sell'} kind
 * @param {string} goodId
 * @param {number} qty
 * @param {number} total oro pagado o cobrado
 * @param {number} [profit] ganancia de lo vendido
 */
export function noteTrade(state, kind, goodId, qty, total, profit = 0) {
  const goods = book(state).goods;
  const row = goods[goodId] ?? (goods[goodId] = { bq: 0, bt: 0, sq: 0, st: 0, p: 0 });
  if (kind === 'buy') {
    row.bq += qty;
    row.bt += total;
  } else {
    row.sq += qty;
    row.st += total;
    row.p += profit;
  }
}

/**
 * Anota oro que entra (positivo) o sale (negativo) por una cuenta.
 * @param {object} state
 * @param {string} flow id de FLOWS
 * @param {number} amount
 */
export function noteFlow(state, flow, amount) {
  if (!amount) return;
  const flows = book(state).flows;
  flows[flow] = (flows[flow] ?? 0) + Math.round(amount);
}

/**
 * Lo que muestra el libro.
 * @param {object} state
 */
export function ledgerView(state) {
  const led = book(state);
  const rows = Object.entries(led.goods)
    .map(([goodId, r]) => ({ goodId, bought: r.bq, spent: r.bt, sold: r.sq, revenue: r.st, profit: r.p }))
    .sort((a, b) => b.profit - a.profit || b.revenue - a.revenue);
  const flows = FLOWS.map((f) => ({ ...f, amount: led.flows[f.id] ?? 0 }));
  const tradeNet = rows.reduce((s, r) => s + r.revenue - r.spent, 0);
  const counted = tradeNet + flows.reduce((s, f) => s + f.amount, 0);
  const sold = rows.filter((r) => r.sold > 0);
  return {
    start: led.start,
    now: state.gold,
    rows,
    flows,
    tradeNet,
    other: led.start === null ? null : state.gold - led.start - counted,
    best: sold.length && sold[0].profit > 0 ? sold[0] : null,
    worst: sold.length && sold[sold.length - 1].profit < 0 ? sold[sold.length - 1] : null,
  };
}
