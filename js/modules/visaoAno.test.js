// Testes simples da tela do ano (só confere o HTML montado). Para rodar: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { htmlAno } from './visaoAno.js';
import { resumoDoAno } from './ano.js';

const dia = (data, faturamento, lucro) => ({
  data,
  plataformas: [],
  calculados: { faturamento, lucro, km: 100, combustivel: 10, manutencao: 0, despesas: 0, fixos: 0, gastos: faturamento - lucro, guardar: 0, corridas: 0 },
});

test('ano com dias mostra meses, MEI e botão da planilha', () => {
  const html = htmlAno({ ano: '2026', resumo: resumoDoAno([dia('2026-01-10', 200, 100), dia('2026-03-05', 400, 80)], '2026'), limite: 81000, anoAtual: '2026' });
  assert.match(html, /Janeiro/);
  assert.match(html, /Março/);
  assert.match(html, /Limite do MEI em 2026/);
  assert.match(html, /data-acao="csvAno"/);
  assert.match(html, /data-ano="proximo" disabled/);
});

test('ano sem dias explica e não oferece planilha; ano passado libera "Próximo"', () => {
  const html = htmlAno({ ano: '2025', resumo: resumoDoAno([], '2025'), limite: 81000, anoAtual: '2026' });
  assert.match(html, /Nenhum dia fechado neste ano/);
  assert.doesNotMatch(html, /csvAno/);
  assert.doesNotMatch(html, /data-ano="proximo" disabled/);
});
