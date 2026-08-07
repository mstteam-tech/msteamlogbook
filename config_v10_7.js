/* Configuração pública Team Bulls v10.10.7.
   A chave do App Check/reCAPTCHA Enterprise é pública por definição.
   Não coloque senhas, chaves privadas ou credenciais administrativas aqui. */
window.TEAM_BULLS_PUBLIC_CONFIG=Object.freeze({
  appCheckSiteKey: '6Lc3U28tAAAAAB6qyxP8GauRDCg-4ADiy8oYLKXL'
});

/* Carrega extensões compatíveis somente depois que o núcleo v10.7 estiver pronto.
   Falha de uma extensão não impede o carregamento das demais. */
(()=>{
  let requested=false;
  const load=()=>{
    if(requested)return;
    requested=true;
    [
      './modules/stability_v10_10_9.js?v=10.10.9',
      './modules/photo-guide-v10_10_9.js?v=10.10.9'
    ].forEach(src=>{
      const script=document.createElement('script');
      script.src=src;
      script.defer=true;
      script.onerror=()=>console.warn('[Team Bulls] Extensão opcional indisponível:',src);
      document.head.appendChild(script);
    });
  };
  if(window.TeamBulls107)load();
  else window.addEventListener('team-bulls-v107-ready',load,{once:true});
})();
