/* Team Bulls v10.10.10 — reconciliação segura de vínculos atuais e alunos pré-v10.7. */
'use strict';
(()=>{
  if(window.__TEAM_BULLS_LEGACY_STUDENT_LINK_REPAIR_V101010__)return;
  window.__TEAM_BULLS_LEGACY_STUDENT_LINK_REPAIR_V101010__=true;

  const VERSION='10.10.10-legacy-links5';
  const PRE_V107_CUTOFF_MS=Date.UTC(2026,7,1);
  const PRE_V107_SCAN_LIMIT=1000;
  const AUTO_READY_ATTEMPTS=40;
  const AUTO_READY_INTERVAL_MS=250;
  let running=false;
  let refreshTimer=null;
  let lastFingerprint='';
  let preV107CheckedTrainer='';
  const autoAttemptedTrainers=new Set();

  function trainerReady(){
    return typeof CURRENT_USER!=='undefined'&&CURRENT_USER?.role==='trainer'&&CURRENT_USER?.uid&&typeof db!=='undefined'&&db;
  }

  function message(text,warn=false){
    const el=document.getElementById('tb-student-link-health');
    if(!el)return;
    el.textContent=text;
    el.classList.toggle('warn',!!warn);
  }

  function timestampMillis(value){
    if(value?.toMillis)return Number(value.toMillis())||0;
    const parsed=new Date(value||0).getTime();
    return Number.isFinite(parsed)?parsed:0;
  }

  function isPreV107LegacyStudent(data){
    if(!data||data.role!=='student')return false;
    if(String(data.trainerId||'')||String(data.inviteId||''))return false;
    const createdAt=timestampMillis(data.createdAt);
    return createdAt>0&&createdAt<PRE_V107_CUTOFF_MS;
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
      'reconciliar vínculos por convite'
    );
    const candidates=new Set();
    snap.docs.forEach(doc=>{
      const data=doc.data()||{},usedBy=String(data.usedBy||'');
      if(usedBy&&String(data.trainerId||'')===trainerUid)candidates.add(usedBy);
    });
    return candidates;
  }

  async function repairInviteLinkedStudent(uid,trainerUid){
    if(!trainerReady()||String(CURRENT_USER.uid)!==trainerUid)return{ok:false,aborted:true};
    try{
      /* A regra Firestore valida o inviteId que já existe no perfil e o usedBy
         do convite. O cliente não escolhe nem altera inviteId durante a correção. */
      await db.collection('users').doc(uid).update({trainerId:trainerUid});
      return{ok:true};
    }catch(error){
      const code=String(error?.code||'').toLowerCase();
      if(code.includes('permission'))return{ok:false,permission:true};
      if(code.includes('not-found'))return{ok:false,notFound:true};
      return{ok:false,error};
    }
  }

  async function repairInviteLinks(trainerUid){
    const [linkedIds,candidates]=await Promise.all([
      getAlreadyLinkedIds(trainerUid),
      getInviteCandidates(trainerUid)
    ]);
    const pending=[...candidates].filter(uid=>!linkedIds.has(uid));
    const fingerprint=[trainerUid,...pending].join('|');
    if(!pending.length){lastFingerprint=fingerprint;return{repaired:0,alreadyLinked:linkedIds.size,unresolved:0,failed:0};}
    if(fingerprint===lastFingerprint)return{repaired:0,alreadyLinked:linkedIds.size,unresolved:pending.length,failed:0,unchanged:true};
    lastFingerprint=fingerprint;
    let repaired=0,unresolved=0,failed=0;
    for(const uid of pending){
      if(!trainerReady()||String(CURRENT_USER.uid)!==trainerUid)break;
      const result=await repairInviteLinkedStudent(uid,trainerUid);
      if(result.ok)repaired++;
      else if(result.error)failed++;
      else unresolved++;
    }
    return{repaired,alreadyLinked:linkedIds.size,unresolved,failed};
  }

  async function trainerMigrationAuthorized(trainerUid){
    const snap=await cloudGet(db.collection('users').doc(trainerUid),'verificar autorização da migração legada');
    return !!(snap.exists&&snap.data()?.role==='trainer'&&snap.data()?.legacyMigrationEnabled===true);
  }

  async function migratePreV107Students(trainerUid){
    if(preV107CheckedTrainer===trainerUid)return{authorized:false,checked:true,migrated:0,failed:0};
    let authorized=false;
    try{authorized=await trainerMigrationAuthorized(trainerUid);}
    catch(error){return{authorized:false,checked:false,migrated:0,failed:1,error};}
    if(!authorized){preV107CheckedTrainer=trainerUid;return{authorized:false,checked:true,migrated:0,failed:0};}

    let snap;
    try{
      /* Esta leitura ampla só é aceita quando o próprio documento do treinador
         possui legacyMigrationEnabled=true. O treinador não consegue ativar esse
         campo pelas regras; ele serve como autorização administrativa temporária. */
      snap=await cloudGet(
        db.collection('users').where('role','==','student').limit(PRE_V107_SCAN_LIMIT),
        'localizar alunos anteriores à v10.7'
      );
    }catch(error){
      const permission=String(error?.code||'').toLowerCase().includes('permission');
      return{authorized:true,checked:false,migrated:0,failed:1,rulesPending:permission,error};
    }

    const candidates=snap.docs.filter(doc=>isPreV107LegacyStudent(doc.data())).map(doc=>String(doc.id));
    const truncated=snap.size>=PRE_V107_SCAN_LIMIT;
    let migrated=0,failed=0;
    for(const uid of candidates){
      if(!trainerReady()||String(CURRENT_USER.uid)!==trainerUid){failed++;break;}
      try{
        await db.collection('users').doc(uid).update({trainerId:trainerUid});
        migrated++;
      }catch(error){
        failed++;
        console.warn('[Team Bulls] Falha ao migrar aluno pré-v10.7',uid,error);
      }
    }

    /* O privilégio temporário é removido pelo próprio treinador somente depois
       de uma varredura completa e sem falhas. As regras permitem desligar o
       campo, mas nunca ligá-lo pelo cliente. */
    let authorizationClosed=false;
    if(!failed&&!truncated){
      try{
        await db.collection('users').doc(trainerUid).update({legacyMigrationEnabled:false});
        authorizationClosed=true;
        preV107CheckedTrainer=trainerUid;
      }catch(error){
        failed++;
        console.warn('[Team Bulls] Não foi possível encerrar autorização de migração',error);
      }
    }
    return{authorized:true,checked:true,migrated,failed,truncated,authorizationClosed,candidates:candidates.length};
  }

  async function repairLegacyLinks(){
    if(running||!trainerReady())return{repaired:0,preV107Migrated:0,unresolved:0,failed:0,ready:false};
    running=true;
    const trainerUid=String(CURRENT_USER.uid);
    try{
      const inviteResult=await repairInviteLinks(trainerUid);
      const preV107Result=await migratePreV107Students(trainerUid);
      return{
        repaired:inviteResult.repaired||0,
        preV107Migrated:preV107Result.migrated||0,
        unresolved:inviteResult.unresolved||0,
        failed:(inviteResult.failed||0)+(preV107Result.failed||0),
        preV107:preV107Result,
        ready:true
      };
    }finally{running=false;}
  }

  async function runAndRefresh(){
    if(!trainerReady())return{repaired:0,preV107Migrated:0,unresolved:0,failed:0,ready:false};
    const result=await repairLegacyLinks();
    const total=(result.repaired||0)+(result.preV107Migrated||0);
    if(result.preV107?.rulesPending){
      message('⚠ A migração dos alunos anteriores à v10.7 está autorizada, mas as novas regras do Firestore ainda não foram publicadas.',true);
      return result;
    }
    if(result.preV107?.truncated){
      message('⚠ A migração encontrou mais alunos que o limite de segurança da varredura. A autorização foi mantida para revisão.',true);
      return result;
    }
    if(total){
      const parts=[];
      if(result.preV107Migrated)parts.push(`${result.preV107Migrated} aluno(s) pré-v10.7`);
      if(result.repaired)parts.push(`${result.repaired} vínculo(s) por convite`);
      const tail=result.unresolved?` ${result.unresolved} vínculo(s) por convite ainda não puderam ser confirmados.`:'';
      message(`✓ Recuperados ${parts.join(' e ')}. Atualizando a lista...${tail}`,!!result.unresolved);
      clearTimeout(refreshTimer);
      /* Uma única atualização visual depois de uma migração real. A reconciliação
         não é mais acoplada a renderTrainer(), portanto este refresh não inicia
         outro ciclo de consultas/gravações. */
      refreshTimer=setTimeout(()=>{if(typeof renderTrainer==='function')renderTrainer();},220);
    }else if(result.unresolved){
      message(`⚠ ${result.unresolved} vínculo(s) antigo(s) por convite não puderam ser confirmados automaticamente.`,true);
    }else if(result.failed){
      message('Há vínculos antigos que não puderam ser reconciliados. A tentativa automática foi encerrada para evitar consumo repetido do Firestore.',true);
    }
    return result;
  }

  function runAutomaticOnce(){
    if(!trainerReady())return false;
    const trainerUid=String(CURRENT_USER.uid);
    if(autoAttemptedTrainers.has(trainerUid))return true;
    /* Marca ANTES da rede. Mesmo permission-denied, quota-exceeded ou timeout não
       cria retry automático em loop. Uma nova tentativa exige nova sessão/reload
       ou chamada manual explícita da API de reparo. */
    autoAttemptedTrainers.add(trainerUid);
    runAndRefresh().catch(error=>console.warn('[Team Bulls] Reconciliação automática encerrada:',error));
    return true;
  }

  function install(){
    if(runAutomaticOnce())return;
    let attempts=0;
    const timer=setInterval(()=>{
      attempts++;
      if(runAutomaticOnce()||attempts>=AUTO_READY_ATTEMPTS)clearInterval(timer);
    },AUTO_READY_INTERVAL_MS);
  }

  window.TeamBullsLegacyStudentLinkRepair=Object.freeze({
    version:VERSION,
    repair:repairLegacyLinks,
    migratePreV107:migratePreV107Students,
    runAndRefresh
  });

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
