// Team Bulls v5 rules: prescrição semanal/GER e peso opcional nas evidências fotográficas.
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function signedIn() {
      return request.auth != null;
    }

    function userExists(uid) {
      return exists(/databases/$(database)/documents/users/$(uid));
    }

    function userData(uid) {
      return get(/databases/$(database)/documents/users/$(uid)).data;
    }

    function isTrainer() {
      return signedIn() && userExists(request.auth.uid)
             && userData(request.auth.uid).role == 'trainer';
    }

    function isStudent(uid) {
      return userExists(uid) && userData(uid).role == 'student';
    }

    function owns(userId) {
      return signedIn() && request.auth.uid == userId;
    }

    // Cada exercício pode ter até oito semanas personalizadas. Cada semana
    // guarda no máximo 30 séries prescritas; somente o treinador escreve esse
    // campo porque ele vive no documento de exercises.
    function validWeeklyPlan(data) {
      let plan = data.get('weeklyPlan', {});
      return plan is map
             && plan.keys().hasOnly(['w1', 'w2', 'w3', 'w4', 'w5', 'w6', 'w7', 'w8'])
             && plan.get('w1', []) is list && plan.get('w1', []).size() <= 30
             && plan.get('w2', []) is list && plan.get('w2', []).size() <= 30
             && plan.get('w3', []) is list && plan.get('w3', []).size() <= 30
             && plan.get('w4', []) is list && plan.get('w4', []).size() <= 30
             && plan.get('w5', []) is list && plan.get('w5', []).size() <= 30
             && plan.get('w6', []) is list && plan.get('w6', []).size() <= 30
             && plan.get('w7', []) is list && plan.get('w7', []).size() <= 30
             && plan.get('w8', []) is list && plan.get('w8', []).size() <= 30;
    }

    // Perfil: o aluno lê apenas o próprio documento e não pode reativar a si
    // mesmo nem trocar o papel. O treinador lista alunos e altera o status.
    match /users/{uid} {
      allow read: if signedIn() && (request.auth.uid == uid || isTrainer());
      allow create: if signedIn() && request.auth.uid == uid
                    && request.resource.data.role == 'student'
                    && request.resource.data.status == 'active'
                    && request.resource.data.name is string
                    && request.resource.data.name.size() > 0
                    && request.resource.data.name.size() <= 100
                    && request.resource.data.email is string
                    && request.resource.data.email.size() <= 320;
      allow update: if signedIn() && (
        (request.auth.uid == uid
          && request.resource.data.name is string
          && request.resource.data.name.size() > 0
          && request.resource.data.name.size() <= 100
          && request.resource.data.email is string
          && request.resource.data.email.size() <= 320
          && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['name', 'email']))
        || (isTrainer() && request.resource.data.role == resource.data.role)
      );
      allow delete: if false;
    }

    // Estrutura do plano: somente o treinador grava. userId é obrigatório e
    // vincula cada documento ao aluno correto.
    match /workouts/{id} {
      allow read: if signedIn() && (isTrainer() || owns(resource.data.userId));
      allow create: if isTrainer() && request.resource.data.userId is string
                    && request.resource.data.name is string
                    && request.resource.data.name.size() > 0
                    && request.resource.data.name.size() <= 60
                    && request.resource.data.color is string
                    && isStudent(request.resource.data.userId);
      allow update: if isTrainer()
                    && request.resource.data.userId == resource.data.userId
                    && request.resource.data.name is string
                    && request.resource.data.name.size() > 0
                    && request.resource.data.name.size() <= 60
                    && request.resource.data.color is string
                    && isStudent(resource.data.userId);
      allow delete: if isTrainer();
    }

    match /exercises/{id} {
      allow read: if signedIn() && (isTrainer() || owns(resource.data.userId));
      allow create: if isTrainer()
                    && request.resource.data.userId is string
                    && request.resource.data.workoutId is string
                    && request.resource.data.name is string
                    && request.resource.data.name.size() > 0
                    && request.resource.data.name.size() <= 100
                    && validWeeklyPlan(request.resource.data)
                    && isStudent(request.resource.data.userId)
                    && exists(/databases/$(database)/documents/workouts/$(request.resource.data.workoutId))
                    && get(/databases/$(database)/documents/workouts/$(request.resource.data.workoutId)).data.userId
                       == request.resource.data.userId;
      allow update: if isTrainer()
                    && request.resource.data.userId == resource.data.userId
                    && request.resource.data.workoutId is string
                    && request.resource.data.name is string
                    && request.resource.data.name.size() > 0
                    && request.resource.data.name.size() <= 100
                    && validWeeklyPlan(request.resource.data)
                    && exists(/databases/$(database)/documents/workouts/$(request.resource.data.workoutId))
                    && get(/databases/$(database)/documents/workouts/$(request.resource.data.workoutId)).data.userId
                       == resource.data.userId;
      allow delete: if isTrainer();
    }

    // Histórico: aluno só lê e altera as próprias sessões. O exercício e o
    // treino informados precisam pertencer a ele, impedindo IDs forjados.
    match /sessions/{id} {
      allow read: if signedIn() && (isTrainer() || owns(resource.data.userId));
      allow create: if signedIn()
                    && request.resource.data.userId == request.auth.uid
                    && request.resource.data.workoutId is string
                    && request.resource.data.exerciseId is string
                    && request.resource.data.date is string
                    && request.resource.data.date.matches('^[0-9]{4}-[0-9]{2}-[0-9]{2}$')
                    && request.resource.data.note is string
                    && request.resource.data.note.size() <= 2000
                    && request.resource.data.exerciseName is string
                    && request.resource.data.exerciseName.size() <= 100
                    && (request.resource.data.week == null
                        || (request.resource.data.week is int
                            && request.resource.data.week >= 1
                            && request.resource.data.week <= 8))
                    && request.resource.data.sets is list
                    && request.resource.data.sets.size() > 0
                    && request.resource.data.sets.size() <= 30
                    && exists(/databases/$(database)/documents/exercises/$(request.resource.data.exerciseId))
                    && get(/databases/$(database)/documents/exercises/$(request.resource.data.exerciseId)).data.userId
                       == request.auth.uid
                    && get(/databases/$(database)/documents/exercises/$(request.resource.data.exerciseId)).data.workoutId
                       == request.resource.data.workoutId;
      allow update: if owns(resource.data.userId)
                    && request.resource.data.userId == resource.data.userId
                    && request.resource.data.workoutId == resource.data.workoutId
                    && request.resource.data.exerciseId == resource.data.exerciseId
                    && request.resource.data.date is string
                    && request.resource.data.date.matches('^[0-9]{4}-[0-9]{2}-[0-9]{2}$')
                    && request.resource.data.note is string
                    && request.resource.data.note.size() <= 2000
                    && request.resource.data.exerciseName is string
                    && request.resource.data.exerciseName.size() <= 100
                    && request.resource.data.week is int
                    && request.resource.data.week >= 1
                    && request.resource.data.week <= 8
                    && request.resource.data.sets is list
                    && request.resource.data.sets.size() > 0
                    && request.resource.data.sets.size() <= 30
                    && request.resource.data.diff(resource.data).affectedKeys()
                       .hasOnly(['date', 'week', 'note', 'sets', 'exerciseName']);
      allow delete: if owns(resource.data.userId);
    }

    // Feedback: aluno só pode marcar como lido; conteúdo e destinatário ficam
    // imutáveis para ele.
    match /feedback/{id} {
      allow read: if signedIn() && (isTrainer() || resource.data.studentId == request.auth.uid);
      allow create: if isTrainer()
                    && request.resource.data.trainerId == request.auth.uid
                    && isStudent(request.resource.data.studentId)
                    && request.resource.data.message is string
                    && request.resource.data.message.size() > 0
                    && request.resource.data.message.size() <= 5000;
      allow update: if signedIn() && (
        (isTrainer()
          && request.resource.data.studentId == resource.data.studentId
          && request.resource.data.trainerId == resource.data.trainerId)
        || (resource.data.studentId == request.auth.uid
          && request.resource.data.studentId == resource.data.studentId
          && request.resource.data.trainerId == resource.data.trainerId
          && request.resource.data.read == true
          && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['read']))
      );
      allow delete: if false;
    }

    // Questionário: treinador cria; aluno só preenche campos de resposta.
    match /questionnaires/{id} {
      allow read: if signedIn() && (isTrainer() || resource.data.studentId == request.auth.uid);
      allow create: if isTrainer()
                    && request.resource.data.trainerId == request.auth.uid
                    && isStudent(request.resource.data.studentId)
                    && request.resource.data.questions is list
                    && request.resource.data.questions.size() > 0
                    && request.resource.data.questions.size() <= 100;
      allow update: if signedIn() && (
        (isTrainer()
          && request.resource.data.studentId == resource.data.studentId
          && request.resource.data.trainerId == resource.data.trainerId)
        || (resource.data.studentId == request.auth.uid
          && request.resource.data.studentId == resource.data.studentId
          && request.resource.data.trainerId == resource.data.trainerId
          && request.resource.data.answered == true
          && request.resource.data.answers is list
          && request.resource.data.answers.size() == resource.data.questions.size()
          && request.resource.data.diff(resource.data).affectedKeys()
             .hasOnly(['answers', 'answered', 'answeredAt']))
      );
      allow delete: if false;
    }

    // Plano alimentar por aluno: treinador edita; aluno lê o próprio.
    match /mealPlans/{uid} {
      allow read: if signedIn() && (request.auth.uid == uid || isTrainer());
      allow write: if isTrainer() && isStudent(uid);
    }

    // Marcação diária de refeição concluída.
    match /mealCompletions/{id} {
      allow read: if signedIn() && (isTrainer() || resource.data.studentUid == request.auth.uid);
      allow create: if signedIn()
                    && request.resource.data.studentUid == request.auth.uid
                    && request.resource.data.mealId is string
                    && request.resource.data.date is string
                    && request.resource.data.date.matches('^[0-9]{4}-[0-9]{2}-[0-9]{2}$');
      allow update: if signedIn()
                    && resource.data.studentUid == request.auth.uid
                    && request.resource.data.studentUid == resource.data.studentUid
                    && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['mealId', 'date']);
      allow delete: if signedIn() && resource.data.studentUid == request.auth.uid;
    }

    // Foto em base64 comprimido. O limite mantém o documento abaixo do teto do
    // Firestore e coincide com a validação do aplicativo.
    match /progressPhotos/{id} {
      allow read: if signedIn() && (isTrainer() || resource.data.userId == request.auth.uid);
      allow create: if signedIn()
                    && request.resource.data.userId == request.auth.uid
                    && request.resource.data.date is string
                    && request.resource.data.get('weight', 0) is number
                    && (request.resource.data.get('weight', 0) == 0
                        || (request.resource.data.get('weight', 0) >= 20
                            && request.resource.data.get('weight', 0) <= 500))
                    && request.resource.data.dataUrl is string
                    && request.resource.data.dataUrl.size() <= 900000
                    && request.resource.data.dataUrl.matches('^data:image/jpeg;base64,[A-Za-z0-9+/=]+$');
      allow update: if false;
      allow delete: if signedIn() && resource.data.userId == request.auth.uid;
    }

    // Tabelas globais de substituições: autenticados leem; treinador edita.
    match /foodOptions/{id} {
      allow read: if signedIn();
      allow create, update, delete: if isTrainer();
    }

    match /exerciseOptions/{id} {
      allow read: if signedIn();
      allow create, update, delete: if isTrainer();
    }
  }
}
