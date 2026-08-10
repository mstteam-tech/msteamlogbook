/* Configuração pública Team Bulls v10.10.7.
   A chave do App Check/reCAPTCHA Enterprise é pública por definição.
   Não coloque senhas, chaves privadas ou credenciais administrativas aqui. */
window.TEAM_BULLS_PUBLIC_CONFIG=Object.freeze({
  appCheckSiteKey: '6Lc3U28tAAAAAB6qyxP8GauRDCg-4ADiy8oYLKXL'
});

/* Extensões carregadas em ordem determinística depois que o núcleo estiver pronto.
   A rede é aquecida em paralelo por preload, mas a execução permanece serial para
   preservar as dependências entre os hotfixes. O guia visual continua sob demanda. */
(()=>{
  let requested=false;
  const modules=[
    './modules/stability_v10_10_9.js?v=10.10.9',
    './modules/app-update-v10_10_9.js?v=10.10.9',
    './modules/diet-scroll-fix-v10_10_9.js?v=10.10.9',
    './modules/modal-form-guard-v10_10_9.js?v=10.10.9',
    './modules/trainer-workspace-v10_10_9.js?v=10.10.9-workspace2',
    './modules/cardio-timer-fix-v10_10_9.js?v=10.10.9-cardio1',
    './modules/global-performance-v10_10_9.js?v=10.10.9-perf1',
    './modules/workout-ux-fix-v10_10_9.js?v=10.10.9-workout1',
    './modules/desktop-performance-v10_10_9.js?v=10.10.9-desktop1',
    './modules/ger-bulk-v10_10_9.js?v=10.10.9-ger1',
    './modules/prescription-actions-layout-v10_10_9.js?v=10.10.9-actions1'
  ];
  const preloadModules=()=>{
    modules.forEach(src=>{
      if(document.head.querySelector(`link[rel="preload"][as="script"][href="${src}"]`))return;
      const link=document.createElement('link');
      link.rel='preload';link.as='script';link.href=src;
      document.head.appendChild(link);
    });
  };
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
    preloadModules();
    for(const src of modules)await loadScript(src);
  };
  if(window.TeamBulls107)load();
  else window.addEventListener('team-bulls-v107-ready',load,{once:true});
})();
