// Testes da visão de combustível do histórico (só confere o HTML montado). Para rodar: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { htmlCombustivelMes } from './visaoCombustivel.js';

const lista = [
  { id: 'a', data: '2026-10-30', odometro: 1000, litros: 5, cheio: true },
  { id: 'b', data: '2026-11-02', odometro: 1100, litros: 4, cheio: true },
  { id: 'c', data: '2026-11-04', odometro: 1180, litros: 3, cheio: false },
];
const base = { ym: '2026-11', atual: '2026-11', lista, fechado: false, precoLitro: 6 };

test('lista só os abastecimentos do mês, do mais novo ao mais antigo', () => {
  const html = htmlCombustivelMes(base);
  assert.ok(html.indexOf('04/11') < html.indexOf('02/11'));
  assert.ok(!html.includes('30/10'));
  assert.match(html, /Abastecimentos<\/span><b>2</);
  assert.match(html, /data-ab-editar="c"/);
});

test('mês fechado trava a lista (sem editar nem excluir)', () => {
  const html = htmlCombustivelMes({ ...base, fechado: true });
  assert.ok(!html.includes('data-ab-editar'));
  assert.ok(!html.includes('data-ab-excluir'));
  assert.match(html, /Mês fechado/);
});

test('mês sem abastecimento avisa e "Próximo" fica desligado no mês atual', () => {
  const html = htmlCombustivelMes({ ...base, ym: '2026-09' });
  assert.match(html, /Nenhum abastecimento neste mês/);
  assert.match(htmlCombustivelMes(base), /data-mes="proximo" disabled/);
});

test('o segundo toque pede confirmação no ✕', () => {
  assert.match(htmlCombustivelMes({ ...base, apagandoId: 'b' }), /Excluir\?/);
});
