# Governança do Projeto CoffeeYrd (AGENTS.md)

Este projeto adota a metodologia **Spec-Driven Development** através do diretório `openspec/`.

## Regras Obrigatórias para Agentes de IA
1. **Máquina de Estados Finita (FSM)**:
   - Respeitar estritamente a progressão das fases (`IDEATION` -> `VOTING` -> `DISCUSSION` -> `COMPLETED`).
   - Na fase `DISCUSSION`, o timer do tópico e a votação romana (`Roman Voting`) regem a transição dos tópicos entre *To Discuss*, *Discussing* e *Discussed*.
2. **Privacidade & Segurança de Tokens**:
   - O `facilitator_token` e hashes de sessão nunca devem ser vazados em broadcasts públicos de WebSocket.
3. **Servidor MCP Nativo (`POST /mcp`)**:
   - Agentes de IA podem resumir tópicos, sugerir pautas e consolidar planos de ação gerando eventos propagados aos participantes em tempo real via WebSocket.
4. **Sincronização Contínua do OpenSpec**:
   - Toda alteração funcional, de endpoint, segurança ou UI deve ser refletida em `openspec/specs/` e documentada em `openspec/changes/`.
