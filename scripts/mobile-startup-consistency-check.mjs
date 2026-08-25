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

assert(version.version==='10.10.9','version.json alterou a versão pública inesperadamente.');
assert(version.build===2026082401,'version.json não possui a revisão de build móvel esperada.');
assert(version.revision==='mobile-startup-1','version.json não identifica a revisão mobile-startup-1.');

has(boot,'function returningCloudSession()','Boot não diferencia uma sessão já conhecida no celular.');
has(boot,'restoring?6500:1800','Boot voltou a liberar o login cedo demais durante restauração de sessão.');
lacks(boot,'},1600);','Fallback antigo de 1,6 s reapareceu no boot.');

has(config,'startBootWatchdog.__tbMobileSessionRestore','Config não reforça o watchdog para sessão móvel existente.');
has(config,'const authDelay=restoring?4200:700','Watchdog não preserva uma janela maior para restauração real da sessão.');
has(config,'const loadedModules=new Set(),failedModules=new Set()','Loader não rastreia módulos carregados e temporariamente falhos.');
has(config,'const preloadAhead=index=>preloadModules','Loader não antecipa uma pequena janela de módulos.');
has(config,'const healFailedModules=async()=>','Loader não possui autorreparo após falha de rede.');
has(config,"window.addEventListener('online',()=>scheduleHeal(500))",'Loader não retenta ao recuperar a conexão.');
has(config,"document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')scheduleHeal(700);})",'Loader não retenta ao voltar para o app.');
has(config,"window.TeamBullsRuntimeLoader=Object.freeze",'Estado do runtime não pode ser diagnosticado.');
has(config,"document.documentElement.dataset.teamBullsRuntime='ready'",'Loader não marca quando todos os módulos foram finalizados.');

has(updater,'const CURRENT_BUILD=2026082401','Atualizador não conhece a revisão de build atual.');
has(updater,'function compareRelease(info)','Atualizador não compara versão + build.');
has(updater,'function isSameVersionHotfix(info)','Hotfix de mesma versão não é detectado.');
has(updater,'function safeForAutomaticHotfix()','Atualização automática não possui gate de tela segura.');
has(updater,"if(screen!=='screen-auth')return false",'Atualizador poderia reiniciar automaticamente durante uso ativo do app.');
has(updater,'&b=${CURRENT_BUILD}','Service Worker não é registrado com revisão de build.');
has(updater,"event.data?.type==='TEAM_BULLS_SW_ACTIVATED'",'Atualizador não reage a um Service Worker de build superior.');
has(updater,"setBannerState({title:hotfix?'CORREÇÃO DO APP DISPONÍVEL'",'Usuário não recebe contexto para hotfix da mesma versão.');

for(const [name,text] of [['sw.js',sw],['sw_47.js',bridge]]){
  has(text,'const BUILD_REVISION=2026082401',`${name} não conhece a revisão de build atual.`);
  has(text,"const CACHE_HOTFIX='mobilestartup1'",`${name} não cria shell novo para o bootstrap móvel.`);
  has(text,"type:'TEAM_BULLS_SW_ACTIVATED',version:APP_VERSION,build:BUILD_REVISION",`${name} não anuncia o build ativado.`);
  has(text,"if(relativePath==='/version.json')",`${name} deixou de tratar version.json como recurso mutável.`);
  has(text,'networkFirst(request,{cacheName:SHELL_CACHE,timeout:MUTABLE_NETWORK_TIMEOUT_MS})',`${name} não consulta version.json pela rede antes do cache.`);
  has(text,"./modules/security-hardening-v10_10_9.js?v=10.10.10-security8",`${name} deixou de preparar a segurança do painel offline.`);
}

assert(bridge.replace('ponte de migração para instalações controladas pelo antigo sw_47.js','Service Worker estável e atualização sem reinstalação')===sw,'sw_47.js divergiu funcionalmente do Service Worker principal.');

if(fail.length){
  console.error('FALHA — mobile startup consistency\n- '+fail.join('\n- '));
  process.exit(1);
}
console.log('APROVADO — restauração de sessão, autorreparo de módulos, build-aware update e shell móvel verificados.');
