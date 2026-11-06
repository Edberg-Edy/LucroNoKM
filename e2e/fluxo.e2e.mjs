// Teste de navegador (Chromium de verdade) com o Firebase de mentira: o dia de trabalho do começo ao fim.
// Para rodar: npm run e2e   (precisa de: npm install e npx playwright install chromium)
/* global axe */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';
import { modulos } from './firebase-falso.mjs';

const raiz = fileURLToPath(new URL('..', import.meta.url));
const axePath = createRequire(import.meta.url).resolve('axe-core/axe.min.js');
const tipos = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png' };

let servidor;
let navegador;
let contexto;
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
  contexto = await navegador.newContext({ serviceWorkers: 'block', viewport: { width: 1280, height: 900 } });
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

// Acessibilidade: roda o axe (regras WCAG 2.1 A/AA e boas práticas) na tela atual e exige zero problemas
async function semViolacoes(nome, p = pagina) {
  await p.addScriptTag({ path: axePath });
  const r = await p.evaluate(() =>
    axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] })
  );
  assert.deepEqual(
    r.violations.map((v) => `${v.id}: ${v.nodes[0].target.join(' ')}`),
    [],
    `problemas de acessibilidade em ${nome}`
  );
}

const hoje = () => new Date().toLocaleDateString('en-CA'); // aaaa-mm-dd no horário do aparelho

test('abrir o dia, lançar despesa, abastecer e fechar mostra os três cartões', async () => {
  await pagina.goto(url + '#hoje');
  // primeiro acesso: cartão de boas-vindas
  await pagina.waitForSelector('text=Bem-vindo ao LucroNoKM');
  await semViolacoes('Hoje (primeiro acesso)');
  await pagina.click('[data-acao="dispensarBoasVindas"]');
  assert.equal(await pagina.locator('text=Bem-vindo ao LucroNoKM').count(), 0);
  await pagina.fill('#odometro', '1000');
  await pagina.click('[data-acao="abrir"]');
  await pagina.waitForSelector('text=Dia aberto');

  // despesa
  await pagina.fill('#valor', '12,50');
  await pagina.click('[data-acao="lancar"]');
  await pagina.waitForSelector('text=R$ 12,50');

  await semViolacoes('dia aberto');

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

  await semViolacoes('resultado do dia');
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
  await semViolacoes('histórico (semana)');
  for (const modo of ['mes', 'ano']) {
    await pagina.click(`[data-modo="${modo}"]`);
    await pagina.waitForSelector(`[data-modo="${modo}"][aria-pressed="true"]`);
    await semViolacoes(`histórico (${modo})`);
  }

  await pagina.click('[data-modo="combustivel"]');
  await pagina.waitForSelector('text=Abastecimentos do mês');
  const texto = await pagina.innerText('#conteudo');
  assert.ok(texto.includes('1040 km'));
  assert.ok(texto.includes('tanque cheio'));
  assert.ok(texto.includes(hoje().slice(8, 10)));
  await semViolacoes('histórico (combustível)');
});

test('Ajustes e a política de privacidade não têm problemas de acessibilidade', async () => {
  await pagina.click('#abas [data-aba="ajustes"]');
  await pagina.waitForSelector('text=Seus dados e privacidade');
  await semViolacoes('Ajustes');
  const outra = await contexto.newPage();
  await outra.goto(url + 'privacidade.html');
  await outra.waitForSelector('text=Política de privacidade');
  await semViolacoes('política de privacidade', outra);
  await outra.close();
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

test('texto malicioso nos campos livres nunca vira HTML nem executa script', async () => {
  // Dois formatos de ataque: tag solta (cai em texto) e fechamento de atributo (cai em value="...")
  const tag = '<img src=x onerror="window.__xss=1">';
  const atributo = '"><img src=x onerror="window.__xss=1">';
  await pagina.evaluate(([tag, atributo]) => {
    const dados = window.__dadosFalsos;
    const chave = (parte) => [...dados.keys()].find((c) => c.includes(parte));
    const config = dados.get(chave('/config/'));
    config.plataformas = [tag, atributo, 'Keeta'];
    config.manutencao[0].item = atributo;
    config.fixos[0].item = tag;
    const [caminhoDia, dia] = [...dados].find(([c, d]) => c.includes('/dias/') && d.aberto === false && !c.endsWith('do-ano-passado'));
    const base = caminhoDia.replace(/[^/]+$/, '');
    dados.set(caminhoDia, { ...dia, plataformas: [{ nome: tag, valor: 10, corridas: 1 }, { nome: atributo, valor: 5, corridas: 1 }], despesas: [{ categoria: tag, valor: 1 }] });
    dados.set(base + 'aberto-malicioso', { aberto: true, data: '2099-01-01', odometroInicial: 1, despesas: [{ categoria: tag, valor: 2 }, { categoria: atributo, valor: 3 }], plataformas: [] });
    const ym = dia.data.slice(0, 7);
    dados.set(base.replace('/dias/', '/meses/') + ym, { observacao: atributo, checklist: {} });
  }, [tag, atributo]);

  // Hoje com o dia aberto malicioso
  await pagina.click('#abas [data-aba="ajustes"]');
  await pagina.waitForSelector('text=Seus dados e privacidade');
  await pagina.click('#abas [data-aba="hoje"]');
  await pagina.waitForSelector('text=Despesas do dia');
  // Histórico: semana (abre o detalhe do dia), mês, ano e combustível
  await pagina.click('#abas [data-aba="historico"]');
  await pagina.waitForSelector('text=Meta da semana');
  const ver = pagina.locator('[data-ver]').first();
  if (await ver.count()) {
    await ver.click();
    await pagina.waitForSelector('text=Seu dinheiro do dia');
    await pagina.click('[data-acao="voltar"]');
  }
  for (const modo of ['mes', 'ano', 'combustivel']) {
    await pagina.click(`[data-modo="${modo}"]`);
    await pagina.waitForSelector(`[data-modo="${modo}"][aria-pressed="true"]`);
  }
  await pagina.click('#abas [data-aba="ajustes"]');
  await pagina.waitForSelector('text=Seus dados e privacidade');

  assert.equal(await pagina.evaluate(() => window.__xss), undefined, 'um script do texto digitado foi executado');
  assert.equal(await pagina.locator('img[src="x"]').count(), 0, 'texto digitado virou uma tag <img>');
});

test('apagar todos os meus dados esvazia a conta e volta ao primeiro acesso', async () => {
  await pagina.click('#abas [data-aba="ajustes"]');
  await pagina.waitForSelector('text=Seus dados e privacidade');
  await pagina.click('[data-acao="pedirApagar"]');
  await pagina.fill('#textoApagar', 'apagar');
  await pagina.click('[data-acao="confirmarApagar"]');
  await pagina.waitForSelector('text=Seus dados foram apagados');

  const sobrou = await pagina.evaluate(() =>
    [...window.__dadosFalsos.keys()].filter((c) => /\/(dias|abastecimentos|meses)\//.test(c))
  );
  assert.deepEqual(sobrou, []);

  await pagina.click('#abas [data-aba="hoje"]');
  await pagina.waitForSelector('text=Bem-vindo ao LucroNoKM');
  assert.deepEqual(erros, []);
});

test('toque duplo não cria dois dias abertos nem dois abastecimentos', async () => {
  const contar = (trecho, campo, valor) =>
    pagina.evaluate(([t, c, v]) => [...window.__dadosFalsos].filter(([k, d]) => k.includes(t) && (c === null || d[c] === v)).length, [trecho, campo, valor]);

  await pagina.goto(url + '#hoje');
  await pagina.reload();
  await pagina.waitForSelector('[data-acao="dispensarBoasVindas"], #odometro');
  if (await pagina.locator('[data-acao="dispensarBoasVindas"]').count()) await pagina.click('[data-acao="dispensarBoasVindas"]');
  await pagina.waitForSelector('#odometro');
  await pagina.fill('#odometro', '2000');
  await pagina.dblclick('[data-acao="abrir"]');
  await pagina.waitForSelector('text=Dia aberto');
  assert.equal(await contar('/dias/', 'aberto', true), 1, 'dois dias abertos foram criados');

  await pagina.fill('#lugarAbastecer [data-f="odometro"]', '2040');
  await pagina.fill('#lugarAbastecer [data-f="litros"]', '4');
  await pagina.dblclick('#lugarAbastecer [data-acao="registrar"]');
  await pagina.waitForTimeout(800);
  assert.equal(await contar('/abastecimentos/', null, null), 1, 'o abastecimento foi criado duas vezes');
  assert.deepEqual(erros, []);
});
