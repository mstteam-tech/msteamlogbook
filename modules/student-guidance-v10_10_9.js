/* Team Bulls v10.10.9 — hidratação, orientações nutricionais, guia de alongamentos e confirmação estável. */
'use strict';
(()=>{
  if(window.__TEAM_BULLS_STUDENT_GUIDANCE_V10109__)return;
  window.__TEAM_BULLS_STUDENT_GUIDANCE_V10109__=true;

  const VERSION='10.10.9-guidance1';
  const STATIC_REVISION='nutrition-stretch-1';
  const STRETCH_PAGES=Array.from({length:10},(_,i)=>`./assets/stretch-guide/page-${String(i+1).padStart(2,'0')}.webp?v=10.10.9-stretch1`);
  const NUTRITION_GUIDANCE=[
    'Pesar os alimentos já preparados (cozidos, assados etc.).',
    'Priorizar alimentos frescos.',
    'Prefira alimentos mais limpos, como arroz, mandioca, batata, frango, peixe, grãos, sementes e cereais.',
    'Usar pouco sódio.',
    'Dar preferência a temperos naturais, como canela, alho, cebola, pimentão, cebolinha, coentro, salsa, pimenta-do-reino e orégano.',
    'Bebidas zero calorias à vontade.',
    'Prefira refeições livres mais limpas.',
    'Não exagere no óleo na hora de preparar os alimentos.',
    'Priorize alimentos com bastante fibra.',
    'Os vegetais podem ser remanejados conforme a preferência do aluno, desde que seja ingerida a quantidade prescrita, sem mais nem menos.',
    'Comer alimentos que estão na dieta, mas preparados com excesso de gordura, deixa de se enquadrar na proposta por elevar gordura, sódio e calorias. Exemplos: frango frito, comida japonesa com muitos molhos, carnes vermelhas gordas, excesso de óleo no preparo e marmitas preparadas com muita gordura.'
  ];

  let pendingHydrationActive=false;
  let pendingHydrationMl=0;
  let activeStretchPage=0;
  let priorBodyOverflow='';
  let forcedPromptToken='';

  function safeHydration(value){
    const n=Math.round(Number(value)||0);
    return Number.isFinite(n)?Math.max(0,Math.min(12000,n)):0;
  }
  function hydrationText(value){
    const ml=safeHydration(value);if(!ml)return'Meta de água não definida';
    const liters=(ml/1000).toLocaleString('pt-BR',{minimumFractionDigits:ml%1000?1:0,maximumFractionDigits:2});
    return`${liters} L por dia · ${ml.toLocaleString('pt-BR')} ml`;
  }
  function nutritionListHtml(){return`<ul class="tb-nutrition-list">${NUTRITION_GUIDANCE.map(item=>`<li>${typeof esc==='function'?esc(item):item}</li>`).join('')}</ul>`;}

  function ensureStyles(){
    if(document.getElementById('tb-student-guidance-style'))return;
    const style=document.createElement('style');style.id='tb-student-guidance-style';style.textContent=`
      .tb-guidance-card{border:1px solid rgba(185,43,43,.34);background:linear-gradient(180deg,rgba(43,18,18,.52),rgba(16,16,16,.94));padding:14px 16px;margin:12px 0;border-radius:3px}
      .tb-guidance-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:9px}.tb-guidance-head strong{font:800 15px/1.1 'Barlow Condensed',sans-serif;letter-spacing:.04em;color:#f1e5dc}.tb-guidance-head small{font:500 9px/1.2 'DM Mono',monospace;color:#8f7a70;letter-spacing:.08em}
      .tb-hydration-value{font:900 24px/1 'Barlow Condensed',sans-serif;color:#d8e9ff;margin:6px 0}.tb-hydration-note{font:500 10px/1.45 'DM Mono',monospace;color:#8d8d8d}
      .tb-nutrition-list{margin:8px 0 0;padding-left:20px}.tb-nutrition-list li{margin:7px 0;color:#d0bfb4;font:500 13px/1.45 'Barlow',sans-serif}.tb-nutrition-list li::marker{color:#b92727}
      .tb-guidance-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.tb-guidance-actions button{min-height:38px}
      .tb-instruction-static{margin-top:12px}.tb-instruction-static .instruction-item-text{white-space:normal}.tb-instruction-static .tb-nutrition-list{padding-right:10px}
      .tb-stretch-overlay{position:fixed;inset:0;z-index:100200;background:#080808;display:none;flex-direction:column;color:#fff;overscroll-behavior:contain}.tb-stretch-overlay.open{display:flex}
      .tb-stretch-head{height:58px;display:flex;align-items:center;gap:12px;padding:0 14px;border-bottom:1px solid rgba(185,43,43,.35);background:#0d0d0d;flex:0 0 auto}.tb-stretch-close,.tb-stretch-nav{appearance:none;border:1px solid rgba(255,255,255,.16);background:#171717;color:#fff;min-width:42px;height:40px;font:700 20px/1 system-ui;cursor:pointer}.tb-stretch-title{min-width:0;flex:1}.tb-stretch-title strong{display:block;font:800 15px/1.1 'Barlow Condensed',sans-serif;letter-spacing:.04em}.tb-stretch-title small{display:block;margin-top:3px;color:#a8a8a8;font:500 10px/1.2 'DM Mono',monospace}.tb-stretch-counter{font:700 11px/1 'DM Mono',monospace;color:#d8d8d8;white-space:nowrap}
      .tb-stretch-track{display:flex;flex:1;min-height:0;overflow-x:auto;overflow-y:hidden;scroll-snap-type:x mandatory;scroll-behavior:smooth;-webkit-overflow-scrolling:touch;background:#111;scrollbar-width:none}.tb-stretch-track::-webkit-scrollbar{display:none}.tb-stretch-page{flex:0 0 100%;height:100%;scroll-snap-align:center;display:flex;align-items:center;justify-content:center;padding:10px;box-sizing:border-box}.tb-stretch-page img{display:block;max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain;background:#666;box-shadow:0 8px 32px rgba(0,0,0,.45)}
      .tb-stretch-foot{height:62px;display:grid;grid-template-columns:46px 1fr 46px;align-items:center;gap:10px;padding:0 12px;border-top:1px solid rgba(185,43,43,.35);background:#0d0d0d;flex:0 0 auto}.tb-stretch-dots{display:flex;align-items:center;justify-content:center;gap:5px}.tb-stretch-dot{width:6px;height:6px;border-radius:99px;border:0;padding:0;background:#555}.tb-stretch-dot.active{width:18px;background:#b92727}
      .tb-stretch-home-access{width:100%;margin:10px 0 4px;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 14px;border:1px solid rgba(185,43,43,.35);background:#151010;color:#eadbd2;text-align:left;cursor:pointer}.tb-stretch-home-access strong{display:block;font:800 14px 'Barlow Condensed',sans-serif}.tb-stretch-home-access small{display:block;color:#8d7770;font:500 9px 'DM Mono',monospace;margin-top:3px}
      @media (min-width:800px){.tb-stretch-page{padding:20px}.tb-stretch-page img{max-height:calc(100vh - 160px)}}
      @media (max-width:720px){.tb-guidance-actions{display:grid;grid-template-columns:1fr}.tb-nutrition-list li{font-size:12px}.tb-hydration-value{font-size:22px}}
    `;document.head.appendChild(style);
  }

  function ensureHydrationField(){
    const modal=document.getElementById('modal-diet');if(!modal||document.getElementById('input-diet-hydration-ml'))return;
    const energy=modal.querySelector('.diet-energy-editor');if(!energy)return;
    const group=document.createElement('div');group.className='form-group';group.id='tb-diet-hydration-editor';
    group.innerHTML='<label class="form-label" for="input-diet-hydration-ml">QUANTIDADE DE ÁGUA · ML POR DIA</label><input class="form-input" id="input-diet-hydration-ml" type="number" min="0" max="12000" step="100" inputmode="numeric" placeholder="Ex.: 3500"/><div class="plan-help">Meta diária prescrita pelo treinador. Ex.: 3500 ml = 3,5 L. Use zero ou deixe vazio quando ainda não houver meta definida.</div>';
    energy.insertAdjacentElement('afterend',group);
  }

  function patchDietModel(){
    if(typeof normalizeDietPlan==='function'&&!normalizeDietPlan.__tbHydrationPatched){
      const base=normalizeDietPlan;
      const wrapped=function(plan,index=0){const result=base(plan,index);const raw=plan&&typeof plan==='object'?plan:{};result.hydrationMl=safeHydration(raw.hydrationMl??raw.waterMl??raw.dailyWaterMl??result.hydrationMl);return result;};
      wrapped.__tbHydrationPatched=true;normalizeDietPlan=wrapped;
    }
    if(typeof persistDietDocument==='function'&&!persistDietDocument.__tbHydrationPatched){
      const base=persistDietDocument;
      const wrapped=async function(){
        if(pendingHydrationActive){
          try{const id=String(typeof EDIT_DIET_PLAN_ID!=='undefined'&&EDIT_DIET_PLAN_ID?EDIT_DIET_PLAN_ID:(typeof CURRENT_DIET_ID!=='undefined'?CURRENT_DIET_ID:''));const plan=DIET_DOCUMENT?.plans?.find(item=>String(item.id)===id);if(plan)plan.hydrationMl=pendingHydrationMl;}catch(error){}
        }
        return base.apply(this,arguments);
      };wrapped.__tbHydrationPatched=true;persistDietDocument=wrapped;
    }
    if(typeof openAddDietModal==='function'&&!openAddDietModal.__tbHydrationPatched){
      const base=openAddDietModal;const wrapped=function(){ensureHydrationField();const result=base.apply(this,arguments);const field=document.getElementById('input-diet-hydration-ml');if(field)field.value='';return result;};wrapped.__tbHydrationPatched=true;openAddDietModal=wrapped;
    }
    if(typeof openEditDietModal==='function'&&!openEditDietModal.__tbHydrationPatched){
      const base=openEditDietModal;const wrapped=function(id){ensureHydrationField();const result=base.apply(this,arguments);try{const target=id??CURRENT_DIET_ID,plan=DIET_DOCUMENT?.plans?.find(item=>String(item.id)===String(target));const field=document.getElementById('input-diet-hydration-ml');if(field)field.value=plan?.hydrationMl?String(safeHydration(plan.hydrationMl)):'';}catch(error){}return result;};wrapped.__tbHydrationPatched=true;openEditDietModal=wrapped;
    }
    if(typeof saveDietPlan==='function'&&!saveDietPlan.__tbHydrationPatched){
      const base=saveDietPlan;const wrapped=async function(){ensureHydrationField();pendingHydrationMl=safeHydration(document.getElementById('input-diet-hydration-ml')?.value);pendingHydrationActive=true;try{return await base.apply(this,arguments);}finally{pendingHydrationActive=false;renderDietGuidance();}};wrapped.__tbHydrationPatched=true;saveDietPlan=wrapped;
    }
    if(typeof openDietDetail==='function'&&!openDietDetail.__tbGuidancePatched){
      const base=openDietDetail;const wrapped=async function(){const result=await base.apply(this,arguments);renderDietGuidance();return result;};wrapped.__tbGuidancePatched=true;openDietDetail=wrapped;
    }
  }

  function guidanceCard(plan,trainer){
    const water=hydrationText(plan?.hydrationMl);
    return`<section class="tb-guidance-card" data-tb-diet-guidance="1"><div class="tb-guidance-head"><div><strong>ÁGUA E ORIENTAÇÕES DA DIETA</strong><small>ACESSO RÁPIDO DO ALUNO</small></div>${trainer?`<button class="section-mini-btn" type="button" onclick="openEditDietModal(${typeof jsArg==='function'?jsArg(plan.id):JSON.stringify(plan.id)})">EDITAR META</button>`:''}</div><div class="tb-hydration-value">${typeof esc==='function'?esc(water):water}</div><div class="tb-hydration-note">Quantidade de água prescrita para o dia. Distribua ao longo do dia, salvo orientação individual diferente do treinador.</div>${nutritionListHtml()}<div class="tb-guidance-actions"><button class="btn-ghost" type="button" onclick="openStretchGuide()">ABRIR GUIA DE ALONGAMENTOS</button><button class="btn-ghost" type="button" onclick="openInstructions()">VER INSTRUÇÕES GERAIS</button></div></section>`;
  }
  function renderDietGuidance(){
    try{
      const plan=typeof currentDiet==='function'?currentDiet():null;if(!plan)return;
      const trainer=!!(typeof DIET_CONTEXT!=='undefined'&&DIET_CONTEXT.trainer);
      const host=document.getElementById(trainer?'ts-diet-energy-summary':'diet-energy-summary');if(!host)return;
      host.parentElement?.querySelector('[data-tb-diet-guidance="1"]')?.remove();
      host.insertAdjacentHTML('afterend',guidanceCard(plan,trainer));
    }catch(error){console.warn('[Team Bulls] Orientações da dieta indisponíveis',error);}
  }

  function renderStaticInstructions(){
    const host=document.getElementById('instructions-folders');if(!host)return;
    host.querySelector('#tb-static-nutrition-instructions')?.remove();
    const section=document.createElement('section');section.id='tb-static-nutrition-instructions';section.className='instruction-folder tb-instruction-static';
    section.innerHTML=`<div class="instruction-folder-head"><div class="instruction-folder-icon">🍴</div><div class="instruction-folder-title">Alimentação · observações e orientações</div></div><article class="instruction-item"><div class="instruction-item-title-row"><div class="instruction-item-title">Orientações para preparo e escolhas alimentares</div></div><div class="instruction-item-text">${nutritionListHtml()}</div><div class="tb-guidance-actions"><button class="btn-ghost" type="button" onclick="openStretchGuide()">ABRIR PLANILHA DE ALONGAMENTOS</button></div></article>`;
    host.appendChild(section);
  }
  function patchInstructionsRender(){
    if(typeof renderInstructions==='function'&&!renderInstructions.__tbStaticGuidancePatched){
      const base=renderInstructions;const wrapped=function(){const result=base.apply(this,arguments);renderStaticInstructions();return result;};wrapped.__tbStaticGuidancePatched=true;renderInstructions=wrapped;
    }
  }

  function instructionIdentity(){try{return String(CURRENT_USER?.uid||LOCAL_OWNER_UID||LOCAL_GUEST_OWNER||'');}catch(error){return'';}}
  function instructionToken(){try{return String(GENERAL_INSTRUCTIONS?.revision||1)+'|'+STATIC_REVISION;}catch(error){return'1|'+STATIC_REVISION;}}
  function instructionV2Key(uid=instructionIdentity()){return'team_bulls_instruction_ack_v2_'+uid;}
  function instructionAcknowledged(){const uid=instructionIdentity();return !!uid&&typeof storageGet==='function'&&storageGet(instructionV2Key(uid))===instructionToken();}
  function patchInstructionPrompt(){
    if(typeof openInstructions==='function'&&!openInstructions.__tbPromptPatched){
      const base=openInstructions;const wrapped=async function(forced=false){
        if(forced){
          if(instructionAcknowledged())return false;
          const token=instructionIdentity()+'|'+instructionToken();
          if(forcedPromptToken===token&&document.getElementById('screen-instructions')?.classList.contains('active'))return false;
          forcedPromptToken=token;
        }
        return base.apply(this,arguments);
      };wrapped.__tbPromptPatched=true;openInstructions=wrapped;
    }
    if(typeof acknowledgeInstructions==='function'&&!acknowledgeInstructions.__tbPromptPatched){
      const base=acknowledgeInstructions;const wrapped=function(){const uid=instructionIdentity();if(uid&&typeof storageSet==='function')storageSet(instructionV2Key(uid),instructionToken());forcedPromptToken=uid+'|'+instructionToken();return base.apply(this,arguments);};wrapped.__tbPromptPatched=true;acknowledgeInstructions=wrapped;
    }
    if(typeof maybePromptInitialInstructions==='function'&&!maybePromptInitialInstructions.__tbPromptPatched){
      const wrapped=async function(){
        try{
          if(typeof INSTRUCTIONS_PROMPT_RUNNING!=='undefined'&&INSTRUCTIONS_PROMPT_RUNNING)return;
          if(CURRENT_USER?.role==='trainer'||(typeof activeScreenId==='function'&&activeScreenId()!=='screen-home'))return;
          const uid=instructionIdentity();if(!uid)return;
          if(typeof INSTRUCTIONS_PROMPT_RUNNING!=='undefined')INSTRUCTIONS_PROMPT_RUNNING=true;
          await loadGeneralInstructions();
          if(typeof activeScreenId==='function'&&activeScreenId()!=='screen-home')return;
          if(typeof visibleInstructionCount==='function'&&!visibleInstructionCount())return;
          if(instructionAcknowledged())return;
          const token=uid+'|'+instructionToken();if(forcedPromptToken===token)return;forcedPromptToken=token;
          await openInstructions(true);
        }catch(error){console.warn('[Team Bulls] Falha ao verificar orientações iniciais',error);}
        finally{if(typeof INSTRUCTIONS_PROMPT_RUNNING!=='undefined')INSTRUCTIONS_PROMPT_RUNNING=false;}
      };wrapped.__tbPromptPatched=true;maybePromptInitialInstructions=wrapped;
    }
  }

  function ensureStretchViewer(){
    ensureStyles();let overlay=document.getElementById('tb-stretch-guide-viewer');if(overlay)return overlay;
    overlay=document.createElement('div');overlay.id='tb-stretch-guide-viewer';overlay.className='tb-stretch-overlay';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','Planilha de alongamentos');
    overlay.innerHTML=`<div class="tb-stretch-head"><button type="button" class="tb-stretch-close" aria-label="Fechar guia">×</button><div class="tb-stretch-title"><strong>PLANILHA DE ALONGAMENTOS</strong><small>Deslize para o lado para avançar</small></div><span class="tb-stretch-counter" aria-live="polite">1 / ${STRETCH_PAGES.length}</span></div><div class="tb-stretch-track">${STRETCH_PAGES.map((src,i)=>`<section class="tb-stretch-page" data-page="${i}"><img src="${src}" alt="Planilha de alongamentos - página ${i+1} de ${STRETCH_PAGES.length}" ${i?'loading="lazy"':'loading="eager"'} decoding="async"></section>`).join('')}</div><div class="tb-stretch-foot"><button type="button" class="tb-stretch-nav tb-stretch-prev" aria-label="Página anterior">‹</button><div class="tb-stretch-dots">${STRETCH_PAGES.map((_,i)=>`<button type="button" class="tb-stretch-dot${i===0?' active':''}" data-page="${i}" aria-label="Ir para página ${i+1}"></button>`).join('')}</div><button type="button" class="tb-stretch-nav tb-stretch-next" aria-label="Próxima página">›</button></div>`;
    document.body.appendChild(overlay);const track=overlay.querySelector('.tb-stretch-track');
    const update=()=>{const index=Math.max(0,Math.min(STRETCH_PAGES.length-1,Math.round(track.scrollLeft/Math.max(1,track.clientWidth))));activeStretchPage=index;overlay.querySelector('.tb-stretch-counter').textContent=`${index+1} / ${STRETCH_PAGES.length}`;overlay.querySelectorAll('.tb-stretch-dot').forEach((dot,i)=>dot.classList.toggle('active',i===index));overlay.querySelector('.tb-stretch-prev').disabled=index===0;overlay.querySelector('.tb-stretch-next').disabled=index===STRETCH_PAGES.length-1;};
    const go=index=>{activeStretchPage=Math.max(0,Math.min(STRETCH_PAGES.length-1,index));track.scrollTo({left:activeStretchPage*track.clientWidth,behavior:'smooth'});setTimeout(update,120);};
    overlay.querySelector('.tb-stretch-close').addEventListener('click',closeStretchGuide);overlay.querySelector('.tb-stretch-prev').addEventListener('click',()=>go(activeStretchPage-1));overlay.querySelector('.tb-stretch-next').addEventListener('click',()=>go(activeStretchPage+1));overlay.querySelectorAll('.tb-stretch-dot').forEach(dot=>dot.addEventListener('click',()=>go(Number(dot.dataset.page)||0)));track.addEventListener('scroll',()=>requestAnimationFrame(update),{passive:true});
    window.addEventListener('keydown',event=>{if(!overlay.classList.contains('open'))return;if(event.key==='Escape')closeStretchGuide();else if(event.key==='ArrowLeft')go(activeStretchPage-1);else if(event.key==='ArrowRight')go(activeStretchPage+1);});update();return overlay;
  }
  function openStretchGuide(page=0){const overlay=ensureStretchViewer(),track=overlay.querySelector('.tb-stretch-track');activeStretchPage=Math.max(0,Math.min(STRETCH_PAGES.length-1,Number(page)||0));priorBodyOverflow=document.body.style.overflow;document.body.style.overflow='hidden';overlay.classList.add('open');requestAnimationFrame(()=>{track.scrollLeft=activeStretchPage*track.clientWidth;overlay.querySelector('.tb-stretch-close')?.focus();track.dispatchEvent(new Event('scroll'));});return false;}
  function closeStretchGuide(){const overlay=document.getElementById('tb-stretch-guide-viewer');if(!overlay)return;overlay.classList.remove('open');document.body.style.overflow=priorBodyOverflow;}

  function installStretchAccess(){
    const nav=document.getElementById('student-desktop-nav');if(nav&&!nav.querySelector('[data-tb-stretch-nav]')){const button=document.createElement('button');button.type='button';button.dataset.tbStretchNav='1';button.innerHTML='↕ ALONGAMENTOS';button.onclick=()=>openStretchGuide();const instructions=[...nav.querySelectorAll('button')].find(item=>item.getAttribute('onclick')?.includes('openInstructions'));if(instructions)instructions.insertAdjacentElement('afterend',button);else nav.appendChild(button);}
    const home=document.querySelector('#screen-home .content');if(home&&!home.querySelector('[data-tb-stretch-home]')){const button=document.createElement('button');button.type='button';button.dataset.tbStretchHome='1';button.className='tb-stretch-home-access';button.innerHTML='<span><strong>PLANILHA DE ALONGAMENTOS</strong><small>GUIA VISUAL · 10 PÁGINAS</small></span><span aria-hidden="true">ABRIR ›</span>';button.addEventListener('click',()=>openStretchGuide());home.insertBefore(button,home.firstChild);}
  }

  function install(){ensureStyles();ensureHydrationField();patchDietModel();patchInstructionsRender();patchInstructionPrompt();installStretchAccess();ensureStretchViewer();renderStaticInstructions();renderDietGuidance();window.openStretchGuide=openStretchGuide;window.closeStretchGuide=closeStretchGuide;window.TeamBullsStudentGuidance=Object.freeze({version:VERSION,openStretchGuide,refresh:()=>{ensureHydrationField();installStretchAccess();renderStaticInstructions();renderDietGuidance();}});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
