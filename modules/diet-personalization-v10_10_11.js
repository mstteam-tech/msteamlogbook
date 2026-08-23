(()=>{
  'use strict';
  if(window.__TEAM_BULLS_DIET_PERSONALIZATION_101011__)return;
  window.__TEAM_BULLS_DIET_PERSONALIZATION_101011__=true;

  const VERSION='10.10.11-dietpersonal1';
  const CATALOG_COLLECTION='trainerSupplementCatalog';
  const CATALOG_FIELD='dietPortionItems';
  const MAX_CUSTOM_ITEMS=300;
  const MAX_INSTRUCTIONS=5000;
  let catalogCache=null;
  let catalogLoading=null;
  const planCache=new Map();

  const trainer=()=>typeof CURRENT_USER!=='undefined'&&CURRENT_USER?.role==='trainer';
  const student=()=>typeof CURRENT_USER!=='undefined'&&CURRENT_USER?.role==='student';
  const h=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const num=value=>{const n=Number(String(value??'').replace(',','.'));return Number.isFinite(n)?n:0;};
  const br=value=>num(value).toLocaleString('pt-BR',{maximumFractionDigits:2});
  const kcal=item=>Math.round(num(item.protein)*4+num(item.carbs)*4+num(item.fat)*9);
  const toast=(message,error=false)=>typeof showToast==='function'?showToast(message,error):undefined;
  const serverTime=()=>firebase.firestore.FieldValue.serverTimestamp();
  const selectedDietUid=()=>String((typeof DIET_CONTEXT!=='undefined'&&DIET_CONTEXT?.targetUid)||(typeof VIEW_STUDENT!=='undefined'&&VIEW_STUDENT?.uid)||(student()&&typeof CURRENT_USER!=='undefined'&&CURRENT_USER?.uid)||'');

  function patchCarbohydrateLabels(){
    try{
      const api=window.TeamBullsDietPortions;
      if(Array.isArray(api?.presets))api.presets.forEach(item=>{if(item?.group==='carbo'&&typeof item.label==='string')item.label=item.label.replace(/Porção de Carbo(?!idrato)/g,'Porção de Carboidrato');});
      document.querySelectorAll('#tb-meal-portion-tool .tb-portion-label,#tb-portion-reference-modal .tb-portion-label').forEach(node=>{node.textContent=String(node.textContent||'').replace(/Porção de Carbo(?!idrato)/g,'Porção de Carboidrato');});
      document.querySelectorAll('#tb-meal-portion-tool .tb-portion-macro,#tb-portion-reference-modal .tb-portion-macro').forEach(node=>{if(String(node.textContent||'').trim()==='Carbo')node.textContent='Carboidrato';});
      document.querySelectorAll('#tb-meal-portion-search,#tb-reference-portion-search').forEach(input=>{input.placeholder=String(input.placeholder||'').replace(/carbo,/i,'carboidrato,');});
    }catch(error){console.warn('[Team Bulls] ajuste Carboidrato',error);}
  }

  function normalizeCustomItem(raw){
    if(!raw||typeof raw!=='object')return null;
    const id=String(raw.id||'').slice(0,80),label=String(raw.label||'').normalize('NFKC').trim().slice(0,120);if(!id||!label)return null;
    return{id,label,protein:Math.max(0,Math.min(2000,num(raw.protein))),carbs:Math.max(0,Math.min(3000,num(raw.carbs))),fat:Math.max(0,Math.min(1000,num(raw.fat)))};
  }
  function normalizedCatalog(value){const list=Array.isArray(value)?value:[],seen=new Set(),out=[];for(const raw of list){const item=normalizeCustomItem(raw);if(!item||seen.has(item.id))continue;seen.add(item.id);out.push(item);if(out.length>=MAX_CUSTOM_ITEMS)break;}return out;}
  async function loadCatalog(force=false){
    if(!trainer())return[];if(!force&&catalogCache)return catalogCache;if(!force&&catalogLoading)return catalogLoading;
    catalogLoading=(async()=>{try{const ref=db.collection(CATALOG_COLLECTION).doc(CURRENT_USER.uid),snap=typeof cloudGet==='function'?await cloudGet(ref,'alimentos personalizados da dieta'):await ref.get();catalogCache=normalizedCatalog(snap.exists?snap.data()?.[CATALOG_FIELD]:[]);}catch(error){console.error('diet custom catalog',error);catalogCache=[];toast('Não foi possível carregar seus alimentos personalizados agora.',true);}finally{catalogLoading=null;}return catalogCache;})();
    return catalogLoading;
  }
  async function persistCatalog(items){
    if(!trainer())return false;const clean=normalizedCatalog(items),payload={trainerId:CURRENT_USER.uid,[CATALOG_FIELD]:clean,updatedAt:serverTime()};
    try{const task=db.collection(CATALOG_COLLECTION).doc(CURRENT_USER.uid).set(payload,{merge:true});if(typeof cloudWrite==='function')await cloudWrite(task,'salvar alimento personalizado');else await task;catalogCache=clean;return true;}catch(error){toast(typeof cloudWriteError==='function'?cloudWriteError(error,'salvar o alimento personalizado'):'Falha ao salvar alimento.',true);return false;}
  }
  function customId(){try{return'diet-'+(crypto.randomUUID?.()||Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,9));}catch(error){return'diet-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,9);}}
  function customRows(mode='add'){
    const list=catalogCache||[];if(!list.length)return'<div class="tb-custom-empty">Nenhum alimento personalizado cadastrado.</div>';
    return`<div class="tb-custom-scroll"><table class="tb-custom-table"><thead><tr><th>Prescrição</th><th>P</th><th>C</th><th>G</th><th>kcal</th><th>Ações</th></tr></thead><tbody>${list.map(item=>`<tr><td>${h(item.label)}</td><td>${br(item.protein)}</td><td>${br(item.carbs)}</td><td>${br(item.fat)}</td><td>${kcal(item)}</td><td><div class="tb-custom-actions">${mode==='add'?`<button type="button" onclick="TeamBullsDietPersonalization.addCustom('${h(item.id)}')">ADICIONAR</button>`:''}<button type="button" onclick="TeamBullsDietPersonalization.copyCustom('${h(item.id)}')">COPIAR</button><button type="button" onclick="TeamBullsDietPersonalization.editCustom('${h(item.id)}')">EDITAR</button><button type="button" class="danger" onclick="TeamBullsDietPersonalization.removeCustom('${h(item.id)}')">EXCLUIR</button></div></td></tr>`).join('')}</tbody></table></div>`;
  }
  function appendLine(text){const area=document.getElementById('input-meal-items');if(!area)return false;const current=String(area.value||'').trimEnd(),next=(current?current+'\n':'')+text,max=Number(area.maxLength)||5000;if(next.length>max){toast('A refeição atingiu o limite de texto.',true);return false;}area.value=next;area.dispatchEvent(new Event('input',{bubbles:true}));area.focus();return true;}
  function findCustom(id){return(catalogCache||[]).find(item=>item.id===id)||null;}
  async function copyText(text){try{if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(text);return true;}}catch(error){}return false;}
  function addCustom(id){const item=findCustom(id);if(item&&appendLine(item.label))toast('✓ '+item.label+' adicionado à refeição');}
  async function copyCustom(id){const item=findCustom(id);if(!item)return;const ok=await copyText(item.label);toast(ok?'✓ Alimento copiado':'Não foi possível copiar.',!ok);}

  function ensureCustomEditor(){
    let modal=document.getElementById('tb-custom-food-modal');if(modal)return modal;
    modal=document.createElement('div');modal.id='tb-custom-food-modal';modal.className='modal-backdrop';
    modal.innerHTML=`<div class="modal-sheet"><div class="modal-handle"></div><div class="modal-title">Alimento personalizado</div><input id="tb-custom-food-id" type="hidden"><div class="form-group"><label class="form-label">Nome / prescrição</label><input class="form-input" id="tb-custom-food-label" maxlength="120" placeholder="Ex.: 150g Iogurte natural"></div><div class="tb-custom-grid"><div class="form-group"><label class="form-label">Proteína (g)</label><input class="form-input" id="tb-custom-food-protein" type="number" min="0" max="2000" step="0.1"></div><div class="form-group"><label class="form-label">Carboidrato (g)</label><input class="form-input" id="tb-custom-food-carbs" type="number" min="0" max="3000" step="0.1"></div><div class="form-group"><label class="form-label">Gordura (g)</label><input class="form-input" id="tb-custom-food-fat" type="number" min="0" max="1000" step="0.1"></div></div><div class="plan-help">O nome é livre. P/C/G são referências opcionais e as kcal são calculadas automaticamente por 4/4/9.</div><button class="btn-primary" type="button" onclick="TeamBullsDietPersonalization.saveCustom()">SALVAR NA MINHA TABELA</button><button class="btn-ghost" type="button" onclick="closeModal('tb-custom-food-modal')">CANCELAR</button></div>`;
    document.body.appendChild(modal);return modal;
  }
  function openCustomEditor(id=''){if(!trainer())return;const modal=ensureCustomEditor(),item=findCustom(id);modal.querySelector('#tb-custom-food-id').value=item?.id||'';modal.querySelector('#tb-custom-food-label').value=item?.label||'';modal.querySelector('#tb-custom-food-protein').value=item?.protein||'';modal.querySelector('#tb-custom-food-carbs').value=item?.carbs||'';modal.querySelector('#tb-custom-food-fat').value=item?.fat||'';if(typeof openModal==='function')openModal(modal.id);else modal.classList.add('open');}
  async function saveCustom(){
    if(!trainer())return;const id=String(document.getElementById('tb-custom-food-id')?.value||'')||customId(),label=String(document.getElementById('tb-custom-food-label')?.value||'').normalize('NFKC').trim().slice(0,120);if(!label){toast('Informe o nome do alimento.',true);return;}
    const item=normalizeCustomItem({id,label,protein:num(document.getElementById('tb-custom-food-protein')?.value),carbs:num(document.getElementById('tb-custom-food-carbs')?.value),fat:num(document.getElementById('tb-custom-food-fat')?.value)}),next=[...(catalogCache||[])],index=next.findIndex(row=>row.id===id);if(index>=0)next[index]=item;else next.push(item);if(next.length>MAX_CUSTOM_ITEMS){toast('Limite de 300 alimentos personalizados atingido.',true);return;}if(await persistCatalog(next)){closeModal('tb-custom-food-modal');renderCustomSections();toast('✓ Alimento salvo na sua tabela');}
  }
  async function removeCustom(id){const item=findCustom(id);if(!item||!trainer())return;if(!confirm(`Excluir "${item.label}" da sua tabela?`))return;if(await persistCatalog((catalogCache||[]).filter(row=>row.id!==id))){renderCustomSections();toast('Alimento removido.');}}

  function customSection(mode){return`<section class="tb-custom-foods" data-custom-food-mode="${mode}"><div class="tb-custom-head"><div><strong>MEUS ALIMENTOS</strong><small>Cadastre qualquer nome e reutilize em todas as dietas.</small></div><button type="button" onclick="TeamBullsDietPersonalization.newCustom()">+ NOVO ALIMENTO</button></div><div data-custom-food-list>${customRows(mode)}</div></section>`;}
  async function ensureCustomSections(){if(!trainer())return;await loadCatalog();patchCarbohydrateLabels();const mealBody=document.getElementById('tb-meal-portion-body');if(mealBody&&!mealBody.querySelector('[data-custom-food-mode="add"]'))mealBody.insertAdjacentHTML('beforeend',customSection('add'));const ref=document.querySelector('#tb-portion-reference-modal .modal-sheet');if(ref&&!ref.querySelector('[data-custom-food-mode="copy"]')){const close=ref.querySelector('.btn-ghost:last-child');if(close)close.insertAdjacentHTML('beforebegin',customSection('copy'));else ref.insertAdjacentHTML('beforeend',customSection('copy'));}}
  function renderCustomSections(){document.querySelectorAll('[data-custom-food-mode]').forEach(section=>{const mode=section.dataset.customFoodMode||'copy',host=section.querySelector('[data-custom-food-list]');if(host)host.innerHTML=customRows(mode);});patchCarbohydrateLabels();}

  async function readPlan(uid,force=false){if(!uid||typeof db==='undefined'||!db)return null;if(!force&&planCache.has(uid))return planCache.get(uid);try{const ref=db.collection('mealPlans').doc(uid),snap=typeof cloudGet==='function'?await cloudGet(ref,'instruções individuais da dieta'):await ref.get(),data=snap.exists?{...snap.data(),_exists:true}:{plans:[],meals:[],_exists:false};planCache.set(uid,data);return data;}catch(error){console.error('diet instructions',error);return null;}}
  function instructionCard(uid,trainerMode,text=''){
    if(trainerMode)return`<section class="tb-diet-individual" id="tb-diet-individual-instructions" data-student-uid="${h(uid)}"><span>INDIVIDUALIDADE DO ALUNO</span><strong>Instruções específicas da dieta</strong><textarea id="tb-diet-individual-text" maxlength="${MAX_INSTRUCTIONS}" rows="5" placeholder="Ex.: horários, tolerâncias, rotina, estratégia para refeições fora, observações específicas...">${h(text)}</textarea><div class="tb-diet-individual-actions"><small>Visível somente para este aluno na própria dieta.</small><button type="button" onclick="TeamBullsDietPersonalization.saveInstructions()">SALVAR INSTRUÇÕES</button></div></section>`;
    if(!String(text||'').trim())return'';return`<section class="tb-diet-individual student" id="tb-diet-individual-instructions"><span>INSTRUÇÕES INDIVIDUAIS</span><strong>Orientações específicas da sua dieta</strong><div class="tb-diet-individual-copy">${h(text).replace(/\n/g,'<br>')}</div></section>`;
  }
  function dietScreen(trainerMode){const explicit=document.getElementById(trainerMode?'screen-ts-diet-detail':'screen-diet-detail');if(explicit)return explicit;const active=document.querySelector('.screen.active');return active&&/diet/i.test(active.id||'')?active:null;}
  function insertInstructionCard(screen,html){document.getElementById('tb-diet-individual-instructions')?.remove();if(!screen||!html)return;const card=document.createElement('div');card.innerHTML=html;const node=card.firstElementChild,anchor=screen.querySelector('#ts-diet-energy-summary,#diet-energy-summary,.diet-energy-summary,.diet-plan-list,.section-header');if(anchor)anchor.insertAdjacentElement('beforebegin',node);else screen.appendChild(node);}
  async function renderInstructions(trainerMode=false){const uid=trainerMode?selectedDietUid():String(CURRENT_USER?.uid||'');if(!uid)return;const data=await readPlan(uid);if((trainerMode&&selectedDietUid()!==uid)||(!trainerMode&&String(CURRENT_USER?.uid||'')!==uid))return;insertInstructionCard(dietScreen(trainerMode),instructionCard(uid,trainerMode,String(data?.individualInstructions||'')));}
  async function saveInstructions(){
    if(!trainer())return;const uid=String(document.getElementById('tb-diet-individual-instructions')?.dataset.studentUid||selectedDietUid()),text=String(document.getElementById('tb-diet-individual-text')?.value||'').normalize('NFKC').trim();if(!uid)return;if(text.length>MAX_INSTRUCTIONS){toast('As instruções ultrapassam 5.000 caracteres.',true);return;}
    const existing=await readPlan(uid),payload={individualInstructions:text,updatedAt:serverTime()};if(!existing?._exists){payload.plans=[];payload.meals=[];}
    try{const task=db.collection('mealPlans').doc(uid).set(payload,{merge:true});if(typeof cloudWrite==='function')await cloudWrite(task,'salvar instruções individuais da dieta');else await task;planCache.set(uid,{...(existing||{}),...payload,_exists:true});toast('✓ Instruções individuais salvas');}catch(error){toast(typeof cloudWriteError==='function'?cloudWriteError(error,'salvar as instruções individuais'):'Falha ao salvar instruções.',true);}
  }

  function injectStyles(){if(document.getElementById('tb-diet-personalization-style'))return;const style=document.createElement('style');style.id='tb-diet-personalization-style';style.textContent=`.tb-custom-foods{margin:12px 0 2px;padding:10px;border:1px solid rgba(255,255,255,.08);border-radius:9px;background:#0d0d0d}.tb-custom-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px}.tb-custom-head strong{display:block;color:#eee;font:800 10px 'DM Mono',monospace;letter-spacing:.7px}.tb-custom-head small{display:block;margin-top:3px;color:#756d67;font-size:9px}.tb-custom-head button,.tb-custom-actions button,.tb-diet-individual button{border:1px solid rgba(225,29,72,.42);background:rgba(225,29,72,.1);color:#ff7890;border-radius:7px;padding:7px 8px;font:800 8px 'DM Mono',monospace;cursor:pointer}.tb-custom-scroll{overflow:auto;max-height:245px}.tb-custom-table{width:100%;min-width:520px;border-collapse:collapse}.tb-custom-table th,.tb-custom-table td{padding:7px;border-bottom:1px solid rgba(255,255,255,.06);font-size:9px;text-align:right}.tb-custom-table th:first-child,.tb-custom-table td:first-child{text-align:left}.tb-custom-actions{display:flex;gap:4px;justify-content:flex-end}.tb-custom-actions .danger{color:#fca5a5;border-color:rgba(239,68,68,.3)}.tb-custom-empty{padding:10px;color:#756d67;font-size:9px}.tb-custom-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.tb-diet-individual{margin:12px 0;padding:14px;border:1px solid rgba(225,29,72,.3);border-radius:12px;background:linear-gradient(180deg,rgba(225,29,72,.055),#111)}.tb-diet-individual>span{display:block;color:#ff607d;font:800 8px 'DM Mono',monospace;letter-spacing:1px}.tb-diet-individual>strong{display:block;margin:5px 0 9px;color:#eee;font:800 17px 'Barlow Condensed',sans-serif}.tb-diet-individual textarea{width:100%;resize:vertical;min-height:100px;border:1px solid rgba(255,255,255,.1);border-radius:8px;background:#0b0b0b;color:#eee;padding:10px;font:500 12px 'Barlow',sans-serif}.tb-diet-individual-actions{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:8px}.tb-diet-individual-actions small{color:#756d67;font-size:9px}.tb-diet-individual-copy{color:#d6d0cb;font-size:12px;line-height:1.55;white-space:normal}.tb-diet-individual.student{border-color:rgba(34,197,94,.25);background:rgba(34,197,94,.035)}@media(max-width:520px){.tb-custom-head,.tb-diet-individual-actions{align-items:stretch;flex-direction:column}.tb-custom-head button,.tb-diet-individual-actions button{width:100%}.tb-custom-grid{grid-template-columns:1fr}}`;document.head.appendChild(style);}

  function installHooks(){
    document.addEventListener('click',event=>{if(event.target.closest('#tb-meal-portion-tool,#tb-portion-reference-modal'))requestAnimationFrame(()=>{patchCarbohydrateLabels();ensureCustomSections();});},false);
    document.addEventListener('input',event=>{if(event.target.matches('#tb-meal-portion-search,#tb-reference-portion-search'))requestAnimationFrame(patchCarbohydrateLabels);},false);
    if(typeof openAddMealModal==='function'){const base=openAddMealModal;openAddMealModal=function(){const result=base.apply(this,arguments);requestAnimationFrame(()=>{patchCarbohydrateLabels();ensureCustomSections();});return result;};}
    if(typeof openEditMealModal==='function'){const base=openEditMealModal;openEditMealModal=function(){const result=base.apply(this,arguments);requestAnimationFrame(()=>{patchCarbohydrateLabels();ensureCustomSections();});return result;};}
    if(typeof openDietDetail==='function'){const base=openDietDetail;openDietDetail=async function(id,trainerMode=false){const result=await base.apply(this,arguments);requestAnimationFrame(()=>{patchCarbohydrateLabels();ensureCustomSections();renderInstructions(!!trainerMode);});return result;};}
    if(typeof confirmLogout==='function'){const base=confirmLogout;confirmLogout=function(){catalogCache=null;catalogLoading=null;planCache.clear();document.getElementById('tb-custom-food-modal')?.remove();document.getElementById('tb-diet-individual-instructions')?.remove();return base.apply(this,arguments);};}
  }

  window.TeamBullsDietPersonalization=Object.freeze({version:VERSION,newCustom:()=>openCustomEditor(''),editCustom:openCustomEditor,saveCustom,removeCustom,addCustom,copyCustom,saveInstructions,refresh:async()=>{await loadCatalog(true);renderCustomSections();patchCarbohydrateLabels();}});
  injectStyles();patchCarbohydrateLabels();installHooks();
})();