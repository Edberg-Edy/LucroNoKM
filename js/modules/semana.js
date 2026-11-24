// Contas do histórico semanal. São funções puras (sem tela e sem Firebase), testadas em semana.test.js.
import { farol } from './calculos.js';

const soma = (lista, campo) => lista.reduce((total, x) => total + campo(x), 0);
const isoDe = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Soma (ou subtrai) dias de uma data "aaaa-mm-dd". Usa meio-dia para o horário de verão não atrapalhar.
export function somarDias(iso, n) {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + n);
  return isoDe(d);
}

// A semana vai de segunda a domingo. Devolve a segunda-feira da semana da data informada.
export function inicioDaSemana(iso) {
  const d = new Date(`${iso}T12:00:00`);
  const diasDesdeSegunda = (d.getDay() + 6) % 7; // domingo (0) vira 6
  return somarDias(iso, -diasDesdeSegunda);
}

// As 7 datas da semana, a partir da segunda-feira.
export const datasDaSemana = (inicio) => Array.from({ length: 7 }, (_, i) => somarDias(inicio, i));

// Junta os dias fechados que caem nas datas informadas.
//   dias  = dias fechados (cada um com data, calculados, snapshot e plataformas)
//   datas = as 7 datas da semana
export function resumoDaSemana(dias, datas) {
  const daSemana = dias.filter((d) => datas.includes(d.data));

  // Um item por data, mesmo sem lançamento (para o gráfico ter sempre 7 colunas)
  const porDia = datas.map((data) => {
    const doDia = daSemana.filter((d) => d.data === data);
    const lucro = soma(doDia, (d) => d.calculados.lucro);
    return {
      data,
      tem: doDia.length > 0,
      faturamento: soma(doDia, (d) => d.calculados.faturamento),
      gastos: soma(doDia, (d) => d.calculados.gastos),
      lucro,
      status: doDia.length > 0 ? farol(lucro, doDia[0].snapshot.meta) : null,
    };
  });

  const diasTrabalhados = porDia.filter((d) => d.tem).length;
  const lucro = soma(porDia, (d) => d.lucro);

  const totais = {
    faturamento: soma(porDia, (d) => d.faturamento),
    gastos: soma(porDia, (d) => d.gastos),
    lucro,
    combustivel: soma(daSemana, (d) => d.calculados.combustivel || 0),
    despesas: soma(daSemana, (d) => d.calculados.despesas || 0),
    manutencao: soma(daSemana, (d) => d.calculados.manutencao || 0),
    fixos: soma(daSemana, (d) => d.calculados.fixos || 0),
    guardar: soma(daSemana, (d) => d.calculados.guardar), // moto + custos fixos (o combustível entra por cima nas telas)
    km: soma(daSemana, (d) => d.calculados.km),
    diasTrabalhados,
    mediaPorDia: diasTrabalhados > 0 ? lucro / diasTrabalhados : null,
  };

  const plataformas = rankingPlataformas(daSemana);

  return { porDia, totais, plataformas };
}

// Variação em % entre duas semanas. Sem base de comparação (anterior = 0), devolve null.
export function variacao(atual, anterior) {
  return anterior === 0 ? null : ((atual - anterior) / Math.abs(anterior)) * 100;
}

// Ranking por plataforma (usado na semana e no mês). O valor por corrida só considera os dias em que as corridas foram informadas.
export function rankingPlataformas(dias) {
  const mapa = {};
  dias.forEach((dia) =>
    dia.plataformas.forEach((p) => {
      if (!mapa[p.nome]) mapa[p.nome] = { nome: p.nome, valor: 0, corridas: 0, valorComCorridas: 0 };
      mapa[p.nome].valor += p.valor;
      mapa[p.nome].corridas += p.corridas || 0;
      if (p.corridas > 0) mapa[p.nome].valorComCorridas += p.valor;
    })
  );
  return Object.values(mapa).sort((a, b) => b.valor - a.valor);
}
// Dias de trabalho por semana, tirados do ajuste "Dias trabalhados por mês" (26 dias ≈ 6 por semana; 20 ≈ 5).
export const diasPorSemana = (diasPorMes) => Math.min(7, Math.max(1, Math.round((diasPorMes * 7) / 30.44)));

// Recalcula sozinho: dias que ainda faltam trabalhar = previstos − já trabalhados, mas nunca mais que os dias do calendário que restam.
// Folgou sem avisar? Sobram menos dias no calendário, e o valor necessário por dia sobe.
// "pendente" = ainda falta algo a cobrir (se já cumpriu os dias previstos, o ritmo vale para dias extras).
function restantesDaSemana({ dias, datas, hoje, hojeFechado, diasTrabalhados, pendente }) {
  const indice = datas.indexOf(hoje);
  if (indice < 0) return { diasRestantes: 0, extra: false };
  const corridos = 7 - indice - (hojeFechado ? 1 : 0); // dias do calendário que ainda restam
  let diasRestantes = Math.min(corridos, Math.max(0, dias - diasTrabalhados));
  let extra = false;
  if (diasRestantes === 0 && pendente && corridos > 0) {
    diasRestantes = corridos;
    extra = true;
  }
  return { diasRestantes, extra };
}

// Custo fixo que cabe a UM dia ao fechá-lo. O mês cobra o valor inteiro, trabalhando muito ou pouco: o que a semana
// ainda deve de custo fixo (previsto − já descontado nos dias anteriores) se divide pelos dias de trabalho que restam.
// Semana normal: sempre o fixo por dia (ex.: R$ 9,08). Folgou além do previsto: sobram menos dias e o valor sobe.
//   anteriores = dias fechados da mesma semana com data antes deste dia
//   atraso = custo fixo que ficou sem cobrir nas semanas anteriores (veja atrasoDosFixos): a conta do mês continua lá
export function fixoDoDia({ data, fixoPorDia, diasPorMes, anteriores = [], atraso = 0 }) {
  if (!(fixoPorDia > 0) || !(diasPorMes > 0)) return fixoPorDia > 0 ? fixoPorDia : 0;
  const dias = diasPorSemana(diasPorMes);
  const indice = datasDaSemana(inicioDaSemana(data)).indexOf(data);
  const descontado = soma(anteriores, (d) => d.calculados.fixos || 0);
  const falta = Math.max(0, fixoPorDia * dias + atraso - descontado);
  const corridos = 7 - indice; // este dia e os que restam até domingo
  const restantes = Math.max(1, Math.min(corridos, dias - anteriores.length));
  return Math.round((falta / restantes) * 100) / 100;
}

// Custo fixo que a SEMANA ANTERIOR deixou sem cobrir (imprevisto, folga a mais, domingo sem trabalhar...).
// Esse valor não some na virada: entra no que a semana nova precisa cobrir. Só passa uma semana para a outra,
// para a conta ficar fácil de acompanhar (o fechamento do mês mostra o total devido e o descontado).
// Para não criar dívida falsa, o que faltou é o MENOR entre:
//   - o que falta para chegar no previsto (fixo por dia × dias de trabalho da semana), e
//   - os dias de trabalho que ficaram sem lançar × fixo por dia.
// Assim, dias fechados quando o custo fixo era menor (ou já repostos por outros dias) não viram atraso.
//   anteriores = dias fechados (a função só olha a semana imediatamente anterior)
//   primeiraData = data do primeiro dia já lançado (semana toda antes do uso do app não gera atraso)
export function atrasoDosFixos({ inicioDaSemanaNova, anteriores, fixoPorDia, diasPorMes, primeiraData }) {
  if (!(fixoPorDia > 0) || !(diasPorMes > 0) || !primeiraData) return 0;
  const inicio = somarDias(inicioDaSemanaNova, -7);
  const fim = somarDias(inicio, 6);
  if (fim < primeiraData) return 0;
  const dias = diasPorSemana(diasPorMes);
  const daSemana = anteriores.filter((d) => d.data >= inicio && d.data <= fim);
  const descontado = soma(daSemana, (d) => d.calculados.fixos || 0);
  const trabalhados = new Set(daSemana.map((d) => d.data)).size;
  const porValor = Math.max(0, fixoPorDia * dias - descontado);
  const porDias = Math.max(0, dias - trabalhados) * fixoPorDia;
  return Math.round(Math.min(porValor, porDias) * 100) / 100;
}

// Custos fixos da semana: o mês cobra o valor inteiro mesmo que você trabalhe menos dias. Por isso o previsto é
// (fixo por dia) × (dias de trabalho da semana), e o que os dias lançados já descontaram é comparado com ele.
// Faltou descontar? Esse resto vai para os dias de trabalho que sobram na semana (o "guardar" sobe nesses dias).
export function fixosDaSemana({ descontado, fixoPorDia, diasPorMes, datas, hoje, hojeFechado, diasTrabalhados = 0, atraso = 0 }) {
  if (!(fixoPorDia > 0) || !(diasPorMes > 0)) return null;
  const dias = diasPorSemana(diasPorMes);
  const semanaAtual = datas.includes(hoje);
  // semana passada sem nenhum dia lançado: não havia o que cobrar (ex.: antes de começar a usar o app)
  const previsto = diasTrabalhados === 0 && !semanaAtual ? 0 : fixoPorDia * dias + atraso;
  const falta = Math.max(0, previsto - descontado);
  const { diasRestantes } = restantesDaSemana({ dias, datas, hoje, hojeFechado, diasTrabalhados, pendente: falta > 0 });
  return {
    dias,
    previsto,
    atraso: diasTrabalhados === 0 && !semanaAtual ? 0 : atraso,
    descontado,
    falta,
    semanaAtual,
    diasRestantes,
    extraPorDia: semanaAtual && falta > 0.005 && diasRestantes > 0 ? falta / diasRestantes : null,
  };
}

// Meta da semana = meta diária × dias de trabalho por semana. Compara com o lucro já feito.
//   datas = as 7 datas da semana na tela; hoje = data de hoje; hojeFechado = o dia de hoje já foi lançado?
//   diasTrabalhados = dias já lançados nesta semana
// Só na semana atual estima quantos dias de trabalho ainda restam e quanto de lucro por dia falta.
export function metaDaSemana({ lucro, meta, diasPorMes, datas, hoje, hojeFechado, diasTrabalhados = 0 }) {
  if (!(meta > 0) || !(diasPorMes > 0)) return null;

  const dias = diasPorSemana(diasPorMes);
  const total = meta * dias;
  const falta = Math.max(0, total - lucro);
  const semanaAtual = datas.includes(hoje);

  const { diasRestantes, extra } = restantesDaSemana({ dias, datas, hoje, hojeFechado, diasTrabalhados, pendente: falta > 0 });

  return {
    dias,
    meta: total,
    lucro,
    falta,
    sobra: Math.max(0, lucro - total),
    percentual: Math.min(100, Math.max(0, (lucro / total) * 100)),
    atingiu: lucro >= total,
    semanaAtual,
    diasRestantes,
    extra,
    porDia: semanaAtual && falta > 0 && diasRestantes > 0 ? falta / diasRestantes : null,
  };
}
