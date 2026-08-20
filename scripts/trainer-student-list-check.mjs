import fs from 'node:fs';

const fail=[];
const read=p=>fs.readFileSync(p,'utf8');
const assert=(ok,msg)=>{if(!ok)fail.push(msg);};

const security=read('modules/security-hardening-v10_10_9.js');
const config=read('config_v10_7.js');

assert(security.includes("where('role','==','student').get()"),'A lista do treinador não consulta todos os usuários com role=student.');
assert(security.includes("where('role','==','student').where('trainerId','==',trainerUid).get()"),'Fallback por trainerId não está presente.');
assert(security.includes('regras antigas de alunos; usando fallback seguro'),'O fallback não identifica regras antigas do Firebase.');
assert(security.includes("version:'10.10.10-security4'"),'A camada de segurança não está na versão security4.');
assert(config.includes('security4'),'O cache-bust do módulo security4 não está carregado.');
assert(security.includes('authorizedStudents.clear()')&&security.includes('students.forEach(student=>authorizedStudents.add(String(student.uid)))'),'A lista autorizada não é reconstruída a partir dos alunos exibidos.');

if(fail.length){
  console.error('FALHA — trainer student list check\n- '+fail.join('\n- '));
  process.exit(1);
}
console.log('APROVADO — lista completa de alunos + fallback seguro + cache-bust presentes.');
