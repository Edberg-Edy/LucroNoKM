// Testes do cartão de boas-vindas. Para rodar: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mostrarBoasVindas, htmlBoasVindas } from './boasvindas.js';

test('aparece só para quem ainda não lançou dia, sem dia aberto e sem ter dispensado', () => {
  assert.equal(mostrarBoasVindas({ temDias: false, diaAberto: false, dispensado: false }), true);
  assert.equal(mostrarBoasVindas({ temDias: true, diaAberto: false, dispensado: false }), false);
  assert.equal(mostrarBoasVindas({ temDias: false, diaAberto: true, dispensado: false }), false);
  assert.equal(mostrarBoasVindas({ temDias: false, diaAberto: false, dispensado: true }), false);
});

test('o texto explica os passos e leva à política de privacidade', () => {
  const html = htmlBoasVindas();
  assert.match(html, /Bem-vindo ao LucroNoKM/);
  assert.match(html, /Ajustes/);
  assert.match(html, /href="privacidade\.html"/);
  assert.match(html, /data-acao="irAjustes"/);
  assert.match(html, /data-acao="dispensarBoasVindas"/);
});
