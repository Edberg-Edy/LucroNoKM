// Testes das contas de combustível. Para rodar: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ordenar,
  trechos,
  consumoMedio,
  alertaConsumo,
  resumoCombustivel,
  painelDoMes,
  combustivelDoPeriodo,
  validarAbastecimento,
  kmL,
  litrosBR,
} from './combustivel.js';

const perto = (a, b, tolerancia = 1e-9) => assert.ok(Math.abs(a - b) <= tolerancia, `${a} deveria ser ${b}`);
const ab = (id, data, odometro, litros, valor, cheio = true) => ({ id, data, odometro, litros, valor, cheio });

test('exemplo da conversa: 130 km com 5,6 L dá 23,2 km/l e custo real de R$ 33,60', () => {
  const t = trechos([ab('a', '2026-10-01', 12540, 3.9, 23.4), ab('b', '2026-10-02', 12670, 5.6, 33.6)]);
  assert.equal(t.length, 1);
  assert.equal(t[0].km, 130);
  assert.equal(t[0].litros, 5.6);
  perto(t[0].kmPorLitro, 130 / 5.6);
  assert.equal(kmL(t[0].kmPorLitro), '23,2');
  perto(t[0].custoPorKm, 33.6 / 130);
  perto(t[0].precoMedio, 6);
});

test('o primeiro tanque cheio só marca o ponto de partida (seus litros não entram na conta)', () => {
  const t = trechos([ab('a', '2026-10-01', 1000, 10, 60), ab('b', '2026-10-02', 1100, 4, 24), ab('c', '2026-10-03', 1200, 4, 24)]);
  assert.equal(t.length, 2);
  assert.equal(t[0].litros, 4);
  assert.equal(t[1].litros, 4);
  assert.equal(t[1].de.id, 'b');
});

test('abastecimento parcial entra na soma do trecho, mas não fecha trecho', () => {
  const t = trechos([
    ab('a', '2026-10-01', 1000, 10, 60),
    ab('b', '2026-10-02', 1080, 3, 18, false), // parcial
    ab('c', '2026-10-03', 1200, 5, 30), // cheio
  ]);
  assert.equal(t.length, 1);
  assert.equal(t[0].km, 200);
  assert.equal(t[0].litros, 8); // 3 + 5
  assert.equal(t[0].valor, 48);
  perto(t[0].kmPorLitro, 25);
});

test('parcial antes do primeiro cheio é ignorado', () => {
  const t = trechos([ab('p', '2026-09-30', 900, 2, 12, false), ab('a', '2026-10-01', 1000, 10, 60), ab('b', '2026-10-02', 1100, 4, 24)]);
  assert.equal(t.length, 1);
  assert.equal(t[0].litros, 4);
});

test('abastecimento sem odômetro conta os litros, mas não serve de ponto de medida', () => {
  const t = trechos([
    ab('a', '2026-10-01', 1000, 10, 60),
    ab('b', '2026-10-02', null, 3, 18), // "cheio" sem odômetro: não fecha trecho
    ab('c', '2026-10-03', 1200, 5, 30),
  ]);
  assert.equal(t.length, 1);
  assert.equal(t[0].litros, 8);
  assert.equal(t[0].km, 200);
});

test('odômetro que não avança não gera trecho (e não trava o seguinte)', () => {
  const t = trechos([ab('a', '2026-10-01', 1000, 10, 60), ab('b', '2026-10-02', 1000, 4, 24), ab('c', '2026-10-03', 1100, 4, 24)]);
  assert.equal(t.length, 1);
  assert.equal(t[0].de.id, 'b');
});

test('a ordem de entrada não importa: ordena por data e odômetro', () => {
  const t = trechos([ab('b', '2026-10-02', 1100, 4, 24), ab('a', '2026-10-01', 1000, 10, 60)]);
  assert.equal(t.length, 1);
  assert.deepEqual(ordenar([ab('x', '2026-10-02', 5, 1, 6), ab('y', '2026-10-01', 9, 1, 6)]).map((a) => a.id), ['y', 'x']);
});

test('menos de dois tanques cheios: nenhum trecho', () => {
  assert.deepEqual(trechos([]), []);
  assert.deepEqual(trechos([ab('a', '2026-10-01', 1000, 10, 60)]), []);
  assert.deepEqual(trechos([ab('a', '2026-10-01', 1000, 10, 60), ab('b', '2026-10-02', 1100, 4, 24, false)]), []);
});

test('consumo médio usa só os últimos trechos e devolve null sem trechos', () => {
  assert.equal(consumoMedio([]), null);
  const lista = [];
  let odo = 1000;
  lista.push(ab('0', '2026-10-01', odo, 10, 60));
  // 3 trechos de 100 km: 5 L (20 km/l), 4 L (25 km/l), 4 L (25 km/l)
  [5, 4, 4].forEach((l, i) => {
    odo += 100;
    lista.push(ab(String(i + 1), `2026-10-0${i + 2}`, odo, l, l * 6));
  });
  const t = trechos(lista);
  const todos = consumoMedio(t);
  perto(todos.kmPorLitro, 300 / 13);
  assert.equal(todos.trechos, 3);
  const dois = consumoMedio(t, 2);
  perto(dois.kmPorLitro, 25);
  assert.equal(dois.trechos, 2);
});

// 6 abastecimentos diários de 100 km cada, com os litros informados
function sequencia(litrosPorTrecho) {
  const lista = [ab('0', '2026-10-01', 1000, 10, 60)];
  litrosPorTrecho.forEach((l, i) => lista.push(ab(String(i + 1), `2026-10-${String(i + 2).padStart(2, '0')}`, 1000 + 100 * (i + 1), l, l * 6)));
  return lista;
}

test('alerta de consumo: dispara com queda de 10% ou mais contra a média anterior', () => {
  const normal = trechos(sequencia([4, 4, 4, 4])); // 25 km/l sempre
  assert.equal(alertaConsumo(normal), null);

  const caiu = alertaConsumo(trechos(sequencia([4, 4, 4, 4.6]))); // último: 21,7 km/l (−13%)
  assert.ok(caiu);
  perto(caiu.media, 25);
  assert.ok(caiu.queda > 0.1 && caiu.queda < 0.15);
  assert.equal(caiu.data, '2026-10-05');

  assert.equal(alertaConsumo(trechos(sequencia([4, 4, 4.3]))), null); // −7%: dentro do normal
});

test('alerta de consumo precisa de pelo menos 2 trechos antes do último', () => {
  assert.equal(alertaConsumo(trechos(sequencia([4, 6]))), null); // só 1 trecho antes
  assert.ok(alertaConsumo(trechos(sequencia([4, 4, 6]))));
});

test('melhora de consumo não gera alerta', () => {
  assert.equal(alertaConsumo(trechos(sequencia([4, 4, 4, 3]))), null);
});

test('resumo do mês: gasto, litros e preço médio do mês; consumo só dos trechos que terminaram no mês', () => {
  const lista = [
    ab('a', '2026-09-30', 1000, 10, 60),
    ab('b', '2026-10-01', 1100, 4, 24),
    ab('c', '2026-10-02', 1200, 4, 24),
  ];
  const r = resumoCombustivel(lista, '2026-10');
  assert.equal(r.abastecimentos, 2);
  assert.equal(r.litros, 8);
  assert.equal(r.valor, 48);
  perto(r.precoMedio, 6);
  assert.equal(r.trechos, 2);
  assert.equal(r.kmMedido, 200);
  perto(r.kmPorLitro, 25);
  perto(r.custoPorKm, 0.24);

  const setembro = resumoCombustivel(lista, '2026-09');
  assert.equal(setembro.abastecimentos, 1);
  assert.equal(setembro.valor, 60);
  assert.equal(setembro.trechos, 0);
  assert.equal(setembro.kmPorLitro, null);
  assert.equal(setembro.custoPorKm, null);
});

test('mês sem abastecimento: tudo zerado e indicadores vazios', () => {
  const r = resumoCombustivel([ab('a', '2026-09-30', 1000, 10, 60)], '2026-10');
  assert.equal(r.abastecimentos, 0);
  assert.equal(r.valor, 0);
  assert.equal(r.precoMedio, null);
  assert.equal(r.kmPorLitro, null);
});

test('painel do mês: real contra estimado e consumo contra o ajuste', () => {
  const lista = [ab('a', '2026-09-30', 1000, 10, 60), ab('b', '2026-10-01', 1130, 5.6, 33.6)];
  const p = painelDoMes(lista, '2026-10', { estimado: 31.2, kmPorLitroAjuste: 25 });
  perto(p.diferenca, 2.4, 1e-9); // gastou R$ 2,40 a mais que o estimado
  perto(p.desvio, 130 / 5.6 / 25 - 1); // km/l real ~7% abaixo do ajuste
  assert.ok(p.desvio < 0);
  assert.equal(p.estimado, 31.2);

  const vazio = painelDoMes([], '2026-10', { estimado: 100, kmPorLitroAjuste: 25 });
  assert.equal(vazio.diferenca, null);
  assert.equal(vazio.desvio, null);
});

// ---------- conferência do que foi digitado ----------

const hoje = '2026-10-25';
const entrada = (extra = {}) => ({ data: '2026-10-25', odometro: '12670', litros: '5,6', valor: '33,60', cheio: true, ...extra });
const erroDe = (e, lista = []) => {
  const r = validarAbastecimento(e, lista, { hoje });
  assert.equal(r.ok, false);
  return r.erro;
};

test('abastecimento válido vira dados já arredondados', () => {
  const r = validarAbastecimento(entrada({ litros: '5.60', valor: 'R$ 33,6', odometro: '12.670' }), [], { hoje });
  assert.equal(r.ok, true);
  assert.deepEqual(r.dados, { data: '2026-10-25', odometro: 12670, litros: 5.6, valor: 33.6, cheio: true });
});

test('sem odômetro só vale se não for tanque cheio', () => {
  const r = validarAbastecimento(entrada({ odometro: '', cheio: false }), [], { hoje });
  assert.equal(r.ok, true);
  assert.equal(r.dados.odometro, null);
  assert.match(erroDe(entrada({ odometro: '' })), /odômetro/i);
});

test('recusa data futura, litros e valor vazios ou absurdos', () => {
  assert.match(erroDe(entrada({ data: '2026-10-26' })), /data/i);
  assert.match(erroDe(entrada({ data: '' })), /data/i);
  assert.match(erroDe(entrada({ litros: '' })), /litros/i);
  assert.match(erroDe(entrada({ litros: '0' })), /litros/i);
  assert.match(erroDe(entrada({ litros: '70' })), /60 litros/);
  assert.match(erroDe(entrada({ valor: '' })), /valor/i);
  assert.match(erroDe(entrada({ valor: 'abc' })), /valor/i);
});

test('preço por litro fora do normal denuncia erro de digitação', () => {
  assert.match(erroDe(entrada({ litros: '5,6', valor: '3,36' })), /por litro/); // R$ 0,60/L
  assert.match(erroDe(entrada({ litros: '5,6', valor: '336' })), /por litro/); // R$ 60/L
});

test('odômetro menor que o de um abastecimento mais antigo é recusado', () => {
  const lista = [ab('a', '2026-10-20', 12600, 5, 30)];
  assert.match(erroDe(entrada({ odometro: '12500' }), lista), /menor que o do abastecimento de 20\/10/);
});

test('odômetro maior que o de um abastecimento mais novo é recusado', () => {
  const lista = [ab('a', '2026-10-27', 12600, 5, 30)];
  assert.match(erroDe(entrada({ data: '2026-10-25', odometro: '12700' }), lista), /maior que o do abastecimento de 27\/10/);
});

test('ao editar, o próprio abastecimento não conta como "outro"; no mesmo dia a ordem é livre', () => {
  const lista = [ab('a', '2026-10-25', 12600, 5, 30), ab('b', '2026-10-25', 12700, 5, 30)];
  const r = validarAbastecimento(entrada({ odometro: '12650' }), lista, { hoje, editandoId: 'a' });
  assert.equal(r.ok, true);
});

test('formatação: km/l com 1 casa e litros sem zeros sobrando', () => {
  assert.equal(kmL(23.2142), '23,2');
  assert.equal(kmL(25), '25,0');
  assert.equal(litrosBR(5.6), '5,6');
  assert.equal(litrosBR(5), '5');
  assert.equal(litrosBR(5.678), '5,68');
});

// ---------- período (semana) ----------

const diaFechado = (data, km, combustivel, kmPorLitro) => ({ data, calculados: { km, combustivel }, snapshot: { kmPorLitro } });

test('semana sem abastecimento: combustível estimado, litros e custo por km vêm dos dias', () => {
  const dias = [diaFechado('2026-10-26', 200, 48, 25), diaFechado('2026-10-27', 199, 47.76, 25)];
  const c = combustivelDoPeriodo(dias, [], ['2026-10-26', '2026-10-27']);
  assert.equal(c.km, 399);
  perto(c.estimadoValor, 95.76);
  perto(c.estimadoLitros, 399 / 25);
  perto(c.porKm, 0.24);
  perto(c.kmPorLitroUsado, 25);
  assert.equal(c.real, null);
});

test('semana com abastecimento: soma o que foi pago e mede o consumo dos trechos da semana', () => {
  const dias = [diaFechado('2026-10-27', 130, 31.2, 25)];
  const lista = [ab('a', '2026-10-26', 1000, 10, 60), ab('b', '2026-10-27', 1130, 5.6, 33.6)];
  const c = combustivelDoPeriodo(dias, lista, ['2026-10-26', '2026-10-27']);
  assert.equal(c.real.abastecimentos, 2);
  perto(c.real.valor, 93.6);
  perto(c.real.litros, 15.6);
  perto(c.real.kmPorLitro, 130 / 5.6);
  perto(c.real.precoMedio, 6);
});

test('semana vazia: tudo zerado e indicadores vazios; dia sem fotografia não quebra', () => {
  const vazio = combustivelDoPeriodo([], [], ['2026-10-26']);
  assert.equal(vazio.estimadoValor, 0);
  assert.equal(vazio.porKm, null);
  assert.equal(vazio.kmPorLitroUsado, null);
  const semFoto = combustivelDoPeriodo([{ data: '2026-10-26', calculados: { km: 100, combustivel: 24 } }], [], ['2026-10-26']);
  assert.equal(semFoto.estimadoLitros, 0);
  perto(semFoto.porKm, 0.24);
});
