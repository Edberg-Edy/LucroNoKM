// Confere a lista de arquivos do service worker. Para rodar: npm test
// Se um arquivo da lista não existir, a instalação do service worker falha e o app perde o modo offline sem avisar.
// Se um arquivo do app faltar na lista, ele não é guardado para abrir sem internet.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = fileURLToPath(new URL('.', import.meta.url));
const codigo = readFileSync(join(raiz, 'sw.js'), 'utf8');

// Lê a lista ARQUIVOS e a VERSAO direto do texto do sw.js
const bloco = codigo.match(/const ARQUIVOS = \[([\s\S]*?)\];/);
const arquivos = bloco ? [...bloco[1].matchAll(/'([^']+)'/g)].map((m) => m[1]) : [];

function jsDoApp(pasta) {
  return readdirSync(pasta).flatMap((nome) => {
    const caminho = join(pasta, nome);
    if (statSync(caminho).isDirectory()) return jsDoApp(caminho);
    return nome.endsWith('.js') && !nome.endsWith('.test.js') ? [caminho] : [];
  });
}

test('a versão do cache tem o formato lucronokm-vN', () => {
  assert.match(codigo, /const VERSAO = 'lucronokm-v\d+';/);
});

test('a lista de arquivos foi lida e não tem repetidos', () => {
  assert.ok(arquivos.length > 10);
  assert.equal(new Set(arquivos).size, arquivos.length);
});

test('todo arquivo da lista existe no projeto', () => {
  for (const arquivo of arquivos) {
    if (arquivo === './') continue; // a página inicial
    assert.ok(existsSync(join(raiz, arquivo)), `${arquivo} está na lista do sw.js mas não existe`);
  }
});

test('todo arquivo .js do app (fora os testes) está na lista', () => {
  const faltando = jsDoApp(join(raiz, 'js'))
    .map((c) => './' + relative(raiz, c).split(sep).join('/'))
    .filter((c) => !arquivos.includes(c));
  assert.deepEqual(faltando, [], `faltam no sw.js: ${faltando.join(', ')}`);
});
