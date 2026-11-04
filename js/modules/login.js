// Tela de login. Mostra o botão "Entrar com Google" e traduz os erros mais comuns.
import { entrarComGoogle } from '../services/firebase.js';
import { configurado } from '../config/firebase-config.js';

const mensagens = {
  'auth/popup-closed-by-user': 'Login cancelado.',
  'auth/popup-blocked': 'O navegador bloqueou a janela de login. Libere pop-ups para este site.',
  'auth/unauthorized-domain': 'Este endereço não está autorizado no Firebase. Adicione o domínio em Authentication > Settings > Authorized domains.',
  'auth/network-request-failed': 'Sem conexão com a internet.',
};

export function telaLogin(tela) {
  tela.innerHTML = `
    <section class="cartao login">
      <h1>LucroNoKM</h1>
      <p class="suave">Entre para guardar seus dias na nuvem e acessar de qualquer aparelho.</p>
      <button type="button" class="botao" id="entrar">Entrar com Google</button>
      <p class="erro" id="erro" role="alert"></p>
      <p class="suave"><a href="privacidade.html" target="_blank" rel="noopener">Política de privacidade</a></p>
    </section>`;

  const erro = tela.querySelector('#erro');

  if (!configurado) {
    erro.textContent = 'Falta preencher o arquivo js/config/firebase-config.js com a configuração do Firebase.';
  }

  tela.querySelector('#entrar').addEventListener('click', async () => {
    erro.textContent = '';
    try {
      await entrarComGoogle();
      // Não precisa fazer mais nada aqui: o app percebe o login sozinho e troca de tela.
    } catch (e) {
      erro.textContent = mensagens[e.code] || `Não foi possível entrar (${e.code || 'erro desconhecido'}).`;
    }
  });
}