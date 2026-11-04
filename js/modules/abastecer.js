// Card "Abastecimento" da aba Hoje: registro feito na bomba (odômetro, litros e tanque completo) e lista dos últimos.
// Cada abastecimento é um registro próprio: não depende do dia de trabalho nem do horário em que aconteceu.
import { listarAbastecimentos, novoAbastecimento, atualizarAbastecimento, excluirAbastecimento } from '../services/abastecimentos.js';
import { ultimosDias, buscarDiaAberto } from '../services/dias.js';
import { validarAbastecimento, ordenar, litrosBR } from './combustivel.js';
import { odometroSugerido } from './sugestoes.js';
import { hojeISO, dataBR, esc } from './formatos.js';

const CHAVE_CHEIO = 'lucronokm.abastecimento.cheio';
const lerCheioSalvo = () => {
  try {
    return localStorage.getItem(CHAVE_CHEIO) === '1';
  } catch (e) {
    return false;
  }
};
const guardarCheio = (cheio) => {
  try {
    localStorage.setItem(CHAVE_CHEIO, cheio ? '1' : '0');
  } catch (e) {
    // sem localStorage: a escolha vale só nesta tela
  }
};

const MOSTRAR = 1; // aqui aparece só o último; a lista completa fica no Histórico > Combustível

// "caixa" é o espaço da tela onde o card aparece; "usuario" é quem está logado.
// opcoes.data = função que devolve a data do dia aberto: com ela o card não pede data (vale a do dia).
// opcoes.aoMudar = chamada quando o card entra ou sai do modo de edição (a aba Hoje decide onde ele aparece).
export async function telaAbastecer(caixa, usuario, opcoes = {}) {
  const dataNova = () => (opcoes.data && opcoes.data()) || hojeISO();
  caixa.innerHTML = '<section class="cartao"><h2>Abastecimento</h2><p class="suave">Carregando…</p></section>';

  let lista;
  let recentes = [];
  let aberto = null;
  try {
    [lista, recentes, aberto] = await Promise.all([
      listarAbastecimentos(usuario.uid),
      ultimosDias(usuario.uid, 5).catch(() => []),
      buscarDiaAberto(usuario.uid).catch(() => null),
    ]);
  } catch (e) {
    caixa.innerHTML = `<section class="cartao"><h2>Abastecimento</h2>
      <p class="erro">Não foi possível carregar os abastecimentos (${esc(e.code || 'erro')}). Confira a internet.</p></section>`;
    return;
  }

  let editandoId = null; // abastecimento que está sendo editado (ou null)
  let confirmarExcluir = null; // id que aguarda o segundo toque em ✕
  let mensagem = '';
  let mensagemErro = false; // a mensagem é um erro (aparece em vermelho)
  let rascunho = { data: dataNova(), odometro: '', litros: '', cheio: lerCheioSalvo() };

  const ultimoOdometro = () => odometroSugerido({ dias: recentes, abastecimentos: lista, diaAberto: aberto });

  function linhaDaLista(a) {
    const quando = dataBR(a.data).slice(0, 5);
    const km = Number.isFinite(a.odometro) ? `${a.odometro} km` : 'sem odômetro';
    const tipo = a.cheio ? 'tanque cheio' : 'parcial';
    const apagando = confirmarExcluir === a.id;
    return `
      <div class="item">
        <span>${quando} · ${km} · ${litrosBR(a.litros)} L · ${tipo}</span>
        <button type="button" class="ghost" data-editar="${esc(a.id)}">Editar</button>
        <button type="button" class="x" data-excluir="${esc(a.id)}" aria-label="Excluir abastecimento">${apagando ? 'Excluir?' : '✕'}</button>
      </div>`;
  }

  function desenhar() {
    const ultimo = ultimoOdometro();
    const recentesDaLista = ordenar(lista).slice(-MOSTRAR).reverse();
    caixa.innerHTML = `
      <section class="cartao">
        <h2>${editandoId ? 'Editar abastecimento' : 'Abastecimento'}</h2>
        ${
          editandoId || !opcoes.data
            ? `<label>Data
          <input type="date" data-f="data" value="${esc(rascunho.data)}" max="${hojeISO()}">
        </label>`
            : ''
        }
        <label>Odômetro agora (km)
          <input type="text" inputmode="decimal" data-f="odometro" value="${esc(rascunho.odometro)}" placeholder="${ultimo ? 'Último conhecido: ' + ultimo : 'Ex.: 1850'}">
        </label>
        <label>Litros abastecidos
          <input type="text" inputmode="decimal" data-f="litros" value="${esc(rascunho.litros)}" placeholder="Ex.: 5,6">
        </label>
        <label class="marca"><input type="checkbox" data-f="cheio" ${rascunho.cheio ? 'checked' : ''}> Completei o tanque (até a bomba desarmar)</label>
        <p class="suave">Marque só se encheu de verdade: assim o app mede o km/l com exatidão. Sem marcar, o abastecimento ainda entra na conta (consumo aproximado).</p>
        <p class="${mensagemErro ? 'erro' : 'suave'}" id="erroAb" role="alert">${esc(mensagem)}</p>
        <button type="button" class="botao" data-acao="registrar">${editandoId ? 'Salvar alterações' : 'Registrar abastecimento'}</button>
        ${editandoId ? '<button type="button" class="botao secundario" data-acao="cancelarEdicao">Cancelar</button>' : ''}
        ${recentesDaLista.length ? `<h2>Último abastecimento</h2>${recentesDaLista.map(linhaDaLista).join('')}` : ''}
        ${lista.length ? '<button type="button" class="botao secundario" data-acao="verTodos">Ver todos os abastecimentos</button>' : ''}
      </section>`;
    caixa.dataset.editando = editandoId ? '1' : '';
    if (opcoes.aoMudar) opcoes.aoMudar();
  }

  async function registrar() {
    if (!editandoId) rascunho.data = dataNova(); // abastecimento novo vale na data do dia aberto
    const conferido = validarAbastecimento(rascunho, lista, { hoje: hojeISO(), editandoId, dias: recentes });
    if (!conferido.ok) {
      mensagem = conferido.erro;
      mensagemErro = true;
      return desenhar();
    }
    guardarCheio(rascunho.cheio);
    mensagemErro = false;
    try {
      if (editandoId) {
        await atualizarAbastecimento(usuario.uid, editandoId, conferido.dados);
        lista = lista.map((a) => (a.id === editandoId ? { ...a, ...conferido.dados } : a));
        mensagem = 'Abastecimento atualizado.';
      } else {
        const gravado = await novoAbastecimento(usuario.uid, conferido.dados);
        lista = [...lista, { id: gravado.id, ...conferido.dados }];
        mensagem = gravado.sincronizado ? 'Abastecimento registrado.' : 'Abastecimento registrado (será enviado quando o sinal voltar).';
      }
      editandoId = null;
      rascunho = { data: dataNova(), odometro: '', litros: '', cheio: rascunho.cheio };
    } catch (e) {
      mensagem = 'Não foi possível salvar. Confira a internet e tente de novo.';
      mensagemErro = true;
    }
    desenhar();
  }

  async function excluir(id) {
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
      await excluirAbastecimento(usuario.uid, id);
      lista = lista.filter((a) => a.id !== id);
      if (editandoId === id) {
        editandoId = null;
        rascunho = { data: dataNova(), odometro: '', litros: '', cheio: rascunho.cheio };
      }
      mensagem = 'Abastecimento excluído.';
      mensagemErro = false;
    } catch (e) {
      mensagem = 'Não foi possível excluir. Confira a internet.';
      mensagemErro = true;
    }
    confirmarExcluir = null;
    desenhar();
  }

  function editar(id) {
    const a = lista.find((x) => x.id === id);
    if (!a) return;
    editandoId = id;
    mensagem = '';
    mensagemErro = false;
    rascunho = {
      data: a.data,
      odometro: Number.isFinite(a.odometro) ? String(a.odometro) : '',
      litros: String(a.litros).replace('.', ','),
      cheio: a.cheio === true,
    };
    desenhar();
  }

  // Guarda o que é digitado sem redesenhar (assim o teclado não fecha)
  caixa.addEventListener('input', (evento) => {
    const campo = evento.target.dataset.f;
    if (campo) rascunho[campo] = evento.target.type === 'checkbox' ? evento.target.checked : evento.target.value;
  });

  caixa.addEventListener('click', (evento) => {
    const botao = evento.target.closest('button');
    if (!botao || botao.disabled) return;
    if (botao.dataset.acao === 'registrar') return registrar();
    if (botao.dataset.acao === 'verTodos') {
      try {
        sessionStorage.setItem('lucronokm.historicoModo', 'combustivel');
      } catch (e) {
        // sem sessionStorage: abre o histórico na semana
      }
      location.hash = 'historico';
      return;
    }
    if (botao.dataset.acao === 'cancelarEdicao') {
      editandoId = null;
      mensagem = '';
      mensagemErro = false;
      rascunho = { data: dataNova(), odometro: '', litros: '', cheio: rascunho.cheio };
      return desenhar();
    }
    if (botao.dataset.editar) return editar(botao.dataset.editar);
    if (botao.dataset.excluir) return excluir(botao.dataset.excluir);
  });

  // Veio do Histórico pelo botão Editar: já abre o formulário com esse abastecimento
  try {
    const pedido = sessionStorage.getItem('lucronokm.editarAbastecimento');
    sessionStorage.removeItem('lucronokm.editarAbastecimento');
    if (pedido && lista.some((a) => a.id === pedido)) return editar(pedido);
  } catch (e) {
    // sem sessionStorage: segue normal
  }
  desenhar();
}
