import fs from 'node:fs';
import {spawnSync} from 'node:child_process';

const fail=[];
const assert=(ok,message)=>{if(!ok)fail.push(message);};
const read=file=>fs.readFileSync(file,'utf8');
const modulePath='modules/weekly-report-access-v10_10_28.js';
for(const file of [modulePath,'config_v10_7.js'])assert(fs.existsSync(file),`Arquivo obrigatório ausente: ${file}`);
if(fs.existsSync(modulePath)){
  const syntax=spawnSync(process.execPath,['--check',modulePath],{encoding:'utf8'});
  assert(syntax.status===0,`Módulo de acesso semanal possui JavaScript inválido: ${String(syntax.stderr||'').trim()}`);
}
const source=fs.existsSync(modulePath)?read(modulePath):'';
const config=fs.existsSync('config_v10_7.js')?read('config_v10_7.js'):'';
const src='./modules/weekly-report-access-v10_10_28.js?v=10.10.28-weeklyaccess1';

assert(config.includes(src),'Loader não entrega o controle de relatórios semanais por aluno.');
assert(config.indexOf(src)>config.indexOf('report-schedule-consistency-v10_10_11.js'),'Controle de plano deve carregar depois da consistência do cronograma.');
assert(source.includes("const VERSION='10.10.28-weeklyaccess1'"),'Módulo não possui revisão própria.');
assert(source.includes('schedule.enabled!==false'),'Compatibilidade retroativa foi perdida: documentos antigos devem continuar ativos.');
assert(source.includes("enabled:!!nextEnabled"),'Estado ativado/desativado não é persistido no checkinSchedules.');
assert(source.includes("db.collection('checkinSchedules').doc(studentUid).set(payload,{merge:true})"),'Toggle não usa o cronograma individual existente do aluno.');
assert(source.includes("extraRequestId:nextEnabled?String(current.extraRequestId||''):''"),'Desativar não cancela solicitação extra semanal pendente.');
assert(source.includes("extraRequestedAt:nextEnabled?String(current.extraRequestedAt||''):''"),'Desativar não limpa a data da solicitação extra pendente.');
assert(source.includes("if(schedule?.enabled===false)return null"),'Cálculo do relatório ainda cria cobrança quando o recurso está desativado.');
assert(source.includes("if(card)card.style.display='none';if(banner)banner.style.display='none'"),'Card/banner semanal continuam visíveis quando o recurso está desativado.');
assert(source.includes("if(!currentStudentEnabled())return blockStudentAction()"),'Abertura/envio por chamada antiga não está protegido no aluno.');
assert(source.includes("WEEKLY_CHECKIN_REQUEST=null"),'Estado de solicitação antiga não é descartado depois de carregar um cronograma desativado.');
assert(source.includes("if(!currentTrainerEnabled()){toast('Ative os relatórios semanais antes de salvar uma programação.'"),'Treinador ainda pode programar relatório semanal com o recurso desativado.');
assert(source.includes("if(!currentTrainerEnabled()){toast('Este aluno está com relatórios semanais desativados.'"),'Treinador ainda pode pedir relatório extra com o recurso desativado.');
assert(source.includes("O histórico e relatórios personalizados continuam disponíveis"),'Interface não explica a preservação do histórico e dos relatórios personalizados.');
assert(!source.includes("db.collection('weeklyCheckins').doc(")&&!source.includes('.delete()'),'Controle de plano não pode apagar relatórios semanais históricos.');
for(const personalized of ['requestWrittenOnlyReport','requestPhotoOnlyReport','openSendQuestionnaireModal','questionnaires'])assert(!source.includes(personalized),`Controle semanal interfere indevidamente no fluxo personalizado: ${personalized}`);
assert(source.includes("buttons.guide.disabled=false"),'Guia geral de fotos não deve ser bloqueado junto com a cobrança semanal.');

if(fail.length){console.error('FALHA — acesso aos relatórios semanais por aluno\n- '+fail.join('\n- '));process.exit(1);}
console.log('APROVADO — relatórios semanais podem ser ativados/desativados por aluno; antigos seguem ativos, histórico/personalizados são preservados e ações semanais ficam bloqueadas quando fora do plano.');
