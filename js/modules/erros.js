// Registro local de erros: guarda os últimos erros do app no próprio aparelho (nada é enviado para fora).
// Aparece em Ajustes > Diagnóstico, para o usuário copiar e mandar ao suporte. Funções puras, testadas em erros.test.js.
const CHAVE = 'lucronokm.erros';
const MAXIMO = 20; // quantos erros ficam guardados
const iguais = (a, b) => a.origem === b.origem && a.mensagem === b.mensagem;

const armazemPadrao = () => {
  try {
    return globalThis.localStorage || null;
  } catch (e) {
    return null;
  }
};

export function lerErros(armazem = armazemPadrao()) {
  try {
    const lista = JSON.parse(armazem.getItem(CHAVE) || '[]');
    return Array.isArray(lista) ? lista : [];
  } catch (e) {
    return [];
  }
}

// Erro repetido em sequência só aumenta o contador (um laço de erro não enche o armazenamento).
export function registrarErro(origem, erro, { agora = new Date(), armazem = armazemPadrao() } = {}) {
  if (!armazem) return;
  const mensagem = String((erro && erro.message) || erro || 'erro sem mensagem').slice(0, 300);
  const pilha = erro && erro.stack ? String(erro.stack).slice(0, 600) : '';
  const lista = lerErros(armazem);
  const ultimo = lista[lista.length - 1];
  if (ultimo && iguais(ultimo, { origem, mensagem })) {
    ultimo.vezes = (ultimo.vezes || 1) + 1;
    ultimo.quando = agora.toISOString();
  } else {
    lista.push({ quando: agora.toISOString(), origem, mensagem, pilha, vezes: 1 });
  }
  try {
    armazem.setItem(CHAVE, JSON.stringify(lista.slice(-MAXIMO)));
  } catch (e) {
    // armazenamento cheio ou bloqueado: o diagnóstico é só uma ajuda, o app segue
  }
}

export function limparErros(armazem = armazemPadrao()) {
  try {
    armazem.removeItem(CHAVE);
  } catch (e) {
    // nada a fazer
  }
}

// Texto pronto para copiar e colar numa mensagem de suporte.
export function textoDiagnostico(erros, { versao = 'desconhecida', agente = '' } = {}) {
  const cabecalho = `LucroNoKM ${versao}\n${agente}\nErros guardados: ${erros.length}`;
  if (!erros.length) return cabecalho;
  const itens = erros.map(
    (e) => `- ${e.quando} [${e.origem}]${e.vezes > 1 ? ` x${e.vezes}` : ''} ${e.mensagem}${e.pilha ? `\n  ${e.pilha.split('\n').slice(0, 3).join('\n  ')}` : ''}`
  );
  return `${cabecalho}\n${itens.join('\n')}`;
}

// Liga a captura aos eventos da janela (erro não tratado e promessa rejeitada).
export function instalarCapturaDeErros(janela = globalThis) {
  janela.addEventListener('error', (e) => registrarErro('janela', e.error || e.message));
  janela.addEventListener('unhandledrejection', (e) => registrarErro('promessa', e.reason));
}
