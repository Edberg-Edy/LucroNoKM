// Teste de navegador (Chromium de verdade) com o Firebase de mentira: o dia de trabalho do começo ao fim.
// Para rodar: npm run e2e   (precisa de: npm install e npx playwright install chromium)
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { modulos } from './firebase-falso.mjs';

const raiz = fileURLToPath(new URL('..', import.meta.url));
const tipos = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png' };

let servidor;
let navegador;
let pagina;
let url;
const erros = [];

before(async () => {
  servidor = http.createServer(async (req, res) => {
    const caminho = normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^(\.\.[/\\])+/, '');
    try {
      const nome = caminho === '/' || caminho === '\\' ? 'index.html' : caminho;
      const arquivo = await readFile(join(raiz, nome));
      res.writeHead(200, { 'Content-Type': tipos[extname(nome)] || 'application/octet-stream' });
      res.end(arquivo);
    } catch (e) {
      res.writeHead(404).end();
    }
  });
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  url = `http://127.0.0.1:${servidor.address().port}/`;

  navegador = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH, args: ['--no-proxy-server'] } : {});
  const contexto = await navegador.newContext({ serviceWorkers: 'block', viewport: { width: 1280, height: 900 } });
  pagina = await contexto.newPage();
  pagina.on('pageerror', (e) => erros.push(e.message));
  if (process.env.E2E_DEBUG) pagina.on('requestfailed', (r) => console.log('FALHOU', r.url(), r.failure().errorText));
  await pagina.route('https://www.gstatic.com/firebasejs/**', (rota) => {
    const nome = rota.request().url().split('/').pop();
    if (!modulos[nome]) return rota.abort();
    return rota.fulfill({ status: 200, contentType: 'text/javascript', body: modulos[nome] });
  });
});

after(async () => {
  await navegador?.close();
  servidor?.close();
});

const hoje = () => new Date().toLocaleDateString('en-CA'); // aaaa-mm-dd no horário do aparelho

test('abrir o dia, lançar despesa, abastecer e fechar mostra os três cartões', async () => {
  await pagina.goto(url + '#hoje');
  await pagina.fill('#odometro', '1000');
  await pagina.click('[data-acao="abrir"]');
  await pagina.waitForSelector('text=Dia aberto');

  // despesa
  await pagina.fill('#valor', '12,50');
  await pagina.click('[data-acao="lancar"]');
  await pagina.waitForSelector('text=R$ 12,50');

  // abastecimento dentro do dia aberto, sem campo de data
  assert.equal(await pagina.locator('#lugarAbastecer [data-f="data"]').count(), 0);
  await pagina.fill('#lugarAbastecer [data-f="odometro"]', '1040');
  await pagina.fill('#lugarAbastecer [data-f="litros"]', '5');
  await pagina.check('#lugarAbastecer [data-f="cheio"]');
  await pagina.click('#lugarAbastecer [data-acao="registrar"]');
  await pagina.waitForSelector('text=Abastecimento registrado');

  // fechar o dia
  await pagina.fill('[data-f="odometroFinal"]', '1100');
  await pagina.fill('[data-f="horas"]', '8');
  await pagina.fill('[data-f="v0"]', '180,00');
  await pagina.fill('[data-f="c0"]', '9');
  await pagina.click('[data-acao="fechar"]');
  await pagina.waitForSelector('text=Seu dinheiro do dia');

  const texto = await pagina.innerText('#conteudo');
  for (const t of ['Seu dinheiro do dia', 'Gastou no dia', 'Para guardar', 'Total gasto', 'Lucro líquido', 'Livre para gastar', 'Guardar (combustível, moto e custos fixos)']) {
    assert.ok(texto.includes(t), `faltou "${t}" no resultado do dia`);
  }
  assert.match(texto, /Faturamento\s+R\$\s*180,00/);
  assert.match(texto, /Despesas\s+− R\$\s*12,50/);
});

test('o histórico mostra a meta da semana e o abastecimento do mês', async () => {
  await pagina.click('#abas [data-aba="historico"]');
  await pagina.waitForSelector('text=Meta da semana');
  assert.ok((await pagina.innerText('#conteudo')).includes('Faturamento'));

  await pagina.click('[data-modo="combustivel"]');
  await pagina.waitForSelector('text=Abastecimentos do mês');
  const texto = await pagina.innerText('#conteudo');
  assert.ok(texto.includes('1040 km'));
  assert.ok(texto.includes('tanque cheio'));
  assert.ok(texto.includes(hoje().slice(8, 10)));
});

test('o histórico carrega só o ano da tela e busca o outro ano quando preciso', async () => {
  // Cria um dia fechado em outro ano, copiando o formato real de um dia que o app gravou
  const ano = String(Number(hoje().slice(0, 4)) - 1);
  await pagina.evaluate((anoAnterior) => {
    const [caminho, dia] = [...window.__dadosFalsos].find(([c, d]) => c.includes('/dias/') && d.aberto === false);
    window.__dadosFalsos.set(caminho.replace(/[^/]+$/, 'dia-do-ano-passado'), { ...dia, data: `${anoAnterior}-06-15` });
  }, ano);

  await pagina.click('#abas [data-aba="ajustes"]');
  await pagina.waitForSelector('text=Diagnóstico');
  await pagina.evaluate(() => { window.__consultas = []; });
  await pagina.click('#abas [data-aba="historico"]');
  await pagina.waitForSelector('text=Meta da semana');

  const consultas = await pagina.evaluate(() => window.__consultas);
  assert.ok(consultas.some((c) => c.includes(`${hoje().slice(0, 4)}-01-01`)), 'deveria buscar o ano de hoje');
  assert.ok(!consultas.some((c) => c.includes(`${ano}-01-01`)), 'não deveria buscar o ano passado ainda');

  await pagina.click('[data-modo="ano"]');
  await pagina.click('[data-ano="anterior"]');
  await pagina.waitForSelector(`text=${ano}`);
  const depois = await pagina.evaluate(() => window.__consultas);
  assert.ok(depois.some((c) => c.includes(`${ano}-01-01`)), 'deveria buscar o ano passado ao navegar');
  assert.match(await pagina.innerText('#conteudo'), /180,00/);
});

test('o logo da barra leva para o início', async () => {
  await pagina.click('#abas [data-aba="ajustes"]');
  await pagina.waitForSelector('text=Diagnóstico');
  await pagina.click('#abas .logo');
  await pagina.waitForURL(/#hoje$/);
  await pagina.waitForSelector('#abas [data-aba="hoje"][aria-current="page"]');
});

test('nenhum erro de script durante o fluxo', async () => {
  assert.deepEqual(erros, []);
  // Com E2E_SALVAR_DOCS=1, guarda os documentos que o app gravou: eles alimentam o teste das regras do Firestore (regras/)
  if (process.env.E2E_SALVAR_DOCS) {
    const docs = await pagina.evaluate(() => [...window.__dadosFalsos].filter(([c]) => !c.endsWith('dia-do-ano-passado')));
    await writeFile(join(raiz, 'regras', 'documentos-reais.json'), JSON.stringify(docs, null, 2) + '\n');
  }
  const guardados = await pagina.evaluate(() => localStorage.getItem('lucronokm.erros'));
  assert.equal(guardados, null);
});
