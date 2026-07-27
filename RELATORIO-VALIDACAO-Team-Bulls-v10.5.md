# Relatório de validação — Team Bulls v10.5

## Cenários verificados

1. Sintaxe JavaScript do aplicativo, inicialização, Service Worker, viewport e recuperação.
2. Referências locais do HTML, manifesto e cache PWA.
3. Ausência de IDs HTML duplicados.
4. Persistência de `optionalTechniqueIds` em nuvem, cache e modo local.
5. Persistência de `performedTechniqueMode` em criação e edição de sessões.
6. Regras de criação e atualização de exercícios e sessões.
7. Compatibilidade com documentos antigos sem os novos campos.
8. Exibição da opção MP somente quando Myo Reps está selecionada.
9. Temporizadores curtos e padrões quando Myo Reps é opcional.
10. Remoção do recarregamento completo do aluno após salvar exercício.
11. Layout de autenticação desktop independente do layout após o login.

## Causa provável do erro `permission-denied`

O código publicado já enviava campos de técnicas, mas esses campos dependem das regras correspondentes estarem publicadas no Firebase Console. Colocar um arquivo `.rules` no GitHub não altera as regras do banco. A v10.5 inclui `firestore_20.rules` e uma mensagem de diagnóstico mais clara.

## Limitações

A validação das permissões em produção depende de publicar `firestore_20.rules` no projeto Firebase correto e testar com a conta real do treinador. Não houve alteração nos documentos existentes nem exclusão de registros.
