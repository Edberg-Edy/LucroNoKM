// HTML da visão "Manutenção" do histórico: situação de cada item, lançar uma troca e lista das trocas.
import { dataBR, esc, hojeISO } from './formatos.js';

const km = (n) => Math.round(n).toLocaleString('pt-BR') + ' km';

function textoDoItem(s) {
  if (s.nivel === 'sem-registro') return { selo: 'Sem registro', classe: '', texto: 'Lance a primeira troca (com o odômetro) para o app avisar a próxima.' };
  const base = `Última: ${km(s.ultimoKm)} · próxima: ${km(s.proximoKm)}`;
  if (s.faltam === null) return { selo: 'Em dia', classe: 'verde', texto: base };
  if (s.nivel === 'vencido') return { selo: 'Vencido', classe: 'vermelho', texto: `${base} · passou ${km(-s.faltam)}` };
  return { selo: s.nivel === 'chegando' ? 'Chegando' : 'Em dia', classe: s.nivel === 'chegando' ? 'amarelo' : 'verde', texto: `${base} · faltam ${km(s.faltam)}` };
}

// itens = resultado de situacaoDosItens; lista = trocas lançadas (qualquer ordem); sugestaoKm = odômetro atual (preenche o campo)
export function htmlManutencao({ itens, lista, sugestaoKm, apagandoId = null }) {
  const cartaoItens = itens
    .map((s) => {
      const t = textoDoItem(s);
      const pl = (n) => `${n} ${n === 1 ? 'dia' : 'dias'}`;
      const desde =
        s.rodou !== null && s.diasDesde !== null
          ? `<p class="suave">Desde a última troca: ${km(s.rodou)} rodados em ${pl(s.diasDesde)}.${
              s.anterior ? ` A troca anterior durou ${km(s.anterior.km)}${s.anterior.dias !== null ? ' e ' + pl(s.anterior.dias) : ''}.` : ''
            }</p>`
          : '';
      const real = s.real
        ? `<p class="suave">Pelas suas trocas: a cada ${km(s.real)} (Ajuste: ${km(s.duracaoKm)}). ${
            Math.abs(s.real - s.duracaoKm) > s.duracaoKm * 0.1 ? 'Vale acertar a duração nos Ajustes.' : ''
          }</p>`
        : '';
      return `
      <div class="item-man">
        <div class="resumo"><span>${esc(s.item)}</span><b class="selo ${t.classe}">${t.selo}</b></div>
        <div class="medidor ${t.classe}" role="img" aria-label="${Math.round(s.usado)}% da duração usada"><i style="width:${s.nivel === 'sem-registro' ? 0 : Math.max(2, Math.round(s.usado))}%"></i></div>
        <p class="suave">${t.texto}</p>${desde}${real}
      </div>`;
    })
    .join('');

  const opcoes = itens.map((s) => `<option value="${esc(s.item)}">${esc(s.item)}</option>`).join('');
  const ordenada = [...lista].sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : b.odometro - a.odometro));
  const linhas = ordenada.length
    ? ordenada
        .map(
          (m) => `
      <div class="item">
        <span>${dataBR(m.data).slice(0, 5)} · ${esc(m.item)} · ${km(m.odometro)}</span>
        <button type="button" class="x" data-man-excluir="${esc(m.id)}" aria-label="Excluir troca">${apagandoId === m.id ? 'Excluir?' : '✕'}</button>
      </div>`
        )
        .join('')
    : '<p class="suave">Nenhuma troca lançada ainda.</p>';

  return `
    <section class="cartao compacto">
      <h2>Próximas trocas</h2>
      ${cartaoItens || '<p class="suave">Cadastre os itens em Ajustes → Manutenção.</p>'}
      <p class="suave" style="margin-top:8px">O aviso amarelo aparece quando faltam 10% do km do item.</p>
    </section>

    <section class="cartao compacto">
      <h2>Lançar uma troca</h2>
      <p class="suave">Lance também a última troca que você já fez, com o odômetro da época, para o app começar a contar.</p>
      <label>Item<select id="manItem">${opcoes}</select></label>
      <label>Data<input type="date" id="manData" value="${hojeISO()}"></label>
      <label>Odômetro na troca (km)<input type="text" inputmode="numeric" id="manKm" value="${sugestaoKm ?? ''}"></label>
      <button type="button" class="botao" data-acao="lancarManutencao">Lançar troca</button>
      <p class="suave" id="manAviso" role="status"></p>
    </section>

    <section class="cartao compacto">
      <h2>Trocas lançadas</h2>
      ${linhas}
    </section>`;
}
