/**
 * Genera el service worker con la lista de archivos del sitio y una versión
 * que cambia sola cuando cambia cualquier archivo (hash del contenido).
 *
 * Uso directo: node scripts/gen-sw.js [carpeta]   (por defecto, _site)
 * Lo usa scripts/build-site.js.
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Carpetas y archivos que forman el sitio publicado. */
export const SITE_ENTRIES = ['index.html', 'manifest.webmanifest', 'css', 'js', 'fonts', 'icons'];

/** Extensiones que se guardan para jugar sin conexión (las licencias no hacen falta). */
const CACHEABLE = /\.(html|webmanifest|css|js|woff2|png|svg)$/;

/**
 * Lista los archivos del sitio (rutas relativas con "/"), ordenados.
 * @param {string} root carpeta del sitio
 * @returns {string[]}
 */
export function listSiteFiles(root) {
  const out = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (CACHEABLE.test(name)) out.push(relative(root, full).split(sep).join('/'));
    }
  };
  for (const entry of SITE_ENTRIES) {
    const full = join(root, entry);
    if (statSync(full, { throwIfNoEntry: false })?.isDirectory()) walk(full);
    else if (statSync(full, { throwIfNoEntry: false })) out.push(entry);
  }
  return out.filter((f) => f !== 'sw.js').sort();
}

/**
 * Hash corto del contenido de todos los archivos: es la versión del caché.
 * @param {string} root
 * @param {string[]} files
 */
export function contentVersion(root, files) {
  const hash = createHash('sha256');
  for (const f of files) {
    hash.update(f);
    hash.update(readFileSync(join(root, f)));
  }
  return hash.digest('hex').slice(0, 12);
}

/**
 * Arma el código del service worker.
 * @param {string} root
 * @returns {{source:string, version:string, files:string[]}}
 */
export function buildServiceWorker(root) {
  const files = listSiteFiles(root);
  const version = contentVersion(root, files);
  const list = JSON.stringify(['./', ...files], null, 2);
  const source = `/* Service worker de Dune Ledger: generado por scripts/gen-sw.js, no editar a mano. */
const VERSION = '${version}';
const CACHE = 'dune-ledger-' + VERSION;
const FILES = ${list};

// Instala la versión nueva descargando todo fresco (sin el caché HTTP).
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.all(FILES.map(async (file) => {
      const res = await fetch(file, { cache: 'reload' });
      if (!res.ok) throw new Error('No se pudo bajar ' + file);
      await cache.put(file, res);
    }));
  })());
});

// Borra los cachés de versiones viejas y toma el control.
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith('dune-ledger-') && key !== CACHE) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});

// La app pide activarse cuando el jugador está en el menú.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

// Primero el caché; si no está, la red; las páginas caen en index.html.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(req, { ignoreSearch: true });
    if (hit) return hit;
    try {
      return await fetch(req);
    } catch (err) {
      if (req.mode === 'navigate') return (await cache.match('index.html')) || Response.error();
      throw err;
    }
  })());
});
`;
  return { source, version, files };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = process.argv[2] ?? '_site';
  const { source, version, files } = buildServiceWorker(root);
  writeFileSync(join(root, 'sw.js'), source);
  console.log(`sw.js generado: versión ${version}, ${files.length} archivos.`);
}
