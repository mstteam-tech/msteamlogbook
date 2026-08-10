/* Team Bulls v10.10.9 — organiza as ações da prescrição sem trocar o design; as ações chamam os handlers reais diretamente. */
'use strict';
(()=>{
  if(window.__TEAM_BULLS_PRESCRIPTION_ACTIONS_LAYOUT_V10109__)return;
  window.__TEAM_BULLS_PRESCRIPTION_ACTIONS_LAYOUT_V10109__=true;

  const CENTER_ID='tb-prescription-actions-center';
  const WEEK_LABEL_ID='tb-prescription-actions-week';
  const GER_SELECT_ID='tb-actions-ger-level';
  const ORIGINAL_GROUPS=[
    '.week-technique-primary-actions',
    '.week-technique-propagation-actions',
    '.prescription-save-actions',
    '.prescription-global-actions',
    '.prescription-secondary-actions',
    '.week-technique-help',
    '#tb-ger-bulk-tools'
  ];
  const REQUIRED_KEYS=[
    'saveAll','saveTech','removeTech','replicate','copyWeekAll','copyAllWeeks',
    'techComplete','techBelowCurrent','techFuture','techBelowFuture','restoreTech','clearWeek','cancel'
  ];
  let installed=false;
  let busySeriesOnly=false;
  const proxies=new Map();

  function modal(){return document.getElementById('modal-prescription');}
  function currentWeek(){
    return Math.max(1,Math.min(8,parseInt(document.getElementById('input-prescription-week')?.value,10)||1));
  }
  function buttonByOnclick(fragment){
    return [...(modal()?.querySelectorAll('button[onclick]')||[])].find(button=>String(button.getAttribute('onclick')||'').includes(fragment))||null;
  }
  function originalActions(){
    return{
      saveAll:buttonByOnclick('savePrescription(false)'),
      saveTech:document.getElementById('btn-save-week-techniques'),
      removeTech:buttonByOnclick('clearCurrentWeekTechniques()'),
      replicate:document.getElementById('btn-replicate-prescription'),
      copyWeekAll:buttonByOnclick('confirmCopyCurrentWeekToAllExercises()'),
      copyAllWeeks:buttonByOnclick('confirmCopyAllWeeksToAllExercises()'),
      techComplete:document.getElementById('btn-propagate-techniques-complete'),
      techBelowCurrent:buttonByOnclick("confirmPropagateWeekTechniques('below-current')"),
      techFuture:buttonByOnclick("confirmPropagateWeekTechniques('source-future')"),
      techBelowFuture:buttonByOnclick("confirmPropagateWeekTechniques('below-future')"),
      restoreTech:buttonByOnclick('restoreWeekTechniquesToDefault()'),
      clearWeek:buttonByOnclick('clearPrescriptionWeek()'),
      cancel:buttonByOnclick("closeModal('modal-prescription')")
    };
  }
  function currentExercise(){
    try{return typeof getPlanEditExercise==='function'?getPlanEditExercise():null;}catch(error){return null;}
  }
  function validEditingTarget(){
    try{return PLAN_EDIT_TARGET==='trainer'||PLAN_EDIT_TARGET==='local';}catch(error){return false;}
  }
  function actionError(key,error){
    console.error('[Team Bulls] Falha ao executar ação organizada:',key,error);
    try{if(typeof showToast==='function')showToast('Não foi possível executar esta ação. Tente novamente.',true);}catch(inner){}
    return false;
  }
  function fallbackOriginalClick(key){
    const target=originalActions()[key];
    if(!target||target.disabled)return false;
    target.click();
    return true;
  }
  function runAction(key){
    if(key!=='cancel'&&!validEditingTarget())return false;
    let result=false;
    try{
      switch(key){
        case 'saveAll':result=typeof savePrescription==='function'?savePrescription(false):false;break;
        case 'saveTech':result=typeof saveCurrentWeekTechniques==='function'?saveCurrentWeekTechniques():false;break;
        case 'removeTech':result=typeof clearCurrentWeekTechniques==='function'?clearCurrentWeekTechniques():false;break;
        case 'replicate':result=typeof confirmReplicatePrescription==='function'?confirmReplicatePrescription():false;break;
        case 'copyWeekAll':result=typeof confirmCopyCurrentWeekToAllExercises==='function'?confirmCopyCurrentWeekToAllExercises():false;break;
        case 'copyAllWeeks':result=typeof confirmCopyAllWeeksToAllExercises==='function'?confirmCopyAllWeeksToAllExercises():false;break;
        case 'techComplete':result=typeof propagateTechniquesCompleteOneClick==='function'?propagateTechniquesCompleteOneClick():false;break;
        case 'techBelowCurrent':result=typeof confirmPropagateWeekTechniques==='function'?confirmPropagateWeekTechniques('below-current'):false;break;
        case 'techFuture':result=typeof confirmPropagateWeekTechniques==='function'?confirmPropagateWeekTechniques('source-future'):false;break;
        case 'techBelowFuture':result=typeof confirmPropagateWeekTechniques==='function'?confirmPropagateWeekTechniques('below-future'):false;break;
        case 'restoreTech':result=typeof restoreWeekTechniquesToDefault==='function'?restoreWeekTechniquesToDefault():false;break;
        case 'clearWeek':result=typeof clearPrescriptionWeek==='function'?clearPrescriptionWeek():false;break;
        case 'cancel':result=typeof closeModal==='function'?closeModal('modal-prescription'):false;break;
        default:return false;
      }
    }catch(error){return actionError(key,error);}
    if(result===false)return fallbackOriginalClick(key);
    if(result&&typeof result.then==='function')result.catch(error=>actionError(key,error));
    return result;
  }

  function installStyles(){
    if(document.getElementById('tb-prescription-actions-layout-style'))return;
    const style=document.createElement('style');
    style.id='tb-prescription-actions-layout-style';
    style.textContent=`
      #modal-prescription .tb-actions-relocated{display:none!important}
      #${CENTER_ID}{
        flex:0 0 auto;margin-top:9px;padding:10px;border:1px solid rgba(98,82,68,.58);
        background:linear-gradient(180deg,rgba(18,16,14,.96),rgba(10,9,8,.98));
        color:var(--text);overflow:auto;max-height:min(39vh,390px);scrollbar-gutter:stable;
      }
      #${CENTER_ID}[hidden]{display:none!important}
      .tb-actions-center-head{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;padding:0 2px 9px;border-bottom:1px solid rgba(98,82,68,.38)}
      .tb-actions-center-title{font-family:'Barlow Condensed','Arial Narrow',sans-serif;font-weight:800;font-size:18px;letter-spacing:.55px;color:#e7ded5}
      .tb-actions-center-week{font-family:'DM Mono',monospace;font-size:9px;letter-spacing:1px;color:#b23a3d;white-space:nowrap}
      .tb-actions-section{margin-top:10px;padding:9px;border:1px solid rgba(79,67,57,.48);background:rgba(15,13,12,.64)}
      .tb-actions-section-head{display:flex;align-items:center;gap:9px;margin-bottom:8px}
      .tb-actions-section-head strong{font-family:'Barlow Condensed','Arial Narrow',sans-serif;font-size:14px;letter-spacing:.45px;color:#ddd2c7;white-space:nowrap}
      .tb-actions-section-head span{height:1px;flex:1;background:rgba(92,76,64,.42)}
      .tb-actions-section-head small{font-family:'DM Mono',monospace;font-size:7px;letter-spacing:.45px;color:#71675f;text-align:right}
      .tb-actions-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}
      .tb-actions-grid.two{grid-template-columns:repeat(2,minmax(0,1fr))}
      .tb-actions-grid button,.tb-actions-cancel{margin:0!important;min-height:39px;padding:8px 9px!important;font-size:11px!important;line-height:1.2;white-space:normal;touch-action:manipulation}
      .tb-actions-grid .tb-action-primary{background:linear-gradient(180deg,#a91d20,#771315)!important;border-color:#c53235!important;color:#fff!important}
      .tb-actions-grid .tb-action-danger{border-color:rgba(190,48,50,.52)!important;color:#c99a91!important;background:rgba(91,20,22,.11)!important}
      .tb-actions-apply-columns{display:grid;grid-template-columns:1fr 1fr;gap:8px}
      .tb-actions-subgroup{padding:8px;border:1px solid rgba(69,59,51,.42);background:rgba(7,7,7,.2)}
      .tb-actions-subtitle{font-family:'DM Mono',monospace;font-size:8px;letter-spacing:.8px;color:#8c7d70;margin-bottom:7px}
      .tb-actions-ger{display:grid;grid-template-columns:92px 1fr 1fr;gap:6px;margin-top:7px;padding-top:7px;border-top:1px dashed rgba(78,65,55,.48)}
      .tb-actions-ger .form-input{margin:0!important;min-width:0;height:39px;padding:7px 8px;font-size:11px}
      .tb-actions-ger button{min-height:39px}
      .tb-actions-cancel{width:100%;margin-top:9px!important;background:#0d0c0b!important;border:1px solid #4a4037!important;color:#978a7f!important}
      #modal-prescription .week-technique-status{margin-bottom:0}
      @media(max-width:899px){
        #${CENTER_ID}{max-height:none;margin-top:12px;padding:9px}
        .tb-actions-center-head{align-items:center}
        .tb-actions-section-head small{display:none}
        .tb-actions-grid,.tb-actions-grid.two,.tb-actions-apply-columns,.tb-actions-ger{grid-template-columns:1fr}
        .tb-actions-grid button,.tb-actions-cancel,.tb-actions-ger .form-input{min-height:44px;font-size:12px!important}
      }
      @media(min-width:900px) and (max-height:760px){
        #${CENTER_ID}{max-height:34vh;padding:7px;margin-top:6px}
        .tb-actions-section{margin-top:7px;padding:7px}
        .tb-actions-section-head{margin-bottom:6px}
        .tb-actions-grid button,.tb-actions-cancel,.tb-actions-ger .form-input{min-height:33px!important;padding:5px 7px!important;font-size:9px!important}
        .tb-actions-center-title{font-size:15px}
      }
    `;
    document.head.appendChild(style);
  }

  function makeSection(title,help=''){
    const section=document.createElement('section');section.className='tb-actions-section';
    const head=document.createElement('div');head.className='tb-actions-section-head';
    head.innerHTML=`<strong>${title}</strong><span aria-hidden="true"></span>${help?`<small>${help}</small>`:''}`;
    section.appendChild(head);return section;
  }
  function makeGrid(columns=3){const grid=document.createElement('div');grid.className='tb-actions-grid'+(columns===2?' two':'');return grid;}
  function makeProxy(key,label,{primary=false,danger=false}={}){
    const button=document.createElement('button');button.type='button';button.className=primary?'btn-primary tb-action-primary':'btn-ghost';
    if(danger)button.classList.add('tb-action-danger');
    button.textContent=label;button.dataset.tbActionProxy=key;
    button.addEventListener('click',()=>runAction(key));
    proxies.set(key,button);return button;
  }
  function makeSeriesOnlyButton(){
    const button=document.createElement('button');button.type='button';button.className='btn-ghost';
    button.id='tb-save-series-only';button.textContent='SALVAR SOMENTE SÉRIES, REPS E GER';
    button.addEventListener('click',saveSeriesOnly);return button;
  }
  function makeGerBlock(){
    const block=document.createElement('div');block.className='tb-actions-ger';block.id='tb-actions-ger-block';
    block.innerHTML=`<select class="form-input" id="${GER_SELECT_ID}" aria-label="GER para aplicação em lote"><option value="1">GER 1</option><option value="2">GER 2</option><option value="3">GER 3</option><option value="4">GER 4</option><option value="5">GER 5</option><option value="6">GER 6</option></select><button type="button" class="btn-ghost" id="tb-actions-ger-week">GER DA SEMANA → TODOS</button><button type="button" class="btn-ghost" id="tb-actions-ger-exercise">GER → 8 SEMANAS DO EXERCÍCIO</button>`;
    const select=block.querySelector('#'+GER_SELECT_ID);
    const syncOriginal=()=>{
      const original=document.getElementById('tb-ger-bulk-level');if(!original)return false;
      original.value=select.value;original.dataset.userSet='1';return true;
    };
    block.querySelector('#tb-actions-ger-week').addEventListener('click',()=>{if(syncOriginal())window.TeamBullsGerBulk?.applyWeek?.();});
    block.querySelector('#tb-actions-ger-exercise').addEventListener('click',()=>{if(syncOriginal())window.TeamBullsGerBulk?.applyExercise?.();});
    select.addEventListener('change',syncOriginal);
    return block;
  }

  function buildCenter(){
    const sheet=modal()?.querySelector('.modal-sheet'),shell=modal()?.querySelector('.prescription-compact-shell');
    if(!sheet||!shell)return null;
    const actions=originalActions();
    if(!REQUIRED_KEYS.every(key=>actions[key])){
      console.warn('[Team Bulls] Organização de ações não ativada: controles esperados não foram encontrados.');
      return null;
    }
    let center=document.getElementById(CENTER_ID);if(center)return center;
    center=document.createElement('div');center.id=CENTER_ID;center.setAttribute('aria-label','Ações organizadas da semana de treino');
    center.innerHTML=`<div class="tb-actions-center-head"><div class="tb-actions-center-title">AÇÕES DA SEMANA</div><div class="tb-actions-center-week" id="${WEEK_LABEL_ID}">SEMANA 1</div></div>`;

    const save=makeSection('SALVAR','Escolha exatamente o que deseja gravar.');
    const saveGrid=makeGrid(3);
    saveGrid.append(makeProxy('saveAll','SALVAR TODA A SEMANA',{primary:true}),makeSeriesOnlyButton(),makeProxy('saveTech','SALVAR SOMENTE AS TÉCNICAS'));
    save.appendChild(saveGrid);center.appendChild(save);

    const apply=makeSection('REPASSAR / APLICAR','Séries/GER e técnicas permanecem separados.');
    const columns=document.createElement('div');columns.className='tb-actions-apply-columns';
    const series=document.createElement('div');series.className='tb-actions-subgroup';series.innerHTML='<div class="tb-actions-subtitle">SÉRIES / PRESCRIÇÃO / GER</div>';
    const seriesGrid=makeGrid(2);
    seriesGrid.append(makeProxy('replicate','REPASSAR ATÉ A SEMANA 8'),makeProxy('copyWeekAll','ESTA SEMANA → TODOS OS EXERCÍCIOS'),makeProxy('copyAllWeeks','8 SEMANAS → PLANILHA TODA'));
    series.append(seriesGrid,makeGerBlock());
    const techniques=document.createElement('div');techniques.className='tb-actions-subgroup';techniques.innerHTML='<div class="tb-actions-subtitle">TÉCNICAS EM LOTE</div>';
    const techniqueGrid=makeGrid(2);
    techniqueGrid.append(makeProxy('techComplete','APLICAR EM TUDO ABAIXO E À FRENTE',{primary:true}),makeProxy('techBelowCurrent','SOMENTE EXERCÍCIOS ABAIXO'),makeProxy('techFuture','SOMENTE SEMANAS SEGUINTES'),makeProxy('techBelowFuture','ABAIXO NAS SEMANAS SEGUINTES'));
    techniques.appendChild(techniqueGrid);columns.append(series,techniques);apply.appendChild(columns);center.appendChild(apply);

    const cleanup=makeSection('LIMPAR / RESTAURAR','Ações que removem ou restauram configurações.');
    const cleanupGrid=makeGrid(3);
    cleanupGrid.append(makeProxy('removeTech','REMOVER TODAS AS TÉCNICAS',{danger:true}),makeProxy('clearWeek','SEM EXERCÍCIO NESTA SEMANA',{danger:true}),makeProxy('restoreTech','RESTAURAR TÉCNICAS AO PADRÃO'));
    cleanup.appendChild(cleanupGrid);center.appendChild(cleanup);

    const cancel=makeProxy('cancel','CANCELAR');cancel.classList.add('tb-actions-cancel');center.appendChild(cancel);
    shell.insertAdjacentElement('afterend',center);
    ORIGINAL_GROUPS.forEach(selector=>modal()?.querySelectorAll(selector).forEach(node=>node.classList.add('tb-actions-relocated')));
    installed=true;syncState();return center;
  }

  function syncState(){
    if(!installed)return;
    const week=currentWeek(),weekLabel=document.getElementById(WEEK_LABEL_ID);if(weekLabel)weekLabel.textContent='SEMANA '+week;
    const actions=originalActions();
    proxies.forEach((proxy,key)=>{
      const original=actions[key];proxy.disabled=!original||original.disabled;proxy.hidden=!original;
      if(original?.getAttribute('aria-disabled')==='true')proxy.setAttribute('aria-disabled','true');else proxy.removeAttribute('aria-disabled');
    });
    const gerBlock=document.getElementById('tb-actions-ger-block'),originalGer=document.getElementById('tb-ger-bulk-level'),select=document.getElementById(GER_SELECT_ID);
    if(gerBlock)gerBlock.hidden=!window.TeamBullsGerBulk||!originalGer;
    if(select&&originalGer&&document.activeElement!==select)select.value=String(originalGer.value||3);
    const center=document.getElementById(CENTER_ID);if(center)center.hidden=!validEditingTarget();
  }

  async function saveSeriesOnly(){
    if(busySeriesOnly||!validEditingTarget())return false;
    const exercise=currentExercise();if(!exercise)return false;
    const sets=typeof collectPrescriptionRows==='function'?collectPrescriptionRows():null;if(!sets)return false;
    const week=currentWeek(),actionKey='save-series-only-'+exercise.id;
    if(typeof beginAction==='function'&&!beginAction(actionKey,'modal-prescription'))return false;
    busySeriesOnly=true;const button=document.getElementById('tb-save-series-only');if(button)button.disabled=true;
    const previous=normalizeWeeklyPlan(exercise.weeklyPlan),weeklyPlan=buildWeeklyPlanUpdate(previous,week,sets,false);
    try{
      if(PLAN_EDIT_TARGET==='trainer'){
        await cloudWrite(db.collection('exercises').doc(exercise.id).update({weeklyPlan}),'salvar somente séries, repetições e GER');
        exercise.weeklyPlan=weeklyPlan;
      }else{
        exercise.weeklyPlan=weeklyPlan;
        if(!localSave()){exercise.weeklyPlan=previous;throw new Error('Falha ao gravar a prescrição no armazenamento local.');}
      }
      try{if(typeof refreshPlanViewsAfterWeeklyTechniqueChange==='function')refreshPlanViewsAfterWeeklyTechniqueChange(exercise,week);}catch(error){}
      showToast('✓ Séries, repetições e GER salvos; técnicas não foram alteradas');
      return true;
    }catch(error){
      alert(cloudWriteError(error,'salvar somente séries, repetições e GER'));return false;
    }finally{
      busySeriesOnly=false;if(button)button.disabled=false;
      if(typeof endAction==='function')endAction(actionKey,'modal-prescription');
      syncState();
    }
  }

  function wrapUiFunction(name){
    const base=window[name];if(typeof base!=='function'||base.__tbPrescriptionActionsLayout)return;
    const wrapped=function(){const result=base.apply(this,arguments);requestAnimationFrame(syncState);return result;};
    wrapped.__tbPrescriptionActionsLayout=true;window[name]=wrapped;
  }
  function install(){
    installStyles();
    if(!buildCenter())return;
    document.getElementById('input-prescription-week')?.addEventListener('change',()=>requestAnimationFrame(syncState));
    ['openPrescriptionModal','loadPrescriptionEditor','onWeekTechniqueSelectionChange'].forEach(wrapUiFunction);
    window.TeamBullsPrescriptionActions=Object.freeze({version:'10.10.9-actions1',refresh:syncState,saveSeriesOnly,runAction});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();