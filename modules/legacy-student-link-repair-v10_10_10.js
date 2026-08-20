/* Team Bulls v10.10.10 — reconciliação segura e idempotente de alunos antigos sem trainerId. */
'use strict';
(()=>{
  if(window.__TEAM_BULLS_LEGACY_STUDENT_LINK_REPAIR_V101010__)return;
  window.__TEAM_BULLS_LEGACY_STUDENT_LINK_REPAIR_V101010__=true;

  const VERSION='10.10.10-legacy-links3';
  let running=false;
  let refreshTimer=null;
  let lastFingerprint='';

  function trainerReady(){
    return typeof CURRENT_USER!=='undefined'&&CURRENT_USER?.role==='trainer'&&CURRENT_USER?.uid&&typeof db!=='undefined'&&db;
  }

  function message(text,warn=false){
    const el=document.getElementById('tb-student-link-health');
    if(!el)return;
    el.textContent=text;
    el.classList.toggle('warn',!!warn);
  }

  async function getAlreadyLinkedIds(trainerUid){
    const snap=await cloudGet(
      db.collection('users').where('role','==','student').where('trainerId','==',trainerUid),
      'verificar alunos já vinculados'
    );
    return new Set(snap.docs.map(doc=>String(doc.id)));
  }

  async function getInviteCandidates(trainerUid){
    const snap=await cloudGet(
      db.collection('studentInvites').where('trainerId','==',trainerUid).limit(300),
      'reconciliar vínculos antigos'
    );
    const candidates=new Map();
    snap.docs.forEach(doc=>{
      const data=doc.data()||{},usedBy=String(data.usedBy||'');
      if(!usedBy||String(data.trainerId||'')!==trainerUid)return;
      if(!candidates.has(usedBy))candidates.set(usedBy,[]);
      candidates.get(usedBy).push(String(doc.id));
    });
    return candidates;
  }

  async function repairOneLegacyStudent(uid,inviteIds,trainerUid){
    /* Não lemos um perfil que ainda não pertence ao treinador. As regras atuais
       permitem a gravação apenas quando o inviteId interno do aluno corresponde
       a um convite realmente usado por esse mesmo uid e por este treinador.
       Havendo convites antigos duplicados, testamos cada vínculo comprovado uma
       única vez até encontrar o convite original correto. */
    for(const inviteId of inviteIds){
      if(!trainerReady()||String(CURRENT_USER.uid)!==trainerUid)return{ok:false,aborted:true};
      try{
        await db.collection('users').doc(uid).update({trainerId:trainerUid});
        return{ok:true,inviteId};
      }catch(error){
        const code=String(error?.code||'').toLowerCase();
        if(code.includes('permission'))continue;
        if(code.includes('not-found'))return{ok:false,notFound:true};
        return{ok:false,error};
      }
    }
    return{ok:false,permission:true};
  }

  async function repairLegacyLinks(){
    if(running||!trainerReady())return{repaired:0,alreadyLinked:0,unresolved:0,failed:0,ready:false};
    running=true;
    const trainerUid=String(CURRENT_USER.uid);
    let repaired=0,alreadyLinked=0,unresolved=0,failed=0;
    try{
      const [linkedIds,candidates]=await Promise.all([
        getAlreadyLinkedIds(trainerUid),
        getInviteCandidates(trainerUid)
      ]);

      const pending=[];
      for(const [uid,inviteIds] of candidates.entries()){
        if(linkedIds.has(uid)){alreadyLinked++;continue;}
        pending.push([uid,inviteIds]);
      }

      const fingerprint=[trainerUid,...pending.map(([uid,ids])=>`${uid}:${ids.join(',')}`)].join('|');
      if(!pending.length){lastFingerprint=fingerprint;return{repaired:0,alreadyLinked,unresolved:0,failed:0,ready:true};}

      /* Evita o loop anterior, no qual os mesmos seis alunos já vinculados eram
         atualizados e contados como "reconciliados" em toda renderização. */
      if(fingerprint===lastFingerprint)return{repaired:0,alreadyLinked,unresolved:pending.length,failed:0,ready:true,unchanged:true};
      lastFingerprint=fingerprint;

      for(const [uid,inviteIds] of pending){
        if(!trainerReady()||String(CURRENT_USER.uid)!==trainerUid)break;
        const result=await repairOneLegacyStudent(uid,inviteIds,trainerUid);
        if(result.ok)repaired++;
        else if(result.error)failed++;
        else unresolved++;
      }
      return{repaired,alreadyLinked,unresolved,failed,ready:true};
    }finally{running=false;}
  }

  async function runAndRefresh(){
    if(!trainerReady())return{repaired:0,alreadyLinked:0,unresolved:0,failed:0,ready:false};
    const result=await repairLegacyLinks();
    if(result.repaired){
      const tail=result.unresolved?` ${result.unresolved} vínculo(s) antigo(s) ainda não puderam ser confirmados.`:'';
      message(`✓ ${result.repaired} aluno(s) antigo(s) recuperado(s). Atualizando a lista...${tail}`,!!result.unresolved);
      clearTimeout(refreshTimer);
      refreshTimer=setTimeout(()=>{
        if(typeof renderTrainer==='function')renderTrainer();
      },180);
    }else if(result.unresolved){
      message(`⚠ ${result.unresolved} vínculo(s) antigo(s) não puderam ser confirmados automaticamente. Nenhum perfil sem vínculo comprovado foi exposto.`,true);
    }else if(result.failed){
      message('Há vínculos antigos que não puderam ser reconciliados por falha de conexão. Tente novamente.',true);
    }
    return result;
  }

  function hookTrainerRender(){
    if(typeof renderTrainer!=='function')return false;
    if(renderTrainer.__tbLegacyLinkHook)return true;
    const base=renderTrainer;
    const wrapped=async function(...args){
      const result=await base.apply(this,args);
      if(trainerReady())setTimeout(()=>runAndRefresh().catch(error=>console.warn('[Team Bulls] Reconciliação:',error)),0);
      return result;
    };
    wrapped.__tbLegacyLinkHook=true;
    renderTrainer=wrapped;
    return true;
  }

  function install(){
    if(hookTrainerRender())runAndRefresh().catch(error=>console.warn('[Team Bulls] Reconciliação:',error));
    let attempts=0;
    const timer=setInterval(()=>{
      attempts++;
      if(hookTrainerRender()&&trainerReady()){
        clearInterval(timer);
        runAndRefresh().catch(error=>console.warn('[Team Bulls] Reconciliação:',error));
      }else if(attempts>=40){
        clearInterval(timer);
      }
    },250);
  }

  window.TeamBullsLegacyStudentLinkRepair=Object.freeze({
    version:VERSION,
    repair:repairLegacyLinks,
    runAndRefresh
  });

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
