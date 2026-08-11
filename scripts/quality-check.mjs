import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const root=process.cwd();
const fail=[];
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const bytes=rel=>fs.statSync(path.join(root,rel)).size;
const requireFile=rel=>{if(!fs.existsSync(path.join(root,rel)))fail.push(`Arquivo obrigatório ausente: ${rel}`);};
const assert=(condition,message)=>{if(!condition)fail.push(message);};

[
  'index.html','manifest.json','version.json','sw.js','sw_47.js','config_v10_7.js',
  'app_v10_10_9_core.js','modules/stability_v10_10_9.js',
  'modules/app-update-v10_10_9.js','modules/diet-scroll-fix-v10_10_9.js','modules/modal-form-guard-v10_10_9.js','modules/trainer-workspace-v10_10_9.js','modules/cardio-timer-fix-v10_10_9.js','modules/global-performance-v10_10_9.js','modules/workout-ux-fix-v10_10_9.js','modules/desktop-performance-v10_10_9.js','modules/ger-bulk-v10_10_9.js','modules/prescription-actions-layout-v10_10_9.js','modules/modal-stack-stability-v10_10_9.js','modules/photo-guide-v10_10_9.js',
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

// Orçamentos amplos: alertam crescimento acidental sem bloquear evolução normal do produto.
assert(bytes('app_v10_10_9_core.js')<900*1024,'Núcleo JavaScript ultrapassou 900 KiB; revisar divisão/carregamento sob demanda.');
assert(bytes('styles_v10_10_9.css')<280*1024,'CSS principal ultrapassou 280 KiB; revisar regras duplicadas e estilos críticos.');
assert(bytes('index.html')<190*1024,'index.html ultrapassou 190 KiB; revisar HTML crítico e conteúdo injetado.');

const config=read('config_v10_7.js');
assert(config.includes('modules/stability_v10_10_9.js'),'Loader não inclui a camada de estabilidade.');
assert(config.includes('modules/app-update-v10_10_9.js'),'Loader não inclui a atualização de UX/performance.');
assert(config.includes('modules/diet-scroll-fix-v10_10_9.js'),'Loader não inclui a correção do scroll real da dieta.');
assert(config.includes('modules/modal-form-guard-v10_10_9.js'),'Loader não inclui a proteção de modais de edição.');
assert(config.includes('modules/trainer-workspace-v10_10_9.js?v=10.10.9-workspace2'),'Loader não usa cache-bust da versão otimizada do workspace.');
assert(config.includes('modules/cardio-timer-fix-v10_10_9.js'),'Loader não inclui a correção do cronômetro de cardio.');
assert(config.includes('modules/global-performance-v10_10_9.js?v=10.10.9-perf2'),'Loader não inclui a estabilização perf2 das transições de tela.');
assert(config.includes('modules/workout-ux-fix-v10_10_9.js?v=10.10.9-workout1'),'Loader não inclui a correção de scroll/touch do treino.');
assert(config.includes('modules/desktop-performance-v10_10_9.js?v=10.10.9-desktop1'),'Loader não inclui a otimização específica de desktop.');
assert(config.includes('modules/ger-bulk-v10_10_9.js?v=10.10.9-ger1'),'Loader não inclui os controles de GER em lote.');
assert(config.includes('modules/prescription-actions-layout-v10_10_9.js?v=10.10.9-actions2'),'Loader não inclui a correção actions2 das ações de prescrição.');
assert(config.includes('modules/modal-stack-stability-v10_10_9.js?v=10.10.9-modal2&fix=freeze1'),'Loader não inclui o hotfix freeze1 da recuperação de modal.');
assert(config.indexOf('global-performance-v10_10_9.js')<config.indexOf('workout-ux-fix-v10_10_9.js'),'Correção do treino precisa executar depois da camada global.');
assert(config.indexOf('workout-ux-fix-v10_10_9.js')<config.indexOf('desktop-performance-v10_10_9.js'),'Otimização desktop precisa executar depois da correção do treino.');
assert(config.indexOf('desktop-performance-v10_10_9.js')<config.indexOf('ger-bulk-v10_10_9.js'),'Controles de GER devem executar depois das camadas de UX/performance.');
assert(config.indexOf('ger-bulk-v10_10_9.js')<config.indexOf('prescription-actions-layout-v10_10_9.js'),'Organização das ações deve executar depois dos controles de GER em lote.');
assert(config.indexOf('prescription-actions-layout-v10_10_9.js')<config.indexOf('modal-stack-stability-v10_10_9.js'),'Estabilidade de modais precisa executar depois da central de ações.');
assert(config.includes("link.rel='preload';link.as='script';link.href=src"),'Hotfixes não recebem preload de rede antes da execução serial.');
assert(config.includes('for(const src of modules)await loadScript(src)'),'Execução determinística dos hotfixes foi removida.');
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

const modalStack=read('modules/modal-stack-stability-v10_10_9.js');
assert(modalStack.includes("version:'10.10.9-modal2'")&&modalStack.includes("patch:'freeze1'"),'Camada de estabilidade de modal não identifica o hotfix freeze1.');
assert(modalStack.includes('const ORPHAN_CONFIRMATIONS=2'),'Recuperação de backdrop voltou a agir após uma única detecção.');
assert(modalStack.includes('const OFFSCREEN_CONFIRMATIONS=3'),'Painel fora da área útil não exige confirmações suficientes antes da recuperação.');
assert(modalStack.includes('function panelCandidates(modal)')&&modalStack.includes("[role=\"dialog\"]"),'Detecção conservadora não aceita estruturas válidas de diálogo além de modal-sheet/modal-dialog.');
assert(modalStack.includes('function accessiblePanel(modal)')&&modalStack.includes('overlapX>24&&overlapY>24'),'Hotfix não distingue painel renderizado de painel realmente acessível.');
assert(modalStack.includes('function finishPanelAnimations(modal)')&&modalStack.includes('animation.finish()'),'Hotfix não finaliza animações de modal interrompidas.');
assert(modalStack.includes('function rescuePanelVisibility(modal)')&&modalStack.includes("panel.style.setProperty('transform','none','important')"),'Hotfix não tenta restaurar o painel antes de fechá-lo.');
assert(modalStack.includes('keyboardEditing(top)'),'Recuperação de posição não protege edição/teclado virtual.');
assert(modalStack.includes("document.hidden"),'Recuperação de modal não é suspensa enquanto a página está oculta.');
assert(!modalStack.includes("showToast('A interface foi recuperada de um bloqueio de tela."),'Aviso de recuperação de bloqueio voltou a aparecer ao usuário.');
assert(modalStack.includes('actionInProgress()'),'Recuperação de modal deixou de respeitar gravações críticas protegidas.');

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
assert(workspace.includes('const REPORT_CACHE_TTL=45000')&&workspace.includes('function cachedReports(studentUid)'),'Cache curto de relatórios do workspace não foi encontrado.');
assert(workspace.includes("loadQuickReports(true)"),'Botão Atualizar deixou de forçar consulta fresca dos relatórios.');
assert(workspace.includes("['showScreen','openModal','closeModal'].forEach(wrapUiFunction)"),'Workspace não sincroniza dock pelas funções reais de navegação/modal.');
assert(workspace.includes("observer.observe(modal,{attributes:true,attributeFilter:['class']})"),'Modais individuais não são observados para sincronizar o dock.');
assert(workspace.includes("additionsObserver.observe(document.body,{subtree:true,childList:true})"),'Workspace não acompanha modais adicionados dinamicamente.');
assert(!workspace.includes("observer.observe(document.body,{subtree:true,childList:true,attributes:true"),'Workspace voltou a observar mudanças de classe de toda a árvore do documento.');

const cardioFix=read('modules/cardio-timer-fix-v10_10_9.js');
assert(cardioFix.includes("((Number(state.endAt)||0)-Date.now())/1000"),'Cronômetro de cardio não subtrai o horário atual do endAt corretamente.');
assert(!cardioFix.includes('(Number(state.endAt)||0-Date.now())'),'Regressão de precedência do cronômetro de cardio reapareceu.');
assert(cardioFix.includes('readCardioTimer=fixedReadCardioTimer'),'Hotfix não substitui a leitura defeituosa do estado do cardio.');
assert(cardioFix.includes('ensureCardioTimerTicker=fixedEnsureCardioTimerTicker'),'Ticker otimizado do cardio não foi instalado.');
assert(cardioFix.includes('stopCardioTimerTicker()'),'Ticker do cardio não é interrompido fora da tela.');
assert(cardioFix.includes("document.addEventListener('visibilitychange',syncVisibleTimer"),'Cronômetro não sincroniza ao retornar do segundo plano.');

const performance=read('modules/global-performance-v10_10_9.js');
assert(performance.includes('touch-action:manipulation'),'Camada global não otimiza resposta de toque.');
assert(performance.includes('backdrop-filter:none!important'),'Camada móvel não reduz blur caro em GPU.');
assert(performance.includes('body::after{box-shadow:inset 0 0 58px'),'Vignette móvel não foi reduzida.');
assert(performance.includes('input[type="number"]')&&performance.includes('font-size:16px'),'Campos móveis não protegem contra zoom automático em edição.');
assert(!performance.includes('html.tb-page-hidden *{animation-play-state:paused!important}'),'Transições curtas de tela/modal não podem ser pausadas globalmente no segundo plano.');
assert(performance.includes('html.tb-page-hidden :where(.spinner,.survival-pulse,.pull-refresh-spinner){animation-play-state:paused!important}'),'Animações contínuas deixaram de ser pausadas seletivamente no segundo plano.');
assert(performance.includes("finishElementAnimations(document.querySelector('.screen.active'))"),'Tela ativa não é estabilizada ao retornar do segundo plano.');
assert(performance.includes("version:'10.10.9-perf2'"),'Camada global não identifica a revisão perf2.');
assert(performance.includes("document.addEventListener('visibilitychange',syncVisibilityState"),'Estado de visibilidade não alimenta a otimização global.');

const workoutUx=read('modules/workout-ux-fix-v10_10_9.js');
assert(workoutUx.includes("'screen-ts-workout','screen-ts-day','screen-ts-exercise'"),'Correção de scroll não cobre as telas do treinador.');
assert(workoutUx.includes('appTop:Number(app?.scrollTop||0)'),'Correção de treino não captura o scroll real do #app.');
assert(workoutUx.includes('ACTION_SCROLLS.set(key,captureScroll())'),'Gravações de treino não preservam a posição antes da escrita.');
assert(workoutUx.includes('overscroll-behavior-y:auto!important'),'Quadro semanal voltou a prender o gesto vertical no mobile.');

const desktopPerformance=read('modules/desktop-performance-v10_10_9.js');
assert(desktopPerformance.includes("const DESKTOP_MEDIA='(min-width:900px) and (pointer:fine)'"),'Otimização desktop não está isolada de telas móveis.');
assert(desktopPerformance.includes('backdrop-filter:none!important'),'Desktop ainda mantém blur caro nas superfícies principais.');
assert(desktopPerformance.includes('content-visibility:auto'),'Listas longas do desktop não usam renderização sob demanda.');
assert(desktopPerformance.includes('ChartCtor.defaults.devicePixelRatio=ratio'),'Gráficos desktop não limitam a resolução interna do canvas.');
assert(desktopPerformance.includes('ChartCtor.defaults.animation=false'),'Animação de gráficos continua consumindo CPU/GPU no desktop.');
assert(desktopPerformance.includes("image.loading='lazy'")&&desktopPerformance.includes("image.decoding='async'"),'Imagens da tela ativa não recebem carregamento/decodificação otimizada.');
assert(desktopPerformance.includes("frame.loading='lazy'")&&desktopPerformance.includes("video.preload='metadata'"),'Mídia incorporada do desktop não está sob demanda.');
assert(!desktopPerformance.includes('MutationObserver'),'Otimização desktop não deve adicionar observador permanente da árvore DOM.');

const gerBulk=read('modules/ger-bulk-v10_10_9.js');
assert(gerBulk.includes('GER S<span id="tb-ger-week-label">1</span> → TODOS EXERCÍCIOS'),'Controle de GER da semana para todos os exercícios não foi encontrado.');
assert(gerBulk.includes('GER → 8 SEMANAS DESTE EXERCÍCIO'),'Controle de GER das 8 semanas do exercício não foi encontrado.');
assert(gerBulk.includes("next['w'+week]=setsWithGer(resolved.sets,ger)"),'GER da semana não materializa somente a semana alvo quando a prescrição era herdada.');
assert(gerBulk.includes("Object.prototype.hasOwnProperty.call(next,planKey)"),'GER das 8 semanas deixou de preservar a estrutura de herança da prescrição.');
assert(gerBulk.includes("changes.forEach(change=>batch.update(db.collection('exercises').doc(change.exercise.id),{weeklyPlan:change.next}))"),'Alteração coletiva de GER não usa batch atômico do Firestore.');
assert(gerBulk.includes('changes.forEach(change=>{change.exercise.weeklyPlan=change.before;})'),'Modo local não restaura os planos se a gravação coletiva falhar.');
assert(gerBulk.includes("CURRENT_USER?.role==='trainer'"),'Controle de GER em lote não restringe a edição cloud ao treinador.');
assert(gerBulk.includes('updateEditorGer(ger)')&&!gerBulk.includes("db.collection('sessions')"),'GER em lote não deve alterar registros de sessões realizadas.');
assert(!gerBulk.includes('weeklyTechniquePlan:'),'GER em lote não pode sobrescrever técnicas semanais.');

const prescriptionActions=read('modules/prescription-actions-layout-v10_10_9.js');
assert(prescriptionActions.includes("const CENTER_ID='tb-prescription-actions-center'"),'Central organizada de ações da semana não foi encontrada.');
assert(prescriptionActions.includes("'saveAll','saveTech','removeTech','replicate','copyWeekAll','copyAllWeeks'"),'Central de ações não exige a presença dos controles principais antes de substituir o layout antigo.');
assert(prescriptionActions.includes("REQUIRED_KEYS.every(key=>actions[key])"),'Fallback do layout antigo foi removido quando algum controle esperado estiver ausente.');
assert(prescriptionActions.includes('SALVAR TODA A SEMANA')&&prescriptionActions.includes('SALVAR SOMENTE SÉRIES, REPS E GER')&&prescriptionActions.includes('SALVAR SOMENTE AS TÉCNICAS'),'Grupo Salvar não contém as três ações aprovadas.');
assert(prescriptionActions.includes('REPASSAR / APLICAR')&&prescriptionActions.includes('SÉRIES / PRESCRIÇÃO / GER')&&prescriptionActions.includes('TÉCNICAS EM LOTE'),'Ações de propagação não estão separadas por intenção.');
assert(prescriptionActions.includes('REMOVER TODAS AS TÉCNICAS')&&prescriptionActions.includes('SEM EXERCÍCIO NESTA SEMANA')&&prescriptionActions.includes('RESTAURAR TÉCNICAS AO PADRÃO'),'Grupo Limpar/Restaurar está incompleto.');
assert(prescriptionActions.includes('confirmReplicatePrescription()')&&prescriptionActions.includes('confirmCopyCurrentWeekToAllExercises()')&&prescriptionActions.includes("confirmPropagateWeekTechniques('below-current')")&&prescriptionActions.includes("confirmPropagateWeekTechniques('source-future')"),'Botões organizados não chamam diretamente os handlers reais de propagação.');
assert(prescriptionActions.includes('function fallbackOriginalClick(key)')&&prescriptionActions.includes('target.click()'),'Fallback de compatibilidade com os botões originais foi removido.');
assert(prescriptionActions.includes("db.collection('exercises').doc(exercise.id).update({weeklyPlan})"),'Salvar somente séries/reps/GER não atualiza exclusivamente weeklyPlan.');
assert(!prescriptionActions.includes("db.collection('sessions')"),'Organização de ações não pode alterar sessões realizadas.');
assert(!prescriptionActions.includes('weeklyTechniquePlan:'),'Salvar somente séries/reps/GER não pode sobrescrever técnicas semanais.');
assert(prescriptionActions.includes('exercise.weeklyPlan=previous')&&prescriptionActions.includes('if(!localSave())'),'Salvar somente séries em modo local não possui rollback em falha.');
assert(prescriptionActions.includes("#tb-ger-bulk-tools")&&prescriptionActions.includes('window.TeamBullsGerBulk?.applyWeek?.()'),'GER em lote não foi integrado à central organizada.');
assert(prescriptionActions.includes("version:'10.10.9-actions2'"),'Central organizada não identifica o hotfix actions2.');
assert(prescriptionActions.includes('@media(max-width:899px)'),'Central de ações não possui adaptação para mobile.');
assert(!prescriptionActions.includes('MutationObserver'),'Central de ações não deve adicionar observador permanente do DOM.');

const core=read('app_v10_10_9_core.js');
assert(core.includes('state.endAt=Date.now()+state.remainingSeconds*1000'),'Fluxo principal deixou de persistir endAt ao iniciar o cardio.');
assert(core.includes('function pauseCardioTimer()')&&core.includes('function resetCardioTimer()'),'Controles de pausa/reinício do cardio estão ausentes.');
assert(core.includes('function resolveWeekPrescription(exercise,week)'),'Resolução de prescrição herdada necessária ao GER em lote está ausente.');
assert(core.includes("function refreshPlanViewsAfterWeeklyTechniqueChange(exercise,week)"),'Atualização segura das telas de prescrição está ausente.');

const sw=read('sw.js');
const bridge=read('sw_47.js');
assert(sw.includes("const CACHE_REVISION='freeze1'"),'Service Worker não criou revisão de cache atômica para o hotfix de escurecimento.');
assert(sw.includes('const SHELL_FETCH_CONCURRENCY=4'),'Service Worker não limita concorrência do cache crítico.');
assert(sw.includes('async function cachePathsWithLimit'),'Service Worker não possui preparação de shell com concorrência controlada.');
assert(sw.includes("'./modules/app-update-v10_10_9.js?v=10.10.9'"),'App-update não está disponível no shell offline.');
assert(sw.includes("'./modules/diet-scroll-fix-v10_10_9.js?v=10.10.9'"),'Correção de rolagem não está disponível no shell offline.');
assert(sw.includes("'./modules/modal-form-guard-v10_10_9.js?v=10.10.9'"),'Proteção de modal não está disponível no shell offline.');
assert(sw.includes("'./modules/trainer-workspace-v10_10_9.js?v=10.10.9-workspace2'"),'Workspace otimizado não está disponível no shell offline.');
assert(sw.includes("'./modules/cardio-timer-fix-v10_10_9.js?v=10.10.9-cardio1'"),'Cronômetro corrigido não está disponível no shell offline.');
assert(sw.includes("'./modules/global-performance-v10_10_9.js?v=10.10.9-perf2'"),'Estabilização perf2 não está disponível no shell offline.');
assert(sw.includes("'./modules/workout-ux-fix-v10_10_9.js?v=10.10.9-workout1'"),'Correção de scroll/touch do treino não está disponível no shell offline.');
assert(sw.includes("'./modules/desktop-performance-v10_10_9.js?v=10.10.9-desktop1'"),'Otimização desktop não está disponível no shell offline.');
assert(sw.includes("'./modules/ger-bulk-v10_10_9.js?v=10.10.9-ger1'"),'Controles de GER em lote não estão disponíveis no shell offline.');
assert(sw.includes("'./modules/prescription-actions-layout-v10_10_9.js?v=10.10.9-actions2'"),'Hotfix actions2 da central organizada não está disponível no shell offline.');
assert(sw.includes("'./modules/modal-stack-stability-v10_10_9.js?v=10.10.9-modal2&fix=freeze1'"),'Hotfix freeze1 de modal não está disponível no shell offline.');
assert(bridge.replace('ponte de migração para instalações controladas pelo antigo sw_47.js','Service Worker estável e atualização sem reinstalação')===sw,'Ponte legada sw_47.js divergiu do Service Worker principal.');
const requiredShellBlock=sw.slice(sw.indexOf('const REQUIRED_SHELL=['),sw.indexOf('const OPTIONAL_SHELL=['));
assert(!requiredShellBlock.includes('photo-guide'),'Guia de fotos deve permanecer fora do shell crítico.');
assert(!/\.mp3/i.test(requiredShellBlock),'Áudio pesado não pode entrar no shell crítico do PWA.');

const firestore=read('firebase/firestore_26_compacto.rules');
assert(/match \/weeklyCheckins\/{id}/.test(firestore),'Regra de weeklyCheckins ausente.');
assert(firestore.includes('request.resource.data.photoIds.size() == 6'),'Regra semanal deixou de exigir 6 fotos.');
assert(firestore.includes("request.resource.data.get('requiredPhotoCount', 6) == 6"),'Regra de questionários deixou de exigir 6 fotos quando aplicável.');
assert(firestore.includes('match /trainerSupplementCatalog/{trainerUid}')&&firestore.includes('allow read: if isTrainer() && request.auth.uid == trainerUid'),'Documento usado pelo rascunho deixou de ser privado do próprio treinador.');
assert(firestore.includes('match /exercises/{id}')&&firestore.includes("request.resource.data.get('weeklyPlan', {}) is map"),'Regras de exercícios deixaram de aceitar atualização do weeklyPlan pelo treinador.');

const storage=read('firebase/storage_5.rules');
assert(storage.includes('match /progressPhotos/{uid}/{photoId}.jpg'),'Regra de Storage para fotos principais ausente.');
assert(storage.includes('match /progressPhotoThumbs/{uid}/{photoId}.jpg'),'Regra de Storage para miniaturas ausente.');

if(fail.length){
  console.error('\nFalhas de qualidade:\n- '+fail.join('\n- '));
  process.exit(1);
}
console.log(`Quality check OK — ${walk(root).length} arquivos JavaScript verificados.`);
