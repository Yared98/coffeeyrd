# Mudança 005: Identificação Segura do Participante e Prevenção de Personificação

**Data:** 2026-09-19  
**Status:** Implementado  
**Contexto:** Eliminação do risco de personificação de colegas na criação de pautas no CoffeeYrd.

## 1. Problema Identificado
Anteriormente, o formulário de proposição de tópicos (`IdeationView`) continha um campo de texto livre para o nome do autor. Qualquer participante podia digitar o nome de um colega da equipe, publicando tópicos em nome de terceiros e provocando distorções de autoria e riscos à segurança psicológica do time.

## 2. Solução Implementada
1. **Coleta de Identidade na Entrada da Sessão**:
   - `HomeView`: campos para preenchimento de nome/apelido integrados na criação e entrada de reuniões.
   - `IdentityModal`: modal receptivo para participantes que entram através de link direto (`/session/:id`) sem nome previamente registrado.
2. **Armazenamento Coordenado (`userProfile.ts`)**:
   - Persistência sob as chaves `yrd_profile_name` (compartilhada no ecossistema) e `coffeeyrd_user_name`.
3. **Eliminação de Personificação em Cards**:
   - O campo de texto livre de autor foi totalmente removido do `IdeationView`.
   - Cards são automaticamente assinados com a identidade do participante ativo (`Propondo como: Nome`).
   - Disponibilizado checkbox explícito para proposição anônima ("Propor como anônimo"), preservando o anonimato voluntário sem permitir o uso indevido de nomes de colegas.
4. **Visualização & Edição de Identidade no Cabeçalho**:
   - Badge com avatar circular e nome do participante no cabeçalho superior (`Header.tsx`), com atalho para atualização de perfil a qualquer momento.
