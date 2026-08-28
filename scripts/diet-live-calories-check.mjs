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
const customBridgePath='modules/custom-food-calorie-bridge-v10_10_12.js';
const workspacePath='modules/trainer-diet-workspace-v10_10_11.js';
for(const file of [modulePath,customBridgePath,workspacePath]){
  assert(fs.existsSync(file),`Arquivo ausente: ${file}`);
  if(fs.existsSync(file)){
    const syntax=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});
    assert(syntax.status===0,`${file} possui JavaScript inválido: `+String(syntax.stderr||'').trim());
  }
}

const source=fs.existsSync(modulePath)?read(modulePath):'';
const customBridge=fs.existsSync(customBridgePath)?read(customBridgePath):'';
const workspace=fs.existsSync(workspacePath)?read(workspacePath):'';
const config=read('config_v10_7.js');
const sw=read('sw.js');
const bridge=read('sw_47.js');
const updater=read('update_v10_10_9.js');
const version=JSON.parse(read('version.json'));

has(source,"const VERSION='10.10.11-dietcalories2'",'Módulo não possui a revisão automática de macros.');
has(source,'function analyze(text)','Analisador das porções da refeição ausente.');
has(source,'Math.round(protein*4+carbs*4+fat*9)','Cálculo energético não usa a regra 4/4/9 da tabela.');
has(source,"area.addEventListener('input',refreshMealCounter",'Total da refeição não atualiza em tempo real ao editar/adicionar porções.');
has(source,'function divisionResult()','Soma automática da divisão da dieta ausente.');
has(source,"querySelectorAll('.meal-card')",'Refeições salvas não recebem o total automático individual.');
has(source,'linha(s) digitada(s) fora da tabela não entram no cálculo automático','Interface não avisa sobre linhas sem valor conhecido.');
has(source,"replace(/porcao\\s+de\\s+carboidrato/gi,'porcao de carbo')",'Compatibilidade Carbo/Carboidrato ausente.');
has(source,'function legacyMacroPayload(result=divisionResult())','Macros automáticos não são convertidos para o cálculo privado existente.');
has(source,"macroGrid.hidden=true",'Campos manuais de macro não são ocultados quando a dieta passa a ser a fonte.');
has(source,"title.textContent='MACRONUTRIENTES DA DIETA — AUTOMÁTICO'",'Calculadora não identifica a origem automática dos macros.');
has(source,"calculatorMacroRow('Proteína total'",'Tabela da calculadora ainda separa proteína animal/vegetal em vez do total prescrito.');
has(source,"function bodyWeightKg(body=calculatorBody())",'Cálculo não possui base explícita de peso corporal atual.');
has(source,"headers[4].textContent='G/KG CORPORAL'",'Tabela não identifica que a razão é por kg corporal.');
has(source,'gramsPerKg:weight>0?n(result.protein)/weight:0','Proteína total não calcula g/kg pelo peso corporal atual.');
has(source,'bodyWeightMacroRow(m.carbs,result.carbs,weight)','Carboidratos não calculam g/kg pelo peso corporal atual.');
has(source,'bodyWeightMacroRow(m.fat,result.fat,weight)','Gorduras não calculam g/kg pelo peso corporal atual.');
has(source,'g/kg corporal usando o peso atual do aluno','Interface não explica a base corporal do cálculo.');
has(source,'window.TeamBullsDietCalculator=Object.freeze(wrapped)','Integração não substitui com segurança a API pública da calculadora.');
has(source,'syncCalculatorMacroInputs(divisionResult())','Salvar cálculo não sincroniza os macros efetivamente prescritos.');
lacks(source,'db.collection(','Cálculo automático não deve criar leitura/gravação Firestore.');
lacks(source,'cloudWrite(','Cálculo automático deve ser derivado localmente, sem gravação extra.');

has(customBridge,"const VERSION='10.10.12-customfood2'",'Ponte de alimentos personalizados não possui revisão própria compatível.');
has(customBridge,"const COLLECTION='trainerSupplementCatalog'",'Ponte não usa o catálogo canônico do treinador.');
has(customBridge,"const FIELD='dietPortionItems'",'Ponte não lê os itens persistidos do catálogo.');
has(customBridge,"CURRENT_USER?.role==='trainer'",'Leitura do catálogo personalizado não está restrita ao treinador.');
has(customBridge,"db.collection(COLLECTION).doc(uid)",'Ponte não carrega o catálogo do treinador autenticado.');
has(customBridge,'protein:n(raw.protein)','Proteína personalizada não entra nos presets.');
has(customBridge,'carbs:n(raw.carbs)','Carboidrato personalizado não entra nos presets.');
has(customBridge,'fat:n(raw.fat)','Gordura personalizada não entra nos presets.');
has(customBridge,'presets.splice(0,presets.length,...base,...clean)','Presets personalizados não são aplicados de forma determinística.');
has(customBridge,'window.TeamBullsDietLiveCalories?.refresh?.()','Totais não são recalculados após restaurar alimentos personalizados.');
has(customBridge,'new MutationObserver','Mudanças no catálogo/refeição não restauram os presets personalizados.');
has(customBridge,"target?.closest?.('[data-custom-food-list],#tb-meal-portion-body')",'Ponte não acompanha alterações relevantes do workspace.');
lacks(customBridge,'cloudWrite(','Ponte de macros não deve gravar dados paralelos no Firestore.');

has(workspace,"const VERSION='10.10.11-dietworkspace1'",'Workspace do treinador não possui revisão própria.');
has(workspace,"CURRENT_USER?.role==='trainer'",'Workspace não está explicitamente restrito ao treinador.');
has(workspace,"MEAL_CTX?.canEditContent===true",'Workspace pode abrir sem permissão real de edição da dieta.');
has(workspace,"await persistMealPlan()",'Troca de refeição não reutiliza o salvamento oficial da dieta.');
has(workspace,"openEditMealModal(meals[targetIndex].id)",'Navegação lateral não abre a refeição vizinha pelo fluxo oficial.');
has(workspace,"openAddMealModal()",'Botão de nova refeição não reutiliza o fluxo oficial.');
has(workspace,"data-workspace-prev",'Workspace não possui ação para refeição anterior.');
has(workspace,"data-workspace-next",'Workspace não possui ação para próxima refeição.');
has(workspace,"+ NOVA REFEIÇÃO",'Workspace não permite criar refeição sem fechar o modal.');
has(workspace,"MACROS DA DIETA · AO VIVO",'Macros completos não ficam visíveis dentro do workspace.');
has(workspace,"data-workspace-foods",'Tabela de alimentos não possui coluna lateral dedicada.');
has(workspace,"foods.appendChild(tool)",'Tabela de porções não é movida para a lateral do treinador.');
has(workspace,"body.hidden=false",'Tabela lateral não abre automaticamente no planejamento.');
has(workspace,"touchstart",'Navegação por gesto lateral ausente.');
has(workspace,"dx<0?navigate(1):navigate(-1)",'Gesto lateral não troca anterior/próxima refeição.');
has(workspace,"dietTotalWithDraft()",'Resumo não inclui a refeição em edição antes de fechar/salvar.');
has(workspace,"#modal-meal.tb-trainer-diet-workspace",'CSS não está isolado ao modal do treinador.');
lacks(workspace,"db.collection(",'Workspace não deve criar nova leitura/gravação Firestore direta.');
lacks(workspace,"cloudWrite(",'Workspace deve reutilizar persistMealPlan, sem nova escrita paralela.');

const portionIndex=config.indexOf('diet-portion-presets-v10_10_9.js');
const personalizationIndex=config.indexOf('diet-personalization-v10_10_11.js');
const caloriesIndex=config.indexOf('diet-live-calories-v10_10_11.js?v=10.10.11-dietcalories2');
const trainingIndex=config.indexOf('training-integrity-v10_10_11.js');
const releaseIndex=config.indexOf('release-coherence-v10_10_10.js?v=10.10.12-release6');
const customBridgeIndex=config.indexOf('custom-food-calorie-bridge-v10_10_12.js?v=10.10.12-customfood2');
const workspaceIndex=config.indexOf('trainer-diet-workspace-v10_10_11.js?v=10.10.11-dietworkspace1');
const trainerHubIndex=config.indexOf('trainer-inbox-payments-v10_10_12.js?v=10.10.12-inboxpayments2');
assert(portionIndex>=0&&personalizationIndex>portionIndex&&caloriesIndex>personalizationIndex&&trainingIndex>caloriesIndex&&releaseIndex>trainingIndex&&customBridgeIndex>releaseIndex&&workspaceIndex>customBridgeIndex&&trainerHubIndex>workspaceIndex,'Ordem do loader não garante tabela → personalização → calorias/macros → integridade → ponte persistente → workspace → Central/Pagamentos.');
for(const [name,text] of [['sw.js',sw],['sw_47.js',bridge]]){
  has(text,"./modules/diet-live-calories-v10_10_11.js?v=10.10.11-dietcalories2",`${name} não prepara a revisão automática de macros para uso offline.`);
  has(text,"./modules/custom-food-calorie-bridge-v10_10_12.js?v=10.10.12-customfood2",`${name} não prepara alimentos personalizados para uso offline.`);
  has(text,"./modules/trainer-diet-workspace-v10_10_11.js?v=10.10.11-dietworkspace1",`${name} não prepara o workspace do treinador para uso offline.`);
}
has(updater,"./modules/custom-food-calorie-bridge-v10_10_12.js?v=10.10.12-customfood2",'Atualizador não renova a ponte de alimentos personalizados.');

const updaterBuild=Number(updater.match(/const CURRENT_BUILD=(\d+)/)?.[1]||0);
const swBuild=Number(sw.match(/const BUILD_REVISION=(\d+)/)?.[1]||0);
const bridgeBuild=Number(bridge.match(/const BUILD_REVISION=(\d+)/)?.[1]||0);
assert(version.version==='10.10.9'&&Number.isInteger(version.build)&&version.build>0,'Release pública da dieta está inválida em version.json.');
assert(updaterBuild===version.build&&swBuild===version.build&&bridgeBuild===version.build,'Build ativo não está coerente entre version.json, atualizador e Service Workers.');

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
  const context={window,document,console,MEAL_CTX:{canEditContent:false},MEAL_PLAN_CACHE:{meals:[]},requestAnimationFrame:fn=>{fn();return 1;},cancelAnimationFrame(){},setTimeout,clearTimeout,Intl,Map,Set,Object,Array,String,Number,Math};
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
      const legacy=api.legacyMacroPayload(result);
      assert(close(legacy.animalProtein,18.7)&&legacy.plantProtein===0&&close(legacy.carbs,28)&&close(legacy.fat,1.8),'Compatibilidade interna não recebe os macros derivados da dieta.');
    }
  }catch(error){fail.push('Falha ao executar o analisador em ambiente isolado: '+error.message);}
}

if(fail.length){console.error('FALHA — diet live calories/workspace\n- '+fail.join('\n- '));process.exit(1);}
console.log('APROVADO — macros em tempo real, alimentos personalizados persistidos, g/kg corporal, workspace contínuo do treinador e coerência da release PWA validados.');
