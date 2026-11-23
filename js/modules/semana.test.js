// Testes do histórico semanal. Para rodar: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { somarDias, inicioDaSemana, datasDaSemana, resumoDaSemana, variacao, diasPorSemana, metaDaSemana, fixosDaSemana, fixoDoDia, atrasoDosFixos } from './semana.js';

// Cria um dia fechado de exemplo
const dia = (data, lucro, gastos, plataformas = [{ nome: 'iFood', valor: 100, corridas: 4 }]) => ({
  data,
  snapshot: { meta: 200 },
  calculados: { lucro, gastos, faturamento: lucro + gastos, guardar: 20, km: 100 },
  plataformas,
});

test('somarDias passa de mês e de ano', () => {
  assert.equal(somarDias('2026-09-30', 1), '2026-10-01');
  assert.equal(somarDias('2026-12-31', 1), '2027-01-01');
  assert.equal(somarDias('2026-10-05', -7), '2026-09-28');
});

test('a semana começa na segunda e termina no domingo', () => {
  assert.equal(inicioDaSemana('2026-10-08'), '2026-10-05'); // quinta-feira
  assert.equal(inicioDaSemana('2026-10-05'), '2026-10-05'); // a própria segunda
  assert.equal(inicioDaSemana('2026-10-11'), '2026-10-05'); // domingo
  const datas = datasDaSemana('2026-09-28');
  assert.equal(datas.length, 7);
  assert.equal(datas[0], '2026-09-28');
  assert.equal(datas[6], '2026-10-04'); // atravessa o mês
});

test('resumo da semana soma só os dias dentro das datas', () => {
  const datas = datasDaSemana('2026-10-05');
  const dias = [
    dia('2026-10-05', 250, 50), // segunda
    dia('2026-10-07', 100, 60), // quarta
    dia('2026-10-12', 999, 1), // semana seguinte: deve ficar de fora
  ];
  const r = resumoDaSemana(dias, datas);
  assert.equal(r.porDia.length, 7);
  assert.equal(r.totais.lucro, 350);
  assert.equal(r.totais.gastos, 110);
  assert.equal(r.totais.diasTrabalhados, 2);
  assert.equal(r.totais.mediaPorDia, 175);
  assert.equal(r.totais.guardar, 40);
  assert.equal(r.totais.km, 200);
});

test('cada dia recebe a cor do farol; dias sem lançamento ficam vazios', () => {
  const r = resumoDaSemana([dia('2026-10-05', 250, 50), dia('2026-10-06', 80, 50), dia('2026-10-07', -10, 50)], datasDaSemana('2026-10-05'));
  assert.equal(r.porDia[0].status, 'verde');
  assert.equal(r.porDia[1].status, 'amarelo');
  assert.equal(r.porDia[2].status, 'vermelho');
  assert.equal(r.porDia[3].tem, false);
  assert.equal(r.porDia[3].status, null);
});

test('dois lançamentos na mesma data viram uma coluna só', () => {
  const r = resumoDaSemana([dia('2026-10-05', 100, 40), dia('2026-10-05', 150, 60)], datasDaSemana('2026-10-05'));
  assert.equal(r.porDia[0].lucro, 250);
  assert.equal(r.totais.diasTrabalhados, 1);
});

test('semana sem dias: tudo zerado e média vazia', () => {
  const r = resumoDaSemana([], datasDaSemana('2026-10-05'));
  assert.equal(r.totais.lucro, 0);
  assert.equal(r.totais.mediaPorDia, null);
  assert.deepEqual(r.plataformas, []);
});

test('ranking por plataforma soma valores e corridas, do maior para o menor', () => {
  const r = resumoDaSemana(
    [
      dia('2026-10-05', 100, 0, [{ nome: 'iFood', valor: 100, corridas: 4 }, { nome: '99', valor: 40, corridas: 0 }]),
      dia('2026-10-06', 100, 0, [{ nome: 'iFood', valor: 60, corridas: 0 }, { nome: '99', valor: 90, corridas: 3 }]),
    ],
    datasDaSemana('2026-10-05')
  );
  assert.equal(r.plataformas[0].nome, 'iFood'); // 160 contra 130
  assert.equal(r.plataformas[0].valor, 160);
  assert.equal(r.plataformas[0].corridas, 4);
  assert.equal(r.plataformas[0].valorComCorridas, 100); // os 60 sem corridas informadas não entram
  assert.equal(r.plataformas[1].valorComCorridas, 90);
});

test('variação entre semanas', () => {
  assert.equal(variacao(150, 100), 50);
  assert.equal(variacao(50, 100), -50);
  assert.equal(variacao(10, 0), null);
});
test('dias por semana vêm dos dias por mês do ajuste', () => {
  assert.equal(diasPorSemana(26), 6);
  assert.equal(diasPorSemana(20), 5);
  assert.equal(diasPorSemana(13), 3);
  assert.equal(diasPorSemana(30), 7);
});

test('meta da semana = meta diária × dias de trabalho, com ritmo na semana atual', () => {
  const datas = datasDaSemana('2026-11-02'); // segunda 02/11
  const m = metaDaSemana({ lucro: 150, meta: 250, diasPorMes: 26, datas, hoje: '2026-11-03', hojeFechado: true, diasTrabalhados: 1 });
  assert.equal(m.meta, 1500);
  assert.equal(m.falta, 1350);
  assert.equal(Math.round(m.percentual), 10);
  assert.equal(m.diasRestantes, 5); // 6 previstos − 1 trabalhado, e restam 5 dias de calendário
  assert.equal(m.porDia, 1350 / 5);
  assert.equal(m.atingiu, false);
});

test('semana passada só mostra o resultado, e meta batida mostra a sobra', () => {
  const datas = datasDaSemana('2026-10-26');
  const m = metaDaSemana({ lucro: 1200, meta: 250, diasPorMes: 26, datas, hoje: '2026-11-03', hojeFechado: false });
  assert.equal(m.semanaAtual, false);
  assert.equal(m.porDia, null);
  const b = metaDaSemana({ lucro: 1600, meta: 250, diasPorMes: 26, datas, hoje: '2026-11-03', hojeFechado: false });
  assert.equal(b.atingiu, true);
  assert.equal(b.sobra, 100);
  assert.equal(b.percentual, 100);
});

test('sem meta ou sem dias por mês não há cartão', () => {
  const datas = datasDaSemana('2026-11-02');
  assert.equal(metaDaSemana({ lucro: 0, meta: 0, diasPorMes: 26, datas, hoje: '2026-11-03', hojeFechado: false }), null);
});

test('folga não avisada: faltam menos dias no calendário e o valor por dia sobe', () => {
  const datas = datasDaSemana('2026-11-02');
  // quinta 05/11, hoje ainda não lançado, só 2 dias trabalhados (seg e ter): restam 4 dias de calendário (qui a dom)
  const m = metaDaSemana({ lucro: 500, meta: 250, diasPorMes: 26, datas, hoje: '2026-11-05', hojeFechado: false, diasTrabalhados: 2 });
  assert.equal(m.diasRestantes, 4); // previstos 6 − 2 = 4, calendário 4
  assert.equal(m.porDia, 250);
  // folgou também na quarta (mesmo 2 dias trabalhados, agora é sexta): restam 3 dias
  const n = metaDaSemana({ lucro: 500, meta: 250, diasPorMes: 26, datas, hoje: '2026-11-06', hojeFechado: false, diasTrabalhados: 2 });
  assert.equal(n.diasRestantes, 3);
  assert.equal(Math.round(n.porDia), 333);
});

test('já fez os dias previstos e não bateu a meta: ritmo vale para dias extras', () => {
  const datas = datasDaSemana('2026-11-02');
  const m = metaDaSemana({ lucro: 1000, meta: 250, diasPorMes: 26, datas, hoje: '2026-11-07', hojeFechado: true, diasTrabalhados: 6 });
  assert.equal(m.extra, true);
  assert.equal(m.diasRestantes, 1);
  assert.equal(m.porDia, 500);
});

test('a semana soma o combustível dos dias (a tela o soma ao que se guarda)', () => {
  const comComb = (data, combustivel) => ({ ...dia(data, 100, 40), calculados: { ...dia(data, 100, 40).calculados, combustivel } });
  const datas = datasDaSemana('2026-11-02');
  const r = resumoDaSemana([comComb('2026-11-02', 20), comComb('2026-11-03', 15.5)], datas);
  assert.equal(r.totais.combustivel, 35.5);
  assert.equal(r.totais.guardar, 40); // 20 + 20 de cada dia: moto e custos fixos
});

test('a semana soma despesas, manutenção e custos fixos dos dias', () => {
  const comItens = (data) => ({ ...dia(data, 100, 40), calculados: { ...dia(data, 100, 40).calculados, despesas: 10, manutencao: 12, fixos: 8 } });
  const r = resumoDaSemana([comItens('2026-11-02'), comItens('2026-11-03')], datasDaSemana('2026-11-02'));
  assert.equal(r.totais.despesas, 20);
  assert.equal(r.totais.manutencao, 24);
  assert.equal(r.totais.fixos, 16);
});

test('custos fixos da semana: o previsto é fixo por dia × dias de trabalho, mesmo com menos dias lançados', () => {
  const datas = datasDaSemana('2026-11-16');
  // 26 dias por mês = 6 por semana; R$ 9,08 por dia = R$ 54,48 na semana. Foram lançados 5 dias que descontaram R$ 45,40.
  const f = fixosDaSemana({ descontado: 45.4, fixoPorDia: 9.08, diasPorMes: 26, datas, hoje: '2026-11-22', hojeFechado: false, diasTrabalhados: 5 });
  assert.equal(f.dias, 6);
  assert.equal(Math.round(f.previsto * 100), 5448);
  assert.equal(Math.round(f.falta * 100), 908);
  assert.equal(f.diasRestantes, 1);
  assert.equal(Math.round(f.extraPorDia * 100), 908);
});

test('custos fixos da semana: o que falta se divide pelos dias de trabalho que restam', () => {
  const datas = datasDaSemana('2026-11-16');
  // quinta-feira, 3 dias lançados (seg, ter, qua): restam 3 dias de trabalho; faltam 54,48 − 27,24 = 27,24
  const f = fixosDaSemana({ descontado: 27.24, fixoPorDia: 9.08, diasPorMes: 26, datas, hoje: '2026-11-19', hojeFechado: false, diasTrabalhados: 3 });
  assert.equal(f.diasRestantes, 3);
  assert.equal(Math.round(f.extraPorDia * 100), 908);
  // folgou na quinta e na sexta: só restam sábado e domingo, e o valor por dia sobe
  const g = fixosDaSemana({ descontado: 27.24, fixoPorDia: 9.08, diasPorMes: 26, datas, hoje: '2026-11-21', hojeFechado: false, diasTrabalhados: 3 });
  assert.equal(g.diasRestantes, 2);
  assert.equal(Math.round(g.extraPorDia * 100), 1362);
});

test('custos fixos da semana: semana passada completa não falta nada; sem dias e sem custo fixo não calcula', () => {
  const datas = datasDaSemana('2026-11-09');
  const cheia = fixosDaSemana({ descontado: 54.48, fixoPorDia: 9.08, diasPorMes: 26, datas, hoje: '2026-11-22', hojeFechado: true, diasTrabalhados: 6 });
  assert.ok(cheia.falta < 0.005);
  assert.equal(cheia.extraPorDia, null);
  const vazia = fixosDaSemana({ descontado: 0, fixoPorDia: 9.08, diasPorMes: 26, datas, hoje: '2026-11-22', hojeFechado: false, diasTrabalhados: 0 });
  assert.equal(vazia.previsto, 0);
  assert.equal(fixosDaSemana({ descontado: 0, fixoPorDia: 0, diasPorMes: 26, datas, hoje: '2026-11-22' }), null);
});

test('custo fixo do dia: semana normal é sempre o fixo por dia; folgar além do previsto sobe o valor dos dias que restam', () => {
  const base = { fixoPorDia: 9.08, diasPorMes: 26 };
  const fechado = (data, fixos) => ({ data, calculados: { fixos } });
  assert.equal(fixoDoDia({ ...base, data: '2026-11-16' }), 9.08); // segunda, primeiro dia
  assert.equal(fixoDoDia({ ...base, data: '2026-11-18', anteriores: [fechado('2026-11-16', 9.08), fechado('2026-11-17', 9.08)] }), 9.08);
  // trabalhou seg, ter, qua, qui, sex (45,40) e só chegou no domingo: falta 9,08 em 1 dia
  const cinco = ['16', '17', '18', '19', '20'].map((d) => fechado('2026-11-' + d, 9.08));
  assert.equal(fixoDoDia({ ...base, data: '2026-11-22', anteriores: cinco }), 9.08);
  // só começou a semana no sábado: a semana ainda deve os 54,48 em 2 dias (sáb e dom)
  assert.equal(fixoDoDia({ ...base, data: '2026-11-21' }), 27.24);
  // já cobriu o previsto: dia extra não paga mais custo fixo
  const seis = ['16', '17', '18', '19', '20', '21'].map((d) => fechado('2026-11-' + d, 9.08));
  assert.equal(fixoDoDia({ ...base, data: '2026-11-22', anteriores: seis }), 0);
  assert.equal(fixoDoDia({ fixoPorDia: 0, diasPorMes: 26, data: '2026-11-16' }), 0);
});

test('atraso dos fixos: o que não foi coberto na semana passada entra na semana nova', () => {
  const base = { fixoPorDia: 9.08, diasPorMes: 26 };
  const fechado = (data) => ({ data, calculados: { fixos: 9.08 } });
  // semana de 16/11: 5 dias (seg a sex) descontaram 45,40 de 54,48. Sem domingo, ficou faltando 9,08
  const passada = ['16', '17', '18', '19', '20'].map((d) => fechado('2026-11-' + d));
  const atraso = atrasoDosFixos({ ...base, inicioDaSemanaNova: '2026-11-23', anteriores: passada, primeiraData: '2026-11-16' });
  assert.equal(atraso, 9.08);
  // segunda 23/11: (54,48 + 9,08) ÷ 6 dias = 10,59
  assert.equal(fixoDoDia({ ...base, data: '2026-11-23', atraso }), 10.59);
  // semana passada completa: sem atraso
  const cheia = [...passada, fechado('2026-11-21')];
  assert.equal(atrasoDosFixos({ ...base, inicioDaSemanaNova: '2026-11-23', anteriores: cheia, primeiraData: '2026-11-16' }), 0);
  // semanas antes do primeiro dia do app não geram atraso
  assert.equal(atrasoDosFixos({ ...base, inicioDaSemanaNova: '2026-11-23', anteriores: [], primeiraData: '2026-11-23' }), 0);
  assert.equal(atrasoDosFixos({ ...base, inicioDaSemanaNova: '2026-11-23', anteriores: [], primeiraData: null }), 0);
});
