// Testes do registro local de erros. Para rodar: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registrarErro, lerErros, limparErros, textoDiagnostico } from './erros.js';

const armazemFalso = () => {
  const m = {};
  return { getItem: (k) => m[k] ?? null, setItem: (k, v) => { m[k] = v; }, removeItem: (k) => { delete m[k]; } };
};
const quando = (s) => new Date(`2026-11-04T10:00:${String(s).padStart(2, '0')}Z`);

test('guarda o erro com origem, mensagem e horário', () => {
  const armazem = armazemFalso();
  registrarErro('janela', new Error('quebrou'), { agora: quando(1), armazem });
  const [e] = lerErros(armazem);
  assert.equal(e.origem, 'janela');
  assert.equal(e.mensagem, 'quebrou');
  assert.equal(e.quando, '2026-11-04T10:00:01.000Z');
  assert.equal(e.vezes, 1);
});

test('erro repetido em sequência só aumenta o contador', () => {
  const armazem = armazemFalso();
  for (let i = 0; i < 5; i++) registrarErro('promessa', 'falhou', { agora: quando(i), armazem });
  const lista = lerErros(armazem);
  assert.equal(lista.length, 1);
  assert.equal(lista[0].vezes, 5);
});

test('guarda no máximo os 20 últimos', () => {
  const armazem = armazemFalso();
  for (let i = 0; i < 30; i++) registrarErro('janela', `erro ${i}`, { agora: quando(i), armazem });
  const lista = lerErros(armazem);
  assert.equal(lista.length, 20);
  assert.equal(lista[0].mensagem, 'erro 10');
});

test('mensagem enorme é cortada e armazenamento quebrado não derruba o app', () => {
  const armazem = armazemFalso();
  registrarErro('janela', 'x'.repeat(5000), { armazem });
  assert.equal(lerErros(armazem)[0].mensagem.length, 300);
  const quebrado = { getItem: () => '{não é json', setItem: () => { throw new Error('cheio'); }, removeItem: () => {} };
  assert.deepEqual(lerErros(quebrado), []);
  assert.doesNotThrow(() => registrarErro('janela', 'a', { armazem: quebrado }));
});

test('limpar apaga tudo e o diagnóstico sai em texto', () => {
  const armazem = armazemFalso();
  registrarErro('janela', new Error('quebrou'), { agora: quando(1), armazem });
  const texto = textoDiagnostico(lerErros(armazem), { versao: 'lucronokm-v26', agente: 'Teste' });
  assert.match(texto, /LucroNoKM lucronokm-v26/);
  assert.match(texto, /\[janela\] quebrou/);
  limparErros(armazem);
  assert.deepEqual(lerErros(armazem), []);
  assert.match(textoDiagnostico([]), /Erros guardados: 0/);
});
