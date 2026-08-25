(()=>{
  'use strict';
  if(window.__TEAM_BULLS_DIET_LIVE_CALORIES_101011__)return;
  window.__TEAM_BULLS_DIET_LIVE_CALORIES_101011__=true;

  const VERSION='10.10.11-dietcalories2';
  const h=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const n=value=>{const parsed=Number(String(value??'').replace(',','.'));return Number.isFinite(parsed)?parsed:0;};
  const br=(value,digits=1)=>n(value).toLocaleString('pt-BR',{minimumFractionDigits:0,maximumFractionDigits:digits});
  const editable=()=>typeof MEAL_CTX!=='undefined'&&MEAL_CTX?.canEditContent===true;
  const trainer=()=>typeof CURRENT_USER!=='undefined'&&CURRENT_USER?.role==='trainer';
  let calculatorBase=null;
  let calculatorRefreshFrame=0;

  function normalizeLine(value){
    return String(value||'')
      .normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
      .replace(/^\s*(?:[-•·]|\d+[.)])\s*/,'')
      .replace(/porcao\s+de\s+carboidrato/gi,'porcao de carbo')
      .replace(/\s+/g,' ')
      .trim().toLowerCase();
  }
  function presetList(){
    const list=window.TeamBullsDietPortions?.presets;
    return Array.isArray(list)?list.filter(item=>item&&item.id&&item.label):[];
  }
  function presetIndex(){
    const map=new Map();
    for(const item of presetList()){
      const key=normalizeLine(item.label);if(key)map.set(key,item);
      if(item.group==='carbo'){
        const oldKey=normalizeLine(String(item.label).replace(/Carboidrato/gi,'Carbo'));
        const newKey=normalizeLine(String(item.label).replace(/Carbo(?!idrato)/gi,'Carboidrato'));
        if(oldKey)map.set(oldKey,item);if(newKey)map.set(newKey,item);
      }
    }
    return map;
  }
  function rowEnergy(item){
    const protein=n(item?.protein),carbs=n(item?.carbs),fat=n(item?.fat);
    return{protein,carbs,fat,kcal:Math.round(protein*4+carbs*4+fat*9)};
  }
  function analyze(text){
    const index=presetIndex(),lines=String(text||'').split(/\r?\n/).map(line=>line.trim()).filter(Boolean);
    const total={protein:0,carbs:0,fat:0,kcal:0,matched:0,unknown:0,totalLines:lines.length};
    for(const line of lines){
      const item=index.get(normalizeLine(line));
      if(!item){total.unknown++;continue;}
      const energy=rowEnergy(item);
      total.protein+=energy.protein;total.carbs+=energy.carbs;total.fat+=energy.fat;total.kcal+=energy.kcal;total.matched++;
    }
    return total;
  }
  function combine(results){
    return results.reduce((sum,item)=>({
      protein:sum.protein+item.protein,carbs:sum.carbs+item.carbs,fat:sum.fat+item.fat,kcal:sum.kcal+item.kcal,
      matched:sum.matched+item.matched,unknown:sum.unknown+item.unknown,totalLines:sum.totalLines+item.totalLines
    }),{protein:0,carbs:0,fat:0,kcal:0,matched:0,unknown:0,totalLines:0});
  }
  function mealTotalText(result){return`${Math.round(result.kcal)} kcal · P ${br(result.protein)} g · C ${br(result.carbs)} g · G ${br(result.fat)} g`;}
  function statusText(result,{division=false}={}){
    if(!result.totalLines)return division?'Nenhum alimento cadastrado nesta divisão.':'Adicione porções pela tabela para iniciar o cálculo.';
    if(!result.matched)return 'Nenhuma linha reconhecida como porção da tabela pré-estabelecida.';
    if(result.unknown)return `${result.matched} porção(ões) contabilizada(s). ${result.unknown} linha(s) digitada(s) fora da tabela não entram no cálculo automático.`;
    return `${result.matched} porção(ões) contabilizada(s) automaticamente pela tabela.`;
  }

  function injectStyles(){
    if(document.getElementById('tb-diet-live-calories-style'))return;
    const style=document.createElement('style');style.id='tb-diet-live-calories-style';style.textContent=`
      .tb-live-energy{margin:10px 0 14px;border:1px solid rgba(34,197,94,.25);border-radius:11px;background:linear-gradient(135deg,rgba(34,197,94,.075),rgba(255,255,255,.018));padding:12px 13px}
      .tb-live-energy-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.tb-live-energy-copy{min-width:0}.tb-live-energy-kicker{display:block;font:800 8px 'DM Mono',monospace;letter-spacing:1px;color:#72d79a}.tb-live-energy-title{display:block;margin-top:3px;font:800 14px 'Barlow Condensed',sans-serif;color:#eee}
      .tb-live-energy-kcal{flex:0 0 auto;font:900 21px 'Barlow Condensed',sans-serif;color:#f5f5f5;line-height:1}.tb-live-energy-macros{display:flex;gap:6px;flex-wrap:wrap;margin-top:9px}.tb-live-energy-macros span{border:1px solid rgba(255,255,255,.08);border-radius:999px;background:rgba(0,0,0,.18);padding:5px 7px;font:700 8px 'DM Mono',monospace;color:#bbb}
      .tb-live-energy-note{display:block;margin-top:8px;color:#827a74;font-size:9px;line-height:1.45}.tb-live-energy-note.warn{color:#d5aa65}.tb-meal-live-badge{display:inline-flex;align-items:center;margin-left:auto;border:1px solid rgba(34,197,94,.22);border-radius:999px;background:rgba(34,197,94,.055);padding:4px 7px;color:#8bd5a8;font:700 7px 'DM Mono',monospace;white-space:nowrap}
      .tb-division-live-energy{margin:8px 0 12px}.tb-division-live-energy .tb-live-energy-kcal{font-size:24px}.tb-division-live-energy[data-partial="1"]{border-color:rgba(245,158,11,.27);background:linear-gradient(135deg,rgba(245,158,11,.06),rgba(255,255,255,.015))}.tb-division-live-energy[data-partial="1"] .tb-live-energy-kicker{color:#d7ae6b}
      .tb-calc-auto-macros{margin:8px 0 12px;border:1px solid rgba(34,197,94,.25);border-radius:10px;background:rgba(34,197,94,.055);padding:11px 12px}.tb-calc-auto-macros[data-partial="1"]{border-color:rgba(245,158,11,.28);background:rgba(245,158,11,.045)}.tb-calc-auto-macros strong{display:block;color:#e9f7ed;font:800 14px 'Barlow Condensed',sans-serif}.tb-calc-auto-macros small{display:block;margin-top:5px;color:#837b75;font-size:9px;line-height:1.45}.tb-calc-auto-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;margin-top:9px}.tb-calc-auto-item{padding:8px;border:1px solid rgba(255,255,255,.07);border-radius:8px;background:rgba(0,0,0,.16)}.tb-calc-auto-item span{display:block;color:#756e69;font:700 8px 'DM Mono',monospace;text-transform:uppercase}.tb-calc-auto-item b{display:block;margin-top:4px;color:#eee;font:800 16px 'Barlow Condensed',sans-serif}.tb-calc-auto-item em{display:block;margin-top:3px;color:#8bd5a8;font:700 9px 'DM Mono',monospace;font-style:normal}.tb-calc-auto-source{display:block;margin-top:7px;color:#72d79a;font:700 8px 'DM Mono',monospace;letter-spacing:.35px}.tb-calc-auto-source.warn{color:#d7ae6b}
      @media(max-width:520px){.tb-live-energy-head{align-items:flex-start}.tb-live-energy-kcal{font-size:19px}.tb-meal-live-badge{margin-left:0;margin-top:5px}.meal-card-top{flex-wrap:wrap}.tb-calc-auto-grid{grid-template-columns:1fr 1fr}}
    `;document.head.appendChild(style);
  }

  function energyCardMarkup(result,{division=false}={}){
    const partial=result.unknown>0;
    return`<div class="tb-live-energy-head"><div class="tb-live-energy-copy"><span class="tb-live-energy-kicker">${division?'TOTAL AUTOMÁTICO DA DIVISÃO':'TOTAL AUTOMÁTICO DA REFEIÇÃO'}</span><strong class="tb-live-energy-title">${division?'Soma das refeições salvas':'Porções da tabela pré-estabelecida'}</strong></div><strong class="tb-live-energy-kcal" data-tb-live-kcal>${Math.round(result.kcal)} kcal</strong></div><div class="tb-live-energy-macros"><span>P ${br(result.protein)} g</span><span>C ${br(result.carbs)} g</span><span>G ${br(result.fat)} g</span></div><small class="tb-live-energy-note${partial?' warn':''}">${h(statusText(result,{division}))}</small>`;
  }
  function ensureMealCounter(){
    injectStyles();
    const area=document.getElementById('input-meal-items');if(!area)return null;
    let card=document.getElementById('tb-live-meal-energy');
    if(!editable()){card?.remove();return null;}
    if(!card){
      card=document.createElement('section');card.id='tb-live-meal-energy';card.className='tb-live-energy';
      const anchor=document.getElementById('tb-meal-portion-tool')||area.closest('.form-group');
      if(anchor)anchor.insertAdjacentElement('afterend',card);else area.insertAdjacentElement('afterend',card);
    }
    if(area.dataset.tbLiveCaloriesBound!=='1'){
      area.dataset.tbLiveCaloriesBound='1';
      area.addEventListener('input',refreshMealCounter,{passive:true});
    }
    refreshMealCounter();return card;
  }
  function refreshMealCounter(){
    const card=document.getElementById('tb-live-meal-energy'),area=document.getElementById('input-meal-items');if(!card||!area||!editable())return;
    card.innerHTML=energyCardMarkup(analyze(area.value));
  }

  function currentMeals(){return typeof MEAL_PLAN_CACHE!=='undefined'&&Array.isArray(MEAL_PLAN_CACHE?.meals)?MEAL_PLAN_CACHE.meals:[];}
  function sortedMeals(){return[...currentMeals()].sort((a,b)=>(a?.time||'').localeCompare(b?.time||''));}
  function divisionResult(){return combine(currentMeals().map(meal=>analyze(meal?.items||'')));}
  function removeDivisionSummary(){document.querySelectorAll('.tb-division-live-energy[data-tb-list]').forEach(node=>node.remove());}
  function renderDivisionSummary(){
    injectStyles();
    if(!editable()){removeDivisionSummary();return;}
    const listId=String(MEAL_CTX?.listId||''),list=listId?document.getElementById(listId):null;if(!list)return;
    const result=divisionResult();
    let card=list.parentElement?.querySelector(`.tb-division-live-energy[data-tb-list="${CSS.escape(listId)}"]`);
    if(!card){
      card=document.createElement('section');card.className='tb-live-energy tb-division-live-energy';card.dataset.tbList=listId;
      list.insertAdjacentElement('beforebegin',card);
    }
    card.dataset.partial=result.unknown?'1':'0';card.innerHTML=energyCardMarkup(result,{division:true});
  }
  function annotateMealCards(){
    if(!editable())return;
    const listId=String(MEAL_CTX?.listId||''),list=listId?document.getElementById(listId):null;if(!list)return;
    const meals=sortedMeals(),cards=[...list.querySelectorAll('.meal-card')];
    cards.forEach((card,index)=>{
      const top=card.querySelector('.meal-card-top');if(!top)return;
      top.querySelector('.tb-meal-live-badge')?.remove();
      const result=analyze(meals[index]?.items||'');if(!result.matched)return;
      const badge=document.createElement('span');badge.className='tb-meal-live-badge';badge.textContent=`${Math.round(result.kcal)} kcal · P ${br(result.protein)} · C ${br(result.carbs)} · G ${br(result.fat)}`;badge.title=result.unknown?`${result.unknown} linha(s) fora da tabela não entram neste total.`:'Total calculado pelas porções da tabela.';top.appendChild(badge);
    });
  }

  function calculatorBody(){return document.getElementById('tb-diet-calc-body');}
  function calculatorField(body,name){return body?.querySelector?.(`[data-calc="${name}"]`)||null;}
  function calculatorNumber(body,name,fallback=0){const value=calculatorField(body,name)?.value;const parsed=n(value);return Number.isFinite(parsed)?parsed:fallback;}
  function bodyWeightKg(body=calculatorBody()){const weight=calculatorNumber(body,'actualWeightKg');return weight>0?weight:0;}
  function legacyMacroPayload(result=divisionResult()){
    return{animalProtein:n(result.protein),plantProtein:0,carbs:n(result.carbs),fat:n(result.fat)};
  }
  function syncCalculatorMacroInputs(result=divisionResult()){
    const body=calculatorBody();if(!body)return result;
    const payload=legacyMacroPayload(result);
    const values={animalProtein:payload.animalProtein,plantProtein:0,carbs:payload.carbs,fat:payload.fat};
    for(const [name,value] of Object.entries(values)){
      const input=calculatorField(body,name);if(!input)continue;
      input.value=String(value);input.dataset.tbAutoMacro='1';
    }
    return result;
  }
  function calculatorInputFromBody(body,result=divisionResult()){
    return{
      sex:String(calculatorField(body,'sex')?.value||'male'),
      actualWeightKg:calculatorNumber(body,'actualWeightKg'),
      heightCm:calculatorNumber(body,'heightCm'),
      ageYears:calculatorNumber(body,'ageYears'),
      activityFactor:calculatorNumber(body,'activityFactor',1.5),
      referenceMode:String(calculatorField(body,'referenceMode')?.value||'real'),
      manualReferenceWeightKg:calculatorNumber(body,'manualReferenceWeightKg'),
      manualAdjustmentKcal:calculatorNumber(body,'manualAdjustmentKcal'),
      macros:legacyMacroPayload(result)
    };
  }
  function calculatorAutoCardMarkup(result){
    const partial=result.unknown>0,weight=bodyWeightKg(),perKg=grams=>weight>0?n(grams)/weight:0;
    const source=partial?`${result.matched} porção(ões) somada(s); ${result.unknown} linha(s) fora da tabela não entram no total.`:`${result.matched} porção(ões) somada(s) diretamente da dieta atual.`;
    return`<strong>Macros puxados automaticamente da dieta</strong><div class="tb-calc-auto-grid"><div class="tb-calc-auto-item"><span>Proteína</span><b>${br(result.protein)} g</b><em>${weight?br(perKg(result.protein),2)+' g/kg corporal':'— g/kg corporal'}</em></div><div class="tb-calc-auto-item"><span>Carboidratos</span><b>${br(result.carbs)} g</b><em>${weight?br(perKg(result.carbs),2)+' g/kg corporal':'— g/kg corporal'}</em></div><div class="tb-calc-auto-item"><span>Gorduras</span><b>${br(result.fat)} g</b><em>${weight?br(perKg(result.fat),2)+' g/kg corporal':'— g/kg corporal'}</em></div><div class="tb-calc-auto-item"><span>Calorias</span><b>${Math.round(result.kcal)} kcal</b><em>${weight?`base: ${br(weight,1)} kg`:'peso corporal não informado'}</em></div></div><span class="tb-calc-auto-source${partial?' warn':''}">${h(source)}</span><small>Você não precisa preencher os macros manualmente. O quadro abaixo calcula gramas, kcal, percentual e g/kg corporal usando o peso atual do aluno.</small>`;
  }
  function ensureCalculatorAutoUi(result=divisionResult()){
    const body=calculatorBody();if(!body||body.dataset.ready!=='1'||body.hidden)return null;
    const macroGrid=body.querySelector('.tb-calc-grid.macros');if(macroGrid){macroGrid.hidden=true;macroGrid.style.display='none';macroGrid.setAttribute('aria-hidden','true');}
    const titles=[...body.querySelectorAll('.tb-calc-section-title')];
    const title=titles.find(node=>/MACRONUTRIENTES/i.test(String(node.textContent||'')));
    if(title)title.textContent='MACRONUTRIENTES DA DIETA — AUTOMÁTICO';
    let card=document.getElementById('tb-calc-auto-macros');
    if(!card){card=document.createElement('section');card.id='tb-calc-auto-macros';card.className='tb-calc-auto-macros';if(title)title.insertAdjacentElement('afterend',card);else body.querySelector('#tb-calc-results')?.insertAdjacentElement('beforebegin',card);}
    if(card){card.dataset.partial=result.unknown?'1':'0';card.innerHTML=calculatorAutoCardMarkup(result);}
    return card;
  }
  function calculatorMacroRow(label,row){return`<tr><td>${h(label)}</td><td>${br(row?.grams,1)}</td><td>${br(row?.kcal,0)}</td><td>${br(row?.percent,1)}%</td><td>${br(row?.gramsPerKg,2)}</td></tr>`;}
  function bodyWeightMacroRow(row,grams,weight){return{grams:n(row?.grams),kcal:n(row?.kcal),percent:n(row?.percent),gramsPerKg:weight>0?n(grams)/weight:0};}
  function rewriteCalculatorMacroTable(result=divisionResult()){
    const body=calculatorBody(),math=window.TeamBullsDietMath;if(!body||body.dataset.ready!=='1'||body.hidden||typeof math?.calculate!=='function')return null;
    const host=document.getElementById('tb-calc-results');if(!host)return null;
    const table=host.querySelector('.tb-macro-table');if(!table)return null;
    const calc=math.calculate(calculatorInputFromBody(body,result)),m=calc.macros,tbody=table.querySelector('tbody');if(!tbody)return calc;
    const weight=bodyWeightKg(body),headers=table.querySelectorAll('thead th');if(headers[4])headers[4].textContent='G/KG CORPORAL';
    const proteinRow={
      grams:n(m.animalProtein?.grams)+n(m.plantProtein?.grams),
      kcal:n(m.animalProtein?.kcal)+n(m.plantProtein?.kcal),
      percent:n(m.animalProtein?.percent)+n(m.plantProtein?.percent),
      gramsPerKg:weight>0?n(result.protein)/weight:0
    };
    const carbsRow=bodyWeightMacroRow(m.carbs,result.carbs,weight),fatRow=bodyWeightMacroRow(m.fat,result.fat,weight);
    tbody.innerHTML=`${calculatorMacroRow('Proteína total',proteinRow)}${calculatorMacroRow('Carboidratos',carbsRow)}${calculatorMacroRow('Gorduras',fatRow)}`;
    const kcalCard=[...host.querySelectorAll('.tb-calc-result')].find(node=>/Kcal dos macros/i.test(String(node.querySelector('span')?.textContent||'')));
    if(kcalCard){const strong=kcalCard.querySelector('strong');if(strong)strong.textContent=result.matched?`${Math.round(result.kcal).toLocaleString('pt-BR')} kcal`:'—';}
    body.dataset.macroKcal=String(result.matched?Math.round(result.kcal):0);body.dataset.bodyWeightKg=String(weight||0);
    return calc;
  }
  function refreshCalculatorFromDiet({callBase=true}={}){
    const body=calculatorBody();if(!trainer()||!body||body.dataset.ready!=='1'||body.hidden)return null;
    const result=syncCalculatorMacroInputs(divisionResult());ensureCalculatorAutoUi(result);
    if(callBase&&calculatorBase?.refreshResults)calculatorBase.refreshResults();
    return rewriteCalculatorMacroTable(result);
  }
  function scheduleCalculatorRefresh(){
    if(calculatorRefreshFrame)cancelAnimationFrame(calculatorRefreshFrame);
    calculatorRefreshFrame=requestAnimationFrame(()=>{calculatorRefreshFrame=0;refreshCalculatorFromDiet({callBase:true});});
  }
  function bindCalculatorBody(){
    const body=calculatorBody();if(!body||body.dataset.tbAutoDietMacrosBound==='1')return;
    body.dataset.tbAutoDietMacrosBound='1';
    body.addEventListener('input',()=>requestAnimationFrame(()=>refreshCalculatorFromDiet({callBase:false})),{passive:true});
    body.addEventListener('change',()=>requestAnimationFrame(()=>refreshCalculatorFromDiet({callBase:false})),{passive:true});
  }
  function installCalculatorIntegration(){
    const base=window.TeamBullsDietCalculator;if(!base||base.__tbAutoDietMacros)return false;
    calculatorBase=base;
    const wrapped={
      version:VERSION,
      __tbAutoDietMacros:true,
      toggle:async function(){const value=await base.toggle.apply(base,arguments);requestAnimationFrame(()=>requestAnimationFrame(()=>{bindCalculatorBody();refreshCalculatorFromDiet({callBase:true});}));return value;},
      save:async function(){syncCalculatorMacroInputs(divisionResult());return base.save.apply(base,arguments);},
      prefillGet:function(){refreshCalculatorFromDiet({callBase:true});return base.prefillGet.apply(base,arguments);},
      prefillTrainingVet:function(){refreshCalculatorFromDiet({callBase:true});return base.prefillTrainingVet.apply(base,arguments);},
      openEvolution:function(){return base.openEvolution.apply(base,arguments);},
      refreshResults:function(){bindCalculatorBody();return refreshCalculatorFromDiet({callBase:true});}
    };
    window.TeamBullsDietCalculator=Object.freeze(wrapped);return true;
  }

  function refreshSavedTotals(){requestAnimationFrame(()=>{annotateMealCards();renderDivisionSummary();scheduleCalculatorRefresh();});}

  function installHooks(){
    if(window.__TB_DIET_LIVE_CALORIES_HOOKED)return;window.__TB_DIET_LIVE_CALORIES_HOOKED=true;
    if(typeof openAddMealModal==='function'){
      const base=openAddMealModal;openAddMealModal=function(){const result=base.apply(this,arguments);requestAnimationFrame(()=>requestAnimationFrame(ensureMealCounter));return result;};
    }
    if(typeof openEditMealModal==='function'){
      const base=openEditMealModal;openEditMealModal=function(){const result=base.apply(this,arguments);requestAnimationFrame(()=>requestAnimationFrame(ensureMealCounter));return result;};
    }
    if(typeof renderMealsList==='function'){
      const base=renderMealsList;renderMealsList=function(){const result=base.apply(this,arguments);refreshSavedTotals();return result;};
    }
    if(typeof confirmLogout==='function'){
      const base=confirmLogout;confirmLogout=function(){document.getElementById('tb-live-meal-energy')?.remove();document.getElementById('tb-calc-auto-macros')?.remove();removeDivisionSummary();calculatorBase=null;return base.apply(this,arguments);};
    }
  }

  window.TeamBullsDietLiveCalories=Object.freeze({version:VERSION,analyze,division:divisionResult,legacyMacroPayload,refresh:()=>{ensureMealCounter();refreshSavedTotals();}});
  injectStyles();installHooks();installCalculatorIntegration();refreshSavedTotals();
})();