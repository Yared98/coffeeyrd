<div align="center">

# ☕ CoffeeYrd

**Reuniões Sem Pauta com Foco Radical e Timeboxes Inteligentes**

*Facilitação de reuniões estilo Lean Coffee em tempo real com proposição de tópicos, votação por cota (dot-voting), mesa de discussão com timer e votação romana interativa.*

[![Rust](https://img.shields.io/badge/Rust-1.80+-orange.svg?logo=rust)](https://www.rust-lang.org)
[![Axum](https://img.shields.io/badge/Axum-0.8-blue.svg)](https://github.com/tokio-rs/axum)
[![React](https://img.shields.io/badge/React-19-61dafb.svg?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6+-3178c6.svg?logo=typescript)](https://www.typescriptlang.org)
[![Design System](https://img.shields.io/badge/Design_System-Agile_Cadence-f59e0b.svg)](https://github.com/Yared98)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

---

## 🎯 Visão Geral

O **CoffeeYrd** foi projetado para acabar com reuniões longas, sem pauta e improdutivas. Utilizando a consagrada metodologia **Lean Coffee**, os participantes criam a pauta colaborativamente e o tempo de debate é rigorosamente controlado por consenso coletivo.

### Ciclo de Facilitação (FSM)
1. **📝 Proposição (Ideation)**: Membros adicionam tópicos e dúvidas que gostariam de debater.
2. **🗳️ Votação (Dot-Voting)**: Cada membro distribui sua cota de votos nos temas prioritários.
3. **☕ Mesa de Café (Discussion)**:
   - *A Discutir*: Fila priorizada por votos.
   - *Discutindo Agora*: Tópico central com **Timer de 5 minutos** e bloco de notas compartilhado.
   - *Discutido*: Histórico dos assuntos finalizados.
   - **Votação Romana (Roman Voting)**: Ao soar o alarme, prompt de 10s:
     - 👍 Continuar (+2m)
     - 👎 Próximo tópico
     - 👉 Neutro
4. **📋 Conclusão & Ata**: Resumo em Markdown para exportação rápida no Slack, Discord ou PR.

---

## 🏗️ Arquitetura

O projeto adota **Spec-Driven Development** através do diretório `openspec/`:

```
coffeeyrd/
├── backend/                  # Servidor Rust Axum + WebSockets
│   ├── src/
│   │   ├── main.rs           # Rotas REST e WebSocket broadcast
│   │   ├── db.rs             # SQLite embarcado
│   │   ├── models.rs         # Modelos e eventos de FSM
│   │   └── mcp.rs            # Servidor MCP nativo
│   └── Cargo.toml
├── frontend/                 # Interface React 19 + Vite + TypeScript
│   ├── src/
│   │   ├── components/       # Componentes (Header, Voting, RomanVote, etc.)
│   │   ├── i18n/             # Internacionalização PT e EN
│   │   └── index.css         # Design tokens Yrd (Dark/Light)
│   └── package.json
└── openspec/                 # Especificações vivas do produto
```

---

## 🚀 Como Executar

### Pré-requisitos
- Rust 1.80+ (`cargo`)
- Node.js 20+ (`npm`)

### Desenvolvimento Local

```bash
# 1. Backend (porta 8082)
cd backend
cargo run

# 2. Frontend (porta 5173 / 3001)
cd frontend
npm run dev
```

---

## 🌐 Yrd Agile Toolkit

O **CoffeeYrd** integra a suíte ágil de ferramentas abertas:
- [RetroYrd](https://github.com/Yared98/retroyrd): Retrospectivas ágeis com segurança psicológica.
- [DailyYrd](https://github.com/Yared98/dailyyrd): Standups inteligentes com roleta e radar de impedimentos.
- [PlanningYrd](https://github.com/Yared98/planningyrd): Planning Poker em tempo real.
- **CoffeeYrd**: Reuniões sem pauta com timeboxes e consenso dinâmico.
