// Testes da leitura de números e das datas. Para rodar: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lerNumero, numero, dataBR, hojeISO, dinheiro, esc } from './formatos.js';

test('números inteiros e com ponto de milhar', () => {
  assert.equal(lerNumero('12450'), 12450);
  assert.equal(lerNumero('12.450'), 12450); // antes virava 12,45
  assert.equal(lerNumero('1.234.567'), 1234567);
  assert.equal(lerNumero('7.000'), 7000);
  assert.equal(lerNumero('81.000'), 81000);
});

test('decimais com vírgula ou ponto', () => {
  assert.equal(lerNumero('6,5'), 6.5);
  assert.equal(lerNumero('6.5'), 6.5);
  assert.equal(lerNumero('6.50'), 6.5);
  assert.equal(lerNumero('0,173'), 0.173);
  assert.equal(lerNumero('0.173'), 0.173);
  assert.equal(lerNumero('6,199'), 6.199);
});

test('milhar e decimal juntos, no padrão brasileiro ou americano', () => {
  assert.equal(lerNumero('1.234,56'), 1234.56);
  assert.equal(lerNumero('12.450,5'), 12450.5);
  assert.equal(lerNumero('1,234.56'), 1234.56);
});

test('espaços e R$ são ignorados', () => {
  assert.equal(lerNumero('  8  '), 8);
  assert.equal(lerNumero('R$ 12,50'), 12.5);
  assert.equal(lerNumero('R$1.200'), 1200);
});

test('vazio, texto e negativo viram null', () => {
  assert.equal(lerNumero(''), null);
  assert.equal(lerNumero(undefined), null);
  assert.equal(lerNumero(null), null);
  assert.equal(lerNumero('abc'), null);
  assert.equal(lerNumero('12abc'), null);
  assert.equal(lerNumero('-5'), null);
  assert.equal(lerNumero('1,2,3'), null);
});

test('numero() devolve 0 quando não dá para ler', () => {
  assert.equal(numero('x'), 0);
  assert.equal(numero('3,5'), 3.5);
});

test('data em formato brasileiro e data de hoje no formato do campo', () => {
  assert.equal(dataBR('2026-10-08'), '08/10/2026');
  assert.match(hojeISO(), /^\d{4}-\d{2}-\d{2}$/);
});

test('dinheiro e proteção do HTML', () => {
  assert.equal(dinheiro(1234.5).replace(/\s/g, ' '), 'R$ 1.234,50');
  assert.equal(dinheiro(undefined).replace(/\s/g, ' '), 'R$ 0,00');
  assert.equal(esc('<b a="1">&\'</b>'), '&lt;b a=&quot;1&quot;&gt;&amp;&#39;&lt;/b&gt;');
});
