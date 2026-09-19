# Change: 003 - Reversible Topic Merges (Undo Merge)

## Justificativa
Durante reuniões Lean Coffee, facilitadores e participantes frequentemente agrupam tópicos por similaridade através de arrastar e soltar (drag & drop). Contudo, equívocos operacionais (soltar o card sobre o tópico errado, puxar o item incorreto ou mudar de ideia durante o debate) tornavam a exclusão anterior irreversível.
Esta mudança introduz resiliência operacional através da tabela `topic_merges`, permitindo que qualquer mescla seja revertida de forma atômica, restaurando o tópico original, seus autores, notas, status e seus respectivos votos.

## Alterações de Especificação
1. **FSM Workflow (`specs/fsm-workflow/spec.md`)**:
   - Tópicos mesclados mantêm histórico atômico de rollback.
   - O Facilitador pode reverter mesclas através da ação `UNDO_MERGE`:
     - Via notificação imediata (toast pós-drop).
     - Diretamente no card mesclado durante as fases de `IDEATION` e `VOTING`.
2. **WebSocket & Protocolo (`backend/src/state.rs`)**:
   - Nova ação de cliente: `UNDO_MERGE { target_topic_id: Option<String> }`.
   - Reversão restrita ao facilitador (`is_facilitator`).
3. **Persistência (`backend/src/db.rs`)**:
   - Tabela `topic_merges` para rastreamento de snapshots de mesclas e estorno de votos.
