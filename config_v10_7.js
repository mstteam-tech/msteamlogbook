/* Configuração pública Team Bulls v10.10.7.
   A chave do App Check/reCAPTCHA Enterprise é pública por definição.
   Não coloque senhas, chaves privadas ou credenciais administrativas aqui. */
window.TEAM_BULLS_PUBLIC_CONFIG=Object.freeze({
  appCheckSiteKey: '6Lc3U28tAAAAAB6qyxP8GauRDCg-4ADiy8oYLKXL'
});

/* Extensões carregadas em ordem determinística depois que o núcleo estiver pronto.
   O guia visual é carregado sob demanda para não disputar rede com login/Firebase. */
(()=>{
  let requested=false;
  const modules=[
    './modules/stability_v10_10_9.js?v=10.10.9',
    './modules/app-update-v10_10_9.js?v=10.10.9',
    './modules/diet-scroll-fix-v10_10_9.js?v=10.10.9',
    './modules/modal-form-guard-v10_10_9.js?v=10.10.9',
    './modules/trainer-workspace-v10_10_9.js?v=10.10.9'
  ];
  const loadScript=src=>new Promise(resolve=>{
    const script=document.createElement('script');
    script.src=src;
    script.async=false;
    script.onload=()=>resolve(true);
    script.onerror=()=>{console.warn('[Team Bulls] Extensão opcional indisponível:',src);resolve(false);};
    document.head.appendChild(script);
  });
  const load=async()=>{
    if(requested)return;
    requested=true;
    for(const src of modules)await loadScript(src);
  };
  if(window.TeamBulls107)load();
  else window.addEventListener('team-bulls-v107-ready',load,{once:true});
})();
