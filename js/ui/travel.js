/**
 * Pantalla de viaje: la caravana avanza por la ruta sobre el mapa y el
 * cielo pasa del día a la noche. Si algo pasa en el camino, el viaje se
 * frena y aparece la carta del evento. Si se cierra la app a mitad de
 * camino, al volver se sigue desde el mismo punto.
 */

import { h } from './dom.js';
import { createMapView } from '../render/map.js';
import { advance } from '../game/season.js';
import { showEvent } from './event.js';
import { setWind } from '../core/audio.js';
import { moonPhase, moonLight } from '../game/moon.js';

let view = null;

/**
 * Arma la pantalla de viaje y arranca (o retoma) el recorrido.
 * @param {object} app
 */
export function renderTravel(app) {
  view?.destroy();
  const canvas = h('canvas', { 'aria-label': 'La caravana en viaje', role: 'img', 'data-testid': 'travel-canvas' });
  const banner = h('div', { class: 'travel-banner', 'data-testid': 'travel-banner' }, 'En camino…');
  const root = h('div', { style: 'position:absolute;inset:0' }, h('div', { class: 'map-wrap' }, canvas, banner));
  view = createMapView(canvas, { onPick: () => {} });
  const mine = view;
  requestAnimationFrame(() => {
    if (view !== mine) return;
    view.resize();
    step(app, mine, banner);
  });
  return root;
}

/** Posición (0..1) de la caravana sobre la ruta según los días hechos. */
function progress(trip) {
  return trip.days ? trip.done / trip.days : 0;
}

/** Dibuja la caravana en una posición de la ruta, con el cielo del día (o de la noche). */
function drawAt(game, mapView, trip, p, dayFloat) {
  const route = game.map.routeById[trip.routeId];
  // De noche el cielo queda oscuro y se ve la luna de ese día.
  if (trip.night) {
    const moon = moonPhase(game.state, game.state.day);
    mapView.draw(game, { travel: { route, from: trip.from, t: p }, night: 0.6 - 0.1 * moonLight(moon), moon });
    return;
  }
  const night = 0.45 * (1 - Math.cos(dayFloat * Math.PI * 2)) / 2;
  mapView.draw(game, { travel: { route, from: trip.from, t: p }, night });
}

/**
 * Un tramo del viaje: resuelve en la simulación hasta el próximo evento o
 * la llegada, y lo anima. Tocar la pantalla saltea la animación.
 */
function step(app, mapView, banner) {
  const { game } = app;
  const trip = game.state.trip;
  if (!trip) return app.go(game.state.over ? 'summary' : 'city');
  const snapshot = { ...trip };
  const p0 = progress(trip);
  if (trip.event) {
    drawAt(game, mapView, trip, p0, 0);
    banner.textContent = `Día ${game.state.day}: ¡algo pasa en el camino!`;
    return showEvent(app, () => step(app, mapView, banner));
  }
  const startDay = game.state.day;
  const res = app.quiet((g) => advance(g));
  const endDay = game.state.day;
  const after = game.state.trip ?? { ...snapshot, done: snapshot.days };
  const p1 = res.status === 'event' ? progress(after) : 1;
  const days = Math.max(0, endDay - startDay);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const total = Math.max(350, days * (reduce ? 150 : 650));
  const t0 = performance.now();
  let done = false;
  setWind(true);

  const finish = () => {
    if (done) return;
    done = true;
    setWind(false);
    window.removeEventListener('pointerdown', skip);
    if (view !== mapView) return;
    if (res.status === 'event') step(app, mapView, banner);
    else app.go(game.state.over ? 'summary' : 'city', { tab: 'mercado' });
  };
  const skip = (e) => {
    if (e.target.closest?.('.sheet')) return;
    finish();
  };
  window.addEventListener('pointerdown', skip);

  const frame = (now) => {
    if (done) return;
    const t = Math.min(1, (now - t0) / total);
    const dayFloat = t * days;
    banner.textContent = `${snapshot.night ? 'Marcha nocturna' : 'En camino'}… día ${Math.min(endDay, startDay + Math.floor(dayFloat))}`;
    drawAt(game, mapView, snapshot, p0 + (p1 - p0) * t, dayFloat);
    if (t < 1) requestAnimationFrame(frame);
    else setTimeout(finish, 200);
  };
  requestAnimationFrame(frame);
}
