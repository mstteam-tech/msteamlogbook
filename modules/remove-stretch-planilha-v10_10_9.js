/* Team Bulls v10.10.9 — remove a planilha visual de alongamentos do aplicativo. */
'use strict';
(()=>{
  if(window.__TEAM_BULLS_REMOVE_STRETCH_PLANILHA_V10109__)return;
  window.__TEAM_BULLS_REMOVE_STRETCH_PLANILHA_V10109__=true;

  const SELECTORS=[
    '#tb-stretch-viewer',
    '[data-tb-stretch-nav]',
    '[data-tb-stretch-home]'
  ];

  function removeStretchPlanilha(){
    SELECTORS.forEach(selector=>document.querySelectorAll(selector).forEach(node=>node.remove()));
    const staleStyle=document.getElementById('tb-remove-stretch-planilha-style');
    if(!staleStyle){
      const style=document.createElement('style');
      style.id='tb-remove-stretch-planilha-style';
      style.textContent='[data-tb-stretch-nav],[data-tb-stretch-home],#tb-stretch-viewer{display:none!important}';
      document.head.appendChild(style);
    }
    return false;
  }

  window.openStretchGuide=removeStretchPlanilha;
  window.closeStretchGuide=removeStretchPlanilha;

  const currentApi=window.TeamBullsStudentGuidance;
  if(currentApi&&typeof currentApi==='object'){
    const originalRefresh=typeof currentApi.refresh==='function'?currentApi.refresh.bind(currentApi):null;
    window.TeamBullsStudentGuidance=Object.freeze({
      ...currentApi,
      openStretchGuide:removeStretchPlanilha,
      refresh:(...args)=>{
        const result=originalRefresh?originalRefresh(...args):undefined;
        queueMicrotask(removeStretchPlanilha);
        return result;
      }
    });
  }

  const observer=new MutationObserver(()=>removeStretchPlanilha());
  const start=()=>{
    removeStretchPlanilha();
    if(document.body)observer.observe(document.body,{childList:true,subtree:true});
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
