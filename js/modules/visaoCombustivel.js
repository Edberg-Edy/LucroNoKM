// HTML da visão "Combustível" do histórico: resumo do mês e lista completa dos abastecimentos.
// Só monta a tela; quem exclui e navega é o historico.js.
import { dinheiro, dataBR, esc } from './formatos.js';
import { nomeDoMes } from './mes.js';
import { ordenar, resumoCombustivel, litrosBR, kmL } from './combustivel.js';


// ym = mês na tela; atual = mês de hoje; lista = todos os abastecimentos; fechado = mês fechado (lista travada);
// apagandoId = abastecimento que aguarda o segundo toque em ✕
export function htmlCombustivelMes({ ym, atual, lista, fechado, precoLitro, apagandoId = null }) {
  const doMes = ordenar(lista.filter((a) => a.data.startsWith(ym + '-'))).reverse();
  const r = resumoCombustivel(lista, ym, precoLitro);

  const consumo =
    r.kmPorLitro !== null
      ? `${kmL(r.kmPorLitro)} km/l`
      : r.aproximado
        ? `≈ ${kmL(r.aproximado.kmPorLitro)} km/l`
        : '—';

  const itens = doMes.length
    ? doMes
        .map((a) => {
          const km = Number.isFinite(a.odometro) ? `${a.odometro} km` : 'sem odômetro';
          const tipo = a.cheio ? 'tanque cheio' : 'parcial';
          return `
      <div class="item">
        <span>${dataBR(a.data).slice(0, 5)} · ${km} · ${litrosBR(a.litros)} L · ${tipo}</span>
        ${
          fechado
            ? ''
            : `<button type="button" class="ghost" data-ab-editar="${esc(a.id)}">Editar</button>
        <button type="button" class="x" data-ab-excluir="${esc(a.id)}" aria-label="Excluir abastecimento">${apagandoId === a.id ? 'Excluir?' : '✕'}</button>`
        }
      </div>`;
        })
        .join('')
    : '<p class="suave">Nenhum abastecimento neste mês.</p>';

  return `
    <section class="cartao">
      <div class="nav-semana">
        <button type="button" class="ghost" data-mes="anterior">‹ Anterior</button>
        <b>${nomeDoMes(ym)}</b>
        <button type="button" class="ghost" data-mes="proximo" ${ym >= atual ? 'disabled' : ''}>Próximo ›</button>
      </div>
      ${fechado ? '<p class="suave">🔒 Mês fechado: a lista não pode ser alterada. Reabra o mês na aba Mês para editar.</p>' : ''}
    </section>

    <section class="cartao indicadores">
      <div><span>Abastecimentos</span><b>${r.abastecimentos}</b></div>
      <div><span>Litros</span><b>${litrosBR(r.litros)} L</b></div>
      <div><span>Gasto${r.valorEstimado ? ' (estimado)' : ''}</span><b>${dinheiro(r.valor)}</b></div>
      <div><span>Consumo</span><b>${consumo}</b></div>
    </section>

    <section class="cartao">
      <h2>Abastecimentos do mês</h2>
      ${itens}
      <p class="suave" style="margin-top:8px">Para registrar um novo, use a aba Hoje.</p>
    </section>`;
}
