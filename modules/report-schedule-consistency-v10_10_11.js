(()=>{
  'use strict';
  if(window.__TEAM_BULLS_REPORT_SCHEDULE_101011__)return;
  window.__TEAM_BULLS_REPORT_SCHEDULE_101011__=true;
  const VERSION='10.10.11-reportschedule1';

  function iso(value){return /^\d{4}-\d{2}-\d{2}$/.test(String(value||''));}
  function localToday(){if(typeof today==='function')return today();const d=new Date(),p=n=>String(n).padStart(2,'0');return`${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`;}
  function addDays(value,days){if(typeof addDaysIso==='function')return addDaysIso(value,days);if(!iso(value))return'';const [y,m,d]=value.split('-').map(Number),date=new Date(y,m-1,d+Number(days||0)),p=n=>String(n).padStart(2,'0');return`${date.getFullYear()}-${p(date.getMonth()+1)}-${p(date.getDate())}`;}
  function monthlyNextDue(schedule){
    if(!schedule||typeof schedule!=='object')return'';
    const weeks=Math.max(1,Math.min(52,Number(schedule.intervalWeeks)||4));
    if(iso(schedule.lastCompletedDate))return addDays(String(schedule.lastCompletedDate),weeks*7);
    if(iso(schedule.startDate)){
      const completed=Math.max(0,Number(schedule.lastCompletedCycle)||0);
      return addDays(String(schedule.startDate),Math.max(1,completed+1)*weeks*7);
    }
    return'';
  }
  function patchProtocolState(){
    if(typeof v109ProtocolState!=='function'||v109ProtocolState.__tbCompletionAnchored)return;
    const base=v109ProtocolState;
    const wrapped=function(schedule,date){
      const state=base.apply(this,arguments);if(!state)return state;
      const due=monthlyNextDue(schedule);if(!due)return state;
      const reference=iso(date)?String(date):localToday(),pending=due<=reference;
      return{...state,nextDueDate:due,daysUntil:typeof v104DateDiffDays==='function'?v104DateDiffDays(reference,due):state.daysUntil,pending,pendingCycle:pending?Math.max(1,Number(state.pendingCycle)||Number(state.lastCompletedCycle||0)+1):0};
    };
    wrapped.__tbCompletionAnchored=true;wrapped.__tbBase=base;v109ProtocolState=wrapped;
  }
  function refreshProtocolUi(){
    try{
      if(typeof V109_PROTOCOL_REVIEW_SCHEDULE!=='undefined'&&V109_PROTOCOL_REVIEW_SCHEDULE&&typeof renderTrainerProtocolReview==='function'&&CURRENT_USER?.role==='trainer')renderTrainerProtocolReview(V109_PROTOCOL_REVIEW_SCHEDULE);
      if(typeof loadStudentProtocolReview==='function'&&CURRENT_USER?.role==='student')loadStudentProtocolReview().catch(()=>{});
    }catch(error){console.warn('[Team Bulls] atualização visual do ciclo mensal',error);}
  }

  // A gravação da conclusão continua sendo feita exclusivamente pelo fluxo oficial
  // markProtocolReviewCompleted(). Esta camada só muda o cálculo da próxima data,
  // evitando que feedbacks ou ajustes pontuais avancem o ciclo mensal por engano.
  patchProtocolState();
  setTimeout(()=>{patchProtocolState();refreshProtocolUi();},0);
  window.TeamBullsReportSchedule=Object.freeze({version:VERSION,monthlyNextDue,refresh:()=>{patchProtocolState();refreshProtocolUi();}});
})();