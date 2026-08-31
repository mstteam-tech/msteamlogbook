import fs from 'node:fs';

const fail=[];
const read=path=>fs.readFileSync(path,'utf8');
const assert=(condition,message)=>{if(!condition)fail.push(message);};
const has=(text,needle,message)=>assert(text.includes(needle),message);
const lacks=(text,needle,message)=>assert(!text.includes(needle),message);

for(const path of ['modules/session-save-performance-v10_10_9.js','config_v10_7.js','update_v10_10_9.js','app_v10_10_9_core.js']){
  assert(fs.existsSync(path),`Arquivo obrigatório ausente: ${path}`);
}
if(fail.length){console.error(fail.join('\n'));process.exit(1);}

const session=read('modules/session-save-performance-v10_10_9.js');
const config=read('config_v10_7.js');
const updater=read('update_v10_10_9.js');
const core=read('app_v10_10_9_core.js');

has(config,'./modules/session-save-performance-v10_10_9.js?v=10.10.9-sessionperf1','Hotfix de registro rápido não está carregado.');
assert(config.indexOf('session-save-performance-v10_10_9.js')<config.indexOf('stability_v10_10_9.js'),'Registro rápido deve ser o primeiro hotfix após a pintura.');
lacks(config,'attempts++>=80','Polling agressivo voltou ao startup.');
has(config,"document.addEventListener('DOMContentLoaded',patch,{once:true})",'Resiliência não é instalada antes do initApp.');

has(session,"const QUEUE_PREFIX='team_bulls_pending_sessions_v1_'",'Fila persistente de séries ausente.');
has(session,'if(!enqueue(entry))','Registro rápido não possui fallback seguro quando a fila local falha.');
has(session,"closeModal('modal-session')",'Registro rápido não libera o modal imediatamente.');
has(session,"showToast('✓ Série registrada')",'Feedback imediato do registro ausente.');
has(session,'scheduleFlush(40)','Sincronização em segundo plano ausente.');
has(session,"db.collection('sessions').doc(entry.id).set",'Fila não sincroniza usando ID idempotente.');
has(session,'TB.flushPendingMutationSync=combined','Atualização não integra a fila persistente de séries.');
const fastStart=session.indexOf('const fastSave=async function()');
const fastEnd=session.indexOf('fastSave.__tbSessionPerf=true',fastStart);
const fastBlock=fastStart>=0&&fastEnd>fastStart?session.slice(fastStart,fastEnd):'';
lacks(fastBlock,"await cloudWrite(db.collection('sessions')",'Salvar série voltou a esperar o Firestore antes de liberar a interface.');

// O updater não pode repetir o padrão que congelou o app: refresh completo do
// shell dentro da ação do usuário, waits longos ou UI sem rota de escape.
has(updater,'const UPDATE_FLUSH_BUDGET_MS=450','Flush antes da atualização voltou a exceder o orçamento curto.');
has(updater,'const UPDATE_PREPARE_TIMEOUT_MS=4600','Atualização não possui deadline global de preparação.');
has(updater,'const UPDATE_WORKER_WAIT_MS=1300','Worker não possui espera curta e explícita.');
has(updater,'await Promise.race([Promise.resolve(reg?.update?.()).catch(()=>null),sleep(UPDATE_WORKER_WAIT_MS)])','Atualização pode voltar a bloquear indefinidamente no Service Worker.');
has(updater,'if(reg?.installing)await waitForState','Estado installing do worker voltou a ser ignorado.');
has(updater,'async function refreshCriticalShell(){return false;}','Compatibilidade do refresh crítico não está neutralizada.');
const prepareStart=updater.indexOf('async function prepareLatest');
const prepareEnd=updater.indexOf('async function flushBeforeReload',prepareStart);
const prepareBlock=prepareStart>=0&&prepareEnd>prepareStart?updater.slice(prepareStart,prepareEnd):'';
lacks(prepareBlock,'refreshCriticalShell(','prepareLatest voltou a baixar o shell inteiro durante interação.');
has(updater,'laterButton.disabled=false','Banner de atualização voltou a bloquear a saída do usuário.');
has(updater,"laterButton.textContent=busy?'CONTINUAR NO APP'",'Estado busy não oferece rota clara para continuar no app.');
has(updater,'const AUTO_APPLY_SAME_VERSION_HOTFIX=false','Hotfix automático voltou a competir com a abertura inicial.');
has(updater,'scheduleBackgroundCheck(BACKGROUND_CHECK_DELAY_MS)','Verificação de versão não respeita o atraso de startup.');
lacks(updater,'await registration.update().catch(()=>{})','Init do atualizador voltou a bloquear o boot com update imediato.');

has(core,"const AUTH_UI_FALLBACK_MS=850",'Fallback rápido da tela de acesso foi removido.');
has(core,"document.addEventListener('DOMContentLoaded',initApp,{once:true})",'initApp não está ancorado no DOMContentLoaded.');

if(fail.length){
  console.error('\nFalhas de performance:\n- '+fail.join('\n- '));
  process.exit(1);
}
console.log('Session/startup/update performance check OK — updater não bloqueante validado.');
