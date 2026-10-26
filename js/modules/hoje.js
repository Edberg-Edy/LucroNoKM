// Aba Hoje. Abrir o dia (data + odômetro), lançar despesas e fechar o dia com o resultado.
// Também serve para editar um dia já fechado (o Histórico reabre o dia e manda para cá).
import { buscarDiaAberto, criarDia, atualizarDia, excluirDia, fecharDia, listarDiasFechados, ultimosDias, primeiroDia } from '../services/dias.js';
import { carregarConfig } from '../services/dados.js';
import { mesEstaFechado, listarMeses } from '../services/meses.js';
import { calcularDia, parametrosDoDia, lerHoras } from './calculos.js';
import { htmlResultado } from './resultado.js';
import { lerAbastecimento, salvarAbastecimentoDoDia, excluirAbastecimentoDoDia } from '../services/abastecimentos.js';
import { validarAbastecimento } from './combustivel.js';
import { odometroSugerido, conferirOdometroInicial } from './sugestoes.js';
import { lembreteDAS } from './lembretes.js';
import { hojeISO, dataBR, lerNumero, dinheiro, esc } from './formatos.js';

const categorias = ['Comida', 'Manutenção', 'Estacionamento', 'Multa', 'Outros'];
const KM_ALERTA = 400; // acima disso o app pergunta se o odômetro está certo (pega erro de digitação)

// "raiz" é o espaço da tela onde a aba aparece; "usuario" é quem está logado.
// A aba tem duas partes: avisos (DAS) e o dia (abrir, despesas, fechar). O abastecimento é informado ao fechar o dia.
export async function telaHoje(raiz, usuario) {
  raiz.innerHTML = '<div id="hojeAvisos"></div><div id="hojeDia"></div>';
  const caixa = raiz.querySelector('#hojeDia');
  caixa.innerHTML = '<p class="suave">Carregando…</p>';

  let dia; // dia aberto (ou null)
  let config; // ajustes: precisamos das plataformas e dos parâmetros para fechar o dia
  let recentes; // os últimos dias lançados: servem para sugerir e conferir o odômetro
  let meses; // meses já gravados (para o lembrete do DAS)
  let primeiro; // o dia mais antigo já lançado (para o lembrete do DAS)
  try {
    // As três últimas consultas são ajudas: se falharem (sem sinal, por exemplo), o app segue sem elas.
    [dia, config, recentes, meses, primeiro] = await Promise.all([
      buscarDiaAberto(usuario.uid),
      carregarConfig(usuario.uid),
      ultimosDias(usuario.uid, 5).catch(() => []),
      listarMeses(usuario.uid).catch(() => ({})),
      primeiroDia(usuario.uid).catch(() => null),
    ]);
  } catch (e) {
    caixa.innerHTML = `<section class="cartao"><h1>Hoje</h1>
      <p class="erro">Não foi possível carregar o dia (${esc(e.code || 'erro')}). Confira a internet.</p></section>`;
    return;
  }

  // Ao editar um dia, o abastecimento que foi informado nele volta preenchido (litros e valor).
  let abastecimentoDoDia = null;
  if (dia && dia.odometroFinal !== undefined) abastecimentoDoDia = await lerAbastecimento(usuario.uid, 'dia-' + dia.id).catch(() => null);

  const lembrete = lembreteDAS({ hoje: hojeISO(), meses, primeiroDia: primeiro ? primeiro.data : null });
  if (lembrete) raiz.querySelector('#hojeAvisos').innerHTML = `<p class="aviso-topo" role="status">${esc(lembrete)}</p>`;

  let categoria = categorias[0]; // categoria de despesa selecionada
  let confirmarDescarte = false; // true depois do primeiro toque em "Descartar este dia"
  let confirmarDataRepetida = null; // data que o usuário já confirmou manter, mesmo com outro dia nela
  let confirmarKm = null; // odômetro final que o usuário já confirmou, mesmo com km muito alto
  let confirmarOdometroInicial = null; // odômetro inicial que o usuário já confirmou, mesmo com salto grande
  let resultado = null; // dia recém-fechado, mostrado até o usuário tocar em "Lançar outro dia"
  // Um dia que já tem odômetro final foi fechado antes: estamos editando.
  const emEdicao = () => dia && dia.odometroFinal !== undefined;

  // Plataformas dos ajustes + as que o dia editado já usava (mesmo que tenham sido excluídas dos ajustes depois)
  const nomesPlataformas = () => {
    const nomes = [...config.plataformas];
    ((dia && dia.plataformas) || []).forEach((p) => {
      if (!nomes.includes(p.nome)) nomes.push(p.nome);
    });
    return nomes;
  };

  // Ao editar, os campos do fechamento já vêm preenchidos com o que foi salvo.
  function rascunhoDoDia() {
    const r = {
      data: dia.data,
      odometroFinal: String(dia.odometroFinal),
      horas: dia.horas ? String(dia.horas).replace('.', ',') : '',
      abLitros: abastecimentoDoDia ? String(abastecimentoDoDia.litros).replace('.', ',') : '',
      abValor: abastecimentoDoDia ? String(abastecimentoDoDia.valor).replace('.', ',') : '',
    };
    nomesPlataformas().forEach((nome, i) => {
      const p = dia.plataformas.find((x) => x.nome === nome);
      r['v' + i] = p && p.valor ? String(p.valor).replace('.', ',') : '';
      r['c' + i] = p && p.corridas ? String(p.corridas) : '';
    });
    return r;
  }

  // O que foi digitado no fechamento também fica guardado no aparelho (localStorage), para não se perder
  // quando você troca de aba ou recarrega a página. Só vale para o mesmo dia e a mesma lista de plataformas.
  const chaveRascunho = `lucronokm:rascunho:${usuario.uid}`;

  function rascunhoSalvo() {
    try {
      const s = JSON.parse(localStorage.getItem(chaveRascunho) || 'null');
      if (s && dia && s.diaId === dia.id && s.plataformas === nomesPlataformas().join('|')) return s.campos || {};
    } catch (e) {
      // sem localStorage (navegação privada, por exemplo): segue sem guardar
    }
    return {};
  }

  function guardarRascunho() {
    try {
      if (dia) localStorage.setItem(chaveRascunho, JSON.stringify({ diaId: dia.id, plataformas: nomesPlataformas().join('|'), campos: rascunho }));
    } catch (e) {
      // sem localStorage: o rascunho fica só na memória da tela
    }
  }

  function apagarRascunho() {
    try {
      localStorage.removeItem(chaveRascunho);
    } catch (e) {
      // nada a fazer
    }
  }

  // o que já foi digitado no fechamento (não se perde ao lançar uma despesa nem ao trocar de aba)
  let rascunho = { ...(emEdicao() ? rascunhoDoDia() : {}), ...rascunhoSalvo() };

  const mostrarErro = (texto, id = 'erro') => {
    const el = caixa.querySelector('#' + id);
    if (el) el.textContent = texto;
  };

  function desenhar() {
    if (resultado) desenharResultado();
    else if (dia) desenharDiaAberto();
    else desenharAbrir();
  }

  function desenharAbrir() {
    const sugerido = odometroSugerido({ dias: recentes }); // onde o último dia terminou
    caixa.innerHTML = `
      <section class="cartao estreito">
        <h1>Abrir o dia</h1>
        <label>Data do dia
          <input type="date" id="data" value="${hojeISO()}" max="${hojeISO()}">
        </label>
        <label>Odômetro no início (km)
          <input type="text" inputmode="decimal" id="odometro" placeholder="Ex.: 12450" value="${sugerido ?? ''}">
        </label>
        ${sugerido !== null ? `<p class="suave">Sugerido: onde o último dia terminou. Confira com o painel da moto.</p>` : ''}
        <p class="erro" id="erro" role="alert"></p>
        <button type="button" class="botao" data-acao="abrir">Abrir o dia</button>
        <p class="suave" style="margin-top:12px">Esqueceu de lançar um dia? Troque a data acima.</p>
      </section>`;
  }

  function desenharResultado() {
    const aviso = resultado.pendente
      ? '<p class="aviso-topo" role="status">Salvo no aparelho. Sem sinal agora: o dia sincroniza sozinho quando a internet voltar.</p>'
      : '';
    caixa.innerHTML = `
      ${aviso}
      ${htmlResultado(resultado)}
      <button type="button" class="botao estreito" data-acao="novo">Lançar outro dia</button>`;
  }

  function desenharDiaAberto() {
    const total = dia.despesas.reduce((soma, d) => soma + d.valor, 0);
    const r = (campo) => esc(rascunho[campo] || ''); // valor já digitado, para repor na tela

    caixa.innerHTML = `
      <div class="painel dia-aberto">
      <div class="col a">
      <section class="cartao">
        <h1>${emEdicao() ? 'Editando' : 'Dia aberto'}: ${dataBR(dia.data)}</h1>
        <p class="suave">Odômetro inicial: ${dia.odometroInicial} km</p>
      </section>

      <section class="cartao">
        <h2>Despesas do dia</h2>
        <div class="chips">
          ${categorias
            .map(
              (c) =>
                `<button type="button" class="chip" data-categoria="${c}" aria-pressed="${c === categoria}">${c}</button>`
            )
            .join('')}
        </div>
        <div class="linha-acao">
          <input type="text" inputmode="decimal" id="valor" placeholder="Valor R$" aria-label="Valor da despesa">
          <button type="button" data-acao="lancar">Lançar</button>
        </div>
        <p class="erro" id="erro" role="alert"></p>
        ${dia.despesas
          .map(
            (d, i) => `
          <div class="item">
            <span>${esc(d.categoria)}</span>
            <b>${dinheiro(d.valor)}</b>
            <button type="button" class="x" data-remover="${i}" aria-label="Excluir despesa">✕</button>
          </div>`
          )
          .join('')}
        <div class="resumo total"><span>Total de despesas</span><b>${dinheiro(total)}</b></div>
      </section>
      </div>

      <div class="col b">
      <section class="cartao">
        <h2>${emEdicao() ? 'Salvar alterações' : 'Fechar o dia'}</h2>
        ${
          emEdicao()
            ? `<label>Data do dia
          <input type="date" data-f="data" value="${r('data')}" max="${hojeISO()}">
        </label>`
            : ''
        }
        <label>Odômetro no fim (km)
          <input type="text" inputmode="decimal" data-f="odometroFinal" value="${r('odometroFinal')}">
        </label>
        <label>Horas trabalhadas (opcional, ex.: 8 ou 8:30)
          <input type="text" data-f="horas" value="${r('horas')}">
        </label>
        <div class="linha l3p cab"><span>Plataforma</span><span>Ganho (R$)</span><span>Corridas</span></div>
        ${nomesPlataformas()
          .map(
            (nome, i) => `
          <div class="linha l3p">
            <b>${esc(nome)}</b>
            <input type="text" inputmode="decimal" data-f="v${i}" placeholder="0,00" aria-label="${esc(nome)}: ganho" value="${r('v' + i)}">
            <input type="text" inputmode="numeric" data-f="c${i}" placeholder="nº" aria-label="${esc(nome)}: corridas" value="${r('c' + i)}">
          </div>`
          )
          .join('')}
        <label>Abasteci hoje: litros (opcional)
          <input type="text" inputmode="decimal" data-f="abLitros" placeholder="Ex.: 5,6" value="${r('abLitros')}">
        </label>
        <label>Abasteci hoje: valor pago em R$ (opcional)
          <input type="text" inputmode="decimal" data-f="abValor" placeholder="Ex.: 33,60" value="${r('abValor')}">
        </label>
        <p class="suave">Encha sempre até a bomba desarmar. Nos dias sem abastecimento, deixe em branco.</p>
        <p class="erro" id="erroFechar" role="alert"></p>
        <button type="button" class="botao" data-acao="fechar">${emEdicao() ? 'Salvar alterações' : 'Fechar o dia'}</button>
      </section>

      <section class="cartao">
        ${
          emEdicao()
            ? '<button type="button" class="botao secundario" data-acao="cancelar">Cancelar edição</button>'
            : `<button type="button" class="botao secundario" data-acao="descartar">
          ${confirmarDescarte ? 'Toque de novo para descartar o dia' : 'Descartar este dia'}
        </button>`
        }
      </section>
      </div>
      </div>`;
  }

  // Grava a nova lista de despesas e só atualiza a tela se a gravação deu certo.
  async function gravarDespesas(novas) {
    try {
      await atualizarDia(usuario.uid, dia.id, { despesas: novas });
      dia.despesas = novas;
      desenhar();
    } catch (e) {
      mostrarErro('Não foi possível salvar. Confira a internet e tente de novo.');
    }
  }

  async function abrir() {
    const data = caixa.querySelector('#data').value;
    const odometro = lerNumero(caixa.querySelector('#odometro').value);

    if (!data || data > hojeISO()) return mostrarErro('Escolha uma data válida (hoje ou anterior).');
    if (odometro === null) return mostrarErro('Digite o odômetro inicial.');

    // Confere com os dias já lançados (pega erro de digitação). Salto grande só pede confirmação.
    const conferencia = conferirOdometroInicial({ data, odometro, dias: recentes });
    if (conferencia) {
      if (conferencia.tipo === 'erro') return mostrarErro(conferencia.texto);
      if (confirmarOdometroInicial !== odometro) {
        confirmarOdometroInicial = odometro;
        return mostrarErro(conferencia.texto);
      }
    }

    // Mês fechado não aceita dias novos (reabra o mês no Histórico)
    try {
      if (await mesEstaFechado(usuario.uid, data.slice(0, 7))) {
        return mostrarErro('Este mês está fechado. Reabra o mês no Histórico para lançar dias nele.');
      }
    } catch (e) {
      return mostrarErro('Não foi possível verificar o mês. Confira a internet e tente de novo.');
    }

    try {
      dia = await criarDia(usuario.uid, { data, odometroInicial: odometro });
      confirmarOdometroInicial = null;
      desenhar();
    } catch (e) {
      mostrarErro('Não foi possível abrir o dia. Confira a internet e tente de novo.');
    }
  }

  function lancar() {
    const valor = lerNumero(caixa.querySelector('#valor').value);
    if (!valor) return mostrarErro('Digite um valor maior que zero.');
    gravarDespesas([...dia.despesas, { categoria, valor }]);
  }

  async function fechar() {
    const erro = (texto) => mostrarErro(texto, 'erroFechar');

    const odometroFinal = lerNumero(rascunho.odometroFinal || '');
    if (odometroFinal === null || odometroFinal <= dia.odometroInicial) {
      return erro(`O odômetro final precisa ser maior que o inicial (${dia.odometroInicial} km).`);
    }

    const km = odometroFinal - dia.odometroInicial;
    if (km > KM_ALERTA && confirmarKm !== odometroFinal) {
      confirmarKm = odometroFinal;
      return erro(`Isso dá ${Math.round(km)} km neste dia. Confere o odômetro final? Se estiver certo, toque em Salvar de novo.`);
    }

    const textoHoras = (rascunho.horas || '').trim();
    const horas = lerHoras(textoHoras);
    if (textoHoras && horas === null) return erro('Horas inválidas. Use 8, 8,5 ou 8:30.');

    // Ao editar, a data pode ser trocada. Valida a nova data antes de gravar.
    let data = dia.data;
    if (emEdicao()) {
      data = rascunho.data || dia.data;
      if (data > hojeISO()) return erro('A data não pode ser no futuro.');
      if (data !== dia.data) {
        try {
          if (await mesEstaFechado(usuario.uid, data.slice(0, 7))) {
            return erro('O mês dessa data está fechado. Reabra o mês no Histórico para mover o dia para lá.');
          }
          const repetido = (await listarDiasFechados(usuario.uid)).some((d) => d.data === data && d.id !== dia.id);
          if (repetido && confirmarDataRepetida !== data) {
            confirmarDataRepetida = data;
            return erro(`Já existe um dia fechado em ${dataBR(data)}. Toque em Salvar de novo para manter os dois.`);
          }
        } catch (e) {
          return erro('Não foi possível conferir a data. Confira a internet e tente de novo.');
        }
      }
    }

    // Abastecimento do dia (opcional): usa o odômetro final do dia e conta como tanque cheio.
    let abastecimento = null;
    if ((rascunho.abLitros || '').trim() || (rascunho.abValor || '').trim()) {
      const conferido = validarAbastecimento(
        { data, odometro: String(odometroFinal), litros: rascunho.abLitros, valor: rascunho.abValor, cheio: true },
        [],
        { hoje: hojeISO() }
      );
      if (!conferido.ok) return erro(conferido.erro);
      abastecimento = conferido.dados;
    }

    // Só entram as plataformas em que houve ganho ou corridas
    const plataformas = nomesPlataformas()
      .map((nome, i) => ({
        nome,
        valor: lerNumero(rascunho['v' + i] || '') || 0,
        corridas: Math.round(lerNumero(rascunho['c' + i] || '') || 0),
      }))
      .filter((p) => p.valor > 0 || p.corridas > 0);

    // Dia novo usa os ajustes de hoje. Dia editado mantém a fotografia que ele já tinha.
    const parametros = emEdicao() && dia.snapshot ? dia.snapshot : parametrosDoDia(config);
    const calculados = calcularDia(
      { odometroInicial: dia.odometroInicial, odometroFinal, horas, plataformas, despesas: dia.despesas },
      parametros
    );

    try {
      // O abastecimento é gravado antes do fechamento: se algo falhar, o dia continua aberto e dá para tentar de novo.
      if (abastecimento) await salvarAbastecimentoDoDia(usuario.uid, dia.id, abastecimento);
      else if (abastecimentoDoDia) await excluirAbastecimentoDoDia(usuario.uid, dia.id);
      abastecimentoDoDia = abastecimento;
      const gravado = await fecharDia(usuario.uid, dia.id, { data, odometroFinal, horas, plataformas, snapshot: parametros, calculados });
      confirmarDataRepetida = null;
      confirmarKm = null;
      apagarRascunho();
      recentes = [{ id: dia.id, data, odometroInicial: dia.odometroInicial, odometroFinal }, ...recentes.filter((d) => d.id !== dia.id)].slice(0, 5);
      resultado = { ...dia, pendente: !gravado.sincronizado, data, aberto: false, odometroFinal, horas, plataformas, snapshot: parametros, calculados };
      dia = null;
      rascunho = {};
      desenhar();
    } catch (e) {
      erro('Não foi possível fechar o dia. Confira a internet e tente de novo.');
    }
  }

  // Cancela a edição: volta o dia ao estado fechado, recalculando com o que está salvo (despesas podem ter mudado).
  async function cancelarEdicao() {
    try {
      const calculados = calcularDia(
        {
          odometroInicial: dia.odometroInicial,
          odometroFinal: dia.odometroFinal,
          horas: dia.horas ?? null,
          plataformas: dia.plataformas,
          despesas: dia.despesas,
        },
        dia.snapshot
      );
      await fecharDia(usuario.uid, dia.id, {
        odometroFinal: dia.odometroFinal,
        horas: dia.horas ?? null,
        plataformas: dia.plataformas,
        snapshot: dia.snapshot,
        calculados,
      });
      apagarRascunho();
      dia = null;
      rascunho = {};
      desenhar();
    } catch (e) {
      mostrarErro('Não foi possível cancelar. Tente de novo.');
    }
  }

  async function descartar() {
    if (!confirmarDescarte) {
      confirmarDescarte = true;
      desenhar();
      setTimeout(() => {
        if (confirmarDescarte && dia) {
          confirmarDescarte = false;
          desenhar();
        }
      }, 4000);
      return;
    }
    try {
      await excluirDia(usuario.uid, dia.id);
      apagarRascunho();
      dia = null;
      rascunho = {};
      confirmarDescarte = false;
      desenhar();
    } catch (e) {
      mostrarErro('Não foi possível descartar. Tente de novo.');
    }
  }

  caixa.addEventListener('click', (evento) => {
    const botao = evento.target.closest('button');
    if (!botao) return;

    if (botao.dataset.categoria) {
      categoria = botao.dataset.categoria;
      caixa.querySelectorAll('[data-categoria]').forEach((b) => {
        b.setAttribute('aria-pressed', String(b.dataset.categoria === categoria));
      });
    } else if (botao.dataset.remover !== undefined) {
      gravarDespesas(dia.despesas.filter((_, i) => i !== Number(botao.dataset.remover)));
    } else if (botao.dataset.acao === 'abrir') abrir();
    else if (botao.dataset.acao === 'lancar') lancar();
    else if (botao.dataset.acao === 'fechar') fechar();
    else if (botao.dataset.acao === 'descartar') descartar();
    else if (botao.dataset.acao === 'cancelar') cancelarEdicao();
    else if (botao.dataset.acao === 'novo') {
      resultado = null;
      desenhar();
    }
  });

  // Guarda o que é digitado no fechamento, para não perder se a tela for redesenhada
  caixa.addEventListener('input', (evento) => {
    const campo = evento.target.dataset.f;
    if (campo) {
      rascunho[campo] = evento.target.value;
      guardarRascunho();
    }
  });

  // Enter nos campos de texto faz a mesma coisa que o botão ao lado
  caixa.addEventListener('keydown', (evento) => {
    if (evento.key !== 'Enter') return;
    if (evento.target.id === 'valor') lancar();
    if (evento.target.id === 'odometro') abrir();
  });

  desenhar();
}
