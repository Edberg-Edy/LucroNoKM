// Exclusão dos dados da conta no Firestore. Nada de tela aqui.
// Apaga tudo que o app guarda para o usuário (dias, abastecimentos, meses e ajustes). O login do Google não é do app.
import { collection, getDocs } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';
import { db } from './firebase.js';
import { emLotes } from './dias.js';
import { exigirServidor } from './leitura.js';

const COLECOES = ['dias', 'abastecimentos', 'meses', 'config'];

// Devolve { total, sincronizado }. sincronizado = false: sem sinal, o servidor apaga quando a internet voltar.
export async function apagarTodosOsDados(uid) {
  let total = 0;
  let sincronizado = true;
  for (const nome of COLECOES) {
    const lista = exigirServidor(await getDocs(collection(db, 'users', uid, nome))); // só vale a lista completa do servidor
    const refs = lista.docs.map((d) => d.ref);
    total += refs.length;
    const r = await emLotes(refs, (lote, ref) => lote.delete(ref));
    if (!r.sincronizado) sincronizado = false;
  }
  return { total, sincronizado };
}
