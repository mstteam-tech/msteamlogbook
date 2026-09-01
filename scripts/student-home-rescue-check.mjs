import fs from 'node:fs';

const fail=[];
const assert=(condition,message)=>{if(!condition)fail.push(message);};
const read=file=>fs.readFileSync(file,'utf8');
const BUILD=2026090101;

const modulePath='modules/student-home-layout-v10_10_15.js';
const profilePath='modules/student-home-profile-v10_10_12.js';
const usabilityPath='modules/usability-checkup-v10_10_9.js';
const runtimePath='modules/student-home-layout-runtime-v10_10_16.js';
for(const path of [modulePath,profilePath,usabilityPath,runtimePath])assert(fs.existsSync(path),`Módulo obrigatório ausente: ${path}`);

const home=fs.existsSync(modulePath)?read(modulePath):'';
const profile=fs.existsSync(profilePath)?read(profilePath):'';
const usability=fs.existsSync(usabilityPath)?read(usabilityPath):'';
const runtime=fs.existsSync(runtimePath)?read(runtimePath):'';
const config=read('config_v10_7.js');
const update=read('update_v10_10_9.js');
const sw=read('sw.js');
const sw47=read('sw_47.js');
const boot=read('boot_v10.js');
const version=JSON.parse(read('version.json'));

for(const [name,source] of [['Home',home],['Perfil',profile],['Usabilidade',usability],['Ponte legada',runtime],['Config',config],['Atualizador',update],['Service Worker',sw],['Boot',boot]]){
  try{new Function(source);}catch(error){fail.push(`${name} possui erro de sintaxe: ${error.message}`);}
}

assert(version.version==='10.10.9','Hotfix deve manter a versão compatível 10.10.9.');
assert(Number(version.build)===BUILD,'version.json não está no build de estabilização.');
assert(version.revision==='runtime-stability-1','version.json não identifica a estabilização atual.');
assert(update.includes(`const CURRENT_BUILD=${BUILD};`),'Atualizador não está no mesmo build publicado.');
assert(sw.includes(`const BUILD_REVISION=${BUILD};`),'Service Worker não está no mesmo build publicado.');
assert(sw47.includes(`const BUILD_REVISION=${BUILD};`),'Service Worker legado não está no mesmo build publicado.');
assert(sw===sw47,'sw.js e sw_47.js devem permanecer idênticos.');
assert(sw.includes("const CACHE_HOTFIX='update-unblock1';"),'Estabilização não deve reativar uma navegação forçada de cache.');

assert(update.includes("STUDENT_HOME_MODULE='./modules/student-home-profile-v10_10_12.js?v=10.10.20-studenthome3'"),'Atualizador não conhece o perfil estabilizado.');
assert(update.includes("STUDENT_HOME_LAYOUT_MODULE='./modules/student-home-layout-v10_10_15.js?v=10.10.20-home3'"),'Atualizador não conhece a Home estabilizada.');
assert(update.includes('loadStudentHomeModules'),'Home não é preservada pelo caminho opcional pós-boot.');
assert(update.includes('STUDENT_HOME_MODULE,STUDENT_HOME_LAYOUT_MODULE'),'Módulos da Home não estão no refresh crítico.');

assert(config.includes('const studentPriorityModules=['),'Loader não possui prioridade de runtime para a Home do aluno.');
assert(config.includes("'./modules/student-home-profile-v10_10_12.js?v=10.10.20-studenthome3'"),'Perfil estabilizado não é prioridade do runtime.');
assert(config.includes("'./modules/student-home-layout-v10_10_15.js?v=10.10.20-home3'"),'Layout estabilizado não é prioridade do runtime.');
assert(!config.includes("'./modules/student-home-layout-runtime-v10_10_16.js?v=10.10.16-runtime1'"),'Ponte legada voltou a executar no loader atual.');
assert(config.includes('deferredComplete=false'),'Loader não registra conclusão da fila diferida.');
assert(config.includes('deferredComplete=true'),'Loader não marca conclusão real do runtime.');
assert(config.includes("if(deferredStarted||!sessionUiReady()||(deferredComplete&&!failedModules.size))return;"),'Fila diferida pode ser reiniciada depois de concluída.');
assert(config.includes("if(!sessionUiReady()||(deferredComplete&&!failedModules.size))return;"),'Agendador pode revarrer módulos concluídos.');
assert(config.includes("activeScreen()!=='screen-home'"),'Prioridade do aluno não está condicionada à Home realmente ativa.');
assert(config.includes("screen!=='screen-loading'&&screen!=='screen-auth'"),'Fila pesada pode voltar a iniciar durante loading/auth.');
assert(config.includes('await yieldUi();'),'Fila diferida não devolve o thread principal entre módulos.');
assert(config.includes("version:'10.10.20-startup7'"),'Loader não expõe a revisão estabilizada.');

assert(sw.includes("./modules/student-home-profile-v10_10_12.js?v=10.10.20-studenthome3"),'Perfil estabilizado não está no shell PWA.');
assert(sw.includes("./modules/student-home-layout-v10_10_15.js?v=10.10.20-home3"),'Home estabilizada não está no shell PWA.');
assert(sw.includes("./modules/usability-checkup-v10_10_9.js?v=10.10.20-usability3"),'Usabilidade estabilizada não está no shell PWA.');
assert(sw.includes("./modules/student-home-layout-runtime-v10_10_16.js?v=10.10.16-runtime1"),'Ponte antiga deve permanecer disponível apenas para instalações legadas.');
assert(sw.includes("'/modules/usability-checkup-v10_10_9.js','/modules/student-home-profile-v10_10_12.js','/modules/student-home-layout-v10_10_15.js','/modules/student-home-layout-runtime-v10_10_16.js'"),'Camadas mutáveis do aluno não estão em network-first.');
assert(!boot.includes('student-survivor-home-v10_10_14'),'Loader antigo da PR #76 reapareceu no boot crítico.');

assert(runtime.includes("const LAYOUT_SRC='./modules/student-home-layout-v10_10_15.js?v=10.10.15-home2'"),'Ponte legada deixou de apontar ao arquivo físico oficial.');
assert(!runtime.includes('setInterval('),'Ponte legada voltou a executar polling permanente.');

assert(home.includes("const VERSION='10.10.20-home3'"),'Layout canônico não contém a revisão estabilizada.');
assert(home.includes("currentUser()?.role==='trainer'||document.body.classList.contains('trainer-desktop')"),'Home não bloqueia explicitamente o contexto de treinador.');
assert(home.includes("body.student-desktop .student-desktop-nav{display:none!important}"),'Sidebar antiga do aluno não é removida no desktop.');
assert(home.includes("body.student-desktop #app{margin-left:0!important;width:100%!important"),'Área do aluno não recupera a largura ao remover a sidebar.');
assert(home.includes("#screen-home.tb-home-v17-screen .quick-nav{display:none!important}"),'Grade antiga da Home do aluno não é escondida.');
assert(home.includes("['home','INÍCIO'"),'Hotbar não contém Início.');
assert(home.includes("['workout','TREINO'"),'Hotbar não contém Treino.');
assert(home.includes("['diet','DIETA'"),'Hotbar não contém Dieta.');
assert(home.includes("['instructions','INSTRUÇÕES'"),'Hotbar não contém Instruções.');
assert(home.includes("['supplements','SUPRIMENTOS'"),'Hotbar não contém Suprimentos.');
assert(home.includes("['options','OPÇÕES DE SUPRIMENTOS'"),'Hotbar não contém Opções de Suprimentos.');
assert(home.includes("['reports','RELATÓRIOS'"),'Hotbar não contém Relatórios.');
assert(home.includes('async function openStudentSupplements()'),'Atalho de suplementos não reutiliza a dieta oficial.');
assert(home.includes('openDietDetail(plan.id,false)'),'Atalho de suplementos não abre o protocolo oficial em modo aluno.');
assert(home.includes("#screen-diet-detail .diet-support-section"),'Atalho de suplementos não revela as tabelas prescritas.');
assert(home.includes("title.textContent='DIETAS'"),'Lista de protocolos do aluno continua rotulada incorretamente como suplementos.');
assert(home.includes("observer.observe(document.body,{attributes:true,attributeFilter:['class']})"),'Home não observa de forma restrita a mudança de contexto do body.');
assert(!home.includes('subtree:true'),'Home voltou a observar toda a árvore do DOM e pode degradar interação.');
assert(!home.includes('setInterval('),'Home voltou a executar polling permanente e pode causar lag.');
assert(home.includes("loadProtocolReviewSchedule(uid,true)"),'Data da próxima atualização não reutiliza o cronograma oficial.');
assert(home.includes("db.collection('feedback').where('studentId','==',uid)"),'Feedbacks não são filtrados pelo aluno autenticado.');
assert(home.includes("base.orderBy('createdAt','desc').limit(MAX_FEEDBACKS).get()"),'Feedbacks recentes não usam consulta ordenada e limitada quando suportada.');
assert(home.includes('const snap=await base.get();'),'Feedbacks perderam fallback compatível quando o índice ordenado não existe.');
assert(home.includes("db.collection('weeklyCheckins').where('studentId','==',uid)"),'Gráfico não usa weeklyCheckins do próprio aluno.');
assert(!home.includes("db.collection('progressPhotos').where('userId','==',uid)"),'Home voltou a baixar progressPhotos para montar o gráfico de peso.');
assert(home.includes("body.textContent=String(item.message||'')"),'Feedback não usa textContent seguro.');
assert(!home.includes('innerHTML=String(item.message'),'Feedback do treinador não pode ser injetado como HTML.');
assert(home.includes("db.collection('feedback').doc(item.id).update({read:true})"),'Abrir feedback na Home não sincroniza o estado de leitura.');

assert(profile.includes("const VERSION='10.10.20-studenthome3'"),'Perfil do aluno não está na revisão estabilizada.');
assert(profile.includes('body.student-desktop .student-desktop-nav{display:none!important}'),'Perfil prioritário não possui fail-safe para a sidebar antiga.');
assert(profile.includes('#screen-home.tb-home-v2 .quick-nav{display:none!important}'),'Perfil prioritário não possui fail-safe para a grade antiga.');
assert(profile.includes('data-tb-profile-logout="1"'),'Perfil não cria o logout diretamente.');
assert(profile.includes('const BADGE_POLL_MS=300000;'),'Badge voltou a consultar o backend com frequência excessiva.');
assert(profile.includes('const BADGE_REFRESH_TTL=120000;'),'Badge não possui janela de coalescência/cache.');
assert(profile.includes('loadNotifications({includeProtocol:false})'),'Badge ainda consulta o cronograma de protocolo sem necessidade.');
assert(profile.includes('if(badgeRefreshPromise)return badgeRefreshPromise;'),'Consultas concorrentes do badge não são coalescidas.');
assert(profile.includes("activeScreen()==='screen-home'"),'Polling do badge não é restrito à Home ativa.');

assert(usability.includes("const VERSION='10.10.20-usability3'"),'Usabilidade não está na revisão estabilizada.');
assert(!usability.includes('profileMenuObserver'),'Observer global do menu de perfil voltou ao runtime.');
assert(!usability.includes('subtree:true'),'Usabilidade voltou a observar toda a árvore do DOM.');
assert(usability.includes("window.addEventListener('team-bulls-student-runtime-ready',ensureStudentProfileLogout)"),'Fallback do logout não acompanha o evento relevante do aluno.');

if(fail.length){console.error('\nStudent home/runtime stabilization regression failed:\n- '+fail.join('\n- '));process.exit(1);}
console.log('Student home/runtime stabilization OK — Home fail-safe, sete atalhos, loader concluível e leituras de badge reduzidas.');
