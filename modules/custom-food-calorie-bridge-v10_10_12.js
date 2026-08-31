(()=>{
  'use strict';
  if(window.__TEAM_BULLS_CUSTOM_FOOD_CALORIE_BRIDGE_2__)return;
  window.__TEAM_BULLS_CUSTOM_FOOD_CALORIE_BRIDGE_2__=true;

  const VERSION='10.10.13-customfood5';
  const COLLECTION='trainerSupplementCatalog';
  const FIELD='dietPortionItems';
  const PDF_MODULE='./modules/pdf-export-v10_10_12.js?v=10.10.12-pdf1';
  const DEFICIT_MODULE='./modules/diet-live-deficit-v10_10_13.js?v=10.10.13-deficit1';
  let cached=[];
  let cachedTrainer='';
  let loading=null;
  let pdfLoading=null;
  let deficitLoading=null;

  const n=value=>{const parsed=Number(String(value??'').trim().replace(',','.'));return Number.isFinite(parsed)&&parsed>=0?parsed:0;};
  const key=value=>String(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim().toLowerCase();
  const trainer=()=>typeof CURRENT_USER!=='undefined'&&CURRENT_USER?.role==='trainer'&&String(CURRENT_USER?.uid||'').trim()?CURRENT_USER:null;
  function normalize(items){
    const found=new Map();
    (Array.isArray(items)?items:[]).forEach((raw,index)=>{if(!raw||typeof raw!=='object')return;const label=String(raw.label||'').normalize('NFKC').replace(/\s+/g,' ').trim().slice(0,120),k=key(label);if(!label||!k)return;found.set(k,{id:String(raw.id||index).slice(0,80),label,protein:n(raw.protein),carbs:n(raw.carbs),fat:n(raw.fat)});});
    return [...found.values()];
  }
  function registry(){return window.TeamBullsDietPortions;}
  function refreshConsumers(){
    try{window.TeamBullsDietLiveCalories?.refresh?.();}catch(error){console.warn('[Team Bulls] recálculo após catálogo personalizado',error);}
    try{window.TeamBullsTrainerDietWorkspace?.refresh?.();}catch(error){}
    try{window.TeamBullsDietLiveDeficit?.refresh?.();}catch(error){}
  }
  function apply(items=cached){
    const user=trainer(),api=registry();if(!user||typeof api?.setCustomItems!=='function')return 0;
    if(cachedTrainer&&cachedTrainer!==String(user.uid))return 0;
    cached=normalize(items);cachedTrainer=String(user.uid);const count=api.setCustomItems(cached);refreshConsumers();return count;
  }
  function clear(){
    cached=[];cachedTrainer='';loading=null;
    try{registry()?.setCustomItems?.([]);}catch(error){}
    refreshConsumers();return true;
  }
  async function load(force=false){
    const user=trainer();if(!user||typeof db==='undefined'||!db){clear();return 0;}const uid=String(user.uid);
    if(!force&&cachedTrainer===uid)return apply(cached);if(loading)return loading;
    loading=(async()=>{
      try{
        const ref=db.collection(COLLECTION).doc(uid),snap=typeof cloudGet==='function'?await cloudGet(ref,'alimentos personalizados da dieta'):await ref.get();
        if(!trainer()||String(CURRENT_USER.uid)!==uid)return 0;cached=normalize(snap.exists?snap.data()?.[FIELD]:[]);cachedTrainer=uid;return apply(cached);
      }catch(error){console.warn('[Team Bulls] Não foi possível carregar alimentos personalizados para kcal/macros',error);if(cachedTrainer===uid)return apply(cached);return 0;}
      finally{loading=null;}
    })();return loading;
  }

  function loadOptional(path,check,cacheName){
    if(check())return Promise.resolve(true);if(cacheName==='pdf'&&pdfLoading)return pdfLoading;if(cacheName==='deficit'&&deficitLoading)return deficitLoading;
    const promise=new Promise(resolve=>{const script=document.createElement('script'),done=ok=>resolve(!!ok);script.src=path;script.async=false;script.onload=()=>done(check());script.onerror=()=>done(false);document.head.appendChild(script);});
    if(cacheName==='pdf')pdfLoading=promise.finally(()=>{if(!check())pdfLoading=null;});else deficitLoading=promise.finally(()=>{if(!check())deficitLoading=null;});return cacheName==='pdf'?pdfLoading:deficitLoading;
  }
  function loadPdfExporter(){return loadOptional(PDF_MODULE,()=>!!window.TeamBullsPdfExport,'pdf');}
  function loadDeficit(){return loadOptional(DEFICIT_MODULE,()=>!!window.TeamBullsDietLiveDeficit,'deficit');}
  function prepareOptional(){loadPdfExporter().catch(()=>{});loadDeficit().catch(()=>{});}
  function installLogoutHook(){
    if(typeof confirmLogout!=='function'||confirmLogout.__tbCustomFoodCacheClear)return false;
    const base=confirmLogout;const wrapped=function(){clear();return base.apply(this,arguments);};wrapped.__tbCustomFoodCacheClear=true;wrapped.__tbBase=base;confirmLogout=wrapped;return true;
  }
  function install(){if(!document.body)return false;installLogoutHook();load().catch(()=>0);prepareOptional();return true;}

  window.TeamBullsCustomFoodCalories=Object.freeze({version:VERSION,load,apply:()=>apply(cached),refresh:()=>load(true),clear,items:()=>cached.slice(),loadPdfExporter});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
  window.addEventListener('team-bulls-runtime-ready',()=>{installLogoutHook();load(true).catch(()=>0);prepareOptional();});
  window.addEventListener('online',()=>{load(true).catch(()=>0);prepareOptional();});
  window.addEventListener('pageshow',()=>{install();load(true).catch(()=>0);prepareOptional();},{passive:true});
})();
