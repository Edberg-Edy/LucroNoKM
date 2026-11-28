// Leitura e gravação das trocas de manutenção no Firestore. Nada de tela aqui.
// Cada troca fica em: users/{uid}/manutencoes/{id}   Campos: { item, data: 'aaaa-mm-dd', odometro, valor }
import { collection, doc, getDocs, setDoc, deleteDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';
import { db } from './firebase.js';
import { gravar } from '../modules/gravacao.js';

const colecao = (uid) => collection(db, 'users', uid, 'manutencoes');

export async function listarManutencoes(uid) {
  const bruto = await getDocs(colecao(uid));
  return bruto.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// Devolve { id, sincronizado }.
export function novaManutencao(uid, dados) {
  const ref = doc(colecao(uid));
  return gravar(setDoc(ref, { ...dados, criadoEm: serverTimestamp() })).then((r) => ({ id: ref.id, ...r }));
}

export const excluirManutencao = (uid, id) => gravar(deleteDoc(doc(db, 'users', uid, 'manutencoes', id)));
