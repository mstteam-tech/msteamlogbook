import fs from 'node:fs';
import vm from 'node:vm';
import {spawnSync} from 'node:child_process';

const failures=[];
const read=path=>fs.readFileSync(path,'utf8');
const assert=(condition,message)=>{if(!condition)failures.push(message);};
const has=(text,needle,message)=>assert(text.includes(needle),message);
const lacks=(text,needle,message)=>assert(!text.includes(needle),message);

const modulePath='modules/trainer-inbox-payments-v10_10_12.js';
const rulesPath='firebase/firestore_28_compacto.rules';
const storagePath='firebase/storage_6.rules';
for(const file of [modulePath,'config_v10_7.js','sw.js','sw_47.js','update_v10_10_9.js']){
  assert(fs.existsSync(file),`Arquivo ausente: ${file}`);
  if(fs.existsSync(file)){
    const result=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});
    assert(result.status===0,`${file} possui JavaScript inválido: ${String(result.stderr||'').trim()}`);
  }
}
assert(fs.existsSync(rulesPath),'Regras Firestore 28 ausentes.');
assert(fs.existsSync(storagePath),'Regras Storage 6 ausentes.');

const source=fs.existsSync(modulePath)?read(modulePath):'';
const rules=fs.existsSync(rulesPath)?read(rulesPath):'';
const storage=fs.existsSync(storagePath)?read(storagePath):'';
const config=read('config_v10_7.js');
const sw=read('sw.js');
const bridge=read('sw_47.js');
const updater=read('update_v10_10_9.js');
const release=read('modules/release-coherence-v10_10_10.js');
const firebaseJson=JSON.parse(read('firebase.json'));
const version=JSON.parse(read('version.json'));

has(source,"const VERSION='10.10.12-inboxpayments1'",'Módulo não possui revisão própria.');
has(source,"CURRENT_USER?.role==='trainer'",'Áreas administrativas não têm gate explícito de treinador.');
has(source,"CURRENT_USER?.role==='student'",'Hook de envio não identifica explicitamente o aluno.');
has(source,"db.collection('trainerActivity').doc(trainerUid).collection('events')",'Central não usa caixa agregada por treinador.');
has(source,".orderBy('createdAt','desc').limit(ACTIVITY_LIMIT).onSnapshot",'Central não recebe novos eventos em tempo real por uma única escuta.');
has(source,"listenerPrimed?snapshot.docChanges()",'Primeira carga da central poderia disparar notificações antigas como novas.');
has(source,"submitWeeklyCheckin.__tbTrainerInbox",'Relatório semanal não gera evento da central.');
has(source,"submitQuestionnaireAnswers.__tbTrainerInbox",'Questionário respondido não gera evento da central.');
has(source,"activityMeta(trainerUid)",'Indexação histórica não possui marcador persistente.');
has(source,"indexedVersion:ACTIVITY_INDEX_VERSION",'Indexação histórica não é marcada como concluída.');
has(source,"Math.min(4,Math.max(1,students.length))",'Backfill semanal não limita concorrência.');
has(source,"markAllRead",'Central não permite limpar a fila de não lidos.');
has(source,"viewWeeklyCheckin(doc.id)",'Central não abre relatório semanal diretamente.');
has(source,"viewQuestionnaire(doc.id,true)",'Central não abre relatório solicitado diretamente.');
has(source,"loadProtocolDue()",'Atualizações completas pendentes não entram na central.');
has(source,"RELATÓRIOS & ATUALIZAÇÕES",'Aba especializada da central não está presente.');
has(source,"PAGAMENTO",'Aba Pagamento não está presente.');
has(source,"type==='semiannual'?6:3",'Planos trimestral/semestral não mapeiam para 3/6 meses.');
has(source,"paymentCollection(trainerUid)",'Pagamentos não possuem coleção privada por treinador.');
has(source,"amountCents:Math.round(amount*100)",'Valor monetário não é persistido em centavos inteiros.');
has(source,"receiptPath:newPath||existing?.receiptPath||''",'Comprovante não é associado ao pagamento.');
has(source,"paymentReceipts/${cleanId(trainerUid)}/${cleanId(studentId)}/${cleanId(paymentId)}",'Comprovante não é separado por treinador/aluno/pagamento.');
has(source,"PAYMENT_MAX_FILE=15*1024*1024",'Limite do comprovante não está fixado em 15 MB.');
has(source,"if(['late','today','soon'].includes(status.kind))count++",'Badge financeiro não considera atrasos/vencimentos próximos.');
lacks(source,'setInterval(','Nova central não deve criar polling periódico próprio.');

has(rules,'match /trainerActivity/{trainerUid}','Regras não protegem a caixa agregada do treinador.');
has(rules,'match /events/{eventId}','Regras não isolam os eventos da caixa.');
has(rules,'activeOwner(request.resource.data.studentId)','Aluno não está limitado a criar evento para si próprio.');
has(rules,'userData(request.resource.data.studentId).trainerId == trainerUid','Aluno poderia notificar outro treinador.');
has(rules,"request.resource.data.type in ['weekly_checkin','questionnaire']",'Tipo do evento interno não está fechado.');
has(rules,'match /trainerBilling/{trainerUid}','Regras não possuem domínio financeiro privado.');
has(rules,"request.resource.data.planType in ['quarterly','semiannual']",'Plano financeiro aceita valores fora dos dois tipos pedidos.');
has(rules,'paymentReceiptPath','Firestore não valida caminho do comprovante.');
has(rules,'allow read: if isTrainer() && request.auth.uid == trainerUid;','Dados financeiros não possuem leitura exclusiva do próprio treinador.');

has(storage,'match /paymentReceipts/{trainerUid}/{studentUid}/{fileName}','Storage não isola comprovantes em domínio próprio.');
has(storage,'request.auth.uid == trainerUid','Storage não exige o próprio treinador no comprovante.');
has(storage,'trainerOwns(studentUid)','Storage não exige vínculo real do aluno.');
has(storage,'validPaymentReceipt(15 * 1024 * 1024)','Storage não limita comprovantes a 15 MB.');
lacks(storage,'activeOwner(studentUid)','Aluno recebeu regra de acesso ao comprovante financeiro.');

assert(firebaseJson?.firestore?.rules===rulesPath,'firebase.json não ativa Firestore 28.');
assert(firebaseJson?.storage?.rules===storagePath,'firebase.json não ativa Storage 6.');
has(release,"const ACTIVE_FIRESTORE_RULES='firestore_28_compacto.rules'",'Diagnóstico do app não aponta para Firestore 28.');
has(config,"trainer-inbox-payments-v10_10_12.js?v=10.10.12-inboxpayments1",'Loader não entrega a central/pagamentos.');
assert(config.indexOf('trainer-inbox-payments-v10_10_12.js')>config.indexOf('trainer-diet-workspace-v10_10_11.js'),'Central do treinador deve carregar após os módulos atuais de dieta.');
for(const [name,text] of [['sw.js',sw],['sw_47.js',bridge]]){
  has(text,"const CACHE_HOTFIX='inboxpayments1'",`${name} não invalida o shell anterior.`);
  has(text,"trainer-inbox-payments-v10_10_12.js?v=10.10.12-inboxpayments1",`${name} não prepara a central/pagamentos para o shell.`);
  has(text,'const BUILD_REVISION=2026082503',`${name} não anuncia o build da central.`);
}
has(updater,'const CURRENT_BUILD=2026082503','Atualizador não conhece o build da central.');
assert(version.build===2026082503,'version.json não possui o build da central.');
assert(version.revision==='trainer-inbox-payments-1','version.json não identifica a revisão da central.');

if(source){
  const window={};
  const document={readyState:'loading',addEventListener(){},getElementById(){return null;},querySelectorAll(){return[];}};
  const context={window,document,console,CURRENT_USER:null,MODE:'local',URL,Date,Intl,Math,Number,String,Object,Array,Map,Set,JSON,setTimeout,clearTimeout};
  window.window=window;
  try{
    vm.runInNewContext(source,context,{filename:modulePath});
    const api=window.TeamBullsTrainerHub;
    assert(api&&typeof api.addCalendarMonths==='function','API de cálculo de vencimento não foi exposta.');
    if(api){
      assert(api.addCalendarMonths('2026-01-31',3)==='2026-04-30','Trimestral de dia 31 não ajusta para o último dia do mês.');
      assert(api.addCalendarMonths('2026-08-31',6)==='2027-02-28','Semestral não respeita o calendário real.');
      assert(api.addCalendarMonths('2028-08-31',6)==='2029-02-28','Semestral atravessando ano não está correto.');
      assert(api.addCalendarMonths('2027-11-30',3)==='2028-02-29','Trimestral não respeita ano bissexto.');
    }
  }catch(error){failures.push('Falha ao carregar módulo em isolamento: '+error.message);}
}

if(failures.length){console.error('FALHA — trainer inbox/payments\n- '+failures.join('\n- '));process.exit(1);}
console.log('APROVADO — central de relatórios, notificações internas, pagamentos, vencimentos, comprovantes, privacidade e PWA validados.');
