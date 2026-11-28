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
  const card = html.slice(html.indexOf('Gastou no dia'), html.indexOf('Separar do dia'));
  assert.match(card, /Combustível \(calculado\)<\/span><b>− R\$\s20,00/);
  assert.match(card, /Despesas<\/span><b>− R\$\s5,68/);
  assert.match(card, /Manutenção da moto<\/span><b>− R\$\s15,30/);
  assert.match(card, /Custos fixos<\/span><b>− R\$\s7,54/);
  assert.match(card, /Total gasto<\/span><b>− R\$\s48,52/);
  assert.match(card, /Lucro líquido<\/span><b>R\$\s162,67/);
  assert.match(html, /Livre para gastar<\/span><b>R\$\s162,67/);
});

test('separar só inclui moto e custos fixos: R$ 15,30 + R$ 7,54 = R$ 22,84; combustível e despesas já saíram', () => {
  const html = htmlResultado(dia);
  assert.match(html, /Já saiu: combustível e despesas<\/span><b>− R\$\s25,68/);
  assert.match(html, /Separar: moto e custos fixos<\/span><b>− R\$\s22,84/);
  assert.match(html, /Separe R\$\s22,84 deste dia: R\$\s15,30 para a moto e R\$\s7,54 para os custos fixos\. O combustível e as despesas já saíram/);
  assert.doesNotMatch(html, /para repor as despesas/);
});

test('dia no prejuízo ainda avisa que o guardado sai do bolso', () => {
  const ruim = { ...dia, calculados: { ...dia.calculados, lucro: -10, livre: -10, status: 'vermelho' } };
  assert.match(htmlResultado(ruim), /não cobriu os custos/);
});

test('indicadores do dia vêm em pares, todos em lucro: R$ 162,67 em 120 km e 10 corridas', () => {
  const html = htmlResultado(dia);
  assert.match(html, /Km rodados<\/span><b>120<\/b><\/div><div><span>Lucro por km<\/span><b>R\$\s1,36/);
  assert.match(html, /Horas<\/span><b>[^<]+<\/b><\/div><div><span>Lucro por hora<\/span><b>R\$\s20,33/);
  assert.match(html, /Corridas<\/span><b>10<\/b><\/div><div><span>Lucro por corrida<\/span><b>R\$\s16,27/);
  assert.doesNotMatch(html, /Ganho por km|Ganho por corrida/);
});
