// Assistente do primeiro uso: configura o app em poucos passos, uma pergunta por tela.
// A parte de contas e textos (exemploDoDia, passos) é pura e testada em assistente.test.js.
import { salvarConfig } from '../services/dados.js';
import { validarCampoAjuste } from './validacao.js';
import { exemploDoDia } from './assistenteContas.js';
import { TIPOS_EMPRESA } from './mei.js';
import { dinheiro, esc, lerNumero } from './formatos.js';

export const TOTAL_PASSOS = 7; // sem contar as boas-vindas


const campo = (rotulo, chave, valor, dica = '', extra = '') =>
  `<label>${rotulo}<input type="text" inputmode="decimal" data-num data-k="${chave}" value="${esc(String(valor).replace('.', ','))}" ${extra}></label>${
    dica ? `<p class="suave dica">${dica}</p>` : ''
  }`;
const nome = (rotulo, chave, valor) => `<label>${rotulo}<input type="text" data-k="${chave}" value="${esc(valor)}" maxlength="40"></label>`;

// Cada passo devolve { titulo, corpo }. "c" é a cópia dos ajustes que o assistente está montando.
function passo(n, c) {
  switch (n) {
    case 0:
      return {
        titulo: 'Bem-vindo ao LucroNoKM',
        corpo: `
        <p>Descubra quanto <b>sobra de verdade</b> em cada dia de trabalho, depois de combustível, moto e contas.</p>
        <ol class="passos">
          <li><b>Antes de sair:</b> abra o dia com o odômetro da moto.</li>
          <li><b>Na bomba:</b> registre o abastecimento.</li>
          <li><b>No fim do dia:</b> informe o odômetro final e o que ganhou. O app mostra o lucro e quanto separar.</li>
        </ol>
        <p class="suave">Vamos configurar o app em 1 ou 2 minutos. Você pode mudar tudo depois nos Ajustes.</p>`,
      };
    case 1:
      return {
        titulo: 'Sua moto',
        corpo: `
        <p class="suave">Isso calcula o combustível de cada dia.</p>
        ${campo('Quantos km a moto faz por litro?', 'kmPorLitro', c.kmPorLitro, 'Não sabe? Moto 150 cc faz em média 35 km/l. O app mede o valor real depois, pelos seus abastecimentos.')}
        ${campo('Preço do litro da gasolina (R$)', 'precoLitro', c.precoLitro, 'Pode atualizar nos Ajustes quando o preço mudar.')}`,
      };
    case 2:
      return {
        titulo: 'Sua meta',
        corpo: `
        <p class="suave">O app avisa se o dia bateu a meta (verde), ficou abaixo (amarelo) ou teve prejuízo (vermelho).</p>
        ${campo('Quanto quer lucrar por dia (R$)?', 'meta', c.meta)}
        ${campo('Quantos dias trabalha por mês?', 'diasPorMes', c.diasPorMes, 'Usado para dividir os custos fixos entre os dias.')}
        <p class="destaque" id="resumoMeta"></p>`,
      };
    case 3:
      return {
        titulo: 'Custos fixos do mês',
        corpo: `
        <p class="suave">Contas que você paga todo mês por causa do trabalho (imposto do MEI, celular, lavagem…). O app divide pelos dias trabalhados.</p>
        ${c.fixos
          .map(
            (f, i) => `
          <div class="bloco-linha">
            ${nome('Nome', `fixos.${i}.item`, f.item)}
            ${campo('Valor por mês (R$)', `fixos.${i}.valorMensal`, f.valorMensal)}
            <button type="button" class="ghost" data-acao="tirar:fixos:${i}">Remover</button>
          </div>`
          )
          .join('')}
        <button type="button" class="botao secundario" data-acao="por:fixos">+ Custo fixo</button>
        <p class="destaque" id="resumoFixos"></p>`,
      };
    case 4:
      return {
        titulo: 'Manutenção da moto',
        corpo: `
        <p class="suave">O app separa um pouco por km rodado para você ter dinheiro na hora da troca, e avisa quando chegar perto. Os valores abaixo são uma estimativa: ajuste para a sua moto.</p>
        ${c.manutencao
          .map(
            (m, i) => `
          <div class="bloco-linha">
            <b>${esc(m.item)}</b>
            ${campo('Preço (R$)', `manutencao.${i}.preco`, m.preco)}
            ${campo('Dura quantos km?', `manutencao.${i}.duracaoKm`, m.duracaoKm)}
          </div>`
          )
          .join('')}
        <p class="suave">Depois, na aba Histórico → Manutenção, lance a última troca de cada item para o app começar a avisar.</p>`,
      };
    case 5:
      return {
        titulo: 'Onde você trabalha',
        corpo: `
        <p class="suave">As plataformas que aparecem na hora de lançar o que ganhou no dia.</p>
        ${c.plataformas
          .map(
            (p, i) => `
          <div class="bloco-linha">
            ${nome('Plataforma', `plataformas.${i}`, p)}
            <button type="button" class="ghost" data-acao="tirar:plataformas:${i}" ${c.plataformas.length <= 1 ? 'disabled' : ''}>Remover</button>
          </div>`
          )
          .join('')}
        <button type="button" class="botao secundario" data-acao="por:plataformas">+ Plataforma</button>`,
      };
    case 6:
      return {
        titulo: 'Sua empresa',
        corpo: `
        <p class="suave">O app avisa quando o faturamento do ano chegar perto do limite da sua empresa.</p>
        <label>Tipo de empresa
          <select data-k="tipoEmpresa">${Object.entries(TIPOS_EMPRESA)
            .map(([k, t]) => `<option value="${k}" ${(c.tipoEmpresa || 'MEI') === k ? 'selected' : ''}>${t.nome}</option>`)
            .join('')}</select>
        </label>
        ${campo('Limite anual de faturamento (R$)', 'limiteMei', c.limiteMei, 'Entra sozinho ao escolher o tipo. Você pode digitar outro valor.')}`,
      };
    default: {
      const e = exemploDoDia(c);
      return {
        titulo: 'Tudo pronto!',
        corpo: `
        <p class="suave">Veja como o app vai mostrar um dia seu: faturou ${dinheiro(e.faturou)} e rodou ${e.km} km (números de exemplo, com os seus ajustes).</p>
        <section class="cartao interno">
          <div class="resumo"><span>Faturamento</span><b>${dinheiro(e.faturou)}</b></div>
          <div class="resumo"><span>Já saiu: combustível</span><b>− ${dinheiro(e.jaSaiu)}</b></div>
          <div class="resumo"><span>Separar: moto e custos fixos</span><b>− ${dinheiro(e.separar)}</b></div>
          <div class="resumo total"><span>Livre para gastar (lucro)</span><b>${dinheiro(e.lucro)}</b></div>
        </section>
        <p class="suave">${e.bateuMeta ? 'Esse dia bateria a sua meta.' : 'Esse dia ficaria abaixo da sua meta de ' + dinheiro(c.meta) + '.'} Todo dia você vai ver essa conta com os valores reais.</p>`,
      };
    }
  }
}

function htmlPasso(n, c, erro = '') {
  const { titulo, corpo } = passo(n, c);
  const ultimo = n === TOTAL_PASSOS;
  const progresso = n === 0 ? '' : `
    <p class="suave" id="progresso">Passo ${n} de ${TOTAL_PASSOS}</p>
    <div class="medidor verde" role="img" aria-label="Passo ${n} de ${TOTAL_PASSOS}"><i style="width:${Math.round((n / TOTAL_PASSOS) * 100)}%"></i></div>`;
  return `
    <div class="assistente" id="assistente">
      <section class="cartao">
        ${progresso}
        <h1>${titulo}</h1>
        ${corpo}
        <p class="erro" id="erroAssistente" role="alert">${esc(erro)}</p>
        ${
          ultimo
            ? '<button type="button" class="botao" data-acao="dispensarBoasVindas">Abrir meu primeiro dia</button>'
            : `<button type="button" class="botao" data-acao="proximo">${n === 0 ? 'Começar' : 'Continuar'}</button>`
        }
        ${n > 0 ? '<button type="button" class="botao secundario" data-acao="voltar">Voltar</button>' : ''}
        ${ultimo ? '' : '<button type="button" class="ghost" data-acao="dispensarBoasVindas">Pular configuração</button>'}
        <p class="suave">Seus dados ficam só na sua conta. <a href="privacidade.html" target="_blank" rel="noopener">Política de privacidade</a></p>
      </section>
    </div>`;
}

// Lê os campos da tela para dentro de "c". Devolve uma frase de erro ou ''.
function lerCampos(raiz, c) {
  const nomes = [];
  for (const el of raiz.querySelectorAll('[data-k]')) {
    const caminho = el.dataset.k.split('.');
    let alvo = c;
    for (let i = 0; i < caminho.length - 1; i++) alvo = alvo[caminho[i]];
    const ultima = caminho[caminho.length - 1];
    if (el.hasAttribute('data-num')) {
      const r = validarCampoAjuste(el.dataset.k, el.value);
      if (!r.ok) return r.erro;
      alvo[ultima] = r.valor;
    } else if (el.tagName === 'SELECT') {
      alvo[ultima] = el.value;
    } else {
      const v = el.value.trim();
      if (!v) return 'Preencha todos os nomes ou remova a linha que não usa.';
      alvo[ultima] = v;
      if (caminho[0] === 'plataformas') nomes.push(v.toLowerCase());
    }
  }
  if (new Set(nomes).size !== nomes.length) return 'Duas plataformas com o mesmo nome. Troque um deles.';
  return '';
}

// Mostra o assistente dentro de "caixa". config = ajustes vivos do app (atualizados ao avançar).
export function telaAssistente(caixa, { config, uid }) {
  const c = structuredClone(config);
  let n = 0;

  function desenhar(erro = '') {
    caixa.innerHTML = htmlPasso(n, c, erro);
    const raiz = caixa.querySelector('#assistente');
    atualizarResumos(raiz);
    raiz.addEventListener('input', () => atualizarResumos(raiz));
    raiz.addEventListener('change', (e) => {
      if (e.target.dataset.k === 'tipoEmpresa') {
        const sugerido = TIPOS_EMPRESA[e.target.value]?.limite;
        if (sugerido > 0) raiz.querySelector('[data-k="limiteMei"]').value = String(sugerido);
      }
    });
    raiz.addEventListener('click', aoClicar);
    raiz.querySelector('h1').focus?.();
  }

  // Resumos que mudam enquanto a pessoa digita (meta por mês e custo fixo por dia)
  function atualizarResumos(raiz) {
    const meta = raiz.querySelector('#resumoMeta');
    if (meta) {
      const m = lerNumero(raiz.querySelector('[data-k="meta"]').value);
      const d = lerNumero(raiz.querySelector('[data-k="diasPorMes"]').value);
      meta.textContent = m !== null && d !== null ? `Meta por mês: ${dinheiro(m * d)}` : '';
    }
    const fixos = raiz.querySelector('#resumoFixos');
    if (fixos) {
      const total = [...raiz.querySelectorAll('[data-k$="valorMensal"]')].reduce((t, el) => t + (lerNumero(el.value) || 0), 0);
      fixos.textContent = c.diasPorMes > 0 ? `Total: ${dinheiro(total)} por mês, cerca de ${dinheiro(total / c.diasPorMes)} por dia trabalhado.` : '';
    }
  }

  async function aoClicar(evento) {
    const botao = evento.target.closest('button');
    if (!botao) return;
    const raiz = caixa.querySelector('#assistente');
    const acao = botao.dataset.acao || '';
    if (acao === 'voltar') {
      lerCampos(raiz, c); // guarda o que já foi digitado, mesmo incompleto não bloqueia
      n = Math.max(0, n - 1);
      return desenhar();
    }
    if (acao.startsWith('tirar:') || acao.startsWith('por:')) {
      const [tipo, lista, pos] = acao.split(':');
      const erro = lerCampos(raiz, c);
      if (erro && tipo === 'por') return desenhar(erro);
      if (tipo === 'tirar') c[lista].splice(Number(pos), 1);
      else c[lista].push(lista === 'fixos' ? { item: 'Novo custo', valorMensal: 0 } : `Plataforma ${c.plataformas.length + 1}`);
      return desenhar();
    }
    if (acao === 'proximo') {
      const erro = n === 0 ? '' : lerCampos(raiz, c);
      if (erro) return desenhar(erro);
      if (n >= 1) {
        try {
          Object.assign(config, c);
          await salvarConfig(uid, config);
        } catch (e) {
          return desenhar('Não foi possível salvar agora. Confira a internet e tente de novo.');
        }
      }
      n += 1;
      desenhar();
    }
  }

  desenhar();
}
