import fs from 'node:fs';
import {spawnSync} from 'node:child_process';

const fail=[];
const read=path=>fs.readFileSync(path,'utf8');
const assert=(ok,message)=>{if(!ok)fail.push(message);};
const has=(text,needle,message)=>assert(text.includes(needle),message);
const lacks=(text,needle,message)=>assert(!text.includes(needle),message);

const files=['boot_v10.js','config_v10_7.js','update_v10_10_9.js','sw.js','sw_47.js','modules/v107-invites.js','modules/registration-integrity-v10_10_9.js','modules/trainer-inbox-payments-v10_10_12.js','modules/photo-quality-download-v10_10_9.js'];
for(const file of files){const syntax=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});assert(syntax.status===0,`${file} possui JavaScript inválido: ${String(syntax.stderr||'').trim()}`);}

const boot=read('boot_v10.js'),config=read('config_v10_7.js'),updater=read('update_v10_10_9.js'),sw=read('sw.js'),bridge=read('sw_47.js'),invites=read('modules/v107-invites.js'),integrity=read('modules/registration-integrity-v10_10_9.js'),photo=read('modules/photo-quality-download-v10_10_9.js');
const version=JSON.parse(read('version.json')),firebase=JSON.parse(read('firebase.json'));
const updaterBuild=Number(updater.match(/const CURRENT_BUILD=(\d+)/)?.[1]||0),workerBuild=Number(sw.match(/const BUILD_REVISION=(\d+)/)?.[1]||0),bridgeBuild=Number(bridge.match(/const BUILD_REVISION=(\d+)/)?.[1]||0);
const swHotfix=sw.match(/const CACHE_HOTFIX='([^']+)'/)?.[1]||'',bridgeHotfix=bridge.match(/const CACHE_HOTFIX='([^']+)'/)?.[1]||'';

assert(version.version==='10.10.9','version.json alterou a versão pública inesperadamente.');
assert(Number.isInteger(version.build)&&version.build>0,'version.json não possui build válido.');
assert(typeof version.revision==='string'&&version.revision.length>0,'version.json não identifica a revisão atual.');
assert(updaterBuild===version.build,'Atualizador e version.json usam builds diferentes.');
assert(workerBuild===version.build&&bridgeBuild===version.build,'Service Workers e version.json usam builds diferentes.');
assert(swHotfix&&swHotfix===bridgeHotfix,'Service Workers usam revisões de cache diferentes.');
assert(firebase?.firestore?.rules==='firebase/firestore_28_compacto.rules','firebase.json deixou de apontar para Firestore Rules 28.');
assert(firebase?.storage?.rules==='firebase/storage_6.rules','firebase.json deixou de apontar para Storage Rules 6.');

has(boot,'function returningCloudSession()','Boot não diferencia uma sessão já conhecida.');
has(boot,'restoring?6500:1800','Boot voltou a liberar o login cedo durante restauração.');
lacks(boot,'},1600);','Fallback antigo de 1,6 s reapareceu.');
has(config,'startBootWatchdog.__tbMobileSessionRestore','Watchdog móvel não está reforçado.');
has(config,'const loadedModules=new Set(),failedModules=new Set()','Loader não rastreia módulos temporariamente falhos.');
has(config,'const healFailedModules=async()=>','Loader não possui autorreparo.');
has(config,"window.addEventListener('online',()=>scheduleHeal(500))",'Loader não retenta ao recuperar conexão.');
has(config,'trainer-inbox-payments-v10_10_12.js?v=10.10.12-inboxpayments2','Loader não entrega a Central/Pagamentos atual.');
has(config,'photo-quality-download-v10_10_9.js?v=10.10.9-photoquality2','Loader não entrega a correção móvel de fotos.');
has(updater,'function compareRelease(info)','Atualizador não compara versão + build.');
has(updater,'function safeForAutomaticHotfix()','Atualização automática não possui gate de tela segura.');
has(updater,"if(screen!=='screen-auth')return false",'Atualizador poderia reiniciar durante uso ativo.');
has(updater,'&b=${CURRENT_BUILD}','Service Worker não é registrado com build.');
for(const [name,text] of [['sw.js',sw],['sw_47.js',bridge]]){
  has(text,"./modules/registration-integrity-v10_10_9.js?v=10.10.9-registration2",`${name} regrediu a integridade do cadastro.`);
  has(text,"./modules/trainer-inbox-payments-v10_10_12.js?v=10.10.12-inboxpayments2",`${name} não prepara a Central/Pagamentos.`);
  has(text,"./modules/photo-quality-download-v10_10_9.js?v=10.10.9-photoquality2",`${name} não prepara a correção móvel de fotos.`);
  has(text,"type:'TEAM_BULLS_SW_ACTIVATED',version:APP_VERSION,build:BUILD_REVISION",`${name} não anuncia o build ativado.`);
  has(text,"if(relativePath==='/version.json')",`${name} deixou de tratar version.json como mutável.`);
  has(text,"./modules/trainer-diet-workspace-v10_10_11.js?v=10.10.11-dietworkspace1",`${name} não prepara o workspace do treinador para uso offline.`);
}
has(photo,"const VERSION='10.10.9-photoquality2'",'Revisão móvel de fotos não está ativa.');
has(photo,'createImageBitmap(file,{imageOrientation:\'from-image\'})','Decoder móvel perdeu a primeira tentativa orientada.');
has(photo,'createImageBitmap(file);','Decoder móvel perdeu o fallback Android sem opções.');
has(photo,'releaseLegacyReportPreviewSurfaces()','Envio não libera previews pesados antes da compressão.');
has(invites,'suspendAuthListenerForRegistration','Cadastro canônico perdeu a pausa do listener de autenticação.');
has(invites,'cred.user.getIdTokenResult(true)','Cadastro canônico perdeu a renovação de token/claims.');
has(invites,'await ensureRegistrationAppCheck()','Cadastro canônico perdeu o preflight de App Check.');
has(invites,'doRegister.__tbCanonicalInviteRegistration=true','Cadastro canônico não está identificado para autorreparo.');
has(invites,"window.addEventListener('team-bulls-runtime-state',enforceCanonicalRegistration)",'Cadastro canônico não se restaura após módulos diferidos.');
lacks(integrity,'doRegister=secured','registration-integrity voltou a sobrescrever o cadastro canônico.');
has(integrity,"const VERSION='10.10.9-registration2'",'Camada passiva de integridade não está na revisão esperada.');
assert(bridge.replace('ponte de migração para instalações controladas pelo antigo sw_47.js','Service Worker estável e atualização sem reinstalação')===sw,'sw_47.js divergiu do Service Worker principal.');
if(fail.length){console.error('FALHA — mobile startup consistency\n- '+fail.join('\n- '));process.exit(1);}
console.log(`APROVADO — build ${version.build}, cadastro, Central/Pagamentos, fotos móveis, App Check, Rules 28, Storage 6 e Service Workers coerentes.`);
