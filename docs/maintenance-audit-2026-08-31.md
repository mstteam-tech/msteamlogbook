# Team Bulls — auditoria de manutenção e segurança (2026-08-31)

## Escopo

Revisão da `main` após os hotfixes recentes, com foco em coerência de cache/PWA, custo de observadores DOM, isolamento de estado privado entre sessões, recuperação de funcionalidades perdidas em branches empilhadas e supply chain do CI.

## Achados corrigidos nesta revisão

- URLs versionadas do loader estavam atrás das revisões internas de módulos já presentes na `main`, permitindo que instalações servissem JavaScript antigo por cache-first. Foram alinhadas as identidades de usabilidade, porções, alimentos personalizados e home do aluno.
- A opção **SAIR** dependia de um `MutationObserver` permanente sobre toda a árvore do documento. O fluxo foi mantido sobre `confirmLogout()`, mas a recuperação da criação tardia do menu agora usa tentativas limitadas e eventos de navegação/runtime.
- A ponte de alimentos personalizados observava todo o `body`. Ela agora usa o catálogo canônico do treinador, sincroniza a tabela visível na fase de captura do evento da refeição e limpa o registro nutricional privado no logout.
- O histórico de feedbacks do treinador havia ficado fora da `main`. Ele foi restaurado como módulo carregado sob demanda na ficha do aluno, sem observador global e sem permissão de apagar feedbacks enviados.
- O build/cache do PWA foi rotacionado para impedir reutilização de módulos antigos.
- GitHub Actions foram fixadas por SHA e padronizadas em Node 22; CodeQL e Dependabot para Actions foram adicionados.

## Achados que exigem ação de administração / revisão separada

1. A branch `main` não está protegida no GitHub. Recomenda-se exigir pull request, bloquear force-push/delete e exigir os checks de qualidade/segurança antes de merge.
2. `firebase/firestore_28_compacto.rules` limita o documento `trainerSupplementCatalog`, mas ainda deve ganhar validação explícita da estrutura/tamanho de `dietPortionItems` em uma revisão dedicada das Rules, seguida de publicação no Firebase.
3. O CSP ainda precisa aceitar handlers inline porque o app legado usa diversos `onclick`. A remoção de `script-src-attr 'unsafe-inline'` deve ser feita por migração gradual para `addEventListener`, não por corte imediato.
4. `app_v10_10_9_core.js` permanece grande e concentra responsabilidades. A modularização deve ser incremental, acompanhada de testes por domínio, para evitar regressões.

## Versão

A versão pública permanece `10.10.9`. Esta manutenção usa build `2026083101` e cache `hardening1`.
