import fs from 'node:fs';
import {spawnSync} from 'node:child_process';

const fail=[];
const read=path=>fs.readFileSync(path,'utf8');
const assert=(ok,message)=>{if(!ok)fail.push(message);};
const has=(text,needle,message)=>assert(text.includes(needle),message);
const lacks=(text,needle,message)=>assert(!text.includes(needle),message);

const modulePath='modules/trainer-feedback-history-v10_10_12.js';
const usabilityPath='modules/usability-checkup-v10_10_9.js';
for(const file of [modulePath,usabilityPath]){
  assert(fs.existsSync(file),`Arquivo ausente: ${file}`);
  if(fs.existsSync(file)){
    const syntax=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});
    assert(syntax.status===0,`${file} possui JavaScript inválido: ${String(syntax.stderr||'').trim()}`);
  }
}

const mod=fs.existsSync(modulePath)?read(modulePath):'';
const usability=fs.existsSync(usabilityPath)?read(usabilityPath):'';
const rules=read('firebase/firestore_28_compacto.rules');

has(mod,"const VERSION='10.10.12-feedbackhistory1'",'Histórico não possui revisão própria.');
has(mod,"db.collection('feedback').where('studentId','==',uid)",'Histórico não lê os feedbacks do aluno selecionado.');
has(mod,"String(item.trainerId||'')===String(user.uid)",'Histórico não restringe a tela aos feedbacks enviados pelo treinador autenticado.');
has(mod,"timestamp(b.createdAt)-timestamp(a.createdAt)",'Feedbacks não são ordenados do mais recente para o mais antigo.');
has(mod,"LIDO PELO ALUNO",'Histórico não mostra confirmação de leitura pelo aluno.');
has(mod,"AGUARDANDO LEITURA",'Histórico não diferencia feedback ainda não lido.');
has(mod,"feedbackType(item.feedbackType)", 'Filtro por tipo de feedback ausente.');
has(mod,"tb-feedback-history-search",'Busca por título/conteúdo ausente.');
has(mod,"Histórico de feedbacks enviados",'Acesso ao histórico não foi inserido na ficha do aluno.');
has(mod,"VER HISTÓRICO DE FEEDBACKS",'Editor de feedback não oferece acesso direto ao histórico.');
has(mod,"TeamBullsTrainerFeedbackHistory.newFeedback()",'Histórico não permite voltar ao fluxo oficial de novo feedback.');
has(mod,"navigator.clipboard?.writeText",'Histórico não permite copiar um feedback antigo.');
has(mod,"loadError='Não foi possível carregar o histórico agora.", 'Falha de rede não possui estado de erro persistente.');
lacks(mod,"cloudWrite(",'Histórico deve ser somente leitura e não pode gravar no Firestore.');
lacks(mod,".set(",'Histórico não pode criar feedbacks paralelos.');
lacks(mod,".update(",'Histórico não pode alterar feedbacks já enviados.');
lacks(mod,".delete(",'Histórico não pode apagar o registro de feedbacks.');

has(usability,"const FEEDBACK_HISTORY_MODULE='./modules/trainer-feedback-history-v10_10_12.js?v=10.10.12-feedbackhistory1'",'Camada de usabilidade não carrega o histórico.');
has(usability,'function loadTrainerFeedbackHistory()','Loader do histórico não é resiliente.');
has(usability,"new URL(script.src,location.href).pathname.endsWith('/modules/trainer-feedback-history-v10_10_12.js')",'Loader pode duplicar o módulo de histórico.');
has(usability,'loadTrainerFeedbackHistory().catch(()=>{})','Histórico não é preparado durante a instalação da usabilidade.');

has(rules,'match /feedback/{id}','Rules 28 não protegem a coleção feedback.');
has(rules,'allow read: if trainerOwns(resource.data.studentId) || activeOwner(resource.data.studentId);','Treinador vinculado não possui leitura do histórico de feedbacks.');
has(rules,'allow delete: if false;','Feedbacks deixaram de ser preservados contra exclusão.');

if(fail.length){console.error('FALHA — trainer feedback history\n- '+fail.join('\n- '));process.exit(1);}
console.log('APROVADO — histórico do treinador é somente leitura, filtrado por autor, pesquisável, mostra status de leitura e reutiliza a coleção feedback protegida pelas Rules 28.');
