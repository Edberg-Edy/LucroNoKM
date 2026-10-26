// Leitura e gravação dos abastecimentos no Firestore. Nada de tela aqui.
// Cada abastecimento fica em: users/{uid}/abastecimentos/{id}   (as regras do Firestore já cobrem tudo dentro de users/{uid})
// Campos: { data: 'aaaa-mm-dd', odometro: número ou null, litros, valor, cheio: true/false }
// O abastecimento informado ao fechar o dia usa o código "dia-{código do dia}": assim editar ou excluir o dia
// atualiza ou remove o abastecimento dele, sem duplicar.
// As gravações usam gravar(): sem sinal elas não travam o app (ficam guardadas no aparelho e sincronizam depois).
import {
  collection,
  doc,
  getDoc,
  getDocFromCache,
  getDocs,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';
import { db } from './firebase.js';
import { gravar } from '../modules/gravacao.js';
import { emLotes } from './dias.js';

const colecao = (uid) => collection(db, 'users', uid, 'abastecimentos');
const refAbastecimento = (uid, id) => doc(db, 'users', uid, 'abastecimentos', id);
const comId = (achado) => ({ id: achado.id, ...achado.data() });

// Código do abastecimento ligado a um dia.
export const idDoDia = (diaId) => `dia-${diaId}`;

// Todos os abastecimentos (Histórico, Ajustes e backup).
export async function listarAbastecimentos(uid) {
  const resultado = await getDocs(colecao(uid));
  return resultado.docs.map(comId);
}

// Lê um abastecimento pelo código (ou null se não existir). Sem sinal, usa o que está guardado no aparelho.
export async function lerAbastecimento(uid, id) {
  const ref = refAbastecimento(uid, id);
  let foto;
  try {
    foto = await getDoc(ref);
  } catch (e) {
    try {
      foto = await getDocFromCache(ref);
    } catch (e2) {
      return null;
    }
  }
  return foto.exists() ? comId(foto) : null;
}

// Grava (ou regrava por cima) o abastecimento informado ao fechar o dia. Devolve { sincronizado }.
export const salvarAbastecimentoDoDia = (uid, diaId, dados) =>
  gravar(setDoc(refAbastecimento(uid, idDoDia(diaId)), { ...dados, criadoEm: serverTimestamp() }));

// Remove o abastecimento do dia (não dá erro se ele não existir).
export const excluirAbastecimentoDoDia = (uid, diaId) => gravar(deleteDoc(refAbastecimento(uid, idDoDia(diaId))));

// lista = [{ id, campos }]: grava cada abastecimento inteiro (usado na restauração de backup). Mesmo código = sobrescreve.
export const restaurarAbastecimentos = (uid, lista) =>
  emLotes(lista, (lote, { id, campos }) => lote.set(refAbastecimento(uid, id), campos));
