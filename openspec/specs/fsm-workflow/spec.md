# Especificação: FSM e Fluxo do Lean Coffee (CoffeeYrd)

## 1. Visão Geral
O CoffeeYrd implementa uma Máquina de Estados Finita (FSM) estrita para conduzir reuniões sem pauta com foco em timeboxes e consenso.

## 2. Fases do FSM

### 2.1 IDEATION (Proposição de Pautas)
- Participantes criam cartões com título e descrição opcional.
- Os cartões podem ter autor atribuído ou ser anônimos.
- O facilitador pode editar o tempo padrão do timebox (ex: 5 minutos).

### 2.2 VOTING (Priorização por Votação / Dot-Voting)
- Cada participante recebe uma cota de votos (padrão: 3 a 5 votos).
- Os votos podem ser distribuídos entre múltiplos tópicos ou acumulados no mesmo tópico.
- Ao avançar de fase, os tópicos são ordenados automaticamente em ordem decrescente de votos na coluna "A Discutir".

### 2.3 DISCUSSION (Mesa de Café / The Coffee Table)
- A tela organiza-se em 3 colunas dinâmicas:
  1. **A Discutir (`TO_DISCUSS`)**: Fila ordenada por votos.
  2. **Discutindo Agora (`DISCUSSING`)**: O tópico atualmente em debate com Timer de timebox ativo e área de anotações compartilhadas.
  3. **Discutido (`DISCUSSED`)**: Histórico dos tópicos finalizados com o tempo consumido e notas registradas.
- Ao soar o alarme do timebox, a **Votação Romana (Roman Voting)** é disparada automaticamente.

### 2.4 COMPLETED (Conclusão & Ata)
- Resumo consolidado dos tópicos discutidos, notas e itens de ação.
- Exportação instantânea em formato Markdown (`.md`).
