/* Team Bulls v10.10.9 — registro de séries imediato com fila persistente de sincronização. */
'use strict';
(()=>{
  if(window.__TEAM_BULLS_SESSION_SAVE_PERF_V10109__)return;
  window.__TEAM_BULLS_SESSION_SAVE_PERF_V10109__=true;

  const VERSION='10.10.9-sessionperf1';
  const QUEUE_PREFIX='team_bulls_pending_sessions_v1_';
  const MAX_PENDING=160;
  let flushing=null;
  let retryTimer=null;

  function safeUid(value){return String(value||'').replace(/[^a-zA-Z0-9_-]/g,'_').slice(0,160);}
  function queueKey(uidValue){return QUEUE_PREFIX+safeUid(uidValue);}
  function readQueue(uidValue){
    if(!uidValue)return[];
    try{
      const parsed=JSON.parse(storageGet(queueKey(uidValue))||'[]');
      return Array.isArray(parsed)?parsed.filter(item=>item&&item.id&&item.userId===uidValue):[];
    }catch(error){return[];}
  }
  function writeQueue(uidValue,items){
    if(!uidValue)return false;
    try{return storageSet(queueKey(uidValue),JSON.stringify(items));}catch(error){return false;}
  }
  function enqueue(entry){
    const uidValue=String(entry?.userId||'');if(!uidValue||!entry?.id)return false;
    const queue=readQueue(uidValue),index=queue.findIndex(item=>item.id===entry.id);
    if(index<0&&queue.length>=MAX_PENDING)return false;
    if(index>=0)queue[index]=entry;else queue.push(entry);
    return writeQueue(uidValue,queue);
  }
  function removeQueued(uidValue,id){
    const queue=readQueue(uidValue),next=queue.filter(item=>item.id!==id);
    return next.length===queue.length||writeQueue(uidValue,next);
  }
  function pendingCount(uidValue=String(CURRENT_USER?.uid||'')){return readQueue(uidValue).length;}
  function networkReady(){return navigator.onLine!==false&&MODE==='cloud'&&CURRENT_USER?.role==='student'&&CURRENT_USER?.uid&&db;}
  function firestorePayload(entry){
    return{
      userId:entry.userId,workoutId:entry.workoutId,exerciseId:entry.exerciseId,exerciseName:entry.exerciseName,
      date:entry.date,week:entry.week,note:entry.note,sets:entry.sets,performedTechniqueMode:entry.performedTechniqueMode||'',
      performedExerciseItemId:entry.performedExerciseItemId||'',performedExerciseName:entry.performedExerciseName||entry.exerciseName||'',
      createdAt:firebase.firestore.FieldValue.serverTimestamp()
    };
  }
  async function syncEntry(entry){
    if(!networkReady()||CURRENT_USER.uid!==entry.userId)return false;
    await cloudWrite(db.collection('sessions').doc(entry.id).set(firestorePayload(entry)),'sincronizar registro de série');
    removeQueued(entry.userId,entry.id);
    return true;
  }
  async function flushPending({silent=true}={}){
    if(flushing)return flushing;
    flushing=(async()=>{
      if(!networkReady())return false;
      const uidValue=String(CURRENT_USER.uid),queue=readQueue(uidValue);
      if(!queue.length)return true;
      let synced=0;
      for(const entry of queue){
        if(!networkReady()||CURRENT_USER?.uid!==uidValue)break;
        try{if(await syncEntry(entry))synced++;}
        catch(error){
          if(!silent)console.warn('[Team Bulls] Registro ainda aguardando sincronização',error);
          break;
        }
      }
      if(synced){
        try{runWhenIdle(()=>saveCloudBackup(),3500);}catch(error){}
        if(!silent)showToast(`✓ ${synced} registro${synced===1?'':'s'} sincronizado${synced===1?'':'s'}`);
      }
      return readQueue(uidValue).length===0;
    })().finally(()=>{flushing=null;});
    return flushing;
  }
  function scheduleFlush(delay=180){
    clearTimeout(retryTimer);
    retryTimer=setTimeout(()=>{flushPending({silent:true}).catch(()=>{});},Math.max(0,delay));
  }

  function installSavePatch(){
    if(typeof saveSession!=='function')return false;
    if(saveSession.__tbSessionPerf)return true;
    const base=saveSession;
    const fastSave=async function(){
      if(MODE!=='cloud'||CURRENT_USER?.role!=='student')return base.apply(this,arguments);
      const wid=SESSION_WID||CUR_WORKOUT,eid=SESSION_EID||CUR_EX;
      if(!wid||!eid){alert('Erro: exercício não identificado. Feche e tente novamente.');return;}
      const date=document.getElementById('input-session-date')?.value;
      if(!date){alert('Selecione a data!');return;}
      const week=parseInt(document.getElementById('input-session-week')?.value,10);
      if(!week||week<1||week>8){alert('Selecione a semana de treino!');return;}
      const note=String(document.getElementById('input-session-note')?.value||'').trim();
      const exercise=getE(wid,eid);
      if(!exercise){alert('Erro: exercício não encontrado. Atualize a tela e tente novamente.');return;}
      const variant=selectedVariantData(exercise,'input-session-variant');
      const performedTechniqueMode=selectedPerformedTechniqueMode(exercise);
      const rows=[...document.querySelectorAll('#sets-editor .performed-set-row')],sets=[];
      for(const row of rows){
        const rawWeight=String(row.querySelector('[data-f="w"]')?.value||'').trim();
        const rawReps=String(row.querySelector('[data-f="r"]')?.value||'').trim();
        if(rawWeight===''&&rawReps==='')continue;
        const weight=rawWeight===''?0:parseFloat(rawWeight),reps=parseInt(rawReps,10);
        if(!Number.isFinite(weight)||!Number.isInteger(reps)||weight<0||weight>10000||reps<0||reps>100){alert('Confira a carga e as repetições das séries realizadas.');return;}
        const performed={weight,reps};
        if(row.dataset.backoff==='1')performed.backoff=true;
        const target=normalizePrescriptionSet({targetMin:row.dataset.targetMin,targetMax:row.dataset.targetMax,ger:row.dataset.ger});
        if(target)Object.assign(performed,target);
        sets.push(performed);
      }
      if(!sets.length){alert('Registre ao menos uma série realizada.');return;}
      LAST_SESSION_WEEK=week;
      if(!beginAction('save-session','modal-session'))return;
      try{
        const sessionId=SESSION_CREATE_ID||(SESSION_CREATE_ID=draftId('sessions'));
        const entry={
          id:sessionId,userId:CURRENT_USER.uid,workoutId:wid,exerciseId:eid,exerciseName:exercise.name,date,week,note,sets,
          performedTechniqueMode,...variant,queuedAt:Date.now()
        };
        // Só libera a interface instantaneamente depois de garantir uma cópia
        // persistente pequena no aparelho. Se a fila local falhar, usa o fluxo
        // original (mais lento) para nunca trocar velocidade por perda de dados.
        if(!enqueue(entry)){
          endAction('save-session','modal-session');
          return base.apply(this,arguments);
        }
        const sessionData={
          id:sessionId,userId:CURRENT_USER.uid,workoutId:wid,exerciseId:eid,date,week,note,sets,exerciseName:exercise.name,
          performedTechniqueMode,...variant,pendingSync:true
        };
        if(!exercise.sessions.some(session=>session.id===sessionId))exercise.sessions.push(sessionData);
        syncSessionToHistory(sessionData);
        saveSessionArchive(CURRENT_USER.uid,[sessionData]);
        exercise.sessions.sort((a,b)=>String(a.date||'').localeCompare(String(b.date||'')));
        SESSION_CREATE_ID=null;
        closeModal('modal-session');
        resetRestTimer();
        if(CUR_WORKOUT===wid&&CUR_EX===eid)renderExercise();
        showToast('✓ Série registrada');
        scheduleFlush(40);
      }catch(error){
        console.error('[Team Bulls] Falha no registro rápido de série',error);
        alert('Erro ao registrar série: '+(error?.message||error));
      }finally{
        endAction('save-session','modal-session');
      }
    };
    fastSave.__tbSessionPerf=true;
    fastSave.__tbBase=base;
    saveSession=fastSave;
    return true;
  }

  function installFlushBridge(){
    const TB=window.TeamBulls107;if(!TB)return false;
    if(TB.flushPendingMutationSync?.__tbSessionPerf)return true;
    const base=typeof TB.flushPendingMutationSync==='function'?TB.flushPendingMutationSync.bind(TB):async()=>{};
    const combined=async function(){
      await Promise.allSettled([Promise.resolve(base()),flushPending({silent:true})]);
    };
    combined.__tbSessionPerf=true;
    TB.flushPendingMutationSync=combined;
    return true;
  }
  function install(){
    const saveOk=installSavePatch(),flushOk=installFlushBridge();
    if(saveOk&&flushOk){
      window.TeamBullsSessionPerformance=Object.freeze({version:VERSION,pending:pendingCount,flush:()=>flushPending({silent:false})});
      return true;
    }
    return false;
  }

  if(!install())window.addEventListener('team-bulls-v107-ready',()=>install(),{once:true});
  window.addEventListener('online',()=>scheduleFlush(250));
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')scheduleFlush(350);});
  [900,2600,7000].forEach(delay=>setTimeout(()=>{install();scheduleFlush(0);},delay));
})();
