# Relatório técnico — Cardio v10.10.9

## Estrutura

A prescrição é armazenada no campo `cardioPlan` do documento já existente `mealPlans/{studentUid}`. Isso mantém o cardio compartilhado entre Treino e Dieta e evita a criação de documentos divergentes.

## Dados por modalidade

- tipo de cardio;
- duração em minutos;
- frequência de 1 a 7 dias por semana;
- observações individuais;
- cronômetro calculado a partir da duração prescrita.

A prescrição principal e cada substituição usam exatamente a mesma estrutura.

## Cronômetro

O estado é salvo localmente por aluno e modalidade. O tempo continua correto ao trocar de tela ou deixar o aplicativo em segundo plano, pois a contagem usa um horário final (`endAt`) e não depende apenas do intervalo visual.

## Permissões

Na nuvem, o aluno apenas consulta e utiliza o cronômetro. O treinador cria, edita, ordena e exclui. No modo local, o próprio usuário pode editar. As regras do Firebase não precisaram mudar porque o novo campo permanece no documento `mealPlans`, já protegido pelas regras existentes.
