// Teste de fumaça da tela do mês: monta o HTML com dados de exemplo e confere os blocos novos. Para rodar: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { htmlMes, htmlCombustivelSemana } from './visaoMes.js';
import { resumoDoMes } from './mes.js';
import { painelDoMes, combustivelDoPeriodo } from './combustivel.js';
import { acertoDosFixos, totalFixos } from './fixos.js';

const dia = (data, lucro, fixos, combustivel) => ({
  data,
  calculados: { faturamento: 300, combustivel, manutencao: 17, despesas: 0, fixos, gastos: 100, lucro, guardar: 24, km: 100, corridas: 0, ganhoPorKm: 3 },
  plataformas: [],
});
const dias = [dia('2026-09-01', 150, 7.5, 24), dia('2026-09-02', 150, 7.5, 24)];
const ab = (id, data, odometro, litros, valor) => ({ id, data, odometro, litros, valor, cheio: true });

function montar({ abastecimentos, terminou = true, fixosCfg = [{ valorMensal: 110 }, { valorMensal: 86.05 }] }) {
  const resumo = resumoDoMes(dias, '2026-09');
  return htmlMes({
    ym: '2026-09',
    resumo,
    anterior: resumoDoMes(dias, '2026-08'),
    info: undefined,
    terminou,
    atual: '2026-10',
    progresso: null,
    combustivel: painelDoMes(abastecimentos, '2026-09', { estimado: resumo.totais.combustivel, kmPorLitroAjuste: 25 }),
    fixos: acertoDosFixos({ devido: totalFixos(fixosCfg), descontado: resumo.totais.fixos, terminou }),
  });
}

test('mês com abastecimentos mostra o gasto real contra o estimado e o consumo medido', () => {
  const html = montar({ abastecimentos: [ab('a', '2026-08-31', 1000, 10, 60), ab('b', '2026-09-02', 1130, 5.6, 33.6)] });
  assert.match(html, /Combustível/);
  assert.match(html, /Pago nos abastecimentos/);
  assert.match(html, /R\$\s33,60/);
  assert.match(html, /Estimado pelos dias fechados/);
  assert.match(html, /R\$\s48,00/); // 2 dias × R$ 24,00
  assert.match(html, /Gastou a menos que o estimado/); // pagou 33,60 contra 48,00 estimados
  assert.match(html, /23,2 km\/l/);
  assert.match(html, /7% abaixo do km\/l dos Ajustes \(25,0\)/);
});

test('mês sem abastecimento explica onde registrar, sem quebrar', () => {
  const html = montar({ abastecimentos: [] });
  assert.match(html, /Nenhum abastecimento lançado neste mês/);
});

test('custos fixos: mês terminado com poucos dias mostra o que ficou sem desconto', () => {
  const html = montar({ abastecimentos: [] }); // 2 dias × 7,50 = 15 descontados de 196,05 devidos
  assert.match(html, /Custos fixos do mês/);
  assert.match(html, /ficaram R\$\s181,05 de custos fixos sem desconto/);
  assert.match(html, /O lucro real do mês é R\$\s118,95/); // 300 de lucro - 181,05
});

test('custos fixos: mês em andamento só mostra o descontado até agora', () => {
  const html = montar({ abastecimentos: [], terminou: false });
  assert.match(html, /Descontados até agora/);
  assert.doesNotMatch(html, /sem desconto/);
});

test('a tela continua montando sem os blocos novos (compatível com quem chama sem eles)', () => {
  const resumo = resumoDoMes(dias, '2026-09');
  const html = htmlMes({ ym: '2026-09', resumo, anterior: resumoDoMes(dias, '2026-08'), info: undefined, terminou: true, atual: '2026-10', progresso: null });
  assert.match(html, /Resumo do mês/);
  assert.doesNotMatch(html, /Pago nos abastecimentos/);
});

test('semana: mostra combustível usado, litros e custo por km, mesmo sem abastecimento lançado', () => {
  const dias = [{ data: '2026-10-26', calculados: { km: 200, combustivel: 48 }, snapshot: { kmPorLitro: 25 } }];
  const html = htmlCombustivelSemana(combustivelDoPeriodo(dias, [], ['2026-10-26']));
  assert.match(html, /Combustível usado \(estimado\)/);
  assert.match(html, /R\$\s48,00/);
  assert.match(html, /8 L/);
  assert.match(html, /R\$\s0,240/);
  assert.doesNotMatch(html, /Pago nos abastecimentos/);
});

test('semana: com abastecimento aparecem pago, litros, preço médio e consumo medido', () => {
  const dias = [{ data: '2026-10-27', calculados: { km: 130, combustivel: 31.2 }, snapshot: { kmPorLitro: 25 } }];
  const lista = [ab('a', '2026-10-26', 1000, 10, 60), ab('b', '2026-10-27', 1130, 5.6, 33.6)];
  const html = htmlCombustivelSemana(combustivelDoPeriodo(dias, lista, ['2026-10-26', '2026-10-27']));
  assert.match(html, /Pago nos abastecimentos/);
  assert.match(html, /R\$\s93,60/);
  assert.match(html, /23,2 km\/l/);
});
