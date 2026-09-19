# Change: 002 - Drag & Drop Card Merging and Reopen Topics

## Justificativa
Durante reuniões Lean Coffee, é frequente participantes escreverem tópicos com ideias idênticas ou complementares. O merge direto via arrastar e soltar (drag & drop) unifica as ideias sem perder descrições, histórico de autores ou votos já computados.
Adicionalmente, na fase de Discussão, enganos operacionais ao finalizar tópicos ou puxar o card errado requerem a capacidade de reabrir ou devolver tópicos para a fila de discussão.

## Alterações de Especificação
1. **FSM Workflow (`specs/fsm-workflow/spec.md`)**:
   - Tópicos na fase de Discussão agora suportam transições bidirecionais:
     - `TO_DISCUSS` <-> `DISCUSSING`
     - `DISCUSSING` <-> `DISCUSSED`
     - `DISCUSSED` -> `TO_DISCUSS`
2. **WebSocket & Protocolo (`backend/src/state.rs`)**:
   - Nova ação de cliente: `MERGE_TOPICS { source_topic_id: String, target_topic_id: String }`.
   - `MOVE_TOPIC_STATUS` atualiza automaticamente `sessions.active_topic_id` quando um tópico é movido para ou fora de `DISCUSSING`.
