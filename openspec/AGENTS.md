# Diretrizes para Agentes de IA (CoffeeYrd)

Este projeto segue a metodologia **OpenSpec (Spec-Driven Development)**.
Como um agente atuando neste repositório, você deve seguir rigorosamente estas diretrizes:

## Arquitetura Base
- **Backend:** Rust (Axum, Tokio, WebSockets, SQLite). Alta performance, persistência leve e event broker em memória via canais Tokio.
- **Frontend:** React + Vite + TypeScript + CSS Vanilla.
- **Identidade Visual:** Design System Yrd Agile Toolkit (Dark/Light, Glassmorphism, paleta âmbar/café `#f59e0b`).
- **Navegação:** Menu bar de 2 níveis padronizado (`.app-header` e `.session-sub-header`).
- **Internacionalização (i18n):** Suporte PT e EN.
- **MCP Server:** Suporte nativo via `POST /mcp` para integração com agentes de IA.

## Regras de Modificação
1. Toda nova funcionalidade deve ser precedida por uma especificação na pasta `openspec/specs/`.
2. Qualquer mudança arquitetural deve ser documentada em `openspec/changes/`.
3. FSM estrita: `IDEATION` -> `VOTING` -> `DISCUSSION` -> `COMPLETED`.
