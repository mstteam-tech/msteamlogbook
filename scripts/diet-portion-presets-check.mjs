import fs from 'node:fs';

const fail=[];
const read=p=>fs.readFileSync(p,'utf8');
const assert=(ok,msg)=>{if(!ok)fail.push(msg);};

const module=read('modules/diet-portion-presets-v10_10_9.js');
const config=read('config_v10_7.js');

assert(module.includes("const VERSION='10.10.10-portions1'"),'Módulo de porções não está na versão esperada.');
assert((module.match(/\{id:'/g)||[]).length===32,'A tabela pré-estabelecida deve conter exatamente 32 linhas.');
assert(module.includes("{id:'carb-10',group:'carbo',label:'1 Porção de Carbo',protein:3,carbs:28,fat:0.2}"),'1 porção de carbo não corresponde à tabela enviada.');
assert(module.includes("{id:'fruit-10',group:'fruta',label:'1 Porção de Fruta',protein:1,carbs:23.8,fat:0.1}"),'1 porção de fruta não corresponde à tabela enviada.');
assert(module.includes("{id:'protein-10',group:'proteina',label:'1 Porção de Proteína',protein:15.7,carbs:0,fat:1.6}"),'1 porção de proteína não corresponde à tabela enviada.');
assert(module.includes("{id:'fat-10',group:'gordura',label:'1 Porção de Gordura',protein:0,carbs:0,fat:8}"),'1 porção de gordura não corresponde à tabela enviada.');
assert(module.includes("{id:'tomato-240',group:'tomate',label:'240g Tomate',protein:0,carbs:6.6,fat:0}"),'240g de tomate não corresponde à tabela enviada.');
assert(module.includes("{id:'corncream-100',group:'creme',label:'100ml Creme de Milho',protein:6,carbs:11.6,fat:8.6}"),'100ml de creme de milho não corresponde à tabela enviada.');
assert(module.includes("Math.round((Number(item.protein)||0)*4+(Number(item.carbs)||0)*4+(Number(item.fat)||0)*9)"),'Kcal de referência não usa conversão 4/4/9.');
assert(module.includes("appendLine(textarea,item.label)"),'Adicionar porção deve inserir somente o rótulo da prescrição na refeição.');
assert(module.includes("navigator.clipboard?.writeText"),'A tabela deixou de oferecer cópia rápida.');
assert(module.includes("TeamBullsDietPortions.openReference()"),'A referência de porções não está acessível ao lado da calculadora.');
assert(module.includes("if(!canEditMeal()){old?.remove();return null;}"),'Atalhos de adicionar porção não estão protegidos pela edição do treinador.');
assert(!module.includes("db.collection("),'A tabela estática de porções não deve criar leituras ou gravações Firestore.');
assert(config.includes("./modules/diet-portion-presets-v10_10_9.js?v=10.10.10-portions1"),'Módulo de porções não está carregado pela configuração pública.');
assert(config.indexOf('diet-calculation-evolution-v10_10_9.js')<config.indexOf('diet-portion-presets-v10_10_9.js'),'Tabela de porções deve carregar depois da calculadora e dos hooks de dieta.');

if(fail.length){
  console.error('FALHA — diet portion presets check\n- '+fail.join('\n- '));
  process.exit(1);
}
console.log('APROVADO — tabela de porções reproduz a referência enviada e acelera a prescrição sem criar uma nova fonte de dados.');
