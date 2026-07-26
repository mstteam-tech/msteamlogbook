window.__fbLoadErrors=0;
window.__teamBullsBootErrors=[];
try{if(window.top!==window.self)window.top.location=window.self.location.href;}catch(error){document.documentElement.style.display='none';}
(function(){
  let revealTimer=null;
  function loadingActive(){return !!document.getElementById('screen-loading')?.classList.contains('active');}
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
  revealTimer=setTimeout(()=>{if(loadingActive())reveal('A sessão está sendo restaurada em segundo plano. Você já pode entrar ou usar o modo local.');},2500);
  // Última barreira contra carregamento infinito, inclusive se outro trecho do
  // aplicativo falhar antes de registrar os próprios timeouts.
  setTimeout(()=>{
    if(!loadingActive())return;
    const loading=document.getElementById('screen-loading');
    const auth=document.getElementById('screen-auth');
    loading?.classList.remove('active');
    auth?.classList.add('active');
    reveal('A verificação demorou, mas a tela foi liberada. A sessão continuará sendo restaurada em segundo plano.');
  },1600);
  window.addEventListener('error',event=>{
    window.__teamBullsBootErrors.push(String(event?.message||'erro de inicialização'));
    if(loadingActive())reveal('O aplicativo encontrou uma falha ao iniciar. Seus registros locais foram preservados.');
  });
  window.addEventListener('unhandledrejection',event=>{
    window.__teamBullsBootErrors.push(String(event?.reason?.message||event?.reason||'falha assíncrona'));
    if(loadingActive())reveal('O servidor demorou para responder. Seus registros locais foram preservados.');
  });
})();
