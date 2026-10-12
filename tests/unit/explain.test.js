/** Pruebas de "¿Por qué ganaste/perdiste?": razones concretas para conversar. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { explainSeason } from '../../js/game/explain.js';
import { finishSeason } from '../../js/game/season.js';
import { testGame } from './helpers.js';

/** Temporada terminada con algunos datos puestos a mano. */
function ended({ won = false, interest = 0, shortage = 0, worst = null, strikes = 0, renegotiated = 0 } = {}) {
  const g = testGame({ gold: won ? 5000 : 0 });
  if (won) g.state.debt.installments.forEach((i) => { i.paid = i.amount; });
  g.state.stats.ledger.flows.intereses = -interest;
  g.state.stats.shortageDays = shortage;
  g.state.debt.strikes = strikes;
  g.state.debt.renegotiations = renegotiated;
  if (worst) g.state.stats.ledger.goods[worst] = { bq: 5, bt: 200, sq: 5, st: 120, p: -80 };
  finishSeason(g, won ? 'retiro' : 'fin');
  return g;
}

test('dice si ganaste o perdiste y por qué, con números', () => {
  const lost = explainSeason(ended({ interest: 150, shortage: 3, worst: 'seda', strikes: 1 }).state);
  assert.match(lost.title, /perdiste/i);
  const text = lost.reasons.join(' ');
  assert.match(text, /150 de intereses/);
  assert.match(text, /3 días sin provisiones/);
  assert.match(text, /Seda/);
  assert.match(text, /falta/);
  const won = explainSeason(ended({ won: true }).state);
  assert.match(won.title, /ganaste/i);
});

test('sin nada que contar no inventa razones', () => {
  const r = explainSeason(ended({ won: true }).state);
  assert.ok(r.reasons.every((x) => !/intereses|sin provisiones|falta/.test(x)));
});

test('siempre trae preguntas para conversar', () => {
  const r = explainSeason(ended().state);
  assert.ok(r.questions.length >= 2);
  assert.ok(r.questions.every((q) => q.endsWith('?')));
});
