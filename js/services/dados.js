// Leitura e gravação dos dados no Firestore. Nada de tela aqui.
import { doc, getDoc, getDocFromCache, setDoc } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';
import { db } from './firebase.js';
import { padroes } from '../config/padroes.js';
import { gravar } from '../modules/gravacao.js';

// Os ajustes de cada usuário ficam em: users/{uid}/config/main
const refConfig = (uid) => doc(db, 'users', uid, 'config', 'main');

// Lê os ajustes. No primeiro acesso ainda não existem: cria com os valores padrão.
// Sem sinal, usa os ajustes guardados no aparelho; se nem isso houver, dá erro (a tela avisa) em vez de inventar valores.
export async function carregarConfig(uid) {
  let foto;
  try {
    foto = await getDoc(refConfig(uid));
  } catch (e) {
    // Sem internet e sem cópia no aparelho, o erro sobe: não dá para saber os ajustes reais. Usar os padrões em silêncio
    // faria o app fechar dias com valores errados e, ao salvar, sobrescrever os ajustes de verdade quando a internet voltasse.
    foto = await getDocFromCache(refConfig(uid));
  }
  if (foto.exists()) return { ...padroes(), ...foto.data() };

  const nova = padroes();
  await gravar(setDoc(refConfig(uid), nova));
  return nova;
}

// Devolve { sincronizado }: false quer dizer "salvo no aparelho, falta sincronizar" (sem sinal).
export const salvarConfig = (uid, config) => gravar(setDoc(refConfig(uid), config));
