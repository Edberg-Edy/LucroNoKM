// Testes da conferência das leituras do Firestore. Para rodar: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { naoVazioDoCache, exigirServidor } from './leitura.js';

const lista = (fromCache, vazio) => ({ metadata: { fromCache }, empty: vazio, docs: [] });

test('lista vazia que veio só do aparelho não vale (podia ter dados no servidor)', () => {
  assert.throws(() => naoVazioDoCache(lista(true, true)), { code: 'sem-servidor' });
});

test('lista vazia do servidor e lista com dados do aparelho valem', () => {
  assert.doesNotThrow(() => naoVazioDoCache(lista(false, true)));
  assert.doesNotThrow(() => naoVazioDoCache(lista(true, false)));
});

test('backup e exclusão exigem a lista completa do servidor', () => {
  assert.throws(() => exigirServidor(lista(true, false)), { code: 'sem-servidor' });
  assert.doesNotThrow(() => exigirServidor(lista(false, false)));
  assert.doesNotThrow(() => exigirServidor({ docs: [] })); // sem metadados: não dá para saber, deixa passar
});
