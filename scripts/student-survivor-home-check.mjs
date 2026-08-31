import fs from 'node:fs';

const fail=[];
const assert=(condition,message)=>{if(!condition)fail.push(message);};
const read=file=>fs.readFileSync(file,'utf8');
const modulePath='modules/student-survivor-home-v10_10_14.js';
assert(fs.existsSync(modulePath),'Camada survivor da Home do aluno está ausente.');

if(fs.existsSync(modulePath)){
  const source=read(modulePath);
  const boot=read('boot_v10.js');
  assert(boot.includes('student-survivor-home-v10_10_14.js?v=10.10.14-home1'),'Boot não carrega a camada survivor da Home.');
  assert(source.includes("['home','INÍCIO'"),'Hotbar não contém Início.');
  assert(source.includes("['workout','TREINO'"),'Hotbar não contém Treino.');
  assert(source.includes("['meals','SUPRIMENTOS'"),'Hotbar não contém Suprimentos.');
  assert(source.includes("['instructions','INSTRUÇÕES'"),'Hotbar não contém Instruções.');
  assert(source.includes("['reports','RELATÓRIOS'"),'Hotbar não contém Relatórios.');
  assert(source.includes("const blocked=['openTechniques','openExerciseOptions','openPhotos',\"openV107Operations('notices')\",'openCalendar']"),'Navegação removida do aluno não está protegida.');
  assert(source.includes("#screen-home.tb-survivor-home .quick-nav{display:none!important}"),'Grade antiga de atalhos não é removida da Home do aluno.');
  assert(source.includes("loadProtocolReviewSchedule(uid,true)"),'Home não reutiliza o cronograma oficial de atualização.');
  assert(source.includes("db.collection('feedback').where('studentId','==',uid)"),'Feedbacks compactos não são filtrados pelo aluno autenticado.');
  assert(source.includes("db.collection('progressPhotos').where('userId','==',uid)"),'Gráfico de peso não usa os registros oficiais do aluno.');
  assert(source.includes("byDate=new Map()"),'Gráfico de peso não deduplica as seis fotos do mesmo relatório por data.');
  assert(source.includes("body.textContent=String(item.message||'')"),'Feedback do treinador deixou de usar textContent seguro.');
  assert(!source.includes("innerHTML=String(item.message"),'Conteúdo de feedback não pode ser injetado como HTML.');
  assert(!source.includes("db.collection('users')"),'Camada visual não deve escrever ou consultar perfil principal do usuário.');
}

if(fail.length){console.error('\nStudent survivor home regression failed:\n- '+fail.join('\n- '));process.exit(1);}
console.log('Student survivor home regression OK');
