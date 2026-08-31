window.__fbLoadErrors=0;
window.__teamBullsBootErrors=[];
try{if(window.top!==window.self)window.top.location=window.self.location.href;}catch(error){document.documentElement.style.display='none';}

/*
 * Compatibilidade de emergência para builds antigos que ainda podem criar um
 * diálogo de atualização em tela cheia. A atualização nunca deve impedir o
 * usuário de usar o app. O guard é específico para o texto legado e não fecha
 * modais normais do Team Bulls.
 */
(function(){
  const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim().toUpperCase();
  const LEGACY_ACTION='LIMPAR CACHE E REINICIAR';
  const LEGACY_TITLE='ATUALIZACAO DO APLICATIVO';
  let released=0;
  let scanTimer=0;

  function legacyControl(){
    const controls=document.querySelectorAll('button,a,[role="button"]');
    for(const control of controls){
      if(normalize(control.textContent).includes(LEGACY_ACTION))return control;
    }
    return null;
  }
  function blockerRoot(control){
    if(!control)return null;
    const direct=control.closest('.modal-backdrop,[role="dialog"],.modal,.overlay,.dialog-backdrop');
    if(direct)return direct;
    let node=control;
    while(node?.parentElement&&node.parentElement!==document.body)node=node.parentElement;
    return node&&node!==document.body?node:null;
  }
  function releaseInteraction(){
    const app=document.getElementById('app');
    if(app){app.removeAttribute('inert');if(app.getAttribute('aria-hidden')==='true')app.removeAttribute('aria-hidden');app.style.removeProperty('pointer-events');}
    for(const root of [document.documentElement,document.body]){
      if(!root)continue;
      root.classList.remove('modal-open','no-scroll','scroll-locked','update-blocked','app-update-blocked');
      root.style.removeProperty('overflow');
      root.style.removeProperty('pointer-events');
    }
  }
  function scan(){
    const control=legacyControl();
    if(!control)return false;
    const root=blockerRoot(control);
    const text=normalize(root?.textContent||control.parentElement?.textContent||'');
    if(!text.includes(LEGACY_TITLE)||!text.includes(LEGACY_ACTION))return false;
    if(root){
      root.dataset.tbLegacyUpdateBlocked='1';
      root.hidden=true;
      root.setAttribute('aria-hidden','true');
      try{root.inert=true;}catch(error){}
      root.style.setProperty('display','none','important');
      root.style.setProperty('pointer-events','none','important');
    }
    releaseInteraction();
    released++;
    window.__TEAM_BULLS_LEGACY_UPDATE_BLOCKER_RELEASED__=released;
    return true;
  }
  function install(){
    if(document.getElementById('tb-update-failopen-style'))return;
    const style=document.createElement('style');
    style.id='tb-update-failopen-style';
    style.textContent='[data-tb-legacy-update-blocked="1"]{display:none!important;pointer-events:none!important;visibility:hidden!important}';
    document.head.appendChild(style);
    const schedule=[0,120,450,1200,2600,5000,9000,15000,30000,60000];
    schedule.forEach(delay=>setTimeout(scan,delay));
    window.addEventListener('pageshow',scan,{passive:true});
    window.addEventListener('team-bulls-runtime-ready',scan);
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')scan();},{passive:true});
    clearTimeout(scanTimer);scanTimer=setTimeout(()=>releaseInteraction(),65000);
  }
  window.TeamBullsUpdateFailOpen=Object.freeze({scan,releaseInteraction});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();

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
