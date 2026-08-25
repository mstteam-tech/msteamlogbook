(()=>{
  'use strict';
  if(window.__TEAM_BULLS_RELEASE_COHERENCE_10_10_10__)return;
  window.__TEAM_BULLS_RELEASE_COHERENCE_10_10_10__=true;

  const RELEASE_VERSION='10.10.9';
  const PATCH_VERSION='10.10.12-release3';
  const ACTIVE_FIRESTORE_RULES='firestore_28_compacto.rules';
  const CUSTOM_BRIDGE_FLAG='__tbCustomFoodBridge';
  let customFoodObserver=null;
  let customRefreshFrame=0;

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
      if(typeof cloudWriteError!=='function'||cloudWriteError.__tbActiveRules28)return;
      const base=cloudWriteError;
      const wrapped=function(error,action){
        const message=String(base.apply(this,arguments)||'');
        return message.replace(/firestore_(?:26|27)_compacto\.rules/g,ACTIVE_FIRESTORE_RULES);
      };
      wrapped.__tbActiveRules28=true;
      wrapped.__tbBase=base;
      cloudWriteError=wrapped;
    }catch(error){console.warn('[Team Bulls] Falha ao sincronizar mensagem de regras',error);}
  }

  function customNumber(value){
    const parsed=Number(String(value??'').trim().replace(',','.'));
    return Number.isFinite(parsed)&&parsed>=0?parsed:0;
  }
  function customKey(value){
    return String(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim().toLowerCase();
  }
  function customFoodsFromTable(){
    const found=new Map();
    document.querySelectorAll('[data-custom-food-list] .tb-custom-table tbody tr').forEach((row,index)=>{
      const cells=row.querySelectorAll('td');
      const label=String(cells[0]?.textContent||'').normalize('NFKC').trim();
      const key=customKey(label);if(!key||cells.length<4)return;
      found.set(key,{
        id:`tb-custom-food-${index}-${key.slice(0,40)}`,
        group:'custom',label,
        protein:customNumber(cells[1]?.textContent),
        carbs:customNumber(cells[2]?.textContent),
        fat:customNumber(cells[3]?.textContent),
        [CUSTOM_BRIDGE_FLAG]:true
      });
    });
    return [...found.values()];
  }
  function syncCustomFoodsIntoPortions(){
    try{
      const api=window.TeamBullsDietPortions,presets=api?.presets;
      if(!Array.isArray(presets))return 0;
      const base=presets.filter(item=>!item?.[CUSTOM_BRIDGE_FLAG]);
      const custom=customFoodsFromTable();
      presets.splice(0,presets.length,...base,...custom);
      return custom.length;
    }catch(error){console.warn('[Team Bulls] Falha ao sincronizar alimentos personalizados com macros',error);return 0;}
  }
  function refreshDietTotalsFromCustomFoods(){
    if(customRefreshFrame)cancelAnimationFrame(customRefreshFrame);
    customRefreshFrame=requestAnimationFrame(()=>{
      customRefreshFrame=0;
      syncCustomFoodsIntoPortions();
      try{window.TeamBullsDietLiveCalories?.refresh?.();}catch(error){console.warn('[Team Bulls] Falha ao recalcular macros personalizados',error);}
    });
  }
  function bindCustomFoodObserver(){
    const host=document.getElementById('tb-meal-portion-body');
    if(!host)return false;
    if(host.dataset.tbCustomFoodMacroObserver==='1')return true;
    host.dataset.tbCustomFoodMacroObserver='1';
    customFoodObserver?.disconnect?.();
    customFoodObserver=new MutationObserver(()=>refreshDietTotalsFromCustomFoods());
    customFoodObserver.observe(host,{childList:true,subtree:true,characterData:true});
    refreshDietTotalsFromCustomFoods();
    return true;
  }
  function installCustomFoodMacroBridge(){
    if(bindCustomFoodObserver())return;
    [250,900,2200,5000].forEach(delay=>setTimeout(bindCustomFoodObserver,delay));
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

  function install(){applyVersionLabels();patchFirebaseRuleMessage();installCustomFoodMacroBridge();setTimeout(verifyRuntime,0);}
  window.TeamBullsRelease=Object.freeze({version:RELEASE_VERSION,patchVersion:PATCH_VERSION,activeFirestoreRules:ACTIVE_FIRESTORE_RULES,verify:verifyRuntime,refreshLabels:applyVersionLabels,syncCustomFoodMacros:refreshDietTotalsFromCustomFoods});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
  window.addEventListener('pageshow',()=>{applyVersionLabels();installCustomFoodMacroBridge();refreshDietTotalsFromCustomFoods();},{passive:true});
})();
