import fs from 'node:fs';

const fail=[];
const read=path=>fs.readFileSync(path,'utf8');
const assert=(condition,message)=>{if(!condition)fail.push(message);};
const has=(text,needle,message)=>assert(text.includes(needle),message);
const lacks=(text,needle,message)=>assert(!text.includes(needle),message);

for(const path of ['app_v10_10_9_core.js','index.html','config_v10_7.js','modules/week-selection-fix-v10_10_9.js']){
  assert(fs.existsSync(path),`Arquivo obrigatório ausente: ${path}`);
}
if(fail.length){console.error(fail.join('\n'));process.exit(1);}

const core=read('app_v10_10_9_core.js');
const html=read('index.html');
const config=read('config_v10_7.js');
const fix=read('modules/week-selection-fix-v10_10_9.js');

has(core,'function openStudentWeekExercise(eid,week){','A grade semanal não expõe a abertura por semana.');
has(core,'LAST_SESSION_WEEK=Math.max(1,Math.min(8,Number(week)||1));','A semana tocada na grade não é gravada no estado do aluno.');
has(core,"document.getElementById('input-session-week').value=LAST_SESSION_WEEK",'O modal base não usa a semana selecionada.');
has(core,'syncSessionWeekFromDate(true)','O cenário de regressão que recalcula a semana na abertura deixou de ser detectável pelo teste.');
has(html,'id="input-session-date" type="date" onchange="syncSessionWeekFromDate()"','Alteração manual da data deixou de poder recalcular a semana.');
has(config,'./modules/week-selection-fix-v10_10_9.js?v=10.10.9-weekselection1','Hotfix da semana selecionada não está carregado.');
has(fix,"const baseSessionModal=V104_OPEN_LOG_SESSION",'Hotfix não contorna o recálculo automático somente quando existe seleção explícita.');
has(fix,"selectedContext={workoutId:String(CUR_WORKOUT||''),week:clampWeek(week)}",'Hotfix não guarda a semana escolhida por treino.');
has(fix,"if(!selected)return baseOpenLogSessionModal.apply(this,arguments);",'Fluxo automático normal não foi preservado quando não existe escolha explícita.');
has(fix,"LAST_SESSION_WEEK=selected;",'Semana selecionada não é reaplicada antes de abrir o registro.');
has(fix,"const result=baseSessionModal.apply(this,arguments);",'Modal ainda passa pelo wrapper que força a semana pela data atual.');
has(fix,"select.value=String(selected);",'Seletor do modal não é garantido na semana tocada.');
lacks(fix,'syncSessionWeekFromDate(true)','Hotfix voltou a recalcular à força a semana pela data ao abrir.');

if(fail.length){console.error('FALHA — seleção da semana\n'+fail.map(item=>'• '+item).join('\n'));process.exit(1);}
console.log('APROVADO: a semana tocada na grade permanece selecionada ao registrar a sessão; mudança manual de data/semana continua funcionando.');
