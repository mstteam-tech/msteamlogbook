(()=>{
  'use strict';
  if(window.__TEAM_BULLS_CUSTOM_FOOD_CALORIE_BRIDGE_1__)return;
  window.__TEAM_BULLS_CUSTOM_FOOD_CALORIE_BRIDGE_1__=true;

  const VERSION='10.10.12-customfood2';
  const COLLECTION='trainerSupplementCatalog';
  const FIELD='dietPortionItems';
  const FLAG='__tbPersistentCustomFood';
  let cached=[];
  let cachedTrainer='';
  let loading=null;
  let observer=null;
  let refreshFrame=0;

  const n=value=>{const parsed=Number(String(value??'').trim().replace(',','.'));return Number.isFinite(parsed)&&parsed>=0?parsed:0;};
  const key=value=>String(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim().toLowerCase();
  const trainer=()=>typeof CURRENT_USER!=='undefined'&&CURRENT_USER?.role==='trainer'&&String(CURRENT_USER?.uid||'').trim()?CURRENT_USER:null;
  const record=(raw,index=0)=>{
    if(!raw||typeof raw!=='object')return null;
    const label=String(raw.label||'').normalize('NFKC').replace(/\s+/g,' ').trim();
    if(!label)return null;
    return {id:`tb-custom-persisted-${String(raw.id||index).replace(/[^a-z0-9_-]/gi,'-').slice(0,72)}`,group:'custom',label,protein:n(raw.protein),carbs:n(raw.carbs),fat:n(raw.fat),[FLAG]:true,__tbCustomFoodBridge:true};
  };
  function normalize(items){
    const map=new Map();
    (Array.isArray(items)?items:[]).forEach((raw,index)=>{const item=record(raw,index);if(item)map.set(key(item.label),item);});
    return [...map.values()];
  }
  function apply(items=cached){
    const presets=window.TeamBullsDietPortions?.presets;if(!Array.isArray(presets))return 0;
    const clean=normalize(items),customKeys=new Set(clean.map(item=>key(item.label)));
    const base=presets.filter(item=>!item?.[FLAG]&&!item?.__tbCustomFoodBridge&&!customKeys.has(key(item?.label)));
    presets.splice(0,presets.length,...base,...clean);
    cached=clean;
    try{window.TeamBullsDietLiveCalories?.refresh?.();}catch(error){console.warn('[Team Bulls] Não foi possível recalcular a dieta após restaurar alimentos personalizados',error);}
    return clean.length;
  }
  async function load(force=false){
    const user=trainer();if(!user||typeof db==='undefined'||!db)return 0;
    const uid=String(user.uid);
    if(!force&&cachedTrainer===uid&&cached.length)return apply();
    if(loading)return loading;
    loading=(async()=>{
      try{
        const ref=db.collection(COLLECTION).doc(uid);
        const snap=typeof cloudGet==='function'?await cloudGet(ref,'alimentos personalizados da dieta'):await ref.get();
        if(!trainer()||String(CURRENT_USER.uid)!==uid)return 0;
        cached=normalize(snap.exists?snap.data()?.[FIELD]:[]);cachedTrainer=uid;return apply();
      }catch(error){console.warn('[Team Bulls] Não foi possível carregar alimentos personalizados para calorias',error);return apply();}
      finally{loading=null;}
    })();
    return loading;
  }
  function tableItems(){
    const rows=[...document.querySelectorAll('[data-custom-food-list] .tb-custom-table tbody tr')];if(!rows.length)return null;
    return normalize(rows.map((row,index)=>{const cells=row.querySelectorAll('td');return{id:`dom-${index}`,label:cells[0]?.textContent,protein:cells[1]?.textContent,carbs:cells[2]?.textContent,fat:cells[3]?.textContent};}));
  }
  function syncNow(){
    const table=tableItems();
    if(table){cached=table;return apply();}
    if(cached.length)return apply();
    load().catch(()=>0);return 0;
  }
  function schedule({reload=false}={}){
    if(refreshFrame)cancelAnimationFrame(refreshFrame);
    refreshFrame=requestAnimationFrame(()=>{
      refreshFrame=0;
      const table=tableItems();
      if(table){cached=table;apply();return;}
      if(reload)load(true).catch(()=>0);else if(cached.length)apply();else load().catch(()=>0);
    });
  }
  function relevant(mutation){
    const target=mutation.target?.nodeType===Node.ELEMENT_NODE?mutation.target:mutation.target?.parentElement;
    if(target?.closest?.('[data-custom-food-list],#tb-meal-portion-body'))return true;
    return [...(mutation.addedNodes||[])].some(node=>node?.nodeType===Node.ELEMENT_NODE&&(node.matches?.('[data-custom-food-list],#tb-meal-portion-body,.tb-custom-table')||node.querySelector?.('[data-custom-food-list],#tb-meal-portion-body,.tb-custom-table')));
  }
  function beforeMealInput(event){
    if(event.target?.id!=='input-meal-items')return;
    // Executa na captura, antes do listener do workspace calcular o total da refeição.
    syncNow();
  }
  function install(){
    if(!document.body)return false;
    if(!observer){observer=new MutationObserver(mutations=>{if(mutations.some(relevant))schedule();});observer.observe(document.body,{childList:true,subtree:true,characterData:true});}
    if(document.documentElement.dataset.tbCustomFoodCapture!=='1'){
      document.documentElement.dataset.tbCustomFoodCapture='1';
      document.addEventListener('input',beforeMealInput,true);
      document.addEventListener('change',beforeMealInput,true);
    }
    load().catch(()=>0);return true;
  }

  window.TeamBullsCustomFoodCalories=Object.freeze({version:VERSION,load,apply:syncNow,refresh:()=>schedule({reload:true})});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
  window.addEventListener('team-bulls-runtime-ready',()=>load(true).catch(()=>0));
  window.addEventListener('pageshow',()=>{install();load(true).catch(()=>0);},{passive:true});
})();
