// Indicador de sincronização: avisa quando está sem sinal ou quando há alterações ainda não enviadas ao servidor.
// textoSincronia é pura (testada em sincronia.test.js); iniciarSincronia liga o aviso à tela.
import { observarPendentes } from './gravacao.js';

// Devolve null (nada a mostrar) ou o texto do aviso.
export function textoSincronia({ online, pendentes }) {
  if (!online && pendentes > 0) {
    const n = pendentes === 1 ? '1 alteração guardada' : `${pendentes} alterações guardadas`;
    return `Sem sinal: ${n} no celular. Envio automático quando o sinal voltar.`;
  }
  if (!online) return 'Sem sinal. Pode continuar usando: o que você lançar fica guardado no celular.';
  if (pendentes > 0) return 'Enviando alterações…';
  return null;
}

// Liga o aviso ao elemento da tela. Depois de enviar tudo, mostra "Tudo salvo" por 3 segundos.
export function iniciarSincronia(elemento) {
  if (!elemento) return;
  let pendentes = 0;
  let online = navigator.onLine;
  let temporizador = null;

  const desenhar = (mostrarSalvo = false) => {
    const texto = textoSincronia({ online, pendentes });
    elemento.textContent = texto ?? (mostrarSalvo ? 'Tudo salvo ✓' : '');
    elemento.style.display = elemento.textContent ? 'block' : 'none';
  };

  observarPendentes((n) => {
    const acabou = pendentes > 0 && n === 0;
    pendentes = n;
    clearTimeout(temporizador);
    desenhar(acabou);
    if (acabou) temporizador = setTimeout(() => desenhar(false), 3000);
  });
  window.addEventListener('online', () => ((online = true), desenhar()));
  window.addEventListener('offline', () => ((online = false), desenhar()));
  desenhar();
}
