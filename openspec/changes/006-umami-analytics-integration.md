# Change 006: Integração do Umami Analytics Focada em Privacidade

## Contexto
O CoffeeYrd não possuía telemetria de produto, enquanto o restante do ecossistema Yrd Toolkit (RetroYrd, DailyYrd e PlanningYrd) já utilizava a infraestrutura do Umami Analytics com salvaguardas rigorosas de privacidade.

## Proposta & Implementação
1. **Backend (Axum)**:
   - Endpoint `GET /api/config` para expor dinamicamente as variáveis de ambiente opcionais `UMAMI_SCRIPT_URL` e `UMAMI_WEBSITE_ID`.
   - Caso nenhuma variável seja configurada, o retorno expõe valores nulos sem falha.

2. **Frontend Utility (`src/utils/analytics.ts`)**:
   - `initAnalytics()`: busca a rota `/api/config` e injeta dinamicamente o script Umami.
   - Aplicação obrigatória de `data-auto-track="false"` para blindar tokens de facilitador e IDs de sessão.
   - `trackPageView(sanitizedPath, title)`: sanitiza as rotas para apenas `/` e `/room`.
   - `trackEvent(eventName, eventData)`: permite eventos analíticos anônimos.

3. **Ciclo de Vida no `App.tsx`**:
   - Invocação de `initAnalytics()` no carregamento inicial da aplicação.
   - Disparo de `trackPageView` com sanitização estrita sempre que a rota/título da reunião alternar.

4. **Variáveis de Ambiente**:
   - Adicionadas variáveis comentadas ao `.env.example`.
