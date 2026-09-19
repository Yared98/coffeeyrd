# Especificação: FSM e Fluxo do Lean Coffee (CoffeeYrd)

## 1. Visão Geral
O CoffeeYrd implementa uma Máquina de Estados Finita (FSM) estrita para conduzir reuniões sem pauta com foco em timeboxes e consenso.

## 2. Fases do FSM

### 2.1 IDEATION (Proposição de Pautas)
- Participantes criam cartões com título e descrição opcional.
- **Identificação Segura & Prevenção de Personificação**:
  - O nome do participante é coletado na entrada da sessão (Home ou modal de boas-vindas) e persistido em armazenamento local coordenado (`yrd_profile_name` / `coffeeyrd_user_name`).
  - O formulário de criação de tópicos não permite digitação de nomes de terceiros: o cartão é automaticamente assinado com o nome do usuário autenticado.
  - Para garantir segurança psicológica autêntica, participantes podem assinalar opcionalmente o checkbox de proposição anônima ("Propor como anônimo"), sem que terceiros possam ser personificados.
  - O participante pode visualizar e atualizar seu próprio nome através do badge com avatar presente no cabeçalho.
- **Suporte a Markdown & Detalhes Expansíveis**:
  - Descrições e contextos adicionais suportam formatação Markdown completa (negrito, itálico, listas, links, código, etc.).
  - Cartões com descrições extensas contam com mecanismo expansível/recolhível com botão interativo ("Ver mais" / "Recolher") e efeito visual de transição suave (fade out) para preservar a densidade visual e evitar poluição da tela.
- Suporte a Drag & Drop para mesclar cards semelhantes: ao arrastar Card A sobre Card B, consolida títulos, descrições, histórico e remove duplicatas.
- **Reversibilidade de Mescla**: toda mescla pode ser desfeita pelo Facilitador através de notificação pós-ação ou botão de reversão no card mesclado.
- O facilitador pode editar o tempo padrão do timebox (ex: 5 minutos).

### 2.2 VOTING (Priorização por Votação / Dot-Voting)
- Cada participante recebe uma cota de votos (padrão: 3 a 5 votos).
- Os votos podem ser distribuídos entre múltiplos tópicos ou acumulados no mesmo tópico.
- Suporte a Drag & Drop para mesclar cards durante a votação caso duplicatas ainda estejam presentes, transferindo votos consolidados.
- Mesclas realizadas nesta fase também suportam reversão atômica (estornando os votos transferidos para o autor original).
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

