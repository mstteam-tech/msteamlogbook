import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const root=process.cwd();
const fail=[];
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const requireFile=rel=>{if(!fs.existsSync(path.join(root,rel)))fail.push(`Arquivo obrigatório ausente: ${rel}`);};
const assert=(condition,message)=>{if(!condition)fail.push(message);};

[
  'index.html','manifest.json','version.json','sw.js','config_v10_7.js',
  'app_v10_10_9_core.js','modules/stability_v10_10_9.js',
  'modules/app-update-v10_10_9.js','modules/diet-scroll-fix-v10_10_9.js','modules/modal-form-guard-v10_10_9.js','modules/trainer-workspace-v10_10_9.js','modules/cardio-timer-fix-v10_10_9.js','modules/photo-guide-v10_10_9.js',
  'firebase/firestore_26_compacto.rules','firebase/storage_5.rules'
].forEach(requireFile);

function walk(dir){
  const out=[];
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    if(['.git','node_modules'].includes(entry.name))continue;
    const full=path.join(dir,entry.name);
    if(entry.isDirectory())out.push(...walk(full));
    else if(entry.isFile()&&entry.name.endsWith('.js'))out.push(full);
  }
  return out;
}
for(const file of walk(root)){
  const result=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});
  if(result.status!==0)fail.push(`JavaScript inválido em ${path.relative(root,file)}: ${result.stderr.trim()}`);
}

for(const rel of ['manifest.json','version.json']){
  try{JSON.parse(read(rel));}catch(error){fail.push(`${rel} não é JSON válido: ${error.message}`);}
}
const version=JSON.parse(read('version.json')).version;
assert(/<meta content="10\.10\.9" name="team-bulls-version"/.test(read('index.html')),'Meta de versão do index não corresponde a 10.10.9.');
assert(version==='10.10.9','version.json não corresponde a 10.10.9.');
assert(/const APP_VERSION='10\.10\.9'/.test(read('sw.js')),'Service Worker com versão divergente.');

const config=read('config_v10_7.js');
assert(config.includes('modules/stability_v10_10_9.js'),'Loader não inclui a camada de estabilidade.');
assert(config.includes('modules/app-update-v10_10_9.js'),'Loader não inclui a atualização de UX/performance.');
assert(config.includes('modules/diet-scroll-fix-v10_10_9.js'),'Loader não inclui a correção do scroll real da dieta.');
assert(config.includes('modules/modal-form-guard-v10_10_9.js'),'Loader não inclui a proteção de modais de edição.');
assert(config.includes('modules/trainer-workspace-v10_10_9.js'),'Loader não inclui as ferramentas privadas do treinador.');
assert(config.includes('modules/cardio-timer-fix-v10_10_9.js'),'Loader não inclui a correção do cronômetro de cardio.');
assert(!config.includes("'./modules/photo-guide-v10_10_9.js?v=10.10.9',"),'Guia de fotos voltou a carregar no startup em vez de sob demanda.');

const update=read('modules/app-update-v10_10_9.js');
assert(update.includes('input.multiple=true'),'Seletor múltiplo de fotos não foi encontrado.');
assert(update.includes('Lado direito braços estendidos')&&update.includes('Lado esquerdo braços estendidos'),'Novos nomes das poses não estão presentes.');
assert(update.includes("pass.autocomplete='current-password'"),'Autocomplete seguro de senha não foi configurado.');
assert(update.includes("where('studentId','==',studentUid).where('requestKey','==',request.requestKey)"),'Proteção contra regressão do permission-denied semanal ausente.');
assert(!/localStorage\.setItem\([^\n]*(pass|password|senha)/i.test(update),'A atualização não pode armazenar senha em texto no localStorage.');

const dietScroll=read('modules/diet-scroll-fix-v10_10_9.js');
assert(dietScroll.includes("document.getElementById('app')"),'Correção de dieta não usa o scroller real #app.');
assert(dietScroll.includes('scroller.scrollTop=state.appTop'),'Correção de dieta não restaura o scrollTop do #app.');
assert(dietScroll.includes("'saveDietSupportItem'"),'Salvar suplemento não está protegido contra regressão de rolagem.');

const modalGuard=read('modules/modal-form-guard-v10_10_9.js');
assert(modalGuard.includes("classList.contains('modal-backdrop')"),'Proteção de modal não identifica o backdrop corretamente.');
assert(modalGuard.includes('input:not([type="hidden"]),textarea,select'),'Proteção de modal não reconhece campos editáveis.');
assert(modalGuard.includes('event.stopImmediatePropagation()'),'Proteção de modal não bloqueia listeners antigos de fechamento por backdrop.');
assert(modalGuard.includes("if(event.type==='click')event.preventDefault()"),'Proteção de modal não bloqueia o clique de fechamento no fundo.');
assert(modalGuard.includes("event.key!=='Escape'"),'Proteção de modal não garante fechamento por ESC.');
assert(modalGuard.includes("document.addEventListener('keydown',closeTopModalWithEscape,{capture:true})"),'ESC não está interceptado antes dos listeners legados.');

const workspace=read('modules/trainer-workspace-v10_10_9.js');
assert(workspace.includes('RELATÓRIOS / FOTOS')&&workspace.includes('RASCUNHO'),'Atalhos rápidos de prescrição não foram encontrados.');
assert(workspace.includes("'screen-ts-workout'")&&workspace.includes("'screen-ts-diet-detail'"),'Ferramentas privadas não cobrem treino e dieta do treinador.');
assert(workspace.includes("db.collection('trainerSupplementCatalog').doc(user.uid)"),'Rascunho privado não usa o documento trainer-only já protegido.');
assert(workspace.includes('studentNotes'),'Rascunho não está separado individualmente por aluno.');
assert(!workspace.includes("db.collection('reportSettings')"),'Rascunho privado não pode ser salvo em reportSettings, pois alunos podem ler essa coleção.');
assert(workspace.includes("db.collection('questionnaires').where('studentId','==',student.uid)"),'Consulta rápida de relatórios solicitados ausente.');
assert(workspace.includes('fetchWeeklyCheckins(student.uid)'),'Consulta rápida de relatórios semanais ausente.');
assert(workspace.includes('function anyOpenModal()')&&workspace.includes('!anyOpenModal()'),'Dock privado deve desaparecer enquanto qualquer modal estiver aberto.');
assert(workspace.includes("closeModal('tb-trainer-reports-modal')"),'Consulta rápida deve fechar antes de abrir o visualizador definitivo.');
assert(workspace.includes('openExistingReport(()=>viewWeeklyCheckin(id))'),'Relatório semanal ainda pode ser aberto com transição segura de modal.');
assert(workspace.includes('openExistingReport(()=>viewQuestionnaire(id,true))'),'Relatório solicitado ainda pode ser aberto com transição segura de modal.');
assert(workspace.includes("observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class']})"),'Workspace não acompanha abertura/fechamento de modais para sincronizar o dock.');

const cardioFix=read('modules/cardio-timer-fix-v10_10_9.js');
assert(cardioFix.includes("((Number(state.endAt)||0)-Date.now())/1000"),'Cronômetro de cardio não subtrai o horário atual do endAt corretamente.');
assert(!cardioFix.includes('(Number(state.endAt)||0-Date.now())'),'Regressão de precedência do cronômetro de cardio reapareceu.');
assert(cardioFix.includes('readCardioTimer=fixedReadCardioTimer'),'Hotfix não substitui a leitura defeituosa do estado do cardio.');
assert(cardioFix.includes('ensureCardioTimerTicker=fixedEnsureCardioTimerTicker'),'Ticker otimizado do cardio não foi instalado.');
assert(cardioFix.includes('stopCardioTimerTicker()'),'Ticker do cardio não é interrompido fora da tela.');
assert(cardioFix.includes("document.addEventListener('visibilitychange',syncVisibleTimer"),'Cronômetro não sincroniza ao retornar do segundo plano.');

const core=read('app_v10_10_9_core.js');
assert(core.includes('state.endAt=Date.now()+state.remainingSeconds*1000'),'Fluxo principal deixou de persistir endAt ao iniciar o cardio.');
assert(core.includes('function pauseCardioTimer()')&&core.includes('function resetCardioTimer()'),'Controles de pausa/reinício do cardio estão ausentes.');

const firestore=read('firebase/firestore_26_compacto.rules');
assert(/match \/weeklyCheckins\/{id}/.test(firestore),'Regra de weeklyCheckins ausente.');
assert(firestore.includes('request.resource.data.photoIds.size() == 6'),'Regra semanal deixou de exigir 6 fotos.');
assert(firestore.includes("request.resource.data.get('requiredPhotoCount', 6) == 6"),'Regra de questionários deixou de exigir 6 fotos quando aplicável.');
assert(firestore.includes('match /trainerSupplementCatalog/{trainerUid}')&&firestore.includes('allow read: if isTrainer() && request.auth.uid == trainerUid'),'Documento usado pelo rascunho deixou de ser privado do próprio treinador.');

const storage=read('firebase/storage_5.rules');
assert(storage.includes('match /progressPhotos/{uid}/{photoId}.jpg'),'Regra de Storage para fotos principais ausente.');
assert(storage.includes('match /progressPhotoThumbs/{uid}/{photoId}.jpg'),'Regra de Storage para miniaturas ausente.');

if(fail.length){
  console.error('\nFalhas de qualidade:\n- '+fail.join('\n- '));
  process.exit(1);
}
console.log(`Quality check OK — ${walk(root).length} arquivos JavaScript verificados.`);
