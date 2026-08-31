import fs from 'node:fs';

const fail=[];
const assert=(condition,message)=>{if(!condition)fail.push(message);};
const read=file=>fs.readFileSync(file,'utf8');
const BUILD=2026083104;

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

for(const [name,source] of [['Home',home],['Ponte da Home',runtime],['Config',config],['Atualizador',update],['Service Worker',sw]]){
  try{new Function(source);}catch(error){fail.push(`${name} possui erro de sintaxe: ${error.message}`);}
}

assert(version.version==='10.10.9','Hotfix deve manter a versão compatível 10.10.9.');
assert(Number(version.build)===BUILD,'version.json não está no build de resgate.');
assert(update.includes(`const CURRENT_BUILD=${BUILD};`),'Atualizador não está no mesmo build de resgate.');
assert(sw.includes(`const BUILD_REVISION=${BUILD};`),'Service Worker não está no mesmo build de resgate.');
assert(sw47.includes(`const BUILD_REVISION=${BUILD};`),'Service Worker legado não está no mesmo build de resgate.');
assert(sw===sw47,'sw.js e sw_47.js devem permanecer idênticos.');
assert(sw.includes("const CACHE_HOTFIX='startup-rescue4';"),'Service Worker não rotaciona o cache antigo.');
assert(update.includes("STUDENT_HOME_LAYOUT_MODULE='./modules/student-home-layout-v10_10_15.js?v=10.10.15-home2'"),'Atualizador não conhece a Home nova.');
assert(update.includes('loadStudentHomeModules'),'Home não é carregada pelo caminho opcional pós-boot.');
assert(update.includes('STUDENT_HOME_MODULE,STUDENT_HOME_LAYOUT_MODULE'),'Módulos da Home não estão no refresh crítico.');
assert(config.includes("'./modules/student-home-layout-runtime-v10_10_16.js?v=10.10.16-runtime1'"),'Ponte da Home não está no loader resiliente principal.');
assert(sw.includes("./modules/student-home-layout-v10_10_15.js?v=10.10.15-home2"),'Home nova não está no shell PWA.');
assert(sw.includes("./modules/student-home-layout-runtime-v10_10_16.js?v=10.10.16-runtime1"),'Ponte da Home não está no shell PWA.');
assert(sw.includes("./modules/student-home-profile-v10_10_12.js?v=10.10.12-studenthome1"),'Cabeçalho atual do aluno não está preservado no shell PWA.');
assert(!boot.includes('student-home-layout-v10_10_15'),'Layout do aluno não pode entrar no boot crítico.');
assert(!boot.includes('student-survivor-home-v10_10_14'),'Loader antigo da PR #76 reapareceu no boot crítico.');

assert(runtime.includes("const LAYOUT_SRC='./modules/student-home-layout-v10_10_15.js?v=10.10.15-home2'"),'Ponte não aponta para o layout oficial.');
assert(runtime.includes("body.student-desktop .student-desktop-nav{display:none!important}"),'Sidebar antiga do aluno continua ativa no desktop.');
assert(runtime.includes(".tb-hotbar-shell{display:block!important"),'Hotbar não é forçada no desktop do aluno.');
assert(runtime.includes("body.student-desktop #app{margin-left:0!important;width:100%!important"),'Área do aluno não retorna à largura total ao remover sidebar.');
assert(runtime.includes('window.TeamBullsStudentHomeLayout?.syncHotbar?.()'),'Ponte não sincroniza a hotbar após carregar o layout.');

assert(home.includes("['home','INÍCIO'"),'Hotbar não contém Início.');
assert(home.includes("['workout','TREINO'"),'Hotbar não contém Treino.');
assert(home.includes("['meals','SUPRIMENTOS'"),'Hotbar não contém Suprimentos.');
assert(home.includes("['instructions','INSTRUÇÕES'"),'Hotbar não contém Instruções.');
assert(home.includes("['reports','RELATÓRIOS'"),'Hotbar não contém Relatórios.');
assert(home.includes("#screen-home.tb-survivor-home .quick-nav{display:none!important}"),'Grade antiga da Home do aluno não é escondida.');
assert(home.includes("'openFoodOptions','openTechniques','openExerciseOptions','openPhotos'"),'Atalhos removidos do aluno não estão protegidos.');
assert(home.includes("loadProtocolReviewSchedule(uid,true)"),'Data da próxima atualização não reutiliza o cronograma oficial.');
assert(home.includes("db.collection('feedback').where('studentId','==',uid)"),'Feedbacks não são filtrados pelo aluno autenticado.');
assert(home.includes("db.collection('progressPhotos').where('userId','==',uid)"),'Peso não é filtrado pelo aluno autenticado.');
assert(!home.includes('.limit('),'Home não deve limitar antes de ordenar os registros mais recentes.');
assert(home.includes('byDate=new Map()'),'Gráfico não deduplica as seis fotos do relatório por data.');
assert(home.includes("body.textContent=String(item.message||'')"),'Feedback não usa textContent seguro.');
assert(!home.includes('innerHTML=String(item.message'),'Feedback do treinador não pode ser injetado como HTML.');

if(fail.length){console.error('\nStudent home/PWA rescue regression failed:\n- '+fail.join('\n- '));process.exit(1);}
console.log('Student home/PWA rescue regression OK');
