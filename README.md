# LucroNoKM

Controle de ganhos, gastos e lucro para motoboy. Feche o dia em menos de um minuto e descubra se ele realmente valeu a pena.

**Status:** em uso. App instalável (PWA) com login Google, dados na nuvem (Firestore) e modo offline, publicado no GitHub Pages (https://edberg-edy.github.io/LucroNoKM/). Veja o [roadmap](#roadmap) e o [PROJETO_STATUS.md](PROJETO_STATUS.md).

---

## Por que este projeto existe

Quem trabalha com entregas por plataformas (iFood, Rappi, 99, Loggi) e corridas particulares recebe dinheiro de vários lugares e quase nunca sabe o **lucro real**: combustível, manutenção da moto, imposto e internet pesam no resultado, mas ficam fora da conta.

O LucroNoKM responde três perguntas todos os dias:

1. Eu ganhei dinheiro de verdade hoje?
2. Quanto preciso **guardar** para a moto e para os custos fixos?
3. Quanto sobra **livre para gastar**?

## Como funciona

A ideia central é o **fechamento de caixa**. Em vez de anotar corrida por corrida (cansativo), o motoboy faz três coisas:

1. **Abre o dia:** data (padrão hoje, permite dias esquecidos) e odômetro inicial.
2. **Lança despesas imprevistas** quando acontecem (comida, estacionamento, multa, conserto).
3. **Fecha o dia:** odômetro final, horas trabalhadas (opcional) e, para cada plataforma, o ganho e o número de corridas (opcional).

O app calcula todo o resto.

## Funcionalidades

| Funcionalidade | Protótipo | Versão Firebase |
|---|:---:|:---:|
| Abrir e fechar o dia com data e odômetro | ✅ | ✅ |
| Ganho e corridas por plataforma (inclui Particular) | ✅ | ✅ |
| Despesas rápidas por categoria | ✅ | ✅ |
| Cálculo de lucro, ganho por km, por hora e por corrida | ✅ | ✅ |
| Farol do dia (verde, amarelo, vermelho) | ✅ | ✅ |
| Quadro "quanto guardar" e "livre para gastar" | ✅ | ✅ |
| Ajustes: meta, km/l, litro, manutenção por km, custos fixos, plataformas | ✅ | ✅ |
| Histórico semanal com gráfico de lucro e gráfico de gastos | ✅ | ✅ |
| Editar e excluir dias | ✅ | ✅ |
| Ranking por plataforma e limite anual do MEI | ✅ | ✅ |
| Backup dos dados em arquivo (.json) | ✅ | ✅ |
| Login e dados na nuvem, com modo offline | ❌ | ✅ |
| Fechamento mensal com checklist | ❌ | ✅ |
| App instalável (PWA) | ❌ | ✅ |
| Combustível real: "Abasteci hoje" no fechamento, consumo medido (tanque a tanque) e gasto pago × estimado | ❌ | ✅ |
| Combustível da semana (litros, R$ e R$/km) e aviso de queda de consumo | ❌ | ✅ |
| Acerto dos custos fixos do mês e lembrete do DAS (a partir do dia 17) | ❌ | ✅ |
| Odômetro inicial sugerido e conferido contra os dias vizinhos | ❌ | ✅ |
| Indicador de sincronização (sem sinal, enviando, tudo salvo) | ❌ | ✅ |
| Alerta ao chegar a 80% do limite do MEI, com projeção do ano | ❌ | ✅ |
| Visão do ano, mês a mês | ❌ | ✅ |
| Planilha CSV do mês e do ano (abre no Excel) | ❌ | ✅ |

## Regras de cálculo

| Item | Fórmula |
|---|---|
| Manutenção por km | soma de (preço da peça ÷ duração em km), arredondada para 3 casas |
| Km do dia | odômetro final − odômetro inicial |
| Faturamento | soma dos ganhos das plataformas |
| Combustível (estimado) | km ÷ km por litro × preço do litro. Entra no lucro de cada dia |
| Consumo real | km entre dois tanques cheios ÷ litros abastecidos no trecho (informado em "Abasteci hoje") |
| Manutenção do dia | km × manutenção por km |
| Custos fixos do dia | soma dos custos fixos mensais ÷ dias trabalhados por mês |
| **Lucro** | faturamento − combustível − manutenção − despesas − custos fixos |
| **Guardar** | manutenção do dia + custos fixos do dia |
| Livre para gastar | lucro |
| Ganho por km | faturamento ÷ km |
| Lucro por hora | lucro ÷ horas (sem horas, aparece "—") |
| Ganho por corrida | ganho das plataformas ÷ corridas (sem corridas, aparece "—") |
| Farol | verde: lucro ≥ meta · amarelo: lucro > 0 · vermelho: lucro ≤ 0 |

Valores padrão: meta R$ 200, 35 km/l, litro R$ 6,20, 24 dias por mês, limite MEI R$ 81.000. Tudo é editável em Ajustes.

## Telas

- **Hoje:** abrir o dia (odômetro sugerido), despesas, fechar o dia (com "Abasteci hoje" opcional) e resultado. Mostra o lembrete do DAS a partir do dia 17.
- **Histórico:** alternador Semana / Mês / Ano.
  - Semana (segunda a domingo): gráfico de lucro (cores do farol) e de gastos (cinza neutro), resumo, card de combustível (usado, litros, R$/km), ranking por plataforma, lista de dias e limite do MEI.
  - Mês: resumo, combustível pago × estimado, acerto dos custos fixos, contas do mês, fechamento mensal, checklist do DAS e planilha CSV.
  - Ano: resumo, limite do MEI, faturamento e lucro mês a mês, destaques e planilha CSV do ano.
  - Em qualquer visão, aviso quando o faturamento do ano chega a 80% do limite do MEI.
- **Ajustes:** parâmetros da moto, consumo real medido (com botão para usar no km/l), lista de manutenção, custos fixos, plataformas e backup (inclui abastecimentos).
- **Faixa no topo:** aparece sem sinal ou enquanto há alterações a enviar, e some quando tudo está salvo.

## Stack

- HTML, CSS e JavaScript puros (módulos ES), sem Vite e sem etapa de build
- Firebase Authentication (login com Google) e Firestore (com persistência offline)
- PWA (manifest + service worker)
- Firebase carregado por CDN (sem instalar nada com npm)
- Hospedagem: GitHub Pages (o `firebase.json` serve só para publicar as regras do Firestore)

## Estrutura do repositório

```
LucroNoKM/
├── index.html
├── css/style.css
├── js/
│   ├── app.js                      # entrada: login e abas
│   ├── config/                     # configuração do Firebase e valores padrão
│   ├── services/                   # acesso ao Firebase e aos dados
│   └── modules/                    # telas e cálculos
├── docs/
│   └── referencia/                 # SPEC.md (especificação), PASSO_A_PASSO.md e protótipo de referência
├── sw.js                           # service worker (app offline); sw.test.js confere a lista de arquivos
├── firestore.rules
├── firebase.json                   # usado só para publicar as regras
├── PROJETO_STATUS.md               # estado atual e decisões recentes
└── README.md
```

## Como rodar localmente

1. Instale no VSCode a extensão **Live Server** (Ritwick Dey).
2. Preencha `js/config/firebase-config.js` com a configuração do seu app Web no Firebase.
3. Abra o `index.html` e clique em **Go Live**. Acesse por `http://localhost:5500` (o login com Google não funciona por `127.0.0.1`).

A configuração do Firebase no front-end não é segredo. Quem protege os dados são as regras do Firestore (`firestore.rules`): cada usuário lê e grava apenas o que é seu.

## Decisões do projeto

| Decisão | Motivo |
|---|---|
| Fechamento de caixa no lugar de lançar corrida por corrida | Evita que o motoboy abandone o app por cansaço |
| Km vem do odômetro | Mede o km real, incluindo o km rodado sem corrida |
| Combustível estimado por km, com o real como conferência | O lucro do dia usa km ÷ km/l × litro (sem digitar nada). O abastecimento informado no fechamento mede o consumo de verdade e mostra a diferença, sem contar o gasto duas vezes |
| Abastecimento lançado no fechamento do dia | Um único lugar para digitar. O odômetro final do dia serve de ponto de medida |
| Gravação que não trava sem sinal | O Firestore guarda no aparelho e sincroniza depois; a faixa do topo mostra o que ainda não foi enviado |
| Manutenção por km (preço da peça ÷ duração) | Transforma gastos raros em custo diário justo |
| Custos fixos divididos pelos dias trabalhados | DAS, internet e outros pesam no lucro de cada dia |
| "Guardar" = manutenção + custos fixos | É o dinheiro que não deve ser gasto hoje |
| Horas e corridas opcionais | Mantém o preenchimento curto; sem dado, o indicador mostra "—" |
| Particular tratado como uma plataforma | Um único formato de preenchimento |
| Orçamento por rota e mapas descartado | Exigia chave externa, dependia de hospedagem própria e agregava pouco ao uso diário. Pode voltar no futuro |
| Site estático (HTML, CSS e JS puros), sem Vite | Menos ferramentas para aprender e manter, sem etapa de build. O Firebase entra por CDN |
| Dados no Firebase com modo offline | Não perder histórico ao trocar de aparelho e funcionar sem sinal |
| Cada dia guarda os parâmetros usados (snapshot) | Mudar o preço do litro não altera dias antigos |
| Confirmação de exclusão no próprio app | `alert` e `confirm` são bloqueados em alguns ambientes e o botão parecia não funcionar |
| Gastos em cor neutra, lucro no farol | Gasto é só controle visual. O que muda de cor é o resultado |

## Referências fiscais (MEI 2026)

Valores consultados em outubro de 2026. Conferir sempre no Portal do Empreendedor, porque mudam todo ano com o salário mínimo.

- DAS-MEI para prestação de serviços: **R$ 86,05** por mês (R$ 81,05 de INSS + R$ 5,00 de ISS), vencimento todo dia 20.
- Limite de faturamento anual: **R$ 81.000**.
- O DAS é pago mesmo em meses sem faturamento.
- Confirmar com um contador o enquadramento da atividade de motofretista/entregador.

## Histórico do protótipo

1. Abrir e fechar o dia, plataformas, despesas, cálculo de lucro, farol e histórico.
2. Lista de manutenção com custo por km e resumo do custo total por km da moto.
3. Data do lançamento, horas opcionais, corridas por plataforma, histórico semanal, editar e excluir, custos fixos e backup.
4. Particular como plataforma, quadro "guardar", gastos no histórico e correção da exclusão.
5. Gráficos separados de lucro e gastos, com valor em R$ acima das colunas.

## Roadmap

- [x] Etapa 1: base do projeto
- [x] Etapa 2: login com Google
- [x] Etapa 3: regras do Firestore e Ajustes
- [x] Etapa 4: cálculos com testes
- [x] Etapa 5: abrir o dia e despesas
- [x] Etapa 6: fechar o dia e resultado
- [x] Etapa 7: histórico semanal
- [x] Etapa 8: editar, excluir e limite do MEI
- [x] Etapa 9: fechamento mensal
- [x] Etapa 10: PWA, offline e deploy
- [x] Etapa 11: ajustes
- [x] Etapa 12: robustez e testes no GitHub Actions
- [x] Etapa 13: combustível (abastecimento no fechamento do dia, combustível da semana e do mês, aviso de queda de consumo), custos fixos, lembrete do DAS e sugestões de odômetro
- [x] Etapa 14: indicador de sincronização
- [x] Etapa 15: alerta de 80% do limite do MEI e planilha CSV do mês
- [x] Etapa 16: visão do ano e planilha CSV do ano

Detalhes de cada etapa em [docs/referencia/PASSO_A_PASSO.md](docs/referencia/PASSO_A_PASSO.md).

## Fluxo de trabalho no Git

- Uma branch por etapa (`etapa-N-nome`), criada a partir da `main`.
- Commits pequenos, no padrão `feat:`, `fix:`, `docs:`, `test:`.
- Cada etapa fechada recebe uma tag (`v0.N`) e o `PROJETO_STATUS.md` é atualizado.

## Autor

Edy