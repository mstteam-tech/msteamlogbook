(()=>{
  'use strict';
  if(window.__TEAM_BULLS_RELEASE_COHERENCE_10_10_10__)return;
  window.__TEAM_BULLS_RELEASE_COHERENCE_10_10_10__=true;

  const RELEASE_VERSION='10.10.9';
  const PATCH_VERSION='10.10.12-release7';
  const ACTIVE_FIRESTORE_RULES='firestore_28_compacto.rules';
  const CUSTOM_BRIDGE_FLAG='__tbCustomFoodBridge';
  const CUSTOM_CATALOG_COLLECTION='trainerSupplementCatalog';
  const CUSTOM_CATALOG_FIELD='dietPortionItems';
  let customFoodObserver=null;
  let customRefreshFrame=0;
  let customCatalogLoading=null;
  let customCatalogTrainer='';

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

  function installPrescriptionTechniqueOverflowFix(){
    try{
      if(document.getElementById('tb-prescription-technique-overflow-fix'))return;
      const style=document.createElement('style');
      style.id='tb-prescription-technique-overflow-fix';
      style.textContent=`
        @media (min-width:900px){
          #modal-prescription .prescription-tech-panel{
            overflow-y:auto!important;
            overflow-x:hidden!important;
            overscroll-behavior:contain;
            scrollbar-gutter:stable;
          }
          #modal-prescription .week-technique-editor,
          #modal-prescription .week-superset-config,
          #modal-prescription .myo-optional-config{
            flex:0 0 auto;
          }
        }
        @media (min-width:900px) and (max-height:720px){
          #modal-prescription .week-technique-picker{
            max-height:min(180px,32dvh)!important;
            min-height:0!important;
          }
          #modal-prescription .prescription-tech-panel{
            padding-bottom:10px!important;
          }
        }
      `;
      document.head.appendChild(style);
    }catch(error){console.warn('[Team Bulls] Falha ao corrigir rolagem do editor de técnicas',error);}
  }

  function trainerSession(){
    return typeof CURRENT_USER!=='undefined'&&CURRENT_USER?.role==='trainer'&&String(CURRENT_USER?.uid||'').trim()?CURRENT_USER:null;
  }
  function customNumber(value){
    const parsed=Number(String(value??'').trim().replace(',','.'));
    return Number.isFinite(parsed)&&parsed>=0?parsed:0;
  }
  function customKey(value){
    return String(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim().toLowerCase();
  }
  function customFoodRecord(raw,index=0){
    if(!raw||typeof raw!=='object')return null;
    const label=String(raw.label||'').normalize('NFKC').replace(/\s+/g,' ').trim();
    const key=customKey(label);if(!key)return null;
    return{
      id:`tb-custom-food-${String(raw.id||index).replace(/[^a-z0-9_-]/gi,'-').slice(0,72)}`,
      group:'custom',label,
      protein:customNumber(raw.protein),
      carbs:customNumber(raw.carbs),
      fat:customNumber(raw.fat),
      [CUSTOM_BRIDGE_FLAG]:true
    };
  }
  function customFoodsFromCatalog(items){
    const found=new Map();
    (Array.isArray(items)?items:[]).forEach((raw,index)=>{const item=customFoodRecord(raw,index),key=item&&customKey(item.label);if(item&&key)found.set(key,item);});
    return [...found.values()];
  }
  function customFoodsFromTable(){
    const found=new Map();
    document.querySelectorAll('[data-custom-food-list] .tb-custom-table tbody tr').forEach((row,index)=>{
      const cells=row.querySelectorAll('td');
      const item=customFoodRecord({
        id:`dom-${index}`,
        label:String(cells[0]?.textContent||''),
        protein:cells[1]?.textContent,
        carbs:cells[2]?.textContent,
        fat:cells[3]?.textContent
      },index);
      const key=item&&customKey(item.label);if(item&&key&&cells.length>=4)found.set(key,item);
    });
    return [...found.values()];
  }
  function applyCustomFoods(custom){
    const presets=window.TeamBullsDietPortions?.presets;
    if(!Array.isArray(presets))return 0;
    const clean=Array.isArray(custom)?custom:[];
    const base=presets.filter(item=>!item?.[CUSTOM_BRIDGE_FLAG]);
    presets.splice(0,presets.length,...base,...clean);
    return clean.length;
  }
  function syncCustomFoodsIntoPortions(){
    try{
      const presets=window.TeamBullsDietPortions?.presets;
      if(!Array.isArray(presets))return 0;
      const custom=customFoodsFromTable();
      if(custom.length)return applyCustomFoods(custom);
      return presets.filter(item=>item?.[CUSTOM_BRIDGE_FLAG]).length;
    }catch(error){console.warn('[Team Bulls] Falha ao sincronizar alimentos personalizados com macros',error);return 0;}
  }
  function refreshCustomConsumers(){
    try{window.TeamBullsDietLiveCalories?.refresh?.();}catch(error){console.warn('[Team Bulls] Falha ao recalcular macros personalizados',error);}
    try{window.TeamBullsTrainerDietWorkspace?.refresh?.();}catch(error){console.warn('[Team Bulls] Falha ao atualizar resumo do planejamento',error);}
  }
  async function syncCustomFoodsFromCatalog(force=false){
    const user=trainerSession();
    if(!user||typeof db==='undefined'||!db)return 0;
    const uid=String(user.uid);
    const existing=window.TeamBullsDietPortions?.presets;
    const existingCount=Array.isArray(existing)?existing.filter(item=>item?.[CUSTOM_BRIDGE_FLAG]).length:0;
    if(!force&&customCatalogTrainer===uid&&existingCount)return existingCount;
    if(customCatalogLoading)return customCatalogLoading;
    customCatalogLoading=(async()=>{
      try{
        const ref=db.collection(CUSTOM_CATALOG_COLLECTION).doc(uid);
        const snap=typeof cloudGet==='function'?await cloudGet(ref,'calorias dos alimentos personalizados'):await ref.get();
        if(!trainerSession()||String(CURRENT_USER.uid)!==uid)return 0;
        const custom=customFoodsFromCatalog(snap.exists?snap.data()?.[CUSTOM_CATALOG_FIELD]:[]);
        customCatalogTrainer=uid;
        const count=applyCustomFoods(custom);
        refreshCustomConsumers();
        return count;
      }catch(error){console.warn('[Team Bulls] Falha ao carregar macros dos alimentos personalizados',error);return existingCount;}
      finally{customCatalogLoading=null;}
    })();
    return customCatalogLoading;
  }
  function refreshDietTotalsFromCustomFoods(){
    // IMPORTANTE: sincroniza de forma síncrona antes de o workspace calcular o texto recém-editado.
    // O fluxo anterior aguardava requestAnimationFrame e, por isso, o novo alimento era lido como 0 kcal naquele ciclo.
    const count=syncCustomFoodsIntoPortions();
    if(customRefreshFrame)cancelAnimationFrame(customRefreshFrame);
    customRefreshFrame=requestAnimationFrame(()=>{customRefreshFrame=0;refreshCustomConsumers();});
    if(!count)syncCustomFoodsFromCatalog().catch(()=>0);
    return count;
  }
  function mutationTouchesCustomFoods(mutation){
    const node=mutation.target?.nodeType===Node.ELEMENT_NODE?mutation.target:mutation.target?.parentElement;
    if(node?.closest?.('[data-custom-food-list],#tb-meal-portion-body'))return true;
    return [...(mutation.addedNodes||[])].some(added=>added?.nodeType===Node.ELEMENT_NODE&&(added.matches?.('[data-custom-food-list],#tb-meal-portion-body,.tb-custom-table')||added.querySelector?.('[data-custom-food-list],#tb-meal-portion-body,.tb-custom-table')));
  }
  function bindCustomFoodObserver(){
    const host=document.body;
    if(!host)return false;
    if(customFoodObserver)return true;
    customFoodObserver=new MutationObserver(mutations=>{if(mutations.some(mutationTouchesCustomFoods))refreshDietTotalsFromCustomFoods();});
    customFoodObserver.observe(host,{childList:true,subtree:true,characterData:true});
    refreshDietTotalsFromCustomFoods();
    syncCustomFoodsFromCatalog().catch(()=>0);
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

  function install(){applyVersionLabels();patchFirebaseRuleMessage();installPrescriptionTechniqueOverflowFix();installCustomFoodMacroBridge();setTimeout(verifyRuntime,0);}
  window.TeamBullsRelease=Object.freeze({version:RELEASE_VERSION,patchVersion:PATCH_VERSION,activeFirestoreRules:ACTIVE_FIRESTORE_RULES,verify:verifyRuntime,refreshLabels:applyVersionLabels,syncCustomFoodMacros:refreshDietTotalsFromCustomFoods,syncCustomFoodCatalog:syncCustomFoodsFromCatalog});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
  window.addEventListener('team-bulls-runtime-ready',()=>{installCustomFoodMacroBridge();syncCustomFoodsFromCatalog(true).catch(()=>0);});
  window.addEventListener('team-bulls-runtime-state',()=>{if(window.TeamBullsDietPortions)syncCustomFoodsFromCatalog().catch(()=>0);});
  window.addEventListener('pageshow',()=>{applyVersionLabels();installPrescriptionTechniqueOverflowFix();installCustomFoodMacroBridge();refreshDietTotalsFromCustomFoods();syncCustomFoodsFromCatalog(true).catch(()=>0);},{passive:true});
})();
