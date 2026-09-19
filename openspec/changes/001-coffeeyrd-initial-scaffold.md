# Mudança 001: Scaffold Inicial e Especificação do CoffeeYrd

## Contexto
Criação do CoffeeYrd como a quarta ferramenta do Yrd Agile Toolkit, dedicada à facilitação de reuniões estilo Lean Coffee em tempo real.

## Alterações Realizadas
1. **Estrutura de Repositório**:
   - Criado diretório `D:\Projetos\coffeeyrd` com `.gitignore`, `AGENTS.md`, `backend` (Rust/Axum) e `frontend` (React/Vite/TS).
2. **Especificação OpenSpec**:
   - `openspec/specs/fsm-workflow/spec.md`: FSM em 4 fases (`IDEATION`, `VOTING`, `DISCUSSION`, `COMPLETED`).
   - `openspec/specs/roman-voting/spec.md`: Regras da Votação Romana (+2m, Próximo, Neutro).
3. **Dependências Configuradas**:
   - Backend com Axum, Tokio, WebSockets e SQLite embarcado.
   - Frontend com React 19, Lucide React e i18next.
