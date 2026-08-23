# Auditoria de produção — Team Bulls — 2026-08-22

## Escopo

Revisão conservadora de inicialização, carregamento modular, regras Firebase, segurança, tamanho dos artefatos principais e regressões das funcionalidades recentes de dieta.

O objetivo desta rodada não é reescrever o núcleo do aplicativo. O núcleo atual permanece intacto para reduzir risco de regressão em treino, dieta, relatórios, fotos, cardio, sincronização e modo offline.

## Correções aplicadas

### 1. Retry dos módulos opcionais

O carregador diferido removia um `<script>` após timeout e seguia para o próximo módulo sem nova tentativa. Em rede móvel lenta isso podia fazer uma funcionalidade desaparecer naquela sessão mesmo com conexão disponível.

Agora cada módulo opcional recebe uma única nova tentativa, somente quando `navigator.onLine` está ativo, com pequena espera e timeout maior. A ordem sequencial original foi mantida.

### 2. Regra Firestore realmente ativa passa a ser auditada

`firebase.json` aponta para `firebase/firestore_27_compacto.rules`. Parte dos checks antigos ainda mantém a versão 26 como baseline histórico de regressão.

Foi criado um check de produção que lê o caminho diretamente do `firebase.json`, confirma a existência do arquivo e valida especificamente a coleção privada `dietCalculations/{uid}`, incluindo ausência de acesso `activeOwner` do aluno e presença do deny-all final.

### 3. Mensagem de erro alinhada à regra atual

O núcleo legado ainda contém uma mensagem orientando a publicação de `firestore_26_compacto.rules`. Para evitar alteração ampla no arquivo principal, uma pequena camada final corrige apenas essa orientação em runtime para `firestore_27_compacto.rules`.

### 4. Verificação das extensões recentes de dieta

A camada final confirma que calculadora, matemática da dieta e tabela de porções terminaram de carregar. Se uma extensão opcional continuar indisponível mesmo depois do retry, o console registra o diagnóstico sem quebrar o restante do aplicativo.

### 5. Guardas de tamanho e dependências

O novo check confirma:

- todos os módulos declarados no loader existem;
- não existem módulos duplicados no loader;
- a camada de coerência executa depois das extensões de dieta;
- a tabela fixa de porções continua sem Firestore;
- a calculadora continua usando a coleção privada `dietCalculations`;
- núcleo, CSS e HTML permanecem abaixo dos limites conservadores já adotados pelo projeto.

## O que deliberadamente não foi alterado

- Estrutura dos documentos Firestore existentes.
- Regras de negócio de treino, dieta, cardio ou relatórios.
- Núcleo `app_v10_10_9_core.js` de forma estrutural.
- Service Worker, estratégia offline e atualização PWA nesta rodada.
- Arquivos históricos usados para rollback e investigação.
- Imagens, músicas e mídia do aplicativo.

Esses itens foram preservados porque uma limpeza agressiva teria risco maior que o ganho esperado nesta manutenção.

## Publicação

Nenhuma regra Firebase é publicada automaticamente por este PR. Se `firestore_27_compacto.rules` ainda não estiver publicada no projeto Firebase, o deploy deve ser feito separadamente após aprovação e merge.
