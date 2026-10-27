// Planilha (CSV) do mês, para abrir no Excel ou mandar ao contador. csvDoMes é pura (testada em exportar.test.js).
//
// Formato pensado para o Excel em português: separador ";", vírgula nos decimais e BOM no começo
// (sem ele o Excel mostra "R$" e acentos quebrados).
import { hojeISO, dataBR } from './formatos.js';

const SEPARADOR = ';';
const BOM = '﻿';

const num = (n) => (Number.isFinite(n) ? (Math.round(n * 100) / 100).toString().replace('.', ',') : '');

// Texto seguro para uma célula: aspas dobradas e proteção contra fórmula (=, +, -, @ no começo viram texto).
export function celula(valor) {
  let t = String(valor ?? '');
  if (/^[=+\-@\t\r]/.test(t)) t = "'" + t;
  return /[;"\n\r]/.test(t) ? `"${t.replaceAll('"', '""')}"` : t;
}

const NOME_STATUS = { verde: 'Meta', amarelo: 'Abaixo', vermelho: 'Prejuízo' };

// Planilha de um mês ('aaaa-mm') ou de um ano inteiro ('aaaa').
export const csvDoMes = (dias, ym) => csvDoPeriodo(dias, ym);
export const csvDoAno = (dias, ano) => csvDoPeriodo(dias, ano);

// dias = dias fechados (qualquer período); periodo = 'aaaa-mm' ou 'aaaa'. Uma linha por dia, uma coluna por plataforma e uma linha de total.
function csvDoPeriodo(dias, periodo) {
  const doMes = dias.filter((d) => d.data.startsWith(periodo + '-')).sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : 0));

  const plataformas = [];
  for (const d of doMes) for (const p of d.plataformas || []) if (!plataformas.includes(p.nome)) plataformas.push(p.nome);

  const cabecalho = [
    'Data', 'Km', 'Horas', ...plataformas, 'Faturamento', 'Combustível', 'Manutenção', 'Despesas',
    'Custos fixos', 'Lucro', 'Guardar', 'Corridas', 'Situação',
  ];

  const soma = (campo) => doMes.reduce((total, d) => total + (Number(d.calculados[campo]) || 0), 0);
  const valorDaPlataforma = (d, nome) =>
    (d.plataformas || []).filter((p) => p.nome === nome).reduce((total, p) => total + (Number(p.valor) || 0), 0);

  const linhas = doMes.map((d) => {
    const c = d.calculados;
    return [
      dataBR(d.data), num(c.km), d.horas > 0 ? num(d.horas) : '',
      ...plataformas.map((nome) => num(valorDaPlataforma(d, nome))),
      num(c.faturamento), num(c.combustivel), num(c.manutencao), num(c.despesas), num(c.fixos),
      num(c.lucro), num(c.guardar), c.corridas > 0 ? String(c.corridas) : '', NOME_STATUS[c.status] || '',
    ];
  });

  const total = [
    'Total', num(soma('km')), num(doMes.reduce((t, d) => t + (d.horas > 0 ? d.horas : 0), 0)),
    ...plataformas.map((nome) => num(doMes.reduce((t, d) => t + valorDaPlataforma(d, nome), 0))),
    num(soma('faturamento')), num(soma('combustivel')), num(soma('manutencao')), num(soma('despesas')), num(soma('fixos')),
    num(soma('lucro')), num(soma('guardar')), String(soma('corridas')), '',
  ];

  return BOM + [cabecalho, ...linhas, total].map((l) => l.map(celula).join(SEPARADOR)).join('\r\n') + '\r\n';
}

// Faz o navegador baixar o arquivo.
export function baixarCSV(nome, texto) {
  const blob = new Blob([texto], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `lucronokm-${nome}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
