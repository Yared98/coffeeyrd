# Especificação: Modo Termômetro (Thermometer Voting)

## 1. Conceito
Alternativa à votação priorizada (dot-voting). Em vez de distribuir votos, cada participante posiciona,
em cada tópico, o quanto **concorda ou discorda** dele numa régua de 0 a 100%. A pauta da fase
`DISCUSSION` passa a ser ordenada pelos tópicos de **maior divergência**: é onde a conversa rende mais.

O modo é escolhido pelo facilitador na criação da sessão e não muda depois. A FSM não muda:
`IDEATION` -> `VOTING` -> `DISCUSSION` -> `COMPLETED`. No modo termômetro, a fase `VOTING` é a rodada do termômetro.

## 2. Configuração da sessão
| Campo | Tipo | Padrão | Observação |
|---|---|---|---|
| `voting_mode` | `"PRIORITY"` \| `"THERMOMETER"` | `"PRIORITY"` | Valor desconhecido vira `PRIORITY`. |
| `thermometer_anonymous` | bool | `true` | Só tem efeito no modo termômetro. |

- `POST /api/sessions` aceita os dois campos (opcionais). `Session` (snapshot e `GET /api/sessions/{id}`) os devolve.
- Banco: colunas `sessions.voting_mode TEXT NOT NULL DEFAULT 'PRIORITY'` e
  `sessions.thermometer_anonymous INTEGER NOT NULL DEFAULT 1`. Bancos existentes são migrados no startup
  (`ALTER TABLE ... ADD COLUMN` quando a coluna não existe, verificado por `PRAGMA table_info`).

## 3. Régua e zonas
| Faixa | Zona (pt) | Zona (en) |
|---|---|---|
| 0–20 | Discordo totalmente | Strongly disagree |
| 20–40 | Discordo | Disagree |
| 40–60 | Neutro / Depende | Neutral / It depends |
| 60–80 | Concordo | Agree |
| 80–100 | Concordo plenamente | Strongly agree |

## 4. Votos
- Tabela `thermometer_votes(session_id, topic_id, voter_hash, voter_name, value INTEGER 0..100, updated_at)`,
  chave primária `(session_id, topic_id, voter_hash)`: um voto por pessoa por tópico, regravável.
- `SET_THERMOMETER { topic_id, value, voter_name }` (WebSocket): grava ou atualiza o voto do próprio `voter_hash`.
  - Aceito somente se `voting_mode = THERMOMETER`, fase `VOTING` e o tópico pertence à sessão; senão é ignorado.
  - `value` é limitado a 0..=100. `voter_name` é aparado, cortado em 60 caracteres; vazio vira `Anônimo`.
- `CLEAR_THERMOMETER { topic_id }`: remove o voto do próprio `voter_hash`, nas mesmas condições.
- `TOGGLE_VOTE` é ignorado em sessões `THERMOMETER`.
- Apagar um tópico apaga seus votos de termômetro. Na mescla, os votos de termômetro do tópico de origem
  são descartados (não são transferidos nem restaurados no desfazer): opiniões sobre textos diferentes não se somam.
- O cliente envia `SET_THERMOMETER` ao soltar o marcador e, durante o arraste, no máximo a cada 250 ms.

## 5. Agregados por tópico (públicos)
Cada `Topic` ganha:
- `thermo_count`: número de votos.
- `thermo_avg`: média (0–100, 1 casa decimal) ou `null` sem votos.
- `thermo_spread`: desvio padrão populacional (1 casa decimal) ou `null` sem votos. É a **divergência**.

Rótulo na UI (badge e tela do termômetro), pela divergência e, quando ela é baixa, pela média:
| Divergência | Média | Rótulo | Cor |
|---|---|---|---|
| `>= 30` | qualquer | Alta divergência | âmbar |
| `15–30` | qualquer | Divergência moderada | âmbar |
| `< 15` | `>= 60` | Consenso: concordam | verde |
| `< 15` | `<= 40` | Consenso: discordam | vermelho |
| `< 15` | `40–60` | Todos neutros / indefinido | violeta |

"Todos neutros" não é consenso sobre o tema: costuma indicar falta de contexto ou tema mal formulado,
por isso tem cor própria. A ordem da pauta não muda (continua por divergência). Regra única em
`frontend/src/utils/thermometer.ts`.

Ordenação de `get_topics` (vale para os dois modos; no modo priorizado os campos do termômetro são zero):
`vote_count DESC, variância do termômetro DESC, thermo_count DESC, created_at ASC`.
Ao entrar em `DISCUSSION`, o primeiro tópico dessa ordem vai para `DISCUSSING` (comportamento já existente).

## 6. Posições individuais e privacidade
O snapshot ganha:
- `thermometer_positions: { [topic_id]: { value: number, name: string | null }[] }`
  - **Anônimo**: `name` sempre `null` e a lista vem ordenada por `value`, para a ordem não revelar quem votou.
  - **Identificado**: `name` é o `voter_name` informado; ordenada por `updated_at`.
- `user_thermometer: { [topic_id]: number }`: os votos do próprio usuário (personalizado por conexão,
  como `user_voted_topic_ids`).
- `voter_hash` e `facilitator_token` **nunca** aparecem em broadcast.
- O anonimato é aplicado no servidor; o cliente não recebe nomes em sessões anônimas.

## 7. Interface
- **Home / criar sessão**: seletor "Modo de votação" (Priorizada | Termômetro). No termômetro aparece
  "Votos anônimos" (marcado por padrão) e some o campo de votos por pessoa.
- **Header**: a fase 2 aparece como "Termômetro" nas sessões em modo termômetro.
- **Fase VOTING (termômetro)**: um tópico por vez ("Tópico X de N", setas e pontinhos de navegação, pontinho
  preenchido onde o usuário já votou), título e descrição em Markdown, régua com as 5 zonas coloridas,
  marcador próprio arrastável e acessível por teclado, marcadores dos demais (avatar com iniciais e nome no modo
  identificado; pontos sem nome no anônimo), média, divergência, número de votos, "Remover meu voto" e
  progresso "Você votou em X de N tópicos".
- **DISCUSSION e COMPLETED**: no modo termômetro, o lugar da contagem de votos mostra a média e o rótulo de divergência.

### 7.1 Extremos no tópico em discussão ("Comece ouvindo as pontas")
Para abrir o debate pelas premissas diferentes (como no Planning Poker), o card "Discutindo Agora" mostra quem
votou no menor e no maior valor da régua: "Mais discorda: Ana 10%" e "Mais concorda: Carlos 92%".
- Só em sessões **identificadas** (nas anônimas o servidor não envia nomes; nada aparece).
- Só com pelo menos 2 votos nomeados, divergência `>= 15` (a partir de "moderada") e menor valor diferente do maior.
  Com consenso, não há extremos a destacar.
- Empates mostram todos os nomes no mesmo valor (até 2 e "+N" para o restante; lista completa no `title`).
- Calculado no cliente a partir de `thermometer_positions`; não há mudança de backend nem de protocolo.
- O texto é um convite ("Comece ouvindo as pontas"), não um rótulo sobre as pessoas.
- **Exportação Markdown e MCP (`summarize_meeting`)**: no modo termômetro, a linha de votos vira
  `Termômetro: média X% · divergência Y (N votos)`.
