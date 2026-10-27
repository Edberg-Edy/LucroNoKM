// Testes da planilha CSV do mês. Para rodar: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { csvDoMes, celula } from './exportar.js';

const dia = (data, plataformas, c = {}) => ({
  data,
  horas: 8,
  plataformas,
  calculados: { km: 100, faturamento: 200, combustivel: 24, manutencao: 10, despesas: 5, fixos: 7.5, lucro: 153.5, guardar: 17.5, corridas: 12, status: 'verde', ...c },
});

const linhas = (csv) => csv.replace('﻿', '').trim().split('\r\n').map((l) => l.split(';'));

test('csv começa com BOM, usa ; e vírgula decimal, e termina com a linha de total', () => {
  const csv = csvDoMes([dia('2026-10-02', [{ nome: 'iFood', valor: 120.5 }, { nome: 'Particular', valor: 79.5 }])], '2026-10');
  assert.ok(csv.startsWith('﻿'));
  const l = linhas(csv);
  assert.deepEqual(l[0].slice(0, 5), ['Data', 'Km', 'Horas', 'iFood', 'Particular']);
  assert.deepEqual(l[1].slice(0, 5), ['02/10/2026', '100', '8', '120,5', '79,5']);
  assert.equal(l[1].at(-1), 'Meta');
  assert.equal(l.at(-1)[0], 'Total');
});

test('só entra o mês pedido, em ordem de data; total soma as linhas', () => {
  const l = linhas(
    csvDoMes([dia('2026-10-05', [{ nome: 'iFood', valor: 200 }]), dia('2026-09-30', []), dia('2026-10-01', [{ nome: 'iFood', valor: 200 }], { lucro: 100 })], '2026-10')
  );
  assert.equal(l.length, 4); // cabeçalho + 2 dias + total
  assert.ok(l[1][0].startsWith('01/10'));
  const i = l[0].indexOf('Lucro');
  assert.equal(l.at(-1)[i], '253,5');
  assert.equal(l.at(-1)[l[0].indexOf('iFood')], '400');
});

test('plataformas de dias diferentes viram colunas; dia sem ela fica 0', () => {
  const l = linhas(csvDoMes([dia('2026-10-01', [{ nome: 'iFood', valor: 50 }]), dia('2026-10-02', [{ nome: '99', valor: 30 }])], '2026-10'));
  assert.deepEqual(l[0].slice(3, 5), ['iFood', '99']);
  assert.deepEqual(l[1].slice(3, 5), ['50', '0']);
  assert.deepEqual(l[2].slice(3, 5), ['0', '30']);
});

test('mês sem dias: só cabeçalho e total zerado', () => {
  const l = linhas(csvDoMes([], '2026-10'));
  assert.equal(l.length, 2);
  assert.equal(l[1][0], 'Total');
});

test('célula protege aspas, ponto e vírgula e fórmulas', () => {
  assert.equal(celula('a;b'), '"a;b"');
  assert.equal(celula('diz "oi"'), '"diz ""oi"""');
  assert.equal(celula('=SOMA(A1)'), "'=SOMA(A1)");
  assert.equal(celula('-5 reais'), "'-5 reais");
  assert.equal(celula('iFood'), 'iFood');
  assert.equal(celula(null), '');
});
