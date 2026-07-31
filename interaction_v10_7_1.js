/* Team Bulls v10.7.1 — rolagem natural e proteção de orientação. */
'use strict';
(()=>{
  const APP_SELECTOR='#app';
  const MOBILE_MEDIA='(max-width: 899px), (pointer: coarse)';
  let portraitRetryAt=0;

  function appScroller(){return document.querySelector(APP_SELECTOR);}
  function isMobileLike(){return window.matchMedia?.(MOBILE_MEDIA)?.matches??window.innerWidth<900;}
  function isLandscape(){return window.innerWidth>window.innerHeight;}

  function syncOrientationState(){
    const landscape=isMobileLike()&&isLandscape();
    document.documentElement.classList.toggle('mobile-landscape-blocked',landscape);
    const overlay=document.getElementById('portrait-lock-overlay');
    if(overlay){
      overlay.setAttribute('aria-hidden',landscape?'false':'true');
      if(landscape)overlay.removeAttribute('inert');else overlay.setAttribute('inert','');
    }
  }

  async function requestPortraitLock(force=false){
    if(!isMobileLike())return false;
    const now=Date.now();if(!force&&now-portraitRetryAt<1500)return false;portraitRetryAt=now;
    const orientation=window.screen?.orientation;
    if(!orientation||typeof orientation.lock!=='function')return false;
    const standalone=window.matchMedia?.('(display-mode: standalone)')?.matches||navigator.standalone===true||document.fullscreenElement;
    if(!standalone&&!force)return false;
    try{await orientation.lock('portrait-primary');return true;}
    catch(primaryError){
      try{await orientation.lock('portrait');return true;}catch(error){return false;}
    }
  }

  function nearestVerticalScroller(target,limit){
    let node=target instanceof Element?target:null;
    while(node&&node!==document.body&&node!==document.documentElement){
      if(node===limit)return limit;
      const style=getComputedStyle(node),overflow=style.overflowY;
      if((overflow==='auto'||overflow==='scroll'||overflow==='overlay')&&node.scrollHeight>node.clientHeight+1)return node;
      node=node.parentElement;
    }
    return limit;
  }
  function canScrollInDirection(element,delta){
    if(!element||Math.abs(delta)<.5)return false;
    if(delta<0)return element.scrollTop>0;
    return element.scrollTop+element.clientHeight<element.scrollHeight-1;
  }
  function wheelPixels(event,scroller){
    if(event.deltaMode===1)return event.deltaY*18;
    if(event.deltaMode===2)return event.deltaY*Math.max(320,scroller?.clientHeight||window.innerHeight);
    return event.deltaY;
  }

  function bindDesktopWheel(){
    document.addEventListener('wheel',event=>{
      if(window.innerWidth<900||event.defaultPrevented||event.ctrlKey||event.metaKey||event.shiftKey)return;
      if(Math.abs(event.deltaX)>Math.abs(event.deltaY))return;
      const scroller=appScroller();if(!scroller||scroller.scrollHeight<=scroller.clientHeight+1)return;
      const delta=wheelPixels(event,scroller);if(Math.abs(delta)<.5)return;
      const modal=event.target instanceof Element?event.target.closest('.modal-backdrop.open'):null;
      if(modal){
        const modalScroller=nearestVerticalScroller(event.target,modal);
        event.preventDefault();
        if(modalScroller!==modal&&canScrollInDirection(modalScroller,delta))modalScroller.scrollTop+=delta;
        return;
      }
      const nested=nearestVerticalScroller(event.target,scroller);
      event.preventDefault();
      if(nested!==scroller&&canScrollInDirection(nested,delta)){nested.scrollTop+=delta;return;}
      scroller.scrollTop+=delta;
    },{capture:true,passive:false});
  }

  function bindScreenReset(){
    const base=window.showScreen;
    if(typeof base==='function'&&!base.__v1071ScrollWrapped){
      const wrapped=function(){
        const result=base.apply(this,arguments);
        if(result!==false){requestAnimationFrame(()=>{const scroller=appScroller();if(scroller)scroller.scrollTop=0;});}
        return result;
      };
      wrapped.__v1071ScrollWrapped=true;window.showScreen=wrapped;
    }
  }

  function cancelInterruptedDrag(){
    const reset=()=>{
      if(!document.body.classList.contains('reorder-active'))return;
      document.body.classList.remove('reorder-active');
      document.querySelectorAll('.reorderable-card.is-dragging').forEach(card=>card.classList.remove('is-dragging'));
    };
    window.addEventListener('blur',reset,{passive:true});
    document.addEventListener('visibilitychange',()=>{if(document.hidden)reset();},{passive:true});
  }

  function boot(){
    bindDesktopWheel();bindScreenReset();cancelInterruptedDrag();syncOrientationState();
    requestPortraitLock(false);
    window.addEventListener('resize',()=>{syncOrientationState();requestPortraitLock(false);},{passive:true});
    window.addEventListener('orientationchange',()=>{syncOrientationState();setTimeout(()=>requestPortraitLock(true),80);},{passive:true});
    window.addEventListener('pageshow',()=>{syncOrientationState();requestPortraitLock(false);},{passive:true});
    document.addEventListener('visibilitychange',()=>{if(!document.hidden){syncOrientationState();requestPortraitLock(false);}},{passive:true});
    document.addEventListener('pointerdown',()=>requestPortraitLock(false),{capture:true,passive:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
