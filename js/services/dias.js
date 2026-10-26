// Leitura e gravação dos dias no Firestore. Nada de tela aqui.
// Cada dia fica em: users/{uid}/dias/{id}
// As gravações usam gravar(): sem sinal elas não travam o app (ficam guardadas no aparelho e sincronizam depois).
import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  writeBatch,
} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';
import { db } from './firebase.js';
import { gravar } from '../modules/gravacao.js';

const colecao = (uid) => collection(db, 'users', uid, 'dias');
const refDia = (uid, id) => doc(db, 'users', uid, 'dias', id);

// Procura o dia que ainda está aberto (aberto: true). Devolve null se não houver nenhum.
export async function buscarDiaAberto(uid) {
  const resultado = await getDocs(query(colecao(uid), where('aberto', '==', true), limit(1)));
  if (resultado.empty) return null;
  const achado = resultado.docs[0];
  return { id: achado.id, ...achado.data() };
}

// Cria um dia aberto, ainda sem despesas nem ganhos.
// O código do dia é gerado aqui no aparelho (doc sem id), assim não é preciso esperar o servidor para continuar.
export async function criarDia(uid, { data, odometroInicial }) {
  const dia = { aberto: true, data, odometroInicial, despesas: [], plataformas: [] };
  const ref = doc(colecao(uid));
  await gravar(setDoc(ref, { ...dia, criadoEm: serverTimestamp() }));
  return { id: ref.id, ...dia };
}

// Atualiza só os campos informados, ex.: atualizarDia(uid, id, { despesas: [...] })
export const atualizarDia = (uid, id, campos) => gravar(updateDoc(refDia(uid, id), campos));

export const excluirDia = (uid, id) => gravar(deleteDoc(refDia(uid, id)));

// Fecha o dia: guarda odômetro final, horas, ganhos, a fotografia dos parâmetros e os valores calculados.
// Devolve { sincronizado }: false quer dizer "salvo no aparelho, falta sincronizar" (sem sinal).
export const fecharDia = (uid, id, fechamento) =>
  gravar(
    updateDoc(refDia(uid, id), {
      ...fechamento,
      aberto: false,
      fechadoEm: serverTimestamp(),
    })
  );

// Lê todos os dias já fechados (o histórico é montado a partir deles).
export async function listarDiasFechados(uid) {
  const resultado = await getDocs(query(colecao(uid), where('aberto', '==', false)));
  return resultado.docs.map((achado) => ({ id: achado.id, ...achado.data() }));
}

// Os "n" dias mais recentes (abertos ou fechados), do mais novo para o mais antigo.
// Lê só "n" documentos: serve para sugerir o odômetro sem ler o histórico inteiro.
export async function ultimosDias(uid, n) {
  const resultado = await getDocs(query(colecao(uid), orderBy('data', 'desc'), limit(n)));
  return resultado.docs.map((achado) => ({ id: achado.id, ...achado.data() }));
}

// O dia mais antigo já lançado (ou null). Usado para saber desde quando o app é usado.
export async function primeiroDia(uid) {
  const resultado = await getDocs(query(colecao(uid), orderBy('data', 'asc'), limit(1)));
  if (resultado.empty) return null;
  const achado = resultado.docs[0];
  return { id: achado.id, ...achado.data() };
}

// Lê todos os dias (abertos e fechados). Usado no backup.
export async function listarTodosDias(uid) {
  const resultado = await getDocs(colecao(uid));
  return resultado.docs.map((achado) => ({ id: achado.id, ...achado.data() }));
}

// Reabre um dia fechado para edição (os dados dele continuam guardados).
export const reabrirDia = (uid, id) => gravar(updateDoc(refDia(uid, id), { aberto: true }));

// Grava vários dias de uma vez. O Firestore aceita até 500 gravações por lote; aqui usamos 400 por segurança.
// Devolve { sincronizado }: true só se todos os lotes foram confirmados pelo servidor a tempo.
export async function emLotes(lista, aplicar) {
  let sincronizado = true;
  for (let i = 0; i < lista.length; i += 400) {
    const lote = writeBatch(db);
    lista.slice(i, i + 400).forEach((item) => aplicar(lote, item));
    const r = await gravar(lote.commit(), 6000);
    if (!r.sincronizado) sincronizado = false;
  }
  return { sincronizado };
}

// lista = [{ id, campos }]: atualiza os campos informados de cada dia.
export const atualizarDiasEmLote = (uid, lista) =>
  emLotes(lista, (lote, { id, campos }) => lote.update(refDia(uid, id), campos));

// lista = [{ id, campos }]: grava cada dia inteiro (usado na restauração de backup). Mesmo código = sobrescreve.
export const restaurarDias = (uid, lista) =>
  emLotes(lista, (lote, { id, campos }) => lote.set(refDia(uid, id), campos));
