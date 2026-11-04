// Guarda da versão do cache. Para rodar: npm test
// Se um arquivo do app mudou e a VERSAO do sw.js não subiu, quem já abriu o app continua vendo a versão velha (cache antigo).
// Compara com o último commit (se há mudanças ainda não commitadas) ou com o commit anterior (árvore limpa, como no GitHub Actions).
// Sem git disponível, o teste só avisa e passa.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const raiz = fileURLToPath(new URL('.', import.meta.url));
const git = (...args) => {
  try {
    return execFileSync('git', args, { cwd: raiz, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch (e) {
    return null;
  }
};

const versaoDe = (texto) => {
  const m = /const VERSAO = 'lucronokm-v(\d+)';/.exec(texto || '');
  return m ? Number(m[1]) : null;
};
// Arquivos que o usuário recebe (e que o service worker guarda). Testes e documentos não contam.
const ehDoApp = (caminho) =>
  /^(index\.html|manifest\.webmanifest|css\/|js\/|assets\/)/.test(caminho) && !/\.test\.js$/.test(caminho);

test('a versão do cache sobe quando um arquivo do app muda', (t) => {
  if (git('rev-parse', '--is-inside-work-tree') === null) return t.skip('sem git: não deu para comparar');

  const sujos = (git('status', '--porcelain') || '')
    .split('\n')
    .filter(Boolean)
    .map((linha) => linha.slice(3).replace(/^"|"$/g, ''));

  let base;
  let mudou;
  if (sujos.length > 0) {
    base = 'HEAD'; // mudanças ainda não commitadas: compara com o último commit
    mudou = sujos.filter(ehDoApp);
  } else {
    base = 'HEAD~1'; // árvore limpa: compara o último commit com o anterior
    const lista = git('diff', '--name-only', 'HEAD~1', 'HEAD');
    if (lista === null) return t.skip('só há um commit: nada para comparar');
    mudou = lista.split('\n').filter(Boolean).filter(ehDoApp);
  }

  const atual = versaoDe(readFileSync(raiz + 'sw.js', 'utf8'));
  const anterior = versaoDe(git('show', `${base}:sw.js`));
  if (anterior === null) return t.skip('não achei o sw.js da versão anterior');

  if (mudou.length > 0) {
    assert.ok(
      atual > anterior,
      `Mudou ${mudou.slice(0, 3).join(', ')}${mudou.length > 3 ? ' e mais' : ''}, mas a VERSAO do sw.js continua v${atual} (antes: v${anterior}). Aumente o número.`
    );
  }
  assert.ok(atual >= anterior, `A VERSAO do sw.js caiu de v${anterior} para v${atual}.`);
});
