/* Team Bulls v10.10.10 — reconciliação segura de alunos antigos sem trainerId. */
'use strict';
(()=>{
  if(window.__TEAM_BULLS_LEGACY_STUDENT_LINK_REPAIR_V101010__)return;
  window.__TEAM_BULLS_LEGACY_STUDENT_LINK_REPAIR_V101010__=true;

  const VERSION='10.10.10-legacy-links1';
  let running=false;

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
    if(running||!trainerReady())return{repaired:0,skipped:0,failed:0};
    running=true;
    const trainerUid=String(CURRENT_USER.uid);
    let repaired=0,skipped=0,failed=0;
    try{
      const snap=await cloudGet(
        db.collection('studentInvites').where('trainerId','==',trainerUid).limit(120),
        'reconciliar vínculos antigos'
      );
      const candidates=new Map();
      snap.docs.forEach(doc=>{
        const data=doc.data()||{},usedBy=String(data.usedBy||'');
        if(!usedBy||String(data.trainerId||'')!==trainerUid)return;
        const inviteId=String(doc.id);
        if(!candidates.has(usedBy))candidates.set(usedBy,{uid:usedBy,inviteId});
      });
      if(!candidates.size)return{repaired:0,skipped:0,failed:0};

      /* Uma gravação por aluno. As regras do Firestore só aceitam esta operação
         quando o convite pertence a este treinador, usedBy aponta para o mesmo
         UID e o perfil ainda não possui trainerId. Assim o cliente nunca escolhe
         arbitrariamente a qual treinador um aluno antigo será atribuído. */
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
      return{repaired,skipped,failed};
    }finally{running=false;}
  }

  async function runAndRefresh(){
    if(!trainerReady())return;
    const result=await repairLegacyLinks();
    if(result.repaired){
      message(`✓ ${result.repaired} aluno(s) antigo(s) foram reconciliados com segurança. Atualizando a lista...`);
      if(typeof renderTrainer==='function')setTimeout(()=>renderTrainer(),120);
    }else if(result.failed){
      message('Há vínculos antigos que não puderam ser reconciliados automaticamente. Nenhum aluno não confirmado foi exibido.',true);
    }
    return result;
  }

  window.TeamBullsLegacyStudentLinkRepair=Object.freeze({
    version:VERSION,
    repair:repairLegacyLinks,
    runAndRefresh
  });

  function install(){
    if(!trainerReady())return;
    setTimeout(()=>runAndRefresh().catch(error=>console.warn('[Team Bulls] Reconciliação de alunos antigos:',error)),80);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
