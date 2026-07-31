/* Team Bulls v10.7.1 — núcleo de continuidade, versões, rascunhos e auditoria. */
'use strict';
(function(){
  const TB=window.TeamBulls107=window.TeamBulls107||{};
  TB.version='10.7.1';
  TB.schemaVersion=1;
  TB.state={appCheck:'desativado',lastError:'',restoring:false};
  const PREFIX='team_bulls_v107_';
  const MAX_UNDO=20,MAX_VERSIONS=35,MAX_DRAFT_AGE=1000*60*60*12;
  const wrapped=new Set();
  const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const clone=value=>{try{return JSON.parse(JSON.stringify(value??null));}catch(error){return null;}};
  const cleanText=(value,max=200)=>String(value||'').normalize('NFKC').trim().slice(0,max);
  const nowIso=()=>new Date().toISOString();
  const safeParse=(value,fallback)=>{try{return JSON.parse(value);}catch(error){return fallback;}};
  const keyPart=value=>String(value||'local').replace(/[^a-zA-Z0-9_-]/g,'_').slice(0,120)||'local';
  const simpleHash=value=>{
    const text=typeof value==='string'?value:JSON.stringify(value);
    let h=2166136261;
    for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}
    return(h>>>0).toString(16).padStart(8,'0');
  };
  function localRead(key,fallback){return safeParse(storageGet(PREFIX+key)||'',fallback);}
  function localWrite(key,value){return storageSet(PREFIX+key,JSON.stringify(value));}
  function targetUid(){
    if(CURRENT_USER?.role==='trainer')return VIEW_STUDENT?.uid||DIET_CONTEXT?.targetUid||'';
    if(CURRENT_USER?.role==='student')return CURRENT_USER.uid;
    return LOCAL_OWNER_UID||INACTIVE_UID||'local';
  }
  function actorUid(){return CURRENT_USER?.uid||LOCAL_OWNER_UID||'local';}
  function contextKey(suffix){return keyPart(actorUid())+'_'+keyPart(targetUid())+'_'+suffix;}
  function stripFirestoreValue(value){
    if(value==null)return value;
    if(Array.isArray(value))return value.map(stripFirestoreValue);
    if(typeof value==='object'){
      if(typeof value.toDate==='function')return value.toDate().toISOString();
      if(Number.isFinite(value.seconds))return new Date(value.seconds*1000).toISOString();
      const out={};
      Object.keys(value).forEach(key=>{if(!key.startsWith('_'))out[key]=stripFirestoreValue(value[key]);});
      return out;
    }
    return value;
  }
  function sanitizeWorkout(workout,{includeSessions=false}={}){
    const out=stripFirestoreValue(clone(workout)||{});
    delete out.userId;delete out.createdAt;
    out.id=String(workout?.id||out.id||uid());
    out.exercises=(workout?.exercises||[]).map(exercise=>{
      const item=stripFirestoreValue(clone(exercise)||{});
      delete item.userId;delete item.workoutId;delete item.createdAt;
      item.id=String(exercise?.id||item.id||uid());
      if(includeSessions)item.sessions=stripFirestoreValue(clone(exercise?.sessions||[]));else delete item.sessions;
      return item;
    });
    return out;
  }
  function currentWorkouts(){
    if(CURRENT_USER?.role==='trainer'&&VIEW_STUDENT?.workouts)return VIEW_STUDENT.workouts;
    if(MODE==='local')return LOCAL_DB?.workouts||[];
    return CLOUD_WORKOUTS||[];
  }
  function currentDietFor(uidValue){
    const expected=String(uidValue||'');
    if(DIET_CONTEXT?.local&&MODE==='local')return clone(DIET_DOCUMENT||LOCAL_DB?.mealPlan||{plans:[]});
    if(DIET_CONTEXT?.targetUid&&String(DIET_CONTEXT.targetUid)===expected)return clone(DIET_DOCUMENT||{plans:[]});
    return null;
  }
  TB.snapshot=function(options={}){
    const uidValue=options.targetUid||targetUid();
    const localMode=MODE==='local'&&CURRENT_USER?.role!=='trainer';
    const workouts=(options.workouts||currentWorkouts()).map(workout=>sanitizeWorkout(workout,{includeSessions:localMode}));
    const diet=options.diet!==undefined?clone(options.diet):currentDietFor(uidValue);
    return{
      schemaVersion:TB.schemaVersion,
      targetUid:String(uidValue||''),
      targetName:cleanText(VIEW_STUDENT?.name||CURRENT_USER?.name||INACTIVE_NAME||'Plano local',120),
      createdAt:nowIso(),
      mode:localMode?'local':'cloud',
      workouts,
      diet:diet&&typeof diet==='object'?stripFirestoreValue(diet):null
    };
  };
  TB.snapshotHash=snapshot=>simpleHash({workouts:snapshot?.workouts||[],diet:snapshot?.diet||null});
  function stackRead(kind){return localRead(contextKey(kind),[]);}
  function stackWrite(kind,items){return localWrite(contextKey(kind),items.slice(-MAX_UNDO));}
  TB.pushUndo=function(snapshot,label='Alteração'){
    const items=stackRead('undo');
    const hash=TB.snapshotHash(snapshot);
    if(items.at(-1)?.hash===hash)return;
    items.push({id:uid(),label:cleanText(label,160),createdAt:nowIso(),hash,snapshot});
    stackWrite('undo',items);stackWrite('redo',[]);
    window.dispatchEvent(new CustomEvent('team-bulls-v107-state'));
  };
  function versionLocalRead(){return localRead(contextKey('versions'),[]);}
  function versionLocalWrite(items){return localWrite(contextKey('versions'),items.slice(-MAX_VERSIONS));}
  TB.saveLocalVersion=function(snapshot,label,source='manual'){
    const items=versionLocalRead(),hash=TB.snapshotHash(snapshot);
    if(source!=='manual'&&items.at(-1)?.hash===hash)return items.at(-1)||null;
    const item={id:uid(),label:cleanText(label||'Ponto de restauração',160),source,createdAt:nowIso(),hash,snapshot};
    items.push(item);versionLocalWrite(items);window.dispatchEvent(new CustomEvent('team-bulls-v107-state'));return item;
  };
  TB.getLocalVersions=()=>versionLocalRead().slice().reverse();
  async function ensureCloud(){
    if(db&&auth)return true;
    return !!(await ensureFirebaseReady().catch(()=>false));
  }
  TB.audit=async function(action,details={}){
    if(CURRENT_USER?.role!=='trainer'||!targetUid()||!await ensureCloud())return false;
    try{
      const data={
        trainerId:CURRENT_USER.uid,studentId:targetUid(),action:cleanText(action,160),entity:cleanText(details.entity||'plano',80),
        summary:cleanText(details.summary||'',500),metadata:stripFirestoreValue(details.metadata||{}),createdAt:firebase.firestore.FieldValue.serverTimestamp()
      };
      await cloudWrite(db.collection('auditLogs').add(data),'registrar auditoria');return true;
    }catch(error){console.warn('Auditoria não registrada',error);return false;}
  };
  TB.createNotification=async function({studentId,title,body,type='info',dedupeMinutes=0}={}){
    if(CURRENT_USER?.role!=='trainer'||!studentId||!await ensureCloud())return false;
    const dedupeKey='notice_'+keyPart(studentId)+'_'+keyPart(type);
    const last=Number(storageGet(PREFIX+dedupeKey)||0);
    if(dedupeMinutes&&Date.now()-last<dedupeMinutes*60000)return false;
    try{
      await cloudWrite(db.collection('notifications').add({
        trainerId:CURRENT_USER.uid,studentId,title:cleanText(title,120),body:cleanText(body,1200),type:cleanText(type,40),readAt:null,createdAt:firebase.firestore.FieldValue.serverTimestamp()
      }),'enviar aviso');storageSet(PREFIX+dedupeKey,String(Date.now()));return true;
    }catch(error){console.warn('Aviso não enviado',error);return false;}
  };
  TB.saveVersion=async function(label='Ponto de restauração',source='manual',snapshot=null){
    const snap=snapshot||TB.snapshot();
    const localItem=TB.saveLocalVersion(snap,label,source);
    if(CURRENT_USER?.role!=='trainer'||!snap.targetUid||!await ensureCloud())return localItem;
    try{
      const ref=await cloudWrite(db.collection('planVersions').add({
        trainerId:CURRENT_USER.uid,studentId:snap.targetUid,label:cleanText(label,160),source:cleanText(source,40),schemaVersion:TB.schemaVersion,
        snapshot:snap,createdAt:firebase.firestore.FieldValue.serverTimestamp()
      }),'salvar versão');
      await TB.audit('Versão salva',{entity:'versão',summary:label,metadata:{versionId:ref.id,source}});
      return{...localItem,cloudId:ref.id};
    }catch(error){console.warn('Versão salva apenas localmente',error);return localItem;}
  };
  async function commitOperations(operations,label){
    if(!operations.length)return;
    for(let start=0;start<operations.length;start+=440){
      const batch=db.batch();
      operations.slice(start,start+440).forEach(operation=>operation(batch));
      await cloudWrite(batch.commit(),label);
    }
  }
  function workoutCloudData(workout,studentId,index){
    const data=clone(workout)||{};delete data.id;delete data.exercises;delete data.sessions;delete data.createdAt;delete data.userId;
    return{...data,userId:studentId,order:Number.isFinite(Number(data.order))?Number(data.order):index,createdAt:firebase.firestore.FieldValue.serverTimestamp()};
  }
  function exerciseCloudData(exercise,studentId,workoutId,index){
    const data=clone(exercise)||{};delete data.id;delete data.sessions;delete data.createdAt;delete data.userId;delete data.workoutId;
    return{...data,userId:studentId,workoutId,order:Number.isFinite(Number(data.order))?Number(data.order):index,createdAt:firebase.firestore.FieldValue.serverTimestamp()};
  }
  TB.replaceCloudPlan=async function(studentId,snapshot){
    if(CURRENT_USER?.role!=='trainer')throw new Error('Somente o treinador pode restaurar planos na nuvem.');
    if(!studentId||!await ensureCloud())throw new Error('Conexão com o Firebase indisponível.');
    const [workoutsSnap,exercisesSnap]=await Promise.all([
      cloudGet(db.collection('workouts').where('userId','==',studentId),'treinos atuais'),
      cloudGet(db.collection('exercises').where('userId','==',studentId),'exercícios atuais')
    ]);
    const remove=[];
    exercisesSnap.docs.forEach(doc=>remove.push(batch=>batch.delete(doc.ref)));
    workoutsSnap.docs.forEach(doc=>remove.push(batch=>batch.delete(doc.ref)));
    await commitOperations(remove,'remover estrutura anterior');
    const add=[];
    (snapshot.workouts||[]).forEach((workout,wIndex)=>{
      const workoutId=String(workout.id||uid());
      add.push(batch=>batch.set(db.collection('workouts').doc(workoutId),workoutCloudData(workout,studentId,wIndex)));
      (workout.exercises||[]).forEach((exercise,eIndex)=>{
        const exerciseId=String(exercise.id||uid());
        add.push(batch=>batch.set(db.collection('exercises').doc(exerciseId),exerciseCloudData(exercise,studentId,workoutId,eIndex)));
      });
    });
    await commitOperations(add,'restaurar estrutura do plano');
    if(snapshot.diet&&typeof snapshot.diet==='object'){
      await cloudWrite(db.collection('mealPlans').doc(studentId).set({plans:clone(snapshot.diet.plans||[]),updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true}),'restaurar dieta');
    }
    return true;
  };
  TB.restoreSnapshot=async function(snapshot,{label='Restauração',recordCurrent=true}={}){
    if(!snapshot||!Array.isArray(snapshot.workouts))throw new Error('Versão inválida ou incompleta.');
    if(TB.state.restoring)throw new Error('Já existe uma restauração em andamento.');
    TB.state.restoring=true;window.dispatchEvent(new CustomEvent('team-bulls-v107-state'));
    try{
      const current=TB.snapshot();
      if(recordCurrent)TB.pushUndo(current,'Antes de '+label);
      if(MODE==='local'&&CURRENT_USER?.role!=='trainer'){
        const previous=clone(LOCAL_DB);
        LOCAL_DB={...LOCAL_DB,workouts:normalizeWorkoutCollection(clone(snapshot.workouts)||[]),mealPlan:clone(snapshot.diet||LOCAL_DB.mealPlan||{plans:[]})};
        if(!localSave()){LOCAL_DB=previous;throw new Error('Não foi possível salvar a restauração no aparelho.');}
        renderHome();
      }else{
        const studentId=snapshot.targetUid||targetUid();
        if(!studentId)throw new Error('Aluno não identificado.');
        await TB.replaceCloudPlan(studentId,snapshot);
        if(VIEW_STUDENT?.uid===studentId)await renderTrainerStudent({...VIEW_STUDENT});
        else if(CURRENT_USER?.uid===studentId)await loadCloudHome();
      }
      await TB.audit('Plano restaurado',{entity:'versão',summary:label,metadata:{snapshotHash:TB.snapshotHash(snapshot)}});
      showToast('✓ Plano restaurado. As sessões históricas foram preservadas.');
      return true;
    }finally{TB.state.restoring=false;window.dispatchEvent(new CustomEvent('team-bulls-v107-state'));}
  };
  TB.undo=async function(){
    const undo=stackRead('undo');if(!undo.length){showToast('Nenhuma alteração disponível para desfazer.',true);return false;}
    const item=undo.pop(),current=TB.snapshot(),redo=stackRead('redo');redo.push({id:uid(),label:'Refazer '+item.label,createdAt:nowIso(),hash:TB.snapshotHash(current),snapshot:current});
    stackWrite('undo',undo);stackWrite('redo',redo);await TB.restoreSnapshot(item.snapshot,{label:'desfazer '+item.label,recordCurrent:false});return true;
  };
  TB.redo=async function(){
    const redo=stackRead('redo');if(!redo.length){showToast('Nenhuma alteração disponível para refazer.',true);return false;}
    const item=redo.pop(),current=TB.snapshot(),undo=stackRead('undo');undo.push({id:uid(),label:'Antes de refazer',createdAt:nowIso(),hash:TB.snapshotHash(current),snapshot:current});
    stackWrite('redo',redo);stackWrite('undo',undo);await TB.restoreSnapshot(item.snapshot,{label:item.label,recordCurrent:false});return true;
  };
  TB.undoCount=()=>stackRead('undo').length;
  TB.redoCount=()=>stackRead('redo').length;

  /* Rascunhos de formulários: não armazena senha, arquivo ou credenciais. */
  function modalEntityKey(modalId){
    const candidates=[typeof EDIT_W!=='undefined'?EDIT_W:'',typeof EDIT_EX!=='undefined'?EDIT_EX:'',typeof EDIT_DIET_PLAN_ID!=='undefined'?EDIT_DIET_PLAN_ID:'',typeof EDIT_DIET_VARIANT_ID!=='undefined'?EDIT_DIET_VARIANT_ID:'',typeof EDIT_MEAL!=='undefined'?EDIT_MEAL:''];
    return modalId+'_'+keyPart(candidates.filter(Boolean).join('_')||'novo');
  }
  function draftKey(modalId){return contextKey('form_'+modalEntityKey(modalId));}
  function captureModalDraft(modal){
    if(!modal?.classList.contains('open'))return;
    const values={};
    modal.querySelectorAll('input,textarea,select').forEach(field=>{
      if(!field.id||field.type==='password'||field.type==='file'||field.type==='hidden')return;
      values[field.id]=field.type==='checkbox'?!!field.checked:String(field.value||'');
    });
    if(!Object.keys(values).length)return;
    localWrite(draftKey(modal.id),{updatedAt:Date.now(),values});
    TB.state.lastDraftAt=Date.now();window.dispatchEvent(new CustomEvent('team-bulls-v107-state'));
  }
  function restoreModalDraft(modal){
    const draft=localRead(draftKey(modal.id),null);if(!draft||Date.now()-Number(draft.updatedAt)>MAX_DRAFT_AGE)return false;
    let restored=0;
    Object.entries(draft.values||{}).forEach(([id,value])=>{
      const field=document.getElementById(id);if(!field||!modal.contains(field))return;
      const isEmpty=field.type==='checkbox'?!field.checked:String(field.value||'').trim()==='';
      if(!isEmpty)return;
      if(field.type==='checkbox')field.checked=!!value;else field.value=String(value||'');
      field.dispatchEvent(new Event('input',{bubbles:true}));restored++;
    });
    if(restored)showToast('Rascunho automático recuperado.');return !!restored;
  }
  TB.clearOpenDraft=function(modalId){if(modalId)storageRemove(PREFIX+draftKey(modalId));};
  let formDraftTimer=null;
  document.addEventListener('input',event=>{
    const modal=event.target?.closest?.('.modal-backdrop.open');if(!modal)return;
    clearTimeout(formDraftTimer);formDraftTimer=setTimeout(()=>captureModalDraft(modal),450);
  },true);
  const baseOpenModal=openModal;
  openModal=function(id){const result=baseOpenModal(id);setTimeout(()=>{const modal=document.getElementById(id);if(modal)restoreModalDraft(modal);},80);return result;};

  /* Rascunho estrutural periódico, útil mesmo antes de uma versão manual. */
  let lastPlanDraftHash='';
  function savePlanDraft(){
    try{
      const snap=TB.snapshot();if(!snap.workouts.length&&!snap.diet)return;
      const hash=TB.snapshotHash(snap);if(hash===lastPlanDraftHash)return;
      localWrite(contextKey('plan_draft'),{updatedAt:Date.now(),hash,snapshot:snap});lastPlanDraftHash=hash;TB.state.lastDraftAt=Date.now();
      window.dispatchEvent(new CustomEvent('team-bulls-v107-state'));
    }catch(error){}
  }
  TB.getPlanDraft=()=>localRead(contextKey('plan_draft'),null);
  setInterval(savePlanDraft,20000);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')savePlanDraft();});
  window.addEventListener('pagehide',savePlanDraft);

  /* Marca sincronizações reais sem alterar o comportamento original. */
  const baseCloudWrite=cloudWrite;
  cloudWrite=async function(task,label='gravação'){
    const result=await baseCloudWrite(task,label);
    storageSet(PREFIX+'last_cloud_success',String(Date.now()));
    window.dispatchEvent(new CustomEvent('team-bulls-v107-sync'));
    return result;
  };
  TB.lastCloudSuccess=()=>Number(storageGet(PREFIX+'last_cloud_success')||0);

  /* App Check compatível com reCAPTCHA Enterprise, com fallback para chave v3. */
  initOptionalAppCheck=async function(){
    const key=String(CFG.appCheckSiteKey||'').trim();
    if(!key){TB.state.appCheck='chave não configurada';return false;}
    if(typeof firebase==='undefined'){TB.state.appCheck='Firebase indisponível';return false;}
    const ok=await loadSdkOnce('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-check-compat.js',()=>typeof firebase.appCheck==='function');
    if(!ok){TB.state.appCheck='SDK indisponível';return false;}
    try{
      const appCheck=firebase.appCheck();
      if(firebase.appCheck.ReCaptchaEnterpriseProvider){appCheck.activate(new firebase.appCheck.ReCaptchaEnterpriseProvider(key),true);TB.state.appCheck='ativo · reCAPTCHA Enterprise';}
      else{appCheck.activate(key,true);TB.state.appCheck='ativo · reCAPTCHA v3';}
      window.dispatchEvent(new CustomEvent('team-bulls-v107-state'));return true;
    }catch(error){TB.state.appCheck='falha: '+cleanText(error?.message,120);console.warn('App Check não iniciado',error);return false;}
  };

  const mutationMap={
    saveWorkout:{label:'Salvar protocolo',entity:'treino',modal:'modal-workout',notice:'Seu protocolo de treino foi atualizado.'},
    saveDayFolder:{label:'Salvar dia de treino',entity:'treino',modal:'modal-day-folder',notice:'A organização do seu treino foi atualizada.'},
    saveExercise:{label:'Salvar exercício',entity:'exercício',modal:'modal-exercise',notice:'Um exercício do seu protocolo foi atualizado.'},
    savePrescription:{label:'Salvar prescrição semanal',entity:'prescrição',modal:'modal-prescription',notice:'Sua prescrição de treino foi atualizada.'},
    saveBulkPrescription:{label:'Aplicar prescrição em massa',entity:'prescrição',modal:'modal-bulk-prescription',notice:'Sua prescrição de treino foi atualizada.'},
    saveCurrentWeekTechniques:{label:'Salvar técnicas semanais',entity:'técnica',modal:'modal-prescription',notice:'As técnicas do seu treino foram atualizadas.'},
    deleteTsWorkout:{label:'Excluir protocolo',entity:'treino',notice:'Seu protocolo de treino foi atualizado.'},
    deleteTsExercise:{label:'Excluir exercício',entity:'exercício',notice:'Seu protocolo de treino foi atualizado.'},
    moveTrainerWorkout:{label:'Reordenar protocolos',entity:'treino',notice:'A ordem dos seus protocolos foi atualizada.'},
    activateTrainerWorkout:{label:'Ativar protocolo',entity:'treino',notice:'Um novo protocolo de treino foi ativado.'},
    saveDietPlan:{label:'Salvar dieta',entity:'dieta',modal:'modal-diet',notice:'Seu plano alimentar foi atualizado.'},
    saveDietVariant:{label:'Salvar divisão da dieta',entity:'dieta',modal:'modal-diet-variant',notice:'Seu plano alimentar foi atualizado.'},
    saveDietSupportItem:{label:'Salvar suplemento ou protocolo',entity:'dieta',modal:'modal-diet-support',notice:'Seu plano alimentar foi atualizado.'},
    saveMeal:{label:'Salvar refeição',entity:'dieta',modal:'modal-meal',notice:'Seu plano alimentar foi atualizado.'},
    moveDietPlan:{label:'Reordenar dietas',entity:'dieta',notice:'A ordem das suas dietas foi atualizada.'},
    activateDietPlan:{label:'Ativar dieta',entity:'dieta',notice:'Uma nova dieta foi ativada.'}
  };
  function wrapMutation(name,meta){
    if(wrapped.has(name)||typeof window[name]!=='function')return;
    const original=window[name];wrapped.add(name);
    window[name]=async function(){
      const trainer=CURRENT_USER?.role==='trainer'&&!!targetUid();
      const before=trainer?TB.snapshot():null,beforeHash=before?TB.snapshotHash(before):'';
      let result;
      try{result=original.apply(this,arguments);if(result&&typeof result.then==='function')result=await result;}
      catch(error){throw error;}
      if(!trainer)return result;
      await sleep(40);
      const after=TB.snapshot(),afterHash=TB.snapshotHash(after);
      if(afterHash===beforeHash)return result;
      TB.pushUndo(before,meta.label);
      if(meta.modal)storageRemove(PREFIX+draftKey(meta.modal));
      await Promise.allSettled([
        TB.audit(meta.label,{entity:meta.entity,metadata:{beforeHash,afterHash}}),
        TB.saveVersion(meta.label,'automatic',after),
        meta.notice?TB.createNotification({studentId:targetUid(),title:'Plano atualizado',body:meta.notice,type:meta.entity,dedupeMinutes:2}):Promise.resolve(false)
      ]);
      return result;
    };
  }
  Object.entries(mutationMap).forEach(([name,meta])=>wrapMutation(name,meta));

  /* A tela de operações precisa saber quando o contexto do aluno mudou. */
  const baseViewStudent=window.viewStudent;
  if(typeof baseViewStudent==='function')window.viewStudent=async function(){const result=await baseViewStudent.apply(this,arguments);window.dispatchEvent(new CustomEvent('team-bulls-v107-context'));return result;};
  const baseGoTrainer=window.goTrainer;
  if(typeof baseGoTrainer==='function')window.goTrainer=function(){const result=baseGoTrainer.apply(this,arguments);window.dispatchEvent(new CustomEvent('team-bulls-v107-context'));return result;};

  TB.formatDateTime=value=>{const date=new Date(value);return Number.isNaN(date.getTime())?'—':date.toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'});};
  TB.targetUid=targetUid;TB.actorUid=actorUid;TB.clone=clone;TB.cleanText=cleanText;TB.simpleHash=simpleHash;TB.ensureCloud=ensureCloud;TB.commitOperations=commitOperations;
  document.documentElement.dataset.appVersion='10.7.1';
  window.dispatchEvent(new CustomEvent('team-bulls-v107-ready'));
})();
