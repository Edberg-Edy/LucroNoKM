// Funções pequenas de formatação e leitura, usadas em várias telas.

// Data de hoje no formato do campo de data (aaaa-mm-dd), pelo relógio do aparelho.
export function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// "2026-10-08" vira "08/10/2026".
export function dataBR(iso) {
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
}

// Lê um número digitado no padrão brasileiro. Se estiver vazio, inválido ou negativo, devolve null.
//   "12450" e "12.450"   -> 12450   (ponto seguido de 3 dígitos é separador de milhar)
//   "6,5" e "6.5"        -> 6.5     (vírgula ou ponto com 1 ou 2 casas é decimal)
//   "1.234,56"           -> 1234.56 (quando há os dois, o último é o decimal)
//   "R$ 12,50"           -> 12.5
//   "0.173" e "0,173"    -> 0.173   (começando em zero, o ponto é decimal)
// Dica: para decimais, prefira a vírgula. "6.199" seria lido como 6199.
export function lerNumero(texto) {
  let t = String(texto ?? '').replace(/\s/g, '').replace(/^R\$/i, '');
  if (!t) return null;

  const temVirgula = t.includes(',');
  const temPonto = t.includes('.');

  if (temVirgula && temPonto) {
    // O separador que aparece por último é o decimal; o outro é só de milhar.
    t = t.lastIndexOf(',') > t.lastIndexOf('.') ? t.replace(/\./g, '').replace(',', '.') : t.replace(/,/g, '');
  } else if (temVirgula) {
    t = t.replace(',', '.'); // com duas vírgulas sobra uma e o teste abaixo recusa
  } else if (temPonto && /^[1-9]\d{0,2}(\.\d{3})+$/.test(t)) {
    t = t.replace(/\./g, ''); // 12.450 = 12450
  }

  if (!/^\d+(\.\d+)?$/.test(t)) return null; // letras, sinal de menos, vários separadores
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

// Igual ao anterior, mas devolve 0 no lugar de null.
export const numero = (texto) => lerNumero(texto) ?? 0;

export const dinheiro = (n) =>
  'R$ ' + (Number(n) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Protege o HTML quando um texto digitado pelo usuário é colocado na tela.
export const esc = (t) =>
  String(t)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
