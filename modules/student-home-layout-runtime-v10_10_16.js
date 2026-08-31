/* Team Bulls v10.10.16 — ponte resiliente da Home/hotbar do aluno. */
'use strict';
(()=>{
  if(window.__TEAM_BULLS_STUDENT_LAYOUT_RUNTIME_10_10_16__)return;
  window.__TEAM_BULLS_STUDENT_LAYOUT_RUNTIME_10_10_16__=true;

  const VERSION='10.10.16-runtime1';
  const LAYOUT_SRC='./modules/student-home-layout-v10_10_15.js?v=10.10.15-home2';
  let loading=null;
  let retries=0;

  const currentUser=()=>{try{return typeof CURRENT_USER!=='undefined'?CURRENT_USER:null;}catch(error){return null;}};
  const isStudent=()=>currentUser()?.role==='student';

  function ensureStyle(){
    if(document.getElementById('tb-student-layout-runtime-style'))return;
    const style=document.createElement('style');
    style.id='tb-student-layout-runtime-style';
    style.textContent=`
      html.tb-student-layout-runtime body.student-desktop .student-desktop-nav{display:none!important}
      html.tb-student-layout-runtime body.student-desktop #app{margin-left:0!important;width:100%!important;max-width:none!important}
      html.tb-student-layout-runtime.tb-student-hotbar-on .tb-hotbar-shell{display:block!important;z-index:96!important}
      @media(min-width:900px) and (pointer:fine){
        html.tb-student-layout-runtime.tb-student-hotbar-on .tb-hotbar-shell{display:block!important;width:min(680px,calc(100% - 32px))!important}
        html.tb-student-layout-runtime body.student-desktop .screen{padding-bottom:118px!important}
        html.tb-student-layout-runtime body.student-desktop .content,
        html.tb-student-layout-runtime body.student-desktop .home-hero,
        html.tb-student-layout-runtime body.student-desktop .stats-grid,
        html.tb-student-layout-runtime body.student-desktop .tb-home-intelligence{max-width:1420px;margin-left:auto;margin-right:auto}
      }
    `;
    document.head.appendChild(style);
  }

  function activate(){
    ensureStyle();
    const active=isStudent();
    document.documentElement.classList.toggle('tb-student-layout-runtime',active);
    if(active)window.TeamBullsStudentHomeLayout?.syncHotbar?.();
    return active;
  }

  function ensureLayout(){
    if(window.TeamBullsStudentHomeLayout){activate();return Promise.resolve(true);}
    if(loading)return loading;
    loading=new Promise(resolve=>{
      let settled=false;
      let timer=null;
      const done=ok=>{if(settled)return;settled=true;if(timer)clearTimeout(timer);if(!ok)loading=null;if(ok)activate();resolve(!!ok);};
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

  function sync(){
    if(!isStudent()){document.documentElement.classList.remove('tb-student-layout-runtime');return;}
    ensureLayout().then(ok=>{
      if(ok){retries=0;activate();return;}
      if(navigator.onLine!==false&&retries<4){retries++;setTimeout(sync,700*retries);}
    }).catch(()=>{});
  }

  const start=()=>{ensureStyle();sync();};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  window.addEventListener('team-bulls-v107-ready',sync);
  window.addEventListener('team-bulls-runtime-ready',sync);
  window.addEventListener('online',sync);
  window.addEventListener('pageshow',sync,{passive:true});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')sync();});
  setInterval(()=>{if(isStudent())sync();else document.documentElement.classList.remove('tb-student-layout-runtime');},3000);

  window.TeamBullsStudentLayoutRuntime=Object.freeze({version:VERSION,sync,ensureLayout});
})();