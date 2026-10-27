// Resumo do ano, mês a mês. Função pura (sem tela e sem Firebase), testada em ano.test.js.
import { resumoDoMes } from './mes.js';

// dias = dias fechados (qualquer ano); ano = '2026'.
// Devolve os 12 meses (meses sem dia ficam zerados), os totais do ano e o melhor e o pior mês trabalhado.
export function resumoDoAno(dias, ano) {
  const meses = [];
  for (let m = 1; m <= 12; m++) {
    const ym = `${ano}-${String(m).padStart(2, '0')}`;
    const t = resumoDoMes(dias, ym).totais;
    meses.push({
      ym,
      diasTrabalhados: t.diasTrabalhados,
      faturamento: t.faturamento,
      combustivel: t.combustivel,
      gastos: t.gastos,
      lucro: t.lucro,
      km: t.km,
    });
  }

  const trabalhados = meses.filter((m) => m.diasTrabalhados > 0);
  const soma = (campo) => meses.reduce((total, m) => total + m[campo], 0);
  const lucro = soma('lucro');
  const faturamento = soma('faturamento');
  const diasTrabalhados = soma('diasTrabalhados');

  const melhorMes = trabalhados.reduce((a, b) => (b.lucro > a.lucro ? b : a), trabalhados[0] || null);
  const piorMes = trabalhados.reduce((a, b) => (b.lucro < a.lucro ? b : a), trabalhados[0] || null);

  return {
    meses,
    totais: {
      faturamento,
      combustivel: soma('combustivel'),
      gastos: soma('gastos'),
      lucro,
      km: soma('km'),
      diasTrabalhados,
      mesesTrabalhados: trabalhados.length,
      lucroMedioPorMes: trabalhados.length > 0 ? lucro / trabalhados.length : null,
      lucroMedioPorDia: diasTrabalhados > 0 ? lucro / diasTrabalhados : null,
    },
    melhorMes,
    piorMes,
  };
}
