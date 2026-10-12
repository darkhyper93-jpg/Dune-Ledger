/**
 * Cómo eligen los bots en un evento: hacen la cuenta del valor esperado de
 * cada opción con las probabilidades que muestra la carta, como un jugador.
 */

import { getGood } from '../../js/data/goods.js';
import { optionState } from '../../js/game/events.js';
import { EVENTS_BY_ID } from '../../js/data/events.js';

/** Valor de la carga a precio base. */
function cargoBase(state, goodId = null) {
  let v = 0;
  for (const [id, q] of Object.entries(state.cargo)) if (!goodId || id === goodId) v += q * getGood(id).base;
  return v;
}

/**
 * Valor en oro (aproximado) de un conjunto de efectos de evento.
 */
function effectValue(state, eff, params) {
  const num = (v) => (typeof v === 'string' ? (v.startsWith('-$') ? -params[v.slice(2)] : params[v.slice(1)]) : v);
  let v = 0;
  if (eff.gold) v += num(eff.gold);
  if (eff.loot) v += (eff.loot[0] + eff.loot[1]) / 2;
  v += ((eff.food ?? 0) + (eff.water ?? 0)) * 2;
  if (eff.cargoPct) v -= cargoBase(state) * eff.cargoPct;
  if (eff.breakFragile) v -= cargoBase(state, 'ceramica') * eff.breakFragile;
  if (eff.delay) v -= 25 * eff.delay;
  if (eff.camelHp) v += eff.camelHp * state.camels * 0.6;
  if (eff.rep) v += 3 * eff.rep;
  if (eff.give) v += getGood(num(eff.give.good)).base * num(eff.give.qty);
  if (eff.takeAll) v -= cargoBase(state, num(eff.takeAll));
  if (eff.inspect && state.cargo.armas > 0) v -= cargoBase(state, 'armas') + (params.fine ?? 30);
  if (eff.losePart) v -= cargoBase(state, eff.losePart.good) * eff.losePart.pct;
  // El salvoconducto evita otros encuentros en los próximos días (estimado).
  if (eff.safePass) v += cargoBase(state) * 0.03;
  return v;
}

/**
 * Elige la opción de un evento con mejor valor esperado (como un jugador
 * que hace la cuenta con las probabilidades que muestra la carta).
 */
export function bestOption(game) {
  const ev = game.state.trip.event;
  const def = EVENTS_BY_ID[ev.id];
  let best = -1;
  let bestV = -Infinity;
  def.options.forEach((opt, i) => {
    const st = optionState(game, i);
    if (!st.available) return;
    const v = st.chance === null
      ? effectValue(game.state, opt.effects, ev.params)
      : st.chance * effectValue(game.state, opt.win, ev.params) + (1 - st.chance) * effectValue(game.state, opt.lose, ev.params);
    if (v > bestV) {
      bestV = v;
      best = i;
    }
  });
  return best;
}

