import { test } from 'node:test';
import assert from 'node:assert/strict';
import { kmAtualDe, mediaKmPorDia, intervaloReal, situacaoDosItens } from './manutencao.js';

const itens = [{ item: 'Óleo', duracaoKm: 1000 }, { item: 'Pneu', duracaoKm: 10000 }];

test('sem troca lançada o item fica sem registro', () => {
  const [oleo] = situacaoDosItens({ itens, lista: [], kmAtual: 5000 });
  assert.equal(oleo.nivel, 'sem-registro');
});

test('próxima troca = última + duração; avisa com 10% e vence no km', () => {
  const lista = [{ item: 'Óleo', odometro: 4500 }];
  const s = (km) => situacaoDosItens({ itens, lista, kmAtual: km })[0];
  assert.equal(s(5000).proximoKm, 5500);
  assert.equal(s(5000).nivel, 'ok');
  assert.equal(s(5400).nivel, 'chegando'); // faltam 100
  assert.equal(s(5400).faltam, 100);
  assert.equal(s(5500).nivel, 'vencido');
  assert.equal(s(5620).faltam, -120);
});

test('usa a troca mais recente e estima os dias de trabalho', () => {
  const lista = [{ item: 'Óleo', odometro: 3000 }, { item: 'Óleo', odometro: 4500 }];
  const o = situacaoDosItens({ itens, lista, kmAtual: 5000, mediaKmDia: 150 })[0];
  assert.equal(o.ultimoKm, 4500);
  assert.equal(o.dias, 4); // 500 km ÷ 150
});

test('intervalo real só com duas trocas ou mais', () => {
  assert.equal(intervaloReal([{ item: 'Pneu', odometro: 100 }], 'Pneu'), null);
  assert.equal(intervaloReal([{ item: 'Pneu', odometro: 100 }, { item: 'Pneu', odometro: 8100 }, { item: 'Pneu', odometro: 16100 }], 'Pneu'), 8000);
});

test('km atual é o maior odômetro conhecido', () => {
  assert.equal(kmAtualDe({}), null);
  assert.equal(kmAtualDe({ dias: [{ odometroFinal: 4800 }], diaAberto: { odometroInicial: 4800 }, abastecimentos: [{ odometro: 4790 }] }), 4800);
});

test('média de km por dia usa só os dias da janela', () => {
  const dias = [
    { data: '2026-11-20', calculados: { km: 100 } },
    { data: '2026-11-21', calculados: { km: 200 } },
    { data: '2026-01-01', calculados: { km: 999 } },
  ];
  assert.equal(mediaKmPorDia(dias, '2026-11-27'), 150);
  assert.equal(mediaKmPorDia([], '2026-11-27'), null);
});
