import fs from 'node:fs';

const fail=[];
const read=p=>fs.readFileSync(p,'utf8');
const assert=(ok,msg)=>{if(!ok)fail.push(msg);};
const config=read('config_v10_7.js');
const repair=read('modules/legacy-student-link-repair-v10_10_10.js');
const rules=read('firebase/firestore_26_compacto.rules');

assert(config.includes('legacy-student-link-repair-v10_10_10.js?v=10.10.10-legacy-links6'),'Reconciliador não está carregado com cache-bust legacy-links6.');
assert(repair.includes("VERSION='10.10.10-legacy-links6'"),'Reconciliador não identifica a versão legacy-links6.');
assert(repair.includes("studentInvites').where('trainerId','==',trainerUid)"),'Reconciliação manual não consulta somente convites do treinador atual.');
assert(repair.includes("where('role','==','student').where('trainerId','==',trainerUid)"),'Reconciliação manual não identifica os alunos já vinculados.');
assert(repair.includes("doc(uid).update({trainerId:trainerUid})"),'Reconciliador não limita a correção ao trainerId.');
assert(repair.includes('lastFingerprint')&&repair.includes('fingerprint===lastFingerprint'),'Proteção contra repetição dentro da mesma execução não está presente.');
assert(repair.includes('runAutomaticMigrationIfAuthorized'),'Reconciliador não possui gate de migração automática.');
assert(repair.includes('CURRENT_USER?.legacyMigrationEnabled===true'),'Migração automática não está condicionada à autorização já carregada do treinador.');
assert(repair.includes('if(!trainerMigrationAuthorized(trainerUid))return true'),'Fluxo normal do treinador ainda pode iniciar leituras automáticas de reconciliação.');
assert(!repair.includes("db.collection('users').doc(trainerUid),'verificar autorização da migração legada'"),'Reconciliador voltou a reler o perfil do treinador apenas para conferir uma flag já carregada.');
assert(!repair.includes('hookTrainerRender'),'Reconciliador voltou a se acoplar a cada renderTrainer e pode amplificar consumo.');
assert(repair.includes('PRE_V107_CUTOFF_MS')&&repair.includes('isPreV107LegacyStudent'),'Migração de cadastros anteriores à v10.7 não possui corte de schema.');
assert(repair.includes("where('role','==','student').limit(PRE_V107_SCAN_LIMIT)"),'Varredura pré-v10.7 não está limitada.');
assert(repair.includes("doc(trainerUid).update({legacyMigrationEnabled:false})"),'Autorização temporária não é encerrada após a migração.');
assert(repair.includes('CURRENT_USER.legacyMigrationEnabled=false'),'Sessão não é atualizada depois de encerrar a autorização temporária.');
assert(!repair.includes('set({role:')&&!repair.includes("update({role:"),'Reconciliador não pode alterar role do aluno.');
assert(rules.includes('function legacyMigrationAuthorized()'),'Firestore não possui guarda administrativa da migração pré-v10.7.');
assert(rules.includes("userData(request.auth.uid).get('legacyMigrationEnabled', false) == true"),'Autorização pré-v10.7 não está vinculada ao próprio treinador autenticado.');
assert(rules.includes("userData(uid).get('trainerId', '') == ''")&&rules.includes("userData(uid).get('inviteId', '') == ''"),'Migração pré-v10.7 não está restrita a perfis realmente sem vínculo.');
assert(rules.includes("legacyMigrationAuthorized() && resource.data.role == 'student'"),'Leitura temporária não está explicitamente protegida pela autorização de migração.');
assert(rules.includes("affectedKeys().hasOnly(['legacyMigrationEnabled'])")&&rules.includes('request.resource.data.legacyMigrationEnabled == false'),'Treinador não possui somente a capacidade de desligar a autorização temporária.');
assert(rules.includes("request.resource.data.diff(resource.data).affectedKeys().hasOnly(['trainerId'])"),'Regra Firestore não limita a migração ao trainerId.');
assert(rules.includes("resource.data.inviteId")&&rules.includes("usedBy == uid"),'Regra não preserva a validação de convite consumido para perfis pós-v10.7.');

if(fail.length){console.error('FALHA — legacy student link check\n- '+fail.join('\n- '));process.exit(1);}
console.log('APROVADO — reconciliação automática só ocorre durante migração administrativa explícita; fluxo normal fica sem leituras legadas.');
