# Especificação: Votação Romana (Roman Voting)

## 1. Conceito
A Votação Romana é um mecanismo de decisão ágil e instantâneo acionado quando o timebox do tópico ativo na fase `DISCUSSION` se esgota.

## 2. Dinâmica
1. Ao atingir `00:00` no cronômetro do tópico:
   - Um alerta sonoro discreto toca nos clientes.
   - Uma gaveta/modal overlay de votação rápida surge para todos os participantes com um timer regressivo de 10 segundos.
2. Cada participante escolhe uma das três opções:
   - 👍 **Continuar (`EXTEND`)**: O assunto ainda é relevante; estender o timebox em +2 ou +3 minutos.
   - 👎 **Avançar (`NEXT`)**: O assunto já foi suficientemente explorado; mover para *Discutido* e puxar o próximo tópico da fila.
   - 👉 **Neutro (`NEUTRAL`)**: Sem preferência ou abstenção.
3. **Decisão**:
   - Se `EXTEND > NEXT`: Adiciona os minutos configurados ao tópico e reinicia o timer.
   - Se `NEXT >= EXTEND`: O tópico atual é marcado como `DISCUSSED` e o primeiro tópico de `TO_DISCUSS` é movido para `DISCUSSING`.
   - O Facilitador pode forçar a decisão ou estender manualmente a qualquer momento.
