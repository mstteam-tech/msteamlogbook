import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const math=require('../modules/diet-calculation-math-v10_10_9.js');
const ui=fs.readFileSync(new URL('../modules/diet-calculation-evolution-v10_10_9.js',import.meta.url),'utf8');
const config=fs.readFileSync(new URL('../config_v10_7.js',import.meta.url),'utf8');
const rules=fs.readFileSync(new URL('../firebase/firestore_27_compacto.rules',import.meta.url),'utf8');
const firebaseConfig=fs.readFileSync(new URL('../firebase.json',import.meta.url),'utf8');

const close=(actual,expected,tolerance=0.001)=>assert.ok(Math.abs(actual-expected)<=tolerance,`esperado ${expected}, recebido ${actual}`);

const female=math.calculate({sex:'female',actualWeightKg:73,heightCm:170,ageYears:52,activityFactor:1.5,referenceMode:'real',macros:{animalProtein:100,plantProtein:20,carbs:200,fat:50}});
close(female.tmbKcal,1425,0.01);
close(female.baseGcdKcal,2137,0.01);
close(math.idealWeightKg('female',170),65.025,0.001);

const male=math.calculate({sex:'male',actualWeightKg:77,heightCm:182,ageYears:19,activityFactor:1.6,referenceMode:'real'});
close(male.tmbKcal,1906,0.01);
close(male.baseGcdKcal,3050,0.01);
close(math.idealWeightKg('male',182),71.2166,0.001);

const idealReference=math.calculate({sex:'male',actualWeightKg:100,heightCm:182,ageYears:30,activityFactor:1.5,referenceMode:'ideal'});
close(idealReference.referenceWeightKg,71.2,0.01);
assert.notEqual(idealReference.tmbKcal,math.calculate({sex:'male',actualWeightKg:100,heightCm:182,ageYears:30,activityFactor:1.5,referenceMode:'real'}).tmbKcal,'peso ideal precisa alterar a base da TMB');

const macros=math.macroMetrics({animalProtein:100,plantProtein:20,carbs:200,fat:50},80);
assert.equal(macros.totalKcal,1730);
close(macros.animalProtein.gramsPerKg,1.25,0.001);
close(macros.fat.kcal,450,0.001);

assert.match(ui,/const STORAGE_COLLECTION='dietCalculations'/,'cálculo privado deve usar coleção dedicada');
assert.doesNotMatch(ui,/collection\(['"]mealPlans['"]\).*set\(/s,'módulo não pode gravar cálculos internos em mealPlans');
assert.match(ui,/trainer\(\).*calculatorShell/s,'painel de cálculo deve ser condicionado ao treinador');
assert.match(ui,/fetchWeeklyCheckins/,'evolução deve reaproveitar relatórios semanais existentes');
assert.match(ui,/não cria uma segunda base de dados/,'UI deve explicar a fonte única do gráfico');
assert.match(ui,/profileCache\.clear\(\)/,'cache privado deve ser limpo ao sair da conta');
assert.match(config,/diet-calculation-math-v10_10_9\.js\?v=10\.10\.10-dietmath1/,'módulo matemático não está carregado');
assert.match(config,/diet-calculation-evolution-v10_10_9\.js\?v=10\.10\.10-dietcalc1/,'módulo visual não está carregado');
assert.match(firebaseConfig,/firestore_27_compacto\.rules/,'firebase.json não aponta para as regras novas');
assert.match(rules,/match \/dietCalculations\/\{uid\}/,'regras privadas de dietCalculations ausentes');
assert.match(rules,/allow read: if trainerOwns\(uid\)/,'leitura dos cálculos não está restrita ao treinador vinculado');
assert.doesNotMatch(rules,/match \/dietCalculations[\s\S]*activeOwner\(uid\)/,'aluno não pode receber acesso aos cálculos privados');

console.log('APROVADO — fórmulas masculina/feminina, macros, privacidade do cálculo e evolução validadas.');
