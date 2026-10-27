// Testes do texto do indicador de sincronização. Para rodar: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { textoSincronia } from './sincronia.js';

test('com sinal e nada pendente: não mostra nada', () => {
  assert.equal(textoSincronia({ online: true, pendentes: 0 }), null);
});

test('com sinal e alterações a caminho: enviando', () => {
  assert.match(textoSincronia({ online: true, pendentes: 2 }), /Enviando/);
});

test('sem sinal: avisa que dá para continuar usando', () => {
  assert.match(textoSincronia({ online: false, pendentes: 0 }), /Sem sinal.*continuar usando/);
});

test('sem sinal com pendências: conta as alterações guardadas', () => {
  assert.match(textoSincronia({ online: false, pendentes: 1 }), /1 alteração guardada/);
  assert.match(textoSincronia({ online: false, pendentes: 3 }), /3 alterações guardadas/);
});
