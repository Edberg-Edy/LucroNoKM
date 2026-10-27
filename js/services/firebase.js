// Conexão com o Firebase: login com Google e banco de dados (Firestore).
// O Firebase vem direto da internet (CDN), por isso não precisa instalar nada com npm.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  waitForPendingWrites,
} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';
import { firebaseConfig } from '../config/firebase-config.js';

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

// Cache offline: o app abre e grava sem internet e sincroniza quando o sinal volta.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});

export const entrarComGoogle = () => signInWithPopup(auth, new GoogleAuthProvider());
export const sair = () => signOut(auth);

// Chama a função recebida agora e a cada vez que alguém entra ou sai.
export const observarLogin = (aoMudar) => onAuthStateChanged(auth, aoMudar);

// Resolve quando o servidor confirmou tudo que estava guardado no aparelho (alterações feitas sem sinal).
export const aguardarEnvio = () => waitForPendingWrites(db);
