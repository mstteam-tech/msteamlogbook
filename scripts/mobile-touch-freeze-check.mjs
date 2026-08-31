import fs from 'node:fs';

const boot=fs.readFileSync('boot_v10.js','utf8');
const interaction=fs.readFileSync('interaction_v10_10_9.js','utf8');
const styles=fs.readFileSync('styles_v10_10_9.css','utf8');
const index=fs.readFileSync('index.html','utf8');

function assert(condition,message){
  if(!condition){
    console.error('❌ '+message);
    process.exitCode=1;
  }
}

assert(boot.includes("window.__TEAM_BULLS_INTERACTION_V10101__=true"),'boot deve desativar o IIFE legado de pull-to-refresh em mobile/coarse');
assert(boot.includes("classList.remove('pull-refresh-running')"),'boot deve remover a trava pull-refresh-running de sessões presas');
assert(boot.includes('window.__TEAM_BULLS_REFRESHING__=false'),'boot deve liberar a flag global de refresh ao restaurar interação');
assert(boot.includes("window.addEventListener('pageshow',()=>{releaseInteraction();scan();}"),'pageshow deve restaurar a interação após BFCache/reabertura');
assert(boot.includes("document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){releaseInteraction();scan();}}"),'retorno ao app deve restaurar a interação');

const bootIndex=index.indexOf('boot_v10.js');
const interactionIndex=index.indexOf('interaction_v10_10_9.js');
assert(bootIndex>=0&&interactionIndex>bootIndex,'boot precisa executar antes do script legado de interação');

// Documenta a regressão que motivou o hotfix: o legado ainda contém a trava,
// portanto a proteção de boot não pode ser removida sem antes refatorar esse fluxo.
assert(interaction.includes("classList.add('pull-refresh-running')"),'teste espera o fluxo legado conhecido para garantir que o guard continue necessário');
assert(styles.includes('html.pull-refresh-running #app{pointer-events:none;}'),'teste espera a regra legada conhecida para garantir que o guard continue necessário');

if(!process.exitCode)console.log('✅ Mobile touch freeze guard validado');
