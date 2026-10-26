// Backup dos dados do usuário em um arquivo .json, e restauração a partir dele.
// As funções de montar, validar e preparar são puras (testadas em backup.test.js).
import { hojeISO } from './formatos.js';

const DATA = /^\d{4}-\d{2}-\d{2}$/;
const MES = /^\d{4}-\d{2}$/;
const STATUS = ['verde', 'amarelo', 'vermelho'];

// Nome gravado nos backups novos. "LucroJusto" era o nome antigo do app: backups já baixados continuam valendo.
export const NOME_APP = 'LucroNoKM';
const NOMES_ACEITOS = [NOME_APP, 'LucroJusto'];

// Campos numéricos que o app lê de cada dia fechado. Se faltar algum, o histórico mostraria NaN.
const CALCULADOS = ['km', 'faturamento', 'combustivel', 'manutencao', 'despesas', 'fixos', 'gastos', 'lucro', 'guardar', 'livre', 'corridas', 'ganhoPorKm'];
const SNAPSHOT = ['meta', 'kmPorLitro', 'precoLitro', 'manutencaoPorKm', 'fixoPorDia'];

const numero = (n) => typeof n === 'number' && Number.isFinite(n);
const nuloOuNumero = (n) => n === null || numero(n);
const texto = (t) => typeof t === 'string';
const objeto = (o) => o !== null && typeof o === 'object' && !Array.isArray(o);
const numerosEm = (o, campos) => campos.every((c) => numero(o[c]));

// O Firestore não aceita estes códigos de documento.
const idValido = (id) => texto(id) && id !== '' && id.length <= 200 && !id.includes('/') && id !== '.' && id !== '..' && !/^__.*__$/.test(id);

// Monta o conteúdo do backup. Os dias saem em ordem de data. "meses" são os fechamentos e checklists (opcional).
// "abastecimentos" é a lista de abastecimentos de combustível (opcional; backups antigos não têm).
export function montarBackup(config, dias, agora = new Date(), meses = {}, abastecimentos = []) {
  return {
    app: NOME_APP,
    versao: 1,
    exportadoEm: agora.toISOString(),
    config,
    dias: [...dias].sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : 0)),
    meses,
    abastecimentos: [...abastecimentos].sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : 0)),
  };
}

// Faz o navegador baixar o arquivo. O nome usa a data de hoje no horário do aparelho.
export function baixarBackup(backup) {
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `lucronokm-backup-${hojeISO()}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Valida os ajustes do backup. Devolve uma frase de erro, ou null se estiver tudo certo.
function erroNosAjustes(c) {
  if (!objeto(c)) return 'O backup está sem os ajustes.';
  for (const campo of ['meta', 'kmPorLitro', 'precoLitro', 'diasPorMes', 'limiteMei']) {
    if (!numero(c[campo])) return `Ajuste inválido no backup: ${campo}.`;
  }
  if (c.contasMes !== undefined && !numero(c.contasMes)) return 'Ajuste inválido no backup: contasMes.';
  if (c.kmPorLitro <= 0 || c.diasPorMes < 1) return 'Ajuste fora do normal no backup (km por litro ou dias por mês).';

  const itemOk = {
    plataformas: (x) => texto(x) && x.trim() !== '',
    manutencao: (x) => objeto(x) && texto(x.item) && numero(x.preco) && numero(x.duracaoKm),
    fixos: (x) => objeto(x) && texto(x.item) && numero(x.valorMensal),
  };
  for (const lista of Object.keys(itemOk)) {
    if (!Array.isArray(c[lista]) || !c[lista].every(itemOk[lista])) return `Ajuste inválido no backup: ${lista}.`;
  }
  return null;
}

// Valida um dia. Devolve uma frase de erro, ou null se estiver tudo certo.
function erroNoDia(d) {
  if (!objeto(d) || !idValido(d.id)) return 'Há um dia sem identificação válida no backup.';
  if (!texto(d.data) || !DATA.test(d.data)) return `Dia com data inválida no backup (${d.id}).`;
  if (!numero(d.odometroInicial)) return `Dia ${d.data} sem odômetro inicial.`;
  if (d.aberto === true) return null; // dias abertos são ignorados na restauração

  if (!numero(d.odometroFinal) || d.odometroFinal <= d.odometroInicial) return `Dia ${d.data} com odômetro inválido.`;
  if (d.horas !== undefined && !nuloOuNumero(d.horas)) return `Dia ${d.data} com horas inválidas.`;

  const incompleto = `Dia ${d.data} incompleto no backup.`;
  const c = d.calculados;
  if (!objeto(c) || !numerosEm(c, CALCULADOS) || !STATUS.includes(c.status)) return incompleto;
  if (!nuloOuNumero(c.lucroPorHora) || !nuloOuNumero(c.ganhoPorCorrida)) return incompleto;
  if (!objeto(d.snapshot) || !numerosEm(d.snapshot, SNAPSHOT)) return incompleto;

  const plataformaOk = (p) => objeto(p) && texto(p.nome) && numero(p.valor) && (p.corridas === undefined || numero(p.corridas));
  const despesaOk = (x) => objeto(x) && texto(x.categoria) && numero(x.valor);
  if (!Array.isArray(d.plataformas) || !d.plataformas.every(plataformaOk)) return incompleto;
  if (!Array.isArray(d.despesas) || !d.despesas.every(despesaOk)) return incompleto;
  return null;
}

// Valida um abastecimento. Devolve uma frase de erro, ou null se estiver tudo certo.
function erroNoAbastecimento(a) {
  if (!objeto(a) || !idValido(a.id)) return 'Há um abastecimento sem identificação válida no backup.';
  if (!texto(a.data) || !DATA.test(a.data)) return `Abastecimento com data inválida no backup (${a.id}).`;
  if (!numero(a.litros) || a.litros <= 0 || !numero(a.valor) || a.valor < 0) return `Abastecimento de ${a.data} com litros ou valor inválidos.`;
  if (a.odometro !== undefined && !nuloOuNumero(a.odometro)) return `Abastecimento de ${a.data} com odômetro inválido.`;
  if (a.cheio !== undefined && typeof a.cheio !== 'boolean') return `Abastecimento de ${a.data} com "tanque cheio" inválido.`;
  return null;
}

// Confere se o arquivo escolhido é mesmo um backup do LucroNoKM e se está inteiro.
// Devolve { ok: true, resumo } ou { ok: false, erro } com uma frase pronta para mostrar na tela.
export function validarBackup(b) {
  const falha = (erro) => ({ ok: false, erro });
  if (!objeto(b) || !NOMES_ACEITOS.includes(b.app)) return falha('Este arquivo não é um backup do LucroNoKM.');
  if (b.versao !== 1) return falha('Versão de backup não reconhecida. Use um backup gerado por este app.');

  const erroAjustes = erroNosAjustes(b.config);
  if (erroAjustes) return falha(erroAjustes);

  if (!Array.isArray(b.dias)) return falha('O backup está sem a lista de dias.');
  for (const d of b.dias) {
    const erroDia = erroNoDia(d);
    if (erroDia) return falha(erroDia);
  }

  if (b.abastecimentos !== undefined) {
    if (!Array.isArray(b.abastecimentos)) return falha('A lista de abastecimentos do backup está inválida.');
    for (const a of b.abastecimentos) {
      const erroAbastecimento = erroNoAbastecimento(a);
      if (erroAbastecimento) return falha(erroAbastecimento);
    }
  }

  const meses = b.meses ?? {};
  const mesOk = (ym, m) =>
    MES.test(ym) &&
    objeto(m) &&
    (m.fechado === undefined || typeof m.fechado === 'boolean') &&
    (m.checklist === undefined || objeto(m.checklist)) &&
    (m.observacao === undefined || texto(m.observacao));
  if (!objeto(meses) || !Object.entries(meses).every(([ym, m]) => mesOk(ym, m))) {
    return falha('Os meses do backup estão inválidos.');
  }

  const datas = b.dias.filter((d) => d.aberto !== true).map((d) => d.data).sort();
  return {
    ok: true,
    resumo: {
      dias: datas.length,
      abertos: b.dias.length - datas.length,
      meses: Object.keys(meses).length,
      abastecimentos: (b.abastecimentos ?? []).length,
      de: datas[0] || null,
      ate: datas[datas.length - 1] || null,
    },
  };
}

// Tira do dia/mês os campos que são do próprio banco (código e carimbos de hora gerados pelo servidor).
const limpar = ({ id, criadoEm, fechadoEm, ...resto }) => resto;

// Transforma um backup já validado na lista do que será gravado.
// Dias ainda abertos ficam de fora (poderiam virar um segundo dia aberto). Nada é apagado: só se grava por cima.
export function prepararRestauracao(b) {
  return {
    config: b.config,
    dias: b.dias.filter((d) => d.aberto !== true).map((d) => ({ id: d.id, campos: limpar(d) })),
    meses: Object.entries(b.meses ?? {}).map(([ym, campos]) => ({ ym, campos: limpar(campos) })),
    abastecimentos: (b.abastecimentos ?? []).map((a) => ({ id: a.id, campos: limpar(a) })),
  };
}
