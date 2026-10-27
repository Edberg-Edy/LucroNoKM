// Testes do resumo do ano. Para rodar: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resumoDoAno } from './ano.js';

const dia = (data, faturamento, lucro, km = 100) => ({
  data,
  plataformas: [],
  calculados: { faturamento, lucro, km, combustivel: 10, manutencao: 0, despesas: 0, fixos: 0, gastos: faturamento - lucro, guardar: 0, corridas: 0 },
});

const dias = [dia('2026-01-10', 200, 100), dia('2026-01-11', 300, 150), dia('2026-03-05', 400, 80), dia('2025-12-31', 999, 999), dia('2027-01-01', 999, 999)];

test('traz os 12 meses do ano e ignora outros anos', () => {
  const r = resumoDoAno(dias, '2026');
  assert.equal(r.meses.length, 12);
  assert.equal(r.meses[0].ym, '2026-01');
  assert.equal(r.meses[11].ym, '2026-12');
  assert.equal(r.meses[0].faturamento, 500);
  assert.equal(r.meses[0].diasTrabalhados, 2);
  assert.equal(r.meses[1].faturamento, 0); // fevereiro sem dias
});

test('totais do ano e médias contam só os meses trabalhados', () => {
  const t = resumoDoAno(dias, '2026').totais;
  assert.equal(t.faturamento, 900);
  assert.equal(t.lucro, 330);
  assert.equal(t.diasTrabalhados, 3);
  assert.equal(t.mesesTrabalhados, 2);
  assert.equal(t.lucroMedioPorMes, 165);
  assert.equal(t.lucroMedioPorDia, 110);
});

test('melhor e pior mês', () => {
  const r = resumoDoAno(dias, '2026');
  assert.equal(r.melhorMes.ym, '2026-01'); // lucro 250
  assert.equal(r.piorMes.ym, '2026-03'); // lucro 80
});

test('ano sem dias: tudo zerado e sem melhor/pior mês', () => {
  const r = resumoDoAno([], '2026');
  assert.equal(r.totais.lucro, 0);
  assert.equal(r.totais.lucroMedioPorMes, null);
  assert.equal(r.totais.lucroMedioPorDia, null);
  assert.equal(r.melhorMes, null);
  assert.equal(r.piorMes, null);
});
