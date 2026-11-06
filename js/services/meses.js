// Leitura e gravação dos meses no Firestore (fechamento e checklist). Nada de tela aqui.
// Cada mês fica em: users/{uid}/meses/{aaaa-mm}
import {
  collection,
  doc,
  getDoc,
  getDocFromCache,
  getDocs,
  setDoc,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';
import { db } from './firebase.js';
import { gravar } from '../modules/gravacao.js';
import { exigirServidor } from './leitura.js';

// Todos os meses já gravados, em um objeto: { '2026-09': {...}, '2026-10': {...} }
export async function listarMeses(uid, { completo = false } = {}) {
  const bruto = await getDocs(collection(db, 'users', uid, 'meses'));
  const resultado = completo ? exigirServidor(bruto) : bruto; // vazio é normal para quem nunca fechou um mês
  const mapa = {};
  resultado.docs.forEach((achado) => {
    mapa[achado.id] = achado.data();
  });
  return mapa;
}

// Diz se o mês está fechado (usado pela aba Hoje antes de abrir um dia).
// Sem sinal, o getDoc falha quando o mês não está guardado no aparelho. A maioria dos meses nem existe no banco
// (só existe depois de fechado), então nesse caso consideramos "não fechado" para não impedir o trabalho.
export async function mesEstaFechado(uid, ym) {
  const ref = doc(db, 'users', uid, 'meses', ym);
  let foto;
  try {
    foto = await getDoc(ref);
  } catch (e) {
    try {
      foto = await getDocFromCache(ref);
    } catch (e2) {
      return false;
    }
  }
  return foto.exists() && foto.data().fechado === true;
}

// Grava só os campos informados (merge), sem apagar o resto do mês. Devolve { sincronizado }.
export const salvarMes = (uid, ym, campos) =>
  gravar(setDoc(doc(db, 'users', uid, 'meses', ym), campos, { merge: true }));

export const fecharMes = (uid, ym, totais) => salvarMes(uid, ym, { fechado: true, fechadoEm: serverTimestamp(), totais });
export const reabrirMes = (uid, ym) => salvarMes(uid, ym, { fechado: false });
