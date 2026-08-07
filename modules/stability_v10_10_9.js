/* Team Bulls v10.10.9 — correções de estabilidade sem migração de dados. */
'use strict';
(()=>{
  const install=()=>{
    const TB=window.TeamBulls107;
    if(!TB||TB.__stabilityPatchV10109)return false;
    TB.__stabilityPatchV10109=true;
    const clone=value=>{try{return JSON.parse(JSON.stringify(value??null));}catch(error){return null;}};

    // Restauração tolerante a falhas: grava o estado desejado antes de apagar
    // documentos obsoletos. Uma queda de rede deixa o plano antigo recuperável.
    TB.replaceCloudPlan=async function(studentId,snapshot){
      if(CURRENT_USER?.role!=='trainer')throw new Error('Somente o treinador pode restaurar planos na nuvem.');
      if(!studentId||!await TB.ensureCloud())throw new Error('Conexão com o Firebase indisponível.');
      if(!snapshot||!Array.isArray(snapshot.workouts))throw new Error('Versão inválida ou incompleta.');

      const [workoutsSnap,exercisesSnap]=await Promise.all([
        cloudGet(db.collection('workouts').where('userId','==',studentId),'treinos atuais'),
        cloudGet(db.collection('exercises').where('userId','==',studentId),'exercícios atuais')
      ]);
      const wantedWorkouts=new Set(),wantedExercises=new Set(),upserts=[];

      snapshot.workouts.forEach((workout,wIndex)=>{
        const workoutId=String(workout?.id||uid());
        wantedWorkouts.add(workoutId);
        const workoutData=clone(workout)||{};
        delete workoutData.id;delete workoutData.exercises;delete workoutData.sessions;delete workoutData.createdAt;delete workoutData.userId;
        upserts.push(batch=>batch.set(db.collection('workouts').doc(workoutId),{
          ...workoutData,userId:studentId,
          order:Number.isFinite(Number(workoutData.order))?Number(workoutData.order):wIndex,
          updatedAt:firebase.firestore.FieldValue.serverTimestamp()
        },{merge:true}));

        (workout?.exercises||[]).forEach((exercise,eIndex)=>{
          const exerciseId=String(exercise?.id||uid());
          wantedExercises.add(exerciseId);
          const exerciseData=clone(exercise)||{};
          delete exerciseData.id;delete exerciseData.sessions;delete exerciseData.createdAt;delete exerciseData.userId;delete exerciseData.workoutId;
          upserts.push(batch=>batch.set(db.collection('exercises').doc(exerciseId),{
            ...exerciseData,userId:studentId,workoutId,
            order:Number.isFinite(Number(exerciseData.order))?Number(exerciseData.order):eIndex,
            updatedAt:firebase.firestore.FieldValue.serverTimestamp()
          },{merge:true}));
        });
      });

      await TB.commitOperations(upserts,'gravar estrutura restaurada');
      if(snapshot.diet&&typeof snapshot.diet==='object'){
        await cloudWrite(db.collection('mealPlans').doc(studentId).set({
          plans:clone(snapshot.diet.plans||[]),updatedAt:firebase.firestore.FieldValue.serverTimestamp()
        },{merge:true}),'restaurar dieta');
      }

      const cleanup=[];
      exercisesSnap.docs.forEach(doc=>{if(!wantedExercises.has(doc.id))cleanup.push(batch=>batch.delete(doc.ref));});
      workoutsSnap.docs.forEach(doc=>{if(!wantedWorkouts.has(doc.id))cleanup.push(batch=>batch.delete(doc.ref));});
      await TB.commitOperations(cleanup,'limpar estrutura obsoleta');
      return true;
    };

    // Evita manter blobs de imagens vivos depois que a página deixa de existir.
    window.addEventListener('pagehide',()=>{
      try{
        if(typeof MEDIA_OBJECT_URLS!=='undefined'){
          MEDIA_OBJECT_URLS.forEach(url=>{try{URL.revokeObjectURL(url);}catch(error){}});
          MEDIA_OBJECT_URLS.clear();
        }
      }catch(error){}
    },{once:true});
    return true;
  };

  if(!install())window.addEventListener('team-bulls-v107-ready',install,{once:true});
})();
