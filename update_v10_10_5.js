/* Team Bulls v10.10.5 — atualizador da PWA sem desinstalação. */
'use strict';
(()=>{
  const CURRENT_VERSION='10.10.5';
  const CHECK_INTERVAL_MS=10*60*1000;
  const VERSION_URL='./version.json';
  const UPDATE_RELOAD_KEY='team-bulls-update-reload-version';
  let registration=null;
  let latestInfo=null;
  let checking=null;
  let applying=false;
  let banner=null;

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
  function waitForState(worker,desired,timeout=12000){
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
  function waitForControllerChange(timeout=8000){
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
      const timer=setTimeout(()=>finish(false),15000);
      navigator.serviceWorker.addEventListener('message',onMessage);
      worker.postMessage({type:'REFRESH_APP_SHELL'});
    });
  }
  async function prepareLatest({forceCheck=true}={}){
    if(!('serviceWorker' in navigator))return {version:CURRENT_VERSION,reloadNeeded:false};
    const info=forceCheck?await fetchLatestVersion().catch(()=>latestInfo):latestInfo;
    if(info)latestInfo=info;
    const target=latestInfo?.version||CURRENT_VERSION;
    const reg=await registerWorker();
    await reg.update().catch(()=>{});
    if(reg.installing)await waitForState(reg.installing,'installed');
    const waiting=reg.waiting;
    let controllerChanged=false;
    if(waiting){
      const change=waitForControllerChange();
      waiting.postMessage({type:'SKIP_WAITING'});
      controllerChanged=await change;
    }
    const active=reg.active||navigator.serviceWorker.controller;
    await requestShellRefresh(active).catch(()=>false);
    // Garante que a navegação seguinte consulte o GitHub Pages, sem apagar
    // Firebase Auth, IndexedDB, localStorage, fotos ou registros offline.
    await fetch(`./index.html?tb-update=${encodeURIComponent(target)}&t=${Date.now()}`,{cache:'reload'}).catch(()=>null);
    return {version:target,reloadNeeded:compareVersions(target,CURRENT_VERSION)>0||controllerChanged};
  }
  async function flushBeforeReload(){
    try{window.dispatchEvent(new CustomEvent('team-bulls:before-refresh'));}catch(error){}
    const TB=window.TeamBulls107;
    await Promise.allSettled([
      Promise.resolve(TB?.flushDrafts?.()),
      Promise.race([
        Promise.resolve(TB?.flushPendingMutationSync?.()),
        sleep(2500)
      ])
    ]);
  }
  async function applyLatestUpdate(){
    if(applying)return;
    applying=true;
    setBannerState({title:'PREPARANDO ATUALIZAÇÃO',text:'Salvando rascunhos e renovando os arquivos do aplicativo...',busy:true});
    try{
      if(!isOnline())throw new Error('Conecte o celular à internet para atualizar.');
      await flushBeforeReload();
      const prepared=await prepareLatest({forceCheck:true});
      const target=prepared.version||latestInfo?.version||CURRENT_VERSION;
      sessionStorage.setItem(UPDATE_RELOAD_KEY,target);
      setBannerState({title:'ATUALIZAÇÃO PRONTA',text:'Reabrindo o Team Bulls com os arquivos novos...',busy:true});
      await sleep(250);
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
  async function init(){
    ensureBanner();
    announceCompletedUpdate();
    if(!('serviceWorker' in navigator))return;
    try{
      await registerWorker();
      await registration.update().catch(()=>{});
    }catch(error){console.warn('[Team Bulls] Service Worker indisponível:',error);}
    setTimeout(()=>checkForUpdates(),1800);
    setInterval(()=>{if(document.visibilityState==='visible')checkForUpdates();},CHECK_INTERVAL_MS);
  }

  window.TeamBullsUpdater=Object.freeze({
    version:CURRENT_VERSION,
    check:checkForUpdates,
    manualCheck:()=>checkForUpdates({showErrors:true,announceCurrent:true}),
    prepareLatest,
    applyLatest:applyLatestUpdate
  });
  window.addEventListener('online',()=>checkForUpdates());
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')checkForUpdates();});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
