/* Team Bulls v10.10.9 — exclusão segura de refeições e itens prescritos da dieta. */
'use strict';
(()=>{
  if(window.__TEAM_BULLS_DIET_DELETE_FIX_V10109__)return;
  window.__TEAM_BULLS_DIET_DELETE_FIX_V10109__=true;

  const VERSION='10.10.9-dietdelete1';

  function clone(value){
    try{return JSON.parse(JSON.stringify(value));}catch(error){return value;}
  }
  function editingAllowed(){
    try{return typeof dietCanEdit==='function'&&dietCanEdit();}catch(error){return false;}
  }
  function captureContext(){
    try{
      return{
        local:!!DIET_CONTEXT?.local,
        trainer:!!DIET_CONTEXT?.trainer,
        targetUid:String(DIET_CONTEXT?.targetUid||''),
        dietId:String(CURRENT_DIET_ID||''),
        variantId:String(CURRENT_DIET_VARIANT_ID||'')
      };
    }catch(error){return null;}
  }
  function sameContext(context){
    const current=captureContext();
    return !!current&&current.local===context.local&&current.trainer===context.trainer&&current.targetUid===context.targetUid&&current.dietId===context.dietId&&current.variantId===context.variantId;
  }
  function planById(id){
    try{return (DIET_DOCUMENT?.plans||[]).find(plan=>String(plan.id)===String(id))||null;}catch(error){return null;}
  }
  function variantById(plan,id){
    return (plan?.variants||[]).find(variant=>String(variant.id)===String(id))||null;
  }
  function reportError(error,label){
    console.error('[Team Bulls] Falha ao '+label,error);
    const message=typeof cloudWriteError==='function'?cloudWriteError(error,label):('Não foi possível '+label+'.');
    alert(message);
    return false;
  }
  function refreshMeals(context){
    const plan=planById(context.dietId),variant=variantById(plan,context.variantId);
    try{if(typeof MEAL_PLAN_CACHE!=='undefined'&&variant)MEAL_PLAN_CACHE.meals=variant.meals;}catch(error){}
    try{
      if(typeof v104ActivateVariantMeals==='function')v104ActivateVariantMeals(context.trainer);
      else if(typeof renderMealsList==='function')renderMealsList();
    }catch(error){console.warn('[Team Bulls] Refeições excluídas, mas a tela não pôde ser atualizada imediatamente.',error);}
  }
  function refreshSupports(context){
    const plan=planById(context.dietId);if(!plan)return;
    const host=context.trainer?'ts-diet-support-tables':'diet-support-tables';
    try{if(typeof renderDietSupportTables==='function')renderDietSupportTables(host,plan,true);}catch(error){console.warn('[Team Bulls] Item excluído, mas a tabela não pôde ser atualizada imediatamente.',error);}
  }

  async function deleteMealConfirmed(context,mealId){
    if(!sameContext(context)||!editingAllowed())return reportError(new Error('A dieta aberta mudou. Abra a refeição novamente.'),'excluir a refeição');
    const plan=planById(context.dietId),variant=variantById(plan,context.variantId);
    if(!plan||!variant)return reportError(new Error('A divisão da dieta não está mais disponível.'),'excluir a refeição');
    const target=variant.meals.find(meal=>String(meal.id)===String(mealId));
    if(!target)return reportError(new Error('A refeição não foi encontrada na divisão atual.'),'excluir a refeição');

    const beforeDocument=clone(DIET_DOCUMENT);
    const beforeCache=clone(typeof MEAL_PLAN_CACHE!=='undefined'?MEAL_PLAN_CACHE.meals:[]);
    const actionKey='delete-diet-meal-'+String(mealId);
    if(typeof beginAction==='function'&&!beginAction(actionKey,'modal-meal'))return false;
    try{
      variant.meals=variant.meals.filter(meal=>String(meal.id)!==String(mealId));
      plan.meals=variant.meals;
      if(typeof MEAL_PLAN_CACHE!=='undefined')MEAL_PLAN_CACHE.meals=variant.meals;
      await persistDietDocument();
      try{EDIT_MEAL_ID=null;}catch(error){}
      if(typeof closeModal==='function')closeModal('modal-meal');
      refreshMeals(context);
      if(typeof showToast==='function')showToast('✓ Refeição excluída');
      return true;
    }catch(error){
      try{DIET_DOCUMENT=normalizeDietDocument(beforeDocument);}catch(inner){DIET_DOCUMENT=beforeDocument;}
      try{if(typeof MEAL_PLAN_CACHE!=='undefined')MEAL_PLAN_CACHE.meals=beforeCache;}catch(inner){}
      refreshMeals(context);
      return reportError(error,'excluir a refeição');
    }finally{
      if(typeof endAction==='function')endAction(actionKey,'modal-meal');
    }
  }

  function safeConfirmDeleteMeal(){
    if(!editingAllowed())return false;
    let mealId='';
    try{if(!MEAL_CTX?.canEditContent)return false;mealId=String(EDIT_MEAL_ID||'');}catch(error){return false;}
    if(!mealId)return false;
    const context=captureContext(),plan=context&&planById(context.dietId),variant=plan&&variantById(plan,context.variantId);
    if(!context||!variant||!variant.meals.some(meal=>String(meal.id)===mealId))return reportError(new Error('Refeição não encontrada. Feche e abra a dieta novamente.'),'excluir a refeição');
    const task=()=>deleteMealConfirmed(context,mealId);
    if(typeof showConfirm==='function'){
      showConfirm('Excluir refeição','Remover esta refeição desta divisão da dieta? Os registros de refeições concluídas do aluno não serão apagados.',task);
      return true;
    }
    if(window.confirm('Remover esta refeição desta divisão da dieta?')){void task();return true;}
    return false;
  }

  async function deleteSupportConfirmed(context,section,itemId){
    if(!sameContext(context)||!editingAllowed())return reportError(new Error('A dieta aberta mudou. Abra o item novamente.'),'excluir o item');
    const plan=planById(context.dietId);
    if(!plan)return reportError(new Error('A dieta não está mais disponível.'),'excluir o item');
    const allowed=Array.isArray(DIET_SECTION_DEFS)&&DIET_SECTION_DEFS.some(def=>def.key===section);
    if(!allowed)return reportError(new Error('Seção da dieta inválida.'),'excluir o item');
    if(!(plan[section]||[]).some(item=>String(item.id)===String(itemId)))return reportError(new Error('O item não foi encontrado na dieta atual.'),'excluir o item');

    const beforeDocument=clone(DIET_DOCUMENT);
    const actionKey='delete-diet-support-'+String(itemId);
    if(typeof beginAction==='function'&&!beginAction(actionKey,'modal-diet-support'))return false;
    try{
      plan[section]=(plan[section]||[]).filter(item=>String(item.id)!==String(itemId));
      await persistDietDocument();
      try{EDIT_DIET_SUPPORT_ID='';EDIT_DIET_SUPPORT_SECTION='';}catch(error){}
      if(typeof closeModal==='function')closeModal('modal-diet-support');
      refreshSupports(context);
      if(typeof showToast==='function')showToast('✓ Item excluído da dieta');
      return true;
    }catch(error){
      try{DIET_DOCUMENT=normalizeDietDocument(beforeDocument);}catch(inner){DIET_DOCUMENT=beforeDocument;}
      refreshSupports(context);
      return reportError(error,'excluir o item');
    }finally{
      if(typeof endAction==='function')endAction(actionKey,'modal-diet-support');
    }
  }

  function safeDeleteDietSupportItem(){
    if(!editingAllowed())return false;
    let section='',itemId='';
    try{section=String(EDIT_DIET_SUPPORT_SECTION||'');itemId=String(EDIT_DIET_SUPPORT_ID||'');}catch(error){return false;}
    if(!section||!itemId)return false;
    const context=captureContext(),plan=context&&planById(context.dietId);
    if(!context||!plan||(plan[section]||[]).every(item=>String(item.id)!==itemId))return reportError(new Error('Item não encontrado. Feche e abra a dieta novamente.'),'excluir o item');
    const task=()=>deleteSupportConfirmed(context,section,itemId);
    if(typeof showConfirm==='function'){
      showConfirm('Excluir item','Remover este item prescrito da dieta? A lista privada de suplementos do treinador não será alterada.',task);
      return true;
    }
    if(window.confirm('Remover este item prescrito da dieta?')){void task();return true;}
    return false;
  }

  function bindButton(id,handler){
    const button=document.getElementById(id);if(!button)return;
    button.onclick=handler;
    button.dataset.tbDietDeleteFix='1';
  }
  function install(){
    window.confirmDeleteMeal=safeConfirmDeleteMeal;
    window.deleteDietSupportItem=safeDeleteDietSupportItem;
    bindButton('btn-delete-meal',safeConfirmDeleteMeal);
    bindButton('btn-delete-diet-support',safeDeleteDietSupportItem);
    window.TeamBullsDietDeleteFix=Object.freeze({version:VERSION,deleteMeal:safeConfirmDeleteMeal,deleteSupport:safeDeleteDietSupportItem});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
