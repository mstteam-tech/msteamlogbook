import fs from 'node:fs';

const boot=fs.readFileSync('boot_v10.js','utf8');

const must=[
  '__TEAM_BULLS_BOOT_SAFETY_2__',
  'html.pull-refresh-running #app{pointer-events:auto!important}',
  'scanOrphanModals',
  'modalPanels(modal)',
  'next.misses>=2',
  'now-next.firstSeen>=700',
  'tb-auth-failopen',
  'activateAuth',
  'body.tb-auth-failopen .modal-backdrop.open',
  'body.tb-auth-failopen #portrait-lock-overlay',
  "document.querySelectorAll('.screen.active').forEach(screen=>screen.classList.remove('active'))",
  "auth.classList.add('active')",
  'restoring?3800:1800',
  '},8000)',
  'TeamBullsRuntimeStabilityBoot',
  'TeamBullsBootSafety'
];
for(const token of must){
  if(!boot.includes(token))throw new Error(`auth/runtime recovery missing: ${token}`);
}

const forbidden=[
  'const ESSENTIALS',
  'loadEssentialStudentRuntime',
  "script.dataset.tbRuntimeStable='1'",
  'studenthome2&fix=runtime-stable1',
  '10.10.17-home1&fix=runtime-stable1',
  '10.10.9-modal2&fix=runtime-stable1',
  '10.10.9-usability2&fix=runtime-stable1'
];
for(const token of forbidden){
  if(boot.includes(token))throw new Error(`boot voltou a carregar UI antes da autenticação: ${token}`);
}

if(boot.includes("root.classList.remove('modal-open','no-scroll','scroll-locked")){
  throw new Error('limpeza global indiscriminada de estado de modal retornou');
}
if(!boot.includes("document.querySelectorAll('.modal-backdrop.open').forEach(modal=>directCloseOrphan(modal,'auth'))")){
  throw new Error('auth fail-open precisa remover somente backdrops residuais da tela de acesso');
}
if(!boot.includes("observer.observe(auth,{attributes:true,attributeFilter:['class']})")){
  throw new Error('auth precisa ser monitorado de forma localizada, sem observer global do documento');
}
if(boot.includes("observer.observe(document.body,{subtree:true")){
  throw new Error('boot não deve observar a árvore inteira do body');
}

console.log('runtime/auth stabilization check: ok');
