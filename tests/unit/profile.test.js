/** Pruebas del perfil permanente y del código de progreso. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultProfile, validateProfile, encodeProgress, decodeProgress, buyMerchant, buyUpgrade, canBuyMerchant } from '../../js/game/profile.js';
import { MERCHANTS } from '../../js/data/merchants.js';
import { UPGRADES } from '../../js/data/upgrades.js';

test('un perfil nuevo tiene sólo al Aprendiz y nada más', () => {
  const p = defaultProfile();
  assert.deepEqual(p.merchants, ['aprendiz']);
  assert.equal(p.seals, 0);
  assert.deepEqual(p.upgrades, {});
  assert.deepEqual(p.achievements, {});
  assert.deepEqual(validateProfile(p), p);
});

test('la validación descarta datos raros sin perder lo bueno', () => {
  const p = defaultProfile();
  p.seals = 50;
  p.upgrades = { oro: 2, inventada: 3 };
  p.merchants = ['aprendiz', 'nomada', 'dragon'];
  p.achievements = { primera: true, falso: true };
  const v = validateProfile(p);
  assert.equal(v.seals, 50);
  assert.deepEqual(v.upgrades, { oro: 2 });
  assert.deepEqual(v.merchants, ['aprendiz', 'nomada']);
  assert.deepEqual(v.achievements, { primera: true });
  assert.equal(validateProfile({ ...p, upgrades: { oro: 99 } }).upgrades.oro, UPGRADES.find((u) => u.id === 'oro').costs.length);
  assert.deepEqual(validateProfile('nada'), defaultProfile());
});

test('comprar un mercader cuesta sellos y algunos piden un logro', () => {
  const p = { ...defaultProfile(), seals: 500 };
  assert.ok(buyMerchant(p, 'nomada').ok);
  assert.equal(p.seals, 440);
  assert.ok(p.merchants.includes('nomada'));
  assert.equal(buyMerchant(p, 'nomada').ok, false, 'ya lo tenés');
  const smuggler = MERCHANTS.find((m) => m.id === 'contrabandista');
  assert.equal(canBuyMerchant(p, smuggler).ok, false);
  p.achievements[smuggler.requires] = true;
  assert.ok(buyMerchant(p, 'contrabandista').ok);
  const poor = defaultProfile();
  assert.equal(buyMerchant(poor, 'banquera').ok, false);
});

test('comprar mejoras sube de nivel hasta el tope', () => {
  const p = { ...defaultProfile(), seals: 1000 };
  const up = UPGRADES.find((u) => u.id === 'camello');
  assert.ok(buyUpgrade(p, 'camello').ok);
  assert.equal(p.upgrades.camello, 1);
  assert.equal(p.seals, 1000 - up.costs[0]);
  assert.ok(buyUpgrade(p, 'camello').ok);
  assert.equal(buyUpgrade(p, 'camello').ok, false, 'nivel máximo');
});

test('el código de progreso va y vuelve igual', () => {
  const p = { ...defaultProfile(), seals: 77, seasons: 5, wins: 2, totalSeals: 120, merchants: ['aprendiz', 'banquera'], upgrades: { oro: 3 }, achievements: { primera: true } };
  p.codex.goods.te = true;
  const code = encodeProgress(p);
  assert.match(code, /^DL1-[A-Za-z0-9_-]+-[0-9a-z]+$/);
  assert.deepEqual(decodeProgress(code).profile, validateProfile(p));
});

test('un código tocado a mano se rechaza', () => {
  const code = encodeProgress({ ...defaultProfile(), seals: 10 });
  const [pre, body, sum] = code.split('-');
  const forged = JSON.parse(atob(body.replace(/-/g, '+').replace(/_/g, '/')));
  forged.seals = 99999;
  const fakeBody = btoa(JSON.stringify(forged)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  assert.equal(decodeProgress(`${pre}-${fakeBody}-${sum}`).ok, false);
  assert.equal(decodeProgress('cualquier cosa').ok, false);
  assert.equal(decodeProgress(`${pre}-${body}-zzzz`).ok, false);
});

test('un código con __proto__ se rechaza', () => {
  const evil = '{"__proto__":{"seals":5},"seals":1}';
  const body = btoa(evil).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  assert.equal(decodeProgress(`DL1-${body}-0`).ok, false);
});
