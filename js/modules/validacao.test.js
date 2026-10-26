// Testes da conferência dos Ajustes. Para rodar: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validarCampoAjuste } from './validacao.js';

test('campos que precisam ser maiores que zero recusam vazio, zero e texto', () => {
  for (const chave of ['kmPorLitro', 'precoLitro', 'diasPorMes', 'manutencao.0.duracaoKm']) {
    assert.equal(validarCampoAjuste(chave, '').ok, false, `${chave} vazio`);
    assert.equal(validarCampoAjuste(chave, '   ').ok, false, `${chave} só espaços`);
    assert.equal(validarCampoAjuste(chave, '0').ok, false, `${chave} zero`);
    assert.equal(validarCampoAjuste(chave, 'abc').ok, false, `${chave} texto`);
  }
  assert.match(validarCampoAjuste('kmPorLitro', '').erro, /Km por litro/);
  assert.match(validarCampoAjuste('kmPorLitro', '0').erro, /maior que zero/);
});

test('campos que aceitam zero: vazio vira 0, mas texto continua recusado', () => {
  for (const chave of ['meta', 'contasMes', 'limiteMei', 'manutencao.2.preco', 'fixos.1.valorMensal']) {
    assert.deepEqual(validarCampoAjuste(chave, ''), { ok: true, valor: 0 });
    assert.deepEqual(validarCampoAjuste(chave, '0'), { ok: true, valor: 0 });
    assert.equal(validarCampoAjuste(chave, 'x').ok, false);
  }
});

test('valores normais passam, com vírgula, ponto decimal e ponto de milhar', () => {
  assert.deepEqual(validarCampoAjuste('kmPorLitro', '25'), { ok: true, valor: 25 });
  assert.deepEqual(validarCampoAjuste('precoLitro', '6,2'), { ok: true, valor: 6.2 });
  assert.deepEqual(validarCampoAjuste('precoLitro', '6.20'), { ok: true, valor: 6.2 });
  assert.deepEqual(validarCampoAjuste('contasMes', '7.000'), { ok: true, valor: 7000 });
  assert.deepEqual(validarCampoAjuste('limiteMei', '81.000'), { ok: true, valor: 81000 });
  assert.deepEqual(validarCampoAjuste('manutencao.0.duracaoKm', '1.000'), { ok: true, valor: 1000 });
  assert.deepEqual(validarCampoAjuste('fixos.1.valorMensal', '86,05'), { ok: true, valor: 86.05 });
});

test('dias por mês é inteiro entre 1 e 31', () => {
  assert.deepEqual(validarCampoAjuste('diasPorMes', '26'), { ok: true, valor: 26 });
  assert.deepEqual(validarCampoAjuste('diasPorMes', '25,6'), { ok: true, valor: 26 });
  assert.deepEqual(validarCampoAjuste('diasPorMes', '0,4'), { ok: true, valor: 1 });
  assert.equal(validarCampoAjuste('diasPorMes', '32').ok, false);
});

test('valores absurdos (erro de digitação) são recusados', () => {
  assert.equal(validarCampoAjuste('kmPorLitro', '2500').ok, false);
  assert.equal(validarCampoAjuste('precoLitro', '620').ok, false);
  assert.match(validarCampoAjuste('precoLitro', '620').erro, /alto demais/);
});

test('número negativo e campo desconhecido são recusados', () => {
  assert.equal(validarCampoAjuste('meta', '-5').ok, false);
  assert.equal(validarCampoAjuste('inexistente', '5').ok, false);
});
