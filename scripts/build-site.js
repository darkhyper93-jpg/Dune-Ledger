/**
 * Arma el sitio publicable en _site/: copia los archivos del juego y genera
 * el service worker con la lista de archivos y su versión.
 * Uso: npm run build
 */
import { cpSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { SITE_ENTRIES, buildServiceWorker } from './gen-sw.js';

const root = new URL('..', import.meta.url).pathname;
const out = join(root, '_site');

rmSync(out, { recursive: true, force: true });
mkdirSync(out);
for (const entry of SITE_ENTRIES) cpSync(join(root, entry), join(out, entry), { recursive: true });
writeFileSync(join(out, '.nojekyll'), '');
const { source, version, files } = buildServiceWorker(out);
writeFileSync(join(out, 'sw.js'), source);
console.log(`Sitio listo en _site/ (versión ${version}, ${files.length} archivos).`);
