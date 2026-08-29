import fs from 'node:fs';
import {spawnSync} from 'node:child_process';

const fail=[];
const read=path=>fs.readFileSync(path,'utf8');
const assert=(ok,message)=>{if(!ok)fail.push(message);};
const has=(text,needle,message)=>assert(text.includes(needle),message);

const modulePath='modules/student-home-profile-v10_10_12.js';
for(const file of [modulePath,'modules/usability-checkup-v10_10_9.js']){
  const syntax=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});
  assert(syntax.status===0,`${file} possui JavaScript inválido: ${String(syntax.stderr||'').trim()}`);
}
const mod=read(modulePath),usability=read('modules/usability-checkup-v10_10_9.js'),config=read('config_v10_7.js'),updater=read('update_v10_10_9.js'),sw=read('sw.js'),sw47=read('sw_47.js'),storage=read('firebase/storage_6.rules'),version=JSON.parse(read('version.json'));

has(mod,"const PROFILE_PREFIX='studentProfiles'",'Perfil do aluno não possui namespace próprio no Storage.');
has(mod,"db.collection('notifications').where('studentId','==',uid)",'Central não lê os avisos enviados pelo treinador.');
has(mod,"db.collection('feedback').where('studentId','==',uid)",'Central não incorpora mensagens da central.');
has(mod,"db.collection('questionnaires').where('studentId','==',uid)",'Central não incorpora relatórios pendentes.');
has(mod,"db.collection('checkinSchedules').doc(uid)",'Central não incorpora o relatório semanal.');
has(mod,"protocolReviewSchedules",'Central não incorpora o cronograma de protocolos.');
has(mod,"title=\"Notificações\">🔔",'Header não usa o símbolo de notificação esperado.');
has(mod,"#feedback-banner,#screen-home.tb-home-v2 #quest-banner",'Banners antigos continuam ocupando a home.');
has(mod,'Protocolos de treino','Resumo não mostra protocolos de treino.');
has(mod,'Protocolos de dieta','Resumo não mostra protocolos de dieta.');
has(mod,'tb-confidential-badge','Selo CONFIDENCIAL não possui correção própria de layout.');
has(mod,'MUDAR FOTO','Menu do perfil não permite trocar foto.');
has(mod,'MUDAR NOME / APELIDO','Menu do perfil não permite trocar nome de exibição.');
has(mod,'REMOVER FOTO','Treinador não consegue moderar a foto.');
has(mod,'REMOVER APELIDO','Treinador não consegue moderar o apelido.');
has(mod,"'image/jpeg',0.9",'Avatar não é normalizado/comprimido para JPEG.');
has(mod,'file.size>12*1024*1024','Upload de avatar perdeu limite de entrada.');
has(mod,"typeof createImageBitmap==='function'",'Avatar perdeu fallback compatível para navegadores sem createImageBitmap.');

has(usability,"button.textContent='SAIR'",'Menu móvel do perfil não possui a opção SAIR.');
has(usability,"typeof confirmLogout==='function'",'Opção SAIR não reutiliza o fluxo seguro de logout existente.');
has(usability,"data-tb-profile-logout=\"1\"",'Logout do perfil não possui proteção contra duplicação.');
has(usability,'MutationObserver','Logout não acompanha a criação tardia do menu de perfil.');

has(storage,'match /studentProfiles/{uid}/profile.json','Storage Rules não protegem o apelido do aluno.');
has(storage,'match /studentProfiles/{uid}/avatar.jpg','Storage Rules não protegem o avatar.');
has(storage,'trainerOwns(uid) || activeOwner(uid)','Perfil visual não está isolado entre aluno e treinador vinculado.');
has(storage,'validOptimizedJpegUpload(800 * 1024)','Avatar não possui limite de armazenamento de 800 KB.');
has(storage,"request.resource.contentType == 'application/json'",'Perfil JSON não valida Content-Type.');

const asset='./modules/student-home-profile-v10_10_12.js?v=10.10.12-studenthome1';
has(config,asset,'Loader não entrega a nova home.');
has(updater,asset,'Atualizador não aquece a nova home.');
has(sw,asset,'Service Worker não prepara a nova home.');
has(sw47,asset,'Service Worker legado não prepara a nova home.');
assert(version.version==='10.10.9','Versão pública foi alterada.');
assert(version.build===2026082902,'Build da revisão da home está incorreto.');
assert(/const CURRENT_BUILD=2026082902/.test(updater),'Updater não usa o build da home.');
assert(/const BUILD_REVISION=2026082902/.test(sw)&&/const BUILD_REVISION=2026082902/.test(sw47),'Service Workers não usam o build da home.');
assert(/const CACHE_HOTFIX='studentlogout1'/.test(sw)&&/const CACHE_HOTFIX='studentlogout1'/.test(sw47),'Cache do hotfix de logout não foi rotacionado.');
assert(sw===sw47,'sw.js e sw_47.js divergiram.');

if(fail.length){console.error('FALHA — student home/profile\n- '+fail.join('\n- '));process.exit(1);}
console.log('APROVADO — home do aluno: notificações, avatar/apelido moderáveis, logout móvel, 2 protocolos e selo confidencial validados.');
