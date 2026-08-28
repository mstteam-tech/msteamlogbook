import fs from 'node:fs';
import {spawnSync} from 'node:child_process';

const fail=[];
const assert=(ok,message)=>{if(!ok)fail.push(message);};
const has=(text,needle,message)=>assert(text.includes(needle),message);
const lacks=(text,needle,message)=>assert(!text.includes(needle),message);
const pdfPath='modules/pdf-export-v10_10_12.js';
const bridgePath='modules/custom-food-calorie-bridge-v10_10_12.js';
for(const file of [pdfPath,bridgePath]){
  assert(fs.existsSync(file),`Arquivo ausente: ${file}`);
  if(fs.existsSync(file)){
    const syntax=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});
    assert(syntax.status===0,`${file} possui JavaScript inválido: ${String(syntax.stderr||'').trim()}`);
  }
}
const pdf=fs.existsSync(pdfPath)?fs.readFileSync(pdfPath,'utf8'):'';
const bridge=fs.existsSync(bridgePath)?fs.readFileSync(bridgePath,'utf8'):'';
has(pdf,"const VERSION='10.10.12-pdf1'",'Gerador PDF não está na revisão esperada.');
has(pdf,"new Blob([bytes],{type:'application/pdf'})",'PDF não é gerado como application/pdf local.');
has(pdf,"window.exportWorkoutPdf=exportWorkout",'Exportação de treino não substitui o fluxo antigo.');
has(pdf,"window.exportCurrentDietPdf",'Exportação de dieta do aluno não foi exposta.');
has(pdf,"window.exportTrainerDietPdf",'Exportação de dieta pelo treinador não foi exposta.');
has(pdf,"TEAM BULLS",'Layout PDF não preserva a identidade Team Bulls.');
has(pdf,"// SURVIVAL FITNESS SYSTEM",'Layout PDF não contém assinatura visual do app.');
has(pdf,"data-tb-pdf-diet",'Botão PDF da dieta não é instalado.');
lacks(pdf,'window.open(','PDF voltou a depender de pop-up.');
lacks(pdf,'.print()','PDF voltou a depender da impressão do navegador.');
has(bridge,"const PDF_MODULE='./modules/pdf-export-v10_10_12.js?v=10.10.12-pdf1'",'Hotfix não carrega o gerador PDF nativo.');
has(bridge,'function loadPdfExporter()','Loader resiliente do PDF está ausente.');
has(bridge,'window.TeamBullsPdfExport','Loader não confirma a API do PDF.');
if(fail.length){console.error('FALHA — PDF nativo Team Bulls\n- '+fail.join('\n- '));process.exit(1);}
console.log('APROVADO — PDFs de treino/dieta são nativos, sem pop-up/print e com identidade Team Bulls.');
