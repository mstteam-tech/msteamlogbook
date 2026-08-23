(()=>{
  'use strict';
  if(window.__TEAM_BULLS_TRAINING_INTEGRITY_101011__)return;
  window.__TEAM_BULLS_TRAINING_INTEGRITY_101011__=true;
  const VERSION='10.10.11-training1';

  function currentExercise(){try{return typeof getPlanEditExercise==='function'?getPlanEditExercise():null;}catch(error){return null;}}
  function hardLocked(exercise=currentExercise()){return exercise?.weeklyEditLocks?.all===true;}
  function lockNotice(){const message='Este exercício está totalmente trancado. Nenhuma série, repetição, GER, técnica ou ação de repasse pode alterá-lo até você destrancar.';if(typeof showToast==='function')showToast('🔒 '+message,true);else alert(message);return false;}
  function patchGerLabels(root=document){
    try{
      const selector='option,label,span,small,p,strong,button,div';
      root.querySelectorAll?.(selector).forEach(node=>{
        if(node.children?.length)return;
        const raw=String(node.textContent||''),normalized=raw.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
        const target=/2\s*(?:a|ate|à|-|–)\s*4\s*rep(?:s|eticoes)?[^\n]{0,25}reserva/i.test(normalized);if(!target)return;
        node.textContent=raw.replace(/2\s*(?:a|até|ate|à|-|–)\s*4\s*(reps?|repetições?)(\s*(?:na|em)\s*reserva)/i,'2 reps na reserva');
      });
      document.querySelectorAll?.('option').forEach(option=>{if(String(option.value||'')==='1'&&/2\s*(?:a|até|ate|-|–)\s*4/i.test(option.textContent||''))option.textContent='GER 1 — 2 reps na reserva';});
    }catch(error){console.warn('[Team Bulls] ajuste GER 1',error);}
  }
  function hardLockUi(){
    const modal=document.getElementById('modal-prescription'),exercise=currentExercise();if(!modal||!exercise)return;
    const locked=hardLocked(exercise);modal.classList.toggle('tb-exercise-hard-locked',locked);
    const state=document.getElementById('tb-prescription-lock-state');if(state&&locked)state.textContent='🔒 EXERCÍCIO TOTALMENTE TRANCADO — nenhuma alteração ou repasse é permitido';
    modal.querySelectorAll('button').forEach(button=>{
      if(button.closest('#tb-prescription-lockbar')||button.dataset.lockControl==='1'||/fechar|cancelar|voltar/i.test(button.textContent||''))return;
      if(locked){if(button.dataset.tbHardLockDisabled===undefined)button.dataset.tbHardLockDisabled=button.disabled?'1':'0';button.disabled=true;button.setAttribute('aria-disabled','true');}
      else if(button.dataset.tbHardLockDisabled!==undefined){button.disabled=button.dataset.tbHardLockDisabled==='1';button.removeAttribute('aria-disabled');delete button.dataset.tbHardLockDisabled;}
    });
  }
  function guardFunction(name){const original=window[name];if(typeof original!=='function'||original.__tbHardLockGuard)return;const wrapped=function(){if(hardLocked())return lockNotice();return original.apply(this,arguments);};wrapped.__tbHardLockGuard=true;wrapped.__tbBase=original;window[name]=wrapped;}
  function installGuards(){
    ['persistPrescription','persistWeekTechniqueConfiguration','clearPrescriptionWeek','restoreWeekTechniquesToDefault','v104CopyPrescriptionToAll','confirmReplicatePrescription','confirmCopyCurrentWeekToAllExercises','confirmPropagateWeekTechniques','applyWeekTechniquesToAllExercises','confirmPropagateCurrentPrescription','copyCurrentWeekToAllExercises'].forEach(guardFunction);
    if(typeof loadPrescriptionEditor==='function'&&!loadPrescriptionEditor.__tbTrainingIntegrity){const base=loadPrescriptionEditor;const wrapped=function(){const result=base.apply(this,arguments);queueMicrotask(()=>{patchGerLabels(document.getElementById('modal-prescription')||document);hardLockUi();});return result;};wrapped.__tbTrainingIntegrity=true;loadPrescriptionEditor=wrapped;}
  }
  document.addEventListener('click',event=>{
    const button=event.target.closest?.('#modal-prescription button');if(!button||!hardLocked())return;
    if(button.closest('#tb-prescription-lockbar')||button.dataset.lockControl==='1'||/fechar|cancelar|voltar/i.test(button.textContent||''))return;
    event.preventDefault();event.stopImmediatePropagation();lockNotice();
  },true);
  document.addEventListener('click',event=>{if(event.target.closest?.('#tb-lock-exercise-btn,#tb-lock-week-btn'))requestAnimationFrame(hardLockUi);},false);
  document.addEventListener('change',event=>{if(event.target?.id==='input-prescription-week')requestAnimationFrame(()=>{patchGerLabels(document.getElementById('modal-prescription')||document);hardLockUi();});},false);
  document.addEventListener('click',event=>{if(event.target.closest?.('[onclick*="GER"],[id*="ger" i],button'))requestAnimationFrame(()=>patchGerLabels(document));},false);
  const style=document.createElement('style');style.id='tb-training-integrity-style';style.textContent=`#modal-prescription.tb-exercise-hard-locked{--tb-lock-accent:#ef4444}#modal-prescription.tb-exercise-hard-locked #tb-prescription-lockbar{border-color:rgba(239,68,68,.72)!important;background:rgba(239,68,68,.09)!important}#modal-prescription.tb-exercise-hard-locked [data-week-technique-control]{opacity:.5}`;document.head.appendChild(style);
  installGuards();patchGerLabels(document);setTimeout(installGuards,0);
  window.TeamBullsTrainingIntegrity=Object.freeze({version:VERSION,isHardLocked:hardLocked,patchGerLabels,refresh:()=>{installGuards();patchGerLabels(document);hardLockUi();}});
})();