// Testes do backup. Para rodar: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { montarBackup, validarBackup, prepararRestauracao } from './backup.js';

test('backup traz identificação, config e dias em ordem de data', () => {
  const b = montarBackup({ meta: 200 }, [{ data: '2026-10-08' }, { data: '2026-10-01' }], new Date('2026-10-08T12:00:00Z'));
  assert.equal(b.app, 'LucroNoKM');
  assert.equal(b.versao, 1);
  assert.equal(b.exportadoEm, '2026-10-08T12:00:00.000Z');
  assert.equal(b.config.meta, 200);
  assert.deepEqual(b.dias.map((d) => d.data), ['2026-10-01', '2026-10-08']);
});

test('montar o backup não altera a lista original', () => {
  const dias = [{ data: '2026-10-08' }, { data: '2026-10-01' }];
  montarBackup({}, dias);
  assert.equal(dias[0].data, '2026-10-08');
});

// ---------- validação e restauração ----------

// Dia fechado completo, igual ao que o app grava
const diaOk = (id, data) => ({
  id, data, aberto: false, odometroInicial: 100, odometroFinal: 200, horas: 8,
  plataformas: [{ nome: 'iFood', valor: 120, corridas: 7 }, { nome: 'Particular', valor: 50, corridas: 0 }],
  despesas: [{ categoria: 'Comida', valor: 20 }],
  snapshot: { meta: 150, kmPorLitro: 25, precoLitro: 6, manutencaoPorKm: 0.173, fixoPorDia: 7.5 },
  calculados: {
    km: 100, faturamento: 170, combustivel: 24, manutencao: 17.3, despesas: 20, fixos: 7.5, gastos: 68.8,
    lucro: 101.2, guardar: 24.8, livre: 101.2, ganhoPorKm: 1.7, lucroPorHora: 12.65, corridas: 7, ganhoPorCorrida: 17.14,
    status: 'amarelo',
  },
  criadoEm: { seconds: 1 }, fechadoEm: { seconds: 2 },
});
const backupOk = () => ({
  app: 'LucroNoKM', versao: 1,
  config: {
    meta: 150, kmPorLitro: 25, precoLitro: 6, diasPorMes: 26, limiteMei: 81000, contasMes: 7000,
    plataformas: ['iFood', 'Particular'],
    manutencao: [{ item: 'Óleo e filtro', preco: 50, duracaoKm: 1000 }],
    fixos: [{ item: 'DAS-MEI', valorMensal: 86.05 }],
  },
  dias: [diaOk('a', '2026-10-02'), diaOk('b', '2026-10-01'), { id: 'c', data: '2026-10-03', aberto: true, odometroInicial: 5 }],
  meses: { '2026-09': { fechado: true, fechadoEm: { seconds: 3 }, checklist: { dasPago: true }, observacao: 'ok' } },
});

// Aplica uma alteração em uma cópia do backup e confere que ele passa a ser recusado
const recusa = (altera, mensagem) => {
  const b = backupOk();
  altera(b);
  const r = validarBackup(b);
  assert.equal(r.ok, false, mensagem);
};

test('backup válido é aceito e resumido', () => {
  const r = validarBackup(backupOk());
  assert.equal(r.ok, true);
  assert.deepEqual(r.resumo, { dias: 2, abertos: 1, meses: 1, de: '2026-10-01', ate: '2026-10-02' });
});

test('backup baixado antes, com o nome antigo do app, continua válido', () => {
  const b = backupOk();
  b.app = 'LucroJusto';
  assert.equal(validarBackup(b).ok, true);
});

test('backup antigo sem "meses" e sem "contasMes" continua válido', () => {
  const b = backupOk();
  delete b.meses;
  delete b.config.contasMes;
  assert.equal(validarBackup(b).ok, true);
});

test('arquivos que não são backup ou estão quebrados são recusados', () => {
  assert.equal(validarBackup(null).ok, false);
  assert.equal(validarBackup({ app: 'Outro' }).ok, false);
  assert.equal(validarBackup({ ...backupOk(), versao: 2 }).ok, false);
  assert.equal(validarBackup({ ...backupOk(), config: { meta: 'x' } }).ok, false);
  recusa((b) => (b.dias[0].data = '02/10/2026'), 'data fora do padrão');
  recusa((b) => (b.dias[0].id = 'a/b'), 'barra mudaria o caminho no banco');
  recusa((b) => (b.dias[0].odometroFinal = 50), 'odômetro final menor');
  recusa((b) => (b.meses = { outubro: {} }), 'mês fora do padrão');
});

test('códigos de dia que o Firestore não aceita são recusados', () => {
  recusa((b) => (b.dias[0].id = '..'), 'ponto ponto');
  recusa((b) => (b.dias[0].id = '.'), 'ponto');
  recusa((b) => (b.dias[0].id = '__reservado__'), 'reservado');
  recusa((b) => (b.dias[0].id = ''), 'vazio');
});

test('dia fechado incompleto ou com valores fora do tipo é recusado', () => {
  recusa((b) => delete b.dias[0].calculados.faturamento, 'sem faturamento');
  recusa((b) => (b.dias[0].calculados.status = 'azul'), 'status inexistente');
  recusa((b) => delete b.dias[0].calculados.lucroPorHora, 'sem lucroPorHora');
  recusa((b) => delete b.dias[0].snapshot.kmPorLitro, 'snapshot sem kmPorLitro');
  recusa((b) => (b.dias[0].plataformas = [{ nome: 'iFood', valor: '120' }]), 'valor como texto');
  recusa((b) => (b.dias[0].despesas = [{ categoria: 'Comida' }]), 'despesa sem valor');
  recusa((b) => (b.dias[0].horas = 'oito'), 'horas como texto');
});

test('lucroPorHora e ganhoPorCorrida podem ser null (dia sem horas e sem corridas)', () => {
  const b = backupOk();
  b.dias[0].horas = null;
  b.dias[0].calculados.lucroPorHora = null;
  b.dias[0].calculados.ganhoPorCorrida = null;
  assert.equal(validarBackup(b).ok, true);
});

test('ajustes fora do tipo ou fora do normal são recusados', () => {
  recusa((b) => (b.config.kmPorLitro = 0), 'km por litro zero');
  recusa((b) => (b.config.diasPorMes = 0), 'zero dias por mês');
  recusa((b) => (b.config.contasMes = 'muito'), 'contasMes como texto');
  recusa((b) => (b.config.manutencao = [{ item: 'Pneu', preco: '250', duracaoKm: 10000 }]), 'preço como texto');
  recusa((b) => (b.config.fixos = [{ item: 'DAS', valorMensal: null }]), 'fixo sem valor');
  recusa((b) => (b.config.plataformas = ['iFood', 42]), 'plataforma que não é texto');
  recusa((b) => (b.config.plataformas = 'iFood'), 'lista que não é lista');
});

test('meses com campos fora do tipo são recusados', () => {
  recusa((b) => (b.meses['2026-09'].fechado = 'sim'), 'fechado como texto');
  recusa((b) => (b.meses['2026-09'].observacao = 5), 'observação como número');
  recusa((b) => (b.meses['2026-09'].checklist = 'x'), 'checklist como texto');
});

test('preparar a restauração ignora dia aberto e tira código e carimbos', () => {
  const p = prepararRestauracao(backupOk());
  assert.deepEqual(p.dias.map((d) => d.id), ['a', 'b']);
  assert.equal('id' in p.dias[0].campos, false);
  assert.equal('criadoEm' in p.dias[0].campos, false);
  assert.equal('fechadoEm' in p.dias[0].campos, false);
  assert.equal(p.dias[0].campos.data, '2026-10-02');
  assert.deepEqual(p.meses, [{ ym: '2026-09', campos: { fechado: true, checklist: { dasPago: true }, observacao: 'ok' } }]);
  assert.equal(p.config.meta, 150);
});
