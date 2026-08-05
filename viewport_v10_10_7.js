/* Team Bulls v10.10.7 — viewport real e teclado virtual seguro em iOS/Android. */
'use strict';
(()=>{
  const root=document.documentElement;
  let frame=0;
  let stableHeight=0;
  let lastWidth=0;
  let focusTimer=0;

  function isEditable(element){
    if(!element||element.disabled||element.readOnly)return false;
    if(element.matches?.('textarea,[contenteditable="true"]'))return true;
    if(!element.matches?.('input'))return false;
    return !['button','checkbox','color','file','hidden','image','radio','range','reset','submit'].includes(String(element.type||'text').toLowerCase());
  }

  function viewportMetrics(){
    const viewport=window.visualViewport;
    const height=Math.max(280,Math.round(viewport?.height||window.innerHeight||root.clientHeight||0));
    const width=Math.max(260,Math.round(viewport?.width||window.innerWidth||root.clientWidth||0));
    const offsetTop=Math.max(0,Math.round(viewport?.offsetTop||0));
    const offsetLeft=Math.max(0,Math.round(viewport?.offsetLeft||0));
    return{viewport,height,width,offsetTop,offsetLeft};
  }

  function ensureFocusedFieldVisible(){
    clearTimeout(focusTimer);
    focusTimer=setTimeout(()=>{
      const field=document.activeElement;
      if(!isEditable(field))return;
      const modal=field.closest?.('.modal-backdrop.open');
      if(!modal)return;
      const scroller=field.closest?.('.modal-sheet,.modal-dialog');
      const {height,offsetTop}=viewportMetrics();
      const top=offsetTop+10;
      const bottom=offsetTop+height-14;
      const rect=field.getBoundingClientRect();
      if(scroller){
        if(rect.bottom>bottom)scroller.scrollTop+=rect.bottom-bottom+24;
        else if(rect.top<top)scroller.scrollTop-=top-rect.top+18;
      }
      requestAnimationFrame(()=>{
        const next=field.getBoundingClientRect();
        if(next.bottom>bottom||next.top<top)field.scrollIntoView?.({block:'center',inline:'nearest',behavior:'auto'});
      });
    },80);
  }

  function update(){
    frame=0;
    const {height,width,offsetTop,offsetLeft}=viewportMetrics();
    const activeEditable=isEditable(document.activeElement);

    if(lastWidth&&Math.abs(width-lastWidth)>80){stableHeight=0;}
    lastWidth=width;
    if(!activeEditable||height>stableHeight)stableHeight=Math.max(stableHeight,height);

    const layoutHeight=Math.max(height,Math.round(window.innerHeight||0),Math.round(root.clientHeight||0));
    const inferredInset=Math.max(0,stableHeight-height-offsetTop);
    const layoutInset=Math.max(0,layoutHeight-height-offsetTop);
    const keyboardInset=Math.max(inferredInset,layoutInset);
    const keyboardOpen=activeEditable&&keyboardInset>96;

    root.style.setProperty('--app-height',height+'px');
    root.style.setProperty('--app-width',width+'px');
    root.style.setProperty('--viewport-offset-top',offsetTop+'px');
    root.style.setProperty('--viewport-offset-left',offsetLeft+'px');
    root.style.setProperty('--keyboard-inset',keyboardInset+'px');
    root.classList.toggle('virtual-keyboard-open',keyboardOpen);
    if(keyboardOpen)ensureFocusedFieldVisible();
  }

  const schedule=()=>{if(!frame)frame=requestAnimationFrame(update);};
  const delayedUpdate=()=>{schedule();setTimeout(schedule,70);setTimeout(schedule,220);};

  update();
  addEventListener('resize',delayedUpdate,{passive:true});
  addEventListener('orientationchange',()=>{stableHeight=0;setTimeout(delayedUpdate,100);},{passive:true});
  addEventListener('pageshow',delayedUpdate,{passive:true});
  document.addEventListener('focusin',event=>{if(isEditable(event.target)){delayedUpdate();ensureFocusedFieldVisible();}},{passive:true});
  document.addEventListener('focusout',()=>setTimeout(delayedUpdate,90),{passive:true});
  if(window.visualViewport){
    visualViewport.addEventListener('resize',delayedUpdate,{passive:true});
    visualViewport.addEventListener('scroll',delayedUpdate,{passive:true});
  }
})();
