# Change: 007 - Collaborative Shared Notes and Auto-Save

## 1. Contexto e Motivação
A área de "Anotações & Combinados" do tópico ativo na fase `DISCUSSION` tem como propósito central o registro colaborativo de decisões, combinados e action items do time. Anteriormente, a mutação via WebSocket (`UPDATE_TOPIC_NOTES`) bloqueava usuários participantes sem token de facilitador, e a interface exigia salvamento manual sem auto-save ou sincronização reativa entre clientes conectados.

## 2. Modificações Realizadas

### Backend (Rust / Axum / SQLite)
- **Permissão Colaborativa**:
  - Removido o bloqueio restrito de `is_facilitator` em `ClientMessage::UpdateTopicNotes`.
  - Facilitadores e participantes podem agora registrar anotações e combinados em tempo real durante a discussão do tópico.
  - Sanitização de tamanho máximo com clamp em 20.000 caracteres para proteção de armazenamento.
- **Escopo no Banco**:
  - `db::update_topic_notes(conn, session_id, topic_id, notes)` vincula explicitamente a query a `session_id`.

### Frontend (React / TypeScript / i18n)
- **Sincronização em Tempo Real Reativa**:
  - `useEffect` aprimorado para sincronizar `activeTopic.notes` vindos do WebSocket sempre que o tópico ativo for atualizado por outro membro (sem sobrescrever digitações ativas locais).
- **Auto-Save Inteligente com Debounce**:
  - Debounce de 900ms para salvar automaticamente notas sem necessidade de clique manual.
  - Indicadores de status visuais: `Salvo ✓`, `Salvando...` e `Salvar Notas` (quando modificado).
  - Atalho de teclado `Ctrl + Enter` / `Cmd + Enter` e evento `onBlur` para salvamento imediato.
  - Salvamento imediato garantido ao avançar de tópico via `handleFinishAndNext`.
- **Internacionalização**:
  - Novas chaves em `pt.ts` e `en.ts` para títulos, hints e estados de salvamento.

## 3. Validação
- Teste automatizado de ciclo de vida (`scratch/test_full_notes_lifecycle.mjs`):
  - Validado envio por participante comum, sincronização entre múltiplos clientes via WebSocket, persistência no banco SQLite e inclusão nas atas Markdown (`/export`).
