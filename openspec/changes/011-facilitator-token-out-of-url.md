# Change: Token de facilitador fora da barra de endereço

## Contexto & Motivação
Participantes copiavam a barra de endereço do facilitador para convidar o time, e o link levava `?token=`,
dando controle de facilitador a qualquer um que o recebesse.

## Decisões
1. A URL da sessão é sempre `/session/{id}`; o token vive só no armazenamento do navegador.
2. Links com `?token=` (antigos) ou `#token=` são consumidos uma vez e limpos da URL.
3. Novo botão "Link de facilitador" no cabeçalho, separado do "Compartilhar", usando fragmento `#token=`.
4. O token na query do WebSocket fica para uma próxima mudança (ver spec §3).

## Especificação Técnica
Ver `openspec/specs/facilitator-token/spec.md`.
