// HTML da visão do ano. Só monta a tela; quem baixa a planilha e troca de ano é o historico.js.
import { dinheiro } from './formatos.js';
import { nomeDoMes } from './mes.js';
import { usoDoLimite } from './mei.js';

const linha = (rotulo, valor, destaque = '') =>
  `<div class="resumo ${destaque}"><span>${rotulo}</span><b>${valor}</b></div>`;

const soMes = (ym) => nomeDoMes(ym).split(' de ')[0]; // "outubro de 2026" vira "outubro"
const maiuscula = (t) => t.charAt(0).toUpperCase() + t.slice(1);

// ano = '2026'; resumo = resumoDoAno; limite = limite anual do MEI; anoAtual = ano de hoje (desliga "Próximo")
export function htmlAno({ ano, resumo, limite, anoAtual }) {
  const t = resumo.totais;
  const maior = Math.max(0, ...resumo.meses.map((m) => m.faturamento));
  const mei = usoDoLimite(t.faturamento, limite);

  const meses = resumo.meses
    .map((m) => {
      const largura = maior > 0 ? (m.faturamento / maior) * 100 : 0;
      const detalhe =
        m.diasTrabalhados > 0
          ? `${dinheiro(m.faturamento)} · lucro ${dinheiro(m.lucro)} · ${m.diasTrabalhados} ${m.diasTrabalhados === 1 ? 'dia' : 'dias'}`
          : '—';
      return `
        <div class="resumo"><span>${maiuscula(soMes(m.ym))}</span><b>${detalhe}</b></div>
        <div class="medidor" role="img" aria-label="${maiuscula(soMes(m.ym))}: faturamento de ${dinheiro(m.faturamento)}"><i style="width:${largura}%"></i></div>`;
    })
    .join('');

  const destaque = (m) => (m ? `${maiuscula(soMes(m.ym))} · ${dinheiro(m.lucro)}` : '—');

  return `
    <div class="painel tres">
    <div class="col a">
    <section class="cartao">
      <div class="nav-semana">
        <button type="button" class="ghost" data-ano="anterior">‹ Anterior</button>
        <b>${ano}</b>
        <button type="button" class="ghost" data-ano="proximo" ${ano >= anoAtual ? 'disabled' : ''}>Próximo ›</button>
      </div>
    </section>

    <section class="cartao">
      <h2>Resumo do ano</h2>
      ${linha('Faturamento', dinheiro(t.faturamento), 'total')}
      ${linha('Combustível', '− ' + dinheiro(t.combustivel))}
      ${linha('Gastos (combustível, manutenção, despesas e fixos)', '− ' + dinheiro(t.gastos))}
      ${linha('Lucro líquido', dinheiro(t.lucro), 'total')}
    </section>

    <section class="cartao">
      <h2>Limite do MEI em ${ano}</h2>
      ${linha('Faturado no ano (lançado aqui)', dinheiro(t.faturamento))}
      ${linha('Limite anual', dinheiro(limite))}
      <div class="medidor" role="img" aria-label="${Math.round(mei.percentual)}% do limite usado"><i style="width:${mei.percentual}%"></i></div>
      <p class="suave">${
        mei.estourou
          ? 'Você passou do limite lançado aqui. Procure um contador.'
          : `Você usou ${Math.round(mei.percentual)}% do limite. Restam ${dinheiro(mei.restante)}.`
      } Conta só o que foi lançado no app.</p>
    </section>
    </div>

    <div class="col b">
    <section class="cartao">
      <h2>Mês a mês</h2>
      ${t.diasTrabalhados > 0 ? meses : '<p class="suave">Nenhum dia fechado neste ano.</p>'}
      <p class="suave">A barra mostra o faturamento de cada mês em comparação com o melhor mês.</p>
    </section>
    </div>

    <div class="col c">
    <section class="cartao">
      <h2>Destaques</h2>
      ${linha('Dias trabalhados', String(t.diasTrabalhados))}
      ${linha('Km rodados', Math.round(t.km).toLocaleString('pt-BR') + ' km')}
      ${linha('Lucro médio por mês', t.lucroMedioPorMes === null ? '—' : dinheiro(t.lucroMedioPorMes))}
      ${linha('Lucro médio por dia', t.lucroMedioPorDia === null ? '—' : dinheiro(t.lucroMedioPorDia))}
      ${linha('Melhor mês', destaque(resumo.melhorMes))}
      ${t.mesesTrabalhados > 1 ? linha('Pior mês', destaque(resumo.piorMes)) : ''}
      ${
        t.diasTrabalhados > 0
          ? '<button type="button" class="botao secundario" data-acao="csvAno">Baixar planilha do ano (CSV)</button>'
          : ''
      }
    </section>
    </div>
    </div>`;
}
