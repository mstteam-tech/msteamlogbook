import fs from 'node:fs';
import {spawnSync} from 'node:child_process';

const failures=[];
const assert=(condition,message)=>{if(!condition)failures.push(message);};
const read=file=>fs.readFileSync(file,'utf8');
const modulePath='modules/student-workout-library-v10_10_24.js';
const homePath='modules/student-home-layout-v10_10_15.js';
const configPath='config_v10_7.js';

for(const file of [modulePath,homePath,configPath])assert(fs.existsSync(file),`Arquivo obrigatório ausente: ${file}`);
for(const file of [modulePath,configPath]){
  if(!fs.existsSync(file))continue;
  const result=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});
  assert(result.status===0,`${file} possui JavaScript inválido: ${String(result.stderr||'').trim()}`);
}

const source=fs.existsSync(modulePath)?read(modulePath):'';
const home=fs.existsSync(homePath)?read(homePath):'';
const config=fs.existsSync(configPath)?read(configPath):'';
const src='./modules/student-workout-library-v10_10_24.js?v=10.10.24-workoutlibrary1';

assert(config.includes(src),'Biblioteca de treinos não está no runtime prioritário do aluno.');
assert(config.indexOf(src)>config.indexOf('student-home-layout-v10_10_15.js'),'Biblioteca precisa carregar depois da hotbar canônica para substituir somente o clique de Treino.');
assert(config.indexOf(src)<config.indexOf('student-diet-compact-live-v10_10_23.js'),'Biblioteca de treinos deve ficar disponível antes dos recursos secundários da dieta.');
assert(source.includes("const VERSION='10.10.24-workoutlibrary1'"),'Biblioteca de treinos não possui revisão própria.');
assert(source.includes("screen.id='screen-workout-library'"),'Treino ainda não possui tela própria.');
assert(source.includes("document.getElementById('workout-list')"),'Tela própria não reutiliza a lista canônica de protocolos.');
assert(source.includes('node.cloneNode(true)'),'Cards canônicos não são reaproveitados sem duplicar lógica de dados.');
assert(source.includes("document.querySelector('.tb-v17-hotbar [data-hotbar=\"workout\"]')"),'Patch não está limitado ao botão Treino da hotbar.');
assert(source.includes('const replacement=button.cloneNode(true)'),'Listener antigo de rolagem não é removido de forma determinística.');
assert(source.includes('button.replaceWith(replacement)'),'Botão antigo da hotbar continua com o listener de scroll para a Home.');
assert(source.includes("showScreen('screen-workout-library')"),'Clique de Treino não abre a nova tela dedicada.');
assert(source.includes("button.dataset.hotbar==='workout'"),'Estado ativo da hotbar não acompanha a tela dedicada.');
assert(!source.includes('scrollIntoView'),'Nova biblioteca não pode rolar a Home para localizar treinos.');
assert(!source.includes('db.collection'),'Nova tela não deve criar leituras extras do Firestore.');
assert(!source.includes('fetch('),'Nova tela não deve criar um segundo caminho de rede.');
assert(!source.includes('MutationObserver'),'Nova tela não deve criar observer global.');
assert(home.includes("/(?:workout|exercise|screen-day$|screen-day-)/.test(screen)"),'Hotbar canônica deixou de reconhecer telas cujo id contém workout.');

if(failures.length){console.error('\nFALHA — biblioteca de treinos do aluno\n- '+failures.join('\n- '));process.exit(1);}
console.log('APROVADO — Treino abre uma tela própria com todos os protocolos canônicos, sem scroll da Home nem leituras extras.');
