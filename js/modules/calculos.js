// Contas do LucroNoKM. São funções puras: não mexem em tela nem em Firebase, só recebem números e devolvem números.
// Por isso dá para testá-las sozinhas (veja calculos.test.js).

// ---------- Custos por km e por dia (usados nos Ajustes) ----------

// Custo de manutenção por km: soma de (preço da peça ÷ quantos km ela dura), com 3 casas decimais.
export function manutencaoPorKm(manutencao) {
  const soma = manutencao.reduce((total, x) => total + (x.duracaoKm > 0 ? x.preco / x.duracaoKm : 0), 0);
  return Math.round(soma * 1000) / 1000;
}

// Gasto de combustível por km rodado.
export function combustivelPorKm(kmPorLitro, precoLitro) {
  return kmPorLitro > 0 ? precoLitro / kmPorLitro : 0;
}

// Parte dos custos fixos que cabe a cada dia trabalhado.
export function fixoPorDia(fixos, diasPorMes) {
  const totalMensal = fixos.reduce((total, x) => total + x.valorMensal, 0);
  return diasPorMes > 0 ? totalMensal / diasPorMes : 0;
}

// ---------- Cálculo do dia ----------

// "Fotografia" dos ajustes usada nas contas. Cada dia guarda a sua, assim mudar o preço do litro
// depois não altera os dias antigos.
export function parametrosDoDia(config) {
  return {
    meta: config.meta,
    kmPorLitro: config.kmPorLitro,
    precoLitro: config.precoLitro,
    manutencaoPorKm: manutencaoPorKm(config.manutencao),
    fixoPorDia: fixoPorDia(config.fixos, config.diasPorMes),
  };
}

// Farol do dia: verde bateu a meta, amarelo lucrou mas ficou abaixo, vermelho foi prejuízo (ou zero a zero).
export function farol(lucro, meta) {
  if (lucro > 0 && lucro >= meta) return 'verde'; // com meta 0, um dia de lucro zero não é verde
  if (lucro > 0) return 'amarelo';
  return 'vermelho';
}

// Lê as horas digitadas: aceita "8", "8,5" e "8:30". Vazio ou inválido vira null (o resultado mostra "—").
export function lerHoras(texto) {
  const t = String(texto ?? '').trim();
  if (!t) return null;
  const minutos = t.includes(':') ? Number(t.split(':')[1] || 0) : 0;
  if (minutos < 0 || minutos >= 60) return null; // "8:75" não existe
  const horas = t.includes(':') ? Number(t.split(':')[0]) + minutos / 60 : Number(t.replace(',', '.'));
  return Number.isFinite(horas) && horas > 0 && horas <= 24 ? horas : null; // um dia tem no máximo 24 horas
}

// Calcula tudo do dia.
//   dia = { odometroInicial, odometroFinal, horas (opcional),
//           plataformas: [{ nome, valor, corridas (opcional) }], despesas: [{ categoria, valor }] }
//   p   = parâmetros do dia (veja parametrosDoDia)
export function calcularDia(dia, p) {
  const km = dia.odometroFinal - dia.odometroInicial;
  if (!(km > 0)) throw new RangeError('O odômetro final precisa ser maior que o inicial.');

  const plataformas = dia.plataformas || [];
  const despesasLista = dia.despesas || [];
  const somar = (lista, campo) => lista.reduce((total, x) => total + (Number(x[campo]) || 0), 0);

  const faturamento = somar(plataformas, 'valor');
  const combustivel = p.kmPorLitro > 0 ? (km / p.kmPorLitro) * p.precoLitro : 0;
  const manutencao = km * p.manutencaoPorKm;
  const despesas = somar(despesasLista, 'valor');
  const fixos = p.fixoPorDia;

  const gastos = combustivel + manutencao + despesas + fixos;
  const lucro = faturamento - gastos;

  // Ganho por corrida: só entram as plataformas que informaram o número de corridas,
  // senão o valor ficaria distorcido.
  const corridas = somar(plataformas, 'corridas');
  const ganhoComCorridas = somar(
    plataformas.filter((x) => x.corridas > 0),
    'valor'
  );

  return {
    km,
    faturamento,
    combustivel,
    manutencao,
    despesas,
    fixos,
    gastos,
    lucro,
    guardar: manutencao + fixos, // dinheiro que não se gasta hoje: peças da moto e custos fixos
    livre: lucro, // o que sobra para gastar
    ganhoPorKm: faturamento / km,
    lucroPorHora: dia.horas > 0 ? lucro / dia.horas : null,
    corridas,
    ganhoPorCorrida: corridas > 0 ? ganhoComCorridas / corridas : null,
    status: farol(lucro, p.meta),
  };
}

// Recalcula um dia JÁ FECHADO com parâmetros novos (os ajustes de agora).
// Usa só os dados brutos do dia (odômetros, horas, ganhos e despesas) e devolve a nova fotografia e os novos valores.
// Se o dia tiver odômetros inválidos, calcularDia lança RangeError: quem chama decide o que fazer.
export function recalcularDiaFechado(dia, parametros) {
  const calculados = calcularDia(
    {
      odometroInicial: dia.odometroInicial,
      odometroFinal: dia.odometroFinal,
      horas: dia.horas ?? null,
      plataformas: dia.plataformas || [],
      despesas: dia.despesas || [],
    },
    parametros
  );
  return { snapshot: parametros, calculados };
}
