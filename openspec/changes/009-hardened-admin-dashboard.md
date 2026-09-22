# Change: Console Administrativo Seguro e Espaçoso (/admin) no CoffeeYrd

## Contexto & Motivação
Necessidade de observabilidade operacional, controle de retenção de sessões de Lean Coffee e telemetria de adoção, respeitando a identidade visual espaçosa da Home e o padrão de cores Amber do ecossistema.

## Especificação Técnica
1. **Segurança de Acesso**:
   - Autenticação via `ADMIN_TOKEN` com comparação em tempo constante (`constant_time_eq`) para proteção contra timing attacks.
   - Rate limiting de 5 tentativas a cada 15 minutos por endereço IP (retornando HTTP 429 quando excedido).
   - Sessão via cookie `HttpOnly; SameSite=Strict; Max-Age=7200` (`yrd_admin_session`) e suporte a `Authorization: Bearer <token>`.
2. **Endpoints Administrativos**:
   - `POST /api/admin/login`: Autenticação e emissão do cookie.
   - `POST /api/admin/logout`: Revogação da sessão.
   - `GET /api/admin/verify`: Verificação de status de autorização.
   - `GET /api/admin/metrics`: Coleta de métricas (total de sessões, ativas em 30d, tópicos, votos, sessões em memória e tamanho do SQLite).
   - `POST /api/admin/purge`: Disparo manual de expurgo de sessões inativas (> 60 dias).
   - `DELETE /api/admin/sessions/{id}`: Exclusão pontual de sessão com cascading delete.
3. **UI / Design System**:
   - Alinhamento total com a Home: layout fluido `.admin-layout`, `.admin-main` (`max-width: 1200px`), tipografia `Plus Jakarta Sans` e `JetBrains Mono`.
   - Grid de cartões KPI espaçoso com fundo `var(--bg-surface)`, bordas `var(--border-highlight)` e elevação suave.
   - Paleta de cores oficial CoffeeYrd: Amber (`#f59e0b` / `#d97706`), ícone `Coffee`.
   - Tabela de sessões com paginação visual, cópia rápida de ID e link direto para sessões.
