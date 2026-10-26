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
| 10 | PWA, offline e deploy (Firebase Hosting) | ✅ |
| 11 | Ajustes (branch etapa-11-ajustes) | ✅ |
| 12 | Robustez: números com ponto de milhar, backup mais rigoroso, testes no GitHub Actions | ✅ v0.12 |
| 13 | Combustível (abastecimentos e consumo), custos fixos, lembrete do DAS, sugestões de odômetro e validação | ✅ v0.13 |

## Decisões recentes

- O app se chama **LucroNoKM** (o protótipo se chamava MotoCaixa).
- Site estático sem Vite: HTML, CSS e JavaScript puros, Firebase por CDN.
- Sem Copilot no fluxo: o código vem completo, é testado e commitado por etapa.
- Firestore na região São Paulo (`southamerica-east1`). As regras foram publicadas à mão no console; `firestore.rules` guarda a cópia.
- Ganho por corrida considera só as plataformas que informaram o número de corridas.
- Editar um dia reabre o dia e mantém a fotografia de parâmetros dele (mudar o litro depois não altera o passado).
- Testes dos cálculos com `npm test` (executor nativo do Node, sem bibliotecas).
- Fechar o mês só é possível quando ele terminou (a partir do último dia). Mês fechado trava a edição e a exclusão dos dias e não aceita dias novos; o checklist (DAS, reserva) continua editável porque o DAS vence no dia 20 do mês seguinte.

## Como publicar

1. `npm test` (tudo verde) e commit na branch da etapa, PR e merge na `main`.
2. Aumentar o número `VERSAO` em `sw.js` (o celular só baixa a versão nova se ele mudar).
3. `git switch main`, `git pull` e `npx firebase deploy --only hosting`.
4. Regras do Firestore: `npx firebase deploy --only firestore:rules`.
5. Criar a tag da etapa: `git tag vX.Y` e `git push origin vX.Y`.

## Próximo passo

Definir a etapa 14. Antes, aplicar os ajustes da auditoria (ver Pendências).

## Pendências e ideias

- Possível retorno do orçamento por rota no futuro.
- Testes das telas `hoje`, `ajustes`, `historico`, `login`, `resultado` e `graficos` (hoje só a lógica tem teste).
- Cabeçalhos de segurança (Content-Security-Policy) no Hosting e restrição da chave de API do Firebase por domínio.
- Deploy automático pelo GitHub Actions (hoje é manual).
