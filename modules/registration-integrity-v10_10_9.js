/* Team Bulls v10.10.9 — integridade do cadastro sem substituir o fluxo canônico. */
'use strict';
(()=>{
  if(window.__TEAM_BULLS_REGISTRATION_INTEGRITY_V10109_R2__)return;
  window.__TEAM_BULLS_REGISTRATION_INTEGRITY_V10109_R2__=true;

  const VERSION='10.10.9-registration2';

  /*
   * O fluxo de cadastro pertence exclusivamente a modules/v107-invites.js.
   * Esta camada existia para proteger commits incertos, mas a revisão anterior
   * reinstalava uma cópia própria de doRegister depois do carregamento inicial.
   * Isso desfazia a correção que pausa o listener de autenticação durante a
   * criação de /users/{uid} + consumo do convite e reabria a corrida que podia
   * causar `Missing or insufficient permissions` em aparelhos onde este módulo
   * terminava de carregar antes de o usuário tocar em "Criar novo registro".
   *
   * A partir de registration2 esta extensão é deliberadamente passiva: ela
   * observa o fluxo canônico, expõe diagnóstico e nunca substitui doRegister.
   */
  function inspect(){
    const available=typeof doRegister==='function';
    const source=available?String(doRegister):'';
    const canonical=available
      && source.includes('suspendAuthListenerForRegistration')
      && source.includes('getIdToken(true)')
      && source.includes('db.runTransaction');
    const state=Object.freeze({version:VERSION,available,canonical});
    window.TeamBullsRegistrationIntegrity=state;
    if(available&&!canonical){
      console.warn('[Team Bulls] Fluxo canônico de cadastro ainda não foi confirmado; aguardando atualização dos arquivos principais.');
    }
    return canonical;
  }

  inspect();
  window.addEventListener('team-bulls-runtime-ready',inspect,{once:true});
  window.addEventListener('pageshow',inspect,{once:true});
})();
