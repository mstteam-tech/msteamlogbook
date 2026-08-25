import fs from 'node:fs';
import {spawnSync} from 'node:child_process';

const fail=[];
const read=path=>fs.readFileSync(path,'utf8');
const assert=(ok,message)=>{if(!ok)fail.push(message);};
const has=(text,needle,message)=>assert(text.includes(needle),message);
const lacks=(text,needle,message)=>assert(!text.includes(needle),message);

const files=['boot_v10.js','config_v10_7.js','update_v10_10_9.js','sw.js','sw_47.js'];
for(const file of files){
  const syntax=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});
  assert(syntax.status===0,`${file} possui JavaScript inválido: ${String(syntax.stderr||'').trim()}`);
}

const boot=read('boot_v10.js');
const config=read('config_v10_7.js');
const updater=read('update_v10_10_9.js');
const sw=read('sw.js');
const bridge=read('sw_47.js');
const version=JSON.parse(read('version.json'));
const updaterBuild=Number(updater.match(/const CURRENT_BUILD=(\d+)/)?.[1]||0);
const workerBuild=Number(sw.match(/const BUILD_REVISION=(\d+)/)?.[1]||0);
const bridgeBuild=Number(bridge.match(/const BUILD_REVISION=(\d+)/)?.[1]||0);

assert(version.version==='10.10.9','version.json alterou a versão pública inesperadamente.');
assert(version.build===2026082501,'version.json não possui o build esperado.');
assert(version.revision==='diet-live-calories-1','version.json não identifica a revisão atual.');
assert(updaterBuild===version.build,'Atualizador e version.json usam builds diferentes.');
assert(workerBuild===version.build&&bridgeBuild===version.build,'Service Workers e version.json usam builds diferentes.');

has(boot,'function returningCloudSession()','Boot não diferencia uma sessão já conhecida.');
has(boot,'restoring?6500:1800','Boot voltou a liberar o login cedo durante restauração.');
lacks(boot,'},1600);','Fallback antigo de 1,6 s reapareceu.');
has(config,'startBootWatchdog.__tbMobileSessionRestore','Watchdog móvel não está reforçado.');
has(config,'const loadedModules=new Set(),failedModules=new Set()','Loader não rastreia módulos temporariamente falhos.');
has(config,'const healFailedModules=async()=>','Loader não possui autorreparo.');
has(config,"window.addEventListener('online',()=>scheduleHeal(500))",'Loader não retenta ao recuperar conexão.');
has(updater,'function compareRelease(info)','Atualizador não compara versão + build.');
has(updater,'function safeForAutomaticHotfix()','Atualização automática não possui gate de tela segura.');
has(updater,"if(screen!=='screen-auth')return false",'Atualizador poderia reiniciar durante uso ativo.');
has(updater,'&b=${CURRENT_BUILD}','Service Worker não é registrado com build.');
for(const [name,text] of [['sw.js',sw],['sw_47.js',bridge]]){
  has(text,"const CACHE_HOTFIX='dietautomacros1'",`${name} não preserva a revisão atual do shell móvel.`);
  has(text,"type:'TEAM_BULLS_SW_ACTIVATED',version:APP_VERSION,build:BUILD_REVISION",`${name} não anuncia o build ativado.`);
  has(text,"if(relativePath==='/version.json')",`${name} deixou de tratar version.json como mutável.`);
}
assert(bridge.replace('ponte de migração para instalações controladas pelo antigo sw_47.js','Service Worker estável e atualização sem reinstalação')===sw,'sw_47.js divergiu do Service Worker principal.');

if(fail.length){console.error('FALHA — mobile startup consistency\n- '+fail.join('\n- '));process.exit(1);}
console.log('APROVADO — restauração móvel, autorreparo e consistência de build verificados.');
