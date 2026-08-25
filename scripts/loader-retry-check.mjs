import fs from 'node:fs';

const config=fs.readFileSync('config_v10_7.js','utf8');
const release=fs.readFileSync('modules/release-coherence-v10_10_10.js','utf8');
const fail=[];
const assert=(condition,message)=>{if(!condition)fail.push(message);};

assert(config.includes('let ok=await loadScriptOnce(src,timeoutMs)'),'Loader não registra o resultado da primeira tentativa.');
assert(config.includes('if(!ok&&navigator.onLine)'),'Loader não condiciona o retry à conectividade.');
assert(config.includes('await wait(250)'),'Retry não possui pequeno espaçamento para recuperação da rede.');
assert(config.includes('ok=await loadScriptOnce(src,Math.max(6500,Number(timeoutMs)||3200))'),'Retry não amplia o timeout da segunda tentativa.');
assert(config.includes('for(const src of modules)await loadScript(src)'),'Loader perdeu a execução sequencial determinística dos módulos.');
assert(config.includes('const healFailedModules=async()=>'),'Loader não possui autorreparo após falha temporária.');
assert(config.includes('failedModules.add(src)'),'Falhas temporárias não são mantidas para nova tentativa.');
assert(/release-coherence-v10_10_10\.js\?v=10\.10\.(?:10-release1|11-release2)/.test(config),'Camada final de coerência não está carregada em revisão compatível.');
assert(config.indexOf('diet-portion-presets-v10_10_9.js')<config.indexOf('release-coherence-v10_10_10.js'),'Camada final precisa carregar depois da tabela de porções.');
assert(release.includes("replace(/firestore_26_compacto\\.rules/g,ACTIVE_FIRESTORE_RULES)"),'Mensagem legada de regra Firebase não é corrigida.');

if(fail.length){console.error('FALHA — loader retry\n- '+fail.join('\n- '));process.exit(1);}
console.log('APROVADO — retry conservador, ordem determinística e autorreparo do loader validados.');
