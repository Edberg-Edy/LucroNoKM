// Testa as regras do Firestore no emulador, com documentos REAIS gerados pelo app (documentos-reais.json).
// Se um documento que o app grava de verdade for recusado, este teste falha antes de você publicar as regras.
// Rodar: npm run regras   (precisa de Java; o emulador é baixado na primeira vez)
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';

const reais = JSON.parse(readFileSync(new URL('./documentos-reais.json', import.meta.url), 'utf8'));
const UID = 'u1';
const caminhoDe = (c) => c.replace('users/u-e2e/', `users/${UID}/`);

let ambiente;
before(async () => {
  ambiente = await initializeTestEnvironment({
    projectId: 'demo-lucronokm',
    firestore: { rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8') },
  });
});
after(async () => ambiente?.cleanup());
beforeEach(async () => ambiente.clearFirestore());

const dono = () => ambiente.authenticatedContext(UID).firestore();
const outro = () => ambiente.authenticatedContext('u2').firestore();
const anonimo = () => ambiente.unauthenticatedContext().firestore();
const achar = (trecho, filtro = () => true) => reais.find(([c, d]) => c.includes(trecho) && filtro(d));

test('o dono grava, lê, atualiza e apaga cada tipo de documento que o app cria', async () => {
  const tipos = [
    ['/config/', () => true],
    ['/dias/', (d) => d.aberto === false],
    ['/abastecimentos/', () => true],
  ];
  for (const [trecho, filtro] of tipos) {
    const par = achar(trecho, filtro);
    assert.ok(par, `o arquivo documentos-reais.json não tem ${trecho}`);
    const ref = doc(dono(), caminhoDe(par[0]));
    await assertSucceeds(setDoc(ref, par[1]));
    await assertSucceeds(getDoc(ref));
    await assertSucceeds(updateDoc(ref, { teste: 1 }));
    await assertSucceeds(deleteDoc(ref));
  }
});

test('um dia ainda aberto (como o app cria ao abrir o dia) também é aceito', async () => {
  const aberto = { aberto: true, data: '2026-11-04', odometroInicial: 1811, despesas: [], plataformas: [], criadoEm: new Date() };
  await assertSucceeds(setDoc(doc(dono(), `users/${UID}/dias/novo`), aberto));
  await assertSucceeds(updateDoc(doc(dono(), `users/${UID}/dias/novo`), { despesas: [{ categoria: 'Comida', valor: 12.5 }] }));
});

test('mês: fechar, reabrir, checklist e observação com merge', async () => {
  const ref = doc(dono(), `users/${UID}/meses/2026-10`);
  await assertSucceeds(setDoc(ref, { fechado: true, totais: { lucro: 100 } }, { merge: true }));
  await assertSucceeds(setDoc(ref, { checklist: { dasPago: true }, observacao: 'ok' }, { merge: true }));
  await assertSucceeds(setDoc(ref, { fechado: false }, { merge: true }));
});

test('quem não é o dono (outro usuário ou sem login) não lê nem grava', async () => {
  const par = achar('/dias/', (d) => d.aberto === false);
  const caminho = caminhoDe(par[0]);
  await assertSucceeds(setDoc(doc(dono(), caminho), par[1]));
  for (const banco of [outro(), anonimo()]) {
    await assertFails(getDoc(doc(banco, caminho)));
    await assertFails(setDoc(doc(banco, caminho), par[1]));
    await assertFails(deleteDoc(doc(banco, caminho)));
  }
});

test('documentos quebrados são recusados', async () => {
  const dia = achar('/dias/', (d) => d.aberto === false)[1];
  const ab = achar('/abastecimentos/')[1];
  const ref = (p) => doc(dono(), `users/${UID}/${p}`);

  const diaSemData = { ...dia };
  delete diaSemData.data;
  await assertFails(setDoc(ref('dias/a'), diaSemData)); // sem data
  await assertFails(setDoc(ref('dias/b'), { ...dia, data: 20261104 })); // data que não é texto
  await assertFails(setDoc(ref('dias/c'), { ...dia, aberto: 'sim' }));
  await assertFails(setDoc(ref('dias/d'), { ...dia, despesas: Array.from({ length: 301 }, () => ({ valor: 1 })) }));
  await assertFails(setDoc(ref('abastecimentos/a'), { ...ab, litros: 0 }));
  await assertFails(setDoc(ref('abastecimentos/b'), { ...ab, litros: -3 }));
  await assertFails(setDoc(ref('abastecimentos/c'), { ...ab, litros: '5' }));
  await assertFails(setDoc(ref('abastecimentos/d'), { ...ab, valor: -1 }));
  await assertFails(setDoc(ref('abastecimentos/e'), { ...ab, odometro: 'abc' }));
  await assertFails(setDoc(ref('meses/2026-10'), { observacao: 'x'.repeat(2001) }));
});

test('coleções que o app não usa ficam bloqueadas, mesmo para o dono', async () => {
  await assertFails(setDoc(doc(dono(), `users/${UID}/outra/x`), { a: 1 }));
  await assertFails(setDoc(doc(dono(), `users/${UID}`), { a: 1 }));
  await assertFails(getDoc(doc(dono(), 'publico/x')));
});
