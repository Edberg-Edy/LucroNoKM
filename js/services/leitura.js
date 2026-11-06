// Conferência das leituras do Firestore. Nada de tela aqui.
// Sem internet, getDocs não dá erro: devolve só o que está guardado no aparelho (talvez nada, talvez pela metade).
// Mostrar isso como "vazio" engana o usuário, então estas funções transformam o caso duvidoso em erro.
const semServidor = () => Object.assign(new Error('Sem conexão com o servidor'), { code: 'sem-servidor' });

// Lista que veio só do aparelho E está vazia: não dá para saber se o período realmente não tem dados.
export function naoVazioDoCache(resultado) {
  if (resultado.metadata && resultado.metadata.fromCache && resultado.empty) throw semServidor();
  return resultado;
}

// Para backup e exclusão: a lista precisa ser a completa, vinda do servidor.
export function exigirServidor(resultado) {
  if (resultado.metadata && resultado.metadata.fromCache) throw semServidor();
  return resultado;
}
