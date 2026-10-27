// Testes da gravação sem travar. Para rodar: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gravar, pendentes, observarPendentes } from './gravacao.js';

const depois = (ms, valor, falha = false) =>
  new Promise((resolve, reject) => setTimeout(() => (falha ? reject(valor) : resolve(valor)), ms));

test('servidor confirma a tempo: sincronizado', async () => {
  assert.deepEqual(await gravar(depois(5, 'ok'), 100), { sincronizado: true });
});

test('servidor demora: segue em frente como pendente', async () => {
  const inicio = Date.now();
  assert.deepEqual(await gravar(depois(300, 'ok'), 30), { sincronizado: false });
  assert.ok(Date.now() - inicio < 200, 'não deveria esperar o servidor');
});

test('servidor recusa a tempo: o erro chega a quem chamou', async () => {
  const erro = new Error('permission-denied');
  await assert.rejects(gravar(depois(5, erro, true), 100), (e) => e === erro);
});

test('recusa depois do prazo não derruba o app', async () => {
  const resultado = await gravar(depois(60, new Error('tarde'), true), 20);
  assert.deepEqual(resultado, { sincronizado: false });
  await depois(80, null); // dá tempo da recusa tardia acontecer sem erro não tratado
});

test('o contador de pendentes sobe ao gravar e desce quando o servidor responde', async () => {
  const avisos = [];
  const parar = observarPendentes((n) => avisos.push(n));
  const base = pendentes();

  let responder; // o "servidor" só responde quando mandarmos (sem depender de tempo)
  const servidor = new Promise((resolve) => (responder = resolve));
  const g = gravar(servidor, 5); // prazo curto: o app segue em frente como pendente

  assert.equal(pendentes(), base + 1);
  assert.deepEqual(await g, { sincronizado: false });
  assert.equal(pendentes(), base + 1); // o servidor ainda não respondeu

  responder('ok');
  await servidor;
  await new Promise((resolve) => setImmediate(resolve)); // deixa o contador processar a resposta
  assert.equal(pendentes(), base);
  parar();
  assert.deepEqual(avisos.slice(-2), [base + 1, base]);
});

test('gravação recusada também deixa de contar como pendente', async () => {
  const base = pendentes();
  await assert.rejects(gravar(depois(5, new Error('x'), true), 100));
  assert.equal(pendentes(), base);
});
