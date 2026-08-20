/* Team Bulls v10.10.10 — reconciliação segura de alunos antigos sem trainerId. */
'use strict';
(()=>{
  if(window.__TEAM_BULLS_LEGACY_STUDENT_LINK_REPAIR_V101010__)return;
  window.__TEAM_BULLS_LEGACY_STUDENT_LINK_REPAIR_V101010__=true;

  const VERSION='10.10.10-legacy-links2';
  let running=false;
  let refreshTimer=null;

  function trainerReady(){
    return typeof CURRENT_USER!=='undefined'&&CURRENT_USER?.role==='trainer'&&CURRENT_USER?.uid&&typeof db!=='undefined'&&db;
  }

  function message(text,warn=false){
    const el=document.getElementById('tb-student-link-health');
    if(!el)return;
    el.textContent=text;
    el.classList.toggle('warn',!!warn);
  }

  async function repairLegacyLinks(){
    if(running||!trainerReady())return{repaired:0,skipped:0,failed:0,ready:false};
    running=true;
    const trainerUid=String(CURRENT_USER.uid);
    let repaired=0,skipped=0,failed=0;
    try{
      const snap=await cloudGet(
        db.collection('studentInvites').where('trainerId','==',trainerUid).limit(300),
        'reconciliar vínculos antigos'
      );
      const candidates=new Map();
      snap.docs.forEach(doc=>{
        const data=doc.data()||{},usedBy=String(data.usedBy||'');
        if(!usedBy||String(data.trainerId||'')!==trainerUid)return;
        const inviteId=String(doc.id);
        if(!candidates.has(usedBy))candidates.set(usedBy,{uid:usedBy,inviteId});
      });
      if(!candidates.size)return{repaired:0,skipped:0,failed:0,ready:true};

      for(const candidate of candidates.values()){
        if(!trainerReady()||String(CURRENT_USER.uid)!==trainerUid)break;
        try{
          await db.collection('users').doc(candidate.uid).update({trainerId:trainerUid});
          repaired++;
        }catch(error){
          const code=String(error?.code||'').toLowerCase();
          if(code.includes('permission')||code.includes('not-found'))skipped++;else failed++;
        }
      }
      return{repaired,skipped,failed,ready:true};
    }finally{running=false;}
  }

  async function runAndRefresh(){
    if(!trainerReady())return{repaired:0,skipped:0,failed:0,ready:false};
    const result=await repairLegacyLinks();
    if(result.repaired){
      message(`✓ ${result.repaired} aluno(s) antigo(s) reconciliado(s). Atualizando a lista...`);
      clearTimeout(refreshTimer);
      refreshTimer=setTimeout(()=>{
        if(typeof renderTrainer==='function')renderTrainer();
      },180);
    }else if(result.skipped){
      message(`⚠ ${result.skipped} vínculo(s) antigo(s) aguardando publicação das regras do Firebase.`,true);
    }else if(result.failed){
      message('Há vínculos antigos que não puderam ser reconciliados automaticamente. Nenhum aluno não confirmado foi exibido.',true);
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
