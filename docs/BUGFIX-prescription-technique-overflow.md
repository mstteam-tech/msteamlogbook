# Correção — editor de técnicas cortado em telas desktop baixas

## Sintoma
No modal de prescrição, ao selecionar técnicas como Super Set ou Myo Reps em telas desktop com pouca altura útil, os controles adicionais (por exemplo, **Exercício conjugado nesta semana**) ficavam cortados pelo limite inferior do painel.

## Causa
O painel esquerdo do modal (`.prescription-tech-panel`) usa `overflow:hidden` no layout desktop compacto. Quando uma técnica expande conteúdo abaixo do seletor, esse conteúdo ultrapassa a altura disponível e deixa de ser acessível.

## Correção
- habilita rolagem vertical somente no painel de técnicas em desktop;
- preserva `overflow-x:hidden` para evitar deslocamento lateral;
- em telas com até 720px de altura, limita o seletor de técnicas a `min(180px, 32dvh)`;
- mantém os blocos de Super Set e Myo Reps fora de encolhimento flex;
- não altera lógica de prescrição, semanas, técnicas selecionadas, travas ou Firestore.

## Regressão
`scripts/prescription-technique-overflow-check.mjs` valida a presença das proteções e o workflow dedicado executa o teste em PRs que tocam nessa área.
