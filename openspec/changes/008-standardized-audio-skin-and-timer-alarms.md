# Padronização de Skin de Som e Alertas Sonoros no CoffeeYrd

## Contexto
No CoffeeYrd, as discussões de tópicos possuem um cronômetro regressivo síncrono que transiciona automaticamente para a Votação Romana (`Roman Voting`). No entanto, até então a transição ocorria de forma 100% silenciosa, podendo passar despercebida por membros que estivessem debatendo em outras abas ou janelas.

## Mudanças Realizadas

1. **Utilitário de Som Nativo (`SoundPlayer`)**:
   - Criado `frontend/src/utils/sound.ts` com base na Web Audio API nativa (sem dependência de bibliotecas ou arquivos externos `.mp3`/`.wav`).
   - Alarme harmônico de sino melódico afinado em notas agradáveis (A5, C#6, E6) com 5 pulsos acústicos suaves.
   - Suporte a Mute/Desmute persistido em `localStorage` (`yrd_sound_muted`).

2. **Integração no Cabeçalho e Menu do Facilitador (`Header.tsx`)**:
   - Disparo do alarme auditivo no término exato do timebox (`diff === 0`), chamando a atenção imediatamente para a abertura da votação romana.
   - Interrupção imediata do alarme ao adicionar tempo ou reiniciar o cronômetro.
   - Adicionados controles no menu suspenso do timer: botão de Mudo/Som com indicador visual (`Volume2` / `VolumeX`) e botão de teste rápido de áudio ("Testar").
