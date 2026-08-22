(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.TeamBullsDietMath=Object.freeze(api);
})(typeof window!=='undefined'?window:(typeof globalThis!=='undefined'?globalThis:null),function(){
  'use strict';

  const VERSION='10.10.9-dietmath1';
  const SEXES=new Set(['male','female']);
  const REFERENCE_MODES=new Set(['real','ideal','manual']);

  function finite(value,fallback=0){
    const number=Number(String(value??'').replace(',','.'));
    return Number.isFinite(number)?number:fallback;
  }
  function clamp(value,min,max){return Math.min(max,Math.max(min,value));}
  function round(value,digits=1){const scale=10**digits;return Math.round((finite(value)+Number.EPSILON)*scale)/scale;}
  function normalizeSex(value){return SEXES.has(value)?value:'male';}
  function normalizeReferenceMode(value){return REFERENCE_MODES.has(value)?value:'real';}

  function idealWeightKg(sex,heightCm){
    const normalizedSex=normalizeSex(sex);
    const meters=clamp(finite(heightCm),100,250)/100;
    return meters*meters*(normalizedSex==='female'?22.5:21.5);
  }

  function basalMetabolicRate(sex,weightKg,heightCm,ageYears){
    const normalizedSex=normalizeSex(sex);
    const weight=clamp(finite(weightKg),20,500);
    const height=clamp(finite(heightCm),100,250);
    const age=clamp(finite(ageYears),10,100);
    if(normalizedSex==='female')return 655.09+(9.563*weight)+(1.85*height)-(4.676*age);
    return 66.47+(13.75*weight)+(5*height)-(6.8*age);
  }

  function macroMetrics(macros,referenceWeightKg){
    const source=macros&&typeof macros==='object'?macros:{};
    const grams={
      animalProtein:clamp(finite(source.animalProtein),0,2000),
      plantProtein:clamp(finite(source.plantProtein),0,2000),
      carbs:clamp(finite(source.carbs),0,3000),
      fat:clamp(finite(source.fat),0,1000)
    };
    const kcal={
      animalProtein:grams.animalProtein*4,
      plantProtein:grams.plantProtein*4,
      carbs:grams.carbs*4,
      fat:grams.fat*9
    };
    const totalKcal=kcal.animalProtein+kcal.plantProtein+kcal.carbs+kcal.fat;
    const denominator=Math.max(1,finite(referenceWeightKg,1));
    const row=key=>({
      grams:round(grams[key],1),
      kcal:round(kcal[key],0),
      percent:totalKcal>0?round((kcal[key]/totalKcal)*100,1):0,
      gramsPerKg:round(grams[key]/denominator,2)
    });
    return{
      animalProtein:row('animalProtein'),
      plantProtein:row('plantProtein'),
      carbs:row('carbs'),
      fat:row('fat'),
      proteinTotalGrams:round(grams.animalProtein+grams.plantProtein,1),
      totalGrams:round(grams.animalProtein+grams.plantProtein+grams.carbs+grams.fat,1),
      totalKcal:round(totalKcal,0)
    };
  }

  function calculate(input={}){
    const sex=normalizeSex(input.sex);
    const actualWeightKg=clamp(finite(input.actualWeightKg),20,500);
    const heightCm=clamp(finite(input.heightCm),100,250);
    const ageYears=clamp(finite(input.ageYears),10,100);
    const activityFactor=clamp(finite(input.activityFactor,1.3),1,2.5);
    const referenceMode=normalizeReferenceMode(input.referenceMode);
    const ideal=idealWeightKg(sex,heightCm);
    const manual=clamp(finite(input.manualReferenceWeightKg,actualWeightKg),20,500);
    const referenceWeightKg=referenceMode==='ideal'?ideal:(referenceMode==='manual'?manual:actualWeightKg);
    const tmb=basalMetabolicRate(sex,referenceWeightKg,heightCm,ageYears);
    const baseGcd=tmb*activityFactor;
    const manualAdjustmentKcal=clamp(finite(input.manualAdjustmentKcal),-5000,5000);
    const finalGcd=Math.max(0,baseGcd+manualAdjustmentKcal);
    const macros=macroMetrics(input.macros,referenceWeightKg);
    const energyBalanceKcal=macros.totalKcal?macros.totalKcal-finalGcd:0;
    return{
      version:VERSION,
      sex,
      actualWeightKg:round(actualWeightKg,1),
      idealWeightKg:round(ideal,1),
      referenceMode,
      referenceWeightKg:round(referenceWeightKg,1),
      heightCm:round(heightCm,0),
      ageYears:round(ageYears,0),
      activityFactor:round(activityFactor,2),
      tmbKcal:round(tmb,0),
      baseGcdKcal:round(baseGcd,0),
      manualAdjustmentKcal:round(manualAdjustmentKcal,0),
      finalGcdKcal:round(finalGcd,0),
      macros,
      energyBalanceKcal:round(energyBalanceKcal,0)
    };
  }

  return{VERSION,idealWeightKg,basalMetabolicRate,macroMetrics,calculate};
});
