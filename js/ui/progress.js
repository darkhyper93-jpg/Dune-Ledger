/**
 * Pantallas del progreso permanente: elegir mercader al empezar, la tienda
 * del Gremio (mercaderes y mejoras con sellos), logros y códice, y el
 * código de progreso para copiar o pegar.
 */

import { h, openSheet } from './dom.js';
import { MERCHANTS } from '../data/merchants.js';
import { UPGRADES } from '../data/upgrades.js';
import { ACHIEVEMENTS, ACHIEVEMENTS_BY_ID } from '../data/achievements.js';
import { GOODS } from '../data/goods.js';
import { CITY_TYPES } from '../data/cities.js';
import { EVENTS } from '../data/events.js';
import { ROLES, TRAITS } from '../data/crew.js';
import { buyMerchant, buyUpgrade, canBuyMerchant, encodeProgress, decodeProgress } from '../game/profile.js';
import { fmt } from '../core/text.js';
import { playCoins } from '../core/audio.js';

/** Títulos de los eventos para el códice. */
const EVENT_NAMES = {
  bandidos: 'Bandidos', 'bandidos-amigos': 'Bandidos conocidos', tormenta: 'Tormenta de arena', 'oasis-seco': 'Oasis seco',
  nomada: 'Mercader nómada', ruinas: 'Ruinas', viajero: 'Viajero herido', control: 'Control del sultán',
};

/**
 * Elegir mercader antes de empezar la temporada.
 * @param {object} app
 */
export function renderChoose(app) {
  const owned = MERCHANTS.filter((m) => app.profile.merchants.includes(m.id));
  let chosen = owned.some((m) => m.id === app.params.merchant) ? app.params.merchant : 'aprendiz';
  const list = h('div', { class: 'stack', role: 'radiogroup', 'aria-label': 'Mercader' });
  const paint = () => {
    list.replaceChildren(...owned.map((m) => h('button', {
      class: `card merchant${m.id === chosen ? ' chosen' : ''}`, role: 'radio', 'aria-checked': String(m.id === chosen), 'data-testid': `merchant-${m.id}`,
      onclick: () => { chosen = m.id; paint(); },
    }, h('b', {}, m.name), h('span', { class: 'small muted' }, m.desc))));
  };
  paint();
  const ups = Object.entries(app.profile.upgrades);
  return h('div', { class: 'stack' },
    h('h1', {}, 'Nueva temporada'),
    h('p', { class: 'muted', style: 'margin:0' }, 'Elegí con qué mercader jugar. Comprá más en el Gremio con tus sellos.'),
    list,
    ups.length ? h('p', { class: 'small muted', style: 'margin:0' }, `Mejoras activas: ${ups.map(([id, l]) => `${UPGRADES.find((u) => u.id === id).name} ${l}`).join(', ')}.`) : null,
    h('button', { class: 'btn big primary', 'data-testid': 'start-season', onclick: () => app.newSeason(chosen) }, 'Empezar'),
    h('button', { class: 'btn big', onclick: () => app.go('menu') }, 'Volver'));
}

/**
 * Tienda del Gremio: mercaderes y mejoras.
 * @param {object} app
 */
export function renderShop(app) {
  const p = app.profile;
  const buy = (fn, label) => {
    const res = fn();
    if (!res.ok) return app.toast(res.error);
    playCoins(80);
    app.saveAll();
    app.toast(`¡${label}!`);
    app.render();
  };
  const merchants = MERCHANTS.filter((m) => m.id !== 'aprendiz').map((m) => {
    const have = p.merchants.includes(m.id);
    const can = canBuyMerchant(p, m);
    return h('div', { class: 'card stack', style: 'gap:6px', 'data-testid': `shop-${m.id}` },
      h('div', { class: 'row between' }, h('b', {}, m.name), h('span', { class: 'pill' }, have ? 'Tuyo' : `${m.cost} sellos`)),
      h('div', { class: 'small' }, m.desc),
      !have && m.requires ? h('div', { class: 'small muted' }, `Pide el logro «${ACHIEVEMENTS_BY_ID[m.requires].name}».`) : null,
      have ? null : h('button', { class: 'btn small primary', disabled: !can.ok, onclick: () => buy(() => buyMerchant(p, m.id), `${m.name} se une a vos`) }, can.ok ? 'Comprar' : can.error));
  });
  const upgrades = UPGRADES.map((u) => {
    const lvl = p.upgrades[u.id] ?? 0;
    const max = u.costs.length;
    return h('div', { class: 'card stack', style: 'gap:6px', 'data-testid': `upgrade-${u.id}` },
      h('div', { class: 'row between' }, h('b', {}, u.name), h('span', { class: 'pill' }, `Nivel ${lvl}/${max}`)),
      h('div', { class: 'small' }, u.desc),
      lvl < max
        ? h('button', { class: 'btn small primary', disabled: p.seals < u.costs[lvl], onclick: () => buy(() => buyUpgrade(p, u.id), `${u.name} nivel ${lvl + 1}`) }, `Mejorar (${u.costs[lvl]} sellos)`)
        : h('div', { class: 'small good' }, 'Al máximo'));
  });
  return h('div', { class: 'stack' },
    h('h1', {}, 'Gremio de Mercaderes'),
    h('div', { class: 'card row between' }, h('span', {}, 'Tus sellos'), h('b', { 'data-testid': 'shop-seals', style: 'font-size:22px' }, fmt(p.seals))),
    h('h2', {}, 'Mercaderes'), merchants,
    h('h2', {}, 'Mejoras'), h('p', { class: 'muted small', style: 'margin:0' }, 'Valen para todas las temporadas que juegues.'), upgrades,
    h('button', { class: 'btn big', onclick: () => app.go('menu') }, 'Volver'));
}

/**
 * Una sección del códice: lo visto con nombre, lo no visto como "???".
 */
function codexSection(title, items, seen) {
  const count = items.filter((i) => seen[i.id]).length;
  return h('div', { class: 'card stack', style: 'gap:6px' },
    h('div', { class: 'row between' }, h('h3', {}, title), h('span', { class: 'small muted' }, `${count}/${items.length}`)),
    h('div', { class: 'chips' }, items.map((i) => h('span', { class: `chip${seen[i.id] ? '' : ' locked'}` }, seen[i.id] ? i.name : '???'))));
}

/**
 * Logros y códice.
 * @param {object} app
 */
export function renderRecords(app) {
  const p = app.profile;
  const got = ACHIEVEMENTS.filter((a) => p.achievements[a.id]).length;
  const named = (obj, names) => Object.keys(obj).map((id) => ({ id, name: names ? names[id] : obj[id].name }));
  return h('div', { class: 'stack' },
    h('h1', {}, 'Logros y códice'),
    h('div', { class: 'card row between' }, h('span', {}, 'Logros'), h('b', { 'data-testid': 'achievements-count' }, `${got}/${ACHIEVEMENTS.length}`)),
    h('div', { class: 'stack', style: 'gap:6px' }, ACHIEVEMENTS.map((a) => h('div', { class: `achievement${p.achievements[a.id] ? ' done' : ''}` },
      h('b', {}, `${p.achievements[a.id] ? '★' : '☆'} ${a.name}`), h('span', { class: 'small muted' }, a.desc)))),
    h('h2', {}, 'Códice'),
    codexSection('Bienes', GOODS, p.codex.goods),
    codexSection('Ciudades', CITY_TYPES, p.codex.cityTypes),
    codexSection('Eventos', named(Object.fromEntries(EVENTS.map((e) => [e.id, e])), EVENT_NAMES), p.codex.events),
    codexSection('Oficios', named(ROLES), p.codex.roles),
    codexSection('Personalidades', named(TRAITS), p.codex.traits),
    h('button', { class: 'btn big', onclick: () => app.go('menu') }, 'Volver'));
}

/**
 * Tarjeta de Ajustes para copiar o pegar el código de progreso.
 * @param {object} app
 */
export function progressCodeCard(app) {
  const showCode = () => openSheet((close) => {
    const code = encodeProgress(app.profile);
    const area = h('textarea', { class: 'code', readonly: true, rows: '4', 'data-testid': 'progress-code' }, code);
    return h('div', { class: 'stack' }, h('h2', {}, 'Tu código de progreso'),
      h('p', { class: 'muted small', style: 'margin:0' }, 'Guardalo o pasalo a otro celular. Tiene una suma de control: si se modifica, no sirve.'),
      area,
      h('div', { class: 'btn-row' }, h('button', { class: 'btn', onclick: close }, 'Cerrar'),
        h('button', { class: 'btn primary', onclick: async () => {
          area.select();
          try {
            await navigator.clipboard.writeText(code);
            app.toast('Código copiado.');
          } catch {
            app.toast('Seleccionalo y copialo a mano.');
          }
        } }, 'Copiar')));
  }, { label: 'Código de progreso' });
  const loadCode = () => openSheet((close) => {
    const area = h('textarea', { class: 'code', rows: '4', placeholder: 'DL1-…', 'data-testid': 'progress-input' });
    return h('div', { class: 'stack' }, h('h2', {}, 'Cargar un código'),
      h('p', { class: 'muted small', style: 'margin:0' }, 'Reemplaza tu progreso actual (sellos, mercaderes, mejoras y logros).'),
      area,
      h('div', { class: 'btn-row' }, h('button', { class: 'btn', onclick: close }, 'Cancelar'),
        h('button', { class: 'btn primary', 'data-testid': 'progress-load', onclick: () => {
          const res = decodeProgress(area.value);
          if (!res.ok) return app.toast(res.error);
          app.profile = res.profile;
          app.saveAll();
          close();
          app.toast('¡Progreso cargado!');
          app.render();
        } }, 'Cargar')));
  }, { label: 'Cargar código' });
  return h('div', { class: 'card stack' },
    h('h3', {}, 'Código de progreso'),
    h('p', { class: 'muted small', style: 'margin:0' }, 'Todo tu progreso como texto, para copiarlo y pegarlo en otro lado.'),
    h('div', { class: 'btn-row' },
      h('button', { class: 'btn', 'data-testid': 'show-code', onclick: showCode }, 'Ver código'),
      h('button', { class: 'btn', 'data-testid': 'load-code', onclick: loadCode }, 'Pegar código')));
}
