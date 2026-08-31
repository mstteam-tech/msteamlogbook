/* Team Bulls v10.10.18 — ponte leve/event-driven da Home do aluno. */
'use strict';
(()=>{
  if(window.__TEAM_BULLS_STUDENT_LAYOUT_RUNTIME_10_10_18__)return;
  window.__TEAM_BULLS_STUDENT_LAYOUT_RUNTIME_10_10_18__=true;
  window.__TEAM_BULLS_STUDENT_LAYOUT_RUNTIME_10_10_16__=true;

  const VERSION='10.10.18-runtime2';
  const LAYOUT_SRC='./modules/student-home-layout-v10_10_15.js?v=10.10.15-home2';
  let loading=null;
  let retryTimer=0;
  let retries=0;

  const currentUser=()=>{try{return typeof CURRENT_USER!=='undefined'?CURRENT_USER:null;}catch(error){return null;}};
  const mode=()=>{try{return typeof MODE!=='undefined'?MODE:'';}catch(error){return'';}};
  const accessMode=()=>{try{return typeof ACCESS_MODE!=='undefined'?ACCESS_MODE:'';}catch(error){return'';}};
  const activeScreen=()=>document.querySelector('.screen.active')?.id||'';
  function isStudentContext(){
    const screen=activeScreen();
    if(currentUser()?.role==='trainer'||document.body.classList.contains('trainer-desktop'))return false;
    if(['screen-auth','screen-loading'].includes(screen)||screen.includes('trainer')||screen.startsWith('screen-ts-'))return false;
    if(document.body.classList.contains('student-desktop')||currentUser()?.role==='student')return true;
    const access=accessMode();
    return mode()==='local'||access==='offline-registered'||access==='local-inactive';
  }

  function ensureLayout(){
    if(window.TeamBullsStudentHomeLayout)return Promise.resolve(true);
    if(loading)return loading;
    loading=new Promise(resolve=>{
      let settled=false;
      let timer=0;
      const done=ok=>{if(settled)return;settled=true;clearTimeout(timer);if(!ok)loading=null;resolve(!!ok);};
      const existing=[...document.scripts].find(script=>{try{return new URL(script.src,location.href).pathname.endsWith('/modules/student-home-layout-v10_10_15.js');}catch(error){return false;}});
      if(existing){
        if(window.TeamBullsStudentHomeLayout){done(true);return;}
        existing.addEventListener('load',()=>done(!!window.TeamBullsStudentHomeLayout),{once:true});
        existing.addEventListener('error',()=>done(false),{once:true});
      }else{
        const script=document.createElement('script');
        script.src=LAYOUT_SRC;
        script.async=false;
        script.dataset.teamBullsStudentLayoutRuntime='1';
        script.onload=()=>done(!!window.TeamBullsStudentHomeLayout);
        script.onerror=()=>done(false);
        document.head.appendChild(script);
      }
      timer=setTimeout(()=>done(!!window.TeamBullsStudentHomeLayout),7000);
    });
    return loading;
  }

  function scheduleRetry(){
    clearTimeout(retryTimer);
    if(navigator.onLine===false||retries>=3)return;
    retries++;
    retryTimer=setTimeout(sync,700*retries);
  }
  function sync(){
    if(!isStudentContext())return;
    ensureLayout().then(ok=>{
      if(!ok){scheduleRetry();return;}
      retries=0;
      window.TeamBullsStudentHomeLayout?.syncHotbar?.();
    }).catch(scheduleRetry);
  }

  const start=()=>{sync();setTimeout(sync,1200);};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  window.addEventListener('team-bulls-v107-ready',sync);
  window.addEventListener('team-bulls-runtime-ready',sync);
  window.addEventListener('online',sync);
  window.addEventListener('pageshow',sync,{passive:true});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')sync();},{passive:true});

  window.TeamBullsStudentLayoutRuntime=Object.freeze({version:VERSION,sync,ensureLayout});
})();
