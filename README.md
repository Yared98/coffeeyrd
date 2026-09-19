<div align="center">

# ☕ CoffeeYrd

**Reuniões Sem Pauta com Foco Radical e Timeboxes Inteligentes**

*Facilitação de reuniões estilo Lean Coffee em tempo real com proposição colaborativa de tópicos, dot-voting por cota, mesa de discussão com timer, notas compartilhadas e votação romana interativa.*

[![Rust](https://img.shields.io/badge/Rust-1.80+-orange.svg?logo=rust)](https://www.rust-lang.org)
[![Axum](https://img.shields.io/badge/Axum-0.8-blue.svg)](https://github.com/tokio-rs/axum)
[![React](https://img.shields.io/badge/React-19-61dafb.svg?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6+-3178c6.svg?logo=typescript)](https://www.typescriptlang.org)
[![Design System](https://img.shields.io/badge/Design_System-Agile_Cadence-f59e0b.svg)](https://github.com/Yared98)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**[🚀 Teste a Demonstração Online](https://coffee.yared.com.br)** • [Visão Geral](#-visão-geral) • [Funcionalidades](#-funcionalidades-principais) • [Arquitetura](#-arquitetura) • [Como Executar](#-como-executar) • [Servidor MCP](#-servidor-mcp-nativo) • [Toolkit](#-yrd-agile-toolkit)

</div>

---

## 🎯 Visão Geral

O **CoffeeYrd** foi projetado para acabar com reuniões longas, sem pauta e improdutivas. Utilizando a consagrada metodologia **Lean Coffee**, os participantes criam a pauta colaborativamente e o tempo de debate é rigorosamente controlado por consenso coletivo — sem moderador autoritário, sem tópicos monopolizados.

### Ciclo de Facilitação (FSM de 4 Fases)

```
[1. IDEATION] ➔ [2. VOTING] ➔ [3. DISCUSSION] ➔ [4. COMPLETED]
```

1. **📝 Proposição (Ideation):** Membros adicionam tópicos livremente. Suporte a Markdown na descrição.
2. **🗳️ Votação (Dot-Voting):** Cada membro distribui sua cota de votos nos temas prioritários. Sem viés de ancoragem.
3. **☕ Mesa de Café (Discussion):** Kanban de 3 colunas:
   - *A Discutir* — fila priorizada por votos.
   - *Discutindo Agora* — spotlight do tópico ativo com **timer de 5 minutos**, bloco de **notas compartilhadas em tempo real** e indicador de digitação colaborativa.
   - *Discutido* — histórico dos assuntos finalizados com notas preservadas.
   - **Votação Romana:** Ao soar o alarme, prompt de 10s para consenso: 👍 Continuar (+2m) · 👎 Próximo tópico · 👉 Neutro.
4. **📋 Conclusão & Ata (Completed):** Resumo completo em Markdown para exportação rápida no Slack, Discord ou PR.

---

## 🚀 Funcionalidades Principais

- ⚡ **Proposição Ágil de Tópicos:** Interface rápida com suporte a Markdown e pré-visualização inline.
- 🗳️ **Dot-Voting com Cota por Participante:** Configurável pelo facilitador, sem revelação antecipada.
- ☕ **Mesa Kanban em Tempo Real:** Drag-and-drop (facilitador) entre colunas A Discutir / Discutindo / Discutido.
- ⏱️ **Timer Inteligente:** Start, pause, reset, +60s e trigger automático de Votação Romana ao zerar.
- 📝 **Notas Colaborativas:** Textarea compartilhada com auto-save (900ms debounce), indicador de salvamento e **typing indicator** animado ("`Alice está digitando...`").
- 🏛️ **Votação Romana Interativa:** Modal de 10s com contagem ao vivo de votos de extensão, próximo tópico e neutro.
- 🔗 **Link de Participante:** Compartilhamento instantâneo da URL da sessão para qualquer participante entrar sem conta.
- 🌐 **Internacionalização (i18n):** Suporte nativo a Português (`pt-BR`) e Inglês (`en-US`).
- 🌗 **Tema Claro & Escuro:** Design System *Agile Cadence* com paleta âmbar/dourada e glassmorphism.
- 🤖 **Servidor MCP Nativo:** Endpoint JSON-RPC 2.0 para consulta e injeção de dados por agentes de IA.

---

## 🏗️ Arquitetura

O CoffeeYrd segue a metodologia **OpenSpec (Spec-Driven Development)** via `openspec/`:

| Camada | Tecnologia | Descrição |
| :--- | :--- | :--- |
| **Backend** | **Rust (Axum + Tokio)** | Servidor assíncrono com Event Broker em memória via `tokio::sync::broadcast` e FSM tipada. |
| **Banco de Dados** | **SQLite (WAL Mode)** | Arquivo único persistido em volume local/Docker com alta concorrência e backups triviais. |
| **Frontend** | **React 19 + Vite + TypeScript** | SPA com WebSocket bidirecional, i18n, tema dark/light e Design System *Agile Cadence*. |
| **Protocolo de IA** | **Model Context Protocol (MCP)** | Endpoint JSON-RPC 2.0 em `/mcp` para consulta e automação por LLMs. |

### Estrutura de Diretórios

```text
coffeeyrd/
├── openspec/                         # Metodologia Spec-Driven Development
│   ├── AGENTS.md                     # Diretrizes e governança para agentes de IA
│   ├── specs/                        # Especificações vivas (EARS + GIVEN/WHEN/THEN)
│   └── changes/                      # Histórico de propostas e mudanças
├── backend/                          # Backend em Rust (Axum)
│   ├── src/
│   │   ├── main.rs                   # Servidor HTTP, rotas e static serving
│   │   ├── db.rs                     # SQLite com WAL mode e queries
│   │   ├── ws.rs                     # WebSocket hub, FSM e typing indicator
│   │   ├── mcp.rs                    # Servidor nativo Model Context Protocol
│   │   ├── models.rs                 # Structs de domínio e mensagens
│   │   └── state.rs                  # AppState, SessionHub e broadcast
│   └── Cargo.toml
├── frontend/                         # Frontend SPA (React + TypeScript + Vite)
│   ├── src/
│   │   ├── components/               # Header, IdeationView, VotingView, DiscussionView, etc.
│   │   ├── hooks/                    # useCoffeeSocket com tipagem e reconexão
│   │   ├── i18n/                     # Traduções completas em PT e EN
│   │   ├── utils/                    # Sessões recentes, perfil e analytics
│   │   ├── types.ts                  # Tipos TypeScript alinhados aos modelos Rust
│   │   ├── index.css                 # Design System "Agile Cadence" (tokens + animações)
│   │   └── App.tsx
│   └── package.json
├── docker-compose.yml
├── Dockerfile
└── README.md
```

---

## 🤖 Servidor MCP Nativo

O CoffeeYrd disponibiliza um endpoint JSON-RPC 2.0 compatível com a especificação **Model Context Protocol** em:
`http://localhost:8082/mcp` (ou porta configurada).

### Capacidades para Agentes de IA:
- **Consultar Estado da Sessão:** Obter lista de tópicos, votos, fase atual e tópico em discussão.
- **Listar Sessões:** Enumerar sessões ativas ou recentes com seus snapshots.
- **Injetar Tópicos:** Criar tópicos automaticamente a partir de issues, épicos ou resultados de análise.

---

## 💻 Como Executar

### Opção 1: Via Docker Compose (Recomendado para Produção / Zero Cost)

```bash
docker-compose up -d --build
```
A aplicação estará disponível em `http://localhost:8082` com persistência de dados no volume `coffee-data`.

#### Variáveis de Ambiente (`.env`)
- `PORT`: Porta interna do servidor (Padrão: `8082`).
- `DATABASE_PATH`: Caminho do banco SQLite (Padrão: `/app/data/coffee.db`).
- `UMAMI_SCRIPT_URL`: URL do script de telemetria Umami (Opcional).
- `UMAMI_WEBSITE_ID`: ID do site no Umami (Opcional).

---

### Opção 2: Desenvolvimento Local

#### Pré-requisitos
- **Rust** 1.80+ ([Instalar Rust](https://rustup.rs))
- **Node.js** 20+ & npm ([Instalar Node](https://nodejs.org))

#### 1. Backend (Rust)
```bash
cd backend
cargo run
```
O servidor iniciará em `http://localhost:8082`. O banco SQLite será criado automaticamente em `backend/data/coffee.db`.

#### 2. Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
```
O frontend estará acessível em `http://localhost:5173`. As chamadas de `/api`, `/ws` e `/mcp` são redirecionadas automaticamente para a porta `8082` pelo proxy Vite.

---

## 🧰 Yrd Agile Toolkit

O **CoffeeYrd** faz parte do ecossistema de cerimônias ágeis corporativas sem custo de licenciamento:

| Ferramenta | Propósito | Link de Produção |
| :--- | :--- | :--- |
| **RetroYrd** | Retrospectivas Ágeis com Segurança Psicológica, Modo Cego e Servidor MCP | [retro.yared.com.br](https://retro.yared.com.br) |
| **DailyYrd** | Standups Diárias com Roleta de Fala, Spotlight de Bloqueios e Exportação Slack | [daily.yared.com.br](https://daily.yared.com.br) |
| **PlanningYrd** | Planning Poker em Tempo Real, Métricas de Consenso e Backlog de Histórias | [planning.yared.com.br](https://planning.yared.com.br) |
| **CoffeeYrd** | Lean Coffee com Dot-Voting, Timer, Notas Compartilhadas e Votação Romana | [coffee.yared.com.br](https://coffee.yared.com.br) |

---

## 📄 Licença

Distribuído sob a licença MIT. Consulte `LICENSE` para mais detalhes.
Desenvolvido por **[Yared](https://yared.com.br)**.
