import fs from 'node:fs';

const boot=fs.readFileSync('boot_v10.js','utf8');

const must=[
  '__TEAM_BULLS_RUNTIME_STABILITY_BOOT_1__',
  'html.pull-refresh-running #app{pointer-events:auto!important}',
  'scanOrphanModals',
  'modalPanels(modal)',
  'now-next.firstSeen>=700',
  "team-bulls-v107-ready",
  'studenthome2&fix=runtime-stable1',
  '10.10.17-home1&fix=runtime-stable1',
  '10.10.9-modal2&fix=runtime-stable1',
  '10.10.9-usability2&fix=runtime-stable1',
  'TeamBullsRuntimeStabilityBoot'
];
for(const token of must){
  if(!boot.includes(token))throw new Error(`runtime stabilization missing: ${token}`);
}

if(!boot.includes("if(!openModal){"))throw new Error('modal/body lock release must be conditional on no visible modal');
if(boot.includes("root.classList.remove('modal-open','no-scroll','scroll-locked','update-blocked','app-update-blocked')")){
  throw new Error('legacy broad modal-state cleanup returned');
}
if(!boot.includes("script.dataset.tbRuntimeStable='1'"))throw new Error('essential runtime scripts are not tagged');
if(!boot.includes('diagnostic'))throw new Error('interaction diagnostic API missing');
if(!boot.includes('next.misses>=2'))throw new Error('orphan backdrop recovery must require repeated confirmation');

console.log('runtime stabilization check: ok');
