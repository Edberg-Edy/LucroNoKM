// Leitura e gravação das trocas de manutenção no Firestore. Nada de tela aqui.
// Cada troca fica em: users/{uid}/manutencoes/{id}   Campos: { item, data: 'aaaa-mm-dd', odometro, valor }
import { collection, doc, getDocs, setDoc, deleteDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';
import { db } from './firebase.js';
import { exigirServidor } from './leitura.js';
import { emLotes } from './dias.js';
import { gravar } from '../modules/gravacao.js';

const colecao = (uid) => collection(db, 'users', uid, 'manutencoes');

export async function listarManutencoes(uid, { completo = false } = {}) {
  const bruto = await getDocs(colecao(uid));
  const resultado = completo ? exigirServidor(bruto) : bruto; // backup: só vale a lista inteira vinda do servidor
  return resultado.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// Devolve { id, sincronizado }.
export function novaManutencao(uid, dados) {
  const ref = doc(colecao(uid));
  return gravar(setDoc(ref, { ...dados, criadoEm: serverTimestamp() })).then((r) => ({ id: ref.id, ...r }));
}

export const excluirManutencao = (uid, id) => gravar(deleteDoc(doc(db, 'users', uid, 'manutencoes', id)));

// lista = [{ id, campos }]: grava cada troca inteira (restauração de backup). Mesmo código = sobrescreve.
export const restaurarManutencoes = (uid, lista) =>
  emLotes(lista, (lote, { id, campos }) => lote.set(doc(db, 'users', uid, 'manutencoes', id), campos));
