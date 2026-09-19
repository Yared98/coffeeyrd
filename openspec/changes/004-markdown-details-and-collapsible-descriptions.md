# Mudança 004: Suporte a Markdown nos Detalhes/Contexto e Descrições Recolhíveis

**Data:** 2026-09-19  
**Status:** Implementado  
**Contexto:** Melhoria na visualização de detalhes e contexto adicional de tópicos de discussão no CoffeeYrd.

## 1. Motivação
Em sessões de Lean Coffee, descrições detalhadas com listas de tópicos, links para documentações, snippets ou blocos de contexto enriquecem a discussão. No entanto, descrições muito longas poluiam o grid de cartões e prejudicavam a densidade visual e usabilidade nas fases de proposição, votação, discussão e resumo.

## 2. Solução Implementada
1. **Renderização de Markdown Nativa**:
   - Integrado `react-markdown` e `remark-gfm`.
   - Suporte a negrito, itálico, listas, links seguros (`target="_blank"`, `rel="noopener noreferrer"`), blocos de código e citações.
   - Isolamento de cliques e drags (`stopPropagation`) para não interferir na interação dos cards.
2. **Componente Reutilizável `MarkdownDescription`**:
   - Detecção automática de conteúdos longos por limite de caracteres e contagem de quebras de linha.
   - Botão interativo de alternância ("Ver mais" / "Recolher") com ícones dinâmicos `ChevronDown` e `ChevronUp`.
   - Máscara sutil com gradiente em fade-out na base do conteúdo truncado.
   - Suporte a internacionalização (i18n) em português e inglês.
3. **Adoção Consistente nas Vistas**:
   - `IdeationView`: Proposição de tópicos e formulário com `textarea` multilinhas.
   - `VotingView`: Cartões de votação e priorização.
   - `DiscussionView`: Cartões da fila `TO_DISCUSS` e cabeçalho do tópico ativo `DISCUSSING`.
   - `SummaryView`: Relatório final consolidado de tópicos discutidos.
