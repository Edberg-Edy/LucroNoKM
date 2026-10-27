# LucroNoKM

[![Testes](https://github.com/Edberg-Edy/LucroNoKM/actions/workflows/testes.yml/badge.svg)](https://github.com/Edberg-Edy/LucroNoKM/actions/workflows/testes.yml)

Controle de ganhos, gastos e lucro para motoboy. Feche o dia em menos de um minuto e descubra se ele realmente valeu a pena.

**App:** https://edberg-edy.github.io/LucroNoKM/ · instalável no celular (PWA), com login Google, dados na nuvem e modo offline.

---

## O problema

Quem trabalha com entregas por plataformas (iFood, Rappi, 99, Loggi) e corridas particulares recebe dinheiro de vários lugares e quase nunca sabe o **lucro real**: combustível, manutenção da moto, imposto e internet pesam no resultado, mas ficam fora da conta.

O LucroNoKM responde três perguntas todos os dias:

1. Eu ganhei dinheiro de verdade hoje?
2. Quanto preciso **guardar** para a moto e para os custos fixos?
3. Quanto sobra **livre para gastar**?

## Como funciona

A ideia central é o **fechamento de caixa**. Em vez de anotar corrida por corrida, o motoboy faz três coisas:

1. **Abre o dia:** data (padrão hoje) e odômetro inicial, que o app já sugere.
2. **Lança despesas imprevistas** quando acontecem (comida, estacionamento, multa, conserto).
3. **Fecha o dia:** odômetro final, horas (opcional), ganho e corridas por plataforma e, se abasteceu, litros e valor pago.

O app calcula o resto: lucro, quanto guardar, quanto está livre e o farol do dia.

## Funcionalidades

**Dia a dia**
- Fechamento do dia com ganho e corridas por plataforma (inclui Particular)
- Lucro, ganho por km, por hora e por corrida, e farol (verde, amarelo, vermelho)
- Quadro "quanto guardar" e "livre para gastar"
- Odômetro inicial sugerido e conferido contra os dias vizinhos
- Editar e excluir dias, com confirmação no próprio app

**Combustível**
- "Abasteci hoje" no fechamento do dia
- Consumo real medido de tanque cheio a tanque cheio, com botão para usar o valor no km/l
- Gasto pago × estimado, por semana e por mês, e aviso de queda de consumo

**Histórico**
- Semana, Mês e Ano em um alternador
- Gráficos de lucro e de gastos, ranking por plataforma e lista de dias
- Fechamento mensal com checklist (DAS pago, reserva transferida) e acerto dos custos fixos
- Acompanhamento das contas do mês e visão do ano, mês a mês

**MEI e organização**
- Limite anual do MEI, com alerta a partir de 80% e projeção do ano
- Lembrete do DAS a partir do dia 17
- Planilha CSV do mês e do ano, pronta para o Excel
- Backup e restauração em arquivo (.json)

**Uso no celular**
- App instalável (PWA) que abre sem internet
- Faixa de sincronização: sem sinal, enviando ou tudo salvo

## Regras de cálculo

| Item | Fórmula |
|---|---|
| Km do dia | odômetro final − odômetro inicial |
| Faturamento | soma dos ganhos das plataformas |
| Combustível (estimado) | km ÷ km por litro × preço do litro |
| Consumo real | km entre dois tanques cheios ÷ litros abastecidos no trecho |
| Manutenção por km | soma de (preço da peça ÷ duração em km) |
| Manutenção do dia | km × manutenção por km |
| Custos fixos do dia | custos fixos mensais ÷ dias trabalhados por mês |
| **Lucro** | faturamento − combustível − manutenção − despesas − custos fixos |
| **Guardar** | manutenção do dia + custos fixos do dia |
| Livre para gastar | lucro |
| Farol | verde: lucro ≥ meta · amarelo: lucro > 0 · vermelho: lucro ≤ 0 |

Indicadores sem dado (horas ou corridas não informadas) aparecem como "—". Os valores iniciais (meta, km/l, preço do litro, dias por mês, limite do MEI) são editáveis em Ajustes.

## Tecnologia

- HTML, CSS e JavaScript puros (módulos ES), sem etapa de build
- Firebase Authentication (login com Google) e Firestore, com persistência offline
- PWA: manifest e service worker
- Hospedagem no GitHub Pages
- Testes com o executor nativo do Node (`node --test`), sem bibliotecas

## Estrutura

```
LucroNoKM/
├── index.html
├── sw.js                       # service worker (app offline)
├── manifest.webmanifest
├── css/style.css
├── assets/icons/               # ícones do app
├── js/
│   ├── app.js                  # entrada: login e abas
│   ├── config/                 # configuração do Firebase e valores padrão
│   ├── services/               # acesso ao Firestore (dias, meses, ajustes, abastecimentos)
│   └── modules/                # telas e cálculos (cada cálculo tem seu .test.js)
├── docs/referencia/            # especificação e passo a passo das etapas
├── firestore.rules             # regras de segurança
├── firebase.json               # usado só para publicar as regras
└── PROJETO_STATUS.md           # estado atual e decisões recentes
```

## Rodar localmente

1. Instale a extensão **Live Server** no VSCode.
2. Em `js/config/firebase-config.js`, coloque a configuração do seu app Web do Firebase.
3. Abra o `index.html` e clique em **Go Live**. Acesse por `http://localhost:5500` (o login com Google não funciona por `127.0.0.1`).

Rodar os testes:

```
npm test
```

## Dados e segurança

Cada usuário lê e grava apenas os dados que estão dentro da própria conta (`users/{uid}`), garantido pelas regras do Firestore em `firestore.rules`. A configuração do Firebase no front-end não é segredo; por isso a chave de API é restrita aos sites do app.

| Coleção | Conteúdo |
|---|---|
| `config` | ajustes: meta, km/l, preço do litro, manutenção, custos fixos, plataformas |
| `dias` | cada dia, com os parâmetros usados e os valores calculados |
| `meses` | fechamento mensal e checklist |
| `abastecimentos` | litros e valor pago, usados para medir o consumo real |

Cada dia fechado guarda uma fotografia dos parâmetros (km/l, preço do litro, manutenção, custos fixos). Mudar o preço do litro depois não altera dias antigos.

## Decisões do projeto

| Decisão | Motivo |
|---|---|
| Fechamento de caixa, não corrida por corrida | Evita que o motoboy abandone o app por cansaço |
| Km vem do odômetro | Mede o km real, incluindo o rodado sem corrida |
| Combustível estimado no lucro, real como conferência | O lucro do dia não depende de digitar abastecimentos, e o consumo real mostra a diferença |
| Abastecimento informado no fechamento do dia | Um único lugar para digitar, usando o odômetro final como ponto de medida |
| Manutenção por km | Transforma gastos raros em custo diário justo |
| Custos fixos rateados pelos dias trabalhados | DAS, internet e outros pesam no lucro de cada dia |
| Gravação que não trava sem sinal | O Firestore guarda no aparelho e sincroniza depois |
| Site estático, sem Vite | Menos ferramentas para manter; o Firebase entra por CDN |
| Orçamento por rota e mapas descartado | Exigia chave externa e agregava pouco ao uso diário |

## Referências fiscais (MEI 2026)

Valores consultados em outubro de 2026. Conferir sempre no Portal do Empreendedor, porque mudam com o salário mínimo.

- DAS-MEI para prestação de serviços: **R$ 86,05** por mês (R$ 81,05 de INSS + R$ 5,00 de ISS), vencimento todo dia 20.
- Limite de faturamento anual: **R$ 81.000**.
- O DAS é pago mesmo em meses sem faturamento.
- Confirmar com um contador o enquadramento da atividade de motofretista/entregador.

## Roadmap

| Etapa | Entrega |
|---|---|
| 1 a 3 | Base com abas, login com Google, regras do Firestore e Ajustes |
| 4 a 6 | Cálculos com testes, abrir e fechar o dia, resultado |
| 7 e 8 | Histórico semanal, editar, excluir, limite do MEI e backup |
| 9 e 10 | Fechamento mensal, PWA e deploy |
| 11 e 12 | Ajustes, robustez e testes no GitHub Actions |
| 13 | Combustível, custos fixos, lembrete do DAS e odômetro sugerido |
| 14 | Indicador de sincronização |
| 15 | Alerta de 80% do MEI e planilha CSV do mês |
| 16 | Visão do ano e planilha CSV do ano |

Próximas ideias: gráfico de consumo por semana e testes das telas. Detalhes em [PROJETO_STATUS.md](PROJETO_STATUS.md).

## Fluxo de trabalho

- Uma branch por etapa (`etapa-N-nome`), criada a partir da `main`.
- Commits pequenos, no padrão `feat:`, `fix:`, `docs:`, `test:`.
- Cada etapa fechada recebe uma tag (`v0.N`) e o `PROJETO_STATUS.md` é atualizado.
- Ao mudar qualquer arquivo do app, aumentar a `VERSAO` em `sw.js` (o teste `sw.test.js` confere a lista de arquivos).

## Autor

Edy
