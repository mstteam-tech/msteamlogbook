/* Team Bulls v10.10.24 — nomenclatura compartilhada da tela de opções de suprimentos. */
'use strict';
(()=>{
  if(window.__TEAM_BULLS_SUPPLY_OPTIONS_LABEL_101024__)return;
  window.__TEAM_BULLS_SUPPLY_OPTIONS_LABEL_101024__=true;

  const VERSION='10.10.24-supplylabel1';

  function patchTitle(){
    const title=document.querySelector('#screen-food-options .options-intro-title');
    if(!title)return false;
    if(String(title.textContent||'').trim()==='Opções de suprimentos')return true;
    title.textContent='Opções de suprimentos';
    return true;
  }

  function installRenderPatch(){
    if(typeof renderFoodOptions!=='function')return false;
    if(renderFoodOptions.__tbSupplyOptionsLabel)return true;
    const base=renderFoodOptions;
    const wrapped=function(...args){
      const result=base.apply(this,args);
      patchTitle();
      return result;
    };
    wrapped.__tbSupplyOptionsLabel=true;
    renderFoodOptions=wrapped;
    patchTitle();
    return true;
  }

  function sync(){installRenderPatch();patchTitle();}

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',sync,{once:true});else sync();
  window.addEventListener('team-bulls-runtime-ready',sync);
  window.addEventListener('team-bulls-student-runtime-ready',sync);
  window.addEventListener('pageshow',sync,{passive:true});

  window.TeamBullsSupplyOptionsLabel=Object.freeze({version:VERSION,patch:patchTitle,sync});
})();
