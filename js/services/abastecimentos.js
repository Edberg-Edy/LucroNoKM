// Leitura e gravação dos abastecimentos no Firestore. Nada de tela aqui.
// Cada abastecimento fica em: users/{uid}/abastecimentos/{id}   (as regras do Firestore já cobrem tudo dentro de users/{uid})
// Campos: { data: 'aaaa-mm-dd', odometro, litros, cheio: true/false, valor (opcional: só nos abastecimentos antigos) }
// Cada abastecimento é um registro próprio, feito na bomba: não depende de nenhum dia de trabalho.
// As gravações usam gravar(): sem sinal elas não travam o app (ficam guardadas no aparelho e sincronizam depois).
import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';
import { db } from './firebase.js';
import { gravar } from '../modules/gravacao.js';
import { emLotes } from './dias.js';

const colecao = (uid) => collection(db, 'users', uid, 'abastecimentos');
const refAbastecimento = (uid, id) => doc(db, 'users', uid, 'abastecimentos', id);
const comId = (achado) => ({ id: achado.id, ...achado.data() });

// Todos os abastecimentos (Histórico, Ajustes e backup).
export async function listarAbastecimentos(uid) {
  const resultado = await getDocs(colecao(uid));
  return resultado.docs.map(comId);
}

// Registra um abastecimento novo. O código nasce no próprio aparelho, por isso funciona sem sinal.
// Devolve { id, sincronizado }.
export function novoAbastecimento(uid, dados) {
  const ref = doc(colecao(uid));
  return gravar(setDoc(ref, { ...dados, criadoEm: serverTimestamp() })).then((r) => ({ id: ref.id, ...r }));
}

// Muda só os campos informados (um campo que não vem, como o valor pago de um abastecimento antigo, fica como está).
export const atualizarAbastecimento = (uid, id, dados) => gravar(updateDoc(refAbastecimento(uid, id), dados));

export const excluirAbastecimento = (uid, id) => gravar(deleteDoc(refAbastecimento(uid, id)));

// lista = [{ id, campos }]: grava cada abastecimento inteiro (usado na restauração de backup). Mesmo código = sobrescreve.
export const restaurarAbastecimentos = (uid, lista) =>
  emLotes(lista, (lote, { id, campos }) => lote.set(refAbastecimento(uid, id), campos));
