/* Team Bulls v10.10.12 — integridade de composição de técnicas e Super Set. */
'use strict';
(()=>{
  if(window.__TEAM_BULLS_TECHNIQUE_COMPOSITION_INTEGRITY_1__)return;
  window.__TEAM_BULLS_TECHNIQUE_COMPOSITION_INTEGRITY_1__=true;

  const VERSION='10.10.12-techcombo1';
  let installed=false;

  const ids=value=>{
    const out=[];
    for(const raw of Array.isArray(value)?value:[]){
      const id=String(raw||'').slice(0,100);
      if(id&&!out.includes(id))out.push(id);
    }
    return out;
  };
  const config=value=>{
    const raw=value&&typeof value==='object'&&!Array.isArray(value)?value:{};
    const techniqueIds=ids(raw.techniqueIds),optionalTechniqueIds=ids(raw.optionalTechniqueIds).filter(id=>id==='mp'&&techniqueIds.includes('mp'));
    const supersetExerciseId=techniqueIds.includes('ss')?String(raw.supersetExerciseId||'').slice(0,128):'';
    return{techniqueIds,optionalTechniqueIds,supersetExerciseId};
  };
  const sorted=value=>ids(value).slice().sort();
  const equal=(left,right)=>{
    const a=config(left),b=config(right);
    return JSON.stringify(sorted(a.techniqueIds))===JSON.stringify(sorted(b.techniqueIds))
      &&JSON.stringify(sorted(a.optionalTechniqueIds))===JSON.stringify(sorted(b.optionalTechniqueIds))
      &&String(a.supersetExerciseId||'')===String(b.supersetExerciseId||'');
  };
  const clonePlan=value=>{
    const raw=value&&typeof value==='object'&&!Array.isArray(value)?value:{};
    const out={};
    for(const [key,item] of Object.entries(raw))if(/^w[1-8]$/.test(key))out[key]=config(item);
    return out;
  };
  const normDay=value=>String(value||'Treino geral').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim().toLowerCase();
  const sameDay=(left,right)=>normDay(left?.dayName)===normDay(right?.dayName);
  const rawBase=exercise=>config(exercise||{});
  function reverseBasePartner(workout,sourceId){
    return (workout?.exercises||[]).find(item=>String(item?.id||'')!==String(sourceId||'')&&String(item?.supersetExerciseId||'')===String(sourceId||''))||null;
  }
  function effectiveBase(workout,exercise){
    const base=rawBase(exercise);if(!exercise)return base;
    if(base.techniqueIds.includes('ss')&&base.supersetExerciseId)return base;
    const reverse=reverseBasePartner(workout,exercise.id);if(!reverse)return base;
    return config({...base,techniqueIds:[...base.techniqueIds,'ss'],supersetExerciseId:reverse.id});
  }
  function baseConflict(workout,sourceId,partnerId){
    const partner=(workout?.exercises||[]).find(item=>String(item?.id||'')===String(partnerId||''));if(!partner)return null;
    const direct=String(partner.supersetExerciseId||'');
    if(direct&&direct!==String(sourceId||''))return (workout.exercises||[]).find(item=>String(item.id)===direct)||{id:direct,name:'outro exercício'};
    return (workout.exercises||[]).find(item=>String(item?.id||'')!==String(sourceId||'')&&String(item?.id||'')!==String(partnerId||'')&&String(item?.supersetExerciseId||'')===String(partnerId||''))||null;
  }
  const withSs=(base,partnerId)=>config({...base,techniqueIds:[...ids(base?.techniqueIds).filter(id=>id!=='ss'),'ss'],supersetExerciseId:partnerId});
  const withoutSs=base=>config({...base,techniqueIds:ids(base?.techniqueIds).filter(id=>id!=='ss'),supersetExerciseId:''});
  function explicitWeek(record,week){const key='w'+week;return Object.prototype.hasOwnProperty.call(record.weeklyTechniquePlan||{},key)?config(record.weeklyTechniquePlan[key]):null;}
  function explicitWeeklyConflict(records,sourceId,partnerId,week){
    const partner=records.get(String(partnerId||''));if(!partner)return null;
    const own=explicitWeek(partner,week),direct=String(own?.supersetExerciseId||'');
    if(direct&&direct!==String(sourceId||''))return records.get(direct)||{id:direct,name:'outro exercício'};
    for(const item of records.values()){
      if(String(item.id)===String(sourceId)||String(item.id)===String(partnerId))continue;
      const cfg=explicitWeek(item,week);if(String(cfg?.supersetExerciseId||'')===String(partnerId))return item;
    }
    return null;
  }
  function computeRepair(workout,sourceId,oldRawInput,oldEffectiveInput,newInput){
    const originals=new Map(),records=new Map();
    for(const exercise of workout?.exercises||[]){
      if(!exercise?.id)continue;
      const record={id:String(exercise.id),name:String(exercise.name||''),dayName:String(exercise.dayName||''),techniqueIds:ids(exercise.techniqueIds),optionalTechniqueIds:ids(exercise.optionalTechniqueIds),supersetExerciseId:String(exercise.supersetExerciseId||''),weeklyTechniquePlan:clonePlan(exercise.weeklyTechniquePlan)};
      originals.set(record.id,JSON.stringify(record));records.set(record.id,record);
    }
    const source=records.get(String(sourceId||''));if(!source)return{updates:[],migratedWeeks:[],blockedWeeks:[],error:'source-missing'};
    const oldRaw=config(oldRawInput),oldEffective=config(oldEffectiveInput),next=config(newInput);
    const oldPartnerId=oldEffective.techniqueIds.includes('ss')?String(oldEffective.supersetExerciseId||''):'';
    const newPartnerId=next.techniqueIds.includes('ss')?String(next.supersetExerciseId||''):'';
    if(newPartnerId){
      const conflict=baseConflict({exercises:[...records.values()]},source.id,newPartnerId);
      if(conflict)return{updates:[],migratedWeeks:[],blockedWeeks:[],error:'partner-busy',ownerId:String(conflict.id||'')};
    }
    source.techniqueIds=next.techniqueIds;source.optionalTechniqueIds=next.optionalTechniqueIds;source.supersetExerciseId=next.supersetExerciseId;
    for(const item of records.values()){
      if(item.id===source.id||item.id===newPartnerId)continue;
      if(String(item.supersetExerciseId||'')===source.id){const clean=withoutSs(item);item.techniqueIds=clean.techniqueIds;item.optionalTechniqueIds=clean.optionalTechniqueIds;item.supersetExerciseId='';}
    }
    if(oldPartnerId&&oldPartnerId!==newPartnerId){
      const oldPartner=records.get(oldPartnerId);if(oldPartner&&String(oldPartner.supersetExerciseId||'')===source.id){const clean=withoutSs(oldPartner);oldPartner.techniqueIds=clean.techniqueIds;oldPartner.optionalTechniqueIds=clean.optionalTechniqueIds;oldPartner.supersetExerciseId='';}
    }
    if(newPartnerId){
      const partner=records.get(newPartnerId);if(partner){const paired=withSs(partner,source.id);partner.techniqueIds=paired.techniqueIds;partner.optionalTechniqueIds=paired.optionalTechniqueIds;partner.supersetExerciseId=source.id;}
    }
    const migratedWeeks=[],blockedWeeks=[];
    const originalSourcePlan=clonePlan(workout.exercises.find(item=>String(item?.id||'')===source.id)?.weeklyTechniquePlan);
    for(let week=1;week<=8;week++){
      const key='w'+week;if(!Object.prototype.hasOwnProperty.call(originalSourcePlan,key))continue;
      const current=config(originalSourcePlan[key]);if(!equal(current,oldRaw)&&!equal(current,oldEffective))continue;
      if(newPartnerId){const conflict=explicitWeeklyConflict(records,source.id,newPartnerId,week);if(conflict){blockedWeeks.push(week);continue;}}
      source.weeklyTechniquePlan[key]=next;migratedWeeks.push(week);
      for(const item of records.values()){
        if(item.id===source.id||item.id===newPartnerId)continue;
        const itemCfg=explicitWeek(item,week);if(itemCfg&&String(itemCfg.supersetExerciseId||'')===source.id)item.weeklyTechniquePlan[key]=withoutSs(itemCfg);
      }
      if(oldPartnerId&&oldPartnerId!==newPartnerId){const oldPartner=records.get(oldPartnerId),oldCfg=oldPartner&&explicitWeek(oldPartner,week);if(oldCfg&&String(oldCfg.supersetExerciseId||'')===source.id)oldPartner.weeklyTechniquePlan[key]=withoutSs(oldCfg);}
      if(newPartnerId){const partner=records.get(newPartnerId),partnerCfg=partner&&explicitWeek(partner,week);if(partnerCfg)partner.weeklyTechniquePlan[key]=withSs(partnerCfg,source.id);}
    }
    const updates=[];
    for(const record of records.values())if(originals.get(record.id)!==JSON.stringify(record))updates.push({id:record.id,techniqueIds:record.techniqueIds,optionalTechniqueIds:record.optionalTechniqueIds,supersetExerciseId:record.supersetExerciseId,weeklyTechniquePlan:record.weeklyTechniquePlan});
    return{updates,migratedWeeks,blockedWeeks,error:''};
  }

  function modalWorkout(){
    try{if(typeof exerciseModalWorkout==='function')return exerciseModalWorkout();}catch(error){}
    try{if(typeof MODAL_TARGET!=='undefined'&&MODAL_TARGET==='student'&&typeof VIEW_STUDENT_WORKOUT!=='undefined')return VIEW_STUDENT_WORKOUT;}catch(error){}
    try{if(typeof getW==='function'&&typeof CUR_WORKOUT!=='undefined')return getW(CUR_WORKOUT);}catch(error){}
    return null;
  }
  function selectedBaseConfig(){
    const techniqueIds=[...document.querySelectorAll('#exercise-technique-picker input[type="checkbox"]:checked')].map(input=>input.value),optionalTechniqueIds=techniqueIds.includes('mp')&&document.getElementById('input-myo-optional')?.checked?['mp']:[],supersetExerciseId=techniqueIds.includes('ss')?String(document.getElementById('input-superset-exercise')?.value||''):'';
    return config({techniqueIds,optionalTechniqueIds,supersetExerciseId});
  }
  function ensureCreationId(next){
    if(!next.techniqueIds.includes('ss'))return'';
    try{if(typeof EDIT_EXERCISE_ID!=='undefined'&&EDIT_EXERCISE_ID)return String(EDIT_EXERCISE_ID);}catch(error){}
    try{if(typeof EXERCISE_CREATE_ID!=='undefined'&&EXERCISE_CREATE_ID)return String(EXERCISE_CREATE_ID);}catch(error){}
    let generated='';try{if(typeof MODE!=='undefined'&&MODE==='local'&&typeof uid==='function')generated=String(uid());else if(typeof draftId==='function')generated=String(draftId('exercises'));else if(typeof uid==='function')generated=String(uid());}catch(error){}
    if(generated)try{EXERCISE_CREATE_ID=generated;}catch(error){}
    return generated;
  }
  function snapshotWorkout(workout){return{exercises:(workout?.exercises||[]).map(item=>({id:String(item.id||''),name:String(item.name||''),dayName:String(item.dayName||''),techniqueIds:ids(item.techniqueIds),optionalTechniqueIds:ids(item.optionalTechniqueIds),supersetExerciseId:String(item.supersetExerciseId||''),weeklyTechniquePlan:clonePlan(item.weeklyTechniquePlan)}))};}
  function applyMemoryUpdates(workout,updates){for(const update of updates){const item=(workout?.exercises||[]).find(exercise=>String(exercise.id)===String(update.id));if(item)Object.assign(item,{techniqueIds:ids(update.techniqueIds),optionalTechniqueIds:ids(update.optionalTechniqueIds),supersetExerciseId:String(update.supersetExerciseId||''),weeklyTechniquePlan:clonePlan(update.weeklyTechniquePlan)});}}
  async function persistRepair(workout,result){
    if(!result?.updates?.length)return true;
    const cloud=typeof MODE!=='undefined'&&MODE==='cloud'&&typeof CURRENT_USER!=='undefined'&&CURRENT_USER?.role==='trainer'&&typeof db!=='undefined'&&db;
    if(cloud){
      const batch=db.batch();for(const update of result.updates)batch.update(db.collection('exercises').doc(update.id),{techniqueIds:update.techniqueIds,optionalTechniqueIds:update.optionalTechniqueIds,supersetExerciseId:update.supersetExerciseId,weeklyTechniquePlan:update.weeklyTechniquePlan});
      const task=batch.commit();if(typeof cloudWrite==='function')await cloudWrite(task,'sincronizar composição de técnicas e Super Set');else await task;
    }
    applyMemoryUpdates(workout,result.updates);
    if(!cloud&&typeof localSave==='function'&&!localSave())throw new Error('Não foi possível salvar a composição de técnicas no aparelho.');
    return true;
  }
  function focusBasePair(){const group=document.getElementById('superset-pair-group'),select=document.getElementById('input-superset-exercise');requestAnimationFrame(()=>{try{group?.scrollIntoView({behavior:'smooth',block:'nearest'});select?.focus({preventScroll:true});}catch(error){select?.focus?.();}});}
  function validateBasePair(workout,sourceId,next){
    if(!next.techniqueIds.includes('ss'))return true;
    const partner=(workout?.exercises||[]).find(item=>String(item.id)===String(next.supersetExerciseId||''));if(!partner){focusBasePair();alert('Selecione o segundo exercício do Super Set.');return false;}
    const sourceDay=String(document.getElementById('input-exercise-day')?.value||'');if(sourceDay&&normDay(sourceDay)!==normDay(partner.dayName)){focusBasePair();alert('O Super Set deve usar dois exercícios do mesmo dia de treino.');return false;}
    const owner=baseConflict(workout,sourceId,next.supersetExerciseId);if(owner){focusBasePair();alert(`O exercício ${partner.name||'selecionado'} já pertence a outro Super Set.`);return false;}
    return true;
  }
  function wrapSaveExercise(){
    if(typeof saveExercise!=='function'||saveExercise.__tbTechniqueComposition)return;
    const base=saveExercise;
    const wrapped=async function(){
      const workout=modalWorkout(),next=selectedBaseConfig();let sourceId='';
      try{sourceId=String(typeof EDIT_EXERCISE_ID!=='undefined'&&EDIT_EXERCISE_ID||'');}catch(error){}
      if(!sourceId)sourceId=ensureCreationId(next);
      if(next.techniqueIds.includes('ss')&&(!workout||!sourceId||!validateBasePair(workout,sourceId,next)))return false;
      const sourceBefore=(workout?.exercises||[]).find(item=>String(item.id)===sourceId)||null,oldRaw=rawBase(sourceBefore),oldEffective=sourceBefore?effectiveBase(workout,sourceBefore):config({}),before=snapshotWorkout(workout);
      const result=await base.apply(this,arguments);
      const sourceAfter=(workout?.exercises||[]).find(item=>String(item.id)===sourceId)||null;
      if(!sourceAfter||!equal(rawBase(sourceAfter),next))return result;
      const repairInput=snapshotWorkout(before);if(!repairInput.exercises.some(item=>String(item.id)===sourceId))repairInput.exercises.push({id:sourceId,name:String(sourceAfter.name||''),dayName:String(sourceAfter.dayName||''),techniqueIds:ids(sourceAfter.techniqueIds),optionalTechniqueIds:ids(sourceAfter.optionalTechniqueIds),supersetExerciseId:String(sourceAfter.supersetExerciseId||''),weeklyTechniquePlan:clonePlan(sourceAfter.weeklyTechniquePlan)});
      const repair=computeRepair(repairInput,sourceId,oldRaw,oldEffective,next);
      if(repair.error){console.warn('[Team Bulls] Pareamento pós-salvamento não reconciliado:',repair);return result;}
      try{
        await persistRepair(workout,repair);
        if(repair.blockedWeeks.length&&typeof showToast==='function')showToast(`Técnicas salvas. ${repair.blockedWeeks.length} semana(s) com Super Set personalizado foram preservadas.`);
      }catch(error){console.error('[Team Bulls] Falha ao sincronizar composição de técnicas',error);if(typeof showToast==='function')showToast('Exercício salvo, mas a sincronização do Super Set precisa ser repetida.',true);}
      return result;
    };
    wrapped.__tbTechniqueComposition=true;wrapped.__tbBase=base;saveExercise=wrapped;try{window.saveExercise=wrapped;}catch(error){}
  }
  function pairForWeeklyEditor(){
    try{
      if(typeof getPlanEditExercise!=='function'||typeof resolveWeekTechniqueConfig!=='function')return null;
      const source=getPlanEditExercise(),ctx=typeof PLAN_EDIT_TARGET!=='undefined'&&PLAN_EDIT_TARGET==='trainer'?VIEW_STUDENT_WORKOUT:(typeof getW==='function'?getW(PLAN_EDIT_WID):null),week=Math.max(1,Math.min(8,Number(document.getElementById('input-prescription-week')?.value)||1));if(!source||!ctx)return null;
      const own=resolveWeekTechniqueConfig(source,week),direct=String(own.supersetExerciseId||'');if(direct)return{source,workout:ctx,week,partnerId:direct};
      const reverse=(ctx.exercises||[]).find(item=>String(item.id)!==String(source.id)&&String(resolveWeekTechniqueConfig(item,week).supersetExerciseId||'')===String(source.id));return reverse?{source,workout:ctx,week,partnerId:String(reverse.id)}:null;
    }catch(error){return null;}
  }
  function restoreSelectValue(select,value){if(!select||!value)return false;const option=[...select.options].find(item=>String(item.value)===String(value)&&!item.disabled);if(!option)return false;select.value=String(value);return true;}
  function repairWeeklyEditorDraft(){
    const pair=pairForWeeklyEditor();if(!pair)return false;const box=document.querySelector('#week-technique-picker input[type="checkbox"][value="ss"]');if(!box)return false;
    if(!box.checked){box.checked=true;try{if(typeof onWeekTechniqueSelectionChange==='function')onWeekTechniqueSelectionChange(false);}catch(error){}}
    const select=document.getElementById('week-input-superset-exercise');if(restoreSelectValue(select,pair.partnerId))return true;
    return false;
  }
  function repairBaseEditorDraft(exercise,workout){
    if(!exercise||!workout)return false;const resolved=effectiveBase(workout,exercise);if(!resolved.techniqueIds.includes('ss')||!resolved.supersetExerciseId)return false;
    const box=document.querySelector('#exercise-technique-picker input[type="checkbox"][value="ss"]');if(box&&!box.checked)box.checked=true;
    try{if(typeof onTechniqueSelectionChange==='function')onTechniqueSelectionChange(false);}catch(error){}
    return restoreSelectValue(document.getElementById('input-superset-exercise'),resolved.supersetExerciseId);
  }
  function wrapPickerPreparation(){
    if(typeof prepareExerciseTechniquePicker!=='function'||prepareExerciseTechniquePicker.__tbTechniqueComposition)return;
    const base=prepareExerciseTechniquePicker;
    const wrapped=async function(exercise,workout){
      let view=exercise;if(exercise&&workout){const effective=effectiveBase(workout,exercise);if(!equal(effective,rawBase(exercise)))view={...exercise,techniqueIds:effective.techniqueIds,optionalTechniqueIds:effective.optionalTechniqueIds,supersetExerciseId:effective.supersetExerciseId};}
      const result=await base.call(this,view,workout);if(exercise&&workout)[0,40,180].forEach(delay=>setTimeout(()=>repairBaseEditorDraft(exercise,workout),delay));return result;
    };
    wrapped.__tbTechniqueComposition=true;wrapped.__tbBase=base;prepareExerciseTechniquePicker=wrapped;try{window.prepareExerciseTechniquePicker=wrapped;}catch(error){}
  }
  function wrapSelection(name,pickerSelector,selectId){
    let fn=null;if(name==='onWeekTechniqueSelectionChange'){try{if(typeof onWeekTechniqueSelectionChange==='function')fn=onWeekTechniqueSelectionChange;}catch(error){}}else if(name==='onTechniqueSelectionChange'){try{if(typeof onTechniqueSelectionChange==='function')fn=onTechniqueSelectionChange;}catch(error){}}if(typeof fn!=='function'||fn.__tbTechniqueDraft)return;
    const wrapped=function(){const select=document.getElementById(selectId),previous=String(select?.value||''),result=fn.apply(this,arguments),hasSs=[...document.querySelectorAll(`${pickerSelector} input[type="checkbox"]:checked`)].some(input=>input.value==='ss');if(hasSs&&previous)requestAnimationFrame(()=>restoreSelectValue(document.getElementById(selectId),previous));return result;};
    wrapped.__tbTechniqueDraft=true;wrapped.__tbBase=fn;try{if(name==='onWeekTechniqueSelectionChange')onWeekTechniqueSelectionChange=wrapped;else if(name==='onTechniqueSelectionChange')onTechniqueSelectionChange=wrapped;window[name]=wrapped;}catch(error){}
  }
  function wrapWeeklyRender(){
    if(typeof renderWeekTechniqueEditor!=='function'||renderWeekTechniqueEditor.__tbTechniqueComposition)return;
    const base=renderWeekTechniqueEditor,wrapped=function(){const result=base.apply(this,arguments);[20,100,360,700].forEach(delay=>setTimeout(repairWeeklyEditorDraft,delay));return result;};wrapped.__tbTechniqueComposition=true;wrapped.__tbBase=base;renderWeekTechniqueEditor=wrapped;try{window.renderWeekTechniqueEditor=wrapped;}catch(error){}
  }
  function install(){
    if(installed)return true;
    if(window.__TEAM_BULLS_SUPERSET_INTEGRITY_1__!==true||typeof saveExercise!=='function'||typeof prepareExerciseTechniquePicker!=='function'||typeof renderWeekTechniqueEditor!=='function')return false;
    installed=true;wrapSelection('onWeekTechniqueSelectionChange','#week-technique-picker','week-input-superset-exercise');wrapSelection('onTechniqueSelectionChange','#exercise-technique-picker','input-superset-exercise');wrapWeeklyRender();wrapPickerPreparation();wrapSaveExercise();setTimeout(repairWeeklyEditorDraft,0);return true;
  }
  function ensureInstall(){if(install())return;[80,250,800,1800].forEach(delay=>setTimeout(install,delay));}

  window.TeamBullsTechniqueCompositionIntegrity=Object.freeze({version:VERSION,normalizeConfig:config,equalConfig:equal,effectiveBase,baseConflict,computeRepair,repairWeeklyEditorDraft,install:ensureInstall});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ensureInstall,{once:true});else ensureInstall();
  window.addEventListener('team-bulls-runtime-ready',ensureInstall);
  window.addEventListener('team-bulls-runtime-state',()=>setTimeout(ensureInstall,0));
  window.addEventListener('pageshow',()=>setTimeout(ensureInstall,60),{passive:true});
})();
