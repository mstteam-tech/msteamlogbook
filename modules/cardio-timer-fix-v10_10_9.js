/* Team Bulls v10.10.9 — correção do cronômetro de cardio e ticker sob demanda. */
'use strict';
(()=>{
  if(window.__TEAM_BULLS_CARDIO_TIMER_FIX_V10109__)return;
  window.__TEAM_BULLS_CARDIO_TIMER_FIX_V10109__=true;

  function safeDurationSeconds(item){
    return Math.max(60,Math.min(600*60,Math.trunc(Number(item?.durationMinutes)||1)*60));
  }

  function fixedReadCardioTimer(item){
    if(!item)return null;
    const key=cardioTimerStorageKey(item.id),durationSeconds=safeDurationSeconds(item);
    let state=null;
    try{
      const raw=localStorage.getItem(key);
      if(raw)state=JSON.parse(raw);
    }catch(error){}
    try{
      if(!state)state=CARDIO_TIMER_MEMORY.get(key)||null;
    }catch(error){}

    if(!state||Number(state.durationSeconds)!==durationSeconds){
      state={durationSeconds,remainingSeconds:durationSeconds,running:false,endAt:0,completedAt:0};
    }

    if(state.running){
      // O cálculo precisa subtrair Date.now() DEPOIS de normalizar endAt.
      // Sem estes parênteses, `||` fazia o relógio usar o timestamp absoluto
      // e o clamp posterior mantinha o tempo sempre preso na duração inicial.
      state.remainingSeconds=Math.max(0,Math.ceil(((Number(state.endAt)||0)-Date.now())/1000));
    }

    return{
      durationSeconds,
      remainingSeconds:Math.max(0,Math.min(durationSeconds,Math.trunc(Number(state.remainingSeconds)||0))),
      running:state.running===true,
      endAt:Number(state.endAt)||0,
      completedAt:Number(state.completedAt)||0
    };
  }

  function stopCardioTimerTicker(){
    try{
      if(CARDIO_TIMER_INTERVAL){
        clearInterval(CARDIO_TIMER_INTERVAL);
        CARDIO_TIMER_INTERVAL=0;
      }
    }catch(error){}
  }

  function fixedEnsureCardioTimerTicker(){
    if(CARDIO_TIMER_INTERVAL)return;
    CARDIO_TIMER_INTERVAL=setInterval(()=>{
      const screen=document.querySelector('.screen.active')?.id;
      if(screen==='screen-cardio'||screen==='screen-ts-cardio'){
        updateCardioTimerDisplay();
        return;
      }
      // Fora da tela não precisamos gastar CPU: o endAt preserva o tempo real.
      stopCardioTimerTicker();
    },1000);
  }

  // Substitui somente os dois pontos defeituosos, preservando todo o fluxo
  // existente de iniciar, pausar, reiniciar, persistir e concluir o cardio.
  readCardioTimer=fixedReadCardioTimer;
  ensureCardioTimerTicker=fixedEnsureCardioTimerTicker;

  const baseCloseCardioScreen=closeCardioScreen;
  closeCardioScreen=function(){
    stopCardioTimerTicker();
    return baseCloseCardioScreen.apply(this,arguments);
  };

  const syncVisibleTimer=()=>{
    if(document.hidden)return;
    const screen=document.querySelector('.screen.active')?.id;
    if(screen!=='screen-cardio'&&screen!=='screen-ts-cardio')return;
    updateCardioTimerDisplay();
    fixedEnsureCardioTimerTicker();
  };
  document.addEventListener('visibilitychange',syncVisibleTimer,{passive:true});
  window.addEventListener('pageshow',syncVisibleTimer,{passive:true});

  window.TeamBullsCardioTimerFix=Object.freeze({
    stopTicker:stopCardioTimerTicker,
    refresh:syncVisibleTimer
  });
})();
