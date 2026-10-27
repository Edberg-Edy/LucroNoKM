// Contas do limite anual do MEI. Funções puras, testadas em mei.test.js.

// Soma o faturamento dos dias fechados do ano informado (conta só o que foi lançado no app).
export function faturadoNoAno(dias, ano) {
  return dias
    .filter((d) => d.data.startsWith(String(ano)))
    .reduce((total, d) => total + d.calculados.faturamento, 0);
}

// Quanto do limite já foi usado e quanto resta. O percentual para em 100 para a barra não passar do fim.
export function usoDoLimite(faturado, limite) {
  return {
    percentual: limite > 0 ? Math.min(100, (faturado / limite) * 100) : 0,
    restante: Math.max(0, limite - faturado),
    estourou: limite > 0 && faturado > limite,
  };
}

// Aviso do limite do MEI: só aparece a partir de 80% do limite.
//   nivel: 'ok' (abaixo de 80%) | 'atencao' (80% a 100%) | 'estourou'
//   projecao: quanto o ano fecha se o ritmo médio dos meses até agora continuar (só no ano corrente, a partir do mês 2)
export function alertaMei({ faturado, limite, hoje }) {
  if (!(limite > 0)) return { nivel: 'ok', percentual: 0, restante: 0, projecao: null };
  const uso = usoDoLimite(faturado, limite);
  const percentual = (faturado / limite) * 100; // sem o teto de 100, para o texto dizer quanto passou
  const mes = Number(hoje.slice(5, 7));
  const projecao = mes >= 2 && faturado > 0 ? (faturado / mes) * 12 : null;
  const nivel = uso.estourou ? 'estourou' : percentual >= 80 ? 'atencao' : 'ok';
  return { nivel, percentual, restante: uso.restante, projecao };
}

