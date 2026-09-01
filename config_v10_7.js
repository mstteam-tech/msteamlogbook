/* Configuração pública Team Bulls v10.10.11 — bootstrap móvel resiliente.
   A chave do App Check/reCAPTCHA Enterprise é pública por definição.
   Não coloque senhas, chaves privadas ou credenciais administrativas aqui. */
window.TEAM_BULLS_PUBLIC_CONFIG=Object.freeze({
  appCheckSiteKey: '6Lc3U28tAAAAAB6qyxP8GauRDCg-4ADiy8oYLKXL'
});

if('caches' in window){
  caches.keys().then(keys=>Promise.all(keys.filter(name=>name.startsWith('team-bulls-stretch-guide-')).map(name=>caches.delete(name)))).catch(()=>{});
}

(()=>{
  let installed=false;
  const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const stored=key=>{try{return typeof storageGet==='function'?storageGet(key):localStorage.getItem(key);}catch(error){return null;}};
  const restoringCloudSession=()=>{
    const uid=String(stored('teamms_last_user_uid')||'').trim();
    const guest=stored('teamms_offline_pref')==='1'||stored('teamms_offline_mode')==='guest';
    return !!uid&&!guest&&navigator.onLine!==false;
  };
  const patch=()=>{
    if(installed)return true;
    if(typeof withTimeout!=='function'||typeof ensureFirebaseReady!=='function'||typeof cloudGet!=='function')return false;
    installed=true;
    if(typeof startBootWatchdog==='function'&&!startBootWatchdog.__tbMobileSessionRestore){
      const wrapped=function(){
        BOOT_SETTLED=false;clearTimeout(BOOT_WATCHDOG);clearTimeout(AUTH_UI_FALLBACK_TIMER);
        const restoring=restoringCloudSession(),authDelay=restoring?4200:700,hardDelay=restoring?8500:4600;
        AUTH_UI_FALLBACK_TIMER=setTimeout(()=>{if(BOOT_SETTLED||!document.getElementById('screen-loading')?.classList.contains('active'))return;showScreen('screen-auth');if(restoring)window.TeamBullsRecovery?.reveal?.('A sessão está levando mais tempo que o normal para ser restaurada. Você pode aguardar ou entrar novamente.');},authDelay);
        BOOT_WATCHDOG=setTimeout(()=>{if(BOOT_SETTLED||!document.getElementById('screen-loading')?.classList.contains('active'))return;AUTH_HANDLED=false;showScreen('screen-auth');window.TeamBullsRecovery?.reveal?.('A conexão ainda está sendo conferida. A tela de acesso foi liberada sem apagar seus dados locais.');},hardDelay);
      };wrapped.__tbMobileSessionRestore=true;startBootWatchdog=wrapped;
    }
    if(!withTimeout.__tbFirebaseResilience){const base=withTimeout;const wrapped=function(task,ms,label='operação'){let limit=Math.max(250,Number(ms)||10000);if(label==='Firebase'||label==='carregar conexão segura')limit=Math.max(limit,12000);else if(label==='App Check')limit=Math.max(limit,6000);else if(label==='login')limit=Math.max(limit,16000);return base(task,limit,label);};wrapped.__tbFirebaseResilience=true;withTimeout=wrapped;}
    if(typeof initOptionalAppCheck==='function'&&!initOptionalAppCheck.__tbEnterpriseProvider){const legacy=initOptionalAppCheck;const wrapped=async function(){const key=String(typeof CFG!=='undefined'&&CFG.appCheckSiteKey||'').trim();if(!key||typeof firebase==='undefined')return false;try{const ok=await loadSdkOnce('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-check-compat.js',()=>typeof firebase.appCheck==='function');if(!ok)return false;const Provider=firebase.appCheck?.ReCaptchaEnterpriseProvider;if(typeof Provider==='function'){firebase.appCheck().activate(new Provider(key),true);return true;}return await legacy();}catch(error){const message=String(error?.message||error||'').toLowerCase();if(message.includes('already')&&message.includes('activ'))return true;console.warn('App Check Enterprise não iniciado',error);return false;}};wrapped.__tbEnterpriseProvider=true;initOptionalAppCheck=wrapped;}
    if(typeof ensureFirebaseReady==='function'&&!ensureFirebaseReady.__tbRetry){const base=ensureFirebaseReady;const wrapped=async function(){if(typeof auth!=='undefined'&&auth&&typeof db!=='undefined'&&db)return true;const first=await base();if(first)return true;if(!navigator.onLine)return false;await delay(450);try{const ready=await withTimeout(ensureFirebaseCore(),12000,'carregar conexão segura');return !!(ready&&initFirebase());}catch(error){console.warn('Firebase indisponível após nova tentativa',error);return false;}};wrapped.__tbRetry=true;ensureFirebaseReady=wrapped;}
    if(typeof cloudGet==='function'&&!cloudGet.__tbRetry){const base=cloudGet;const wrapped=async function(reference,label='consulta'){try{return await base(reference,label);}catch(error){const retryable=navigator.onLine&&(typeof isNetworkLikeError==='function'?isNetworkLikeError(error):false);if(!retryable)throw error;await delay(400);return base(reference,label+' · nova tentativa');}};wrapped.__tbRetry=true;cloudGet=wrapped;}
    return true;
  };
  patch();document.addEventListener('DOMContentLoaded',patch,{once:true});window.addEventListener('load',()=>{if(!installed)patch();},{once:true});
})();

(()=>{
  let requested=false,deferredStarted=false,deferredBatchCount=0,studentPriorityStarted=false,healing=false,healTimer=null,readyResolved=false,hadFailures=false,screenObserver=null;
  const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const yieldUi=()=>new Promise(resolve=>{if('requestIdleCallback'in window)requestIdleCallback(()=>resolve(),{timeout:350});else requestAnimationFrame(()=>setTimeout(resolve,0));});
  const criticalModules=['./modules/security-hardening-v10_10_9.js?v=10.10.10-security8'];
  const studentPriorityModules=[
    './modules/student-home-profile-v10_10_12.js?v=10.10.12-studenthome1',
    './modules/student-home-layout-v10_10_15.js?v=10.10.19-home2'
  ];
  const modules=[
    './modules/session-save-performance-v10_10_9.js?v=10.10.9-sessionperf1','./modules/week-selection-fix-v10_10_9.js?v=10.10.9-weekselection1','./modules/stability_v10_10_9.js?v=10.10.9','./modules/app-update-v10_10_9.js?v=10.10.9','./modules/diet-scroll-fix-v10_10_9.js?v=10.10.9','./modules/modal-form-guard-v10_10_9.js?v=10.10.9','./modules/trainer-workspace-v10_10_9.js?v=10.10.9-workspace3','./modules/cardio-timer-fix-v10_10_9.js?v=10.10.9-cardio1','./modules/global-performance-v10_10_9.js?v=10.10.9-perf2','./modules/workout-ux-fix-v10_10_9.js?v=10.10.9-workout1','./modules/desktop-performance-v10_10_9.js?v=10.10.9-desktop1','./modules/ger-bulk-v10_10_9.js?v=10.10.9-ger1','./modules/prescription-actions-layout-v10_10_9.js?v=10.10.9-actions2','./modules/prescription-propagation-v10_10_9.js?v=10.10.9-propagation1','./modules/diet-delete-fix-v10_10_9.js?v=10.10.9-dietdelete1','./modules/student-guidance-v10_10_9-v2.js?v=10.10.9-guidance2','./modules/remove-stretch-planilha-v10_10_9.js?v=10.10.9-stretchremove2','./modules/registration-integrity-v10_10_9.js?v=10.10.9-registration2','./modules/photo-quality-download-v10_10_9.js?v=10.10.9-photoquality2','./modules/heic-report-conversion-v10_10_12.js?v=10.10.12-heic1','./modules/usability-checkup-v10_10_9.js?v=10.10.9-usability1','./modules/legacy-student-link-repair-v10_10_10.js?v=10.10.10-legacy-links6','./modules/workflow-controls-v10_10_10.js?v=10.10.10-workflow1','./modules/prescription-lock-bridge-v10_10_10.js?v=10.10.10-lockbridge1','./modules/ger-lock-bridge-v10_10_10.js?v=10.10.10-gerlock1','./modules/report-photo-ux-v10_10_10.js?v=10.10.10-reportphotos1','./modules/usability-audit-v10_10_10.js?v=10.10.10-audit1','./modules/modal-stack-stability-v10_10_9.js?v=10.10.9-modal2&fix=freeze1','./modules/diet-calculation-math-v10_10_9.js?v=10.10.10-dietmath1','./modules/diet-calculation-evolution-v10_10_9.js?v=10.10.10-dietcalc1','./modules/diet-portion-presets-v10_10_9.js?v=10.10.10-portions1','./modules/diet-personalization-v10_10_11.js?v=10.10.11-dietpersonal1','./modules/diet-live-calories-v10_10_11.js?v=10.10.11-dietcalories2','./modules/training-integrity-v10_10_11.js?v=10.10.11-training1','./modules/report-schedule-consistency-v10_10_11.js?v=10.10.11-reportschedule1','./modules/cardio-finish-alert-v10_10_11.js?v=10.10.11-cardioalert1','./modules/release-coherence-v10_10_10.js?v=10.10.12-release6','./modules/custom-food-calorie-bridge-v10_10_12.js?v=10.10.12-customfood2','./modules/trainer-diet-workspace-v10_10_11.js?v=10.10.11-dietworkspace1','./modules/trainer-inbox-payments-v10_10_12.js?v=10.10.12-inboxpayments2','./modules/student-home-layout-runtime-v10_10_16.js?v=10.10.16-runtime1'
  ];
  const loadedModules=new Set(),failedModules=new Set();let readyResolve=null;const ready=new Promise(resolve=>{readyResolve=resolve;});
  const activeScreen=()=>document.querySelector('.screen.active')?.id||'';
  const sessionUiReady=()=>{const screen=activeScreen();return !!screen&&screen!=='screen-loading'&&screen!=='screen-auth';};
  const studentHomeActive=()=>{
    if(activeScreen()!=='screen-home'||document.body?.classList.contains('trainer-desktop'))return false;
    try{if(typeof CURRENT_USER!=='undefined'&&CURRENT_USER?.role==='trainer')return false;}catch(error){}
    return true;
  };
  const preloadModules=items=>items.forEach(src=>{if(document.head.querySelector(`link[rel="preload"][as="script"][href="${src}"]`))return;const link=document.createElement('link');link.rel='preload';link.as='script';link.href=src;document.head.appendChild(link);});
  const preloadAhead=index=>preloadModules(modules.slice(Math.max(0,index),Math.max(0,index)+4));
  const runtimeDetail=()=>({loaded:loadedModules.size,total:criticalModules.length+studentPriorityModules.length+modules.length,failed:[...failedModules],screen:activeScreen(),studentPriority:studentPriorityStarted});
  const emitRuntimeState=type=>{try{window.dispatchEvent(new CustomEvent(type,{detail:runtimeDetail()}));}catch(error){}};
  const markReady=()=>{if(readyResolved||failedModules.size)return;readyResolved=true;document.documentElement.dataset.teamBullsRuntime='ready';readyResolve?.(true);emitRuntimeState('team-bulls-runtime-ready');if(hadFailures&&typeof showToast==='function')showToast('✓ Recursos do aplicativo sincronizados');};
  const loadScriptOnce=(src,timeoutMs=3200)=>{if(loadedModules.has(src))return Promise.resolve(true);return new Promise(resolve=>{const script=document.createElement('script');let settled=false;const finish=(ok,reason='')=>{if(settled)return;settled=true;clearTimeout(timer);script.onload=null;script.onerror=null;if(ok){loadedModules.add(src);failedModules.delete(src);script.dataset.tbModuleReady='1';}else{failedModules.add(src);hadFailures=true;if(script.isConnected)script.remove();}if(reason)console.warn('[Team Bulls] Extensão temporariamente indisponível:',src,reason);emitRuntimeState('team-bulls-runtime-state');const settle=()=>resolve(ok);if(deferredStarted&&++deferredBatchCount%4===0)requestAnimationFrame(settle);else settle();};script.src=src;script.async=false;script.onload=()=>finish(true);script.onerror=()=>finish(false,'erro de carregamento');const timer=setTimeout(()=>finish(false,'tempo limite'),Math.max(1200,Number(timeoutMs)||3200));document.head.appendChild(script);});};
  const loadScript=async(src,timeoutMs=3200)=>{if(loadedModules.has(src))return true;let ok=await loadScriptOnce(src,timeoutMs);if(!ok&&navigator.onLine){await wait(250);ok=await loadScriptOnce(src,Math.max(6500,Number(timeoutMs)||3200));}if(!ok)console.warn('[Team Bulls] Módulo colocado na fila de autorreparo:',src);return ok;};
  const scheduleHeal=(delay=1800)=>{clearTimeout(healTimer);if(!failedModules.size)return;healTimer=setTimeout(()=>healFailedModules(),Math.max(400,delay));};
  const healFailedModules=async()=>{if(healing||!failedModules.size||navigator.onLine===false)return false;healing=true;const pending=[...failedModules];preloadModules(pending.slice(0,4));try{for(const src of pending){await loadScript(src,9000);await yieldUi();}}finally{healing=false;}if(failedModules.size)scheduleHeal(5000);else markReady();return failedModules.size===0;};
  const loadStudentPriority=async()=>{
    if(studentPriorityStarted||!studentHomeActive())return !!window.TeamBullsStudentHomeLayout;
    studentPriorityStarted=true;document.documentElement.dataset.teamBullsStudentRuntime='loading';preloadModules(studentPriorityModules);
    for(const src of studentPriorityModules){await loadScript(src,6500);await yieldUi();}
    try{window.TeamBullsStudentHomeLayout?.syncHotbar?.();}catch(error){}
    document.documentElement.dataset.teamBullsStudentRuntime=window.TeamBullsStudentHomeLayout?'ready':'partial';
    emitRuntimeState('team-bulls-student-runtime-ready');
    if(failedModules.size)scheduleHeal(900);
    return !!window.TeamBullsStudentHomeLayout;
  };
  const loadDeferred=async()=>{
    if(deferredStarted||!sessionUiReady())return;
    deferredStarted=true;document.documentElement.dataset.teamBullsRuntime='loading';
    try{
      if(studentHomeActive())await loadStudentPriority();
      preloadAhead(0);
      for(const src of modules)await loadScript(src).then(()=>yieldUi());
    }finally{deferredStarted=false;}
    if(failedModules.size){if(typeof showToast==='function')showToast('Conexão instável: alguns recursos continuam sendo finalizados automaticamente.',true);scheduleHeal(1200);}else markReady();
  };
  const scheduleDeferred=()=>{
    if(!sessionUiReady())return;
    const queue=()=>{if(!sessionUiReady())return;if(studentHomeActive())loadStudentPriority().finally(()=>{if(!deferredStarted)loadDeferred();});else loadDeferred();};
    requestAnimationFrame(()=>{if('requestIdleCallback'in window)requestIdleCallback(queue,{timeout:450});else setTimeout(queue,40);});
  };
  const contextChanged=()=>{
    if(studentHomeActive()){loadStudentPriority().finally(scheduleDeferred);return;}
    if(sessionUiReady())scheduleDeferred();
  };
  const installSessionGate=()=>{
    if(screenObserver||typeof MutationObserver!=='function')return;
    screenObserver=new MutationObserver(contextChanged);
    [document.body,document.getElementById('screen-loading'),document.getElementById('screen-auth'),document.getElementById('screen-home'),document.getElementById('screen-trainer')].filter(Boolean).forEach(node=>screenObserver.observe(node,{attributes:true,attributeFilter:['class']}));
    window.addEventListener('pageshow',contextChanged,{passive:true});
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')contextChanged();},{passive:true});
  };
  const load=async()=>{if(requested)return;requested=true;preloadModules(studentPriorityModules);for(const src of criticalModules)await loadScript(src,6500);installSessionGate();contextChanged();};
  preloadModules(criticalModules);preloadModules(studentPriorityModules);
  window.TeamBullsRuntimeLoader=Object.freeze({version:'10.10.19-startup6',ready,state:runtimeDetail,retry:healFailedModules,student:loadStudentPriority});
  window.addEventListener('online',()=>{scheduleHeal(500);contextChanged();});document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')scheduleHeal(700);});window.addEventListener('pageshow',()=>scheduleHeal(900));if(window.TeamBulls107)load();else window.addEventListener('team-bulls-v107-ready',load,{once:true});
})();