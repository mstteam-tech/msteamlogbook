import fs from 'node:fs';
import {spawnSync} from 'node:child_process';

const failures=[];
const assert=(condition,message)=>{if(!condition)failures.push(message);};
const read=path=>fs.readFileSync(path,'utf8');

const modulePath='modules/student-home-layout-v10_10_15.js';
const source=read(modulePath);
const index=read('index.html');
const worker=read('sw.js');

const syntax=spawnSync(process.execPath,['--check',modulePath],{encoding:'utf8'});
assert(syntax.status===0,`${modulePath} possui JavaScript inválido: ${String(syntax.stderr||'').trim()}`);

assert(index.includes('id="screen-diet-detail"'),'Tela de detalhe de suprimentos/dieta ausente.');
assert(index.includes('onclick="openFoodOptionsFromDiet()"'),'Destino canônico das opções de alimentos foi removido do detalhe da dieta.');
assert(source.includes('function patchSupplyOptionsHeader()'),'Patch visual de Opções de suprimentos ausente.');
assert(source.includes('#screen-diet-detail .header button[onclick*="openFoodOptionsFromDiet"]'),'Patch não está preso ao botão correto do cabeçalho do aluno.');
assert(source.includes("button.setAttribute('aria-label','Opções de suprimentos')"),'Atalho não possui nome acessível coerente.');
assert(source.includes("button.innerHTML=supplyOptionsIcon()+'<span>Opções de suprimentos</span>'"),'Texto visível Opções de suprimentos não está ao lado do ícone.');
assert(source.includes('function supplyOptionsIcon()'),'Ícone específico de alimento não foi definido.');
assert(source.includes('tb-supply-options-header-btn svg'),'Ícone não possui estilo vetorial coerente com a interface.');
assert(source.includes('max-width:min(190px,48vw)'),'Atalho não possui limite responsivo para preservar o título no mobile.');
assert(source.includes('ensureStudentDietLabel();patchSupplyOptionsHeader();'),'Patch não acompanha a sincronização event-driven da tela.');
assert(worker.includes("'/modules/usability-checkup-v10_10_9.js','/modules/student-home-profile-v10_10_12.js','/modules/student-home-layout-v10_10_15.js'"),'Home do aluno deixou de ser network-first no Service Worker.');

if(failures.length){
  console.error('FALHA — cabeçalho de Opções de suprimentos\n- '+failures.join('\n- '));
  process.exit(1);
}
console.log('APROVADO — botão de Opções de suprimentos mantém destino, ícone de alimento, rótulo acessível e entrega network-first.');
