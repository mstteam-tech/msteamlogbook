import fs from 'node:fs';

const fail=[];
const assert=(condition,message)=>{if(!condition)fail.push(message);};
const read=file=>fs.readFileSync(file,'utf8');
const BUILD=2026083105;

const modulePath='modules/student-home-layout-v10_10_15.js';
const runtimePath='modules/student-home-layout-runtime-v10_10_16.js';
assert(fs.existsSync(modulePath),'Módulo da Home resiliente está ausente.');
assert(fs.existsSync(runtimePath),'Ponte resiliente da Home está ausente.');

const home=fs.existsSync(modulePath)?read(modulePath):'';
const runtime=fs.existsSync(runtimePath)?read(runtimePath):'';
const config=read('config_v10_7.js');
const update=read('update_v10_10_9.js');
const sw=read('sw.js');
const sw47=read('sw_47.js');
const boot=read('boot_v10.js');
const version=JSON.parse(read('version.json'));

for(const [name,source] of [['Home',home],['Ponte da Home',runtime],['Config',config],['Atualizador',update],['Service Worker',sw],['Boot',boot]]){
  try{new Function(source);}catch(error){fail.push(`${name} possui erro de sintaxe: ${error.message}`);}
}

assert(version.version==='10.10.9','Hotfix deve manter a versão compatível 10.10.9.');
assert(Number(version.build)===BUILD,'version.json não está no build fail-open.');
assert(update.includes(`const CURRENT_BUILD=${BUILD};`),'Atualizador não está no mesmo build publicado.');
assert(sw.includes(`const BUILD_REVISION=${BUILD};`),'Service Worker não está no mesmo build publicado.');
assert(sw47.includes(`const BUILD_REVISION=${BUILD};`),'Service Worker legado não está no mesmo build publicado.');
assert(sw===sw47,'sw.js e sw_47.js devem permanecer idênticos.');
assert(sw.includes("const CACHE_HOTFIX='update-unblock1';"),'Service Worker não rotaciona o cache do fail-open.');
assert(update.includes("STUDENT_HOME_LAYOUT_MODULE='./modules/student-home-layout-v10_10_15.js?v=10.10.15-home2'"),'Atualizador não conhece a Home nova.');
assert(update.includes('loadStudentHomeModules'),'Home não é carregada pelo caminho opcional pós-boot.');
assert(update.includes('STUDENT_HOME_MODULE,STUDENT_HOME_LAYOUT_MODULE'),'Módulos da Home não estão no refresh crítico.');
assert(config.includes("'./modules/student-home-layout-runtime-v10_10_16.js?v=10.10.16-runtime1'"),'Ponte da Home não está no loader resiliente principal.');
assert(config.includes('const studentPriorityModules=['),'Loader não possui prioridade de runtime para a Home do aluno.');
assert(config.includes("'./modules/student-home-layout-v10_10_15.js?v=10.10.19-home2'"),'Layout canônico não é carregado diretamente como prioridade após autenticação.');
assert(config.includes("activeScreen()!=='screen-home'"),'Prioridade do aluno não está condicionada à Home realmente ativa.');
assert(config.includes("screen!=='screen-loading'&&screen!=='screen-auth'"),'Fila pesada pode voltar a iniciar durante loading/auth.');
assert(config.includes('if(deferredStarted||!sessionUiReady())return;'),'Fila diferida não possui gate de sessão resolvida.');
assert(config.includes("observer.observe(node,{attributes:true,attributeFilter:['class']})"),'Gate de contexto não observa apenas classes das telas essenciais.');
assert(config.includes('await yieldUi();'),'Fila diferida não devolve o thread principal entre módulos.');
assert(sw.includes("./modules/student-home-layout-v10_10_15.js?v=10.10.15-home2"),'Home nova não está no shell PWA.');
assert(sw.includes("./modules/student-home-layout-runtime-v10_10_16.js?v=10.10.16-runtime1"),'Ponte da Home não está no shell PWA.');
assert(sw.includes("'/modules/student-home-profile-v10_10_12.js','/modules/student-home-layout-v10_10_15.js','/modules/student-home-layout-runtime-v10_10_16.js'"),'Home/perfil/ponte não são tratados como arquivos mutáveis.');
assert(sw.includes("./modules/student-home-profile-v10_10_12.js?v=10.10.12-studenthome1"),'Cabeçalho atual do aluno não está preservado no shell PWA.');
assert(!boot.includes('student-survivor-home-v10_10_14'),'Loader antigo da PR #76 reapareceu no boot crítico.');

assert(runtime.includes("const LAYOUT_SRC='./modules/student-home-layout-v10_10_15.js?v=10.10.15-home2'"),'Ponte não aponta para o layout oficial.');
assert(runtime.includes("const VERSION='10.10.18-runtime2'"),'Ponte não está na revisão leve/event-driven.');
assert(runtime.includes("document.body.classList.contains('student-desktop')"),'Ponte não reconhece o contexto visual real do aluno.');
assert(runtime.includes('window.TeamBullsStudentHomeLayout?.syncHotbar?.()'),'Ponte não sincroniza o layout canônico após carregar.');
assert(!runtime.includes('setInterval('),'Ponte voltou a executar polling permanente.');

assert(home.includes("const VERSION='10.10.19-home2'"),'Layout canônico não contém a revisão event-driven v10.10.19.');
assert(home.includes("document.body.classList.contains('student-desktop')"),'Home não usa o mesmo contexto visual de aluno que o core.');
assert(home.includes("coreMode()==='local'||access==='offline-registered'||access==='local-inactive'"),'Home não reconhece os modos locais/offline aceitos pelo core.');
assert(home.includes("currentUser()?.role==='trainer'||document.body.classList.contains('trainer-desktop')"),'Home não bloqueia explicitamente o contexto de treinador.');
assert(home.includes("window.firebase?.auth?.().currentUser?.uid"),'Home não possui fallback seguro de UID para sessão autenticada.');
assert(home.includes("body.student-desktop .student-desktop-nav{display:none!important}"),'Sidebar antiga do aluno não é removida no desktop.');
assert(home.includes("body.student-desktop #app{margin-left:0!important;width:100%!important"),'Área do aluno não recupera a largura ao remover a sidebar.');
assert(home.includes("#screen-home.tb-home-v17-screen .quick-nav{display:none!important}"),'Grade antiga da Home do aluno não é escondida.');
assert(home.includes("['home','INÍCIO'"),'Hotbar não contém Início.');
assert(home.includes("['workout','TREINO'"),'Hotbar não contém Treino.');
assert(home.includes("['meals','SUPRIMENTOS'"),'Hotbar não contém Suprimentos.');
assert(home.includes("['instructions','INSTRUÇÕES'"),'Hotbar não contém Instruções.');
assert(home.includes("['reports','RELATÓRIOS'"),'Hotbar não contém Relatórios.');
assert(home.includes("observer.observe(document.body,{attributes:true,attributeFilter:['class']})"),'Home não observa de forma restrita a mudança de contexto do body.');
assert(home.includes("document.querySelectorAll('.screen').forEach(screen=>observer.observe(screen,{attributes:true,attributeFilter:['class']}))"),'Home não observa apenas as classes das telas.');
assert(!home.includes('subtree:true'),'Home voltou a observar toda a árvore do DOM e pode degradar interação.');
assert(!home.includes('setInterval('),'Home voltou a executar polling permanente e pode causar lag.');
assert(home.includes("loadProtocolReviewSchedule(uid,true)"),'Data da próxima atualização não reutiliza o cronograma oficial.');
assert(home.includes("db.collection('feedback').where('studentId','==',uid)"),'Feedbacks não são filtrados pelo aluno autenticado.');
assert(home.includes("db.collection('weeklyCheckins').where('studentId','==',uid)"),'Gráfico não usa o histórico leve de weeklyCheckins do próprio aluno.');
assert(!home.includes("db.collection('progressPhotos').where('userId','==',uid)"),'Home voltou a baixar progressPhotos para montar o gráfico de peso.');
assert(!home.includes('.limit('),'Home não deve limitar antes de ordenar os registros mais recentes.');
assert(home.includes("body.textContent=String(item.message||'')"),'Feedback não usa textContent seguro.');
assert(!home.includes('innerHTML=String(item.message'),'Feedback do treinador não pode ser injetado como HTML.');
assert(home.includes("db.collection('feedback').doc(item.id).update({read:true})"),'Abrir feedback na Home não sincroniza o estado de leitura.');

if(fail.length){console.error('\nStudent home/PWA rescue regression failed:\n- '+fail.join('\n- '));process.exit(1);}
console.log('Student home/PWA rescue regression OK — Home prioritária após autenticação, sem polling e sem observer global.');
