// Testes do fechamento mensal. Para rodar: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { somarMeses, nomeDoMes, ultimoDiaDoMes, mesJaTerminou, resumoDoMes, progressoDoMes } from './mes.js';

// Dia fechado de exemplo (só os campos que o resumo usa)
const dia = (data, lucro, plataformas = [{ nome: 'iFood', valor: 100, corridas: 4 }]) => ({
  data,
  plataformas,
  calculados: { faturamento: lucro + 50, combustivel: 20, manutencao: 15, despesas: 10, fixos: 5, gastos: 50, lucro, guardar: 20, km: 100 },
});

test('somar meses passa de ano', () => {
  assert.equal(somarMeses('2026-12', 1), '2027-01');
  assert.equal(somarMeses('2026-01', -1), '2025-12');
  assert.equal(somarMeses('2026-10', 0), '2026-10');
});

test('nome do mês e último dia do mês', () => {
  assert.equal(nomeDoMes('2026-10'), 'outubro de 2026');
  assert.equal(nomeDoMes('2026-03'), 'março de 2026');
  assert.equal(ultimoDiaDoMes('2026-02'), 28);
  assert.equal(ultimoDiaDoMes('2028-02'), 29);
  assert.equal(ultimoDiaDoMes('2026-09'), 30);
  assert.equal(ultimoDiaDoMes('2026-10'), 31);
});

test('só dá para fechar mês que já terminou (ou no último dia)', () => {
  assert.equal(mesJaTerminou('2026-09', '2026-10-09'), true);
  assert.equal(mesJaTerminou('2026-10', '2026-10-09'), false);
  assert.equal(mesJaTerminou('2026-10', '2026-10-31'), true);
  assert.equal(mesJaTerminou('2026-11', '2026-10-31'), false);
});

test('resumo do mês soma só o mês, junta datas repetidas e acha melhor e pior dia', () => {
  const dias = [dia('2026-10-05', 100), dia('2026-10-06', 250), dia('2026-10-06', -50), dia('2026-09-30', 999)];
  const r = resumoDoMes(dias, '2026-10');
  const t = r.totais;
  assert.equal(t.lucro, 300);
  assert.equal(t.faturamento, 450);
  assert.equal(t.gastos, 150);
  assert.equal(t.combustivel, 60);
  assert.equal(t.guardar, 60);
  assert.equal(t.km, 300);
  assert.equal(t.diasTrabalhados, 2); // 05 e 06
  assert.equal(t.mediaPorDia, 150);
  assert.equal(t.ganhoPorKm, 1.5);
  assert.equal(t.corridas, 12);
  assert.equal(t.ganhoPorCorrida, 25);
  assert.deepEqual(r.melhor, { data: '2026-10-06', lucro: 200 });
  assert.deepEqual(r.pior, { data: '2026-10-05', lucro: 100 });
  assert.equal(r.plataformas[0].nome, 'iFood');
});

test('mês sem dias: tudo zerado e indicadores vazios', () => {
  const r = resumoDoMes([dia('2026-09-30', 100)], '2026-10');
  assert.equal(r.totais.lucro, 0);
  assert.equal(r.totais.mediaPorDia, null);
  assert.equal(r.totais.ganhoPorKm, null);
  assert.equal(r.totais.ganhoPorCorrida, null);
  assert.equal(r.melhor, null);
  assert.equal(r.pior, null);
});

test('com um dia só, melhor e pior são o mesmo', () => {
  const r = resumoDoMes([dia('2026-10-05', 80)], '2026-10');
  assert.deepEqual(r.melhor, r.pior);
});

test('ganho por corrida ignora plataformas sem corridas informadas', () => {
  const r = resumoDoMes([dia('2026-10-05', 80, [{ nome: 'A', valor: 100, corridas: 4 }, { nome: 'B', valor: 60 }])], '2026-10');
  assert.equal(r.totais.ganhoPorCorrida, 25);
});

// ---------- progresso do mês contra as contas ----------
const base = { ym: '2026-10', hoje: '2026-10-22', lucro: 3000, contas: 5000, diasPorMes: 26, hojeFechado: true };

test('sem contas informadas o acompanhamento fica desligado', () => {
  assert.equal(progressoDoMes({ ...base, contas: 0 }), null);
  assert.equal(progressoDoMes({ ...base, contas: undefined }), null);
});

test('mês atual: quanto falta, dias de trabalho que restam e lucro por dia necessário', () => {
  // 22/10 já lançado: restam 9 dias no calendário (23 a 31); 9 × 26 ÷ 31 = 7,5 ≈ 8 dias de trabalho
  const p = progressoDoMes(base);
  assert.equal(p.falta, 2000);
  assert.equal(p.percentual, 60);
  assert.equal(p.atingiu, false);
  assert.equal(p.diasRestantes, 8);
  assert.equal(p.porDia, 250);
});

test('hoje ainda não lançado conta como dia de trabalho', () => {
  const p = progressoDoMes({ ...base, hojeFechado: false });
  assert.equal(p.diasRestantes, 8); // 10 dias corridos × 26 ÷ 31 = 8,4 ≈ 8
  const ultimoDia = progressoDoMes({ ...base, hoje: '2026-10-31', hojeFechado: false, diasPorMes: 10 });
  assert.equal(ultimoDia.diasRestantes, 1); // nunca menos que hoje
});

test('contas cobertas: atingiu, nada falta e sobra o excedente', () => {
  const p = progressoDoMes({ ...base, lucro: 5600 });
  assert.equal(p.atingiu, true);
  assert.equal(p.falta, 0);
  assert.equal(p.sobra, 600);
  assert.equal(p.percentual, 100);
  assert.equal(p.porDia, null);
});

test('mês que já passou não estima dias restantes', () => {
  const p = progressoDoMes({ ...base, ym: '2026-09' });
  assert.equal(p.mesAtual, false);
  assert.equal(p.diasRestantes, 0);
  assert.equal(p.porDia, null);
  assert.equal(p.falta, 2000);
});

test('lucro negativo não gera percentual negativo', () => {
  assert.equal(progressoDoMes({ ...base, lucro: -100 }).percentual, 0);
});

test('o mês mostra lucro por km e lucro por corrida (não o faturamento)', () => {
  const r = resumoDoMes([dia('2026-11-02', 150), dia('2026-11-03', 150)], '2026-11');
  assert.equal(r.totais.lucroPorKm, 300 / 200);
  assert.equal(r.totais.lucroPorCorrida, 300 / 8);
  assert.equal(resumoDoMes([], '2026-11').totais.lucroPorKm, null);
  assert.equal(resumoDoMes([], '2026-11').totais.lucroPorCorrida, null);
});
