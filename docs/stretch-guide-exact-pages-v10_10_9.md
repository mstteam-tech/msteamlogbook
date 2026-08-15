# Planilha de Alongamentos — páginas exatas do PDF

Esta revisão substitui visualmente o guia de alongamentos reconstruído em HTML por renderizações das 10 páginas do PDF original fornecido para a Team Bulls.

- As fotografias, textos, posições, capa, cores e composição visual vêm das páginas renderizadas do PDF; o aplicativo não redesenha o conteúdo.
- As páginas são armazenadas em `assets/stretch-guide/page-01.avif` até `page-10.avif`.
- O visualizador `modules/stretch-guide-pdf-v10_10_9.js` neutraliza o visualizador HTML legado e assume todos os atalhos de `ALONGAMENTOS`.
- A navegação mantém swipe horizontal, setas, contador, pontos de página, ESC e setas do teclado.
- Somente a página atual e as vizinhas recebem `src` quando o guia é aberto; as 10 imagens não são carregadas durante o login.
- As páginas não entram no `REQUIRED_SHELL` do Service Worker. O módulo é carregado pelo loader versionado e o Service Worker atual armazena URLs versionadas no cache quando solicitadas.
- O conjunto de 10 páginas foi comprimido para menos de 200 KiB, com teste automático impedindo regressões de peso e ausência de páginas.
- A versão pública do aplicativo permanece `10.10.9`.

Nenhuma regra Firestore/Storage, autenticação, schema de dieta, treino, relatório, sessão ou suplemento é alterada por esta revisão.
