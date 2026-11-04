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

const DIAS_ENTRE_BACKUPS = 30;
const diasEntre = (a, b) => Math.round((Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8, 10)) - Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10))) / 86400000);

// Lembra de baixar o backup (Ajustes) quando faz 30 dias ou mais que o último foi feito.
//   ultimoBackup = data 'aaaa-mm-dd' do último backup baixado neste aparelho (null se nunca)
//   primeiroDia  = data do primeiro dia lançado (sem dados, não há o que salvar)
// Quem nunca fez backup recebe o primeiro lembrete 30 dias depois de começar a usar o app.
export function lembreteBackup({ hoje, ultimoBackup = null, primeiroDia = null }) {
  if (!primeiroDia) return null;
  const desde = ultimoBackup || primeiroDia;
  const dias = diasEntre(desde, hoje);
  if (dias < DIAS_ENTRE_BACKUPS) return null;
  return ultimoBackup
    ? `Faz ${dias} dias que você não baixa um backup. Em Ajustes, toque em "Baixar backup" para guardar seus dados.`
    : 'Você ainda não baixou nenhum backup dos seus dados. Em Ajustes, toque em "Baixar backup".';
}
