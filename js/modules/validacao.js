// Conferência dos números digitados nos Ajustes. Função pura, testada em validacao.test.js.
// Antes, um campo apagado virava 0 sem aviso: km por litro 0 fazia o combustível custar zero e inflava o lucro.
import { lerNumero } from './formatos.js';

// Regras por nome do campo (o último pedaço do caminho, ex.: 'manutencao.2.duracaoKm' usa 'duracaoKm').
//   positivo: tem que ser maior que zero    max: acima disso é quase certo erro de digitação
const REGRAS = {
  meta: { rotulo: 'Meta diária', max: 100000 },
  contasMes: { rotulo: 'Contas do mês', max: 1000000 },
  kmPorLitro: { rotulo: 'Km por litro', positivo: true, max: 150 },
  precoLitro: { rotulo: 'Preço do litro', positivo: true, max: 30 },
  diasPorMes: { rotulo: 'Dias trabalhados por mês', positivo: true, max: 31, inteiro: true },
  limiteMei: { rotulo: 'Limite do MEI', max: 100000000 },
  preco: { rotulo: 'Preço da peça', max: 1000000 },
  duracaoKm: { rotulo: 'Duração em km', positivo: true, max: 1000000 },
  valorMensal: { rotulo: 'Valor mensal', max: 1000000 },
};

// Devolve { ok: true, valor } ou { ok: false, erro } com uma frase pronta para a tela.
// Campo vazio vale 0 nos campos que aceitam zero (ex.: "Contas do mês" = 0 desliga o acompanhamento).
export function validarCampoAjuste(chave, texto) {
  const regra = REGRAS[String(chave).split('.').pop()];
  if (!regra) return { ok: false, erro: 'Campo desconhecido.' };

  const vazio = String(texto ?? '').trim() === '';
  if (vazio && !regra.positivo) return { ok: true, valor: 0 };

  const n = vazio ? null : lerNumero(texto);
  if (n === null) {
    return { ok: false, erro: `${regra.rotulo}: ${vazio ? 'não pode ficar vazio.' : 'digite um número válido.'}` };
  }
  if (regra.positivo && n <= 0) return { ok: false, erro: `${regra.rotulo}: precisa ser maior que zero.` };
  if (n > regra.max) return { ok: false, erro: `${regra.rotulo}: valor alto demais, confira se digitou certo.` };

  return { ok: true, valor: regra.inteiro ? Math.max(1, Math.round(n)) : n };
}
