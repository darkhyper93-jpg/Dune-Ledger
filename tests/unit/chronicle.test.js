/** Pruebas de las crónicas: una historia de tres capítulos por región. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHRONICLES, CHAPTERS } from '../../js/data/chronicles.js';
import { REGIONS } from '../../js/data/regions.js';
import { CITY_TYPES_BY_ID } from '../../js/data/cities.js';
import { isGoodId } from '../../js/data/goods.js';
import { createSeason, finishSeason } from '../../js/game/season.js';
import { chapterNow, chronicleArrive, chronicleCheck, chronicleAct } from '../../js/game/chronicle.js';
import { quote } from '../../js/game/market.js';
import { validateState } from '../../js/game/validate.js';
import { defaultProfile, recordSeason } from '../../js/game/profile.js';

/** Pone la caravana en una ciudad del tipo pedido. */
function goTo(g, type) {
  const c = g.map.cities.find((x) => x.type === type);
  g.state.location = c.id;
  g.state.visited[c.id] = true;
  g.state.known[c.id] = true;
  return c;
}

test('cada región tiene su crónica de 3 capítulos bien armada', () => {
  for (const r of REGIONS) {
    const ch = CHRONICLES[r.id];
    assert.ok(ch && ch.title, r.id);
    assert.equal(ch.chapters.length, CHAPTERS);
    for (const c of ch.chapters) {
      assert.ok(c.text.length > 30 && c.done.length > 10, r.id);
      assert.ok(CITY_TYPES_BY_ID[c.goal.cityType], `${r.id}: ${c.goal.cityType}`);
      if (c.goal.type === 'deliver') assert.ok(isGoodId(c.goal.good) && c.goal.qty > 0);
      if (c.goal.type === 'pay') assert.ok(c.goal.gold > 0);
    }
  }
});

test('la crónica del desierto se completa entera y da sus recompensas', () => {
  const g = createSeason({ seed: 'rashid', events: false });
  assert.equal(chapterNow(g.state).index, 0);
  goTo(g, 'oasis');
  const gold = g.state.gold;
  chronicleArrive(g);
  assert.equal(g.state.gold, gold + 30);
  assert.equal(chapterNow(g.state).index, 1);
  // Entregar especias en una aldea: sin especias no se puede.
  goTo(g, 'aldea');
  assert.equal(chronicleCheck(g).ok, false);
  g.state.cargo.especias = 5;
  assert.equal(chronicleCheck(g).ok, true);
  assert.ok(chronicleAct(g).ok);
  assert.equal(g.state.cargo.especias, 2);
  // Pagar en la Capital: después se ve todo el mapa.
  goTo(g, 'capital');
  g.state.gold = 400;
  assert.ok(chronicleAct(g).ok);
  assert.equal(g.state.gold, 400 - 150 + 120);
  assert.ok(g.map.cities.every((c) => g.state.known[c.id]));
  assert.equal(chapterNow(g.state), null);
  assert.equal(g.state.chronicle.step, CHAPTERS);
});

test('el potro blanco suma un caballo y el anillo del visir quita el impuesto', () => {
  const e = createSeason({ seed: 'potro', region: 'estepa', events: false });
  e.state.chronicle.step = 2;
  goTo(e, 'capital');
  const camels = e.state.camels;
  chronicleArrive(e);
  assert.equal(e.state.camels, camels + 1);
  assert.equal(e.state.camelHp.length, camels + 1);

  const s = createSeason({ seed: 'anillo', region: 'sultan', events: false });
  const city = goTo(s, 'capital');
  const taxed = quote(s, city.id, 'te', 10, 'sell').total;
  s.state.chronicle.step = 2;
  s.state.cargo.incienso = 3;
  assert.ok(chronicleAct(s).ok);
  assert.ok(quote(s, city.id, 'te', 10, 'sell').total > taxed);
});

test('la crónica se guarda, y al terminarla el perfil la recuerda', () => {
  const g = createSeason({ seed: 'guardar', events: false });
  g.state.chronicle.step = 1;
  const res = validateState(JSON.parse(JSON.stringify(g.state)));
  assert.ok(res.ok, res.error);
  assert.deepEqual(res.game.state.chronicle, g.state.chronicle);
  g.state.chronicle.step = CHAPTERS;
  finishSeason(g, 'fin');
  const p = defaultProfile();
  recordSeason(p, g);
  assert.deepEqual(p.chronicles, ['desierto']);
});
