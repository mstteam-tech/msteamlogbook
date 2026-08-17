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
    if(!document.getElementById('tb-remove-stretch-planilha-style')){
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

  /* O módulo de orientações já foi carregado antes deste hotfix. Portanto uma
     remoção inicial + o hook de refresh acima cobrem os únicos caminhos que
     recriam a planilha. Evitamos observar document.body permanentemente, pois
     isso fazia uma varredura global a cada mutação de DOM do aplicativo. */
  const start=()=>removeStretchPlanilha();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();