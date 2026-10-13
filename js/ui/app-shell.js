/**
 * Lo que rodea al juego como app del celular: el cartel de "hay una versión
 * nueva" (con su botón para actualizar ya), el "¡Listo!" después de
 * actualizar, y la hoja que explica cómo instalarlo.
 */

import { h, openSheet } from './dom.js';
import { onUpdateReady, applyUpdate, consumeUpdated } from '../core/updates.js';
import { canPromptInstall, promptInstall, isIOS, isInstalled } from '../core/install.js';
import { VERSION } from '../core/version.js';

/**
 * Prepara el cartel de actualización y el aviso de "¡Listo!".
 * @param {object} app
 */
export function setupAppShell(app) {
  if (consumeUpdated()) app.toast(`¡Listo! Ya tenés la última versión del juego (${VERSION}).`);
  let banner = null;
  onUpdateReady((ready) => {
    banner?.remove();
    banner = null;
    if (!ready) return;
    banner = h('div', { class: 'update-banner', role: 'alert', 'data-testid': 'update-banner' },
      h('p', {}, h('b', {}, 'Hay una versión nueva del juego.'), ' Tu partida ya está guardada: se actualiza en un momento.'),
      h('div', { class: 'btn-row' },
        h('button', { class: 'btn small primary', 'data-testid': 'update-now', onclick: (e) => {
          e.currentTarget.disabled = true;
          e.currentTarget.textContent = 'Actualizando…';
          app.saveAll();
          applyUpdate();
        } }, 'Actualizar ahora'),
        h('button', { class: 'btn small', 'data-testid': 'update-later', onclick: () => { banner?.remove(); banner = null; } }, 'Después')));
    document.body.append(banner);
  });
}

/**
 * Hoja "Instalar en el celular": el botón del navegador si se puede, y los
 * pasos para iPhone y Android si no.
 * @param {object} app
 */
export function openInstallSheet(app) {
  openSheet((close) => {
    const ios = isIOS();
    const steps = ios
      ? ['Abrí el juego en Safari.', 'Tocá el botón Compartir (el cuadrado con la flecha hacia arriba).', 'Elegí "Agregar a inicio" y después "Agregar".']
      : ['Abrí el menú del navegador (los tres puntitos).', 'Elegí "Instalar app" o "Agregar a la pantalla de inicio".', 'Confirmá: el juego aparece con su ícono, como cualquier app.'];
    return h('div', { class: 'stack', 'data-testid': 'install-sheet' },
      h('h2', {}, 'Instalar en el celular'),
      h('p', { style: 'margin:0' }, 'Instalado, el juego abre a pantalla completa, funciona sin internet y se actualiza solo.'),
      canPromptInstall() ? h('button', { class: 'btn big primary', 'data-testid': 'install-now', onclick: async () => {
        const ok = await promptInstall();
        close();
        if (ok) app.toast('¡Instalado! Ya lo tenés en la pantalla de inicio.');
      } }, 'Instalar ahora') : null,
      h('p', { style: 'margin:0' }, h('b', {}, canPromptInstall() ? 'O a mano:' : ios ? 'En iPhone:' : 'En Android:')),
      h('ol', { class: 'install-steps' }, steps.map((s) => h('li', {}, s))),
      h('button', { class: 'btn', onclick: close }, 'Cerrar'));
  }, { label: 'Instalar en el celular' });
}

/** Dice si conviene ofrecer instalar (no si ya se abrió como app). */
export function offerInstall() {
  return !isInstalled();
}
