// HTML da visão do mês (fechamento mensal). Só monta a tela; quem grava é o historico.js.
import { dataBR, dinheiro, esc } from './formatos.js';
import { nomeDoMes } from './mes.js';
import { variacao } from './semana.js';
import { kmL, litrosBR, dinheiro3 } from './combustivel.js';

const linha = (rotulo, valor, destaque = '') =>
  `<div class="resumo ${destaque}"><span>${rotulo}</span><b>${valor}</b></div>`;

// ym = mês na tela; resumo/anterior = resumoDoMes deste mês e do anterior; info = documento do mês no banco (ou undefined);
// terminou = o mês já acabou?; atual = mês de hoje (para desligar "Próximo");
// progresso = resultado de progressoDoMes (null quando o ajuste "Contas do mês" está em 0)
function htmlProgresso(p, media) {
  if (!p) {
    return `
    <section class="cartao">
      <h2>Contas do mês</h2>
      <p class="suave">Para acompanhar aqui quanto falta para fechar as contas, informe em Ajustes o campo "Contas do mês a cobrir".</p>
    </section>`;
  }

  let texto;
  if (p.atingiu) {
    texto = `Contas do mês cobertas.${p.sobra > 0 ? ` Sobraram ${dinheiro(p.sobra)}.` : ''}`;
  } else if (p.mesAtual && p.porDia !== null) {
    texto =
      `Faltam ${dinheiro(p.falta)}. Com cerca de ${p.diasRestantes} ${p.diasRestantes === 1 ? 'dia' : 'dias'} de trabalho até o fim do mês, ` +
      `são ${dinheiro(p.porDia)} de lucro por dia.` +
      (media !== null ? ` Sua média até agora: ${dinheiro(media)} por dia.` : '');
  } else if (p.mesAtual) {
    texto = `Faltam ${dinheiro(p.falta)} e não restam dias de trabalho neste mês.`;
  } else {
    texto = `As contas deste mês não foram cobertas: faltaram ${dinheiro(p.falta)}.`;
  }

  return `
    <section class="cartao">
      <h2>Contas do mês</h2>
      ${linha('Contas a cobrir', dinheiro(p.contas))}
      ${linha(p.mesAtual ? 'Lucro do mês até agora' : 'Lucro do mês', dinheiro(p.lucro))}
      ${linha(p.atingiu ? 'Sobra' : 'Falta', dinheiro(p.atingiu ? p.sobra : p.falta), 'total')}
      <div class="medidor" role="img" aria-label="${Math.round(p.percentual)}% das contas cobertas"><i style="width:${p.percentual}%"></i></div>
      <p class="suave">${texto}</p>
    </section>`;
}

// Cartão "Meta da semana" (resultado de metaDaSemana), no mesmo estilo do limite do MEI e das contas do mês.
export function htmlMetaSemana(m) {
  if (!m) return '';
  const pl = (n) => `${n} ${n === 1 ? 'dia' : 'dias'}`;
  let texto;
  if (m.atingiu) {
    texto = `Meta da semana batida.${m.sobra > 0 ? ` Sobraram ${dinheiro(m.sobra)}.` : ''}`;
  } else if (m.semanaAtual && m.porDia !== null) {
    texto = m.extra
      ? `Você já fez os ${pl(m.dias)} previstos. Faltam ${dinheiro(m.falta)}: para fechar a meta, seriam ${dinheiro(m.porDia)} por dia em ${pl(m.diasRestantes)} extras até domingo.`
      : `Faltam ${dinheiro(m.falta)}. Restam ${pl(m.diasRestantes)} de trabalho até domingo: são ${dinheiro(m.porDia)} de lucro por dia. Folgou além do previsto? O valor por dia sobe sozinho.`;
  } else if (m.semanaAtual) {
    texto = `Faltam ${dinheiro(m.falta)} e não restam dias de trabalho nesta semana.`;
  } else {
    texto = `Esta semana fechou em ${Math.round(m.percentual)}% da meta: faltaram ${dinheiro(m.falta)}.`;
  }
  return `
      <section class="cartao">
        <h2>Meta da semana</h2>
        ${linha('Meta (' + pl(m.dias) + ' de trabalho)', dinheiro(m.meta))}
        ${linha(m.semanaAtual ? 'Lucro da semana até agora' : 'Lucro da semana', dinheiro(m.lucro))}
        ${linha(m.atingiu ? 'Sobra' : 'Falta', dinheiro(m.atingiu ? m.sobra : m.falta), 'total')}
        <div class="medidor" role="img" aria-label="${Math.round(m.percentual)}% da meta da semana"><i style="width:${m.percentual}%"></i></div>
        <p class="suave">${texto}</p>
      </section>`;
}

// Card de combustível da semana (resultado de combustivelDoPeriodo). Mesmo estilo dos indicadores.
export function htmlCombustivelSemana(c) {
  const real = c.real;
  return `
      <section class="cartao indicadores">
        <div><span>Combustível usado (estimado)</span><b>${dinheiro(c.estimadoValor)}</b></div>
        <div><span>Litros usados (estimado)</span><b>${litrosBR(c.estimadoLitros)} L</b></div>
        <div><span>Combustível por km</span><b>${c.porKm === null ? '—' : dinheiro3(c.porKm)}</b></div>
        <div><span>Km por litro nas contas</span><b>${c.kmPorLitroUsado === null ? '—' : kmL(c.kmPorLitroUsado)}</b></div>
        ${
          real
            ? `<div><span>Gasto nos abastecimentos${real.valorEstimado ? ' (estimado)' : ''}</span><b>${dinheiro(real.valor)}</b></div>
        <div><span>Litros abastecidos</span><b>${litrosBR(real.litros)} L</b></div>
        ${real.precoMedio === null ? '' : `<div><span>Preço médio do litro</span><b>${dinheiro(real.precoMedio)}</b></div>`}
        <div><span>${real.kmPorLitro === null && real.aproximado ? 'Consumo aproximado' : 'Consumo medido'}</span><b>${
                real.kmPorLitro !== null ? kmL(real.kmPorLitro) + ' km/l' : real.aproximado ? kmL(real.aproximado.kmPorLitro) + ' km/l' : '—'
              }</b></div>`
            : ''
        }
      </section>`;
}

// combustivel = resultado de painelDoMes (gasto real com abastecimentos contra o estimado pelos dias)
function htmlCombustivel(c) {
  if (c.abastecimentos === 0) {
    return `
    <section class="cartao">
      <h2>Combustível</h2>
      <p class="suave">Nenhum abastecimento lançado neste mês. Registre na aba Hoje (card Abastecimento), na bomba, para comparar o gasto abastecido com o estimado.</p>
    </section>`;
  }

  const mais = c.diferenca >= 0;
  let dica = '';
  if (c.desvio !== null && Math.abs(c.desvio) >= 0.05) {
    const pontos = Math.round(Math.abs(c.desvio) * 100);
    dica =
      `O consumo ${c.desvioDeEstimativa ? 'aproximado' : 'medido'} está ${pontos}% ${c.desvio < 0 ? 'abaixo' : 'acima'} do km/l dos Ajustes (${kmL(c.kmPorLitroAjuste)}). ` +
      'Em Ajustes, o botão do consumo medido corrige o km/l para os dias novos. ';
  }

  const aviso = c.alerta
    ? `<p class="aviso-topo">O último trecho rendeu ${kmL(c.alerta.ultimo)} km/l, ${Math.round(c.alerta.queda * 100)}% abaixo da média anterior (${kmL(c.alerta.media)}). Vale conferir pneus (calibragem), corrente, filtro de ar e vela.</p>`
    : '';
  return `
    <section class="cartao">
      <h2>Combustível</h2>
      ${aviso}
      ${linha('Gasto nos abastecimentos' + (c.valorEstimado ? ' (litros × preço dos Ajustes)' : ''), dinheiro(c.valor), 'total')}
      ${linha('Estimado pelos dias fechados', dinheiro(c.estimado))}
      ${linha(mais ? 'Gastou a mais que o estimado' : 'Gastou a menos que o estimado', dinheiro(Math.abs(c.diferenca)))}
      ${linha('Litros abastecidos', litrosBR(c.litros) + ' L')}
      ${c.precoMedio === null ? '' : linha('Preço médio do litro', dinheiro(c.precoMedio))}
      ${linha('Consumo medido (tanque a tanque)', c.kmPorLitro === null ? '—' : kmL(c.kmPorLitro) + ' km/l')}
      ${linha('Consumo aproximado (estimativa)', c.aproximado ? kmL(c.aproximado.kmPorLitro) + ' km/l' : '—')}
      ${linha('Custo real por km', c.custoPorKm === null ? '—' : dinheiro3(c.custoPorKm))}
      <p class="suave">${dica}O gasto soma o que foi abastecido no mês: o abastecimento dos últimos dias pode ser para os primeiros dias do mês seguinte. O consumo medido só aparece com dois abastecimentos em que você marcou "Completei o tanque". O aproximado usa todos os abastecimentos (km rodados ÷ litros) e fica mais certo a cada mês.</p>
    </section>`;
}

// f = resultado de acertoDosFixos; lucro = lucro líquido do mês
function htmlFixos(f, lucro) {
  let texto;
  if (f.situacao === 'andamento') {
    texto = `Descontados até agora ${dinheiro(f.descontado)} dos ${dinheiro(f.devido)} devidos no mês (cada dia trabalhado desconta uma parte).`;
  } else if (f.situacao === 'falta') {
    texto =
      `Você trabalhou menos dias do que o previsto nos Ajustes, então ficaram ${dinheiro(f.diferenca)} de custos fixos sem desconto. ` +
      `Separe esse valor também (DAS e internet são cobrados inteiros). O lucro real do mês é ${dinheiro(lucro - f.diferenca)}.`;
  } else if (f.situacao === 'sobra') {
    texto = `Foram descontados ${dinheiro(-f.diferenca)} a mais que o devido (mais dias que o previsto). O lucro real do mês é ${dinheiro(lucro - f.diferenca)}.`;
  } else {
    texto = 'Os custos fixos do mês foram todos descontados pelos dias trabalhados.';
  }
  return `
    <section class="cartao">
      <h2>Custos fixos do mês</h2>
      ${linha('Devido no mês (Ajustes)', dinheiro(f.devido))}
      ${linha('Descontado nos dias', dinheiro(f.descontado))}
      <p class="suave">${texto}</p>
    </section>`;
}

export function htmlMes({ ym, resumo, anterior, info, terminou, atual, progresso, combustivel, fixos }) {
  const t = resumo.totais;
  const fechado = info?.fechado === true;
  const marcas = info?.checklist || {};
  const v = variacao(t.lucro, anterior.totais.lucro);
  const textoVariacao = v === null ? '—' : `${v > 0 ? '+' : ''}${Math.round(v)}%`;
  const destaque = (d) => (d ? `${dataBR(d.data).slice(0, 5)} · ${dinheiro(d.lucro)}` : '—');
  const temDias = t.diasTrabalhados > 0;

  let acao;
  if (fechado) {
    acao = `<p class="suave">Os dias deste mês estão travados: não podem ser editados nem excluídos, e não dá para abrir novos dias nele.</p>
      <button type="button" class="botao secundario" data-acao="reabrirMes">Reabrir o mês</button>`;
  } else if (!temDias) {
    acao = '<p class="suave">Nenhum dia fechado neste mês.</p>';
  } else if (!terminou) {
    acao = `<p class="suave">O mês ainda não terminou. Dá para fechar a partir do último dia dele, para não travar dias que ainda vão acontecer.</p>
      <button type="button" class="botao" disabled>Fechar o mês</button>`;
  } else {
    acao = '<button type="button" class="botao" data-acao="fecharMes">Fechar o mês</button>';
  }

  return `
    <div class="painel tres">
    <div class="col a">
    <section class="cartao">
      <div class="nav-semana">
        <button type="button" class="ghost" data-mes="anterior">‹ Anterior</button>
        <b>${nomeDoMes(ym)}</b>
        <button type="button" class="ghost" data-mes="proximo" ${ym >= atual ? 'disabled' : ''}>Próximo ›</button>
      </div>
      ${fechado ? '<p class="suave">🔒 Mês fechado</p>' : ''}
    </section>

    <section class="cartao">
      <h2>Resumo do mês</h2>
      ${linha('Faturamento', dinheiro(t.faturamento), 'total')}
      ${linha('Combustível', '− ' + dinheiro(t.combustivel))}
      ${linha('Manutenção da moto', '− ' + dinheiro(t.manutencao))}
      ${linha('Despesas', '− ' + dinheiro(t.despesas))}
      ${linha('Custos fixos (rateio)', '− ' + dinheiro(t.fixos))}
      ${linha('Lucro líquido', dinheiro(t.lucro), 'total')}
    </section>

    <section class="cartao">
      <h2>Seu dinheiro do mês</h2>
      ${linha('Livre para gastar', dinheiro(t.lucro), 'total')}
      ${linha('Guardar (combustível, moto e custos fixos)', dinheiro(t.guardar + t.combustivel), 'total')}
      ${
        temDias
          ? `<p class="suave" style="margin-top:8px">Separe ${dinheiro(t.guardar + t.combustivel)} deste mês: ${dinheiro(t.combustivel)} para os abastecimentos, ${dinheiro(t.manutencao)} para a moto e ${dinheiro(t.fixos)} para os custos fixos (DAS, internet etc.). As despesas você já pagou. Só o que sobra é seu para gastar.${t.lucro < 0 ? ' O mês não cobriu os custos.' : ''}</p>`
          : ''
      }
    </section>

    ${temDias && fixos ? htmlFixos(fixos, t.lucro) : ''}

    ${htmlProgresso(progresso, t.mediaPorDia)}
    </div>

    <div class="col b">
    <section class="cartao indicadores">
      <div><span>Dias trabalhados</span><b>${t.diasTrabalhados}</b></div>
      <div><span>Média por dia</span><b>${t.mediaPorDia === null ? '—' : dinheiro(t.mediaPorDia)}</b></div>
      <div><span>Km rodados</span><b>${Math.round(t.km)}</b></div>
      <div><span>Ganho por km</span><b>${t.ganhoPorKm === null ? '—' : dinheiro(t.ganhoPorKm)}</b></div>
      <div><span>Corridas</span><b>${t.corridas || '—'}</b></div>
      <div><span>Ganho por corrida</span><b>${t.ganhoPorCorrida === null ? '—' : dinheiro(t.ganhoPorCorrida)}</b></div>
      <div><span>Vs. mês anterior</span><b>${textoVariacao}</b></div>
      <div><span>Melhor dia</span><b>${destaque(resumo.melhor)}</b></div>
      ${t.diasTrabalhados > 1 ? `<div><span>Pior dia</span><b>${destaque(resumo.pior)}</b></div>` : ''}
    </section>

    ${combustivel ? htmlCombustivel(combustivel) : ''}

    ${
      resumo.plataformas.length
        ? `<section class="cartao"><h2>Por plataforma</h2>${resumo.plataformas
            .map((p) =>
              linha(
                esc(p.nome) + (p.corridas ? ` · ${p.corridas} corridas · ${dinheiro(p.valorComCorridas / p.corridas)}/corrida` : ''),
                dinheiro(p.valor)
              )
            )
            .join('')}</section>`
        : ''
    }
    </div>

    <div class="col c">
    <section class="cartao">
      <h2>Fechamento</h2>
      <label class="marca"><input type="checkbox" data-check="dasPago" ${marcas.dasPago ? 'checked' : ''}> DAS-MEI pago</label>
      <label class="marca"><input type="checkbox" data-check="reservaTransferida" ${marcas.reservaTransferida ? 'checked' : ''}> Valor guardado transferido para a reserva</label>
      <label>Observação (opcional)
        <input type="text" data-obs value="${esc(info?.observacao || '')}">
      </label>
      <p class="suave">O DAS vence no dia 20 do mês seguinte, por isso estas marcas podem ser alteradas mesmo depois de fechar o mês.</p>
      ${acao}
      ${temDias ? '<button type="button" class="botao secundario" data-acao="csv">Baixar planilha do mês (CSV)</button>' : ''}
    </section>
    </div>
    </div>`;
}
