(()=>{
  'use strict';
  if(window.__TEAM_BULLS_CUSTOM_FOOD_CALORIE_BRIDGE_1__)return;
  window.__TEAM_BULLS_CUSTOM_FOOD_CALORIE_BRIDGE_1__=true;

  const VERSION='10.10.12-customfood3';
  const COLLECTION='trainerSupplementCatalog';
  const FIELD='dietPortionItems';
  const FLAG='__tbPersistentCustomFood';
  const PDF_MODULE='./modules/pdf-export-v10_10_12.js?v=10.10.12-pdf1';
  const VEGETABLE_LABELS=Object.freeze({
    'tomato-60':'60g de Vegetais',
    'tomato-90':'90g de Vegetais',
    'tomato-120':'120g de Vegetais',
    'tomato-180':'180g de Vegetais',
    'tomato-240':'240g de Vegetais'
  });
  let cached=[];
  let cachedTrainer='';
  let loading=null;
  let observer=null;
  let refreshFrame=0;
  let pdfLoading=null;

  const n=value=>{const parsed=Number(String(value??'').trim().replace(',','.'));return Number.isFinite(parsed)&&parsed>=0?parsed:0;};
  const key=value=>String(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim().toLowerCase();
  const trainer=()=>typeof CURRENT_USER!=='undefined'&&CURRENT_USER?.role==='trainer'&&String(CURRENT_USER?.uid||'').trim()?CURRENT_USER:null;
  const canEditMeal=()=>typeof CURRENT_USER!=='undefined'&&CURRENT_USER?.role==='trainer'&&typeof MEAL_CTX!=='undefined'&&MEAL_CTX?.canEditContent===true;
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
  function appendMealLine(text){
    const textarea=document.getElementById('input-meal-items');if(!textarea||!canEditMeal())return false;
    const current=String(textarea.value||'').trimEnd(),next=(current?current+'\n':'')+text,max=Number(textarea.maxLength)||5000;
    if(next.length>max){if(typeof showToast==='function')showToast('A refeição atingiu o limite de texto.',true);return false;}
    textarea.value=next;textarea.dispatchEvent(new Event('input',{bubbles:true}));textarea.focus();textarea.setSelectionRange?.(textarea.value.length,textarea.value.length);return true;
  }
  async function copyText(text){
    try{if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(text);return true;}}catch(error){}
    try{const area=document.createElement('textarea');area.value=text;area.setAttribute('readonly','');area.style.position='fixed';area.style.opacity='0';document.body.appendChild(area);area.select();const ok=document.execCommand('copy');area.remove();return ok;}catch(error){return false;}
  }
  function patchVegetableTableLabels(){
    document.querySelectorAll('#tb-meal-portion-tool .tb-portion-label,#tb-portion-reference-modal .tb-portion-label').forEach(node=>{
      const text=String(node.textContent||'');if(/tomate/i.test(text))node.textContent=text.replace(/tomate/gi,'Vegetais');
    });
    document.querySelectorAll('#tb-meal-portion-tool .tb-portion-macro,#tb-portion-reference-modal .tb-portion-macro').forEach(node=>{
      if(/^tomate$/i.test(String(node.textContent||'').trim()))node.textContent='Vegetais';
    });
  }
  function ensureMutablePortionApi(){
    const api=window.TeamBullsDietPortions;if(!api||!Array.isArray(api.presets))return null;
    if(api.__tbCustomFoodMutable===true){patchVegetableTableLabels();return api;}
    const originalPresets=Array.from(api.presets);
    const vegetableBase=originalPresets.map(item=>{
      const vegetableLabel=VEGETABLE_LABELS[item?.id];
      return vegetableLabel?{...item,group:'vegetais',label:vegetableLabel}:{...item};
    });
    const legacyAliases=originalPresets.filter(item=>VEGETABLE_LABELS[item?.id]).map(item=>({...item,id:`legacy-${item.id}`,group:'legacy',__tbVegetableLegacyAlias:true}));
    const mutable=[...vegetableBase,...legacyAliases];
    const originalAdd=typeof api.add==='function'?api.add.bind(api):null;
    const originalCopy=typeof api.copy==='function'?api.copy.bind(api):null;
    const originalToggle=typeof api.toggleMealTable==='function'?api.toggleMealTable.bind(api):null;
    const originalFilter=typeof api.filterMealTable==='function'?api.filterMealTable.bind(api):null;
    const originalClear=typeof api.clearMealSearch==='function'?api.clearMealSearch.bind(api):null;
    const originalOpenReference=typeof api.openReference==='function'?api.openReference.bind(api):null;
    const vegetableItem=id=>mutable.find(item=>item?.id===id&&VEGETABLE_LABELS[id])||null;
    const wrapped={
      ...api,
      presets:mutable,
      add(id){
        const item=vegetableItem(id);if(!item)return originalAdd?.(id);
        if(appendMealLine(item.label)&&typeof showToast==='function')showToast('✓ '+item.label+' adicionada à refeição');
      },
      async copy(id){
        const item=vegetableItem(id);if(!item)return originalCopy?.(id);
        const ok=await copyText(item.label);if(typeof showToast==='function')showToast(ok?'✓ Porção copiada':'Não foi possível copiar a porção.',!ok);
      },
      toggleMealTable(){const result=originalToggle?.();requestAnimationFrame(patchVegetableTableLabels);return result;},
      filterMealTable(query){const translated=String(query||'').replace(/vegetais/gi,'tomate').replace(/vegetal/gi,'tomate');const result=originalFilter?.(translated);requestAnimationFrame(patchVegetableTableLabels);return result;},
      clearMealSearch(){const result=originalClear?.();requestAnimationFrame(patchVegetableTableLabels);return result;},
      openReference(){const result=originalOpenReference?.();requestAnimationFrame(patchVegetableTableLabels);return result;}
    };
    Object.defineProperty(wrapped,'__tbCustomFoodMutable',{value:true,enumerable:false});
    window.TeamBullsDietPortions=Object.freeze(wrapped);
    patchVegetableTableLabels();
    return window.TeamBullsDietPortions;
  }
  function apply(items=cached){
    const api=ensureMutablePortionApi(),presets=api?.presets;if(!Array.isArray(presets))return 0;
    const clean=normalize(items),customKeys=new Set(clean.map(item=>key(item.label)));
    const base=presets.filter(item=>!item?.[FLAG]&&!item?.__tbCustomFoodBridge&&!customKeys.has(key(item?.label)));
    presets.splice(0,presets.length,...base,...clean);
    cached=clean;
    patchVegetableTableLabels();
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
    ensureMutablePortionApi();
    const table=tableItems();
    if(table){cached=table;return apply();}
    if(cached.length)return apply();
    load().catch(()=>0);return 0;
  }
  function schedule({reload=false}={}){
    if(refreshFrame)cancelAnimationFrame(refreshFrame);
    refreshFrame=requestAnimationFrame(()=>{
      refreshFrame=0;ensureMutablePortionApi();patchVegetableTableLabels();
      const table=tableItems();
      if(table){cached=table;apply();return;}
      if(reload)load(true).catch(()=>0);else if(cached.length)apply();else load().catch(()=>0);
    });
  }
  function relevant(mutation){
    const target=mutation.target?.nodeType===Node.ELEMENT_NODE?mutation.target:mutation.target?.parentElement;
    if(target?.closest?.('[data-custom-food-list],#tb-meal-portion-body,#tb-portion-reference-modal'))return true;
    return [...(mutation.addedNodes||[])].some(node=>node?.nodeType===Node.ELEMENT_NODE&&(node.matches?.('[data-custom-food-list],#tb-meal-portion-body,.tb-custom-table,#tb-portion-reference-modal,.tb-portion-table')||node.querySelector?.('[data-custom-food-list],#tb-meal-portion-body,.tb-custom-table,#tb-portion-reference-modal,.tb-portion-table')));
  }
  function beforeMealInput(event){
    if(event.target?.id!=='input-meal-items')return;
    // Captura antes do listener do workspace, garantindo que a linha recém-adicionada já tenha macros conhecidos.
    syncNow();
  }
  function beforeCustomAddClick(event){
    const button=event.target?.closest?.('button');if(!button)return;
    const section=button.closest?.('[data-custom-food-mode="add"]');
    const action=String(button.getAttribute?.('onclick')||'');
    if(section&&action.includes('TeamBullsDietPersonalization.addCustom'))syncNow();
  }
  function loadPdfExporter(){
    if(window.TeamBullsPdfExport)return Promise.resolve(true);
    if(pdfLoading)return pdfLoading;
    pdfLoading=new Promise(resolve=>{
      const finish=ok=>{if(!ok)pdfLoading=null;resolve(!!ok);};
      const existing=[...document.scripts].find(script=>{try{return new URL(script.src,location.href).pathname.endsWith('/modules/pdf-export-v10_10_12.js');}catch(error){return false;}});
      if(existing){
        if(window.TeamBullsPdfExport){finish(true);return;}
        let settled=false;const done=ok=>{if(settled)return;settled=true;clearTimeout(timer);finish(ok);};
        const timer=setTimeout(()=>done(!!window.TeamBullsPdfExport),7000);
        existing.addEventListener('load',()=>done(!!window.TeamBullsPdfExport),{once:true});
        existing.addEventListener('error',()=>done(false),{once:true});return;
      }
      const script=document.createElement('script');script.src=PDF_MODULE;script.async=false;script.dataset.teamBullsPdf='1';
      script.onload=()=>finish(!!window.TeamBullsPdfExport);script.onerror=()=>finish(false);document.head.appendChild(script);
    });
    return pdfLoading;
  }
  function preparePdf(){loadPdfExporter().then(ok=>{if(!ok&&navigator.onLine!==false)setTimeout(()=>loadPdfExporter(),1800);}).catch(()=>{});}
  function install(){
    if(!document.body)return false;
    ensureMutablePortionApi();patchVegetableTableLabels();
    if(!observer){observer=new MutationObserver(mutations=>{if(mutations.some(relevant))schedule();});observer.observe(document.body,{childList:true,subtree:true,characterData:true});}
    if(document.documentElement.dataset.tbCustomFoodCapture!=='1'){
      document.documentElement.dataset.tbCustomFoodCapture='1';
      document.addEventListener('input',beforeMealInput,true);
      document.addEventListener('change',beforeMealInput,true);
      document.addEventListener('click',beforeCustomAddClick,true);
    }
    load().catch(()=>0);preparePdf();return true;
  }

  window.TeamBullsCustomFoodCalories=Object.freeze({version:VERSION,load,apply:syncNow,refresh:()=>schedule({reload:true}),items:()=>cached.slice(),loadPdfExporter});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
  window.addEventListener('team-bulls-runtime-ready',()=>{ensureMutablePortionApi();load(true).catch(()=>0);preparePdf();});
  window.addEventListener('online',preparePdf);
  window.addEventListener('pageshow',()=>{install();load(true).catch(()=>0);preparePdf();},{passive:true});
})();
