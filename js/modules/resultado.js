// Cartão de resultado do dia. Só monta o HTML (não grava nada), para servir à aba Hoje e, depois, ao Histórico.
import { dataBR, dinheiro, esc } from './formatos.js';

const textoHoras = (h) => `${String(Math.round(h * 100) / 100).replace('.', ',')} h`;
const textoKm = (km) => String(Math.round(km * 10) / 10).replace('.', ',');
const linha = (rotulo, valor, destaque = '') =>
  `<div class="resumo ${destaque}"><span>${rotulo}</span><b>${valor}</b></div>`;

// "dia" é um dia já fechado: precisa ter data, horas, plataformas, snapshot e calculados.
export function htmlResultado(dia) {
  const c = dia.calculados;
  const titulo = {
    verde: 'Dia lucrativo: acima da meta',
    amarelo: 'Lucrou, mas ficou abaixo da meta',
    vermelho: 'Dia no prejuízo',
  }[c.status];

  // Tudo em lucro, em pares: o total à esquerda e o lucro por unidade à direita
  const indicadores = [
    ['Km rodados', textoKm(c.km)],
    ['Lucro por km', c.km > 0 ? dinheiro(c.lucro / c.km) : '—'],
    ['Horas', dia.horas ? textoHoras(dia.horas) : '—'],
    ['Lucro por hora', c.lucroPorHora === null ? '—' : dinheiro(c.lucroPorHora)],
    ['Corridas', c.corridas || '—'],
    ['Lucro por corrida', c.corridas > 0 ? dinheiro(c.lucro / c.corridas) : '—'],
  ];

  const faltas = [];
  if (c.lucroPorHora === null) faltas.push('as horas trabalhadas');
  if (!c.corridas) faltas.push('as corridas de cada plataforma');
  const aviso = faltas.length
    ? `<p class="suave aviso">Informe ${faltas.join(' e ')} para completar os números acima.</p>`
    : '';

  // O combustível entra no que se guarda: ele sai agora no cálculo do dia, mas o abastecimento acontece depois.
  // As despesas também: foram pagas com o dinheiro da moto, então precisam ser repostas.
  const totalGuardar = c.combustivel + c.guardar + c.despesas;

  const prejuizo =
    c.lucro < 0 ? ' O dia não cobriu os custos: parte do que você guardar vai sair do seu bolso.' : '';

  return `
    <h1 class="so-leitor">Resultado do dia</h1>
    <div class="painel resultado-painel">
    <div class="col a">
    <section class="cartao resultado ${c.status}">
      <p class="resultado-titulo">${dataBR(dia.data)} · ${titulo}</p>
      <strong class="resultado-valor">${dinheiro(c.lucro)}</strong>
      <span>lucro líquido · meta ${dinheiro(dia.snapshot.meta)}</span>
    </section>

    <section class="cartao indicadores">
      ${indicadores.map(([rotulo, valor]) => `<div><span>${rotulo}</span><b>${valor}</b></div>`).join('')}
    </section>
    ${aviso}
    </div>

    <div class="col b">
    <section class="cartao">
      <h2>Seu dinheiro do dia</h2>
      ${dia.plataformas
        .map((p) =>
          linha(
            esc(p.nome) + (p.corridas ? ` · ${p.corridas} corridas · ${dinheiro(p.valor / p.corridas)}/corrida` : ''),
            dinheiro(p.valor)
          )
        )
        .join('')}
      ${linha('Faturamento', dinheiro(c.faturamento), 'total')}
    </section>

    <section class="cartao">
      <h2>Gastou no dia</h2>
      ${linha('Combustível (calculado)', '− ' + dinheiro(c.combustivel))}
      ${linha('Despesas', '− ' + dinheiro(c.despesas))}
      ${linha('Manutenção da moto', '− ' + dinheiro(c.manutencao))}
      ${linha('Custos fixos', '− ' + dinheiro(c.fixos))}
      ${linha('Total gasto', '− ' + dinheiro(c.gastos), 'total')}
      ${linha('Lucro líquido', dinheiro(c.lucro), 'total')}
    </section>

    <section class="cartao">
      <h2>Para guardar</h2>
      ${linha('Faturamento', dinheiro(c.faturamento))}
      ${linha('Menos os gastos', '− ' + dinheiro(c.gastos))}
      ${linha('Livre para gastar', dinheiro(c.livre), 'total')}
      ${linha('Guardar (combustível, moto, custos fixos e despesas)', dinheiro(totalGuardar), 'total')}
      <p class="suave" style="margin-top:8px">Separe ${dinheiro(totalGuardar)} deste dia: ${dinheiro(c.combustivel)} para o próximo abastecimento, ${dinheiro(c.manutencao)} para a moto, ${dinheiro(c.fixos)} para os custos fixos e ${dinheiro(c.despesas)} para repor as despesas.${prejuizo}</p>
    </section>
    </div>
    </div>`;
}