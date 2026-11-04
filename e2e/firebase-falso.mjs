// Firebase de mentira para o teste de navegador: troca o SDK que vem do CDN por versões que guardam tudo na memória.
// Assim o teste roda sem internet, sem conta e sem mexer nos dados reais. Só implementa o que o app usa.
export const modulos = {
  'firebase-app.js': `export const initializeApp = () => ({});`,

  'firebase-auth.js': `
    export const getAuth = () => ({});
    export class GoogleAuthProvider {}
    export const signInWithPopup = async () => ({});
    export const signOut = async () => {};
    export const onAuthStateChanged = (auth, aoMudar) => {
      setTimeout(() => aoMudar({ uid: 'u-e2e', email: 'e2e@teste.com', displayName: 'Teste E2E' }), 0);
      return () => {};
    };`,

  'firebase-firestore.js': `
    const dados = (window.__dadosFalsos = window.__dadosFalsos || new Map());
    const copia = (x) => structuredClone(x);
    let contador = 0;
    const carimbo = Symbol.for('serverTimestamp');
    const resolver = (obj) => JSON.parse(JSON.stringify(obj, (k, v) => (v && v.__carimbo ? Date.now() : v)));

    export const initializeFirestore = () => ({});
    export const persistentLocalCache = () => ({});
    export const persistentMultipleTabManager = () => ({});
    export const waitForPendingWrites = async () => {};
    export const serverTimestamp = () => ({ __carimbo: true });

    export const collection = (db, ...partes) => ({ colecao: true, caminho: partes.join('/') });
    export const doc = (base, ...partes) => {
      if (base && base.colecao && partes.length === 0) {
        const id = 'auto' + ++contador + Math.random().toString(36).slice(2, 6);
        return { caminho: base.caminho + '/' + id, id };
      }
      const caminho = partes.join('/');
      return { caminho, id: caminho.split('/').pop() };
    };

    const instantaneo = (caminho) => {
      const valor = dados.get(caminho);
      return { id: caminho.split('/').pop(), exists: () => valor !== undefined, data: () => (valor === undefined ? undefined : copia(valor)) };
    };
    export const getDoc = async (ref) => instantaneo(ref.caminho);
    export const getDocFromCache = async (ref) => instantaneo(ref.caminho);

    export const where = (campo, op, valor) => ({ tipo: 'where', campo, op, valor });
    export const orderBy = (campo, sentido = 'asc') => ({ tipo: 'orderBy', campo, sentido });
    export const limit = (n) => ({ tipo: 'limit', n });
    export const query = (col, ...restricoes) => ({ ...col, restricoes });

    const testa = (v, op, alvo) => ({ '==': v === alvo, '>=': v >= alvo, '<=': v <= alvo, '>': v > alvo, '<': v < alvo })[op];
    export const getDocs = async (consulta) => {
      const prefixo = consulta.caminho + '/';
      let itens = [...dados.keys()].filter((c) => c.startsWith(prefixo) && !c.slice(prefixo.length).includes('/'));
      for (const r of consulta.restricoes || []) {
        if (r.tipo === 'where') itens = itens.filter((c) => testa(dados.get(c)[r.campo], r.op, r.valor));
      }
      for (const r of (consulta.restricoes || []).filter((x) => x.tipo === 'orderBy')) {
        const f = r.sentido === 'desc' ? -1 : 1;
        itens.sort((a, b) => (dados.get(a)[r.campo] > dados.get(b)[r.campo] ? f : -f));
      }
      const lim = (consulta.restricoes || []).find((x) => x.tipo === 'limit');
      if (lim) itens = itens.slice(0, lim.n);
      const docs = itens.map(instantaneo);
      return { docs, empty: docs.length === 0, size: docs.length, forEach: (f) => docs.forEach(f) };
    };

    export const setDoc = async (ref, valor, opcoes) => {
      const novo = resolver(valor);
      dados.set(ref.caminho, opcoes && opcoes.merge ? { ...(dados.get(ref.caminho) || {}), ...novo } : novo);
    };
    export const updateDoc = async (ref, campos) => {
      if (!dados.has(ref.caminho)) throw Object.assign(new Error('not-found'), { code: 'not-found' });
      dados.set(ref.caminho, { ...dados.get(ref.caminho), ...resolver(campos) });
    };
    export const deleteDoc = async (ref) => { dados.delete(ref.caminho); };
    export const writeBatch = () => {
      const passos = [];
      const lote = {
        set: (ref, v, o) => { passos.push(() => setDoc(ref, v, o)); return lote; },
        update: (ref, v) => { passos.push(() => updateDoc(ref, v)); return lote; },
        delete: (ref) => { passos.push(() => deleteDoc(ref)); return lote; },
        commit: async () => { for (const p of passos) await p(); },
      };
      return lote;
    };`,
};
