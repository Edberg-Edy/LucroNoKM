// Testes das contas. Para rodar: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { padroes } from '../config/padroes.js';
import { manutencaoPorKm, fixoPorDia, parametrosDoDia, farol, lerHoras, calcularDia, recalcularDiaFechado } from './calculos.js';

// Dois números são "quase iguais" se diferem menos de meio centavo
const quase = (a, b) => assert.ok(Math.abs(a - b) < 0.005, `${a} deveria ser quase ${b}`);

const p = parametrosDoDia(padroes());

// Dia de exemplo: 100 km, iFood R$ 120 (7 corridas) e Particular R$ 50 (2 corridas), sem despesas
const diaExemplo = {
  odometroInicial: 1000,
  odometroFinal: 1100,
  horas: 8,
  plataformas: [
    { nome: 'iFood', valor: 120, corridas: 7 },
    { nome: 'Particular', valor: 50, corridas: 2 },
  ],
  despesas: [],
};

test('parâmetros padrão: manutenção por km e custo fixo por dia', () => {
  assert.equal(manutencaoPorKm(padroes().manutencao), 0.171);
  quase(fixoPorDia(padroes().fixos, 24), 6.09);
});

test('dia de exemplo: combustível, manutenção e fixos', () => {
  const r = calcularDia(diaExemplo, p);
  assert.equal(r.km, 100);
  assert.equal(r.faturamento, 170);
  quase(r.combustivel, 17.71);
  quase(r.manutencao, 17.1);
  quase(r.fixos, 6.09);
});

test('dia de exemplo: lucro, guardar e farol amarelo', () => {
  const r = calcularDia(diaExemplo, p);
  quase(r.lucro, 129.1);
  quase(r.guardar, 23.19);
  quase(r.livre, 129.1);
  assert.equal(r.status, 'amarelo'); // abaixo da meta de R$ 200
});

test('dia de exemplo: indicadores por km, hora e corrida', () => {
  const r = calcularDia(diaExemplo, p);
  quase(r.ganhoPorKm, 1.7);
  quase(r.lucroPorHora, 16.14);
  assert.equal(r.corridas, 9);
  quase(r.ganhoPorCorrida, 18.89);
});

test('sem horas e sem corridas, os indicadores ficam vazios (null)', () => {
  const r = calcularDia({ ...diaExemplo, horas: null, plataformas: [{ nome: 'iFood', valor: 120 }] }, p);
  assert.equal(r.lucroPorHora, null);
  assert.equal(r.ganhoPorCorrida, null);
});

test('ganho por corrida usa só as plataformas que informaram corridas', () => {
  const r = calcularDia(
    { ...diaExemplo, plataformas: [{ nome: 'A', valor: 100, corridas: 4 }, { nome: 'B', valor: 50 }] },
    p
  );
  quase(r.ganhoPorCorrida, 25); // 100 ÷ 4, sem contar os 50 da plataforma sem corridas
});

test('despesas diminuem o lucro, mas não mudam o valor a guardar', () => {
  const sem = calcularDia(diaExemplo, p);
  const com = calcularDia({ ...diaExemplo, despesas: [{ categoria: 'Comida', valor: 30 }] }, p);
  quase(com.lucro, sem.lucro - 30);
  quase(com.guardar, sem.guardar);
});

test('farol: verde, amarelo e vermelho', () => {
  assert.equal(farol(200, 200), 'verde');
  assert.equal(farol(0.01, 200), 'amarelo');
  assert.equal(farol(0, 200), 'vermelho');
  assert.equal(farol(-15, 200), 'vermelho');
  assert.equal(farol(0, 0), 'vermelho'); // meta zerada e lucro zero não é verde
  assert.equal(farol(10, 0), 'verde');
  const verde = calcularDia({ ...diaExemplo, plataformas: [{ nome: 'iFood', valor: 400 }] }, p);
  assert.equal(verde.status, 'verde');
  const prejuizo = calcularDia({ ...diaExemplo, plataformas: [{ nome: 'iFood', valor: 20 }] }, p);
  assert.equal(prejuizo.status, 'vermelho');
});

test('odômetro final menor ou igual ao inicial é recusado', () => {
  assert.throws(() => calcularDia({ ...diaExemplo, odometroFinal: 1000 }, p), RangeError);
  assert.throws(() => calcularDia({ ...diaExemplo, odometroFinal: 900 }, p), RangeError);
});

test('lerHoras aceita 8, 8,5 e 8:30', () => {
  assert.equal(lerHoras('8'), 8);
  assert.equal(lerHoras('8,5'), 8.5);
  assert.equal(lerHoras('8:30'), 8.5);
  assert.equal(lerHoras(''), null);
  assert.equal(lerHoras('abc'), null);
  assert.equal(lerHoras('0'), null);
  assert.equal(lerHoras('99'), null);
  assert.equal(lerHoras('24'), 24);
  assert.equal(lerHoras('8:75'), null);
});

test('recalcularDiaFechado usa os parâmetros novos e guarda a nova fotografia', () => {
  const antigo = calcularDia(diaExemplo, p);
  const novos = { ...p, precoLitro: p.precoLitro + 1, meta: 999 };
  const { snapshot, calculados } = recalcularDiaFechado(diaExemplo, novos);

  assert.equal(snapshot, novos);
  assert.equal(calculados.faturamento, antigo.faturamento); // ganhos não mudam
  assert.ok(calculados.combustivel > antigo.combustivel); // litro mais caro, mais combustível
  assert.ok(calculados.lucro < antigo.lucro);
  quase(calculados.lucro, calculados.faturamento - calculados.gastos);
  assert.equal(calculados.status, farol(calculados.lucro, 999)); // a meta nova (999) entra no farol
});

test('recalcularDiaFechado recusa dia com odômetro inválido', () => {
  assert.throws(() => recalcularDiaFechado({ ...diaExemplo, odometroFinal: 1000 }, p), RangeError);
});
