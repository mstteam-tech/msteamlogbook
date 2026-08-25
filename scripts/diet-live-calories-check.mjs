import fs from 'node:fs';
import vm from 'node:vm';
import {spawnSync} from 'node:child_process';

const fail=[];
const read=path=>fs.readFileSync(path,'utf8');
const assert=(ok,message)=>{if(!ok)fail.push(message);};
const has=(text,needle,message)=>assert(text.includes(needle),message);
const lacks=(text,needle,message)=>assert(!text.includes(needle),message);
const close=(left,right)=>Math.abs(Number(left)-Number(right))<1e-9;

const modulePath='modules/diet-live-calories-v10_10_11.js';
assert(fs.existsSync(modulePath),'Módulo de calorias automáticas da dieta ausente.');
if(fs.existsSync(modulePath)){
  const syntax=spawnSync(process.execPath,['--check',modulePath],{encoding:'utf8'});
  assert(syntax.status===0,'diet-live-calories possui JavaScript inválido: '+String(syntax.stderr||'').trim());
}

const source=fs.existsSync(modulePath)?read(modulePath):'';
const config=read('config_v10_7.js');
const sw=read('sw.js');
const bridge=read('sw_47.js');
const updater=read('update_v10_10_9.js');
const version=JSON.parse(read('version.json'));

has(source,"const VERSION='10.10.11-dietcalories1'",'Módulo não possui revisão própria.');
has(source,'function analyze(text)','Analisador das porções da refeição ausente.');
has(source,'Math.round(protein*4+carbs*4+fat*9)','Cálculo energético não usa a regra 4/4/9 da tabela.');
has(source,"area.addEventListener('input',refreshMealCounter",'Total da refeição não atualiza em tempo real ao editar/adicionar porções.');
has(source,'function divisionResult()','Soma automática da divisão da dieta ausente.');
has(source,"querySelectorAll('.meal-card')",'Refeições salvas não recebem o total automático individual.');
has(source,'linha(s) digitada(s) fora da tabela não entram no cálculo automático','Interface não avisa sobre linhas sem valor conhecido.');
has(source,"replace(/porcao\\s+de\\s+carboidrato/gi,'porcao de carbo')",'Compatibilidade Carbo/Carboidrato ausente.');
lacks(source,'db.collection(','Cálculo automático não deve criar leitura/gravação Firestore.');
lacks(source,'cloudWrite(','Cálculo automático deve ser derivado localmente, sem gravação extra.');

const portionIndex=config.indexOf('diet-portion-presets-v10_10_9.js');
const personalizationIndex=config.indexOf('diet-personalization-v10_10_11.js');
const caloriesIndex=config.indexOf('diet-live-calories-v10_10_11.js?v=10.10.11-dietcalories1');
const trainingIndex=config.indexOf('training-integrity-v10_10_11.js');
assert(portionIndex>=0&&personalizationIndex>portionIndex&&caloriesIndex>personalizationIndex&&trainingIndex>caloriesIndex,'Ordem do loader não garante tabela → personalização → calorias.');
for(const [name,text] of [['sw.js',sw],['sw_47.js',bridge]])has(text,"./modules/diet-live-calories-v10_10_11.js?v=10.10.11-dietcalories1",`${name} não prepara o cálculo da dieta para uso offline.`);

const updaterBuild=Number(updater.match(/const CURRENT_BUILD=(\d+)/)?.[1]||0);
const swBuild=Number(sw.match(/const BUILD_REVISION=(\d+)/)?.[1]||0);
const bridgeBuild=Number(bridge.match(/const BUILD_REVISION=(\d+)/)?.[1]||0);
assert(version.build===2026082501&&version.revision==='diet-live-calories-1','Release da funcionalidade não está identificada em version.json.');
assert(updaterBuild===version.build&&swBuild===version.build&&bridgeBuild===version.build,'Build da dieta não está coerente entre version.json, atualizador e Service Workers.');

if(source){
  const head={appendChild(){}};
  const document={
    head,
    getElementById(){return null;},
    createElement(){return{dataset:{},className:'',id:'',textContent:'',appendChild(){},remove(){},insertAdjacentElement(){}};},
    querySelectorAll(){return[];}
  };
  const window={
    TeamBullsDietPortions:{presets:[
      {id:'carb-10',group:'carbo',label:'1 Porção de Carbo',protein:3,carbs:28,fat:0.2},
      {id:'protein-10',group:'proteina',label:'1 Porção de Proteína',protein:15.7,carbs:0,fat:1.6},
      {id:'fat-10',group:'gordura',label:'1 Porção de Gordura',protein:0,carbs:0,fat:8}
    ]}
  };
  const context={window,document,console,MEAL_CTX:{canEditContent:false},MEAL_PLAN_CACHE:{meals:[]},requestAnimationFrame:fn=>{fn();return 1;},setTimeout,clearTimeout,Intl,Map,Set,Object,Array,String,Number,Math};
  window.window=window;
  try{
    vm.runInNewContext(source,context,{filename:modulePath});
    const api=window.TeamBullsDietLiveCalories;
    assert(api&&typeof api.analyze==='function','API pública do cálculo automático não foi exposta.');
    if(api){
      const result=api.analyze('1 Porção de Carboidrato\n1 Porção de Proteína\n100g alimento digitado livremente');
      assert(result.kcal===203,'1 carbo + 1 proteína deveria totalizar 203 kcal pela tabela.');
      assert(close(result.protein,18.7)&&close(result.carbs,28)&&close(result.fat,1.8),'Macronutrientes da soma carbo + proteína estão incorretos.');
      assert(result.matched===2&&result.unknown===1&&result.totalLines===3,'Contagem de porções reconhecidas/desconhecidas está incorreta.');
      const repeated=api.analyze('1 Porção de Proteína\n1 Porção de Proteína');
      assert(repeated.kcal===154&&close(repeated.protein,31.4)&&close(repeated.fat,3.2),'Porções repetidas não são somadas corretamente.');
      const fat=api.analyze('1 Porção de Gordura');
      assert(fat.kcal===72&&close(fat.fat,8),'Porção de gordura não respeita 9 kcal/g.');
    }
  }catch(error){fail.push('Falha ao executar o analisador em ambiente isolado: '+error.message);}
}

if(fail.length){console.error('FALHA — diet live calories\n- '+fail.join('\n- '));process.exit(1);}
console.log('APROVADO — calorias/macros em tempo real, totais da divisão, avisos parciais, offline e build validados.');
