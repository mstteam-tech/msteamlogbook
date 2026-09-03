import fs from 'node:fs';
import {spawnSync} from 'node:child_process';

const fail=[];
const assert=(ok,message)=>{if(!ok)fail.push(message);};
const read=file=>fs.readFileSync(file,'utf8');
const viewport=read('viewport_v10_10_9.js');
const core=read('app_v10_10_9_core.js');
const boot=read('boot_v10.js');
const sw=read('sw.js');

const syntax=spawnSync(process.execPath,['--check','viewport_v10_10_9.js'],{encoding:'utf8'});
assert(syntax.status===0,`viewport_v10_10_9.js possui JavaScript inválido: ${String(syntax.stderr||'').trim()}`);

assert(viewport.includes("const REVISION='10.10.25-session1';"),'Camada de estabilidade móvel não possui revisão própria.');
assert(viewport.includes("email.setAttribute('autocomplete','username')"),'Login não devolve semântica username ao gerenciador de senhas.');
assert(viewport.includes("password.setAttribute('autocomplete','current-password')"),'Login não devolve semântica current-password ao gerenciador de senhas.');
assert(viewport.includes("['data-1p-ignore','data-lpignore','data-form-type','aria-autocomplete'].forEach"),'Atributos que bloqueavam autofill continuam ativos.');
assert(viewport.includes("const LAST_EMAIL_KEY='team_bulls_last_login_email_v1';"),'Último e-mail não possui memória local segura.');
assert(viewport.includes("profile=JSON.parse(safeGet('team_bulls_profile_v9_5_'+uid)||'null')"),'E-mail não possui fallback pelo perfil já conhecido do próprio usuário.');
assert(!/safeSet\([^\n]{0,80}(?:password|login-pass)/i.test(viewport),'Camada nova não pode persistir senha em texto puro.');

assert(core.includes("const cachedShellOpened=restoreCachedStudentAccess(user,{code:'team-bulls/fast-session'},{silent:true});"),'Fluxo canônico de restauração rápida mudou sem atualizar a proteção.');
assert(viewport.includes("reason?.code==='team-bulls/fast-session'&&options?.silent===true&&navigator.onLine!==false"),'Restauração online ainda pode abrir Home em modo offline antes de validar o perfil.');
assert(viewport.includes("setPending(true,'validating-online-profile');return false"),'Gate online não mantém a sessão em validação.');
assert(viewport.includes("accessMode()!=='offline-registered'"),'Recuperação de conexão não está limitada ao fallback offline registrado.');
assert(viewport.includes('Promise.resolve(handleAuthStateUser(user))'),'Fallback offline não retorna automaticamente à sessão cloud quando a conexão volta.');

assert(core.includes('clearTransientAuthSecrets();'),'Core ainda possui a limpeza sensível que precisa ser mediada pela camada móvel.');
assert(viewport.includes("if(activeScreen()==='screen-auth'||authRestorePending())return false"),'Senha ainda pode ser limpa enquanto login/restauração não terminou.');
assert(viewport.includes("if(result!==false&&(id==='screen-home'||id==='screen-trainer')&&committedAccess())"),'Segredos não são limpos no commit real da navegação autenticada.');
assert(viewport.includes("if(id==='screen-auth'&&authRestorePending())"),'Watchdogs ainda podem substituir uma restauração válida pela tela de login.');
assert(viewport.includes('__tbSessionRestoreGuard:true,activateAuth(message)'),'Boot fail-open não é mediado durante restauração real.');
assert(boot.includes("window.TeamBullsRuntimeStabilityBoot?.activateAuth?.(message)"),'Boot deixou de usar o ponto mediável de fail-open.');
assert(viewport.includes("activeScreen()!=='screen-loading'||firebaseUser()||processingUid()"),'Barreira final de 12 s pode expulsar uma autenticação realmente em processamento.');

for(const path of [
  '/modules/student-home-profile-v10_10_12.js',
  '/modules/student-home-layout-v10_10_15.js',
  '/modules/student-workout-library-v10_10_24.js',
  '/modules/student-diet-compact-live-v10_10_23.js',
  '/modules/student-diet-layout-v10_10_24.js',
  '/modules/student-hotbar-payments-v10_10_22.js',
  '/modules/supply-options-label-v10_10_24.js'
])assert(viewport.includes(`'${path}'`),`Reparo cirúrgico de cache não inclui ${path}.`);
assert(viewport.includes("if(navigator.onLine===false||!('caches'in window))return false"),'Reparo de cache pode apagar módulos durante abertura offline.');
assert(viewport.includes("filter(name=>name.startsWith('team-bulls-'))"),'Reparo de cache não está limitado aos caches do app.');
assert(viewport.includes('cache.delete(request)'),'Cópias críticas antigas não são invalidadas antes do runtime do aluno.');
assert(!viewport.includes('caches.delete(name)'),'Camada de sessão não deve limpar caches inteiros do usuário.');
assert(viewport.includes('Promise.resolve(window.TeamBullsCriticalCacheRepair).finally(run)'),'Runtime pode iniciar antes do reparo da cópia crítica antiga.');

assert(viewport.includes("root.classList.add('tb-student-runtime-pending')"),'Home não possui estado transitório contra flash do layout antigo.');
assert(viewport.includes("window.addEventListener('team-bulls-student-runtime-ready',finishStudentRuntimePending)"),'Estado anti-flash não termina quando runtime atual fica pronto.');
assert(viewport.includes("window.TeamBullsRuntimeLoader?.student?.()"),'Home não antecipa a carga do runtime prioritário depois do login.');
assert(!viewport.includes('new MutationObserver'),'Correção de sessão não deve adicionar observer global.');

assert(core.includes("function canUseCatalogVideos(){return MODE==='cloud'&&CURRENT_USER?.role==='student'&&CURRENT_USER.status!=='inactive';}"),'Gate de vídeos mudou sem atualizar a regressão de sessão.');
assert(viewport.includes("currentUser()?.role==='student'&&coreMode()==='cloud'&&accessMode()==='cloud-active'"),'Runtime do aluno pode ser iniciado num contexto offline transitório e manter vídeos bloqueados.');
assert(sw.includes("'/viewport_v10_10_9.js','/boot_v10.js'"),'Service Worker deixou de tratar a camada de sessão/viewport como mutável network-first.');

if(fail.length){
  console.error('FALHA — estabilidade de login/sessão/runtime móvel\n- '+fail.join('\n- '));
  process.exit(1);
}
console.log('APROVADO — login preserva autofill e senha até o commit; restauração online não cai em offline provisório; runtime/cache crítico se recupera sem limpar dados.');
