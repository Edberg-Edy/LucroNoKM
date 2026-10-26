// Contas do combustível. Funções puras (sem tela e sem Firebase), testadas em combustivel.test.js.
//
// Método "tanque cheio a tanque cheio": o consumo real só pode ser medido entre dois abastecimentos com o
// tanque cheio. Os litros de TODOS os abastecimentos feitos depois do primeiro cheio, até o segundo cheio
// (inclusive), são o combustível gasto nos km rodados entre os dois. Abastecimento parcial entra na soma,
// mas não serve de ponto de medida.
//
// Cada abastecimento: { id, data: 'aaaa-mm-dd', odometro: número ou null, litros, valor, cheio: true/false }

import { lerNumero } from './formatos.js';

const DATA = /^\d{4}-\d{2}-\d{2}$/;

// ---------- formatação ----------

export const kmL = (n) => n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
export const litrosBR = (n) => n.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
export const dinheiro3 = (n) =>
  'R$ ' + (Number(n) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 });

const soma = (lista, campo) => lista.reduce((total, x) => total + (Number(x[campo]) || 0), 0);
const doMes = (lista, ym) => lista.filter((a) => a.data.startsWith(ym + '-'));

// ---------- trechos (de um tanque cheio ao seguinte) ----------

// Ordem em que os abastecimentos aconteceram: data, depois odômetro (sem odômetro fica por último no dia).
export function ordenar(lista) {
  const odo = (a) => (Number.isFinite(a.odometro) ? a.odometro : Infinity);
  return [...lista].sort((a, b) => {
    if (a.data !== b.data) return a.data < b.data ? -1 : 1;
    if (odo(a) !== odo(b)) return odo(a) < odo(b) ? -1 : 1;
    return String(a.id ?? '') < String(b.id ?? '') ? -1 : 1;
  });
}

// Devolve os trechos medidos, do mais antigo ao mais recente:
//   { de, ate, km, litros, valor, kmPorLitro, custoPorKm, precoMedio }
// "ate" é o abastecimento que fechou o trecho (é a ele que o consumo "pertence").
export function trechos(lista) {
  const resultado = [];
  let base = null; // último tanque cheio com odômetro: de onde a medida parte
  let litros = 0;
  let valor = 0;

  for (const a of ordenar(lista)) {
    if (base) {
      litros += a.litros;
      valor += a.valor;
    }
    if (a.cheio && Number.isFinite(a.odometro)) {
      if (base) {
        const km = a.odometro - base.odometro;
        if (km > 0 && litros > 0) {
          resultado.push({
            de: base,
            ate: a,
            km,
            litros,
            valor,
            kmPorLitro: km / litros,
            custoPorKm: valor / km,
            precoMedio: valor / litros,
          });
        }
      }
      base = a;
      litros = 0;
      valor = 0;
    }
  }
  return resultado;
}

// Consumo médio dos últimos trechos (o mais recente vale mais que o antigo, por isso só os últimos).
// Devolve null se ainda não há nenhum trecho medido.
export function consumoMedio(listaDeTrechos, ultimos = 10) {
  const usados = listaDeTrechos.slice(-ultimos);
  const km = soma(usados, 'km');
  const litros = soma(usados, 'litros');
  if (!(litros > 0)) return null;
  return { kmPorLitro: km / litros, trechos: usados.length, km, litros };
}

// Avisa quando o último trecho rendeu bem menos que a média dos anteriores (pneu murcho, corrente seca,
// filtro sujo, motor pedindo revisão...). Precisa de pelo menos "minimo" trechos anteriores para comparar.
export function alertaConsumo(listaDeTrechos, { limite = 0.1, minimo = 2 } = {}) {
  if (listaDeTrechos.length < minimo + 1) return null;
  const ultimo = listaDeTrechos[listaDeTrechos.length - 1];
  const anteriores = listaDeTrechos.slice(-6, -1); // até 5 trechos antes do último
  const media = soma(anteriores, 'km') / soma(anteriores, 'litros');
  const queda = 1 - ultimo.kmPorLitro / media;
  if (queda < limite) return null;
  return { queda, ultimo: ultimo.kmPorLitro, media, data: ultimo.ate.data };
}

// ---------- resumo do mês ----------

// Resumo dos abastecimentos de um mês ('aaaa-mm').
//   valor / litros / precoMedio: tudo que foi abastecido no mês (o que saiu do bolso)
//   kmPorLitro / custoPorKm / kmMedido: só dos trechos que terminaram no mês (o que foi medido de verdade)
export function resumoCombustivel(lista, ym) {
  const abastecimentos = doMes(lista, ym);
  const litros = soma(abastecimentos, 'litros');
  const valor = soma(abastecimentos, 'valor');

  const medidos = trechos(lista).filter((t) => t.ate.data.startsWith(ym + '-'));
  const kmMedido = soma(medidos, 'km');
  const litrosMedidos = soma(medidos, 'litros');
  const valorMedido = soma(medidos, 'valor');

  return {
    abastecimentos: abastecimentos.length,
    litros,
    valor,
    precoMedio: litros > 0 ? valor / litros : null,
    trechos: medidos.length,
    kmMedido,
    kmPorLitro: litrosMedidos > 0 ? kmMedido / litrosMedidos : null,
    custoPorKm: kmMedido > 0 ? valorMedido / kmMedido : null,
  };
}

// Tudo que a tela do mês mostra sobre combustível.
//   estimado = combustível que os dias fechados do mês calcularam (km ÷ km/l × preço do litro)
//   kmPorLitroAjuste = km/l que está nos Ajustes
// diferenca > 0: o app subestimou o gasto (o lucro mostrado nos dias está acima do real).
export function painelDoMes(lista, ym, { estimado, kmPorLitroAjuste }) {
  const r = resumoCombustivel(lista, ym);
  const temAbastecimento = r.abastecimentos > 0;
  return {
    ...r,
    estimado,
    kmPorLitroAjuste,
    diferenca: temAbastecimento ? r.valor - estimado : null,
    desvio: r.kmPorLitro !== null && kmPorLitroAjuste > 0 ? r.kmPorLitro / kmPorLitroAjuste - 1 : null,
  };
}

// ---------- combustível de um período (semana) ----------

// Resumo do combustível de uma semana (ou qualquer lista de dias fechados).
//   diasDoPeriodo = dias fechados do período; lista = todos os abastecimentos; datas = datas do período
// "estimado" vem das contas dos dias (km ÷ km/l × preço do litro): existe mesmo sem lançar abastecimento.
// "real" só existe se houve abastecimento informado no período.
export function combustivelDoPeriodo(diasDoPeriodo, lista, datas) {
  const calculados = diasDoPeriodo.map((d) => d.calculados);
  const km = soma(calculados, 'km');
  const estimadoValor = soma(calculados, 'combustivel');
  const estimadoLitros = diasDoPeriodo.reduce(
    (total, d) => total + (d.snapshot && d.snapshot.kmPorLitro > 0 ? d.calculados.km / d.snapshot.kmPorLitro : 0),
    0
  );

  const doPeriodo = lista.filter((a) => datas.includes(a.data));
  const medidos = trechos(lista).filter((t) => datas.includes(t.ate.data));
  const litrosMedidos = soma(medidos, 'litros');
  const litros = soma(doPeriodo, 'litros');
  const valor = soma(doPeriodo, 'valor');

  return {
    km,
    estimadoValor,
    estimadoLitros,
    porKm: km > 0 ? estimadoValor / km : null,
    kmPorLitroUsado: estimadoLitros > 0 ? km / estimadoLitros : null,
    real: doPeriodo.length
      ? {
          abastecimentos: doPeriodo.length,
          valor,
          litros,
          precoMedio: litros > 0 ? valor / litros : null,
          kmPorLitro: litrosMedidos > 0 ? soma(medidos, 'km') / litrosMedidos : null,
        }
      : null,
  };
}

// ---------- conferência do que foi digitado ----------

// Confere um abastecimento digitado. "entrada" traz os textos dos campos; "lista" são os abastecimentos já lançados.
// Devolve { ok: true, dados } ou { ok: false, erro } com uma frase pronta para a tela.
export function validarAbastecimento(entrada, lista, { hoje, editandoId = null } = {}) {
  const falha = (erro) => ({ ok: false, erro });
  const cheio = entrada.cheio === true;

  const data = String(entrada.data ?? '');
  if (!DATA.test(data) || data > hoje) return falha('Escolha uma data válida (hoje ou anterior).');

  const litros = lerNumero(entrada.litros);
  if (litros === null || litros <= 0) return falha('Digite os litros abastecidos.');
  if (litros > 60) return falha('Mais de 60 litros? Confira o valor digitado.');

  const valor = lerNumero(entrada.valor);
  if (valor === null || valor <= 0) return falha('Digite o valor pago.');

  const preco = valor / litros;
  if (preco < 2 || preco > 20) {
    return falha(`Deu R$ ${preco.toFixed(2).replace('.', ',')} por litro. Confira os litros e o valor.`);
  }

  const textoOdometro = String(entrada.odometro ?? '').trim();
  let odometro = null;
  if (textoOdometro) {
    odometro = lerNumero(textoOdometro);
    if (odometro === null || odometro <= 0) return falha('Odômetro inválido.');
  } else if (cheio) {
    return falha('Para marcar "Enchi o tanque", informe o odômetro: é com ele que o app mede o consumo.');
  }

  // O odômetro nunca diminui com o tempo: confere com os outros abastecimentos.
  if (odometro !== null) {
    for (const outro of lista) {
      if (outro.id === editandoId || !Number.isFinite(outro.odometro) || outro.data === data) continue;
      if (outro.data < data && outro.odometro > odometro) {
        return falha(`O odômetro é menor que o do abastecimento de ${brData(outro.data)} (${outro.odometro} km).`);
      }
      if (outro.data > data && outro.odometro < odometro) {
        return falha(`O odômetro é maior que o do abastecimento de ${brData(outro.data)} (${outro.odometro} km).`);
      }
    }
  }

  return {
    ok: true,
    dados: { data, odometro, litros: arredondar(litros), valor: arredondar(valor), cheio },
  };
}

const arredondar = (n) => Math.round(n * 100) / 100;
const brData = (iso) => iso.split('-').reverse().join('/').slice(0, 5);
