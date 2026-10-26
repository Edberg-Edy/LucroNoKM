// Acerto dos custos fixos do mês. Funções puras, testadas em fixos.test.js.
//
// Cada dia trabalhado desconta (custos fixos do mês ÷ dias por mês dos Ajustes). Se você trabalha menos dias
// que o previsto, o mês fecha sem ter descontado tudo o que é devido (o DAS, por exemplo, é cobrado inteiro).

const TOLERANCIA = 1; // R$: diferenças menores que isso são arredondamento

// Soma dos custos fixos mensais dos Ajustes (o que é devido no mês).
export const totalFixos = (fixos) => fixos.reduce((total, x) => total + (Number(x.valorMensal) || 0), 0);

// devido = totalFixos dos Ajustes; descontado = soma dos custos fixos já descontados nos dias do mês;
// terminou = o mês já acabou? (no mês em andamento ainda faltam dias para descontar)
// situacao: 'andamento' | 'ok' | 'falta' (ficou sem descontar) | 'sobra' (descontou a mais)
export function acertoDosFixos({ devido, descontado, terminou }) {
  const diferenca = Math.round((devido - descontado) * 100) / 100;
  let situacao = 'andamento';
  if (terminou) situacao = diferenca > TOLERANCIA ? 'falta' : diferenca < -TOLERANCIA ? 'sobra' : 'ok';
  return { devido, descontado, diferenca, situacao };
}
