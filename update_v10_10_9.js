/* Team Bulls v10.10.9 — atualizador resiliente, sem bloqueio automático da interface. */
'use strict';
(()=>{
  if(window.__TEAM_BULLS_UPDATER_RUNTIME_RESCUE_1__)return;
  window.__TEAM_BULLS_UPDATER_RUNTIME_RESCUE_1__=true;

  const CURRENT_VERSION='10.10.9';
  const CURRENT_BUILD=2026083104;
  const CHECK_INTERVAL_MS=20*60*1000;
  const BACKGROUND_CHECK_DELAY_MS=1800;
  const VERSION_URL='./version.json';
  const UPDATE_RELOAD_KEY='team-bulls-update-reload-version';
  const UPDATE_ATTEMPT_KEY='team-bulls-update-attempt-v2';
  const UPDATE_PREPARE_TIMEOUT_MS=4600;
  const UPDATE_WORKER_WAIT_MS=1300;
  const UPDATE_CONTROLLER_WAIT_MS=1700;
  const UPDATE_FLUSH_BUDGET_MS=450;
  const NAVIGATION_WATCHDOG_MS=2200;
  const AUTO_APPLY_SAME_VERSION_HOTFIX=false;

  const TECHNIQUE_COMPOSITION_MODULE='./modules/technique-composition-integrity-v10_10_12.js?v=10.10.12-techcombo1';
  const STUDENT_HOME_MODULE='./modules/student-home-profile-v10_10_12.js?v=10.10.12-studenthome1';
  const STUDENT_HOME_LAYOUT_MODULE='./modules/student-home-layout-v10_10_15.js?v=10.10.15-home2';
  // Mantidos como catálogo de coerência/offline. O novo atualizador NÃO baixa esta
  // lista inteira durante a interação do usuário; isso evita o travamento observado.
  const CRITICAL_ASSETS=[
    './index.html','./manifest.json?v=10.10.9','./version.json','./viewport_v10_10_9.js?v=10.10.9',
    './boot_v10.js?v=10.10.9','./config_v10_7.js?v=10.10.9','./update_v10_10_9.js?v=10.10.9',
    './app_v10_10_9_core.js?v=10.10.9','./modules/v107-core.js?v=10.10.9','./modules/v107-invites.js?v=10.10.9',
    './modules/v107-operations.js?v=10.10.9','./modules/registration-integrity-v10_10_9.js?v=10.10.9-registration2',
    './modules/photo-quality-download-v10_10_9.js?v=10.10.9-photoquality2',
    './modules/heic-report-conversion-v10_10_12.js?v=10.10.12-heic1',
    './modules/heic-libheif-worker-v10_10_12.js?v=10.10.12-heicworker1',
    './modules/trainer-inbox-payments-v10_10_12.js?v=10.10.12-inboxpayments2',
    './modules/release-coherence-v10_10_10.js?v=10.10.12-release6',
    TECHNIQUE_COMPOSITION_MODULE,STUDENT_HOME_MODULE,STUDENT_HOME_LAYOUT_MODULE,
    './modules/custom-food-calorie-bridge-v10_10_12.js?v=10.10.12-customfood2',
    './modules/diet-live-deficit-v10_10_13.js?v=10.10.13-deficit1',
    './interaction_v10_10_9.js?v=10.10.9','./styles_v10_10_9.css?v=10.10.9'
  ];

  let registration=null;
  let latestInfo=null;
  let checking=null;
  let applying=false;
  let applySequence=0;
  let applyController=null;
  let banner=null;
  let scheduledCheckTimer=null;
  let techniqueModulePromise=null;
  let studentHomePromise=null;
  let studentLayoutPromise=null;

  const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  function numericParts(value){return String(value||'').split('.').map(part=>Number.parseInt(part,10)||0);}
  function compareVersions(left,right){const a=numericParts(left),b=numericParts(right),size=Math.max(a.length,b.length);for(let i=0;i<size;i++){const diff=(a[i]||0)-(b[i]||0);if(diff)return diff>0?1:-1;}return 0;}
  function buildNumber(value){const number=Math.trunc(Number(value)||0);return Number.isFinite(number)&&number>0?number:0;}
  function compareRelease(info){const version=String(info?.version||CURRENT_VERSION),versionDiff=compareVersions(version,CURRENT_VERSION);if(versionDiff)return versionDiff;const remoteBuild=buildNumber(info?.build);if(remoteBuild===CURRENT_BUILD)return 0;return remoteBuild>CURRENT_BUILD?1:-1;}
  function releaseKey(info={}){return `${String(info.version||CURRENT_VERSION)}@${buildNumber(info.build)||CURRENT_BUILD}`;}
  function isSameVersionHotfix(info){return compareVersions(String(info?.version||''),CURRENT_VERSION)===0&&buildNumber(info?.build)>CURRENT_BUILD;}
  function isOnline(){return navigator.onLine!==false;}

  function timeoutError(label){const error=new Error(`${label} demorou além do limite seguro.`);error.code='team-bulls/update-timeout';return error;}
  function withDeadline(task,ms,label='Atualização'){
    return Promise.race([
      Promise.resolve(task),
      new Promise((_,reject)=>setTimeout(()=>reject(timeoutError(label)),Math.max(250,ms)))
    ]);
  }
  function waitForState(worker,desired,timeout=UPDATE_WORKER_WAIT_MS){
    if(!worker)return Promise.resolve(false);
    if(worker.state===desired)return Promise.resolve(true);
    return new Promise(resolve=>{
      let done=false;
      const finish=value=>{if(done)return;done=true;clearTimeout(timer);worker.removeEventListener('statechange',onState);resolve(value);};
      const onState=()=>{if(worker.state===desired)finish(true);else if(worker.state==='redundant')finish(false);};
      const timer=setTimeout(()=>finish(false),timeout);
      worker.addEventListener('statechange',onState);
    });
  }
  function waitForControllerChange(timeout=UPDATE_CONTROLLER_WAIT_MS){
    if(!('serviceWorker'in navigator))return Promise.resolve(false);
    return new Promise(resolve=>{
      let done=false;
      const finish=value=>{if(done)return;done=true;clearTimeout(timer);navigator.serviceWorker.removeEventListener('controllerchange',changed);resolve(value);};
      const changed=()=>finish(true),timer=setTimeout(()=>finish(false),timeout);
      navigator.serviceWorker.addEventListener('controllerchange',changed,{once:true});
    });
  }

  function ensureBanner(){
    if(banner?.isConnected)return banner;
    const host=document.createElement('aside');
    host.id='team-bulls-update-banner';host.className='team-bulls-update-banner';host.hidden=true;
    host.setAttribute('role','status');host.setAttribute('aria-live','polite');
    host.innerHTML=`<div class="team-bulls-update-copy"><strong id="team-bulls-update-title">ATUALIZAÇÃO DISPONÍVEL</strong><span id="team-bulls-update-text">Uma revisão nova está pronta.</span></div><div class="team-bulls-update-actions"><button type="button" class="team-bulls-update-primary" id="team-bulls-update-now">ATUALIZAR AGORA</button><button type="button" class="team-bulls-update-later" id="team-bulls-update-later">DEPOIS</button></div>`;
    document.body.appendChild(host);
    host.querySelector('#team-bulls-update-now')?.addEventListener('click',()=>{
      if(host.dataset.state==='prepared')forceReload(latestInfo||{});
      else applyLatestUpdate({automatic:false});
    });
    host.querySelector('#team-bulls-update-later')?.addEventListener('click',()=>{
      if(applying)cancelActiveUpdate('Atualização cancelada. Você pode continuar usando o app.');
      else host.hidden=true;
    });
    banner=host;return host;
  }
  function setBannerState({title,text,busy=false,error=false,visible=true,prepared=false}={}){
    const host=ensureBanner(),titleEl=host.querySelector('#team-bulls-update-title'),textEl=host.querySelector('#team-bulls-update-text'),updateButton=host.querySelector('#team-bulls-update-now'),laterButton=host.querySelector('#team-bulls-update-later');
    if(title)titleEl.textContent=title;if(text)textEl.textContent=text;
    host.dataset.state=error?'error':prepared?'prepared':busy?'busy':'ready';host.hidden=!visible;
    if(updateButton){updateButton.disabled=busy;updateButton.textContent=prepared?'REABRIR APP':busy?'PREPARANDO...':'ATUALIZAR AGORA';}
    // O botão secundário nunca fica bloqueado: é a rota de escape da interface.
    if(laterButton){laterButton.disabled=false;laterButton.textContent=busy?'CONTINUAR NO APP':prepared?'AGORA NÃO':'DEPOIS';}
  }
  function cancelActiveUpdate(message='Atualização interrompida.'){
    applySequence++;
    try{applyController?.abort?.();}catch(error){}
    applyController=null;applying=false;
    const host=ensureBanner();host.hidden=true;host.dataset.state='ready';
    if(typeof showToast==='function')try{showToast(message,true);}catch(error){}
  }

  async function fetchLatestVersion(){
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),3000);
    try{
      const response=await fetch(`${VERSION_URL}?t=${Date.now()}`,{cache:'no-store',headers:{'Cache-Control':'no-cache','Pragma':'no-cache'},signal:controller.signal});
      if(!response.ok)throw new Error(`Não foi possível verificar a versão (${response.status}).`);
      const data=await response.json();if(!/^\d+\.\d+\.\d+$/.test(String(data?.version||'')))throw new Error('Resposta de versão inválida.');
      data.build=buildNumber(data.build);return data;
    }finally{clearTimeout(timer);}
  }
  async function registerWorker(){
    if(!('serviceWorker'in navigator))return null;
    if(registration)return registration;
    registration=await navigator.serviceWorker.register(`./sw.js?v=${encodeURIComponent(CURRENT_VERSION)}&b=${CURRENT_BUILD}`,{scope:'./',updateViaCache:'none'});
    return registration;
  }

  // Compatibilidade pública: o método continua existindo, mas não faz mais o
  // download síncrono de dezenas de arquivos no thread de interação.
  async function refreshCriticalShell(){return false;}
  async function requestShellRefresh(worker){
    if(!worker)return false;
    return new Promise(resolve=>{
      let done=false;
      const finish=value=>{if(done)return;done=true;clearTimeout(timer);navigator.serviceWorker.removeEventListener('message',onMessage);resolve(value);};
      const onMessage=event=>{if(event.data?.type==='TEAM_BULLS_REFRESHED')finish(event.data.ok!==false);};
      const timer=setTimeout(()=>finish(false),1400);
      navigator.serviceWorker.addEventListener('message',onMessage);worker.postMessage({type:'REFRESH_APP_SHELL'});
    });
  }

  function loadTechniqueCompositionIntegrity(){
    if(window.TeamBullsTechniqueCompositionIntegrity)return Promise.resolve(true);
    if(techniqueModulePromise)return techniqueModulePromise;
    techniqueModulePromise=new Promise(resolve=>{
      let settled=false;
      const done=ok=>{if(settled)return;settled=true;if(!ok)techniqueModulePromise=null;resolve(!!ok);};
      const existing=[...document.scripts].find(script=>{try{return new URL(script.src,location.href).pathname.endsWith('/modules/technique-composition-integrity-v10_10_12.js');}catch(error){return false;}});
      if(existing){if(window.TeamBullsTechniqueCompositionIntegrity){done(true);return;}const timer=setTimeout(()=>done(!!window.TeamBullsTechniqueCompositionIntegrity),5000);existing.addEventListener('load',()=>{clearTimeout(timer);done(!!window.TeamBullsTechniqueCompositionIntegrity);},{once:true});existing.addEventListener('error',()=>{clearTimeout(timer);done(false);},{once:true});return;}
      const script=document.createElement('script');script.src=TECHNIQUE_COMPOSITION_MODULE;script.async=false;script.onload=()=>done(!!window.TeamBullsTechniqueCompositionIntegrity);script.onerror=()=>done(false);document.head.appendChild(script);
    });return techniqueModulePromise;
  }
  function loadOptionalModule({src,pathSuffix,readyFlag,promiseKey}){
    if(readyFlag())return Promise.resolve(true);
    if(promiseKey==='profile'&&studentHomePromise)return studentHomePromise;
    if(promiseKey==='layout'&&studentLayoutPromise)return studentLayoutPromise;
    const promise=new Promise(resolve=>{
      let settled=false;
      const done=ok=>{if(settled)return;settled=true;if(!ok){if(promiseKey==='profile')studentHomePromise=null;else studentLayoutPromise=null;}resolve(!!ok);};
      const existing=[...document.scripts].find(script=>{try{return new URL(script.src,location.href).pathname.endsWith(pathSuffix);}catch(error){return false;}});
      if(existing){if(readyFlag()){done(true);return;}const timer=setTimeout(()=>done(readyFlag()),5000);existing.addEventListener('load',()=>{clearTimeout(timer);done(readyFlag());},{once:true});existing.addEventListener('error',()=>{clearTimeout(timer);done(false);},{once:true});return;}
      const script=document.createElement('script');script.src=src;script.async=false;script.onload=()=>done(readyFlag());script.onerror=()=>done(false);document.head.appendChild(script);
    });
    if(promiseKey==='profile')studentHomePromise=promise;else studentLayoutPromise=promise;return promise;
  }
  function loadStudentHomeProfile(){return loadOptionalModule({src:STUDENT_HOME_MODULE,pathSuffix:'/modules/student-home-profile-v10_10_12.js',readyFlag:()=>!!window.TeamBullsStudentHome,promiseKey:'profile'});}
  function loadStudentHomeLayout(){return loadOptionalModule({src:STUDENT_HOME_LAYOUT_MODULE,pathSuffix:'/modules/student-home-layout-v10_10_15.js',readyFlag:()=>!!window.TeamBullsStudentHomeLayout,promiseKey:'layout'});}
  async function loadStudentHomeModules(){await loadStudentHomeProfile().catch(()=>false);return loadStudentHomeLayout().catch(()=>false);}
  function scheduleStudentHome(delay=180){setTimeout(()=>loadStudentHomeModules().then(ok=>{if(!ok&&navigator.onLine!==false)setTimeout(()=>loadStudentHomeModules(),1800);}).catch(()=>{}),Math.max(0,delay));}
  function scheduleTechniqueComposition(delay=120){setTimeout(()=>loadTechniqueCompositionIntegrity().then(ok=>{if(!ok&&navigator.onLine!==false)setTimeout(()=>loadTechniqueCompositionIntegrity(),1800);}).catch(()=>{}),Math.max(0,delay));}

  async function prepareLatest({forceCheck=true}={}){
    const info=forceCheck?await fetchLatestVersion().catch(()=>latestInfo):latestInfo;if(info)latestInfo=info;
    const targetVersion=latestInfo?.version||CURRENT_VERSION,targetBuild=buildNumber(latestInfo?.build)||CURRENT_BUILD;
    if(!('serviceWorker'in navigator))return{version:targetVersion,build:targetBuild,reloadNeeded:compareRelease(latestInfo)>0};
    const reg=await withDeadline(registerWorker(),1800,'Registro do atualizador');
    await Promise.race([Promise.resolve(reg?.update?.()).catch(()=>null),sleep(UPDATE_WORKER_WAIT_MS)]);
    let controllerChanged=false;
    if(reg?.installing)await waitForState(reg.installing,'installed',UPDATE_WORKER_WAIT_MS).catch(()=>false);
    if(reg?.waiting){const changed=waitForControllerChange();reg.waiting.postMessage({type:'SKIP_WAITING'});controllerChanged=await changed;}
    return{version:targetVersion,build:targetBuild,reloadNeeded:compareRelease(latestInfo)>0||controllerChanged};
  }
  async function flushBeforeReload(){
    try{window.dispatchEvent(new CustomEvent('team-bulls:before-refresh'));}catch(error){}
    const TB=window.TeamBulls107;
    const pending=Promise.allSettled([Promise.resolve(TB?.flushDrafts?.()),Promise.resolve(TB?.flushPendingMutationSync?.()),Promise.resolve(window.TeamBullsSessionPerformance?.flush?.())]);
    await Promise.race([pending,sleep(UPDATE_FLUSH_BUDGET_MS)]);
  }
  function safeForAutomaticHotfix(){
    const screen=document.querySelector('.screen.active')?.id||'';
    if(screen==='screen-loading')return true;
    if(screen!=='screen-auth')return false;
    const active=document.activeElement;if(active?.matches?.('input,textarea,select'))return false;
    const password=String(document.getElementById('login-pass')?.value||''),registerPassword=String(document.getElementById('reg-pass')?.value||'');
    return !password&&!registerPassword;
  }
  function recentAttemptFor(info){
    try{const data=JSON.parse(sessionStorage.getItem(UPDATE_ATTEMPT_KEY)||'null');return data?.key===releaseKey(info)&&Date.now()-Number(data.at||0)<120000;}catch(error){return false;}
  }
  function rememberAttempt(info){try{sessionStorage.setItem(UPDATE_ATTEMPT_KEY,JSON.stringify({key:releaseKey(info),at:Date.now()}));}catch(error){}}
  function forceReload(info={}){
    const targetVersion=String(info.version||CURRENT_VERSION),targetBuild=buildNumber(info.build)||CURRENT_BUILD;
    const url=`./index.html?updated=${encodeURIComponent(targetVersion)}&build=${encodeURIComponent(targetBuild)}&t=${Date.now()}`;
    try{location.replace(url);}catch(error){location.href=url;}
  }

  async function applyLatestUpdate({automatic=false}={}){
    if(applying)return false;
    // Auto-apply está deliberadamente desligado após o incidente de loop/freeze.
    if(automatic&&!AUTO_APPLY_SAME_VERSION_HOTFIX)return false;
    const sequence=++applySequence;applying=true;applyController=new AbortController();
    setBannerState({title:'PREPARANDO ATUALIZAÇÃO',text:'Conferindo apenas os arquivos essenciais. Você pode continuar no app a qualquer momento.',busy:true});
    try{
      if(!isOnline())throw new Error('Conecte o aparelho à internet para atualizar.');
      await flushBeforeReload();
      const prepared=await withDeadline(prepareLatest({forceCheck:true}),UPDATE_PREPARE_TIMEOUT_MS,'Preparação da atualização');
      if(sequence!==applySequence||applyController?.signal.aborted)return false;
      const target={version:prepared.version||latestInfo?.version||CURRENT_VERSION,build:prepared.build||buildNumber(latestInfo?.build)||CURRENT_BUILD};
      if(compareRelease(target)<=0){applying=false;applyController=null;setBannerState({title:'APLICATIVO ATUALIZADO',text:'Nenhuma atualização pendente. Você pode continuar usando o Team Bulls.'});setTimeout(()=>{if(banner&&!applying)banner.hidden=true;},2800);return true;}
      if(recentAttemptFor(target)){
        applying=false;applyController=null;
        setBannerState({title:'ATUALIZAÇÃO AGUARDANDO REABERTURA',text:'Uma tentativa já foi feita recentemente. O app não vai repetir o ciclo sozinho.',prepared:true});
        return false;
      }
      rememberAttempt(target);sessionStorage.setItem(UPDATE_RELOAD_KEY,releaseKey(target));latestInfo=target;
      applying=false;applyController=null;
      setBannerState({title:'ATUALIZAÇÃO PRONTA',text:'Os arquivos essenciais foram preparados. Toque em REABRIR APP; se preferir, continue usando esta tela.',prepared:true});
      // A navegação é explícita e possui watchdog; nunca deixa a UI eternamente busy.
      const before=location.href;
      setTimeout(()=>{if(location.href===before&&banner?.dataset.state==='prepared')setBannerState({title:'ATUALIZAÇÃO PRONTA',text:'A reabertura não ocorreu automaticamente. Toque em REABRIR APP quando quiser.',prepared:true});},NAVIGATION_WATCHDOG_MS);
      forceReload(target);
      return true;
    }catch(error){
      if(sequence!==applySequence)return false;
      console.error('[Team Bulls] Falha ao atualizar:',error);
      applying=false;applyController=null;
      setBannerState({title:'ATUALIZAÇÃO ADIADA',text:error?.message||'Não foi possível concluir agora. O aplicativo continua disponível.',error:true});
      return false;
    }
  }

  async function checkForUpdates({showErrors=false,announceCurrent=false}={}){
    if(checking)return checking;
    checking=(async()=>{
      if(!isOnline())return null;
      try{
        const info=await fetchLatestVersion();latestInfo=info;
        registerWorker().then(reg=>reg?.update?.()).catch(()=>{});
        const newer=compareRelease(info)>0;
        if(newer){
          const hotfix=isSameVersionHotfix(info);
          setBannerState({title:hotfix?'CORREÇÃO DO APP DISPONÍVEL':`NOVA VERSÃO ${info.version}`,text:'A atualização não será aplicada sozinha. Continue usando o app ou atualize quando quiser.'});
          // Mantemos a função de gate para compatibilidade/teste, mas não disparamos update automático.
          if(hotfix&&AUTO_APPLY_SAME_VERSION_HOTFIX&&safeForAutomaticHotfix())setTimeout(()=>applyLatestUpdate({automatic:true}),600);
        }else if(announceCurrent){setBannerState({title:'APLICATIVO ATUALIZADO',text:`Você já está usando o Team Bulls ${CURRENT_VERSION}.`});setTimeout(()=>{if(banner&&!applying)banner.hidden=true;},2800);}
        return info;
      }catch(error){if(showErrors)setBannerState({title:'VERIFICAÇÃO INDISPONÍVEL',text:'Não foi possível consultar atualizações agora. O app continua disponível.',error:true});return null;}
      finally{checking=null;}
    })();return checking;
  }
  function scheduleBackgroundCheck(delay=BACKGROUND_CHECK_DELAY_MS){
    clearTimeout(scheduledCheckTimer);scheduledCheckTimer=setTimeout(()=>{
      const run=()=>checkForUpdates().catch(()=>null);
      if('requestIdleCallback'in window)requestIdleCallback(run,{timeout:1200});else run();
    },Math.max(400,delay));
  }
  function announceCompletedUpdate(){
    const params=new URLSearchParams(location.search),updated=params.get('updated'),updatedBuild=buildNumber(params.get('build'));
    if(updated&&updated===CURRENT_VERSION){
      sessionStorage.removeItem(UPDATE_RELOAD_KEY);sessionStorage.removeItem(UPDATE_ATTEMPT_KEY);
      setBannerState({title:'APLICATIVO ATUALIZADO',text:`Team Bulls ${CURRENT_VERSION} reaberto.`,visible:true});
      setTimeout(()=>{if(banner&&!applying)banner.hidden=true;},2600);
      params.delete('updated');params.delete('build');params.delete('t');const query=params.toString();history.replaceState(history.state,'',`${location.pathname}${query?'?'+query:''}${location.hash}`);
    }else if(updatedBuild&&updatedBuild===CURRENT_BUILD){sessionStorage.removeItem(UPDATE_RELOAD_KEY);sessionStorage.removeItem(UPDATE_ATTEMPT_KEY);}
  }
  function init(){
    ensureBanner();announceCompletedUpdate();
    const afterLoad=()=>{scheduleTechniqueComposition(140);scheduleStudentHome(220);};
    if(document.readyState==='complete')afterLoad();else window.addEventListener('load',afterLoad,{once:true});
    if(!('serviceWorker'in navigator))return;
    if(document.readyState==='complete')scheduleBackgroundCheck(BACKGROUND_CHECK_DELAY_MS);else window.addEventListener('load',()=>scheduleBackgroundCheck(BACKGROUND_CHECK_DELAY_MS),{once:true});
    setInterval(()=>{if(document.visibilityState==='visible')scheduleBackgroundCheck(650);},CHECK_INTERVAL_MS);
  }

  window.TeamBullsUpdater=Object.freeze({
    version:CURRENT_VERSION,build:CURRENT_BUILD,check:checkForUpdates,
    manualCheck:()=>checkForUpdates({showErrors:true,announceCurrent:true}),
    prepareLatest,applyLatest:applyLatestUpdate,cancel:cancelActiveUpdate,
    loadTechniqueCompositionIntegrity,loadStudentHomeModules,
    criticalAssets:()=>CRITICAL_ASSETS.slice()
  });
  window.addEventListener('online',()=>{scheduleTechniqueComposition(250);scheduleStudentHome(320);scheduleBackgroundCheck(700);});
  window.addEventListener('team-bulls-runtime-ready',()=>{scheduleTechniqueComposition(0);scheduleStudentHome(40);});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){scheduleTechniqueComposition(50);scheduleStudentHome(80);scheduleBackgroundCheck(900);}});
  if('serviceWorker'in navigator)navigator.serviceWorker.addEventListener('message',event=>{if(event.data?.type==='TEAM_BULLS_SW_ACTIVATED'&&buildNumber(event.data?.build)>CURRENT_BUILD)scheduleBackgroundCheck(500);});
  window.addEventListener('pagehide',()=>{applySequence++;try{applyController?.abort?.();}catch(error){}applyController=null;applying=false;},{once:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
