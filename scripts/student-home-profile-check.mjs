import fs from 'node:fs';
import {spawnSync} from 'node:child_process';

const fail=[];
const read=path=>fs.readFileSync(path,'utf8');
const assert=(ok,message)=>{if(!ok)fail.push(message);};
const has=(text,needle,message)=>assert(text.includes(needle),message);
const numberMatch=(text,re)=>Number(text.match(re)?.[1]||0);

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
has(mod,'protocolReviewSchedules','Central não incorpora o cronograma de protocolos.');
has(mod,'title="Notificações">🔔','Header não usa o símbolo de notificação esperado.');
has(mod,'#feedback-banner,#screen-home.tb-home-v2 #quest-banner','Banners antigos continuam ocupando a home.');
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
has(usability,'data-tb-profile-logout="1"','Logout do perfil não possui proteção contra duplicação.');
has(usability,'MutationObserver','Logout não acompanha a criação tardia do menu de perfil.');

has(storage,'match /studentProfiles/{uid}/profile.json','Storage Rules não protegem o apelido do aluno.');
has(storage,'match /studentProfiles/{uid}/avatar.jpg','Storage Rules não protegem o avatar.');
has(storage,'trainerOwns(uid) || activeOwner(uid)','Perfil visual não está isolado entre aluno e treinador vinculado.');
has(storage,'validOptimizedJpegUpload(800 * 1024)','Avatar não possui limite de armazenamento de 800 KB.');
has(storage,"request.resource.contentType == 'application/json'",'Perfil JSON não valida Content-Type.');

const asset='./modules/student-home-profile-v10_10_12.js?v=10.10.12-studenthome1';
has(config,asset,'Loader não entrega a nova home.');
has(updater,asset,'Atualizador não preserva a nova home no catálogo.');
has(sw,asset,'Service Worker não prepara a nova home.');
has(sw47,asset,'Service Worker legado não prepara a nova home.');
assert(version.version==='10.10.9','Versão pública foi alterada.');
const updaterBuild=numberMatch(updater,/const CURRENT_BUILD=(\d+)/),swBuild=numberMatch(sw,/const BUILD_REVISION=(\d+)/),sw47Build=numberMatch(sw47,/const BUILD_REVISION=(\d+)/);
assert(updaterBuild>0&&updaterBuild===swBuild&&swBuild===sw47Build,'Updater e Service Workers não compartilham o mesmo build de runtime.');
if(version.updateMode==='manual-rescue'){
  assert(Number(version.build)>0&&Number(version.build)<=updaterBuild,'Feed manual-rescue não pode anunciar build acima do runtime.');
  assert(String(version.revision||'').includes('update-loop-kill-switch'),'Feed de resgate não identifica a contenção do atualizador.');
  has(updater,'const AUTO_APPLY_SAME_VERSION_HOTFIX=false;','Atualização automática não está suspensa durante o resgate.');
}else{
  assert(Number(version.build)>0&&updaterBuild===Number(version.build),'Updater não acompanha o build público atual.');
  assert(swBuild===Number(version.build)&&sw47Build===Number(version.build),'Service Workers não acompanham o build público atual.');
}
const hotfix=sw.match(/const CACHE_HOTFIX='([^']+)'/)?.[1]||'',hotfix47=sw47.match(/const CACHE_HOTFIX='([^']+)'/)?.[1]||'';
assert(hotfix.length>0&&hotfix===hotfix47,'Service Workers não compartilham uma revisão de cache válida.');
assert(sw===sw47,'sw.js e sw_47.js divergiram.');

if(fail.length){console.error('FALHA — student home/profile\n- '+fail.join('\n- '));process.exit(1);}
console.log(`APROVADO — home do aluno preservada; runtime ${updaterBuild}, feed ${version.build}, notificações, avatar/apelido, logout, protocolos e cache coerentes.`);
