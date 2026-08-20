# Migração única — alunos cadastrados antes da v10.7

## Por que existe

Antes da v10.7, o cadastro do aluno gravava `name`, `email`, `role`, `status` e `createdAt`, sem `trainerId` e sem `inviteId`.

O isolamento de segurança atual exige `trainerId` para que o treinador leia os dados do aluno. Por isso esses perfis antigos precisam receber o vínculo uma única vez.

## Segurança da migração

A leitura temporária dos perfis só é permitida quando o documento do próprio treinador possui o campo administrativo:

```text
legacyMigrationEnabled = true
```

O aplicativo não consegue ativar esse campo. Ele deve ser criado manualmente por um administrador no Firebase Console.

Enquanto a autorização estiver ativa, o módulo de migração:

1. localiza somente perfis `student` anteriores à v10.7 sem `trainerId` e sem `inviteId`;
2. grava apenas `trainerId` nesses perfis;
3. não altera nome, e-mail, senha, `role`, status ou dados de treino;
4. não sobrescreve alunos que já possuem `trainerId`;
5. ao terminar sem falhas, altera `legacyMigrationEnabled` para `false` no próprio treinador.

As regras permitem ao cliente desligar a autorização, mas nunca ligá-la.

## Publicação

O repositório possui `firebase.json` apontando explicitamente para `firebase/firestore_26_compacto.rules`.

Na raiz do projeto:

```bash
firebase deploy --only firestore:rules --project teamms-app
```

Depois, no Firebase Console:

1. abra **Firestore Database → users**;
2. abra o documento da conta cujo `role` é `trainer`;
3. adicione `legacyMigrationEnabled` como **boolean** com valor `true`;
4. salve;
5. feche e abra o Team Bulls e entre como treinador.

A migração roda automaticamente. Ao concluir, a lista é recarregada e `legacyMigrationEnabled` volta para `false`.

## Verificação

Após a migração:

- os alunos antigos devem possuir `trainerId` igual ao UID do treinador;
- `legacyMigrationEnabled` deve estar `false`;
- alunos modernos continuam preservando `inviteId`;
- nenhum perfil já vinculado a outro `trainerId` é modificado.
