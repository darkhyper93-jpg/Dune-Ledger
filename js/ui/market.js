/**
 * Pestaña Mercado: lista de bienes con precios de compra y venta, cuánto
 * llevás y la mejor venta que conocés. Tocar un bien abre la hoja para
 * comprar o vender, que muestra el precio unidad por unidad y el total.
 */

import { h, mount, openSheet, fmtPrice } from './dom.js';
import { activeGoods, getGood } from '../data/goods.js';
import { cityPrices, quote, cityMod } from '../game/market.js';
import { buy, sell, undo, maxBuy } from '../game/actions.js';
import { cargoFree } from '../game/caravan.js';
import { bestKnownSell } from '../game/knowledge.js';
import { fmt, plural } from '../core/text.js';
import { playCoins, playTap } from '../core/audio.js';

/**
 * Texto "hace N días" para un precio visto.
 * @param {number} today
 * @param {number} day
 */
export function ago(today, day) {
  const d = today - day;
  return d === 0 ? 'hoy' : `hace ${plural(d, 'día', 'días')}`;
}

/**
 * Arma la pestaña del mercado.
 * @param {object} app controlador (ver js/ui/app.js)
 * @returns {HTMLElement}
 */
export function renderMarket(app) {
  const { game } = app;
  const { state, map } = game;
  const city = map.cityById[state.location];
  const goods = activeGoods();
  const prices = cityPrices(game, state.location, goods.map((g) => g.id));
  const wrap = h('div', { class: 'stack' });

  const lastUndo = state.undo[state.undo.length - 1];
  if (lastUndo) {
    wrap.append(h('div', { class: 'undo-bar' },
      h('span', { class: 'grow' }, `Última: ${lastUndo.label}`),
      h('button', { class: 'btn small', 'data-testid': 'undo', onclick: () => {
        const res = app.act((g) => undo(g));
        if (res.ok) app.toast(`Deshecha la ${res.label}.`);
      } }, '↶ Deshacer')));
  }

  wrap.append(h('p', { class: 'muted small', style: 'margin:0' }, 'Tocá un bien para comprar o vender. Comprar mucho junto sube el precio.'));
  const list = h('div', { class: 'goods' });
  for (const g of goods) {
    const mod = cityMod(city.type, g.id);
    const tag = mod < 1 ? h('span', { class: 'tag-cheap' }, 'Barato acá') : mod > 1 ? h('span', { class: 'tag-dear' }, 'Se paga bien acá') : null;
    const best = bestKnownSell(game, g.id);
    const owned = state.cargo[g.id];
    let hint = 'Todavía no viste otro precio.';
    if (best) {
      const gain = best.price - prices.buy[g.id];
      hint = `Mejor visto: ${fmtPrice(best.price)} en ${map.cityById[best.cityId].name} (${ago(state.day, best.day)})${gain > 0 ? ` · +${fmtPrice(Math.round(gain * 10) / 10)} c/u` : ''}`;
    }
    list.append(h('button', { class: 'good-row', 'data-testid': `good-${g.id}`, onclick: () => openTrade(app, g.id, owned > 0 && mod >= 1 ? 'sell' : 'buy') },
      h('span', { class: 'gico', 'aria-hidden': 'true' }, g.icon),
      h('span', { class: 'grow' },
        h('div', { class: 'gname' }, g.name, owned > 0 ? h('span', { class: 'pill', style: 'margin-left:6px' }, `llevás ${owned}`) : null),
        h('div', { class: 'gsub' }, tag, tag ? ' · ' : '', `peso ${g.weight}`, g.decay ? ' · se echan a perder' : ''),
        h('div', { class: 'gsub tiny' }, hint)),
      h('span', { class: 'gprice' },
        h('div', {}, h('span', { class: 'muted tiny' }, 'Compra '), h('b', {}, fmtPrice(prices.buy[g.id]))),
        h('div', {}, h('span', { class: 'muted tiny' }, 'Venta '), h('b', {}, fmtPrice(prices.sell[g.id]))))));
  }
  wrap.append(list);
  return wrap;
}

/**
 * Abre la hoja de compra / venta de un bien.
 * @param {object} app
 * @param {string} goodId
 * @param {'buy'|'sell'} startMode
 */
export function openTrade(app, goodId, startMode) {
  const { game } = app;
  const good = getGood(goodId);
  let mode = startMode;
  let qty = startMode === 'sell' ? game.state.cargo[goodId] : 1;

  openSheet((close) => {
    const body = h('div', { class: 'stack' });
    const limit = () => (mode === 'buy' ? maxBuy(game, goodId) : game.state.cargo[goodId]);

    const paint = () => {
      const { state, map } = game;
      const max = limit();
      qty = Math.max(0, Math.min(qty, max));
      if (qty === 0 && max > 0) qty = 1;
      const q = quote(game, state.location, goodId, qty, mode);
      const chips = q.prices.slice(0, 40).map((p, i) => h('span', {}, `${i + 1}: ${fmtPrice(p)}`));
      if (q.prices.length > 40) chips.push(h('span', {}, '…'));
      let info = null;
      if (mode === 'buy') {
        const best = bestKnownSell(game, goodId);
        if (best && qty > 0) {
          const est = Math.round(best.price * qty * 0.9);
          info = h('p', { class: 'small muted', style: 'margin:0' }, `Si lo vendés en ${map.cityById[best.cityId].name} (${fmtPrice(best.price)} ${ago(state.day, best.day)}): unos ${fmt(est)}, `,
            h('b', { class: est > q.total ? 'good' : 'bad' }, `${est >= q.total ? 'ganarías' : 'perderías'} ~${fmt(Math.abs(est - q.total))}`), '.');
        }
      } else if (qty > 0) {
        const profit = Math.round(q.total - state.costBasis[goodId] * qty);
        info = h('p', { class: 'small', style: 'margin:0' }, profit >= 0 ? h('b', { class: 'good' }, `Ganás ${fmt(profit)}`) : h('b', { class: 'bad' }, `Perdés ${fmt(-profit)}`),
          h('span', { class: 'muted' }, ` (lo pagaste ${fmtPrice(Math.round(state.costBasis[goodId] * 10) / 10)} c/u)`));
      }
      const why = max === 0 ? (mode === 'buy' ? (cargoFree(state) < good.weight ? 'No te entra más carga.' : 'No te alcanza el oro.') : 'No llevás este bien.') : null;
      mount(body,
        h('div', { class: 'row' }, h('span', { class: 'gico', style: 'font-size:28px' }, good.icon),
          h('div', { class: 'grow' }, h('h2', {}, good.name),
            h('div', { class: 'muted small' }, `Llevás ${state.cargo[goodId]} · lugar libre ${cargoFree(state)} · peso ${good.weight}`))),
        h('div', { class: 'seg', role: 'group', 'aria-label': 'Comprar o vender' },
          h('button', { 'aria-pressed': String(mode === 'buy'), 'data-testid': 'mode-buy', onclick: () => { mode = 'buy'; qty = 1; paint(); } }, 'Comprar'),
          h('button', { 'aria-pressed': String(mode === 'sell'), 'data-testid': 'mode-sell', onclick: () => { mode = 'sell'; qty = state.cargo[goodId]; paint(); } }, 'Vender')),
        h('div', { class: 'qty' },
          h('button', { class: 'btn', 'aria-label': 'Una menos', disabled: qty <= 1, onclick: () => { qty -= 1; paint(); } }, '−'),
          h('output', { 'data-testid': 'qty', 'aria-live': 'polite' }, String(qty)),
          h('button', { class: 'btn', 'aria-label': 'Una más', disabled: qty >= max, onclick: () => { qty += 1; paint(); } }, '+')),
        h('div', { class: 'btn-row' },
          h('button', { class: 'btn small', disabled: max < 5, onclick: () => { qty = Math.min(max, qty + 5); paint(); } }, '+5'),
          h('button', { class: 'btn small', disabled: max < 10, onclick: () => { qty = Math.min(max, qty + 10); paint(); } }, '+10'),
          h('button', { class: 'btn small', 'data-testid': 'qty-max', disabled: max === 0, onclick: () => { qty = max; paint(); } }, `Máx (${max})`)),
        qty > 0 ? h('div', {}, h('div', { class: 'muted tiny', style: 'margin-bottom:4px' }, 'Precio de cada unidad:'), h('div', { class: 'unit-prices' }, chips)) : null,
        h('div', { class: 'total-line' }, h('span', {}, mode === 'buy' ? 'Pagás' : 'Cobrás'), h('b', { 'data-testid': 'trade-total' }, fmt(q.total))),
        info,
        why ? h('p', { class: 'bad small', style: 'margin:0' }, why) : null,
        h('button', { class: `btn big ${mode === 'buy' ? 'primary' : 'teal'}`, 'data-testid': 'trade-confirm', disabled: qty === 0, onclick: () => confirm(q.total) },
          `${mode === 'buy' ? 'Comprar' : 'Vender'} ${qty} por ${fmt(q.total)}`));
    };

    const confirm = () => {
      const res = app.act((g) => (mode === 'buy' ? buy(g, goodId, qty) : sell(g, goodId, qty)));
      if (!res.ok) return;
      if (mode === 'sell') {
        playCoins(res.profit);
        app.toast(res.profit >= 0 ? `Vendiste por ${fmt(res.total)}: ganaste ${fmt(res.profit)}.` : `Vendiste por ${fmt(res.total)}: perdiste ${fmt(-res.profit)}.`);
      } else {
        playTap();
        app.toast(`Compraste ${qty} de ${good.name} por ${fmt(res.total)}.`);
      }
      close();
    };

    paint();
    return body;
  }, { label: `Comerciar ${good.name}` });
}
