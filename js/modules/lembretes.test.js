// Testes do lembrete do DAS. Para rodar: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lembreteDAS } from './lembretes.js';

const base = { primeiroDia: '2026-08-10', meses: {} };

test('antes do dia 17 não avisa', () => {
  assert.equal(lembreteDAS({ ...base, hoje: '2026-10-16' }), null);
  assert.equal(lembreteDAS({ ...base, hoje: '2026-10-01' }), null);
});

test('do dia 17 ao 19: avisa quantos dias faltam', () => {
  assert.match(lembreteDAS({ ...base, hoje: '2026-10-17' }), /DAS-MEI de setembro vence dia 20 \(em 3 dias\)/);
  assert.match(lembreteDAS({ ...base, hoje: '2026-10-19' }), /em 1 dia\)/);
});

test('dia 20: vence hoje; depois do 20: venceu', () => {
  assert.match(lembreteDAS({ ...base, hoje: '2026-10-20' }), /vence hoje/);
  assert.match(lembreteDAS({ ...base, hoje: '2026-10-25' }), /venceu dia 20 e ainda não está marcado como pago/);
  assert.match(lembreteDAS({ ...base, hoje: '2026-10-31' }), /venceu/);
});

test('o aviso ensina onde marcar como pago', () => {
  assert.match(lembreteDAS({ ...base, hoje: '2026-10-25' }), /Histórico › Mês › Fechamento/);
});

test('DAS do mês anterior marcado como pago: não avisa', () => {
  const meses = { '2026-09': { checklist: { dasPago: true } } };
  assert.equal(lembreteDAS({ ...base, meses, hoje: '2026-10-25' }), null);
});

test('marca de outro mês não vale; checklist sem dasPago ou falso continua avisando', () => {
  assert.ok(lembreteDAS({ ...base, meses: { '2026-08': { checklist: { dasPago: true } } }, hoje: '2026-10-25' }));
  assert.ok(lembreteDAS({ ...base, meses: { '2026-09': { checklist: { reservaTransferida: true } } }, hoje: '2026-10-25' }));
  assert.ok(lembreteDAS({ ...base, meses: { '2026-09': { checklist: { dasPago: false } } }, hoje: '2026-10-25' }));
});

test('não cobra DAS de mês anterior ao primeiro uso do app', () => {
  assert.equal(lembreteDAS({ hoje: '2026-10-25', meses: {}, primeiroDia: '2026-10-03' }), null);
  assert.equal(lembreteDAS({ hoje: '2026-10-25', meses: {}, primeiroDia: null }), null);
  assert.ok(lembreteDAS({ hoje: '2026-10-25', meses: {}, primeiroDia: '2026-09-30' }));
});

test('em janeiro, o DAS referente é o de dezembro do ano anterior', () => {
  assert.match(lembreteDAS({ ...base, primeiroDia: '2025-06-01', hoje: '2027-01-18' }), /de dezembro vence/);
});
