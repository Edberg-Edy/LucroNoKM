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

// Card "Para guardar na semana". t = totais da semana; f = resultado de fixosDaSemana (ou null sem custos fixos).
// Os custos fixos entram pelo valor previsto da semana inteira: folgar não diminui a conta do mês.
export function htmlGuardarSemana(t, f) {
  const fixos = f ? f.previsto : t.fixos;
  const total = t.combustivel + t.manutencao + t.despesas + fixos;
  const pl = (n) => `${n} ${n === 1 ? 'dia' : 'dias'}`;
  let nota = '';
  const doAtraso = f && f.atraso > 0.005 ? ` (inclui ${dinheiro(f.atraso)} da semana anterior)` : '';
  if (f && f.falta > 0.005) {
    if (f.semanaAtual && f.extraPorDia !== null) {
      nota = `Faltam ${dinheiro(f.falta)} de custos fixos${doAtraso}. Restam ${pl(f.diasRestantes)} de trabalho: ${dinheiro(f.extraPorDia)} por dia.`;
    } else if (f.semanaAtual) {
      nota = `Faltam ${dinheiro(f.falta)} de custos fixos${doAtraso} e não restam dias de trabalho nesta semana.`;
    } else {
      nota = `Ficaram faltando ${dinheiro(f.falta)} de custos fixos nesta semana.`;
    }
  } else if (doAtraso) {
    nota = `Custos fixos${doAtraso}.`;
  }
  return `
      <section class="cartao">
        <h2>Para guardar na semana</h2>
        ${linha('Combustível', dinheiro(t.combustivel))}
        ${linha('Manutenção da moto', dinheiro(t.manutencao))}
        ${linha('Despesas', dinheiro(t.despesas))}
        ${linha(f ? `Custos fixos (${pl(f.dias)} de trabalho)` : 'Custos fixos', dinheiro(fixos))}
        ${linha('Guardar na semana', dinheiro(total), 'total')}
        ${nota ? `<p class="suave" style="margin-top:8px">${nota}</p>` : ''}
      </section>`;
}

// Card de combustível da semana (resultado de combustivelDoPeriodo): quatro números, sem repetir o que já está nas contas.
export function htmlCombustivelSemana(c) {
  const real = c.real;
  const kmPorLitro = real && real.kmPorLitro !== null ? real.kmPorLitro : real && real.aproximado ? real.aproximado.kmPorLitro : c.kmPorLitroUsado;
  const estimado = !real || real.valorEstimado;
  const valor = real ? real.valor : c.estimadoValor;
  const litros = real ? real.litros : c.estimadoLitros;
  const sufixo = !real ? ' (estimado)' : estimado ? ' (litros × preço dos Ajustes)' : '';
  return `
      <section class="cartao indicadores">
        <div><span>Km rodados</span><b>${Math.round(c.km)}</b></div>
        <div><span>Km por litro</span><b>${kmPorLitro === null || kmPorLitro === undefined ? '—' : kmL(kmPorLitro) + ' km/l'}</b></div>
        <div><span>Litros usados${!real ? ' (estimado)' : ''}</span><b>${litrosBR(litros)} L</b></div>
        <div><span>Valor do combustível${sufixo}</span><b>${dinheiro(valor)}</b></div>
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

  const aviso = c.alerta
    ? `<p class="aviso-topo">O último trecho rendeu ${kmL(c.alerta.ultimo)} km/l, ${Math.round(c.alerta.queda * 100)}% abaixo da média anterior (${kmL(c.alerta.media)}). Vale conferir pneus (calibragem), corrente, filtro de ar e vela.</p>`
    : '';
  const consumo = c.kmPorLitro !== null ? c.kmPorLitro : c.aproximado ? c.aproximado.kmPorLitro : null;
  return `
    <section class="cartao">
      <h2>Combustível do mês</h2>
      ${aviso}
      <div class="indicadores sem-caixa">
        <div><span>Valor abastecido</span><b>${dinheiro(c.valor)}</b></div>
        <div><span>Litros abastecidos</span><b>${litrosBR(c.litros)} L</b></div>
        <div><span>Consumo médio${c.kmPorLitro === null ? ' (aproximado)' : ''}</span><b>${consumo === null ? '—' : kmL(consumo) + ' km/l'}</b></div>
        <div><span>Custo por km</span><b>${c.custoPorKm === null ? '—' : dinheiro3(c.custoPorKm)}</b></div>
      </div>
      <details class="como">
        <summary>Como é calculado?</summary>
        <p class="suave">O valor soma os litros abastecidos no mês × o preço do litro dos Ajustes (ou o valor pago, se você informou). O consumo medido só aparece com dois abastecimentos em que você marcou "Completei o tanque"; o aproximado usa todos (km rodados ÷ litros) e fica mais certo a cada mês.</p>
      </details>
    </section>`;
}

// f = resultado de acertoDosFixos; lucro = lucro líquido do mês. Conta só deste mês (nada de meses anteriores).
function htmlFixos(f, lucro) {
  let texto;
  if (f.situacao === 'andamento') {
    texto = 'Cada dia trabalhado desconta uma parte. O que faltar vai sendo descontado nos próximos dias.';
  } else if (f.situacao === 'falta') {
    texto = `Você trabalhou menos dias que o previsto nos Ajustes. Separe também os ${dinheiro(f.diferenca)} que faltaram: DAS e internet são cobrados inteiros. Lucro real do mês: ${dinheiro(lucro - f.diferenca)}.`;
  } else if (f.situacao === 'sobra') {
    texto = `Foram descontados ${dinheiro(-f.diferenca)} a mais que o devido (mais dias que o previsto). Lucro real do mês: ${dinheiro(lucro - f.diferenca)}.`;
  } else {
    texto = 'Todos os custos fixos do mês foram descontados pelos dias trabalhados.';
  }
  return `
    <section class="cartao">
      <h2>Custos fixos do mês</h2>
      ${linha('Total do mês (Ajustes)', dinheiro(f.devido))}
      ${linha('Já descontado nos dias', dinheiro(f.descontado))}
      ${linha('Falta descontar', dinheiro(Math.max(0, f.devido - f.descontado)))}
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
      ${linha('Custos fixos', '− ' + dinheiro(t.fixos))}
      ${linha('Lucro líquido', dinheiro(t.lucro), 'total')}
    </section>

    <section class="cartao">
      <h2>Seu dinheiro do mês</h2>
      ${linha('Faturamento', dinheiro(t.faturamento))}
      ${linha('Já usado: combustível e despesas', '− ' + dinheiro(t.combustivel + t.despesas))}
      ${linha('Para guardar: moto e custos fixos', '− ' + dinheiro(t.manutencao + t.fixos))}
      ${linha('Livre para gastar', dinheiro(t.lucro), 'total')}
      ${
        temDias
          ? `<p class="suave" style="margin-top:8px">Guardar de verdade: ${dinheiro(t.manutencao + t.fixos)} (${dinheiro(t.manutencao)} para a moto e ${dinheiro(t.fixos)} para os custos fixos). O combustível e as despesas já saíram do caixa durante o mês.</p>`
          : ''
      }
    </section>

    ${temDias && fixos ? htmlFixos(fixos, t.lucro) : ''}

    ${htmlProgresso(progresso, t.mediaPorDia)}
    </div>

    <div class="col b">
    <section class="cartao indicadores">
      <div><span>Dias trabalhados</span><b>${t.diasTrabalhados}</b></div>
      <div><span>Lucro médio por dia</span><b>${t.mediaPorDia === null ? '—' : dinheiro(t.mediaPorDia)}</b></div>
      <div><span>Km rodados</span><b>${Math.round(t.km)}</b></div>
      <div><span>Lucro por km</span><b>${t.lucroPorKm === null ? '—' : dinheiro(t.lucroPorKm)}</b></div>
      <div><span>Corridas</span><b>${t.corridas || '—'}</b></div>
      <div><span>Lucro por corrida</span><b>${t.lucroPorCorrida === null ? '—' : dinheiro(t.lucroPorCorrida)}</b></div>
      <div><span>Vs. mês anterior</span><b>${textoVariacao}</b></div>
      <div class="larga"><span>Melhor dia</span><b>${destaque(resumo.melhor)}</b></div>
      ${t.diasTrabalhados > 1 ? `<div class="larga"><span>Pior dia</span><b>${destaque(resumo.pior)}</b></div>` : ''}
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
        <input type="text" data-obs maxlength="2000" value="${esc(info?.observacao || '')}">
      </label>
      <p class="suave">O DAS vence no dia 20 do mês seguinte, por isso estas marcas podem ser alteradas mesmo depois de fechar o mês.</p>
      ${acao}
      ${temDias ? '<button type="button" class="botao secundario" data-acao="csv">Baixar planilha do mês (CSV)</button>' : ''}
    </section>
    </div>
    </div>`;
}
