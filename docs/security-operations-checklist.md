# Team Bulls — checklist de segurança operacional

Antes de publicar uma revisão:

- confirmar CI verde para validação, qualidade, segurança e testes específicos alterados;
- revisar `version.json`, `update_v10_10_9.js`, `sw.js` e `sw_47.js` para o mesmo build;
- manter `sw.js` e `sw_47.js` idênticos;
- confirmar que `firebase.json` continua apontando para `firestore_28_compacto.rules` e `storage_6.rules` (ou versões explicitamente aprovadas em PR futuro);
- publicar Rules no Firebase quando um PR alterar Firestore/Storage; merge no GitHub não publica Rules;
- não colocar segredos, credenciais administrativas ou service-account no frontend;
- revisar novas origens antes de ampliar CSP;
- preferir dependências e GitHub Actions fixadas por versão/commit e acompanhar atualizações automáticas;
- testar logout/troca de conta para garantir que caches de estado privado em memória sejam limpos;
- para mudanças de PWA, rotacionar build/cache e validar atualização em um dispositivo já instalado, não apenas instalação limpa.

Proteção de repositório recomendada para `main`:

- exigir pull request;
- exigir checks de qualidade e segurança;
- impedir force push;
- impedir exclusão da branch;
- manter permissões de workflow no menor nível necessário.
