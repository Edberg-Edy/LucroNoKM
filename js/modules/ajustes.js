// Tela de Ajustes: dados da moto, manutenção, custos fixos e plataformas.
// Cada alteração é salva sozinha no Firestore (não existe botão "Salvar").
import { carregarConfig, salvarConfig } from '../services/dados.js';
import { listarTodosDias, listarDiasFechados, atualizarDiasEmLote, restaurarDias } from '../services/dias.js';
import { listarAbastecimentos, restaurarAbastecimentos } from '../services/abastecimentos.js';
import { listarMeses, salvarMes } from '../services/meses.js';
import { manutencaoPorKm, combustivelPorKm, fixoPorDia, parametrosDoDia, recalcularDiaFechado } from './calculos.js';
import { mesDe } from './mes.js';
import { montarBackup, baixarBackup, validarBackup, prepararRestauracao } from './backup.js';
import { trechos, consumoMedio, kmL } from './combustivel.js';
import { validarCampoAjuste } from './validacao.js';
import { padroes } from '../config/padroes.js';
import { dinheiro, esc } from './formatos.js';

const dinheiro3 = (n) =>
  'R$ ' + (Number(n) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 });

// Campos numéricos simples: [nome no banco, rótulo na tela]
const campos = [
  ['meta', 'Meta diária de lucro (R$)'],
  ['contasMes', 'Contas do mês a cobrir (R$, 0 = não usar)'],
  ['kmPorLitro', 'Km por litro da moto'],
  ['precoLitro', 'Preço do litro (R$)'],
  ['diasPorMes', 'Dias trabalhados por mês'],
  ['limiteMei', 'Limite anual de faturamento do MEI (R$)'],
];

// "caixa" é o espaço da tela onde os Ajustes aparecem; "usuario" é quem está logado.
export async function telaAjustes(caixa, usuario) {
  caixa.innerHTML = '<p class="suave">Carregando ajustes…</p>';

  let config;
  try {
    config = await carregarConfig(usuario.uid);
  } catch (e) {
    caixa.innerHTML = `<section class="cartao"><h1>Ajustes</h1>
      <p class="erro">Não foi possível carregar os ajustes (${esc(e.code || 'erro')}). Confira a internet e as regras do Firestore.</p></section>`;
    return;
  }

  let status = '';
  let pendenteRecalculo = null; // depois do 1º toque em "Recalcular": { alvos, travados } aguardando o 2º toque
  let pendenteRestauro = null; // depois de escolher o arquivo de backup: lista pronta aguardando a confirmação
  let consumo = null; // consumo real medido pelos abastecimentos (ou null enquanto não dá para medir)
  let consumoPronto = false; // true quando a leitura dos abastecimentos terminou
  let consumoErro = false; // true se não foi possível ler os abastecimentos

  function mostrarStatus(texto) {
    status = texto;
    const el = caixa.querySelector('#status');
    if (el) el.textContent = texto;
  }

  async function salvar() {
    mostrarStatus('Salvando…');
    try {
      const r = await salvarConfig(usuario.uid, config);
      mostrarStatus(r.sincronizado ? 'Salvo ✓' : 'Salvo no aparelho. Sem sinal: sincroniza quando voltar.');
    } catch (e) {
      mostrarStatus('Não foi possível salvar. Tente de novo.');
    }
  }

  // Lê os abastecimentos e mede o consumo real. Roda em segundo plano: os Ajustes aparecem sem esperar.
  function carregarConsumo() {
    consumoPronto = false;
    consumoErro = false;
    listarAbastecimentos(usuario.uid)
      .then((lista) => {
        consumo = consumoMedio(trechos(lista));
      })
      .catch(() => {
        consumoErro = true;
      })
      .finally(() => {
        consumoPronto = true;
        atualizarConsumo();
      });
  }

  // Mostra o consumo real medido e, se for diferente do ajuste, o botão para usar o valor medido.
  function atualizarConsumo() {
    const texto = caixa.querySelector('#consumoReal');
    const botao = caixa.querySelector('[data-acao="usarConsumo"]');
    if (!texto || !botao) return;
    botao.style.display = 'none';

    if (!consumoPronto) texto.textContent = 'Calculando…';
    else if (consumoErro) texto.textContent = 'Não foi possível ler os abastecimentos. Confira a internet.';
    else if (!consumo) {
      texto.textContent =
        'Ainda não dá para medir. Informe os litros e o valor ("Abasteci hoje") ao fechar o dia em dois dias com abastecimento, e o app calcula o km/l real da sua moto.';
    } else {
      const real = Math.round(consumo.kmPorLitro * 10) / 10;
      const atual = config.kmPorLitro;
      let frase =
        `Medido: ${kmL(real)} km/l (média dos últimos ${consumo.trechos} ${consumo.trechos === 1 ? 'trecho' : 'trechos'}, ${Math.round(consumo.km)} km, de tanque cheio a tanque cheio). ` +
        `Nos Ajustes: ${kmL(atual)} km/l.`;
      if (Math.abs(real - atual) < 0.05) {
        frase += ' Está igual ao medido. Para refazer as contas dos dias já fechados com esse valor, use "Recalcular dias fechados".';
      } else {
        const pontos = Math.max(1, Math.round(Math.abs(real / atual - 1) * 100));
        frase +=
          real < atual
            ? ` O ajuste está ${pontos}% acima do real: o combustível dos dias está sendo subestimado e o lucro aparece maior que o verdadeiro.`
            : ` O ajuste está ${pontos}% abaixo do real: o combustível dos dias está sendo superestimado.`;
        botao.textContent = `Usar ${kmL(real)} km/l`;
        botao.style.display = '';
      }
      texto.textContent = frase;
    }
  }

  // Passa o km/l medido para os Ajustes (vale para os dias novos; os já fechados não mudam sozinhos).
  function usarConsumo() {
    if (!consumo) return;
    config.kmPorLitro = Math.round(consumo.kmPorLitro * 10) / 10;
    desenhar();
    salvar();
  }

  // Atualiza só os números calculados, sem redesenhar a tela (assim o teclado não fecha).
  function atualizarResumos() {
    const manut = manutencaoPorKm(config.manutencao);
    const comb = combustivelPorKm(config.kmPorLitro, config.precoLitro);
    const valores = {
      manut: dinheiro3(manut),
      comb: dinheiro3(comb),
      total: dinheiro3(manut + comb),
      fixo: dinheiro(fixoPorDia(config.fixos, config.diasPorMes)),
    };
    caixa.querySelectorAll('[data-resumo]').forEach((el) => {
      el.textContent = valores[el.dataset.resumo];
    });
  }

  const linhaResumo = (rotulo, chave, destaque = '') =>
    `<div class="resumo ${destaque}"><span>${rotulo}</span><b data-resumo="${chave}"></b></div>`;

  function desenhar() {
    pendenteRecalculo = null;
    pendenteRestauro = null;
    caixa.innerHTML = `
      <div class="painel ajustes">
      <div class="col a">
      <section class="cartao">
        <h1>Ajustes</h1>
        <p class="suave" id="status" role="status">${status}</p>
        ${campos
          .map(
            ([chave, rotulo]) =>
              `<label>${rotulo}<input type="text" inputmode="decimal" data-num data-k="${chave}" value="${config[chave]}"></label>`
          )
          .join('')}
      </section>

      <section class="cartao">
        <h2>Consumo real da moto</h2>
        <p class="suave" id="consumoReal" role="status">Calculando…</p>
        <button type="button" class="botao secundario" data-acao="usarConsumo" style="display:none">Usar o consumo medido</button>
      </section>

      <section class="cartao">
        <h2>Dias já fechados</h2>
        <p class="suave">Cada dia fechado guarda os ajustes da época em que foi fechado. Para refazer as contas de todos eles com os ajustes de agora (meta, litro, manutenção e custos fixos), use o botão. Dias de mês fechado não mudam.</p>
        <button type="button" class="botao secundario" data-acao="recalcular">Recalcular dias fechados</button>
        <p class="suave" id="statusRecalcular" role="status"></p>
      </section>
      </div>

      <div class="col b">
      <section class="cartao">
        <h2>Manutenção da moto</h2>
        <p class="suave">Preço da peça e quantos km ela dura. O app soma o custo por km.</p>
        <div class="linha l3 cab"><span>Item</span><span>Preço (R$)</span><span>Dura (km)</span><span></span></div>
        ${config.manutencao
          .map(
            (m, i) => `
          <div class="linha l3">
            <input type="text" data-k="manutencao.${i}.item" value="${esc(m.item)}" aria-label="Item">
            <input type="text" inputmode="decimal" data-num data-k="manutencao.${i}.preco" value="${m.preco}" aria-label="Preço">
            <input type="text" inputmode="decimal" data-num data-k="manutencao.${i}.duracaoKm" value="${m.duracaoKm}" aria-label="Duração em km">
            <button type="button" class="x" data-acao="remover:manutencao:${i}" aria-label="Excluir item">✕</button>
          </div>`
          )
          .join('')}
        <button type="button" class="botao secundario" data-acao="adicionar:manutencao">+ Item</button>
        ${linhaResumo('Manutenção por km', 'manut')}
        ${linhaResumo('Combustível por km', 'comb')}
        ${linhaResumo('Custo total por km da moto', 'total', 'total')}
      </section>
      </div>

      <div class="col c">
      <section class="cartao">
        <h2>Custos fixos mensais</h2>
        <p class="suave">Valor por mês. O app divide pelos dias trabalhados e desconta de cada dia.</p>
        <div class="linha l2 cab"><span>Item</span><span>Valor mensal (R$)</span><span></span></div>
        ${config.fixos
          .map(
            (f, i) => `
          <div class="linha l2">
            <input type="text" data-k="fixos.${i}.item" value="${esc(f.item)}" aria-label="Item">
            <input type="text" inputmode="decimal" data-num data-k="fixos.${i}.valorMensal" value="${f.valorMensal}" aria-label="Valor mensal">
            <button type="button" class="x" data-acao="remover:fixos:${i}" aria-label="Excluir custo">✕</button>
          </div>`
          )
          .join('')}
        <button type="button" class="botao secundario" data-acao="adicionar:fixos">+ Custo fixo</button>
        ${linhaResumo('Custo fixo por dia trabalhado', 'fixo', 'total')}
      </section>

      <section class="cartao">
        <h2>Plataformas</h2>
        ${config.plataformas
          .map(
            (p, i) => `
          <div class="linha l1">
            <input type="text" data-k="plataformas.${i}" value="${esc(p)}" aria-label="Nome da plataforma">
            <button type="button" class="x" data-acao="remover:plataformas:${i}" aria-label="Excluir plataforma">✕</button>
          </div>`
          )
          .join('')}
        <button type="button" class="botao secundario" data-acao="adicionar:plataformas">+ Plataforma</button>
      </section>

      <section class="cartao">
        <h2>Backup</h2>
        <p class="suave">Baixa um arquivo com os seus ajustes, todos os seus dias e os abastecimentos. Guarde em um lugar seguro de vez em quando.</p>
        <button type="button" class="botao secundario" data-acao="backup">Baixar backup (.json)</button>
        <p class="suave" id="statusBackup" role="status"></p>
        <h2 style="margin-top:16px">Restaurar um backup</h2>
        <p class="suave">Escolha um arquivo de backup. Os dias do arquivo são gravados (dias com o mesmo código são sobrescritos) e nenhum outro dia é apagado. Seus ajustes atuais são substituídos pelos do arquivo.</p>
        <button type="button" class="botao secundario" data-acao="restaurar">Escolher arquivo de backup…</button>
        <input type="file" id="arquivoBackup" accept="application/json,.json" hidden>
        <p class="suave" id="statusRestaurar" role="status"></p>
      </section>
      </div>
      </div>`;
    atualizarResumos();
    atualizarConsumo();
  }

  async function fazerBackup() {
    const aviso = caixa.querySelector('#statusBackup');
    aviso.textContent = 'Gerando backup…';
    try {
      const [dias, meses, abastecimentos] = await Promise.all([
        listarTodosDias(usuario.uid),
        listarMeses(usuario.uid),
        listarAbastecimentos(usuario.uid),
      ]);
      baixarBackup(montarBackup(config, dias, new Date(), meses, abastecimentos));
      aviso.textContent = `Backup baixado (${dias.length} dias, ${Object.keys(meses).length} meses e ${abastecimentos.length} abastecimentos).`;
    } catch (e) {
      aviso.textContent = 'Não foi possível gerar o backup. Confira a internet e tente de novo.';
    }
  }

  // Recalcula os dias fechados com os ajustes atuais. Dois toques: o 1º mostra quantos dias serão alterados, o 2º confirma.
  async function recalcular() {
    const aviso = caixa.querySelector('#statusRecalcular');
    const botao = caixa.querySelector('[data-acao="recalcular"]');

    try {
      if (!pendenteRecalculo) {
        aviso.textContent = 'Conferindo os dias…';
        const [dias, meses] = await Promise.all([listarDiasFechados(usuario.uid), listarMeses(usuario.uid)]);
        const alvos = dias.filter((d) => meses[mesDe(d.data)]?.fechado !== true);
        const travados = dias.length - alvos.length;

        if (!alvos.length) {
          aviso.textContent = dias.length
            ? 'Todos os dias fechados estão em meses fechados. Reabra o mês no Histórico para recalcular.'
            : 'Ainda não há dias fechados.';
          return;
        }
        pendenteRecalculo = { alvos, travados };
        botao.textContent = 'Toque de novo para confirmar';
        aviso.textContent =
          `Vai recalcular ${alvos.length} ${alvos.length === 1 ? 'dia' : 'dias'}` +
          (travados ? ` (${travados} em mês fechado não mudam)` : '') +
          '. Os ganhos e despesas continuam iguais; só mudam os custos e o lucro.';
        setTimeout(() => {
          if (pendenteRecalculo && pendenteRecalculo.alvos === alvos) {
            pendenteRecalculo = null;
            botao.textContent = 'Recalcular dias fechados';
            aviso.textContent = '';
          }
        }, 8000);
        return;
      }

      const { alvos } = pendenteRecalculo;
      pendenteRecalculo = null;
      botao.textContent = 'Recalcular dias fechados';
      aviso.textContent = 'Recalculando…';

      const parametros = parametrosDoDia(config);
      const lista = [];
      let ignorados = 0;
      alvos.forEach((d) => {
        try {
          lista.push({ id: d.id, campos: recalcularDiaFechado(d, parametros) });
        } catch (e) {
          ignorados++; // dia com odômetros inválidos: não mexe
        }
      });

      await atualizarDiasEmLote(usuario.uid, lista);
      aviso.textContent =
        `Pronto: ${lista.length} ${lista.length === 1 ? 'dia recalculado' : 'dias recalculados'}` +
        (ignorados ? `, ${ignorados} ignorado(s) por odômetro inválido` : '') +
        '. Veja no Histórico.';
    } catch (e) {
      pendenteRecalculo = null;
      aviso.textContent = 'Não foi possível recalcular. Confira a internet e tente de novo.';
    }
  }

  // Restauração em duas etapas: 1) ler e conferir o arquivo; 2) o toque em "Confirmar" grava.
  async function lerArquivoBackup(arquivo) {
    const aviso = caixa.querySelector('#statusRestaurar');
    const botao = caixa.querySelector('[data-acao="restaurar"]');
    pendenteRestauro = null;
    if (!arquivo) return;

    let conteudo;
    try {
      conteudo = JSON.parse(await arquivo.text());
    } catch (e) {
      aviso.textContent = 'Não consegui ler este arquivo. Ele precisa ser um backup .json do LucroNoKM.';
      return;
    }
    const conferido = validarBackup(conteudo);
    if (!conferido.ok) {
      aviso.textContent = conferido.erro;
      return;
    }

    const r = conferido.resumo;
    pendenteRestauro = prepararRestauracao(conteudo);
    botao.textContent = `Confirmar restauração (${r.dias} dias)`;
    aviso.textContent =
      `Backup válido: ${r.dias} dias` + (r.de ? ` (de ${r.de.split('-').reverse().join('/')} a ${r.ate.split('-').reverse().join('/')})` : '') +
      `, ${r.meses} meses, ${r.abastecimentos} abastecimentos` + (r.abertos ? `, ${r.abertos} dia aberto ignorado` : '') +
      '. Toque no botão para restaurar, ou escolha outro arquivo.';
    setTimeout(() => {
      if (pendenteRestauro) {
        pendenteRestauro = null;
        botao.textContent = 'Escolher arquivo de backup…';
        aviso.textContent = '';
      }
    }, 20000);
  }

  async function restaurar() {
    const aviso = caixa.querySelector('#statusRestaurar');
    const botao = caixa.querySelector('[data-acao="restaurar"]');
    const arquivoInput = caixa.querySelector('#arquivoBackup');

    if (!pendenteRestauro) {
      arquivoInput.value = ''; // permite escolher o mesmo arquivo de novo
      arquivoInput.click();
      return;
    }

    const preparado = pendenteRestauro;
    pendenteRestauro = null;
    botao.textContent = 'Escolher arquivo de backup…';
    aviso.textContent = 'Restaurando…';
    try {
      Object.assign(config, padroes(), preparado.config); // valores novos que o backup não tinha ficam com o padrão
      const gravacoes = [await salvarConfig(usuario.uid, config), await restaurarDias(usuario.uid, preparado.dias)];
      for (const m of preparado.meses) gravacoes.push(await salvarMes(usuario.uid, m.ym, m.campos));
      gravacoes.push(await restaurarAbastecimentos(usuario.uid, preparado.abastecimentos));

      const tudo = gravacoes.every((g) => g.sincronizado);
      desenhar(); // mostra os ajustes restaurados
      carregarConsumo(); // os abastecimentos restaurados mudam o consumo medido
      const novo = caixa.querySelector('#statusRestaurar');
      novo.textContent =
        `Pronto: ${preparado.dias.length} dias, ${preparado.meses.length} meses e ${preparado.abastecimentos.length} abastecimentos restaurados.` +
        (tudo ? '' : ' Sem sinal agora: vai sincronizar quando a internet voltar.');
    } catch (e) {
      aviso.textContent = 'Não foi possível restaurar. Confira a internet e tente de novo.';
    }
  }

  // Quando o usuário termina de editar um campo (sai dele ou confirma)
  caixa.addEventListener('change', (evento) => {
    if (evento.target.id === 'arquivoBackup') {
      lerArquivoBackup(evento.target.files[0]);
      return;
    }
    const campo = evento.target.closest('[data-k]');
    if (!campo) return;

    const caminho = campo.dataset.k.split('.'); // ex.: "manutencao.2.preco" vira ['manutencao', '2', 'preco']
    let valor;
    if (campo.hasAttribute('data-num')) {
      // Número inválido, vazio onde não pode ou fora do normal: avisa e volta ao valor anterior (nada é salvo)
      const conferido = validarCampoAjuste(campo.dataset.k, campo.value);
      if (!conferido.ok) {
        mostrarStatus(conferido.erro);
        desenhar();
        return;
      }
      valor = conferido.valor;
    } else {
      valor = campo.value.trim();
      if (valor === '') { // nome vazio não vale: volta ao valor anterior
        desenhar();
        return;
      }
    }

    let alvo = config;
    for (let i = 0; i < caminho.length - 1; i++) alvo = alvo[caminho[i]];
    alvo[caminho[caminho.length - 1]] = valor;

    if (campo.hasAttribute('data-num')) campo.value = valor; // mostra o valor já corrigido
    atualizarResumos();
    salvar();
  });

  // Botões de adicionar (+) e excluir (✕)
  caixa.addEventListener('click', (evento) => {
    const botao = evento.target.closest('[data-acao]');
    if (!botao) return;

    if (botao.dataset.acao === 'backup') {
      fazerBackup();
      return;
    }
    if (botao.dataset.acao === 'usarConsumo') {
      usarConsumo();
      return;
    }
    if (botao.dataset.acao === 'recalcular') {
      recalcular();
      return;
    }
    if (botao.dataset.acao === 'restaurar') {
      restaurar();
      return;
    }

    const [acao, lista, posicao] = botao.dataset.acao.split(':');
    const modelos = {
      manutencao: { item: 'Novo item', preco: 0, duracaoKm: 10000 },
      fixos: { item: 'Novo custo', valorMensal: 0 },
      plataformas: 'Nova plataforma',
    };

    if (acao === 'adicionar') config[lista].push(modelos[lista]);
    if (acao === 'remover') config[lista].splice(Number(posicao), 1);

    desenhar();
    salvar();
  });

  desenhar();
  carregarConsumo();
}
