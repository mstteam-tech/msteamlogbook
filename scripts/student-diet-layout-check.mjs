import fs from 'node:fs';
import {spawnSync} from 'node:child_process';

const failures=[];
const assert=(condition,message)=>{if(!condition)failures.push(message);};
const read=file=>fs.readFileSync(file,'utf8');
const modulePath='modules/student-diet-layout-v10_10_24.js';
const configPath='config_v10_7.js';

for(const file of [modulePath,configPath])assert(fs.existsSync(file),`Arquivo obrigatório ausente: ${file}`);
for(const file of [modulePath,configPath]){
  if(!fs.existsSync(file))continue;
  const result=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});
  assert(result.status===0,`${file} possui JavaScript inválido: ${String(result.stderr||'').trim()}`);
}

const source=fs.existsSync(modulePath)?read(modulePath):'';
const config=fs.existsSync(configPath)?read(configPath):'';
const src='./modules/student-diet-layout-v10_10_24.js?v=10.10.24-dietlayout1';

assert(config.includes(src),'Layout da dieta não está no runtime prioritário do aluno.');
assert(config.indexOf(src)>config.indexOf('student-diet-compact-live-v10_10_23.js'),'Layout final da dieta precisa carregar depois da compactação visual.');
assert(config.indexOf(src)<config.indexOf('student-hotbar-payments-v10_10_22.js'),'Layout da dieta deve estar pronto antes dos recursos secundários da hotbar.');
assert(source.includes("const VERSION='10.10.24-dietlayout1'"),'Módulo da dieta não possui revisão própria.');
assert(source.includes("moveFreeMealBeforeSupport('diet-free-meal-policy','diet-support-tables')"),'Refeição livre do aluno não é movida para imediatamente antes dos suplementos.');
assert(source.includes("moveFreeMealBeforeSupport('ts-diet-free-meal-policy','ts-diet-support-tables')"),'Tela equivalente do treinador não preserva a mesma ordem quando o módulo estiver carregado.');
assert(source.includes('support.parentElement.insertBefore(freeMeal,support)'),'Ordem da refeição livre não usa o host oficial de suplementos como âncora.');
assert(source.includes('button[onclick*="openStretchGuide"]'),'Ação de alongamentos não é removida especificamente da orientação da dieta.');
assert(source.includes('button.remove()'),'Ação de alongamentos continua interativa no DOM da dieta.');
assert(source.includes('grid-template-columns:1fr!important'),'Instruções gerais não ocupam a largura disponível após remover Alongamentos.');
assert(source.includes('openDietDetail.__tbDietLayout101024'),'Patch não acompanha novas aberturas/renderizações da dieta.');
assert(source.includes("window.addEventListener('team-bulls-runtime-ready',sync)"),'Patch não se reaplica depois que as orientações tardias terminam de carregar.');
assert(!source.includes('MutationObserver'),'Ajuste simples de layout não deve adicionar observer.');
assert(!source.includes('setInterval('),'Ajuste simples de layout não deve adicionar polling.');
assert(!source.includes('db.collection'),'Ajuste visual não deve tocar no Firestore.');

if(failures.length){console.error('\nFALHA — layout da dieta do aluno\n- '+failures.join('\n- '));process.exit(1);}
console.log('APROVADO — Alongamentos removido da dieta e Refeição livre posicionada antes dos suplementos, sem leituras extras.');
