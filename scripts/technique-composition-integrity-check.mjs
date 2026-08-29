import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source=fs.readFileSync('modules/technique-composition-integrity-v10_10_12.js','utf8');
const updater=fs.readFileSync('update_v10_10_9.js','utf8');
const sw=fs.readFileSync('sw.js','utf8');
const bridge=fs.readFileSync('sw_47.js','utf8');
const version=JSON.parse(fs.readFileSync('version.json','utf8'));
const document={
  readyState:'complete',
  addEventListener(){},
  querySelectorAll(){return[];},
  querySelector(){return null;},
  getElementById(){return null;},
  createElement(){return{style:{},dataset:{},classList:{toggle(){}},appendChild(){},setAttribute(){}};},
  head:{appendChild(){}},
  documentElement:{dataset:{}}
};
const window={addEventListener(){},__TEAM_BULLS_SUPERSET_INTEGRITY_1__:false};
const context={window,document,console,alert(){},requestAnimationFrame(){return 1;},cancelAnimationFrame(){},setTimeout(){return 1;},clearTimeout(){},Map,Set,Object,Array,String,Number,Math,JSON};
window.window=window;
vm.runInNewContext(source,context,{filename:'technique-composition-integrity-v10_10_12.js'});
const api=window.TeamBullsTechniqueCompositionIntegrity;
assert.ok(api,'API de integridade não foi exposta');
const plain=value=>JSON.parse(JSON.stringify(value));
const byId=(result,id)=>result.updates.find(item=>item.id===id);

// Adicionar outra técnica a um exercício já em SS não pode apagar o SS nem técnicas do parceiro.
{
  const workout={exercises:[
    {id:'A',name:'Agachamento',dayName:'Pernas',techniqueIds:['ss','mp'],optionalTechniqueIds:['mp'],supersetExerciseId:'B',weeklyTechniquePlan:{}},
    {id:'B',name:'Extensora',dayName:'Pernas',techniqueIds:['is'],optionalTechniqueIds:[],supersetExerciseId:'A',weeklyTechniquePlan:{}}
  ]};
  const old=api.normalizeConfig(workout.exercises[0]);
  const next={techniqueIds:['ss','mp','bos'],optionalTechniqueIds:['mp'],supersetExerciseId:'B'};
  const result=plain(api.computeRepair(workout,'A',old,old,next));
  assert.equal(result.error,'');
  const a=byId(result,'A'),b=byId(result,'B');
  assert.deepEqual([...a.techniqueIds].sort(),['bos','mp','ss']);
  assert.equal(a.supersetExerciseId,'B');
  assert.deepEqual([...b.techniqueIds].sort(),['is','ss']);
  assert.equal(b.supersetExerciseId,'A');
}

// Estado legado unilateral deve ser reconhecido ao editar qualquer lado do par.
{
  const workout={exercises:[
    {id:'A',dayName:'Peito',techniqueIds:['mp'],supersetExerciseId:''},
    {id:'B',dayName:'Peito',techniqueIds:['ss','is'],supersetExerciseId:'A'}
  ]};
  const resolved=plain(api.effectiveBase(workout,workout.exercises[0]));
  assert.deepEqual([...resolved.techniqueIds].sort(),['mp','ss']);
  assert.equal(resolved.supersetExerciseId,'B');
}

// Trocar o parceiro remove apenas SS do antigo e preserva todas as outras técnicas.
{
  const workout={exercises:[
    {id:'A',dayName:'Costas',techniqueIds:['ss','mp'],supersetExerciseId:'B',weeklyTechniquePlan:{}},
    {id:'B',dayName:'Costas',techniqueIds:['ss','is','bos'],supersetExerciseId:'A',weeklyTechniquePlan:{}},
    {id:'C',dayName:'Costas',techniqueIds:['mp'],optionalTechniqueIds:['mp'],supersetExerciseId:'',weeklyTechniquePlan:{}}
  ]};
  const old=api.normalizeConfig(workout.exercises[0]);
  const next={techniqueIds:['ss','mp'],optionalTechniqueIds:[],supersetExerciseId:'C'};
  const result=plain(api.computeRepair(workout,'A',old,old,next));
  const b=byId(result,'B'),c=byId(result,'C');
  assert.deepEqual([...b.techniqueIds].sort(),['bos','is']);
  assert.equal(b.supersetExerciseId,'');
  assert.deepEqual([...c.techniqueIds].sort(),['mp','ss']);
  assert.deepEqual(c.optionalTechniqueIds,['mp']);
  assert.equal(c.supersetExerciseId,'A');
}

// Semanas materializadas iguais à base antiga acompanham a nova composição; semana realmente customizada não é sobrescrita.
{
  const workout={exercises:[
    {id:'A',dayName:'Pernas',techniqueIds:['ss','mp'],supersetExerciseId:'B',weeklyTechniquePlan:{w1:{techniqueIds:['ss','mp'],supersetExerciseId:'B'},w2:{techniqueIds:['is'],supersetExerciseId:''}}},
    {id:'B',dayName:'Pernas',techniqueIds:['ss','bos'],supersetExerciseId:'A',weeklyTechniquePlan:{w1:{techniqueIds:['ss','bos'],supersetExerciseId:'A'},w2:{techniqueIds:['bos'],supersetExerciseId:''}}}
  ]};
  const old=api.normalizeConfig(workout.exercises[0]);
  const next={techniqueIds:['ss','mp','is'],optionalTechniqueIds:[],supersetExerciseId:'B'};
  const result=plain(api.computeRepair(workout,'A',old,old,next));
  assert.deepEqual(result.migratedWeeks,[1]);
  const a=byId(result,'A');
  assert.deepEqual([...a.weeklyTechniquePlan.w1.techniqueIds].sort(),['is','mp','ss']);
  assert.deepEqual(a.weeklyTechniquePlan.w2.techniqueIds,['is']);
  const b=byId(result,'B');
  assert.deepEqual([...b.weeklyTechniquePlan.w1.techniqueIds].sort(),['bos','ss']);
}

// Não roubar parceiro que já pertence a outro SS.
{
  const workout={exercises:[
    {id:'A',dayName:'Peito',techniqueIds:['mp'],supersetExerciseId:'',weeklyTechniquePlan:{}},
    {id:'B',dayName:'Peito',techniqueIds:['ss'],supersetExerciseId:'C',weeklyTechniquePlan:{}},
    {id:'C',dayName:'Peito',techniqueIds:['ss'],supersetExerciseId:'B',weeklyTechniquePlan:{}}
  ]};
  const old=api.normalizeConfig(workout.exercises[0]);
  const result=plain(api.computeRepair(workout,'A',old,old,{techniqueIds:['ss','mp'],supersetExerciseId:'B'}));
  assert.equal(result.error,'partner-busy');
  assert.equal(result.ownerId,'C');
  assert.equal(result.updates.length,0);
}

assert.match(source,/wrapSelection\('onWeekTechniqueSelectionChange'/,'proteção de seleção semanal ausente');
assert.match(source,/repairWeeklyEditorDraft/,'reparo de SS unilateral semanal ausente');
assert.match(source,/wrapPickerPreparation/,'editor base não reconhece vínculo reverso');
assert.match(source,/wrapSaveExercise/,'salvamento base não reconcilia o par');
assert.doesNotMatch(source,/eval\(/,'módulo não pode depender de eval sob CSP');

const moduleUrl='./modules/technique-composition-integrity-v10_10_12.js?v=10.10.12-techcombo1';
assert.ok(updater.includes(moduleUrl),'Atualizador não carrega a proteção de composição de técnicas.');
assert.match(updater,/loadTechniqueCompositionIntegrity/,'Atualizador não possui carregamento resiliente da proteção.');
assert.ok(sw.includes(moduleUrl)&&bridge.includes(moduleUrl),'Service Workers não preparam a proteção para uso offline.');
// O cache global pode ser rotacionado por qualquer hotfix posterior. Este teste é dono
// apenas da presença/entrega da camada de técnicas, não do nome da revisão global do PWA.
const swHotfix=sw.match(/const CACHE_HOTFIX='([^']+)'/)?.[1]||'';
const bridgeHotfix=bridge.match(/const CACHE_HOTFIX='([^']+)'/)?.[1]||'';
assert.ok(swHotfix&&swHotfix===bridgeHotfix,'Service Workers usam revisões globais de cache diferentes.');
const updaterBuild=Number(updater.match(/const CURRENT_BUILD=(\d+)/)?.[1]||0);
const swBuild=Number(sw.match(/const BUILD_REVISION=(\d+)/)?.[1]||0);
const bridgeBuild=Number(bridge.match(/const BUILD_REVISION=(\d+)/)?.[1]||0);
assert.equal(updaterBuild,version.build,'Build do atualizador não coincide com version.json.');
assert.equal(swBuild,version.build,'Build do Service Worker não coincide com version.json.');
assert.equal(bridgeBuild,version.build,'Build do Service Worker legado não coincide com version.json.');

console.log('APROVADO — Super Set permanece estável com técnicas combinadas, vínculos reversos, troca de parceiro, semanas materializadas e PWA coerente.');