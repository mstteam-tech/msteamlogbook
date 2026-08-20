import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const failures=[];
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const assert=(condition,message)=>{if(!condition)failures.push(message);};
const has=(text,needle,message)=>assert(text.includes(needle),message);
const lacks=(text,needle,message)=>assert(!text.includes(needle),message);
const requireFile=rel=>assert(fs.existsSync(path.join(root,rel)),`Arquivo obrigatório ausente: ${rel}`);

const required=[
  'firebase/firestore_26_compacto.rules',
  'firebase/storage_5.rules',
  'modules/security-hardening-v10_10_9.js',
  'modules/registration-integrity-v10_10_9.js',
  'modules/remove-stretch-planilha-v10_10_9.js',
  'modules/v107-invites.js',
  'config_v10_7.js',
  'index.html'
];
required.forEach(requireFile);
if(failures.length){console.error(failures.join('\n'));process.exit(1);}

const firestore=read('firebase/firestore_26_compacto.rules');
has(firestore,'function trainerOwns(uid)','Firestore não possui isolamento trainer → aluno.');
has(firestore,'function trainerOwnsWorkout(workoutId)','Firestore não protege consultas por workoutId.');
has(firestore,"resource.data.trainerId == request.auth.uid",'Leitura normal de usuários não está vinculada ao trainerId.');
has(firestore,'function legacyMigrationAuthorized()','Migração legada não possui autorização administrativa explícita.');
has(firestore,"userData(request.auth.uid).get('legacyMigrationEnabled', false) == true",'Autorização de migração não está vinculada ao treinador autenticado.');
has(firestore,"legacyMigrationAuthorized() && resource.data.role == 'student'",'Leitura temporária de alunos não está protegida pela autorização de migração.');
has(firestore,'function preV107LegacyStudent(uid)','Firestore não diferencia alunos pré-v10.7 sem vínculo.');
has(firestore,"userData(uid).get('trainerId', '') == ''",'Migração pode sobrescrever trainerId existente.');
has(firestore,"userData(uid).get('inviteId', '') == ''",'Migração pré-v10.7 pode capturar perfil com convite moderno.');
has(firestore,"affectedKeys().hasOnly(['legacyMigrationEnabled'])",'Treinador não está limitado a desligar somente a autorização temporária.');
has(firestore,'request.resource.data.legacyMigrationEnabled == false','Cliente pode manter/ativar autorização de migração indevidamente.');
has(firestore,'trainerOwns(request.resource.data.studentId)','Criações do treinador não exigem aluno vinculado.');
has(firestore,'trainerOwns(resource.data.userId) || activeOwner(resource.data.userId)','Dados pessoais ainda não estão isolados por treinador.');
has(firestore,'safeColor(request.resource.data.color)','Cor de protocolo não é validada por whitelist.');
has(firestore,"(request.resource.data.get('dataUrl', '') != '' || request.resource.data.get('photoPath', '') != '')",'Regra ainda permite registro de foto vazio.');
lacks(firestore,'allow read: if isTrainer() || activeOwner(resource.data.userId);','Regra ampla de leitura de fotos/sessões por qualquer treinador reapareceu.');
lacks(firestore,'allow read: if isTrainer() || activeOwner(resource.data.studentId);','Regra ampla de leitura de relatórios por qualquer treinador reapareceu.');
lacks(firestore,"|| (isTrainer() && resource.data.role == 'student')",'Leitura global permanente de alunos por qualquer treinador reapareceu.');
has(firestore,'match /{document=**} { allow read, write: if false; }','Firestore perdeu o deny-all final.');

const storage=read('firebase/storage_5.rules');
has(storage,'function trainerOwns(uid)','Storage não valida vínculo do treinador ao aluno.');
has(storage,'allow read: if trainerOwns(uid) || activeOwner(uid);','Fotos no Storage ainda não estão isoladas por treinador.');
lacks(storage,'allow read: if isTrainer() || activeOwner(uid);','Storage voltou a permitir qualquer treinador ler qualquer foto.');
has(storage,'match /{allPaths=**} { allow read, write: if false; }','Storage perdeu o deny-all final.');

const security=read('modules/security-hardening-v10_10_9.js');
has(security,"where('trainerId','==',trainerUid)",'Painel do treinador ainda consulta todos os estudantes.');
has(security,'authorizedStudents.has(target)','UI não possui defesa adicional contra aluno fora do vínculo.');
has(security,'SAFE_COLORS','Cache/local não saneia cores de protocolo.');

const invites=read('modules/v107-invites.js');
lacks(invites,'withTimeout(db.runTransaction','Transação de cadastro voltou a ter timeout artificial.');
has(invites,"return'unknown'",'Cadastro não trata resultado de commit indeterminado.');
has(invites,"if(state==='committed')",'Cadastro não reconcilia commit confirmado após falha de rede.');

const registration=read('modules/registration-integrity-v10_10_9.js');
lacks(registration,'withTimeout(db.runTransaction','Hotfix cache-safe voltou a abortar transação por timeout local.');
has(registration,'TB.inviteHash','Hotfix de cadastro não reaproveita hash seguro do convite.');

const stretch=read('modules/remove-stretch-planilha-v10_10_9.js');
lacks(stretch,'new MutationObserver','Remoção de alongamento voltou a observar toda a árvore DOM permanentemente.');

const config=read('config_v10_7.js');
has(config,'security-hardening-v10_10_9.js?v=10.10.10-security6','Loader não inclui o hardening security6 com URL nova.');
has(config,'legacy-student-link-repair-v10_10_10.js?v=10.10.10-legacy-links5','Loader não inclui o reconciliador legacy-links5 com URL nova.');
has(config,'registration-integrity-v10_10_9.js?v=10.10.9-registration1','Loader não inclui a correção cache-safe do cadastro.');
has(config,'remove-stretch-planilha-v10_10_9.js?v=10.10.9-stretchremove2','Loader pode reutilizar a versão antiga do removedor de alongamento.');

const index=read('index.html');
has(index,"object-src 'none'",'CSP não bloqueia plugins/objetos.');
has(index,"base-uri 'self'",'CSP não limita base-uri.');
has(index,"upgrade-insecure-requests",'CSP não força upgrade de conteúdo inseguro.');

const jsFiles=[];
function walk(dir){
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    if(['.git','node_modules'].includes(entry.name))continue;
    const full=path.join(dir,entry.name);
    if(entry.isDirectory())walk(full);else if(entry.isFile()&&entry.name.endsWith('.js'))jsFiles.push(full);
  }
}
walk(root);
for(const file of jsFiles){
  const text=fs.readFileSync(file,'utf8');
  const relative=path.relative(root,file);
  assert(!/localStorage\.setItem\([^\n]{0,180}(?:password|senha|pass\s*\))/i.test(text),`Possível senha em texto persistida em ${relative}.`);
}

if(failures.length){
  console.error('Falhas de segurança/regressão:');
  failures.forEach(item=>console.error('- '+item));
  process.exit(1);
}
console.log('Security checks OK');
