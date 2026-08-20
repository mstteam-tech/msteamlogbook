import fs from 'node:fs';

const fail=[];
const read=p=>fs.readFileSync(p,'utf8');
const assert=(ok,msg)=>{if(!ok)fail.push(msg);};

const security=read('modules/security-hardening-v10_10_9.js');
const config=read('config_v10_7.js');

assert(!security.includes("where('role','==','student').get()"),'A lista do treinador voltou a consultar todos os estudantes sem vínculo.');
assert(security.includes("where('role','==','student').where('trainerId','==',trainerUid).get()"),'Consulta vinculada por trainerId não está presente.');
assert(security.includes("version:'10.10.10-security6'"),'A camada de segurança não está na versão security6.');
assert(config.includes('security-hardening-v10_10_9.js?v=10.10.10-security6'),'O cache-bust do módulo security6 não está carregado.');
assert(security.includes('authorizedStudents.clear()')&&security.includes('students.forEach(student=>authorizedStudents.add(String(student.uid)))'),'A lista autorizada não é reconstruída a partir dos alunos exibidos.');
assert(security.includes("student.role==='student'&&String(student.trainerId||'')===trainerUid"),'A UI não revalida o vínculo do aluno retornado.');
assert(security.includes('auditInviteLinks(trainerUid,students.length)'),'Diagnóstico de vínculos antigos não está ativo.');

if(fail.length){
  console.error('FALHA — trainer student list check\n- '+fail.join('\n- '));
  process.exit(1);
}
console.log('APROVADO — lista do treinador isolada por trainerId, cache-bust atual e defesa adicional presentes.');
