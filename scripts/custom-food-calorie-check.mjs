import fs from 'node:fs';
import {spawnSync} from 'node:child_process';

const fail=[];
const read=path=>fs.readFileSync(path,'utf8');
const assert=(ok,message)=>{if(!ok)fail.push(message);};
const has=(text,needle,message)=>assert(text.includes(needle),message);

const bridgePath='modules/release-coherence-v10_10_10.js';
const caloriesPath='modules/diet-live-calories-v10_10_11.js';
for(const file of [bridgePath,caloriesPath]){
  const syntax=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});
  assert(syntax.status===0,`${file} possui JavaScript inválido: ${String(syntax.stderr||'').trim()}`);
}
const bridge=read(bridgePath),calories=read(caloriesPath);
has(bridge,"const CUSTOM_CATALOG_COLLECTION='trainerSupplementCatalog'",'Bridge não usa o catálogo canônico do treinador.');
has(bridge,"const CUSTOM_CATALOG_FIELD='dietPortionItems'",'Bridge não lê os alimentos personalizados persistidos.');
has(bridge,'async function syncCustomFoodsFromCatalog','Bridge ainda depende apenas da tabela DOM para calorias.');
has(bridge,"db.collection(CUSTOM_CATALOG_COLLECTION).doc(uid)",'Bridge não busca o catálogo do treinador autenticado.');
has(bridge,'customFoodsFromCatalog(snap.exists?snap.data()?.[CUSTOM_CATALOG_FIELD]:[])','Macros persistidos não são convertidos em presets.');
has(bridge,'presets.filter(item=>!item?.[CUSTOM_BRIDGE_FLAG])','Presets personalizados antigos não são substituídos com segurança.');
has(bridge,"window.TeamBullsDietLiveCalories?.refresh?.()",'Totais não são recalculados após sincronizar alimento personalizado.');
has(bridge,"window.addEventListener('team-bulls-runtime-ready'",'Catálogo não sincroniza quando o runtime termina de carregar.');
has(bridge,'new MutationObserver','Alterações posteriores na tabela de alimentos não são observadas.');
has(calories,'const item=index.get(normalizeLine(line))','Calculador deixou de casar a linha da dieta com o preset.');
has(calories,'protein*4+carbs*4+fat*9','Calculador não converte P/C/G em kcal pelo fator 4/4/9.');

if(fail.length){console.error('FALHA — alimentos personalizados e calorias\n- '+fail.join('\n- '));process.exit(1);}
console.log('APROVADO — alimentos personalizados persistidos entram nos presets e recalculam kcal/macros sem depender do modal estar aberto.');
