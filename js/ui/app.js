/**
 * Controlador de la interfaz: guarda la partida, el perfil y los ajustes,
 * decide qué pantalla mostrar y ejecuta las acciones del jugador.
 *
 * Toda acción pasa por `act`: se aplica sobre la simulación, se guarda al
 * instante (se puede cerrar la app en cualquier momento) y se redibuja.
 */

import { mount, toast, closeSheets, h, openSheet } from './dom.js';
import { renderHud } from './hud.js';
import { renderCity } from './city.js';
import { renderMap } from './map-screen.js';
import { renderTravel } from './travel.js';
import { renderCaravan, renderJournal } from './caravan.js';
import { renderSummary } from './summary.js';
import { renderMenu, renderSettings, renderHelp } from './menu.js';
import { renderShop, renderRecords } from './progress.js';
import { renderChoose } from './choose.js';
import { mergeSeen } from '../game/profile.js';
import { iconSvg } from '../render/ui-icons.js';
import { svgNode } from '../render/shapes.js';
import { createSeason } from '../game/season.js';
import { createDaily } from '../game/daily.js';
import { saveSeason, loadSeason, loadProfile, saveProfile, loadSettings, saveSettings } from '../core/save.js';
import { setInMenu } from '../core/updates.js';
import { setVolumes, unlockAudio } from '../core/audio.js';

/** Pantallas de juego que muestran barra superior y navegación. */
const GAME_SCREENS = ['city', 'map', 'caravan', 'journal', 'travel'];
const NAV = [['city', 'Ciudad', 'city'], ['map', 'Mapa', 'map'], ['caravan', 'Caravana', 'camel'], ['journal', 'Diario', 'journal']];

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
    toast,

    /** Guarda la temporada y pasa al códice lo que se vio. */
    saveGame() {
      saveSeason(app.game);
      mergeSeen(app.profile, app.game.state.seen);
      saveProfile(app.profile);
    },

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
      app.saveGame();
      if (app.game.state.over && app.screen !== 'summary') app.go('summary');
      else app.render();
      return res;
    },

    /**
     * Como `act`, pero sin redibujar la pantalla (sólo la barra de arriba):
     * lo usan el viaje y los eventos, que manejan su propia animación.
     * @param {(game:object)=>object} fn
     */
    quiet(fn) {
      const res = fn(app.game) ?? { ok: true };
      if (res.ok === false && res.error) toast(res.error);
      app.saveGame();
      if (!els.hud.hidden) renderHud(els.hud, app.game);
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

    /**
     * Empieza una temporada nueva con lo elegido y las mejoras del perfil.
     * @param {{region?:string, difficulty?:string, merchant?:string}} [pick]
     */
    newSeason({ region = 'desierto', difficulty = 'normal', merchant = 'aprendiz' } = {}) {
      app.start(createSeason({ seed: freshSeed(), region, difficulty, merchant, upgrades: app.profile.upgrades }), '¡Arranca la temporada! Mirá el mercado y comprá algo barato.');
    },

    /**
     * Empieza el desafío de una fecha (mismo mapa para todos).
     * @param {string} date AAAA-MM-DD
     */
    newDaily(date) {
      app.start(createDaily(date), '¡Desafío del día! Todos juegan este mismo mapa.');
    },

    /** Empieza el modo libre: sin deuda ni límite de días. */
    newFree() {
      app.start(createSeason({ seed: freshSeed(), mode: 'libre' }), 'Modo libre: sin deuda ni apuro. Explorá y aprendé los precios.');
    },

    /**
     * Pone en juego una partida nueva, la guarda y va a la ciudad.
     * @param {object} game
     * @param {string} message
     */
    start(game, message) {
      app.game = game;
      saveSeason(app.game);
      app.go('city');
      toast(message);
    },

    /**
     * Si hay una partida empezada, pregunta antes de reemplazarla.
     * @param {() => void} then
     */
    confirmReplace(then) {
      if (!app.game || app.game.state.over) return then();
      openSheet((close) => h('div', { class: 'stack' },
        h('h2', {}, '¿Empezar de nuevo?'),
        h('p', { class: 'muted' }, 'Vas a perder la partida que tenés empezada.'),
        h('div', { class: 'btn-row' }, h('button', { class: 'btn', onclick: close }, 'No'),
          h('button', { class: 'btn primary', 'data-testid': 'confirm-new', onclick: () => { close(); then(); } }, 'Sí, nueva'))), { label: 'Empezar de nuevo' });
    },

    /** Redibuja la pantalla actual. */
    render() {
      let screen = app.screen;
      if (GAME_SCREENS.includes(screen) && (!app.game || app.game.state.over)) screen = app.game?.state.over ? 'summary' : 'menu';
      // Con un viaje en curso, cualquier pantalla de juego vuelve al viaje.
      if (app.game?.state.trip && !app.game.state.over && GAME_SCREENS.includes(screen)) screen = 'travel';
      app.screen = screen;
      setInMenu(screen === 'menu');
      const inGame = GAME_SCREENS.includes(screen);
      els.hud.hidden = !inGame;
      els.nav.hidden = !inGame || screen === 'travel';
      els.screen.classList.toggle('full', screen === 'map' || screen === 'travel');
      if (inGame) {
        renderHud(els.hud, app.game);
        mount(els.nav, NAV.map(([id, label, ico]) => h('button', {
          'aria-current': id === screen ? 'page' : null, 'data-testid': `nav-${id}`,
          onclick: () => app.go(id),
        }, svgNode(iconSvg(ico)), label)));
      }
      const view = {
        menu: () => renderMenu(app),
        settings: () => renderSettings(app),
        help: () => renderHelp(app),
        choose: () => renderChoose(app),
        shop: () => renderShop(app),
        records: () => renderRecords(app),
        city: () => renderCity(app, app.params),
        map: () => renderMap(app),
        travel: () => renderTravel(app),
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
