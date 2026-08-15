# Team Bulls 10.10.9 — revisão de orientações, dieta e login

Escopo desta revisão: hidratação da dieta, orientações nutricionais, acesso aos alongamentos, reabertura das orientações iniciais e resiliência de login/Firebase.

## Compatibilidade e dados
- `hydrationMl` é um campo opcional por dieta; dados antigos continuam válidos e aliases legados `waterMl` / `dailyWaterMl` são aceitos na normalização.
- A persistência continua passando por `persistDietDocument()`; nenhuma coleção nova foi criada.
- Nenhuma regra de Firestore/Storage foi modificada. O bloco atual de `mealPlans` não usa whitelist fechada de chaves que impeça `hydrationMl`.
- Técnicas, treinos, sessões, relatórios, fotos, refeições concluídas e suplementos não são alterados por esta atualização.

## Login / Firebase
- O bootstrap Firebase mantém timeout finito, ampliado para redes móveis lentas.
- App Check usa `ReCaptchaEnterpriseProvider` quando disponível, coerente com a chave Enterprise configurada.
- Há no máximo uma nova tentativa para inicialização e leituras classificadas como falha de rede.
- Escritas (`cloudWrite`) não ganham retry automático, evitando duplicação de gravações.
- Login offline previamente validado continua como fallback do núcleo existente.

## Instruções iniciais
- A confirmação é vinculada ao UID e à revisão das instruções + revisão estática das novas orientações.
- A confirmação é salva antes da navegação para Home.
- Chamadas concorrentes de `renderHome()` compartilham um token de prompt e não reabrem a tela quando já confirmada.

## PWA
- Versão pública permanece `10.10.9`.
- Cache atômico passa para `guidance2`.
- `student-guidance-v10_10_9-v2.js` integra o `REQUIRED_SHELL` em `sw.js` e `sw_47.js`.
- O guia de alongamentos é HTML/CSS leve e não adiciona o PDF de vários megabytes ao carregamento inicial.

## Validação ainda necessária fora do CI
- Login real em Android/iOS sob Wi‑Fi e rede móvel.
- Confirmação das orientações em desktop e reentrada na Home.
- Edição da hidratação pelo treinador e leitura pelo aluno.
- Navegação por swipe/setas do guia em celular e desktop.
- Latência real e métricas do Firebase Console não são simuladas pelo CI estático.
