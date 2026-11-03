// Testes do cartão de resultado do dia (só confere o HTML montado). Para rodar: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { htmlResultado } from './resultado.js';

const dia = {
  data: '2026-11-03',
  horas: 8,
  plataformas: [{ nome: 'Keeta', valor: 211.19, corridas: 10 }],
  snapshot: { meta: 150 },
  calculados: {
    km: 120, faturamento: 211.19, combustivel: 20, despesas: 5.68, manutencao: 15.3, fixos: 7.54, gastos: 48.52,
    lucro: 162.67, guardar: 22.84, livre: 162.67, ganhoPorKm: 1.76, lucroPorHora: 20.33, corridas: 10, ganhoPorCorrida: 21.12, status: 'verde',
  },
};

test('dinheiro do dia separa combustível, despesas, manutenção e custos fixos', () => {
  const html = htmlResultado(dia);
  const card = html.slice(html.indexOf('Seu dinheiro do dia'), html.indexOf('<h2>Detalhe'));
  assert.match(card, /Combustível<\/span><b>− R\$\s20,00/);
  assert.match(card, /Despesas<\/span><b>− R\$\s5,68/);
  assert.match(card, /Manutenção da moto<\/span><b>− R\$\s15,30/);
  assert.match(card, /Custos fixos<\/span><b>− R\$\s7,54/);
  assert.match(card, /Livre para gastar<\/span><b>R\$\s162,67/);
});

test('guardar inclui o combustível: R$ 20,00 + R$ 15,30 + R$ 7,54 = R$ 42,84', () => {
  const html = htmlResultado(dia);
  assert.match(html, /Guardar \(combustível, moto e custos fixos\)<\/span><b>R\$\s42,84/);
  assert.match(html, /Separe R\$\s42,84 deste dia: R\$\s20,00 para o próximo abastecimento, R\$\s15,30 para a moto e R\$\s7,54 para os custos fixos/);
});

test('dia no prejuízo ainda avisa que o guardado sai do bolso', () => {
  const ruim = { ...dia, calculados: { ...dia.calculados, lucro: -10, livre: -10, status: 'vermelho' } };
  assert.match(htmlResultado(ruim), /não cobriu os custos/);
});
