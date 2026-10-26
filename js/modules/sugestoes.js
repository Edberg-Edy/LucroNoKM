// Ajudas ao abrir o dia: sugere o odômetro inicial e confere se o digitado faz sentido.
// Funções puras, testadas em sugestoes.test.js.
import { dataBR } from './formatos.js';

const ehNumero = (n) => Number.isFinite(n);
const SALTO_ALTO = 300; // km a mais que o final do último dia: o app pergunta se está certo

// O odômetro nunca diminui, então o maior valor conhecido é o mais recente.
// Usa o final dos dias, o odômetro dos abastecimentos e o início do dia aberto (se houver).
export function odometroSugerido({ dias = [], abastecimentos = [], diaAberto = null } = {}) {
  const valores = [
    ...dias.map((d) => d.odometroFinal),
    ...abastecimentos.map((a) => a.odometro),
    diaAberto ? diaAberto.odometroInicial : null,
  ].filter(ehNumero);
  return valores.length ? Math.max(...valores) : null;
}

// Confere o odômetro inicial digitado contra os dias já lançados.
// Devolve null (tudo certo), { tipo: 'erro', texto } (não deixa abrir) ou { tipo: 'confirmar', texto } (pergunta uma vez).
// "dias" pode ser só uma parte dos dias (os mais recentes): o que não der para conferir é deixado passar.
export function conferirOdometroInicial({ data, odometro, dias = [], salto = SALTO_ALTO }) {
  const completos = dias.filter((d) => ehNumero(d.odometroInicial) && ehNumero(d.odometroFinal));

  // Dia anterior no tempo: a data mais recente que não passa da data escolhida
  const anteriores = completos.filter((d) => d.data <= data);
  const anterior = anteriores.reduce(
    (a, b) => (!a || b.data > a.data || (b.data === a.data && b.odometroFinal > a.odometroFinal) ? b : a),
    null
  );
  // Dia seguinte no tempo: a data mais antiga depois da escolhida
  const seguintes = completos.filter((d) => d.data > data);
  const seguinte = seguintes.reduce(
    (a, b) => (!a || b.data < a.data || (b.data === a.data && b.odometroInicial < a.odometroInicial) ? b : a),
    null
  );

  if (anterior && odometro < anterior.odometroFinal) {
    return {
      tipo: 'erro',
      texto: `O odômetro (${odometro} km) é menor que o final de ${dataBR(anterior.data)} (${anterior.odometroFinal} km).`,
    };
  }
  if (seguinte && odometro > seguinte.odometroInicial) {
    return {
      tipo: 'erro',
      texto: `O odômetro (${odometro} km) é maior que o inicial de ${dataBR(seguinte.data)} (${seguinte.odometroInicial} km).`,
    };
  }
  if (anterior && odometro - anterior.odometroFinal > salto) {
    return {
      tipo: 'confirmar',
      texto: `Isso é ${Math.round(odometro - anterior.odometroFinal)} km a mais que o final de ${dataBR(anterior.data)}. Se estiver certo, toque em Abrir o dia de novo.`,
    };
  }
  return null;
}
