// Cartão de boas-vindas da aba Hoje: aparece só para quem ainda não lançou nenhum dia e não o dispensou.
// mostrarBoasVindas é pura (testada em boasvindas.test.js); o resto cuida do que fica guardado no aparelho.
const CHAVE = 'lucronokm.boasVindas';

export const mostrarBoasVindas = ({ temDias, diaAberto, dispensado }) => !temDias && !diaAberto && !dispensado;

export function boasVindasDispensado() {
  try {
    return localStorage.getItem(CHAVE) === '1';
  } catch (e) {
    return false;
  }
}

export function dispensarBoasVindas() {
  try {
    localStorage.setItem(CHAVE, '1');
  } catch (e) {
    // sem localStorage: o cartão volta na próxima visita, sem problema
  }
}

export function htmlBoasVindas() {
  return `
    <section class="cartao estreito" aria-labelledby="tituloBoasVindas">
      <h2 id="tituloBoasVindas">Bem-vindo ao LucroNoKM</h2>
      <p class="suave">Em poucos passos você vê quanto sobra de verdade em cada dia de trabalho:</p>
      <ol class="passos">
        <li><b>Ajustes:</b> informe sua meta de lucro, o km por litro da moto, o preço do litro e seus custos fixos.</li>
        <li><b>Ao sair para trabalhar:</b> abra o dia com o odômetro da moto.</li>
        <li><b>Ao abastecer:</b> registre o abastecimento no cartão que aparece no dia aberto.</li>
        <li><b>No fim do dia:</b> informe o odômetro final e quanto ganhou em cada plataforma. O app mostra o lucro e quanto guardar.</li>
      </ol>
      <p class="suave">Seus dados ficam só na sua conta. <a href="privacidade.html" target="_blank" rel="noopener">Política de privacidade</a></p>
      <button type="button" class="botao" data-acao="irAjustes">Configurar meus ajustes</button>
      <button type="button" class="botao secundario" data-acao="dispensarBoasVindas">Entendi, começar</button>
    </section>`;
}
