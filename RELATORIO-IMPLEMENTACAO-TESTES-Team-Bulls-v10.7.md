# Team Bulls v10.7 — relatório de implementação e testes

## Escopo entregue

A v10.7 implementa os dez pontos priorizados: rascunho automático, desfazer/refazer, histórico de versões, central de sincronização, convites únicos, auditoria, modelos reutilizáveis, painel de adesão, avisos de plano/check-in, preparação do App Check, testes em CI e modularização gradual.

## Decisões de preservação

- A restauração substitui somente a estrutura de `workouts`, `exercises` e, quando presente na versão, `mealPlans`.
- `sessions`, `weeklyCheckins`, `progressPhotos`, `freeMealLogs` e históricos de conclusão não são apagados.
- Os mesmos IDs de treino e exercício são recriados ao restaurar uma versão, permitindo que sessões vinculadas voltem a se conectar quando a estrutura existia naquela versão.
- A aplicação de modelo é aditiva e usa IDs novos.
- Antes de restauração ou aplicação de modelo, a estrutura atual é guardada para desfazer.

## Testes executados

### Validação estática

- 460 IDs HTML únicos, sem duplicidade.
- 12 recursos locais referenciados e existentes.
- 9 arquivos JavaScript aprovados por `node --check`.
- manifesto JSON válido.
- referências essenciais do Service Worker existentes.
- regras com chaves balanceadas e regras explícitas para as cinco novas coleções.

### Navegador sintético

Executado em Chromium headless com a interface completa carregada sem chamadas externas:

- tela inicial local;
- Central de operações no desktop;
- Central de sincronização;
- contexto visual do treinador com aluno aberto;
- desfazer local;
- layout mobile;
- novo formulário de cadastro por convite;
- nenhum erro JavaScript de página.

### Firebase simulado

Um Firestore em memória foi usado para validar o fluxo lógico:

- criação de convite;
- hash do convite;
- consumo único no cadastro;
- vínculo `trainerId` e `inviteId` no perfil;
- criação de versão;
- criação de modelo;
- aplicação de modelo com novos IDs;
- criação de aviso;
- restauração estrutural;
- preservação de uma sessão histórica durante a restauração.

## Limitações que exigem teste no projeto real

1. As regras `firestore_22_compacto.rules` não foram publicadas no seu Firebase durante esta execução.
2. O Firebase Emulator Suite não estava disponível no ambiente.
3. A chave pública do App Check não foi fornecida; portanto o provedor está preparado, mas permanece desativado.
4. Notificação em segundo plano com o aplicativo totalmente fechado exigiria Firebase Cloud Messaging e um componente de servidor. A v10.7 entrega avisos internos e notificações do aparelho quando o aplicativo consulta as atualizações.
5. É necessário testar em aparelhos físicos, especialmente câmera, armazenamento, modo PWA, alternância offline/online e permissões de notificação.

## Resultado

A estrutura entregue passou pelas verificações estáticas, pelos testes de navegador sintético e pelos testes funcionais com Firebase simulado. A publicação deve começar em um ambiente ou aluno de teste antes de ser usada com toda a base real.
