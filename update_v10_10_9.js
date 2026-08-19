/* Team Bulls v10.10.9 — atualizador da PWA sem desinstalação. */
'use strict';
(()=>{
  const CURRENT_VERSION='10.10.9';
  const CHECK_INTERVAL_MS=20*60*1000;
  const VERSION_URL='./version.json';
  const UPDATE_RELOAD_KEY='team-bulls-update-reload-version';
  const UPDATE_FLUSH_BUDGET_MS=700;
  const UPDATE_WORKER_WAIT_MS=900;
  const UPDATE_CONTROLLER_WAIT_MS=2200;
  const BACKGROUND_CHECK_DELAY_MS=3200;
  const CRITICAL_REFRESH_CONCURRENCY=4;
  const CRITICAL_ASSETS=[
    './index.html',
    './manifest.json?v=10.10.9',
    './version.json',
    './viewport_v10_10_9.js?v=10.10.9',
    './boot_v10.js?v=10.10.9',
    './config_v10_7.js?v=10.10.9',
    './update_v10_10_9.js?v=10.10.9',
    './app_v10_10_9_core.js?v=10.10.9',
    './modules/v107-core.js?v=10.10.9',
    './modules/v107-invites.js?v=10.10.9',
    './modules/v107-operations.js?v=10.10.9',
    './interaction_v10_10_9.js?v=10.10.9',
    './styles_v10_10_9.css?v=10.10.9'
  ];
  let registration=null;
  let latestInfo=null;
  let checking=null;
  let applying=false;
  let banner=null;
  let scheduledCheckTimer=null;

  function numericParts(value){
    return String(value||'').split('.').map(part=>Number.parseInt(part,10)||0);
  }
  function compareVersions(left,right){
    const a=numericParts(left),b=numericParts(right),size=Math.max(a.length,b.length);
    for(let i=0;i<size;i++){
      const diff=(a[i]||0)-(b[i]||0);
      if(diff)return diff>0?1:-1;
    }
    return 0;
  }
  function isOnline(){return navigator.onLine!==false;}
  function sleep(ms){return new Promise(resolve=>setTimeout(resolve,ms));}
  function waitForState(worker,desired,timeout=7000){
    if(!worker)return Promise.resolve(false);
    if(worker.state===desired)return Promise.resolve(true);
    return new Promise(resolve=>{
      let done=false;
      const finish=value=>{
        if(done)return;
        done=true;
        clearTimeout(timer);
        worker.removeEventListener('statechange',onState);
        resolve(value);
      };
      const onState=()=>{
        if(worker.state===desired)finish(true);
        else if(worker.state==='redundant')finish(false);
      };
      const timer=setTimeout(()=>finish(false),timeout);
      worker.addEventListener('statechange',onState);
    });
  }
  function waitForControllerChange(timeout=UPDATE_CONTROLLER_WAIT_MS){
    return new Promise(resolve=>{
      let done=false;
      const finish=value=>{
        if(done)return;
        done=true;
        clearTimeout(timer);
        navigator.serviceWorker.removeEventListener('controllerchange',changed);
        resolve(value);
      };
      const changed=()=>finish(true);
      const timer=setTimeout(()=>finish(false),timeout);
      navigator.serviceWorker.addEventListener('controllerchange',changed,{once:true});
    });
  }
  function ensureBanner(){
    if(banner?.isConnected)return banner;
    const host=document.createElement('aside');
    host.id='team-bulls-update-banner';
    host.className='team-bulls-update-banner';
    host.hidden=true;
    host.setAttribute('role','status');
    host.setAttribute('aria-live','polite');
    host.innerHTML=`
      <div class="team-bulls-update-copy">
        <strong id="team-bulls-update-title">ATUALIZAÇÃO DISPONÍVEL</strong>
        <span id="team-bulls-update-text">Uma versão nova está pronta. Não é necessário desinstalar o aplicativo.</span>
      </div>
      <div class="team-bulls-update-actions">
        <button type="button" class="team-bulls-update-primary" id="team-bulls-update-now">ATUALIZAR AGORA</button>
        <button type="button" class="team-bulls-update-later" id="team-bulls-update-later">DEPOIS</button>
      </div>`;
    document.body.appendChild(host);
    host.querySelector('#team-bulls-update-now')?.addEventListener('click',()=>applyLatestUpdate());
    host.querySelector('#team-bulls-update-later')?.addEventListener('click',()=>{host.hidden=true;});
    banner=host;
    return host;
  }
  function setBannerState({title,text,busy=false,error=false,visible=true}={}){
    const host=ensureBanner();
    const titleEl=host.querySelector('#team-bulls-update-title');
    const textEl=host.querySelector('#team-bulls-update-text');
    const updateButton=host.querySelector('#team-bulls-update-now');
    const laterButton=host.querySelector('#team-bulls-update-later');
    if(title)titleEl.textContent=title;
    if(text)textEl.textContent=text;
    host.dataset.state=error?'error':busy?'busy':'ready';
    host.hidden=!visible;
    if(updateButton){updateButton.disabled=busy;updateButton.textContent=busy?'ATUALIZANDO...':'ATUALIZAR AGORA';}
    if(laterButton)laterButton.disabled=busy;
  }
  async function fetchLatestVersion(){
    const response=await fetch(`${VERSION_URL}?t=${Date.now()}`,{
      cache:'no-store',
      headers:{'Cache-Control':'no-cache','Pragma':'no-cache'}
    });
    if(!response.ok)throw new Error(`Não foi possível verificar a versão (${response.status}).`);
    const data=await response.json();
    if(!/^\d+\.\d+\.\d+$/.test(String(data?.version||'')))throw new Error('Resposta de versão inválida.');
    return data;
  }
  async function registerWorker(){
    if(!('serviceWorker' in navigator))return null;
    if(registration)return registration;
    registration=await navigator.serviceWorker.register(`./sw.js?v=${encodeURIComponent(CURRENT_VERSION)}`,{
      scope:'./',
      updateViaCache:'none'
    });
    return registration;
  }
  async function requestShellRefresh(worker){
    if(!worker)return false;
    return new Promise(resolve=>{
      let done=false;
      const finish=value=>{
        if(done)return;
        done=true;
        clearTimeout(timer);
        navigator.serviceWorker.removeEventListener('message',onMessage);
        resolve(value);
      };
      const onMessage=event=>{
        if(event.data?.type==='TEAM_BULLS_REFRESHED')finish(event.data.ok!==false);
      };
      const timer=setTimeout(()=>finish(false),8000);
      navigator.serviceWorker.addEventListener('message',onMessage);
      worker.postMessage({type:'REFRESH_APP_SHELL'});
    });
  }
  async function mapWithLimit(items,limit,worker){
    const results=new Array(items.length);let next=0;
    const run=async()=>{
      while(true){
        const index=next++;if(index>=items.length)return;
        results[index]=await worker(items[index],index);
      }
    };
    await Promise.all(Array.from({length:Math.min(limit,items.length)},run));
    return results;
  }
  async function refreshCriticalShell(){
    if(!('caches' in window)||!isOnline())return false;
    const cacheNames=(await caches.keys()).filter(name=>name.startsWith('team-bulls-shell-'));
    if(!cacheNames.length)return false;
    const stamp=String(Date.now());
    const fetched=await mapWithLimit(CRITICAL_ASSETS,CRITICAL_REFRESH_CONCURRENCY,async asset=>{
      const original=new URL(asset,location.href);
      const fresh=new URL(original.href);fresh.searchParams.set('tb-refresh',stamp);
      const response=await fetch(fresh.href,{cache:'reload'});
      if(!response.ok)throw new Error(`Falha ao renovar ${original.pathname} (${response.status}).`);
      return{original:original.href,fresh:fresh.href,response};
    });
    for(const cacheName of cacheNames){
      const cache=await caches.open(cacheName);
      for(const item of fetched){
        await cache.put(item.original,item.response.clone());
        await cache.delete(item.fresh).catch(()=>false);
      }
    }
    return true;
  }
  async function prepareLatest({forceCheck=true}={}){
    if(!('serviceWorker' in navigator))return {version:CURRENT_VERSION,reloadNeeded:false};
    const info=forceCheck?await fetchLatestVersion().catch(()=>latestInfo):latestInfo;
    if(info)latestInfo=info;
    const target=latestInfo?.version||CURRENT_VERSION;
    const reg=await registerWorker();
    const workerUpdate=reg.update().catch(()=>null);
    let warmed=false;
    try{warmed=await refreshCriticalShell();}catch(error){console.warn('[Team Bulls] Renovação crítica incompleta:',error);}
    await Promise.race([workerUpdate,sleep(UPDATE_WORKER_WAIT_MS)]);
    let controllerChanged=false;
    if(reg.waiting){
      const change=waitForControllerChange();
      reg.waiting.postMessage({type:'SKIP_WAITING'});
      controllerChanged=await change;
    }else if(reg.installing){
      // O worker termina a instalação em segundo plano; a atualização da tela não
      // precisa aguardar todo o shell, pois os arquivos críticos já foram renovados.
      waitForState(reg.installing,'installed').catch(()=>false);
    }
    if(!warmed){
      const active=reg.active||navigator.serviceWorker.controller;
      warmed=await requestShellRefresh(active).catch(()=>false);
    }
    if(!warmed)throw new Error('Não foi possível preparar os arquivos principais da atualização.');
    return {version:target,reloadNeeded:compareVersions(target,CURRENT_VERSION)>0||controllerChanged||warmed};
  }
  async function flushBeforeReload(){
    try{window.dispatchEvent(new CustomEvent('team-bulls:before-refresh'));}catch(error){}
    const TB=window.TeamBulls107;
    const pending=Promise.allSettled([
      Promise.resolve(TB?.flushDrafts?.()),
      Promise.resolve(TB?.flushPendingMutationSync?.()),
      Promise.resolve(window.TeamBullsSessionPerformance?.flush?.())
    ]);
    await Promise.race([pending,sleep(UPDATE_FLUSH_BUDGET_MS)]);
  }
  async function applyLatestUpdate(){
    if(applying)return;
    applying=true;
    setBannerState({title:'PREPARANDO ATUALIZAÇÃO',text:'Salvando o que está pendente e renovando os arquivos principais...',busy:true});
    try{
      if(!isOnline())throw new Error('Conecte o celular à internet para atualizar.');
      await flushBeforeReload();
      const prepared=await prepareLatest({forceCheck:true});
      const target=prepared.version||latestInfo?.version||CURRENT_VERSION;
      sessionStorage.setItem(UPDATE_RELOAD_KEY,target);
      setBannerState({title:'ATUALIZAÇÃO PRONTA',text:'Reabrindo o Team Bulls...',busy:true});
      await sleep(60);
      location.replace(`./index.html?updated=${encodeURIComponent(target)}&t=${Date.now()}`);
    }catch(error){
      console.error('[Team Bulls] Falha ao atualizar:',error);
      applying=false;
      setBannerState({title:'NÃO FOI POSSÍVEL ATUALIZAR',text:error?.message||'Tente novamente quando a conexão estiver estável.',error:true});
    }
  }
  async function checkForUpdates({showErrors=false,announceCurrent=false}={}){
    if(checking)return checking;
    checking=(async()=>{
      if(!isOnline())return null;
      try{
        const info=await fetchLatestVersion();
        latestInfo=info;
        await registerWorker().then(reg=>reg?.update?.()).catch(()=>{});
        if(compareVersions(info.version,CURRENT_VERSION)>0){
          setBannerState({
            title:`NOVA VERSÃO ${info.version}`,
            text:'Atualize com um toque. O aplicativo instalado, seu login e seus dados serão preservados.'
          });
        }else if(announceCurrent){
          setBannerState({
            title:'APLICATIVO ATUALIZADO',
            text:`Você já está usando a versão mais recente (${CURRENT_VERSION}).`
          });
          setTimeout(()=>{if(banner)banner.hidden=true;},4200);
        }
        return info;
      }catch(error){
        if(showErrors)setBannerState({title:'VERIFICAÇÃO INDISPONÍVEL',text:'Não foi possível consultar uma atualização agora.',error:true});
        return null;
      }finally{checking=null;}
    })();
    return checking;
  }
  function scheduleBackgroundCheck(delay=BACKGROUND_CHECK_DELAY_MS){
    clearTimeout(scheduledCheckTimer);
    scheduledCheckTimer=setTimeout(()=>{
      const run=()=>checkForUpdates().catch(()=>null);
      if('requestIdleCallback' in window)requestIdleCallback(run,{timeout:1800});else run();
    },Math.max(250,delay));
  }
  function announceCompletedUpdate(){
    const params=new URLSearchParams(location.search);
    const updated=params.get('updated');
    const stored=sessionStorage.getItem(UPDATE_RELOAD_KEY);
    if(updated&&updated===CURRENT_VERSION){
      sessionStorage.removeItem(UPDATE_RELOAD_KEY);
      setBannerState({title:'APLICATIVO ATUALIZADO',text:`Team Bulls ${CURRENT_VERSION} pronto. Não foi necessário reinstalar.`,visible:true});
      const later=ensureBanner().querySelector('#team-bulls-update-later');
      if(later)later.textContent='FECHAR';
      setTimeout(()=>{if(banner)banner.hidden=true;},5000);
      params.delete('updated');params.delete('t');
      const query=params.toString();
      history.replaceState(history.state,'',`${location.pathname}${query?'?'+query:''}${location.hash}`);
    }else if(stored===CURRENT_VERSION){
      sessionStorage.removeItem(UPDATE_RELOAD_KEY);
    }
  }
  function init(){
    ensureBanner();
    announceCompletedUpdate();
    if(!('serviceWorker' in navigator))return;
    // Registro/verificação do worker não disputa rede com Firebase durante o boot.
    if(document.readyState==='complete')scheduleBackgroundCheck();
    else window.addEventListener('load',()=>scheduleBackgroundCheck(1800),{once:true});
    setInterval(()=>{if(document.visibilityState==='visible')scheduleBackgroundCheck(500);},CHECK_INTERVAL_MS);
  }

  window.TeamBullsUpdater=Object.freeze({
    version:CURRENT_VERSION,
    check:checkForUpdates,
    manualCheck:()=>checkForUpdates({showErrors:true,announceCurrent:true}),
    prepareLatest,
    applyLatest:applyLatestUpdate
  });
  window.addEventListener('online',()=>scheduleBackgroundCheck(700));
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')scheduleBackgroundCheck(1000);});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
