// Contas do fechamento mensal. Funções puras (sem tela e sem Firebase), testadas em mes.test.js.
import { rankingPlataformas } from './semana.js';

const NOMES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

// "2026-10-08" vira "2026-10".
export const mesDe = (iso) => iso.slice(0, 7);

// Soma (ou subtrai) meses de "aaaa-mm". Passa de ano sozinho.
export function somarMeses(ym, n) {
  const [ano, mes] = ym.split('-').map(Number);
  const total = ano * 12 + (mes - 1) + n;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`;
}

// "2026-10" vira "outubro de 2026".
export function nomeDoMes(ym) {
  const [ano, mes] = ym.split('-');
  return `${NOMES[Number(mes) - 1]} de ${ano}`;
}

export function ultimoDiaDoMes(ym) {
  const [ano, mes] = ym.split('-').map(Number);
  return new Date(ano, mes, 0).getDate(); // dia 0 do mês seguinte = último dia deste mês
}

// Só dá para fechar um mês que já terminou (ou no último dia dele),
// senão o app travaria dias que ainda vão acontecer.
export function mesJaTerminou(ym, hoje) {
  const atual = mesDe(hoje);
  if (ym < atual) return true;
  return ym === atual && Number(hoje.slice(8, 10)) === ultimoDiaDoMes(ym);
}

// Soma os dias fechados do mês.
export function resumoDoMes(dias, ym) {
  const doMes = dias.filter((d) => d.data.startsWith(ym + '-'));
  const soma = (campo) => doMes.reduce((total, d) => total + d.calculados[campo], 0);

  // Lucro por data (dois lançamentos na mesma data contam como um dia só)
  const porData = {};
  doMes.forEach((d) => {
    porData[d.data] = (porData[d.data] || 0) + d.calculados.lucro;
  });
  const lucrosPorDia = Object.keys(porData)
    .sort()
    .map((data) => ({ data, lucro: porData[data] }));
  const melhor = lucrosPorDia.reduce((a, b) => (b.lucro > a.lucro ? b : a), lucrosPorDia[0] || null);
  const pior = lucrosPorDia.reduce((a, b) => (b.lucro < a.lucro ? b : a), lucrosPorDia[0] || null);

  const plataformas = rankingPlataformas(doMes);
  const corridas = plataformas.reduce((total, p) => total + p.corridas, 0);
  const valorComCorridas = plataformas.reduce((total, p) => total + p.valorComCorridas, 0);

  const faturamento = soma('faturamento');
  const km = soma('km');
  const lucro = soma('lucro');
  const diasTrabalhados = lucrosPorDia.length;

  return {
    totais: {
      faturamento,
      combustivel: soma('combustivel'),
      manutencao: soma('manutencao'),
      despesas: soma('despesas'),
      fixos: soma('fixos'),
      gastos: soma('gastos'),
      lucro,
      guardar: soma('guardar'),
      km,
      corridas,
      diasTrabalhados,
      mediaPorDia: diasTrabalhados > 0 ? lucro / diasTrabalhados : null,
      lucroPorKm: km > 0 ? lucro / km : null,
      lucroPorCorrida: corridas > 0 ? lucro / corridas : null,
      ganhoPorKm: km > 0 ? faturamento / km : null,
      ganhoPorCorrida: corridas > 0 ? valorComCorridas / corridas : null,
    },
    melhor,
    pior,
    plataformas,
  };
}
// Acompanhamento do mês contra as contas pessoais (ajuste "Contas do mês").
//   lucro       = lucro líquido do mês até agora (já descontados combustível, manutenção e custos fixos)
//   contas      = quanto o lucro do mês precisa cobrir (0 ou vazio desliga o acompanhamento e devolve null)
//   diasPorMes  = dias que você costuma trabalhar por mês (para estimar quantos dias de trabalho ainda restam)
//   hojeFechado = o dia de hoje já foi lançado?
// No mês atual estima os dias de trabalho que restam e quanto de lucro por dia falta para fechar as contas.
export function progressoDoMes({ ym, hoje, lucro, contas, diasPorMes, hojeFechado }) {
  if (!(contas > 0)) return null;

  const falta = Math.max(0, contas - lucro);
  const mesAtual = ym === mesDe(hoje);

  let diasRestantes = 0;
  if (mesAtual) {
    const ultimo = ultimoDiaDoMes(ym);
    const corridos = ultimo - Number(hoje.slice(8, 10)) + (hojeFechado ? 0 : 1); // dias do calendário que ainda restam
    const estimados = Math.round((corridos * diasPorMes) / ultimo); // só uma parte deles é de trabalho
    diasRestantes = corridos > 0 ? Math.max(hojeFechado ? 0 : 1, estimados) : 0; // se hoje ainda não foi lançado, conta ao menos hoje
  }

  return {
    contas,
    lucro,
    falta,
    sobra: Math.max(0, lucro - contas),
    percentual: Math.min(100, Math.max(0, (lucro / contas) * 100)),
    atingiu: lucro >= contas,
    mesAtual,
    diasRestantes,
    porDia: mesAtual && falta > 0 && diasRestantes > 0 ? falta / diasRestantes : null,
  };
}
