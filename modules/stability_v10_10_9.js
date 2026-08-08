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

    // O fluxo original consultava diretamente weeklyCheckins/{id} antes da primeira
    // criação. Como a regra de leitura depende de resource.data.studentId, um get()
    // em um documento ainda inexistente pode ser negado. A consulta abaixo fica
    // restrita ao próprio aluno e mantém a proteção contra envios duplicados.
    if(typeof window.submitWeeklyCheckin==='function'){
      window.submitWeeklyCheckin=async function(){
        const request=WEEKLY_CHECKIN_REQUEST,studentUid=CURRENT_USER?.uid;if(!request||!studentUid||CURRENT_USER?.role!=='student')return;
        const weight=Number(String(document.getElementById('weekly-checkin-weight').value||'').replace(',','.'));if(!Number.isFinite(weight)||weight<20||weight>500){alert('Informe um peso válido entre 20 e 500 kg.');return;}
        const areas=[...document.querySelectorAll('[data-weekly-question]')],answers=areas.map(area=>area.value.normalize('NFKC').trim());if(answers.some(answer=>!answer)){alert('Responda todas as perguntas do relatório semanal.');return;}
        if(WEEKLY_CHECKIN_FILES.some(file=>!(file instanceof File))){alert('Envie obrigatoriamente as seis fotos: frente, costas, lado direito, lado esquerdo, frente contraída e costas contraída.');return;}
        if(!beginAction('weekly-checkin-submit','modal-weekly-checkin'))return;
        const {questions,sectionAt}=buildWeeklyCheckinQuestions(),checkinId=weeklyCheckinDocId(studentUid,request.requestKey),photoIds=[],photoWrites=[];const createdPaths=[];
        try{
          const checkinRef=db.collection('weeklyCheckins').doc(checkinId);
          const existingCheckins=await cloudGet(
            db.collection('weeklyCheckins').where('studentId','==',studentUid).where('requestKey','==',request.requestKey).limit(1),
            'verificar relatório semanal'
          );
          if(!existingCheckins.empty)throw new Error('Este relatório já foi enviado. Atualize a página para ver o histórico.');
          for(let index=0;index<6;index++){
            showToast('Preparando foto '+(index+1)+' de 6...');
            const photoId=(checkinId+'-p'+(index+1)).slice(0,190),photoRef=db.collection('progressPhotos').doc(photoId);photoIds.push(photoId);
            const variants=await buildProgressPhotoVariants(WEEKLY_CHECKIN_FILES[index]),photoPath=await uploadCloudPhoto('progressPhotos',studentUid,photoId,variants.full);if(photoPath)createdPaths.push(photoPath);
            const thumbPath=photoPath?await uploadCloudPhoto('progressPhotoThumbs',studentUid,photoId,variants.thumb):'';if(thumbPath)createdPaths.push(thumbPath);
            const payload={userId:studentUid,date:today(),weight:Math.round(weight*10)/10,checkinId,pose:CHECKIN_POSES[index],createdAt:firebase.firestore.FieldValue.serverTimestamp()};if(photoPath){payload.photoPath=photoPath;if(thumbPath)payload.thumbPath=thumbPath;}else payload.dataUrl=variants.full;
            photoWrites.push({ref:photoRef,payload});
          }
          const checkinPayload={studentId:studentUid,requestKey:request.requestKey,requestKind:request.kind,dueDate:request.dueDate,submittedDate:today(),weight:Math.round(weight*10)/10,questions,sectionAt,answers,photoIds,createdAt:firebase.firestore.FieldValue.serverTimestamp()};
          const batch=db.batch();photoWrites.forEach(write=>batch.set(write.ref,write.payload));batch.set(checkinRef,checkinPayload);
          try{await cloudWrite(batch.commit(),'enviar relatório semanal e seis fotos');}
          catch(error){
            const verified=await cloudGet(checkinRef,'confirmar relatório semanal').catch(()=>null);
            if(!verified?.exists){await Promise.allSettled(createdPaths.map(path=>deleteCloudPhoto(path)));throw error;}
          }
          clearWeeklyCheckinPreviews();WEEKLY_CHECKIN_FILES=Array(6).fill(null);closeModal('modal-weekly-checkin');showToast('✓ Relatório semanal enviado com todas as respostas e 6 fotos');await loadWeeklyCheckinState(true);renderCalendar();
        }catch(error){await Promise.allSettled(createdPaths.map(path=>deleteCloudPhoto(path)));alert(cloudWriteError(error,'enviar o relatório semanal'));}
        finally{endAction('weekly-checkin-submit','modal-weekly-checkin');}
      };
    }

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
