/* Configuração pública Team Bulls v10.10.7.
   A chave do App Check/reCAPTCHA Enterprise é pública por definição.
   Não coloque senhas, chaves privadas ou credenciais administrativas aqui. */
window.TEAM_BULLS_PUBLIC_CONFIG=Object.freeze({
  appCheckSiteKey: '6Lc3U28tAAAAAB6qyxP8GauRDCg-4ADiy8oYLKXL'
});

/* Carrega correções compatíveis somente depois que o núcleo v10.7 estiver pronto.
   Falha silenciosa para não impedir o uso do aplicativo em redes instáveis. */
(()=>{
  let requested=false;
  const load=()=>{
    if(requested||window.TeamBulls107?.__stabilityPatchV10109)return;
    requested=true;
    const script=document.createElement('script');
    script.src='./modules/stability_v10_10_9.js?v=10.10.9';
    script.defer=true;
    script.onerror=()=>{requested=false;};
    document.head.appendChild(script);
  };
  if(window.TeamBulls107)load();
  else window.addEventListener('team-bulls-v107-ready',load,{once:true});
})();
