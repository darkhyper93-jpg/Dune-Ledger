/**
 * Punto de entrada de Dune Ledger en el navegador: arma la app y registra
 * el service worker para jugar sin conexión.
 */

import { createApp } from './ui/app.js';
import { registerUpdates } from './core/updates.js';
import { listenInstall } from './core/install.js';
import { setupAppShell } from './ui/app-shell.js';

// El navegador avisa una sola vez que se puede instalar: escuchar ya.
listenInstall();

const app = createApp({
  hud: document.getElementById('hud'),
  screen: document.getElementById('screen'),
  nav: document.getElementById('nav'),
});

// Acceso para las pruebas de navegador (no se usa en el juego).
globalThis.__duneLedger = app;

setupAppShell(app);
registerUpdates();
