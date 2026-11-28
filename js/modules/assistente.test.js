import { test } from 'node:test';
import assert from 'node:assert/strict';
import { exemploDoDia } from './assistenteContas.js';

const config = {
  meta: 200,
  kmPorLitro: 35,
  precoLitro: 7,
  diasPorMes: 24,
  manutencao: [{ item: 'Óleo e filtro', preco: 50, duracaoKm: 1000 }, { item: 'Freios', preco: 100, duracaoKm: 10000 }],
  fixos: [{ item: 'DAS-MEI', valorMensal: 72 }],
};

test('dia de exemplo usa os ajustes da pessoa: combustível, moto e custos fixos', () => {
  const e = exemploDoDia(config, 300, 100);
  assert.equal(Math.round(e.combustivel * 100) / 100, 20); // 100 km ÷ 35 × 7
  assert.equal(Math.round(e.manutencao * 100) / 100, 6); // 0,05 + 0,01 por km × 100
  assert.equal(e.fixos, 3); // 72 ÷ 24
  assert.equal(Math.round(e.jaSaiu * 100) / 100, 20);
  assert.equal(Math.round(e.separar * 100) / 100, 9);
  assert.equal(Math.round(e.lucro * 100) / 100, 271);
  assert.equal(e.bateuMeta, true);
});

test('dia de exemplo abaixo da meta', () => {
  assert.equal(exemploDoDia(config, 100, 100).bateuMeta, false);
});
