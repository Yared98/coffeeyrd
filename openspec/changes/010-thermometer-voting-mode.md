# Change: Modo Termômetro de Votação (concordo/discordo por tópico)

## Contexto & Motivação
A votação priorizada (dot-voting) diz **o que** o grupo quer discutir, mas não **onde o grupo discorda**.
Times querem medir o consenso sobre afirmações ("O tempo gasto escrevendo a spec se pagou no PR") e levar
para a mesa de café justamente os temas que dividem opiniões.

## Decisões
1. **Modo por sessão, escolhido na criação** (`voting_mode`: `PRIORITY` | `THERMOMETER`). A FSM não muda: no modo
   termômetro, a fase `VOTING` é a rodada do termômetro.
2. **Anonimato por sessão** (`thermometer_anonymous`, padrão ligado). Aplicado no servidor: em sessão anônima, os
   nomes não saem do backend e as posições chegam ordenadas por valor.
3. **Pauta por divergência**: a fila de `DISCUSSION` é ordenada pelo desvio padrão das posições (maior primeiro).
4. **Votos de termômetro não acompanham mesclas**: opiniões sobre textos diferentes não se somam; o desfazer não os restaura.

## Especificação Técnica
Ver `openspec/specs/thermometer-voting/spec.md`.
- Banco: tabela `thermometer_votes` e colunas `sessions.voting_mode` / `sessions.thermometer_anonymous`
  (migração automática no startup).
- WebSocket: `SET_THERMOMETER`, `CLEAR_THERMOMETER`; snapshot com `thermometer_positions` e `user_thermometer`;
  `Topic` com `thermo_count`, `thermo_avg`, `thermo_spread`.
- REST: `POST /api/sessions` aceita `voting_mode` e `thermometer_anonymous`.
- UI: seletor de modo na Home, `ThermometerView` na fase 2, `ThermoBadge` na discussão e no resumo; export e MCP
  mostram média e divergência.
