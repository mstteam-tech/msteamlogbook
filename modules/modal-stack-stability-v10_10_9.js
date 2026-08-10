/* Team Bulls v10.10.9 — estabilidade de pilha de modais e recuperação de backdrop órfão. */
'use strict';
(()=>{
  if(window.__TEAM_BULLS_MODAL_STACK_STABILITY_V10109__)return;
  window.__TEAM_BULLS_MODAL_STACK_STABILITY_V10109__=true;

  const MODAL_SELECTOR='.modal-backdrop';
  const PANEL_SELECTOR='.modal-sheet,.modal-dialog';
  const BASE_Z=100;
  let openSequence=0;
  let healthTimer=0;

  function openModals(){
    return [...document.querySelectorAll(MODAL_SELECTOR+'.open')];
  }
  function orderedOpenModals(){
    return openModals().sort((a,b)=>(Number(a.dataset.tbModalOpenSeq)||0)-(Number(b.dataset.tbModalOpenSeq)||0));
  }
  function actionInProgress(){
    try{return typeof ACTION_LOCKS!=='undefined'&&ACTION_LOCKS?.size>0;}
    catch(error){return false;}
  }
  function markOpened(modal){
    if(!(modal instanceof HTMLElement))return;
    modal.dataset.tbModalOpenSeq=String(++openSequence);
  }
  function visiblePanel(modal){
    const panel=modal?.querySelector?.(PANEL_SELECTOR);if(!panel)return false;
    const style=getComputedStyle(panel);
    if(style.display==='none'||style.visibility==='hidden'||Number(style.opacity)===0)return false;
    const rect=panel.getBoundingClientRect();
    const viewport=window.visualViewport;
    const width=Math.max(1,Number(viewport?.width||window.innerWidth||document.documentElement.clientWidth||1));
    const height=Math.max(1,Number(viewport?.height||window.innerHeight||document.documentElement.clientHeight||1));
    return rect.width>8&&rect.height>8&&rect.right>0&&rect.bottom>0&&rect.left<width&&rect.top<height;
  }
  function directClose(modal){
    if(!(modal instanceof HTMLElement))return;
    modal.classList.remove('open');
    modal.style.removeProperty('z-index');
    modal.style.removeProperty('pointer-events');
    delete modal.dataset.tbModalOpenSeq;
    delete modal.dataset.tbNestedConfirm;
  }
  function recoverOrphanedTop(){
    const modals=orderedOpenModals();if(!modals.length||actionInProgress())return false;
    const top=modals[modals.length-1];
    if(visiblePanel(top))return false;
    console.warn('[Team Bulls] Backdrop órfão recuperado:',top.id||'(sem id)');
    if(top.dataset.tbNestedConfirm==='1')directClose(top);
    else if(top.id&&typeof window.closeModal==='function'){
      try{window.closeModal(top.id);}catch(error){directClose(top);}
    }else directClose(top);
    try{if(typeof showToast==='function')showToast('A interface foi recuperada de um bloqueio de tela.',true);}catch(error){}
    return true;
  }
  function scheduleHealthCheck(){
    clearTimeout(healthTimer);
    if(!openModals().length)return;
    healthTimer=setTimeout(()=>{
      healthTimer=0;
      recoverOrphanedTop();
      syncLayers();
    },1800);
  }
  function syncLayers(){
    const modals=orderedOpenModals();
    modals.forEach((modal,index)=>{
      if(!modal.dataset.tbModalOpenSeq)markOpened(modal);
      modal.style.zIndex=String(BASE_Z+index*4);
      modal.style.pointerEvents=index===modals.length-1?'auto':'none';
    });
    document.querySelectorAll(MODAL_SELECTOR+':not(.open)').forEach(modal=>{
      modal.style.removeProperty('z-index');
      modal.style.removeProperty('pointer-events');
      delete modal.dataset.tbModalOpenSeq;
      delete modal.dataset.tbNestedConfirm;
    });
    scheduleHealthCheck();
  }
  function afterUiChange(){
    requestAnimationFrame(()=>{syncLayers();requestAnimationFrame(()=>{recoverOrphanedTop();syncLayers();});});
  }

  function wrapModalFunctions(){
    const baseOpen=window.openModal,baseClose=window.closeModal;
    if(typeof baseOpen==='function'&&!baseOpen.__tbModalStackStability){
      const wrappedOpen=function(id){
        const result=baseOpen.apply(this,arguments);
        const modal=document.getElementById(String(id||''));if(modal?.classList.contains('open'))markOpened(modal);
        afterUiChange();return result;
      };
      wrappedOpen.__tbModalStackStability=true;window.openModal=wrappedOpen;
    }
    if(typeof baseClose==='function'&&!baseClose.__tbModalStackStability){
      const wrappedClose=function(id){
        const result=baseClose.apply(this,arguments);afterUiChange();return result;
      };
      wrappedClose.__tbModalStackStability=true;window.closeModal=wrappedClose;
    }
  }

  function installNestedConfirmProtection(){
    const baseShowConfirm=window.showConfirm;
    if(typeof baseShowConfirm!=='function'||baseShowConfirm.__tbModalStackStability)return;
    const wrapped=function(title,text,cb){
      const confirmModal=document.getElementById('modal-confirm');
      const underlying=openModals().filter(modal=>modal!==confirmModal);
      if(!confirmModal||!underlying.length||confirmModal.classList.contains('open'))return baseShowConfirm.apply(this,arguments);

      const titleNode=document.getElementById('confirm-title'),textNode=document.getElementById('confirm-text'),button=document.getElementById('confirm-ok-btn');
      if(!titleNode||!textNode||!button)return baseShowConfirm.apply(this,arguments);
      titleNode.textContent=title;
      textNode.textContent=text;
      button.disabled=false;
      button.textContent='CONFIRMAR';
      button.onclick=async function(){
        if(button.disabled)return;
        button.disabled=true;button.textContent='PROCESSANDO...';
        try{
          const completed=await cb();
          if(completed!==false)directClose(confirmModal);
        }catch(error){
          console.error('confirm action',error);
          alert('Não foi possível concluir a ação: '+error.message);
        }finally{
          button.disabled=false;button.textContent='CONFIRMAR';
          afterUiChange();
        }
      };
      confirmModal.dataset.tbNestedConfirm='1';
      confirmModal.classList.add('open');
      markOpened(confirmModal);
      afterUiChange();
      requestAnimationFrame(()=>button.focus?.({preventScroll:true}));
    };
    wrapped.__tbModalStackStability=true;window.showConfirm=wrapped;
  }

  function install(){
    wrapModalFunctions();
    installNestedConfirmProtection();
    openModals().forEach(markOpened);
    syncLayers();
    window.addEventListener('pageshow',afterUiChange,{passive:true});
    window.addEventListener('resize',afterUiChange,{passive:true});
    window.visualViewport?.addEventListener('resize',afterUiChange,{passive:true});
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)afterUiChange();},{passive:true});
    window.TeamBullsModalStackStability=Object.freeze({version:'10.10.9-modal1',refresh:afterUiChange,recover:recoverOrphanedTop});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
