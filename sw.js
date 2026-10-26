// Service worker do LucroNoKM: guarda o app no aparelho para abrir sem internet.
// Os DADOS (dias, ajustes, abastecimentos) não passam por aqui: o próprio Firestore guarda offline.
// Ao mudar qualquer arquivo do app, aumente o número da VERSAO para o celular baixar a versão nova.
// O teste sw.test.js confere se todo arquivo do app está na lista abaixo (esquecer um deixa o app sem offline).
const VERSAO = 'lucronokm-v9';

const ARQUIVOS = [
  './', './index.html', './manifest.webmanifest', './css/style.css',
  './js/app.js', './js/config/firebase-config.js', './js/config/padroes.js',
  './js/services/firebase.js', './js/services/dados.js', './js/services/dias.js', './js/services/meses.js',
  './js/services/abastecimentos.js',
  './js/modules/login.js', './js/modules/ajustes.js', './js/modules/calculos.js', './js/modules/formatos.js',
  './js/modules/hoje.js', './js/modules/resultado.js', './js/modules/semana.js', './js/modules/graficos.js',
  './js/modules/historico.js', './js/modules/mei.js', './js/modules/backup.js',
  './js/modules/mes.js', './js/modules/visaoMes.js', './js/modules/gravacao.js',
  './js/modules/combustivel.js', './js/modules/fixos.js',
  './js/modules/lembretes.js', './js/modules/sugestoes.js', './js/modules/validacao.js',
  './assets/icons/icon-192.png', './assets/icons/icon-512.png',
];

// Baixa cada arquivo direto da internet ("reload"), sem passar pelo cache do navegador.
// Sem isso, o GitHub Pages pode entregar uma cópia velha (ele manda os arquivos com cache de alguns minutos)
// e a versão nova do app ficaria guardada com arquivos antigos.
async function guardarTudo() {
  const cache = await caches.open(VERSAO);
  await Promise.all(
    ARQUIVOS.map(async (arquivo) => {
      const resposta = await fetch(new Request(arquivo, { cache: 'reload' }));
      if (!resposta.ok) throw new Error(`${arquivo}: erro ${resposta.status}`); // instalação falha e o app antigo continua valendo
      await cache.put(arquivo, resposta);
    })
  );
}

self.addEventListener('install', (e) => {
  e.waitUntil(guardarTudo().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n !== VERSAO).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

// Só mexe no que é do app e nos scripts do Firebase (CDN). Banco e login passam direto.
function deveGuardar(url) {
  return url.origin === self.location.origin || url.href.startsWith('https://www.gstatic.com/firebasejs/');
}

// Abre rápido com o que está guardado e atualiza o guardado em segundo plano.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (!deveGuardar(url)) return;

  e.respondWith(
    caches.open(VERSAO).then(async (cache) => {
      const guardado = await cache.match(req, { ignoreSearch: true });
      const rede = fetch(req)
        .then((resp) => {
          if (resp.ok) cache.put(req, resp.clone());
          return resp;
        })
        .catch(() => guardado);
      return guardado || rede;
    })
  );
});
