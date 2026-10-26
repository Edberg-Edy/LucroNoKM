// Testes das sugestões ao abrir o dia. Para rodar: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { odometroSugerido, conferirOdometroInicial } from './sugestoes.js';

const dia = (data, ini, fim) => ({ data, odometroInicial: ini, odometroFinal: fim });

test('sugestão: o maior odômetro conhecido (dias, abastecimentos e dia aberto)', () => {
  assert.equal(odometroSugerido({}), null);
  assert.equal(odometroSugerido({ dias: [dia('2026-10-01', 100, 250), dia('2026-10-02', 250, 400)] }), 400);
  assert.equal(odometroSugerido({ dias: [dia('2026-10-01', 100, 250)], abastecimentos: [{ odometro: 300 }, { odometro: null }] }), 300);
  assert.equal(odometroSugerido({ diaAberto: { odometroInicial: 500 }, dias: [dia('2026-10-01', 100, 250)] }), 500);
});

test('sugestão ignora dia aberto sem odômetro final e valores que não são número', () => {
  assert.equal(odometroSugerido({ dias: [{ data: '2026-10-02', odometroInicial: 250 }, dia('2026-10-01', 100, 250)] }), 250);
  assert.equal(odometroSugerido({ dias: [{ odometroFinal: 'x' }, { odometroFinal: undefined }] }), null);
});

const dias = [dia('2026-10-01', 1000, 1100), dia('2026-10-02', 1100, 1220), dia('2026-10-04', 1300, 1400)];

test('odômetro que continua de onde o dia anterior parou passa', () => {
  assert.equal(conferirOdometroInicial({ data: '2026-10-05', odometro: 1400, dias }), null);
  assert.equal(conferirOdometroInicial({ data: '2026-10-05', odometro: 1450, dias }), null);
});

test('odômetro menor que o final do dia anterior é erro', () => {
  const r = conferirOdometroInicial({ data: '2026-10-05', odometro: 1350, dias });
  assert.equal(r.tipo, 'erro');
  assert.match(r.texto, /menor que o final de 04\/10\/2026 \(1400 km\)/);
});

test('salto grande pede confirmação', () => {
  const r = conferirOdometroInicial({ data: '2026-10-05', odometro: 1800, dias });
  assert.equal(r.tipo, 'confirmar');
  assert.match(r.texto, /400 km a mais/);
  assert.equal(conferirOdometroInicial({ data: '2026-10-05', odometro: 1700, dias }), null); // 300 km exatos passa
});

test('dia esquecido entre dois dias: confere com o anterior e com o seguinte', () => {
  // 03/10 fica entre 02/10 (final 1220) e 04/10 (inicial 1300)
  assert.equal(conferirOdometroInicial({ data: '2026-10-03', odometro: 1220, dias }), null);
  assert.equal(conferirOdometroInicial({ data: '2026-10-03', odometro: 1300, dias }), null);
  const baixo = conferirOdometroInicial({ data: '2026-10-03', odometro: 1200, dias });
  assert.equal(baixo.tipo, 'erro');
  const alto = conferirOdometroInicial({ data: '2026-10-03', odometro: 1350, dias });
  assert.equal(alto.tipo, 'erro');
  assert.match(alto.texto, /maior que o inicial de 04\/10\/2026 \(1300 km\)/);
});

test('data mais antiga que todos os dias carregados: só confere com o seguinte', () => {
  assert.equal(conferirOdometroInicial({ data: '2026-09-20', odometro: 500, dias }), null);
  assert.equal(conferirOdometroInicial({ data: '2026-09-20', odometro: 1100, dias }).tipo, 'erro');
});

test('sem dias para comparar, tudo passa; dia aberto não serve de referência', () => {
  assert.equal(conferirOdometroInicial({ data: '2026-10-05', odometro: 5, dias: [] }), null);
  const aberto = [{ data: '2026-10-04', odometroInicial: 1300 }];
  assert.equal(conferirOdometroInicial({ data: '2026-10-05', odometro: 5, dias: aberto }), null);
});

test('dois dias na mesma data: vale o de maior odômetro final', () => {
  const dois = [dia('2026-10-04', 1000, 1100), dia('2026-10-04', 1100, 1200)];
  assert.equal(conferirOdometroInicial({ data: '2026-10-04', odometro: 1150, dias: dois }).tipo, 'erro');
  assert.equal(conferirOdometroInicial({ data: '2026-10-04', odometro: 1200, dias: dois }), null);
});
