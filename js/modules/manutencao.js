// Contas da manutenção da moto: quando foi a última troca de cada item e quando será a próxima. Funções puras (testadas em manutencao.test.js).
// Cada troca lançada = { id, item, data, odometro, valor }. A duração de cada item vem dos Ajustes (config.manutencao).

const AVISO = 0.1; // avisa quando faltam 10% da duração do item

// Maior odômetro conhecido: dias fechados, dia aberto, abastecimentos e trocas.
export function kmAtualDe({ dias = [], diaAberto = null, abastecimentos = [], manutencoes = [] }) {
  const valores = [];
  for (const d of dias) {
    if (Number.isFinite(d.odometroFinal)) valores.push(d.odometroFinal);
    if (Number.isFinite(d.odometroInicial)) valores.push(d.odometroInicial);
  }
  if (diaAberto && Number.isFinite(diaAberto.odometroInicial)) valores.push(diaAberto.odometroInicial);
  for (const a of abastecimentos) if (Number.isFinite(a.odometro)) valores.push(a.odometro);
  for (const m of manutencoes) if (Number.isFinite(m.odometro)) valores.push(m.odometro);
  return valores.length ? Math.max(...valores) : null;
}

// Média de km por dia trabalhado nos últimos dias fechados (null se não der para saber).
export function mediaKmPorDia(dias, hoje, janela = 30) {
  const limite = new Date(hoje + 'T12:00:00');
  limite.setDate(limite.getDate() - janela);
  const iso = limite.toISOString().slice(0, 10);
  const recentes = dias.filter((d) => d.data >= iso && d.calculados && d.calculados.km > 0);
  if (!recentes.length) return null;
  return recentes.reduce((t, d) => t + d.calculados.km, 0) / recentes.length;
}

// Média real entre as trocas de um item (precisa de pelo menos duas). null se não der.
export function intervaloReal(lista, item) {
  const kms = lista.filter((m) => m.item === item && Number.isFinite(m.odometro)).map((m) => m.odometro).sort((a, b) => a - b);
  if (kms.length < 2) return null;
  return (kms[kms.length - 1] - kms[0]) / (kms.length - 1);
}

// Dias entre duas datas 'aaaa-mm-dd'.
export function diasEntre(de, ate) {
  return Math.max(0, Math.round((new Date(ate + 'T12:00:00') - new Date(de + 'T12:00:00')) / 86400000));
}

// Situação de cada item dos Ajustes.
//   nivel: 'sem-registro' | 'ok' | 'chegando' (faltam 10% ou menos) | 'vencido'
export function situacaoDosItens({ itens, lista, kmAtual, hoje = null }) {
  return itens.map((it) => {
    const trocas = lista.filter((m) => m.item === it.item && Number.isFinite(m.odometro));
    const base = { item: it.item, duracaoKm: it.duracaoKm, real: intervaloReal(lista, it.item) };
    if (!trocas.length || !(it.duracaoKm > 0)) return { ...base, nivel: 'sem-registro', ultimoKm: null, proximoKm: null, faltam: null, usado: 0, rodou: null, diasDesde: null, anterior: null };
    const ordenadas = [...trocas].sort((a, b) => a.odometro - b.odometro);
    const ultima = ordenadas[ordenadas.length - 1];
    const penultima = ordenadas[ordenadas.length - 2];
    const ultimoKm = ultima.odometro;
    const proximoKm = ultimoKm + it.duracaoKm;
    const faltam = kmAtual === null ? null : proximoKm - kmAtual;
    let nivel = 'ok';
    if (faltam !== null) nivel = faltam <= 0 ? 'vencido' : faltam <= it.duracaoKm * AVISO ? 'chegando' : 'ok';
    const usado = faltam === null ? 0 : Math.min(100, Math.max(0, ((it.duracaoKm - faltam) / it.duracaoKm) * 100));
    const rodou = kmAtual === null ? null : Math.max(0, kmAtual - ultimoKm);
    const diasDesde = hoje && ultima.data ? diasEntre(ultima.data, hoje) : null;
    // quanto a troca anterior durou (km e dias), para comparar com a atual
    const anterior = penultima ? { km: ultimoKm - penultima.odometro, dias: ultima.data && penultima.data ? diasEntre(penultima.data, ultima.data) : null } : null;
    return { ...base, nivel, ultimoKm, proximoKm, faltam, usado, rodou, diasDesde, anterior };
  });
}
