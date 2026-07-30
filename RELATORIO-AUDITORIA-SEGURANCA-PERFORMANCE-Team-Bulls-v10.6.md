# Team Bulls v10.6 — Auditoria de estabilidade, segurança e desempenho

## Escopo

A auditoria foi feita sobre a v10.5.17 e preserva a estrutura de dados existente: treinos, dias, exercícios repetidos, oito semanas, técnicas semanais, sessões, dietas, fotos, check-ins, instruções, catálogos, música e funcionamento offline.

Não houve migração destrutiva nem limpeza automática do `localStorage`, IndexedDB, Firestore ou Storage.

## Correções aplicadas

### Inicialização e Firebase

- Corrigido um risco de espera indefinida quando uma tag do SDK Firebase já existia, mas havia falhado antes de os eventos serem registrados.
- O carregamento do Firebase agora possui timeout real, detecção por polling, tentativa única compartilhada e possibilidade de nova tentativa após falha.
- As mensagens de erro agora diferenciam permissão, autenticação expirada, indisponibilidade de rede e limite de cota.
- Todas as mensagens apontam para o arquivo atual `firestore_21_compacto.rules`.

### Desempenho

- A visão geral das oito semanas deixou de filtrar todas as sessões repetidamente para cada célula.
- A contagem de registros agora é calculada uma vez por exercício.
- Resumos de prescrição são memorizados enquanto os objetos de prescrição e técnicas não mudam.
- Atualizações sucessivas da planilha são canceláveis: somente a renderização mais recente é executada.
- Removida uma renderização duplicada que ocorria após salvar ou propagar técnicas.
- Listas extensas usam `content-visibility`, reduzindo o custo de elementos fora da área visível.
- O editor compacto continua independente e a rolagem vertical das telas gerais foi restaurada.

### Técnicas por semana

- Validados os quatro fluxos: exercícios abaixo na mesma semana, semanas seguintes do mesmo exercício, exercícios abaixo nas semanas seguintes e propagação completa abaixo/à frente.
- A propagação funciona também com configuração vazia, removendo técnicas nos destinos.
- Séries, repetições, GER e semanas anteriores não são modificados.
- Super set não cria pares incorretos em massa; vínculos próprios existentes são preservados.

### Memória e estabilidade visual

- URLs temporárias de fotos são revogadas ao retornar para a autenticação e ao fechar a página.
- Caches pessoais de fotos, refeições e conclusões do dia são liberados na troca de sessão.
- Modais agora devolvem o foco ao botão que os abriu, aceitam Escape quando seguro e expõem semântica de diálogo.
- Adicionado foco visível para navegação por teclado e suporte a `prefers-reduced-motion`.
- Textos longos não expandem cartões ou modais para fora da tela.

### PWA e cache

- Shell atualizado para `app_v10_6.js`, `styles_v10_6.css`, `manifest_21.json` e `sw_34.js`.
- Cache antigo é invalidado sem apagar dados locais do aluno.
- A página de recuperação abre explicitamente a v10.6.
- Áudios continuam no cache separado, evitando baixar novamente as três músicas a cada atualização.

## Segurança corrigida

### Firestore

- Regras compactas mantidas abaixo do tamanho que anteriormente causava “erro desconhecido” no Firebase.
- O aluno não pode alterar perguntas, identidade do aluno, treinador ou data de criação de questionários ao enviar respostas.
- Campos estruturais de treinos, exercícios e sessões ficam imutáveis após a criação.
- Caminhos de fotos precisam corresponder ao UID proprietário e ao diretório correto.
- Datas, quantidades, listas, pesos, calorias, textos e número obrigatório de quatro fotos receberam limites.
- Documentos antigos sem alguns campos opcionais podem continuar sendo editados, evitando `permission-denied` por comparação direta de campo ausente.
- Todas as 17 coleções usadas pelo aplicativo possuem regra explícita; o restante permanece bloqueado.

### Storage

- Upload limitado a JPEG, maior que zero e com no máximo 700 KB.
- Aluno ativo acessa somente o próprio diretório.
- Treinador pode visualizar, mas não enviar arquivos em nome do aluno.
- Todos os caminhos não declarados permanecem bloqueados.

## Validação realizada

- 20 de 20 verificações estáticas aprovadas.
- Sintaxe aprovada em cinco arquivos JavaScript.
- 453 IDs HTML verificados sem duplicidade.
- Todas as referências locais do HTML e Service Worker existem.
- Manifesto JSON válido.
- Chaves CSS e regras equilibradas.
- Todas as coleções usadas no JavaScript cobertas nas regras.
- Nenhum uso de `eval` ou `new Function`.
- Teste de inicialização desktop: tela de autenticação liberada, versão 10.6 e nenhum erro JavaScript.
- Teste visual do editor em desktop e iPhone 12 equivalente: modal aberto sem erro JavaScript.
- Teste da propagação completa: MP + BOS aplicados da semana 3 até a 8 ao exercício atual e aos exercícios abaixo, sem alterar prescrições.
- Teste de remoção: técnicas removidas da semana escolhida até a 8, mantendo a semana anterior intacta.

## Limitações que permanecem

- Não é tecnicamente possível garantir ausência absoluta de bugs sem testes no Firebase real, Emulator Suite, aparelhos físicos e dados reais de produção.
- O aplicativo ainda possui um arquivo JavaScript grande porque acumulou muitas funcionalidades e camadas de compatibilidade. A separação em módulos é recomendada, mas deve ser feita como projeto controlado para não arriscar os dados existentes.
- Dados offline do navegador não são criptografados em repouso. O isolamento é por UID, mas alguém com acesso administrativo ao aparelho/navegador pode inspecionar o armazenamento.
- O código de cadastro presente no cliente não deve ser tratado como segredo forte. Convites seguros exigem validação no servidor.
- Firebase App Check permanece opcional até que seja configurado no projeto real.

## Recomendações prioritárias

1. Criar convites de aluno de uso único por Cloud Function, removendo qualquer segredo de cadastro do JavaScript público.
2. Ativar Firebase App Check e monitorar requisições recusadas antes de habilitar fiscalização total.
3. Implementar rascunho automático, desfazer/refazer e histórico de versões para prescrições.
4. Criar uma central de sincronização mostrando pendências, falhas e último backup de cada aluno.
5. Adicionar log de auditoria para alterações do treinador: quem alterou, o que mudou e quando.
6. Criar modelos reutilizáveis de treino, dieta, técnica e check-in para acelerar novas prescrições.
7. Adicionar notificações de check-in, atualização de treino/dieta e sessões atrasadas.
8. Criar painel de adesão com frequência, progressão de carga, GER, fotos e relatórios no mesmo resumo.
9. Implantar testes automatizados em CI para regras, login, prescrição, propagação, fotos e funcionamento offline antes de cada publicação.
