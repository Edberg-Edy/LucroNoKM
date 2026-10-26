# LucroNoKM

Controle de ganhos, gastos e lucro para motoboy. Feche o dia em menos de um minuto e descubra se ele realmente valeu a pena.

**Status:** em desenvolvimento. O protótipo funcional está pronto (dados só no aparelho). A versão com login e dados na nuvem (Firebase) está sendo construída por etapas. Veja o [roadmap](#roadmap) e o [PROJETO_STATUS.md](PROJETO_STATUS.md).

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
| App instalável (PWA) | ❌ | ⏳ |

## Regras de cálculo

| Item | Fórmula |
|---|---|
| Manutenção por km | soma de (preço da peça ÷ duração em km), arredondada para 3 casas |
| Km do dia | odômetro final − odômetro inicial |
| Faturamento | soma dos ganhos das plataformas |
| Combustível | km ÷ km por litro × preço do litro (calculado, não lançado) |
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

- **Hoje:** abrir o dia, despesas, fechar o dia e resultado.
- **Histórico:** semana (segunda a domingo) com gráfico de lucro (cores do farol) e gráfico de gastos (cinza neutro), valores em R$ acima de cada coluna, resumo, ranking por plataforma, lista de dias e limite do MEI. Alternador Semana/Mês, com fechamento mensal e checklist do DAS.
- **Ajustes:** parâmetros da moto, lista de manutenção, custos fixos, plataformas e backup.

## Stack

- HTML, CSS e JavaScript puros (módulos ES), sem Vite e sem etapa de build
- Firebase Authentication (login com Google) e Firestore (com persistência offline)
- PWA (manifest + service worker)
- Firebase carregado por CDN (sem instalar nada com npm)
- Hospedagem: Firebase Hosting ou GitHub Pages

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
│   ├── SPEC.md                     # especificação técnica completa
│   ├── PASSO_A_PASSO.md            # etapas de construção
│   └── referencia/motocaixa.html   # protótipo funcional de referência
├── firestore.rules
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
| Combustível calculado (km ÷ km/l × litro) | Dispensa lançar cada abastecimento e evita contar o gasto duas vezes |
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
- [x] Etapa 13: combustível, custos fixos, lembrete do DAS e sugestões de odômetro

Detalhes de cada etapa em [docs/referencia/PASSO_A_PASSO.md](docs/referencia/PASSO_A_PASSO.md).

## Fluxo de trabalho no Git

- Uma branch por etapa (`etapa-N-nome`), criada a partir da `main`.
- Commits pequenos, no padrão `feat:`, `fix:`, `docs:`, `test:`.
- Cada etapa fechada recebe uma tag (`v0.N`) e o `PROJETO_STATUS.md` é atualizado.

## Autor

Edy