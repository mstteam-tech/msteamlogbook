window.__fbLoadErrors=0;
window.__teamBullsBootErrors=[];
try{if(window.top!==window.self)window.top.location=window.self.location.href;}catch(error){document.documentElement.style.display='none';}

/*
 * Team Bulls — estabilização móvel do runtime.
 *
 * A Home do aluno é montada por extensões carregadas depois do core. Esta camada
 * entra antes da fila tardia, nunca bloqueia o boot e garante três propriedades:
 * 1) estados antigos de refresh não podem desabilitar a interação;
 * 2) um backdrop órfão sem painel visível não pode cobrir a aplicação;
 * 3) perfil/Home/layout essenciais são preparados logo após o v107 ficar pronto,
 *    com URLs de revisão únicas para não depender de uma entrada antiga de cache.
 */
(function(){
  if(window.__TEAM_BULLS_RUNTIME_STABILITY_BOOT_1__)return;
  window.__TEAM_BULLS_RUNTIME_STABILITY_BOOT_1__=true;

  const MOBILE_QUERY='(max-width: 899px), (pointer: coarse)';
  const STABLE_REVISION='runtime-stable-20260831-1';
  const orphanMisses=new WeakMap();
  let essentialPromise=null;

  function mobileLike(){
    try{return window.matchMedia?.(MOBILE_QUERY)?.matches===true||window.innerWidth<900;}
    catch(error){return window.innerWidth<900;}
  }
  if(mobileLike())window.__TEAM_BULLS_INTERACTION_V10101__=true;

  function rendered(element){
    if(!(element instanceof Element))return false;
    const style=getComputedStyle(element);
    if(style.display==='none'||style.visibility==='hidden'||Number(style.opacity||1)===0)return false;
    const rect=element.getBoundingClientRect();
    return rect.width>2&&rect.height>2&&rect.bottom>0&&rect.right>0&&rect.top<innerHeight&&rect.left<innerWidth;
  }
  function modalPanels(modal){
    if(!(modal instanceof Element))return[];
    return [...modal.querySelectorAll('.modal-sheet,.modal-dialog,[role="dialog"]')].filter(rendered);
  }
  function hasOpenModal(){
    return [...document.querySelectorAll('.modal-backdrop.open')].some(modal=>rendered(modal)&&modalPanels(modal).length>0);
  }
  function physicalPortrait(){
    try{
      const type=String(screen?.orientation?.type||'').toLowerCase();
      if(type.startsWith('portrait'))return true;
      if(type.startsWith('landscape'))return false;
      const width=Number(screen?.width||innerWidth||0),height=Number(screen?.height||innerHeight||0);
      return height>=width;
    }catch(error){return innerHeight>=innerWidth;}
  }
  function injectSafetyStyle(){
    if(document.getElementById('tb-runtime-stability-style'))return;
    const style=document.createElement('style');
    style.id='tb-runtime-stability-style';
    style.textContent=`
      @media(max-width:899px),(pointer:coarse){
        html.pull-refresh-running #app{pointer-events:auto!important}
      }
      .modal-backdrop[data-tb-orphan-backdrop="1"]{display:none!important;pointer-events:none!important;visibility:hidden!important}
    `;
    document.head.appendChild(style);
  }
  function resetRefreshIndicator(){
    const indicator=document.getElementById('pull-refresh-indicator');
    if(indicator){
      indicator.classList.remove('refreshing','visible','armed');
      indicator.style.removeProperty('--pull-distance');
      indicator.style.removeProperty('--pull-progress');
    }
    const label=document.getElementById('pull-refresh-label');
    if(label)label.textContent='Puxe para atualizar';
  }
  function releaseInteraction(){
    const html=document.documentElement,body=document.body,app=document.getElementById('app');
    html?.classList.remove('pull-refresh-running');
    window.__TEAM_BULLS_REFRESHING__=false;
    resetRefreshIndicator();

    [html,body,app].forEach(node=>{
      if(!node)return;
      if(node.style.pointerEvents==='none')node.style.removeProperty('pointer-events');
    });

    const openModal=hasOpenModal();
    if(app&&!openModal){
      app.removeAttribute('inert');
      if(app.getAttribute('aria-hidden')==='true')app.removeAttribute('aria-hidden');
    }
    if(!openModal){
      [html,body].forEach(node=>{
        if(!node)return;
        node.classList.remove('modal-open','no-scroll','scroll-locked');
        if(node.style.overflow==='hidden')node.style.removeProperty('overflow');
      });
    }
    [html,body].forEach(node=>node?.classList.remove('update-blocked','app-update-blocked'));

    if(mobileLike()&&physicalPortrait())html?.classList.remove('mobile-landscape-blocked');
  }
  function directCloseOrphan(modal){
    if(!(modal instanceof HTMLElement))return;
    modal.dataset.tbOrphanBackdrop='1';
    modal.classList.remove('open');
    modal.removeAttribute('aria-modal');
    modal.style.removeProperty('z-index');
    modal.style.removeProperty('pointer-events');
    try{modal.inert=false;}catch(error){}
    orphanMisses.delete(modal);
  }
  function scanOrphanModals(){
    const modals=[...document.querySelectorAll('.modal-backdrop.open')];
    for(const modal of modals){
      if(!rendered(modal)){orphanMisses.delete(modal);continue;}
      const panels=modalPanels(modal);
      if(panels.length){
        orphanMisses.delete(modal);
        continue;
      }
      /*
       * Um backdrop aberto sem sheet/dialog visível não oferece nenhuma ação ao
       * usuário; ele apenas captura os toques. Confirmamos em duas varreduras
       * consecutivas para não interferir na animação normal de abertura.
       */
      const misses=(orphanMisses.get(modal)||0)+1;
      orphanMisses.set(modal,misses);
      if(misses>=2)directCloseOrphan(modal);
    }
    releaseInteraction();
  }
  function diagnostic(){
    const points=[
      [Math.round(innerWidth/2),Math.round(innerHeight/2)],
      [Math.round(innerWidth/2),Math.max(1,Math.round(innerHeight-72))]
    ];
    return{
      revision:STABLE_REVISION,
      refreshing:!!window.__TEAM_BULLS_REFRESHING__,
      htmlClasses:document.documentElement.className,
      bodyClasses:document.body?.className||'',
      appPointer:document.getElementById('app')?getComputedStyle(document.getElementById('app')).pointerEvents:'',
      openModals:[...document.querySelectorAll('.modal-backdrop.open')].map(modal=>({id:modal.id||'',panels:modalPanels(modal).length,pointer:getComputedStyle(modal).pointerEvents})),
      hitTargets:points.map(([x,y])=>{const el=document.elementFromPoint(x,y);return el?{tag:el.tagName,id:el.id||'',class:String(el.className||'').slice(0,140)}:null;})
    };
  }

  const ESSENTIALS=[
    {
      src:'./modules/modal-stack-stability-v10_10_9.js?v=10.10.9-modal2&fix=runtime-stable1',
      ready:()=>!!window.TeamBullsModalStackStability
    },
    {
      src:'./modules/student-home-profile-v10_10_12.js?v=10.10.12-studenthome2&fix=runtime-stable1',
      ready:()=>!!window.TeamBullsStudentHome
    },
    {
      src:'./modules/student-home-layout-v10_10_15.js?v=10.10.17-home1&fix=runtime-stable1',
      ready:()=>!!window.TeamBullsStudentHomeLayout
    },
    {
      src:'./modules/usability-checkup-v10_10_9.js?v=10.10.9-usability2&fix=runtime-stable1',
      ready:()=>!!window.TeamBullsUsability
    }
  ];
  function loadEssential(item){
    if(item.ready())return Promise.resolve(true);
    return new Promise(resolve=>{
      let settled=false;
      const finish=value=>{
        if(settled)return;
        settled=true;
        clearTimeout(timer);
        resolve(!!value);
      };
      const script=document.createElement('script');
      script.src=item.src;
      script.async=false;
      script.dataset.tbRuntimeStable='1';
      script.onload=()=>finish(item.ready());
      script.onerror=()=>finish(false);
      const timer=setTimeout(()=>finish(item.ready()),5000);
      document.head.appendChild(script);
    });
  }
  async function loadEssentialStudentRuntime(){
    if(essentialPromise)return essentialPromise;
    essentialPromise=(async()=>{
      for(const item of ESSENTIALS){
        try{await loadEssential(item);}catch(error){}
      }
      try{window.TeamBullsStudentHomeLayout?.syncHotbar?.();}catch(error){}
      scanOrphanModals();
      return true;
    })().finally(()=>{essentialPromise=null;});
    return essentialPromise;
  }
  function scheduleBurst(){
    [0,120,380,900,1800,3500,6500,11000].forEach(delay=>setTimeout(scanOrphanModals,delay));
  }
  function install(){
    injectSafetyStyle();
    releaseInteraction();
    scheduleBurst();
    window.addEventListener('pageshow',()=>{releaseInteraction();scheduleBurst();},{passive:true});
    window.addEventListener('team-bulls-runtime-ready',()=>{releaseInteraction();scanOrphanModals();});
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){releaseInteraction();scanOrphanModals();}},{passive:true});
    document.addEventListener('pointerdown',event=>{
      releaseInteraction();
      if(event.target instanceof Element&&event.target.closest('.modal-backdrop.open'))setTimeout(scanOrphanModals,0);
    },{capture:true,passive:true});
  }

  /*
   * Este listener é registrado no boot, antes de config_v10_7.js. Assim, quando
   * v107 anuncia que o core está pronto, as quatro extensões essenciais começam
   * a carregar antes da fila grande de módulos opcionais.
   */
  window.addEventListener('team-bulls-v107-ready',()=>loadEssentialStudentRuntime().catch(()=>{}),{once:true});
  if(window.TeamBulls107)setTimeout(()=>loadEssentialStudentRuntime().catch(()=>{}),0);

  window.TeamBullsRuntimeStabilityBoot=Object.freeze({
    revision:STABLE_REVISION,
    release:releaseInteraction,
    scan:scanOrphanModals,
    diagnostic,
    loadEssentialStudentRuntime
  });
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();

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
    if(window.TeamBullsRuntimeStabilityBoot?.release){
      window.TeamBullsRuntimeStabilityBoot.release();
      return;
    }
    const html=document.documentElement,app=document.getElementById('app');
    html?.classList.remove('pull-refresh-running');
    window.__TEAM_BULLS_REFRESHING__=false;
    if(app?.style.pointerEvents==='none')app.style.removeProperty('pointer-events');
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
    releaseInteraction();
    if(!document.getElementById('tb-update-failopen-style')){
      const style=document.createElement('style');
      style.id='tb-update-failopen-style';
      style.textContent='[data-tb-legacy-update-blocked="1"]{display:none!important;pointer-events:none!important;visibility:hidden!important}';
      document.head.appendChild(style);
    }
    const schedule=[0,120,450,1200,2600,5000,9000,15000,30000,60000];
    schedule.forEach(delay=>setTimeout(scan,delay));
    window.addEventListener('pageshow',()=>{releaseInteraction();scan();},{passive:true});
    window.addEventListener('team-bulls-runtime-ready',()=>{releaseInteraction();scan();});
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){releaseInteraction();scan();}},{passive:true});
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