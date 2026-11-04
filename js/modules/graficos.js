// Gráficos de barras do histórico, feitos só com HTML e CSS (sem biblioteca). Aqui só se monta o HTML.
const NOMES = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const ALTURA = 100; // altura em pixels da barra mais alta

const reais = (n) => 'R$' + Math.round(n).toLocaleString('pt-BR');
const altura = (valor, maximo) => Math.max(2, Math.round((Math.max(0, valor) / maximo) * ALTURA));

// Maior valor entre lucros e gastos da semana. Os dois gráficos usam a mesma escala para poderem ser comparados.
export function maiorValor(porDia) {
  return Math.max(1, ...porDia.map((d) => Math.max(d.lucro, d.gastos)));
}

// Gráfico de lucro: cada barra usa a cor do farol do dia (verde, amarelo ou vermelho).
export function htmlGraficoLucro(porDia, maximo, selecionado) {
  return `<div class="barras">${porDia
    .map(
      (d, i) => `
    <button type="button" class="barra-dia" data-dia="${d.data}" aria-pressed="${selecionado === d.data}" aria-label="${d.tem ? reais(d.lucro) + ' ' : ''}${NOMES[i]}">
      <small class="${d.tem ? d.status : ''}">${d.tem ? reais(d.lucro) : ''}</small>
      <i class="${d.tem ? d.status : 'vazio'}" style="height:${d.tem ? altura(d.lucro, maximo) : 2}px"></i>
      <span>${NOMES[i]}</span>
    </button>`
    )
    .join('')}</div>`;
}

// Gráfico de gastos: cor neutra, porque gasto é só controle visual.
export function htmlGraficoGastos(porDia, maximo, selecionado) {
  return `<div class="barras">${porDia
    .map(
      (d, i) => `
    <button type="button" class="barra-dia" data-dia="${d.data}" aria-pressed="${selecionado === d.data}" aria-label="${d.tem ? reais(d.gastos) + ' ' : ''}${NOMES[i]}">
      <small>${d.tem ? reais(d.gastos) : ''}</small>
      <i class="${d.tem ? 'neutra' : 'vazio'}" style="height:${d.tem ? altura(d.gastos, maximo) : 2}px"></i>
      <span>${NOMES[i]}</span>
    </button>`
    )
    .join('')}</div>`;
}