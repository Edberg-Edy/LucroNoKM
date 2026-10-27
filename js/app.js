// LucroNoKM: ponto de entrada. Login com Google, navegação entre as 3 abas e as telas Hoje, Histórico e Ajustes.
import { observarLogin, sair, aguardarEnvio } from './services/firebase.js';
import { acompanhar } from './modules/gravacao.js';
import { iniciarSincronia } from './modules/sincronia.js';
import { telaLogin } from './modules/login.js';
import { telaHoje } from './modules/hoje.js';
import { telaHistorico } from './modules/historico.js';
import { telaAjustes } from './modules/ajustes.js';

// Abas do app. O conteúdo real de cada uma será criado nas próximas etapas.
const abas = [
  { id: 'hoje', nome: 'Hoje', icone: '🏍️', texto: 'Aqui você vai abrir e fechar o dia.' },
  { id: 'historico', nome: 'Histórico', icone: '📊', texto: 'Aqui ficarão os gráficos de lucro e de gastos.' },
  { id: 'ajustes', nome: 'Ajustes', icone: '⚙️', texto: 'Aqui ficarão a meta, o km por litro e os custos.' },
];

const tela = document.getElementById('tela');
const menu = document.getElementById('abas');

let usuario = null; // null = ninguém logado
let carregando = true; // true até o Firebase responder se já existe alguém logado

// A aba atual fica na URL (#hoje, #historico, #ajustes), então recarregar a página não perde o lugar.
function abaAtual() {
  const id = location.hash.replace('#', '');
  return abas.find((a) => a.id === id) || abas[0];
}

function desenhar() {
  // 1) Esperando o Firebase responder
  if (carregando) {
    menu.hidden = true;
    tela.innerHTML = '<p class="suave">Carregando…</p>';
    return;
  }

  // 2) Ninguém logado: só a tela de login, sem abas
  if (!usuario) {
    menu.hidden = true;
    menu.innerHTML = '';
    telaLogin(tela);
    return;
  }

  // 3) Logado: abas normais
  const atual = abaAtual();

  if (atual.id === 'ajustes') {
    // Os Ajustes carregam do banco aos poucos, por isso ficam numa caixa própria (#conteudo)
    tela.innerHTML = `
      <div id="conteudo"></div>
      <section class="cartao conta">
        <h2>Conta</h2>
        <p class="suave" id="email"></p>
        <button type="button" class="botao secundario" id="sair">Sair</button>
      </section>`;
    telaAjustes(document.getElementById('conteudo'), usuario);
    document.getElementById('email').textContent = usuario.email; // textContent evita problemas com caracteres especiais
    document.getElementById('sair').addEventListener('click', () => sair());
  } else if (atual.id === 'hoje') {
    tela.innerHTML = '<div id="conteudo"></div>';
    telaHoje(document.getElementById('conteudo'), usuario);
  } else if (atual.id === 'historico') {
    tela.innerHTML = '<div id="conteudo"></div>';
    telaHistorico(document.getElementById('conteudo'), usuario);
  } else {
    tela.innerHTML = `
      <section class="cartao">
        <h1>${atual.nome}</h1>
        <p class="suave">${atual.texto}</p>
      </section>`;
  }

  menu.hidden = false;
  menu.innerHTML = abas
    .map(
      (a) => `
      <button type="button" data-aba="${a.id}" ${a.id === atual.id ? 'aria-current="page"' : ''}>
        <span class="icone" aria-hidden="true">${a.icone}</span>
        <span>${a.nome}</span>
      </button>`
    )
    .join('');
}

menu.addEventListener('click', (evento) => {
  const botao = evento.target.closest('button[data-aba]');
  if (botao) location.hash = botao.dataset.aba;
});

window.addEventListener('hashchange', desenhar);

// O Firebase avisa quando o app abre (já logado ou não) e a cada entrada ou saída.
observarLogin((u) => {
  usuario = u;
  // Alterações feitas sem sinal e ainda não enviadas (de antes de abrir o app) também entram no indicador.
  if (u) acompanhar(aguardarEnvio()).catch(() => {});
  carregando = false;
  desenhar();
});

desenhar();
iniciarSincronia(document.getElementById('sincronia'));

// PWA: registra o service worker (guarda o app para abrir sem internet).
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
