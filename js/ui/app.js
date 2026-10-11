/**
 * Controlador de la interfaz: guarda la partida, el perfil y los ajustes,
 * decide qué pantalla mostrar y ejecuta las acciones del jugador.
 *
 * Toda acción pasa por `act`: se aplica sobre la simulación, se guarda al
 * instante (se puede cerrar la app en cualquier momento) y se redibuja.
 */

import { mount, toast, closeSheets, h } from './dom.js';
import { renderHud } from './hud.js';
import { renderCity } from './city.js';
import { renderMap } from './map-screen.js';
import { renderCaravan, renderJournal } from './caravan.js';
import { renderSummary } from './summary.js';
import { renderMenu, renderSettings, renderHelp } from './menu.js';
import { createSeason } from '../game/season.js';
import { saveSeason, loadSeason, loadProfile, saveProfile, loadSettings, saveSettings } from '../core/save.js';
import { setInMenu } from '../core/updates.js';
import { setVolumes, unlockAudio } from '../core/audio.js';

/** Pantallas de juego que muestran barra superior y navegación. */
const GAME_SCREENS = ['city', 'map', 'caravan', 'journal'];
const NAV = [['city', 'Ciudad', '⌂'], ['map', 'Mapa', '◈'], ['caravan', 'Caravana', '☰'], ['journal', 'Diario', '✎']];

/**
 * Semilla nueva al azar (o la de la URL: ?semilla=abc, útil para pruebas).
 */
function freshSeed() {
  const fromUrl = new URLSearchParams(location.search).get('semilla');
  if (fromUrl && /^[\w-]{1,32}$/.test(fromUrl)) return fromUrl;
  const bytes = crypto.getRandomValues(new Uint32Array(2));
  return Array.from(bytes, (n) => n.toString(36)).join('').slice(0, 10);
}

/**
 * Crea la app y muestra la primera pantalla.
 * @param {{hud:HTMLElement, screen:HTMLElement, nav:HTMLElement}} els
 */
export function createApp(els) {
  const app = {
    game: loadSeason(),
    profile: loadProfile(),
    settings: loadSettings(),
    screen: 'menu',
    params: {},
    navEnabled: true,
    toast,

    /** Guarda todo lo guardable. */
    saveAll() {
      if (app.game) saveSeason(app.game);
      saveProfile(app.profile);
      saveSettings(app.settings);
    },

    /**
     * Ejecuta una acción de la simulación, avisa si falló, guarda y redibuja.
     * @param {(game:object)=>{ok:boolean,error?:string}} fn
     */
    act(fn) {
      const res = fn(app.game) ?? { ok: true };
      if (!res.ok && res.error) toast(res.error);
      saveSeason(app.game);
      if (app.game.state.over && app.screen !== 'summary' && app.screen !== 'map') app.go('summary');
      else app.render();
      return res;
    },

    /**
     * Cambia de pantalla.
     * @param {string} screen
     * @param {object} [params]
     */
    go(screen, params = {}) {
      closeSheets();
      app.screen = screen;
      app.params = params;
      app.render();
      els.screen.scrollTop = 0;
    },

    /** Empieza una temporada nueva. */
    newSeason() {
      app.game = createSeason({ seed: freshSeed(), difficulty: 'normal' });
      saveSeason(app.game);
      app.go('city');
      toast('¡Arranca la temporada! Mirá el mercado y comprá algo barato.');
    },

    /** Habilita o no la navegación (durante un viaje no se puede cambiar). */
    setNavEnabled(on) {
      app.navEnabled = on;
      for (const b of els.nav.querySelectorAll('button')) b.disabled = !on;
    },

    /** Redibuja la pantalla actual. */
    render() {
      let screen = app.screen;
      if (GAME_SCREENS.includes(screen) && (!app.game || app.game.state.over)) screen = app.game?.state.over ? 'summary' : 'menu';
      app.screen = screen;
      setInMenu(screen === 'menu');
      const inGame = GAME_SCREENS.includes(screen);
      els.hud.hidden = !inGame;
      els.nav.hidden = !inGame;
      els.screen.classList.toggle('full', screen === 'map');
      if (inGame) {
        renderHud(els.hud, app.game);
        mount(els.nav, NAV.map(([id, label, ico]) => h('button', {
          'aria-current': id === screen ? 'page' : null, 'data-testid': `nav-${id}`, disabled: !app.navEnabled,
          onclick: () => app.go(id),
        }, h('span', { class: 'ico', 'aria-hidden': 'true' }, ico), label)));
      }
      const view = {
        menu: () => renderMenu(app),
        settings: () => renderSettings(app),
        help: () => renderHelp(app),
        city: () => renderCity(app, app.params),
        map: () => renderMap(app),
        caravan: () => renderCaravan(app),
        journal: () => renderJournal(app),
        summary: () => renderSummary(app),
      }[screen];
      mount(els.screen, view());
    },
  };

  setVolumes(app.settings);
  document.addEventListener('pointerdown', unlockAudio, { once: true });
  app.render();
  return app;
}
