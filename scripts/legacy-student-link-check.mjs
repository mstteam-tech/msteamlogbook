import fs from 'node:fs';

const fail=[];
const read=p=>fs.readFileSync(p,'utf8');
const assert=(ok,msg)=>{if(!ok)fail.push(msg);};
const config=read('config_v10_7.js');
const repair=read('modules/legacy-student-link-repair-v10_10_10.js');
const rules=read('firebase/firestore_26_compacto.rules');

assert(config.includes('legacy-student-link-repair-v10_10_10.js?v=10.10.10-legacy-links3'),'Reconciliador não está carregado com cache-bust legacy-links3.');
assert(repair.includes("studentInvites').where('trainerId','==',trainerUid)"),'Reconciliador não consulta somente convites do treinador atual.');
assert(repair.includes("where('role','==','student').where('trainerId','==',trainerUid)"),'Reconciliador não identifica os alunos já vinculados antes de migrar.');
assert(repair.includes("doc(uid).update({trainerId:trainerUid})"),'Reconciliador não limita a correção ao trainerId.');
assert(repair.includes('linkedIds.has(uid)'),'Reconciliador não ignora alunos que já estão corretamente vinculados.');
assert(repair.includes('lastFingerprint')&&repair.includes('fingerprint===lastFingerprint'),'Proteção contra loop de reconciliação não está presente.');
assert(repair.includes('usedBy')&&repair.includes('inviteId'),'Reconciliador não usa a prova de vínculo do convite.');
assert(repair.includes('hookTrainerRender'),'Reconciliador não reexecuta quando a área do treinador fica pronta.');
assert(!repair.includes('set({role:')&&!repair.includes("update({role:"),'Reconciliador não pode alterar role do aluno.');
assert(!repair.includes('trainerId:currentUser')&&!repair.includes('trainerId:CURRENT_USER'),'Reconciliador não usa UID arbitrário fora do vínculo autenticado.');
assert(rules.includes("request.resource.data.diff(resource.data).affectedKeys().hasOnly(['trainerId'])"),'Regra Firestore não autoriza a migração segura de trainerId legado.');
assert(rules.includes("resource.data.inviteId")&&rules.includes("usedBy == uid"),'Regra não valida o convite consumido para a migração.');

if(fail.length){console.error('FALHA — legacy student link check\n- '+fail.join('\n- '));process.exit(1);}
console.log('APROVADO — reconciliação legada idempotente, cache-bust atual e autorização restrita estão presentes.');
