window.__fbLoadErrors=0;
window.__teamBullsBootErrors=[];
try{if(window.top!==window.self)window.top.location=window.self.location.href;}catch(error){document.documentElement.style.display='none';}
(function(){
  let revealTimer=null;
  function loadingActive(){return !!document.getElementById('screen-loading')?.classList.contains('active');}
  function stored(key){try{return localStorage.getItem(key);}catch(error){return null;}}
  function returningCloudSession(){
    const uid=String(stored('teamms_last_user_uid')||'').trim();
    const guest=stored('teamms_offline_pref')==='1'||stored('teamms_offline_mode')==='guest';
    return !!uid&&!guest;
  }
  function reveal(message){
    const run=()=>{
      const box=document.getElementById('loading-recovery');
      const text=document.getElementById('loading-recovery-text');
      if(text&&message)text.textContent=message;
      if(box)box.hidden=false;
    };
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
  }
  function hide(){clearTimeout(revealTimer);const box=document.getElementById('loading-recovery');if(box)box.hidden=true;}
  async function clearCachesAndReload(){
    const btn=document.getElementById('loading-clear-cache');if(btn){btn.disabled=true;btn.textContent='CORRIGINDO...';}
    try{
      if('serviceWorker' in navigator){const regs=await navigator.serviceWorker.getRegistrations();await Promise.allSettled(regs.filter(r=>location.href.startsWith(r.scope)).map(r=>r.unregister()));}
      if('caches' in window){const keys=await caches.keys();await Promise.allSettled(keys.filter(k=>k.startsWith('team-bulls-')).map(k=>caches.delete(k)));}
    }catch(error){console.warn('Falha ao limpar atualização antiga:',error);}
    location.replace('./recuperar.html?auto=1&t='+Date.now());
  }
  function localMode(){
    try{localStorage.setItem('teamms_offline_mode','guest');localStorage.setItem('teamms_offline_pref','1');}catch(error){}
    location.replace('./index.html?local='+Date.now());
  }
  window.TeamBullsRecovery={reveal,hide,retry:()=>location.reload(),clearCachesAndReload,localMode};

  const restoring=returningCloudSession();
  revealTimer=setTimeout(()=>{
    if(loadingActive())reveal(restoring?'Restaurando sua sessão e conferindo os arquivos do app. Você pode aguardar mais alguns segundos ou usar as opções abaixo.':'A inicialização está demorando. Você já pode entrar ou usar o modo local.');
  },restoring?3200:2200);

  // Em aparelhos que já possuem uma sessão válida, não trocamos a tela de
  // carregamento pelo login cedo demais. Isso evita duas autenticações concorrentes
  // e a sensação de que o app abriu pela metade enquanto o Firebase ainda restaura.
  setTimeout(()=>{
    if(!loadingActive())return;
    const loading=document.getElementById('screen-loading');
    const auth=document.getElementById('screen-auth');
    loading?.classList.remove('active');
    auth?.classList.add('active');
    reveal(restoring?'A restauração da sessão demorou além do esperado. A tela de acesso foi liberada sem apagar seus dados; a conexão continuará sendo conferida.':'A verificação demorou, mas a tela de acesso foi liberada.');
  },restoring?6500:1800);

  window.addEventListener('error',event=>{
    window.__teamBullsBootErrors.push(String(event?.message||'erro de inicialização'));
    if(loadingActive())reveal('O aplicativo encontrou uma falha ao iniciar. Seus registros locais foram preservados.');
  });
  window.addEventListener('unhandledrejection',event=>{
    window.__teamBullsBootErrors.push(String(event?.reason?.message||event?.reason||'falha assíncrona'));
    if(loadingActive())reveal('O servidor demorou para responder. Seus registros locais foram preservados.');
  });
})();

// Camada visual isolada da Home do aluno. Carrega depois dos scripts deferidos,
// preservando o boot crítico, a autenticação e as regras de negócio existentes.
(function(){
  const MODULE_ID='tb-student-survivor-home-loader';
  const MODULE_SRC='./modules/student-survivor-home-v10_10_14.js?v=10.10.14-home1';
  function loadStudentSurvivorHome(){
    if(document.getElementById(MODULE_ID)||window.__TEAM_BULLS_STUDENT_SURVIVOR_HOME_1__)return;
    const script=document.createElement('script');
    script.id=MODULE_ID;
    script.src=MODULE_SRC;
    script.async=false;
    script.onerror=()=>console.warn('[Team Bulls] A camada visual da Home do aluno não pôde ser carregada.');
    document.head.appendChild(script);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',loadStudentSurvivorHome,{once:true});else loadStudentSurvivorHome();
})();
