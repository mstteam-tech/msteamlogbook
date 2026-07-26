/* Team Bulls v10.2.1 — métricas reais da viewport para iOS/Android. */
'use strict';
(()=>{
  const root=document.documentElement;
  let frame=0;
  const update=()=>{
    frame=0;
    const viewport=window.visualViewport;
    const height=Math.max(320,Math.round(viewport?.height||window.innerHeight||root.clientHeight||0));
    const width=Math.max(280,Math.round(viewport?.width||window.innerWidth||root.clientWidth||0));
    const offsetTop=Math.max(0,Math.round(viewport?.offsetTop||0));
    const offsetLeft=Math.max(0,Math.round(viewport?.offsetLeft||0));
    const keyboardInset=Math.max(0,Math.round((window.innerHeight||height)-height-offsetTop));
    root.style.setProperty('--app-height',height+'px');
    root.style.setProperty('--app-width',width+'px');
    root.style.setProperty('--viewport-offset-top',offsetTop+'px');
    root.style.setProperty('--viewport-offset-left',offsetLeft+'px');
    root.style.setProperty('--keyboard-inset',keyboardInset+'px');
    root.classList.toggle('virtual-keyboard-open',keyboardInset>100);
  };
  const schedule=()=>{if(frame)return;frame=requestAnimationFrame(update);};
  update();
  addEventListener('resize',schedule,{passive:true});
  addEventListener('orientationchange',()=>setTimeout(update,80),{passive:true});
  addEventListener('pageshow',schedule,{passive:true});
  if(window.visualViewport){
    visualViewport.addEventListener('resize',schedule,{passive:true});
    visualViewport.addEventListener('scroll',schedule,{passive:true});
  }
})();
