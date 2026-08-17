import fs from 'node:fs';

const read=path=>fs.readFileSync(path,'utf8');
const fail=[];
const assert=(condition,message)=>{if(!condition)fail.push(message);};

const module=read('modules/diet-delete-fix-v10_10_9.js');
const config=read('config_v10_7.js');
const sw=read('sw.js');
const bridge=read('sw_47.js');
const core=read('app_v10_10_9_core.js');
const firestore=read('firebase/firestore_26_compacto.rules');

assert(module.includes("const VERSION='10.10.9-dietdelete1'"),'Hotfix de exclusão da dieta não identifica dietdelete1.');
assert(module.includes('window.confirmDeleteMeal=safeConfirmDeleteMeal'),'Exclusão de refeição não substitui o handler legado.');
assert(module.includes('window.deleteDietSupportItem=safeDeleteDietSupportItem'),'Exclusão de item prescrito não substitui o handler legado.');
assert(module.includes("bindButton('btn-delete-meal',safeConfirmDeleteMeal)"),'Botão de excluir refeição não é reconectado diretamente.');
assert(module.includes("bindButton('btn-delete-diet-support',safeDeleteDietSupportItem)"),'Botão de excluir item prescrito não é reconectado diretamente.');
assert(module.includes("showConfirm('Excluir refeição'")&&module.includes("showConfirm('Excluir item'"),'Confirmações de exclusão estão ausentes.');
assert(!module.includes("closeModal('modal-meal');showConfirm")&&!module.includes("closeModal('modal-diet-support');showConfirm"),'Editor voltou a fechar antes de abrir a confirmação.');
assert(module.includes('const beforeDocument=clone(DIET_DOCUMENT)'),'Exclusão não cria snapshot do documento antes de alterar.');
assert(module.includes('DIET_DOCUMENT=normalizeDietDocument(beforeDocument)'),'Rollback do documento da dieta está ausente.');
assert(module.includes('variant.meals=variant.meals.filter'),'Refeição não é removida diretamente da divisão atual.');
assert(module.includes('plan.meals=variant.meals'),'Alias legado de refeições não é sincronizado após exclusão.');
assert(module.includes("plan[section]=(plan[section]||[]).filter"),'Item prescrito não é removido da seção correta.');
assert(module.includes('await persistDietDocument()'),'Exclusões não usam a persistência oficial da dieta.');
assert(module.includes("beginAction(actionKey,'modal-meal')")&&module.includes("beginAction(actionKey,'modal-diet-support')"),'Exclusões não estão protegidas contra clique/gravação duplicada.');
assert(module.includes('sameContext(context)'),'Exclusão não revalida dieta/divisão/aluno antes de gravar.');
assert(module.includes("if(typeof closeModal==='function')closeModal('modal-meal')")&&module.includes("if(typeof closeModal==='function')closeModal('modal-diet-support')"),'Editor não fecha depois da persistência bem-sucedida.');
assert(!module.includes("db.collection("),'Hotfix não deve escrever diretamente no Firestore; deve reutilizar persistDietDocument.');
assert(!module.includes('mealCompletions')&&!module.includes('freeMealLogs')&&!module.includes('trainerSupplementCatalog')&&!module.includes("db.collection('sessions')"),'Exclusão da dieta não pode tocar históricos, refeições livres, catálogo privado ou sessões.');

const url='./modules/diet-delete-fix-v10_10_9.js?v=10.10.9-dietdelete1';
assert(config.includes(url),'Loader não inclui dietdelete1.');
assert(config.indexOf('prescription-propagation-v10_10_9.js')<config.indexOf('diet-delete-fix-v10_10_9.js'),'Hotfix da dieta deve carregar depois da propagação de prescrição.');
assert(config.indexOf('diet-delete-fix-v10_10_9.js')<config.indexOf('modal-stack-stability-v10_10_9.js'),'Hotfix da dieta deve carregar antes da proteção final de modais.');
assert(sw.includes("'"+url+"'"),'Dietdelete1 não está no REQUIRED_SHELL do PWA.');
assert(bridge.replace('ponte de migração para instalações controladas pelo antigo sw_47.js','Service Worker estável e atualização sem reinstalação')===sw,'sw_47.js divergiu do Service Worker principal após dietdelete1.');

assert(core.includes('function currentDietVariant()'),'Núcleo não possui divisão atual da dieta.');
assert(core.includes('async function persistDietDocument()'),'Persistência oficial da dieta ausente.');
assert(core.includes('let MEAL_PLAN_CACHE={meals:[]}'),'Cache de refeições esperado pelo editor ausente.');
assert(core.includes("{key:'importantSupplements',title:'Suplementos importantes'}")&&core.includes("{key:'optionalSupplements',title:'Suplementos opcionais'}")&&core.includes("{key:'hormonalProtocol',title:'Protocolo Hormonal'}"),'Seções prescritas esperadas da dieta mudaram.');
assert(firestore.includes('match /mealPlans/{uid}')&&firestore.includes('allow create, update: if trainerOwns(uid)'),'Regra de mealPlans não permite ao treinador vinculado persistir a dieta do aluno.');

if(fail.length){
  console.error('\nFalhas da exclusão da dieta:\n- '+fail.join('\n- '));
  process.exit(1);
}
console.log('Diet deletion check OK — refeição e itens prescritos com confirmação, rollback e PWA validados.');
