# Hotfix de cadastro 2026082602

Causa: `modules/registration-integrity-v10_10_9.js` era carregado de forma diferida e substituía `doRegister` por uma implementação antiga depois de `modules/v107-invites.js` já ter instalado o fluxo corrigido. Em aparelhos nos quais o módulo diferido terminava de carregar antes do toque em "Criar novo registro", a correção do listener de autenticação era desfeita e o Firestore podia retornar `Missing or insufficient permissions`.

Correção: a camada de integridade passa a ser passiva e nunca substitui `doRegister`. O módulo canônico de convites também restaura seu próprio `doRegister` após cada evento de carregamento diferido, garantindo compatibilidade com caches antigos. O build 2026082602 força a distribuição do hotfix pelo atualizador da PWA.
