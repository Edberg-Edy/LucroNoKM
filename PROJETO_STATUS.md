# LucroNoKM: status do projeto

Atualizado a cada etapa fechada. Contexto completo em [README.md](README.md) e [docs/referencia/SPEC.md](docs/referencia/SPEC.md).

## Fluxo de trabalho

1. Os arquivos de cada etapa chegam **completos** (nunca parciais).
2. Cole no VSCode, rode com o Live Server e confira a lista de testes da etapa.
3. Após aprovação, faça o commit, o merge na `main` e a tag.
4. Só então começa a etapa seguinte.

## Etapas

| Etapa | Descrição | Situação |
|---|---|---|
| 1 | Base com abas e tema | ✅ v0.1 |
| 2 | Login com Google | ✅ v0.2 |
| 3 | Regras do Firestore e Ajustes | ✅ v0.3 |
| 4 | Cálculos com testes | ✅ v0.4 |
| 5 | Abrir o dia e despesas | ✅ v0.5 |
| 6 | Fechar o dia e resultado | ✅ v0.6 |
| 7 | Histórico semanal | ✅ v0.7 |
| 8 | Editar, excluir, limite do MEI e backup | ✅ v0.8 |
| 9 | Fechamento mensal | ✅ |
| 10 | PWA, offline e deploy (GitHub Pages) | ✅ |
| 11 | Ajustes | ✅ |
| 12 | Robustez: números com ponto de milhar, backup mais rigoroso, testes no GitHub Actions | ✅ v0.12 |
| 13 | Combustível (abastecimento no fechamento do dia, consumo real, combustível da semana e do mês, aviso de queda de consumo), custos fixos, lembrete do DAS, sugestões de odômetro e validação | ✅ v0.13 e v0.13.1 |
| 14 | Indicador de sincronização (sem sinal, enviando, tudo salvo) | ✅ v0.14 |
| 15 | Alerta de 80% do limite do MEI e planilha CSV do mês | ✅ v0.15 |
| 16 | Visão do ano e planilha CSV do ano | ✅ v0.16 |
| — | Logo ao lado do nome na barra superior (computador) e README reescrito | ✅ |

Estado atual: **151 testes** passando (`npm test`), service worker `lucronokm-v15`.

## Decisões recentes

- O app se chama **LucroNoKM** (o protótipo se chamava MotoCaixa).
- Site estático sem Vite: HTML, CSS e JavaScript puros, Firebase por CDN.
- Sem Copilot no fluxo: o código vem completo, é testado e commitado por etapa.
- Firestore na região São Paulo (`southamerica-east1`). As regras foram publicadas à mão no console; `firestore.rules` guarda a cópia.
- Ganho por corrida considera só as plataformas que informaram o número de corridas.
- Editar um dia reabre o dia e mantém a fotografia de parâmetros dele (mudar o litro depois não altera o passado).
- Testes dos cálculos com `npm test` (executor nativo do Node, sem bibliotecas).
- Combustível: o lucro do dia usa o valor estimado (km ÷ km/l × litro). O abastecimento informado em "Abasteci hoje" (sempre tanque cheio, odômetro = odômetro final do dia) serve para medir o consumo real e comparar o gasto pago com o estimado. Dia fechado guarda os parâmetros; "Abasteci hoje" fica no documento `abastecimentos/dia-{id}`.
- Segurança do Firebase conferida em outubro de 2026: chave de API restrita aos sites `edberg-edy.github.io`, `localhost:5500` e `lucrojusto-2fc5f.firebaseapp.com`; domínios autorizados no Authentication; regras do Firestore por usuário.
- O projeto do Firebase/Google Cloud continua com o nome antigo (LucroJusto, ID `lucrojusto-2fc5f`). O ID não pode ser mudado e o nome só aparece na janela de login do Google; decidido deixar como está porque não compensa o trabalho.
- Gravação sem sinal: o app não trava; o Firestore guarda no aparelho e a faixa do topo (indicador de sincronização) mostra "sem sinal", "enviando" ou "tudo salvo". Alterações pendentes de antes de abrir o app também entram na contagem.
- Alerta do MEI: aparece no Histórico a partir de 80% do limite anual, com projeção do ano (faturado ÷ mês atual × 12, só a partir de fevereiro). Conta só o que foi lançado no app.
- Planilha CSV: separador `;`, vírgula decimal e BOM para abrir direto no Excel em português; células que começam com `=`, `+`, `-` ou `@` são protegidas contra fórmula.
- Fechar o mês só é possível quando ele terminou (a partir do último dia). Mês fechado trava a edição e a exclusão dos dias e não aceita dias novos; o checklist (DAS, reserva) continua editável porque o DAS vence no dia 20 do mês seguinte.

## Como publicar

1. Na branch da etapa: aumentar o número `VERSAO` em `sw.js` (o celular só baixa a versão nova se ele mudar) e rodar `npm test` (tudo verde).
2. Commit na branch da etapa.
3. `git switch main` e `git merge etapa-N-nome`.
4. Criar a tag: `git tag vX.Y`.
5. `git push origin main --tags`. O GitHub Pages publica sozinho em cerca de 1 minuto.
6. Só se as regras mudarem: `npx firebase deploy --only firestore:rules`.
7. No navegador e no celular, recarregar duas vezes para o service worker baixar a versão nova (se ficar preso na versão antiga: F12 → Application → Service Workers → Unregister e Clear site data).

Mudanças só de texto (README, status) não precisam de teste nem de `VERSAO`.

## Próximo passo

Usar o app por 2 ou 3 semanas e anotar o que incomoda antes de abrir a etapa 17.

## Pendências e ideias

- Possível retorno do orçamento por rota no futuro.
- Gráfico de combustível (km/l por semana), quando houver 5 ou 6 abastecimentos de tanque cheio.
- Testes das telas `hoje`, `ajustes`, `historico`, `login`, `resultado` e `graficos` (hoje só a lógica e o HTML de algumas visões têm teste).
- Testar o login em popup com o app instalado no celular.
