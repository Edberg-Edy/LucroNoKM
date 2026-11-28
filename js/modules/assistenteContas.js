// Conta do dia de exemplo mostrada no fim do assistente. Função pura (testada em assistente.test.js).
import { manutencaoPorKm, combustivelPorKm, fixoPorDia } from './calculos.js';

// Dia de exemplo com os números da própria pessoa: faturou X e rodou Y km.
export function exemploDoDia(config, faturou = 300, km = 100) {
  const combustivel = km * combustivelPorKm(config.kmPorLitro, config.precoLitro);
  const manutencao = km * manutencaoPorKm(config.manutencao);
  const fixos = fixoPorDia(config.fixos, config.diasPorMes);
  const jaSaiu = combustivel;
  const separar = manutencao + fixos;
  const lucro = faturou - combustivel - manutencao - fixos;
  return { faturou, km, combustivel, manutencao, fixos, jaSaiu, separar, lucro, bateuMeta: lucro >= config.meta };
}
