import fs from 'node:fs';
import {spawnSync} from 'node:child_process';

const fail=[];
const assert=(ok,message)=>{if(!ok)fail.push(message);};
const read=file=>fs.readFileSync(file,'utf8');
const updater=read('update_v10_10_9.js');
const version=JSON.parse(read('version.json'));
const sw=read('sw.js');

const syntax=spawnSync(process.execPath,['--check','update_v10_10_9.js'],{encoding:'utf8'});
assert(syntax.status===0,`Atualizador possui JavaScript inválido: ${String(syntax.stderr||'').trim()}`);

assert(version.version==='10.10.9','Versão pública foi alterada durante o resgate.');
assert(version.updateMode==='manual-rescue','Feed não está em modo manual-rescue.');
assert(version.build===2026083001,'Kill switch precisa neutralizar especificamente clientes do build 2026083001.');
assert(updater.includes('const CURRENT_BUILD=2026083104;'),'Runtime atual não preserva o build 2026083104.');
assert(sw.includes('const BUILD_REVISION=2026083104;'),'Service Worker não preserva o runtime 2026083104.');
assert(updater.includes('const AUTO_APPLY_SAME_VERSION_HOTFIX=false;'),'Auto-update voltou a ser habilitado.');
assert(updater.includes("if(automatic&&!AUTO_APPLY_SAME_VERSION_HOTFIX)return false"),'applyLatest não bloqueia execução automática.');
assert(updater.includes('hotfix&&AUTO_APPLY_SAME_VERSION_HOTFIX&&safeForAutomaticHotfix()'),'checkForUpdates ignora o kill switch de auto-apply.');
assert(updater.includes('UPDATE_PREPARE_TIMEOUT_MS=4600'),'Preparação não possui deadline global.');
assert(updater.includes('NAVIGATION_WATCHDOG_MS=2200'),'Reabertura não possui watchdog.');
assert(updater.includes('function cancelActiveUpdate'),'Usuário não possui rota explícita para cancelar update.');
assert(updater.includes('laterButton.disabled=false'),'Botão de saída pode ficar desabilitado durante update.');
assert(updater.includes("laterButton.textContent=busy?'CONTINUAR NO APP'"),'Banner busy não oferece saída clara.');
assert(updater.includes('if(reg?.installing)await waitForState'),'Worker installing voltou a ser ignorado sem await.');
assert(updater.includes('function recentAttemptFor(info)'),'Atualizador não possui trava de repetição recente.');
assert(updater.includes("title:'ATUALIZAÇÃO AGUARDANDO REABERTURA'"),'Ciclo repetido não possui estado de contenção.');
assert(updater.includes('async function refreshCriticalShell(){return false;}'),'Atualizador voltou a renovar o shell inteiro na thread da UI.');
const prepareStart=updater.indexOf('async function prepareLatest');
const prepareEnd=updater.indexOf('async function flushBeforeReload',prepareStart);
const prepare=prepareStart>=0&&prepareEnd>prepareStart?updater.slice(prepareStart,prepareEnd):'';
assert(prepare&&!prepare.includes('refreshCriticalShell('),'prepareLatest voltou a executar refreshCriticalShell pesado.');
const applyStart=updater.indexOf('async function applyLatestUpdate');
const applyEnd=updater.indexOf('async function checkForUpdates',applyStart);
const apply=applyStart>=0&&applyEnd>applyStart?updater.slice(applyStart,applyEnd):'';
assert(apply.includes('applying=false;applyController=null;')&&apply.includes("prepared:true"),'UI pode permanecer permanentemente no estado busy antes da navegação.');
assert(apply.includes('withDeadline(prepareLatest({forceCheck:true}),UPDATE_PREPARE_TIMEOUT_MS'),'Preparação da atualização não é limitada por timeout.');

if(fail.length){console.error('FALHA — update freeze rescue\n- '+fail.join('\n- '));process.exit(1);}
console.log('Update freeze rescue OK — auto-update contido, UI cancelável e preparação limitada.');
