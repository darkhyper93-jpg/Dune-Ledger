/**
 * Pantalla "Nueva temporada": elegir región, dificultad y mercader.
 * Las regiones se abren ganando en la anterior y la Pesadilla ganando en
 * Difícil; lo bloqueado se ve (con candado y qué hace falta) pero no se elige.
 */

import { h } from './dom.js';
import { MERCHANTS } from '../data/merchants.js';
import { UPGRADES } from '../data/upgrades.js';
import { REGIONS } from '../data/regions.js';
import { DIFFICULTY_LIST, DIFFICULTIES } from '../data/rules.js';
import { canPlay } from '../game/profile.js';
import { debtPlan } from '../game/debt.js';
import { fmt } from '../core/text.js';
import { regionSvg } from '../render/regions-art.js';
import { iconSvg } from '../render/ui-icons.js';
import { svgNode } from '../render/shapes.js';
import { goodArt } from './art.js';

/** "1,25" con coma decimal. */
const mult = (x) => String(x).replace('.', ',');

/** Qué hace falta para abrir una región. */
function regionLock(i) {
  return `Ganá una temporada en ${REGIONS[i - 1].name} para abrirla.`;
}

/**
 * Pantalla para elegir con qué empezar la temporada.
 * @param {object} app
 */
export function renderChoose(app) {
  const p = app.profile;
  const owned = MERCHANTS.filter((m) => p.merchants.includes(m.id));
  const pick = { region: 'desierto', difficulty: 'normal', merchant: 'aprendiz', ...app.lastPick };
  if (!p.regions.includes(pick.region)) pick.region = 'desierto';
  if (!canPlay(p, pick.region, pick.difficulty)) pick.difficulty = 'normal';
  if (!owned.some((m) => m.id === pick.merchant)) pick.merchant = 'aprendiz';

  const regionBox = h('div', { class: 'region-grid', role: 'radiogroup', 'aria-label': 'Región' });
  const regionInfo = h('p', { class: 'small', style: 'margin:0' });
  const diffBox = h('div', { class: 'seg', role: 'radiogroup', 'aria-label': 'Dificultad' });
  const diffInfo = h('p', { class: 'small', style: 'margin:0' });
  const merchBox = h('div', { class: 'stack', role: 'radiogroup', 'aria-label': 'Mercader' });

  const paint = () => {
    app.lastPick = { ...pick };
    regionBox.replaceChildren(...REGIONS.map((r, i) => {
      const open = p.regions.includes(r.id);
      const on = r.id === pick.region;
      return h('button', {
        class: `region-card${on ? ' chosen' : ''}${open ? '' : ' locked'}`, role: 'radio', 'aria-checked': String(on), 'aria-disabled': String(!open),
        'data-testid': `region-${r.id}`, 'aria-label': open ? r.name : `${r.name} (bloqueada)`,
        onclick: () => { if (open) { pick.region = r.id; paint(); } else app.toast(regionLock(i)); },
      },
      h('span', { class: 'region-art' }, svgNode(regionSvg(r.id)), open ? null : h('span', { class: 'region-lock' }, svgNode(iconSvg('lock')))),
      h('span', { class: 'region-name' }, r.name));
    }));
    const r = REGIONS.find((x) => x.id === pick.region);
    regionInfo.replaceChildren(
      h('span', { class: 'row', style: 'gap:10px;align-items:flex-start' }, goodArt(r.star, 40),
        h('span', {}, r.desc, h('br'), h('span', { class: 'muted' }, `Viajás en ${r.mount.many}: cada uno carga ${r.mount.capacity}.`))));

    diffBox.replaceChildren(...DIFFICULTY_LIST.map((d) => {
      const open = canPlay(p, pick.region, d.id);
      const on = d.id === pick.difficulty;
      return h('button', {
        class: `seg-btn${on ? ' chosen' : ''}${open ? '' : ' locked'}`, role: 'radio', 'aria-checked': String(on), 'aria-disabled': String(!open),
        'data-testid': `difficulty-${d.id}`,
        onclick: () => { if (open) { pick.difficulty = d.id; paint(); } else app.toast('La Pesadilla se abre ganando una temporada en Difícil.'); },
      }, open ? null : svgNode(iconSvg('lock')), h('b', {}, d.name), h('span', { class: 'tiny' }, `×${mult(d.sealMult)} sellos`));
    }));
    const d = DIFFICULTIES[pick.difficulty];
    const regionMult = REGIONS.find((x) => x.id === pick.region).debtMult ?? 1;
    const owed = debtPlan(d.id, { mult: regionMult }).reduce((a, x) => a + x.amount, 0);
    diffInfo.replaceChildren(`${d.desc} Deuda: ${fmt(owed)} de oro en 3 cuotas.`);

    merchBox.replaceChildren(...owned.map((m) => h('button', {
      class: `card merchant${m.id === pick.merchant ? ' chosen' : ''}`, role: 'radio', 'aria-checked': String(m.id === pick.merchant), 'data-testid': `merchant-${m.id}`,
      onclick: () => { pick.merchant = m.id; paint(); },
    }, h('b', {}, m.name), h('span', { class: 'small muted' }, m.desc))));
  };
  paint();

  const ups = Object.entries(p.upgrades);
  return h('div', { class: 'stack' },
    h('h1', {}, 'Nueva temporada'),
    h('section', { class: 'stack', style: 'gap:10px' }, h('h2', {}, 'Región'), regionBox, regionInfo),
    h('section', { class: 'stack', style: 'gap:10px' }, h('h2', {}, 'Dificultad'), diffBox, diffInfo),
    h('section', { class: 'stack', style: 'gap:10px' }, h('h2', {}, 'Mercader'),
      h('p', { class: 'small muted', style: 'margin:0' }, 'Comprá más en el Gremio con tus sellos.'), merchBox),
    ups.length ? h('p', { class: 'small muted', style: 'margin:0' }, `Mejoras activas: ${ups.map(([id, l]) => `${UPGRADES.find((u) => u.id === id).name} ${l}`).join(', ')}.`) : null,
    h('button', { class: 'btn big primary', 'data-testid': 'start-season', onclick: () => app.newSeason({ ...pick }) }, 'Empezar'),
    h('button', { class: 'btn big', onclick: () => app.go('menu') }, 'Volver'));
}
