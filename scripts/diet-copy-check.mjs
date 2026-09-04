import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const failures=[];
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const exists=rel=>fs.existsSync(path.join(root,rel));
const assert=(condition,message)=>{if(!condition)failures.push(message);};
const has=(text,needle,message)=>assert(text.includes(needle),message);

const modulePath='modules/diet-copy-v10_10_28.js';
assert(exists(modulePath),'Módulo de cópia de dieta ausente.');
if(failures.length){console.error('\nFalhas da cópia de dieta:\n- '+failures.join('\n- '));process.exit(1);}

const source=read(modulePath),config=read('config_v10_7.js'),quality=read('.github/workflows/quality.yml'),rules=read('firebase/firestore_28_compacto.rules');

has(source,"const MAX_PLANS=40",'Cópia não respeita o limite de dietas aceito pelas regras.');
has(source,"copy.isActive=false",'A cópia pode substituir a dieta ativa do aluno.');
has(source,"copy.id=nextId()",'A dieta copiada não recebe um ID novo.');
has(source,"copy.id=nextId('variant')",'As divisões copiadas não recebem IDs novos.');
has(source,"copy.id=nextId('meal')",'As refeições copiadas não recebem IDs novos.');
has(source,"copy.doneDates=[]",'A cópia carrega marcações históricas de refeições concluídas.');
has(source,"id:nextId('diet-item')",'Itens auxiliares/suplementos da cópia não recebem IDs novos.');
has(source,"copy.variants[0].meals",'A cópia não mantém a relação canônica entre dieta e primeira divisão.');
has(source,"await persistDietDocument()",'Cópia não usa a persistência canônica da dieta.');
has(source,"DIET_DOCUMENT=typeof normalizeDietDocument==='function'?normalizeDietDocument(snapshot):snapshot",'Rollback da cópia não restaura o documento em caso de falha.');
has(source,"openEditDietModal(saved.id)",'A cópia não abre automaticamente para modificação.');
has(source,"⧉ DUPLICAR",'A ação de duplicar não está exposta na lista de dietas do treinador.');
has(source,"política de refeição livre e valores energéticos serão copiados",'A confirmação não deixa claro o escopo da cópia.');
assert(!source.includes("activateDietPlan(saved.id)")&&!source.includes("v104SyncCycleSchedule"),'A duplicação pode ativar ou realinhar o ciclo da cópia automaticamente.');

has(config,"./modules/diet-copy-v10_10_28.js?v=10.10.28-dietcopy1",'Loader não entrega a cópia de dieta com cache-busting próprio.');
has(config,"MODULE_ROOT+'diet-copy-v10_10_28.js?v=10.10.28-dietcopy1'",'Módulo de cópia não está restrito ao runtime do treinador.');
has(quality,'node scripts/diet-copy-check.mjs','Regressão da cópia de dieta não está na suíte de qualidade.');
has(rules,"request.resource.data.get('plans', []).size() <= 40",'Teste espera limite de 40 dietas nas regras ativas.');

if(failures.length){
  console.error('\nFalhas da cópia de dieta:\n- '+failures.join('\n- '));
  process.exit(1);
}
console.log('APROVADO — dieta pode ser duplicada com novos IDs, original preservada, histórico de conclusão limpo, cópia inativa e editor aberto automaticamente.');
