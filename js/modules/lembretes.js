// Lembretes da aba Hoje. Função pura, testada em lembretes.test.js.
import { mesDe, somarMeses, nomeDoMes } from './mes.js';

const DIA_AVISO = 17; // o aviso começa 3 dias antes do vencimento
const DIA_VENCIMENTO = 20; // o DAS-MEI vence todo dia 20, e paga o mês anterior

// Avisa do DAS-MEI do mês passado enquanto ele não estiver marcado como pago (Histórico › Mês › Fechamento).
//   hoje        = 'aaaa-mm-dd'
//   meses       = documentos de mês já gravados: { 'aaaa-mm': { checklist: { dasPago } } }
//   primeiroDia = data do primeiro dia lançado no app (null se ainda não há nenhum).
//                 Não cobra o DAS de meses anteriores ao uso do app.
// Devolve o texto do aviso ou null.
export function lembreteDAS({ hoje, meses = {}, primeiroDia = null }) {
  const dia = Number(hoje.slice(8, 10));
  if (dia < DIA_AVISO) return null;

  const referencia = somarMeses(mesDe(hoje), -1);
  if (!primeiroDia || mesDe(primeiroDia) > referencia) return null;
  if (meses[referencia]?.checklist?.dasPago === true) return null;

  const nome = nomeDoMes(referencia).split(' de ')[0];
  let texto;
  if (dia < DIA_VENCIMENTO) {
    const faltam = DIA_VENCIMENTO - dia;
    texto = `O DAS-MEI de ${nome} vence dia 20 (em ${faltam} ${faltam === 1 ? 'dia' : 'dias'}).`;
  } else if (dia === DIA_VENCIMENTO) {
    texto = `O DAS-MEI de ${nome} vence hoje.`;
  } else {
    texto = `O DAS-MEI de ${nome} venceu dia 20 e ainda não está marcado como pago.`;
  }
  return texto + ' Depois de pagar, marque em Histórico › Mês › Fechamento.';
}
