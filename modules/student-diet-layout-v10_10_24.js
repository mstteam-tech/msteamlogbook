/* Team Bulls v10.10.24 — ordem visual da dieta e ações contextuais do aluno. */
'use strict';
(()=>{
  if(window.__TEAM_BULLS_STUDENT_DIET_LAYOUT_101024__)return;
  window.__TEAM_BULLS_STUDENT_DIET_LAYOUT_101024__=true;

  const VERSION='10.10.24-dietlayout1';

  function injectStyles(){
    if(document.getElementById('tb-student-diet-layout-style'))return;
    const style=document.createElement('style');
    style.id='tb-student-diet-layout-style';
    style.textContent=`
      #screen-diet-detail [data-tb-diet-guidance="1"] .tb-guidance-actions,
      #screen-ts-diet-detail [data-tb-diet-guidance="1"] .tb-guidance-actions{
        display:grid!important;grid-template-columns:1fr!important;
      }
      #screen-diet-detail [data-tb-diet-guidance="1"] .tb-guidance-actions button[onclick*="openStretchGuide"],
      #screen-ts-diet-detail [data-tb-diet-guidance="1"] .tb-guidance-actions button[onclick*="openStretchGuide"]{
        display:none!important;
      }
    `;
    document.head.appendChild(style);
  }

  function moveFreeMealBeforeSupport(freeMealId,supportId){
    const freeMeal=document.getElementById(freeMealId);
    const support=document.getElementById(supportId);
    if(!freeMeal||!support||freeMeal.parentElement!==support.parentElement)return false;
    if(freeMeal.nextElementSibling!==support)support.parentElement.insertBefore(freeMeal,support);
    return true;
  }

  function removeStretchAction(){
    const selector=[
      '#screen-diet-detail [data-tb-diet-guidance="1"] .tb-guidance-actions button[onclick*="openStretchGuide"]',
      '#screen-ts-diet-detail [data-tb-diet-guidance="1"] .tb-guidance-actions button[onclick*="openStretchGuide"]'
    ].join(',');
    document.querySelectorAll(selector).forEach(button=>button.remove());
  }

  function patchDietLayout(){
    injectStyles();
    moveFreeMealBeforeSupport('diet-free-meal-policy','diet-support-tables');
    moveFreeMealBeforeSupport('ts-diet-free-meal-policy','ts-diet-support-tables');
    removeStretchAction();
    return true;
  }

  function installOpenDietPatch(){
    if(typeof openDietDetail!=='function')return false;
    if(openDietDetail.__tbDietLayout101024)return true;
    const base=openDietDetail;
    const wrapped=async function(...args){
      const result=await base.apply(this,args);
      patchDietLayout();
      return result;
    };
    wrapped.__tbDietLayout101024=true;
    openDietDetail=wrapped;
    return true;
  }

  function sync(){installOpenDietPatch();patchDietLayout();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',sync,{once:true});else sync();
  window.addEventListener('team-bulls-student-runtime-ready',sync);
  window.addEventListener('team-bulls-runtime-ready',sync);
  window.addEventListener('pageshow',sync,{passive:true});

  window.TeamBullsStudentDietLayout=Object.freeze({version:VERSION,sync:patchDietLayout});
})();
