# Especificação: FSM e Fluxo do Lean Coffee (CoffeeYrd)

## 1. Visão Geral
O CoffeeYrd implementa uma Máquina de Estados Finita (FSM) estrita para conduzir reuniões sem pauta com foco em timeboxes e consenso.

## 2. Fases do FSM

### 2.1 IDEATION (Proposição de Pautas)
- Participantes criam cartões com título e descrição opcional.
- Os cartões podem ter autor atribuído ou ser anônimos.
- Suporte a Drag & Drop para mesclar cards semelhantes: ao arrastar Card A sobre Card B, consolida títulos, descrições, histórico e remove duplicatas.
- O facilitador pode editar o tempo padrão do timebox (ex: 5 minutos).

### 2.2 VOTING (Priorização por Votação / Dot-Voting)
- Cada participante recebe uma cota de votos (padrão: 3 a 5 votos).
- Os votos podem ser distribuídos entre múltiplos tópicos ou acumulados no mesmo tópico.
- Suporte a Drag & Drop para mesclar cards durante a votação caso duplicatas ainda estejam presentes, transferindo votos consolidados.
- Ao avançar de fase, os tópicos são ordenados automaticamente em ordem decrescente de votos na coluna "A Discutir".

### 2.3 DISCUSSION (Mesa de Café / The Coffee Table)
- A tela organiza-se em 3 colunas dinâmicas com movimentação flexível:
  1. **A Discutir (`TO_DISCUSS`)**: Fila ordenada por votos.
  2. **Discutindo Agora (`DISCUSSING`)**: O tópico atualmente em debate com Timer de timebox ativo e área de anotações compartilhadas.
  3. **Discutido (`DISCUSSED`)**: Histórico dos tópicos finalizados com notas registradas.
- **Reabertura & Gestão de Erros**:
  - Tópicos na coluna `DISCUSSED` podem ser reabertos para `TO_DISCUSS` ou retomados diretamente para `DISCUSSING`.
  - Tópicos em `DISCUSSING` podem ser devolvidos à fila `TO_DISCUSS` ou concluídos manualmente.
  - Suporte a arrastar e soltar (drag & drop) entre as 3 colunas para reclassificação visual instantânea.
- Ao soar o alarme do timebox, a **Votação Romana (Roman Voting)** é disparada automaticamente.

### 2.4 COMPLETED (Conclusão & Ata)
- Resumo consolidado dos tópicos discutidos, notas e itens de ação.
- Exportação instantânea em formato Markdown (`.md`).

