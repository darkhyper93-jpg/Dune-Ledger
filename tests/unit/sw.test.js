/** Pruebas del service worker generado (scripts/gen-sw.js). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { listSiteFiles, buildServiceWorker } from '../../scripts/gen-sw.js';

const root = new URL('../..', import.meta.url).pathname;

test('la lista incluye todo el juego y sólo archivos que existen', () => {
  const files = listSiteFiles(root);
  for (const f of ['index.html', 'manifest.webmanifest', 'css/main.css', 'js/main.js', 'js/game/season.js', 'fonts/rubik-latin-400-normal.woff2', 'icons/icon-192.png']) {
    assert.ok(files.includes(f), `falta ${f}`);
  }
  assert.ok(!files.some((f) => f.startsWith('tests/') || f.startsWith('node_modules/')));
  for (const f of files) assert.ok(existsSync(join(root, f)), f);
});

test('la versión cambia sola cuando cambia el contenido', () => {
  const dir = mkdtempSync(join(tmpdir(), 'dl-sw-'));
  mkdirSync(join(dir, 'js'));
  writeFileSync(join(dir, 'index.html'), '<p>hola</p>');
  writeFileSync(join(dir, 'js', 'a.js'), 'export const a = 1;');
  const v1 = buildServiceWorker(dir).version;
  assert.equal(buildServiceWorker(dir).version, v1);
  writeFileSync(join(dir, 'js', 'a.js'), 'export const a = 2;');
  const sw = buildServiceWorker(dir);
  assert.notEqual(sw.version, v1);
  assert.ok(sw.source.includes(`'${sw.version}'`));
  assert.ok(sw.source.includes("cache: 'reload'"));
  assert.ok(sw.source.includes('"js/a.js"'));
});
