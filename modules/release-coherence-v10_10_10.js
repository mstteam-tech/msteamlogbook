(()=>{
  'use strict';
  if(window.__TEAM_BULLS_RELEASE_COHERENCE_10_10_10__)return;
  window.__TEAM_BULLS_RELEASE_COHERENCE_10_10_10__=true;

  const RELEASE_VERSION='10.10.9';
  const PATCH_VERSION='10.10.12-release6';
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
        #week-superset-pair-group.tb-ss-active,
        #superset-pair-group.tb-ss-active{
          display:block!important;
          visibility:visible!important;
          opacity:1!important;
          overflow:visible!important;
          border:1px solid rgba(225,29,72,.72)!important;
          background:linear-gradient(135deg,rgba(128,20,32,.23),rgba(10,10,10,.96))!important;
          padding:12px!important;
          margin-top:10px!important;
          flex:0 0 auto!important;
        }
        #week-input-superset-exercise,
        #input-superset-exercise{
          display:block!important;
          width:100%!important;
          min-height:42px!important;
          margin-top:7px!important;
          border-color:rgba(225,29,72,.72)!important;
        }
        .tb-superset-helper{
          display:block;
          margin:7px 0 0;
          font-family:'DM Mono',monospace;
          font-size:9px;
          line-height:1.45;
          letter-spacing:.35px;
          color:#c8b7aa;
        }
        .tb-superset-helper[data-state="ok"]{color:#86d39b}
        .tb-superset-helper[data-state="warn"]{color:#f1b56a}
        .tb-superset-helper[data-state="error"]{color:#f18b8d}
      `;
      document.head.appendChild(style);
    }catch(error){console.warn('[Team Bulls] Falha ao corrigir rolagem do editor de técnicas',error);}
  }

  function sameExerciseDay(left,right){
    const norm=value=>String(value||'Treino geral').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim().toLowerCase();
    return norm(left?.dayName)===norm(right?.dayName);
  }
  function currentWeeklySupersetContext(){
    try{
      if(typeof getPlanEditExercise!=='function')return null;
      const source=getPlanEditExercise();
      const workout=typeof PLAN_EDIT_TARGET!=='undefined'&&PLAN_EDIT_TARGET==='trainer'?VIEW_STUDENT_WORKOUT:(typeof getW==='function'?getW(PLAN_EDIT_WID):null);
      const week=Math.max(1,Math.min(8,Number(document.getElementById('input-prescription-week')?.value)||1));
      return source&&workout?{source,workout,week}:null;
    }catch(error){return null;}
  }
  function weeklyPairOwner(workout,candidate,week,sourceId=''){
    if(!workout||!candidate||typeof resolveWeekTechniqueConfig!=='function')return null;
    const own=resolveWeekTechniqueConfig(candidate,week),direct=String(own.supersetExerciseId||'');
    if(direct&&direct!==String(sourceId||''))return (workout.exercises||[]).find(item=>String(item.id)===direct)||{id:direct,name:'outro exercício'};
    return (workout.exercises||[]).find(item=>String(item.id)!==String(sourceId||'')&&String(item.id)!==String(candidate.id)&&String(resolveWeekTechniqueConfig(item,week).supersetExerciseId||'')===String(candidate.id))||null;
  }
  function basePairOwner(workout,candidate,sourceId=''){
    if(!workout||!candidate)return null;
    const direct=String(candidate.supersetExerciseId||'');
    if(direct&&direct!==String(sourceId||''))return (workout.exercises||[]).find(item=>String(item.id)===direct)||{id:direct,name:'outro exercício'};
    return (workout.exercises||[]).find(item=>String(item.id)!==String(sourceId||'')&&String(item.id)!==String(candidate.id)&&String(item.supersetExerciseId||'')===String(candidate.id))||null;
  }
  function helperFor(group,id){
    if(!group)return null;let helper=group.querySelector('.tb-superset-helper');
    if(!helper){helper=document.createElement('span');helper.className='tb-superset-helper';helper.id=id;group.appendChild(helper);}return helper;
  }
  function setSupersetHelper(group,text,state='warn',id='tb-superset-helper'){
    const helper=helperFor(group,id);if(!helper)return;helper.textContent=text;helper.dataset.state=state;
  }
  function populateWeeklySupersetSelect({focus=false}={}){
    const ctx=currentWeeklySupersetContext(),select=document.getElementById('week-input-superset-exercise'),group=document.getElementById('week-superset-pair-group');
    if(!ctx||!select||!group)return false;
    const checked=[...document.querySelectorAll('#week-technique-picker input[type="checkbox"]:checked')].some(input=>input.value==='ss');
    group.classList.toggle('tb-ss-active',checked);if(!checked)return false;
    const resolved=typeof resolveWeekTechniqueConfig==='function'?resolveWeekTechniqueConfig(ctx.source,ctx.week):{},previous=String(select.value||resolved?.supersetExerciseId||'');
    const candidates=(ctx.workout.exercises||[]).filter(item=>item&&String(item.id)!==String(ctx.source.id));
    const same=candidates.filter(item=>sameExerciseDay(item,ctx.source)),other=candidates.filter(item=>!sameExerciseDay(item,ctx.source));
    select.innerHTML='<option value="">Selecione o segundo exercício do Super Set</option>';
    const append=(items,label,allow)=>{
      if(!items.length)return;const groupEl=document.createElement('optgroup');groupEl.label=label;
      items.forEach(item=>{const option=document.createElement('option'),owner=weeklyPairOwner(ctx.workout,item,ctx.week,ctx.source.id),busy=!!owner;option.value=String(item.id);option.textContent=(item.name||'Exercício')+(busy?` — já em SS com ${owner.name||'outro exercício'}`:'');option.disabled=!allow||busy;if(String(item.id)===previous&&(!busy||String(owner?.id||'')===String(ctx.source.id)))option.selected=true;groupEl.appendChild(option);});select.appendChild(groupEl);
    };
    append(same,'MESMO DIA — recomendado',true);
    append(other,'OUTROS DIAS — não permitido',false);
    if(previous&&[...select.options].some(option=>option.value===previous&&!option.disabled))select.value=previous;
    const available=same.filter(item=>!weeklyPairOwner(ctx.workout,item,ctx.week,ctx.source.id));
    if(!same.length)setSupersetHelper(group,'Adicione outro exercício neste mesmo dia antes de usar Super Set.','error','tb-week-superset-helper');
    else if(!available.length)setSupersetHelper(group,'Todos os outros exercícios deste dia já pertencem a um Super Set nesta semana.','error','tb-week-superset-helper');
    else if(select.value){const partner=same.find(item=>String(item.id)===String(select.value));setSupersetHelper(group,`Par da semana ${ctx.week}: ${ctx.source.name} + ${partner?.name||'exercício selecionado'}.`,'ok','tb-week-superset-helper');}
    else setSupersetHelper(group,`Escolha um segundo exercício do mesmo dia para formar o par da semana ${ctx.week}.`,'warn','tb-week-superset-helper');
    select.onchange=()=>{const partner=same.find(item=>String(item.id)===String(select.value));setSupersetHelper(group,partner?`Par da semana ${ctx.week}: ${ctx.source.name} + ${partner.name}.`:`Escolha um segundo exercício do mesmo dia para formar o par da semana ${ctx.week}.`,partner?'ok':'warn','tb-week-superset-helper');try{if(typeof onWeekTechniqueSelectionChange==='function')onWeekTechniqueSelectionChange(true);}catch(error){}};
    if(focus){requestAnimationFrame(()=>{try{group.scrollIntoView({behavior:'smooth',block:'nearest'});select.focus({preventScroll:true});}catch(error){select.focus();}});}
    return true;
  }
  function populateBaseSupersetSelect({focus=false}={}){
    try{
      const select=document.getElementById('input-superset-exercise'),group=document.getElementById('superset-pair-group');if(!select||!group)return false;
      const source=typeof EDIT_EXERCISE_ID!=='undefined'&&EDIT_EXERCISE_ID?(typeof exerciseModalWorkout==='function'?exerciseModalWorkout()?.exercises?.find(item=>String(item.id)===String(EDIT_EXERCISE_ID)):null):null;
      const workout=typeof exerciseModalWorkout==='function'?exerciseModalWorkout():null;if(!workout)return false;
      const checked=[...document.querySelectorAll('#exercise-technique-picker input[type="checkbox"]:checked')].some(input=>input.value==='ss');group.classList.toggle('tb-ss-active',checked);if(!checked)return false;
      const previous=String(select.value||source?.supersetExerciseId||''),candidates=(workout.exercises||[]).filter(item=>item&&String(item.id)!==String(source?.id||'')),same=candidates.filter(item=>!source||sameExerciseDay(item,source)),other=source?candidates.filter(item=>!sameExerciseDay(item,source)):[];
      select.innerHTML='<option value="">Selecione o segundo exercício do Super Set</option>';
      const append=(items,label,allow)=>{if(!items.length)return;const groupEl=document.createElement('optgroup');groupEl.label=label;items.forEach(item=>{const option=document.createElement('option'),owner=basePairOwner(workout,item,source?.id),busy=!!owner;option.value=String(item.id);option.textContent=(item.name||'Exercício')+(busy?` — já em SS com ${owner.name||'outro exercício'}`:'');option.disabled=!allow||busy;if(String(item.id)===previous&&!option.disabled)option.selected=true;groupEl.appendChild(option);});select.appendChild(groupEl);};
      append(same,source?'MESMO DIA — recomendado':'EXERCÍCIOS DISPONÍVEIS',true);append(other,'OUTROS DIAS — não permitido',false);if(previous&&[...select.options].some(option=>option.value===previous&&!option.disabled))select.value=previous;
      setSupersetHelper(group,select.value?'Super Set pareado com o exercício selecionado.':'Escolha um exercício disponível para criar o par. ',select.value?'ok':'warn','tb-base-superset-helper');
      select.onchange=()=>setSupersetHelper(group,select.value?'Super Set pareado com o exercício selecionado.':'Escolha um exercício disponível para criar o par.',select.value?'ok':'warn','tb-base-superset-helper');
      if(focus)requestAnimationFrame(()=>{try{group.scrollIntoView({behavior:'smooth',block:'nearest'});select.focus({preventScroll:true});}catch(error){select.focus();}});return true;
    }catch(error){console.warn('[Team Bulls] Falha ao montar seletor base de Super Set',error);return false;}
  }
  function installSupersetIntegrityFix(){
    try{
      if(window.__TEAM_BULLS_SUPERSET_INTEGRITY_1__)return true;
      if(typeof renderWeekTechniqueEditor!=='function'||typeof onWeekTechniqueSelectionChange!=='function'||typeof validateWeekTechniqueConfig!=='function')return false;
      window.__TEAM_BULLS_SUPERSET_INTEGRITY_1__=true;
      const renderBase=renderWeekTechniqueEditor;
      renderWeekTechniqueEditor=function(){const result=renderBase.apply(this,arguments);[0,40,160,450].forEach(delay=>setTimeout(()=>populateWeeklySupersetSelect(),delay));return result;};
      const changeBase=onWeekTechniqueSelectionChange;
      let previousWeekSS=false;
      onWeekTechniqueSelectionChange=function(){const before=previousWeekSS,result=changeBase.apply(this,arguments),now=[...document.querySelectorAll('#week-technique-picker input[type="checkbox"]:checked')].some(input=>input.value==='ss');previousWeekSS=now;populateWeeklySupersetSelect({focus:now&&!before});return result;};
      const validateBase=validateWeekTechniqueConfig;
      validateWeekTechniqueConfig=function(config){
        if(!config?.techniqueIds?.includes('ss'))return validateBase.apply(this,arguments);
        const ctx=currentWeeklySupersetContext(),partnerId=String(config.supersetExerciseId||'');
        if(!ctx){alert('Não foi possível identificar o exercício desta prescrição. Feche e abra o editor novamente.');return false;}
        if(!partnerId){populateWeeklySupersetSelect({focus:true});alert('Escolha o segundo exercício do Super Set no campo destacado abaixo das técnicas.');return false;}
        if(partnerId===String(ctx.source.id)){alert('Um exercício não pode formar Super Set com ele mesmo.');return false;}
        const partner=(ctx.workout.exercises||[]).find(item=>String(item.id)===partnerId);if(!partner){populateWeeklySupersetSelect({focus:true});alert('O exercício escolhido para o Super Set não está mais disponível neste protocolo.');return false;}
        if(!sameExerciseDay(ctx.source,partner)){populateWeeklySupersetSelect({focus:true});alert('O Super Set deve usar dois exercícios do mesmo dia de treino.');return false;}
        const owner=weeklyPairOwner(ctx.workout,partner,ctx.week,ctx.source.id);if(owner){populateWeeklySupersetSelect({focus:true});alert(`O exercício ${partner.name||'selecionado'} já pertence a outro Super Set nesta semana.`);return false;}
        return true;
      };
      if(typeof onTechniqueSelectionChange==='function'){
        const baseChange=onTechniqueSelectionChange;let previousBaseSS=false;
        onTechniqueSelectionChange=function(){const before=previousBaseSS,result=baseChange.apply(this,arguments),now=[...document.querySelectorAll('#exercise-technique-picker input[type="checkbox"]:checked')].some(input=>input.value==='ss');previousBaseSS=now;populateBaseSupersetSelect({focus:now&&!before});return result;};
      }
      document.addEventListener('change',event=>{if(event.target?.id==='week-input-superset-exercise')populateWeeklySupersetSelect();if(event.target?.id==='input-superset-exercise')populateBaseSupersetSelect();},true);
      window.addEventListener('team-bulls-runtime-ready',()=>{populateWeeklySupersetSelect();populateBaseSupersetSelect();},{once:false});
      return true;
    }catch(error){console.warn('[Team Bulls] Falha ao instalar integridade de Super Set',error);return false;}
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

  function install(){applyVersionLabels();patchFirebaseRuleMessage();installPrescriptionTechniqueOverflowFix();installSupersetIntegrityFix();installCustomFoodMacroBridge();setTimeout(()=>{installSupersetIntegrityFix();verifyRuntime();},0);}
  window.TeamBullsRelease=Object.freeze({version:RELEASE_VERSION,patchVersion:PATCH_VERSION,activeFirestoreRules:ACTIVE_FIRESTORE_RULES,verify:verifyRuntime,refreshLabels:applyVersionLabels,syncCustomFoodMacros:refreshDietTotalsFromCustomFoods,refreshSuperset:populateWeeklySupersetSelect});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
  window.addEventListener('pageshow',()=>{applyVersionLabels();installPrescriptionTechniqueOverflowFix();installSupersetIntegrityFix();installCustomFoodMacroBridge();refreshDietTotalsFromCustomFoods();populateWeeklySupersetSelect();},{passive:true});
})();
