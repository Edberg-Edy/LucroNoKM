// Planilha (CSV) do mês, para abrir no Excel ou mandar ao contador. csvDoMes é pura (testada em exportar.test.js).
//
// Formato pensado para o Excel em português: separador ";", vírgula nos decimais e BOM no começo
// (sem ele o Excel mostra "R$" e acentos quebrados).
import { dataBR } from './formatos.js';

const SEPARADOR = ';';
const BOM = '﻿';

const num = (n) => (Number.isFinite(n) ? (Math.round(n * 100) / 100).toString().replace('.', ',') : '');

// Texto seguro para uma célula: aspas dobradas e proteção contra fórmula (=, +, -, @ no começo viram texto).
export function celula(valor) {
  let t = String(valor ?? '');
  // Número negativo (ex.: lucro de um dia no prejuízo) continua número; qualquer outro começo suspeito vira texto
  if (/^[=+\-@\t\r]/.test(t) && !/^-\d+(,\d+)?$/.test(t)) t = "'" + t;
  return /[;"\n\r]/.test(t) ? `"${t.replaceAll('"', '""')}"` : t;
}

const NOME_STATUS = { verde: 'Meta', amarelo: 'Abaixo', vermelho: 'Prejuízo' };

// Planilha de um mês ('aaaa-mm') ou de um ano inteiro ('aaaa').
export const csvDoMes = (dias, ym) => csvDoPeriodo(dias, ym);

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

// Planilha do ano: uma linha por mês (Janeiro a Dezembro, mesmo os sem dias) e uma linha de total.
export function csvDoAno(dias, ano) {
  const doAno = dias.filter((d) => d.data.startsWith(ano + '-'));
  const plataformas = [];
  for (const d of doAno) for (const p of d.plataformas || []) if (!plataformas.includes(p.nome)) plataformas.push(p.nome);

  const cabecalho = [
    'Mês', 'Dias', 'Km', 'Horas', ...plataformas, 'Faturamento', 'Combustível', 'Manutenção', 'Despesas',
    'Custos fixos', 'Lucro', 'Guardar', 'Corridas',
  ];
  const campos = ['faturamento', 'combustivel', 'manutencao', 'despesas', 'fixos', 'lucro', 'guardar', 'corridas'];

  const somar = (lista) => ({
    dias: lista.length,
    km: lista.reduce((t, d) => t + (Number(d.calculados.km) || 0), 0),
    horas: lista.reduce((t, d) => t + (d.horas > 0 ? d.horas : 0), 0),
    plat: plataformas.map((nome) =>
      lista.reduce((t, d) => t + (d.plataformas || []).filter((p) => p.nome === nome).reduce((x, p) => x + (Number(p.valor) || 0), 0), 0)
    ),
    c: campos.map((campo) => lista.reduce((t, d) => t + (Number(d.calculados[campo]) || 0), 0)),
  });
  const linha = (nome, r) => [
    nome, String(r.dias), num(r.km), r.horas > 0 ? num(r.horas) : '', ...r.plat.map(num),
    ...r.c.slice(0, 7).map(num), r.c[7] > 0 ? String(r.c[7]) : '',
  ];

  const linhas = MESES.map((nome, i) => {
    const ym = `${ano}-${String(i + 1).padStart(2, '0')}`;
    return linha(nome, somar(doAno.filter((d) => d.data.startsWith(ym + '-'))));
  });
  linhas.push(linha('Total', somar(doAno)));

  return BOM + [cabecalho, ...linhas].map((l) => l.map(celula).join(SEPARADOR)).join('\r\n') + '\r\n';
}

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

// No celular abre a folha "Compartilhar" (o usuário escolhe Planilhas, Excel, Drive, WhatsApp...), porque só baixar o .csv
// costuma cair num app que não abre planilha. No computador, ou se o celular não puder compartilhar arquivo, baixa direto.
export async function baixarCSV(nome, texto) {
  try {
    const toque = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
    const arquivo = new File(['\ufeff' + texto.replace(/^\ufeff/, '')], `lucronokm-${nome}.csv`, { type: 'text/csv' });
    if (toque && navigator.canShare && navigator.canShare({ files: [arquivo] })) {
      await navigator.share({ files: [arquivo], title: `LucroNoKM ${nome}` });
      return;
    }
  } catch (e) {
    if (e && e.name === 'AbortError') return; // o usuário fechou a folha de compartilhar
  }
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
