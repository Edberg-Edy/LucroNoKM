// Teste de fumaça da tela do mês: monta o HTML com dados de exemplo e confere os blocos novos. Para rodar: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { htmlMes, htmlCombustivelSemana, htmlGuardarSemana } from './visaoMes.js';
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

test('mês com abastecimentos mostra valor abastecido, litros, consumo médio e custo por km', () => {
  const html = montar({ abastecimentos: [ab('a', '2026-08-31', 1000, 10, 60), ab('b', '2026-09-02', 1130, 5.6, 33.6)] });
  assert.match(html, /Combustível/);
  assert.match(html, /Valor abastecido/);
  assert.match(html, /Consumo médio/);
  assert.match(html, /Custo por km/);
  assert.match(html, /R\$\s33,60/);
  assert.doesNotMatch(html, /Sobrou no combustível|Estimado pelos dias fechados|reserva para imprevistos|Nos Ajustes o consumo/); // sem informações extras
  assert.match(html, /23,2 km\/l/);
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
  assert.doesNotMatch(html, /Gasto nos abastecimentos/);
});

test('semana: mostra km, km por litro, litros e valor do combustível, mesmo sem abastecimento lançado', () => {
  const dias = [{ data: '2026-10-26', calculados: { km: 200, combustivel: 48 }, snapshot: { kmPorLitro: 25 } }];
  const html = htmlCombustivelSemana(combustivelDoPeriodo(dias, [], ['2026-10-26']));
  assert.match(html, /Km rodados<\/span><b>200/);
  assert.match(html, /Km por litro<\/span><b>25,0 km\/l/);
  assert.match(html, /Litros usados \(estimado\)<\/span><b>8 L/);
  assert.match(html, /Valor do combustível \(estimado\)<\/span><b>R\$\s48,00/);
  assert.doesNotMatch(html, /Combustível por km/);
});

test('semana: com abastecimento aparecem gasto, litros, preço médio e consumo medido', () => {
  const dias = [{ data: '2026-10-27', calculados: { km: 130, combustivel: 31.2 }, snapshot: { kmPorLitro: 25 } }];
  const lista = [ab('a', '2026-10-26', 1000, 10, 60), ab('b', '2026-10-27', 1130, 5.6, 33.6)];
  const html = htmlCombustivelSemana(combustivelDoPeriodo(dias, lista, ['2026-10-26', '2026-10-27']));
  assert.match(html, /Valor do combustível<\/span><b>R\$\s93,60/);
  assert.match(html, /23,2 km\/l/);
});

test('mês com abastecimentos sem valor pago mostra o gasto estimado e o consumo aproximado', () => {
  const sem = (id, data, odometro, litros) => ({ id, data, odometro, litros, cheio: false });
  const html = montar({ abastecimentos: [sem('a', '2026-08-31', 1000, 3), sem('b', '2026-09-02', 1130, 5.6)] });
  assert.match(html, /Valor abastecido \(litros × preço dos Ajustes\)/);
  assert.match(html, /Consumo médio \(aproximado\)/);
  assert.match(html, /23,2 km\/l/);
  assert.doesNotMatch(html, /Preço médio do litro/);
});

test('semana sem valor pago: consumo aproximado aparece no lugar do medido', () => {
  const dias = [{ data: '2026-10-27', calculados: { km: 130, combustivel: 31.2 }, snapshot: { kmPorLitro: 25 } }];
  const lista = [{ id: 'a', data: '2026-10-26', odometro: 1000, litros: 3, cheio: false }, { id: 'b', data: '2026-10-27', odometro: 1130, litros: 5.6, cheio: false }];
  const html = htmlCombustivelSemana(combustivelDoPeriodo(dias, lista, ['2026-10-26', '2026-10-27'], 6));
  assert.match(html, /Valor do combustível \(litros × preço dos Ajustes\)/);
  assert.match(html, /23,2 km\/l/);
});

test('semana: "guardar" usa os custos fixos previstos da semana inteira e avisa o que falta nos dias restantes', () => {
  const t = { combustivel: 177.36, manutencao: 131.4, despesas: 10, fixos: 39.24 };
  const f = { dias: 6, previsto: 54.48, descontado: 39.24, falta: 15.24, semanaAtual: true, diasRestantes: 1, extraPorDia: 15.24 };
  const html = htmlGuardarSemana(t, f);
  assert.match(html, /Custos fixos \(6 dias de trabalho\)/);
  assert.match(html, /R\$\s54,48/);
  assert.match(html, /R\$\s373,24/); // 177,36 + 131,40 + 10 + 54,48
  assert.match(html, /Faltam R\$\s15,24 de custos fixos\. Restam 1 dia de trabalho: R\$\s15,24 por dia/);
  assert.match(htmlGuardarSemana(t, null), /R\$\s358,00/);
});
