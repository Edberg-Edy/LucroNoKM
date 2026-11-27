// Valores iniciais dos Ajustes. São usados no primeiro acesso e podem ser editados na tela de Ajustes.
// É uma função para devolver uma cópia nova a cada uso (assim ninguém altera o original sem querer).
export function padroes() {
  return {
    meta: 200, // lucro desejado por dia (R$)
    kmPorLitro: 35,
    precoLitro: 6.2,
    diasPorMes: 24, // dias trabalhados por mês, usado para ratear os custos fixos
    tipoEmpresa: 'MEI', // MEI | ME | EPP | OUTRO: muda o nome e o limite sugerido do faturamento anual
    limiteMei: 81000, // limite anual de faturamento do MEI (R$)
    contasMes: 0, // contas pessoais que o lucro do mês precisa cobrir (R$). 0 = não usar o acompanhamento
    plataformas: ['iFood', 'Rappi', '99', 'Loggi', 'Particular'],
    // Manutenção: preço da peça e quantos km ela dura
    manutencao: [
      { item: 'Óleo e filtro', preco: 50, duracaoKm: 1000 },
      { item: 'Pneu traseiro', preco: 250, duracaoKm: 10000 },
      { item: 'Pneu dianteiro', preco: 200, duracaoKm: 15000 },
      { item: 'Kit relação', preco: 250, duracaoKm: 20000 },
      { item: 'Freios', preco: 100, duracaoKm: 10000 },
      { item: 'Revisões e imprevistos', preco: 600, duracaoKm: 10000 },
    ],
    // Custos fixos mensais (o app divide pelos dias trabalhados)
    fixos: [
      { item: 'Internet e celular (uso no trabalho)', valorMensal: 60 },
      { item: 'DAS-MEI', valorMensal: 86.05 },
    ],
  };
}