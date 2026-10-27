// Aba Histórico: visão da semana (gráficos, resumo, lista de dias com editar e excluir, limite do MEI) e visão do mês (fechamento mensal).
import { listarDiasFechados, buscarDiaAberto, reabrirDia, excluirDia } from '../services/dias.js';
import { carregarConfig } from '../services/dados.js';
import { listarAbastecimentos, excluirAbastecimentoDoDia, idDoDia } from '../services/abastecimentos.js';
import { listarMeses, salvarMes, fecharMes, reabrirMes } from '../services/meses.js';
import { faturadoNoAno, usoDoLimite, alertaMei } from './mei.js';
import { csvDoMes, baixarCSV } from './exportar.js';
import { resumoDaSemana, inicioDaSemana, datasDaSemana, somarDias, variacao } from './semana.js';
import { mesDe, somarMeses, mesJaTerminou, resumoDoMes, progressoDoMes } from './mes.js';
import { htmlMes, htmlCombustivelSemana } from './visaoMes.js';
import { painelDoMes, combustivelDoPeriodo } from './combustivel.js';
import { acertoDosFixos, totalFixos } from './fixos.js';
import { htmlGraficoLucro, htmlGraficoGastos, maiorValor } from './graficos.js';
import { htmlResultado } from './resultado.js';
import { hojeISO, dataBR, dinheiro, esc } from './formatos.js';

const linha = (rotulo, valor) => `<div class="resumo"><span>${rotulo}</span><b>${valor}</b></div>`;
const selo = { verde: 'Meta', amarelo: 'Abaixo', vermelho: 'Prejuízo' };

// "caixa" é o espaço da tela onde a aba aparece; "usuario" é quem está logado.
export async function telaHistorico(caixa, usuario) {
  caixa.innerHTML = '<p class="suave">Carregando histórico…</p>';

  let dias;
  let config;
  let meses; // meses já gravados (fechamento e checklist), por 'aaaa-mm'
  let diaAberto; // dia que está aberto ou em edição (não entra nos totais até ser salvo), ou null
  let abastecimentos; // abastecimentos de combustível (se não carregarem, o resto do histórico continua funcionando)
  try {
    [dias, config, meses, diaAberto, abastecimentos] = await Promise.all([
      listarDiasFechados(usuario.uid),
      carregarConfig(usuario.uid),
      listarMeses(usuario.uid),
      buscarDiaAberto(usuario.uid),
      listarAbastecimentos(usuario.uid).catch(() => []),
    ]);
  } catch (e) {
    caixa.innerHTML = `<section class="cartao"><h1>Histórico</h1>
      <p class="erro">Não foi possível carregar o histórico (${esc(e.code || 'erro')}). Confira a internet.</p></section>`;
    return;
  }

  const semanaAtual = inicioDaSemana(hojeISO());
  let inicio = semanaAtual; // segunda-feira da semana que está na tela
  let selecionado = null; // dia tocado no gráfico (filtra a lista)
  let verDia = null; // dia aberto em detalhe
  let aviso = ''; // mensagem curta (ex.: dia excluído)
  let confirmarExcluir = null; // id do dia que aguarda o segundo toque em ✕
  let modo = 'semana'; // 'semana' ou 'mes'
  let ym = mesDe(hojeISO()); // mês que está na tela (aaaa-mm)

  // Dia de um mês fechado fica travado: não pode ser editado nem excluído.
  const travado = (d) => meses[mesDe(d.data)]?.fechado === true;

  function desenhar() {
    if (verDia) {
      caixa.innerHTML = `<button type="button" class="ghost" data-acao="voltar">← Voltar</button>${htmlResultado(verDia)}`;
      return;
    }

    // Dia aberto/em edição fica fora dos totais: avisa e dá um atalho para a aba Hoje
    const avisoAberto = diaAberto
      ? `<p class="aviso-topo" role="status">${
          diaAberto.odometroFinal !== undefined
            ? `O dia ${dataBR(diaAberto.data)} está em edição e fora dos totais até você salvar.`
            : `O dia ${dataBR(diaAberto.data)} está aberto e ainda não entra nos totais.`
        } <button type="button" class="ghost" data-acao="irHoje">Ir para Hoje</button></p>`
      : '';
    // Alerta do limite do MEI (a partir de 80%), no ano corrente, em qualquer visão
    const anoAtual = hojeISO().slice(0, 4);
    const m = alertaMei({ faturado: faturadoNoAno(dias, anoAtual), limite: config.limiteMei, hoje: hojeISO() });
    const avisoMei =
      m.nivel === 'ok'
        ? ''
        : `<p class="aviso-topo" role="status">${
            m.nivel === 'estourou'
              ? `Atenção: você já faturou ${dinheiro(faturadoNoAno(dias, anoAtual))} em ${anoAtual}, acima do limite do MEI (${dinheiro(config.limiteMei)}). Procure um contador.`
              : `Atenção: você já usou ${Math.round(m.percentual)}% do limite do MEI em ${anoAtual}. Restam ${dinheiro(m.restante)}.` +
                (m.projecao ? ` No ritmo atual o ano fecha perto de ${dinheiro(m.projecao)}${m.projecao > config.limiteMei ? ', acima do limite' : ''}.` : '')
          } Conta só o que foi lançado no app.</p>`;
    const avisoHtml = avisoMei + (aviso ? `<p class="aviso-topo" role="status">${esc(aviso)}</p>` : '') + avisoAberto;
    const seletor = `<div class="modo" role="group" aria-label="Período">
      <button type="button" data-modo="semana" aria-pressed="${modo === 'semana'}">Semana</button>
      <button type="button" data-modo="mes" aria-pressed="${modo === 'mes'}">Mês</button>
    </div>`;

    if (modo === 'mes') {
      const resumoAtual = resumoDoMes(dias, ym);
      const terminou = mesJaTerminou(ym, hojeISO());
      caixa.innerHTML =
        avisoHtml +
        seletor +
        htmlMes({
          ym,
          resumo: resumoAtual,
          anterior: resumoDoMes(dias, somarMeses(ym, -1)),
          info: meses[ym],
          terminou,
          atual: mesDe(hojeISO()),
          progresso: progressoDoMes({
            ym,
            hoje: hojeISO(),
            lucro: resumoAtual.totais.lucro,
            contas: config.contasMes,
            diasPorMes: config.diasPorMes,
            hojeFechado: dias.some((d) => d.data === hojeISO()),
          }),
          combustivel: painelDoMes(abastecimentos, ym, {
            estimado: resumoAtual.totais.combustivel,
            kmPorLitroAjuste: config.kmPorLitro,
          }),
          fixos: acertoDosFixos({ devido: totalFixos(config.fixos), descontado: resumoAtual.totais.fixos, terminou }),
        });
      return;
    }

    const datas = datasDaSemana(inicio);
    const semana = resumoDaSemana(dias, datas);
    const anterior = resumoDaSemana(dias, datasDaSemana(somarDias(inicio, -7)));
    const t = semana.totais;
    const combustivel = combustivelDoPeriodo(dias.filter((d) => datas.includes(d.data)), abastecimentos, datas);
    const maximo = maiorValor(semana.porDia);

    const v = variacao(t.lucro, anterior.totais.lucro);
    const textoVariacao = v === null ? '—' : `${v > 0 ? '+' : ''}${Math.round(v)}%`;

    const ano = datas[3].slice(0, 4);
    const faturado = faturadoNoAno(dias, ano);
    const mei = usoDoLimite(faturado, config.limiteMei);

    const lista = dias
      .filter((d) => datas.includes(d.data) && (!selecionado || d.data === selecionado))
      .sort((a, b) => (a.data < b.data ? 1 : -1));

    caixa.innerHTML = `
      ${avisoHtml}
      ${seletor}
      <div class="painel tres">
      <div class="col a">
      <section class="cartao">
        <div class="nav-semana">
          <button type="button" class="ghost" data-semana="anterior">‹ Anterior</button>
          <b>${dataBR(datas[0]).slice(0, 5)} a ${dataBR(datas[6]).slice(0, 5)}</b>
          <button type="button" class="ghost" data-semana="proxima" ${inicio >= semanaAtual ? 'disabled' : ''}>Próxima ›</button>
        </div>
        <h2 style="margin-top:8px">Lucro</h2>
        ${htmlGraficoLucro(semana.porDia, maximo, selecionado)}
        <p class="suave legenda"><span class="verde">Verde</span>: bateu a meta · <span class="amarelo">Amarelo</span>: lucro abaixo da meta · <span class="vermelho">Vermelho</span>: prejuízo</p>
      </section>

      <section class="cartao">
        <h2>Gastos do dia</h2>
        ${htmlGraficoGastos(semana.porDia, maximo, selecionado)}
        <p class="suave legenda">Combustível, manutenção, despesas e custos fixos, na mesma escala do gráfico de lucro.</p>
      </section>
      </div>

      <div class="col b">
      <section class="cartao indicadores">
        <div><span>Faturamento</span><b>${dinheiro(t.faturamento)}</b></div>
        <div><span>Gastos totais</span><b>${dinheiro(t.gastos)}</b></div>
        <div><span>Lucro</span><b>${dinheiro(t.lucro)}</b></div>
        <div><span>Guardar na semana</span><b>${dinheiro(t.guardar)}</b></div>
        <div><span>Vs. semana anterior</span><b>${textoVariacao}</b></div>
        <div><span>Dias trabalhados</span><b>${t.diasTrabalhados}</b></div>
        <div><span>Média por dia</span><b>${t.mediaPorDia === null ? '—' : dinheiro(t.mediaPorDia)}</b></div>
        <div><span>Km rodados</span><b>${Math.round(t.km)}</b></div>
      </section>
      ${t.diasTrabalhados ? htmlCombustivelSemana(combustivel) : ''}
      ${
        t.diasTrabalhados
          ? `<p class="suave aviso">Separe ${dinheiro(t.guardar)} desta semana (manutenção e custos fixos). Os ${dinheiro(t.lucro)} restantes são o que você pode gastar.</p>`
          : ''
      }

      ${
        semana.plataformas.length
          ? `<section class="cartao"><h2>Por plataforma</h2>${semana.plataformas
              .map((p) =>
                linha(
                  esc(p.nome) +
                    (p.corridas ? ` · ${p.corridas} corridas · ${dinheiro(p.valorComCorridas / p.corridas)}/corrida` : ''),
                  dinheiro(p.valor)
                )
              )
              .join('')}</section>`
          : ''
      }
      </div>

      <div class="col c">
      <section class="cartao">
        <h2>${selecionado ? 'Dia ' + dataBR(selecionado).slice(0, 5) : 'Dias da semana'}</h2>
        ${
          lista.length
            ? lista
                .map(
                  (d) => `
          <div class="item-dia">
            <button type="button" class="ver" data-ver="${d.id}">
              <b>${dataBR(d.data).slice(0, 5)}</b> · lucro ${dinheiro(d.calculados.lucro)}<br>
              <small>ganho ${dinheiro(d.calculados.faturamento)} · gasto ${dinheiro(d.calculados.gastos)}</small>
            </button>
            <span class="selo ${d.calculados.status}">${selo[d.calculados.status]}</span>
            ${
              travado(d)
                ? '<span class="cadeado" role="img" aria-label="Mês fechado">🔒</span>'
                : `<button type="button" class="x ed" data-editar="${d.id}" aria-label="Editar dia">✎</button>
            <button type="button" class="x ${confirmarExcluir === d.id ? 'cfm' : ''}" data-excluir="${d.id}" aria-label="Excluir dia">${confirmarExcluir === d.id ? 'Excluir?' : '✕'}</button>`
            }
          </div>`
                )
                .join('')
            : '<p class="suave">Nenhum dia fechado aqui.</p>'
        }
      </section>
      </div>

      <div class="col d">
      <section class="cartao">
        <h2>Limite do MEI em ${ano}</h2>
        ${linha('Faturado no ano (lançado aqui)', dinheiro(faturado))}
        ${linha('Limite anual', dinheiro(config.limiteMei))}
        <div class="medidor" role="img" aria-label="${Math.round(mei.percentual)}% do limite usado"><i style="width:${mei.percentual}%"></i></div>
        <p class="suave">${
          mei.estourou
            ? 'Você passou do limite lançado aqui. Procure um contador.'
            : `Você usou ${Math.round(mei.percentual)}% do limite. Restam ${dinheiro(mei.restante)}.`
        } Conta só o que foi lançado no app.</p>
      </section>
      </div>
      </div>`;
  }

  // Edição: reabre o dia e leva para a aba Hoje. Só um dia pode estar aberto por vez.
  async function editar(id) {
    const alvo = dias.find((d) => d.id === id);
    if (alvo && travado(alvo)) {
      aviso = 'Este mês está fechado. Reabra o mês para editar ou excluir dias.';
      return desenhar();
    }
    try {
      if (await buscarDiaAberto(usuario.uid)) {
        aviso = 'Já existe um dia aberto. Feche ou descarte esse dia na aba Hoje antes de editar outro.';
        return desenhar();
      }
      await reabrirDia(usuario.uid, id);
      location.hash = 'hoje';
    } catch (e) {
      aviso = 'Não foi possível abrir o dia para edição. Confira a internet.';
      desenhar();
    }
  }

  // Exclusão: o primeiro toque pede confirmação, o segundo exclui.
  async function excluir(id) {
    const alvo = dias.find((d) => d.id === id);
    if (alvo && travado(alvo)) {
      aviso = 'Este mês está fechado. Reabra o mês para editar ou excluir dias.';
      return desenhar();
    }
    if (confirmarExcluir !== id) {
      confirmarExcluir = id;
      desenhar();
      setTimeout(() => {
        if (confirmarExcluir === id) {
          confirmarExcluir = null;
          desenhar();
        }
      }, 4000);
      return;
    }
    try {
      await excluirDia(usuario.uid, id);
      excluirAbastecimentoDoDia(usuario.uid, id).catch(() => {}); // o abastecimento informado nesse dia sai junto
      abastecimentos = abastecimentos.filter((a) => a.id !== idDoDia(id));
      dias = dias.filter((d) => d.id !== id);
      aviso = 'Dia excluído.';
      selecionado = null;
    } catch (e) {
      aviso = 'Não foi possível excluir. Confira a internet.';
    }
    confirmarExcluir = null;
    desenhar();
  }

  // Fechar o mês: grava os totais e trava os dias dele.
  async function fecharOMes() {
    const resumo = resumoDoMes(dias, ym);
    if (!mesJaTerminou(ym, hojeISO()) || resumo.totais.diasTrabalhados === 0) return;
    try {
      const aberto = await buscarDiaAberto(usuario.uid);
      if (aberto && mesDe(aberto.data) === ym) {
        aviso = 'Há um dia aberto neste mês. Feche ou descarte esse dia na aba Hoje antes de fechar o mês.';
        return desenhar();
      }
      await fecharMes(usuario.uid, ym, resumo.totais);
      meses[ym] = { ...(meses[ym] || {}), fechado: true, totais: resumo.totais };
      aviso = 'Mês fechado. Os dias dele não podem mais ser editados nem excluídos.';
    } catch (e) {
      aviso = 'Não foi possível fechar o mês. Confira a internet e tente de novo.';
    }
    desenhar();
  }

  async function reabrirOMes() {
    try {
      await reabrirMes(usuario.uid, ym);
      meses[ym] = { ...(meses[ym] || {}), fechado: false };
      aviso = 'Mês reaberto.';
    } catch (e) {
      aviso = 'Não foi possível reabrir o mês. Confira a internet e tente de novo.';
    }
    desenhar();
  }

  // Checklist e observação: gravados na hora, mesmo com o mês fechado (o DAS só vence no mês seguinte).
  caixa.addEventListener('change', async (evento) => {
    const campo = evento.target;
    const marca = campo.dataset.check;
    if (!marca && !campo.hasAttribute('data-obs')) return;

    const atual = meses[ym] || {};
    const novo = marca
      ? { checklist: { ...(atual.checklist || {}), [marca]: campo.checked } }
      : { observacao: campo.value.trim() };
    try {
      await salvarMes(usuario.uid, ym, novo);
      meses[ym] = { ...atual, ...novo };
    } catch (e) {
      aviso = 'Não foi possível salvar. Confira a internet e tente de novo.';
    }
    desenhar();
  });

  caixa.addEventListener('click', (evento) => {
    const botao = evento.target.closest('button');
    if (!botao || botao.disabled) return;
    aviso = '';

    if (botao.dataset.modo) {
      modo = botao.dataset.modo;
      selecionado = null;
      return desenhar();
    }
    if (botao.dataset.mes) {
      ym = somarMeses(ym, botao.dataset.mes === 'anterior' ? -1 : 1);
      return desenhar();
    }
    if (botao.dataset.acao === 'irHoje') {
      location.hash = 'hoje';
      return;
    }
    if (botao.dataset.acao === 'csv') {
      baixarCSV(ym, csvDoMes(dias, ym));
      aviso = 'Planilha baixada.';
      return desenhar();
    }
    if (botao.dataset.acao === 'fecharMes') return fecharOMes();
    if (botao.dataset.acao === 'reabrirMes') return reabrirOMes();

    if (botao.dataset.editar) return editar(botao.dataset.editar);
    if (botao.dataset.excluir) return excluir(botao.dataset.excluir);

    if (botao.dataset.semana === 'anterior') {
      inicio = somarDias(inicio, -7);
      selecionado = null;
    } else if (botao.dataset.semana === 'proxima') {
      inicio = somarDias(inicio, 7);
      selecionado = null;
    } else if (botao.dataset.dia) {
      selecionado = selecionado === botao.dataset.dia ? null : botao.dataset.dia;
    } else if (botao.dataset.ver) {
      verDia = dias.find((d) => d.id === botao.dataset.ver);
    } else if (botao.dataset.acao === 'voltar') {
      verDia = null;
    } else return;

    desenhar();
  });

  desenhar();
}
