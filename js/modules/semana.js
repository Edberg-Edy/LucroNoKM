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
    guardar: soma(daSemana, (d) => d.calculados.guardar),
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

// Meta da semana = meta diária × dias de trabalho por semana. Compara com o lucro já feito.
//   datas = as 7 datas da semana na tela; hoje = data de hoje; hojeFechado = o dia de hoje já foi lançado?
// Só na semana atual estima quantos dias de trabalho ainda restam e quanto de lucro por dia falta.
export function metaDaSemana({ lucro, meta, diasPorMes, datas, hoje, hojeFechado }) {
  if (!(meta > 0) || !(diasPorMes > 0)) return null;

  const dias = diasPorSemana(diasPorMes);
  const total = meta * dias;
  const falta = Math.max(0, total - lucro);
  const indice = datas.indexOf(hoje);
  const semanaAtual = indice >= 0;

  let diasRestantes = 0;
  if (semanaAtual) {
    const corridos = 7 - indice - (hojeFechado ? 1 : 0); // dias do calendário que ainda restam
    const estimados = Math.round((corridos * dias) / 7);
    diasRestantes = corridos > 0 ? Math.max(hojeFechado ? 0 : 1, estimados) : 0;
  }

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
    porDia: semanaAtual && falta > 0 && diasRestantes > 0 ? falta / diasRestantes : null,
  };
}
