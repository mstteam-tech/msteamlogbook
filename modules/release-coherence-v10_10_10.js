(()=>{
  'use strict';
  if(window.__TEAM_BULLS_RELEASE_COHERENCE_10_10_10__)return;
  window.__TEAM_BULLS_RELEASE_COHERENCE_10_10_10__=true;

  const RELEASE_VERSION='10.10.9';
  const PATCH_VERSION='10.10.11-release1';
  const ACTIVE_FIRESTORE_RULES='firestore_27_compacto.rules';

  function applyVersionLabels(){
    try{
      document.documentElement.dataset.appVersion=RELEASE_VERSION;
      const meta=document.querySelector('meta[name="team-bulls-version"]');
      if(meta)meta.setAttribute('content',RELEASE_VERSION);
      document.querySelectorAll('.trainer-desktop-logo small,.student-desktop-logo small').forEach(node=>{
        node.textContent=String(node.textContent||'').replace(/V\d+(?:\.\d+)*/i,'V'+RELEASE_VERSION);
      });
    }catch(error){console.warn('[Team Bulls] Falha ao sincronizar rótulo de versão',error);}
  }

  function patchFirebaseRuleMessage(){
    try{
      if(typeof cloudWriteError!=='function'||cloudWriteError.__tbActiveRules27)return;
      const base=cloudWriteError;
      const wrapped=function(error,action){
        const message=String(base.apply(this,arguments)||'');
        return message.replace(/firestore_26_compacto\.rules/g,ACTIVE_FIRESTORE_RULES);
      };
      wrapped.__tbActiveRules27=true;
      wrapped.__tbBase=base;
      cloudWriteError=wrapped;
    }catch(error){console.warn('[Team Bulls] Falha ao sincronizar mensagem de regras',error);}
  }

  function verifyRuntime(){
    const required=[
      ['TeamBullsDietMath',()=>!!window.TeamBullsDietMath],
      ['TeamBullsDietCalculator',()=>!!window.TeamBullsDietCalculator],
      ['TeamBullsDietPortions',()=>!!window.TeamBullsDietPortions],
      ['TeamBullsDietPersonalization',()=>!!window.TeamBullsDietPersonalization],
      ['TeamBullsTrainingIntegrity',()=>!!window.TeamBullsTrainingIntegrity],
      ['TeamBullsReportSchedule',()=>!!window.TeamBullsReportSchedule],
      ['TeamBullsCardioAlert',()=>!!window.TeamBullsCardioAlert]
    ];
    const missing=required.filter(([,check])=>{try{return !check();}catch(error){return true;}}).map(([name])=>name);
    if(missing.length)console.warn('[Team Bulls] Extensões opcionais indisponíveis nesta sessão:',missing.join(', '));
    return missing;
  }

  function install(){applyVersionLabels();patchFirebaseRuleMessage();setTimeout(verifyRuntime,0);}
  window.TeamBullsRelease=Object.freeze({version:RELEASE_VERSION,patchVersion:PATCH_VERSION,activeFirestoreRules:ACTIVE_FIRESTORE_RULES,verify:verifyRuntime,refreshLabels:applyVersionLabels});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
  window.addEventListener('pageshow',applyVersionLabels,{passive:true});
})();