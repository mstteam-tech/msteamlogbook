/* Team Bulls v10.10.9 — integridade do cadastro sem substituir o fluxo canônico. */
'use strict';
(()=>{
  if(window.__TEAM_BULLS_REGISTRATION_INTEGRITY_V10109_R2__)return;
  window.__TEAM_BULLS_REGISTRATION_INTEGRITY_V10109_R2__=true;

  const VERSION='10.10.9-registration2';

  /*
   * O fluxo de cadastro pertence exclusivamente a modules/v107-invites.js.
   * Esta camada é deliberadamente passiva: observa o fluxo canônico, expõe
   * diagnóstico e nunca substitui doRegister. A renovação da credencial pode
   * usar getIdToken(true) ou getIdTokenResult(true); a segunda forma também
   * permite usar o e-mail canônico presente nas claims das Rules.
   */
  function inspect(){
    const available=typeof doRegister==='function';
    const source=available?String(doRegister):'';
    const refreshedToken=source.includes('getIdToken(true)')||source.includes('getIdTokenResult(true)');
    const canonical=available
      && source.includes('suspendAuthListenerForRegistration')
      && refreshedToken
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
