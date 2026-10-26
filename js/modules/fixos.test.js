// Testes do acerto dos custos fixos. Para rodar: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { totalFixos, acertoDosFixos } from './fixos.js';

test('total dos custos fixos mensais', () => {
  assert.equal(totalFixos([]), 0);
  assert.equal(Math.round(totalFixos([{ valorMensal: 110 }, { valorMensal: 86.05 }]) * 100) / 100, 196.05);
  assert.equal(totalFixos([{ valorMensal: 'x' }, { valorMensal: 10 }]), 10);
});

test('mês terminado com menos dias que o previsto: ficou custo fixo sem descontar', () => {
  // devido R$ 196,05; 20 dias × (196,05 ÷ 26) = R$ 150,81
  const a = acertoDosFixos({ devido: 196.05, descontado: 150.81, terminou: true });
  assert.equal(a.situacao, 'falta');
  assert.equal(a.diferenca, 45.24);
});

test('mês terminado com mais dias que o previsto: descontou a mais', () => {
  const a = acertoDosFixos({ devido: 196.05, descontado: 220, terminou: true });
  assert.equal(a.situacao, 'sobra');
  assert.equal(a.diferenca, -23.95);
});

test('mês terminado com a conta fechando (diferença de arredondamento): ok', () => {
  assert.equal(acertoDosFixos({ devido: 196.05, descontado: 196.0, terminou: true }).situacao, 'ok');
  assert.equal(acertoDosFixos({ devido: 196.05, descontado: 196.9, terminou: true }).situacao, 'ok');
});

test('mês em andamento nunca acusa falta', () => {
  const a = acertoDosFixos({ devido: 196.05, descontado: 50, terminou: false });
  assert.equal(a.situacao, 'andamento');
  assert.equal(a.diferenca, 146.05);
});
