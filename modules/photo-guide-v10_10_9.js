/* Team Bulls v10.10.9 — Guia de fotos incorporado (sem PDF/Firebase Storage). */
'use strict';
(()=>{
  if(window.__TEAM_BULLS_BUILTIN_PHOTO_GUIDE__)return;
  window.__TEAM_BULLS_BUILTIN_PHOTO_GUIDE__=true;

  const VERSION='10.10.9';
  const PAGES=[1,2,3,4,5].map(n=>`./assets/photo-guide/page-${n}.png?v=${VERSION}`);
  const INSTRUCTION='Leia o guia completo antes de tirar as fotos. Siga exatamente posição, enquadramento, vestimenta e postura indicados nas imagens.';
  let activePage=0;
  let priorOverflow='';

  function ensureStyle(){
    if(document.getElementById('tb-photo-guide-style'))return;
    const style=document.createElement('style');
    style.id='tb-photo-guide-style';
    style.textContent=`
      .tb-photo-guide-overlay{position:fixed;inset:0;z-index:100000;background:#080808;display:none;flex-direction:column;color:#fff;overscroll-behavior:contain}
      .tb-photo-guide-overlay.open{display:flex}
      .tb-photo-guide-head{height:58px;display:flex;align-items:center;gap:12px;padding:0 14px;border-bottom:1px solid rgba(255,255,255,.1);background:#0d0d0d;flex:0 0 auto}
      .tb-photo-guide-close,.tb-photo-guide-nav{appearance:none;border:1px solid rgba(255,255,255,.16);background:#171717;color:#fff;border-radius:12px;min-width:42px;height:40px;font:700 20px/1 system-ui;cursor:pointer}
      .tb-photo-guide-title{min-width:0;flex:1}.tb-photo-guide-title strong{display:block;font:800 14px/1.1 system-ui;letter-spacing:.04em}.tb-photo-guide-title small{display:block;margin-top:3px;color:#a8a8a8;font:500 11px/1.2 system-ui}
      .tb-photo-guide-counter{color:#d8d8d8;font:700 12px/1 system-ui;white-space:nowrap}
      .tb-photo-guide-track{display:flex;flex:1;min-height:0;overflow-x:auto;overflow-y:hidden;scroll-snap-type:x mandatory;scroll-behavior:smooth;-webkit-overflow-scrolling:touch;background:#111;scrollbar-width:none}
      .tb-photo-guide-track::-webkit-scrollbar{display:none}
      .tb-photo-guide-page{flex:0 0 100%;height:100%;scroll-snap-align:center;display:flex;align-items:center;justify-content:center;padding:10px;box-sizing:border-box}
      .tb-photo-guide-page img{display:block;max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain;border-radius:10px;background:#2b2b2b;box-shadow:0 8px 32px rgba(0,0,0,.35)}
      .tb-photo-guide-foot{height:62px;display:grid;grid-template-columns:46px 1fr 46px;align-items:center;gap:10px;padding:0 12px;border-top:1px solid rgba(255,255,255,.1);background:#0d0d0d;flex:0 0 auto}
      .tb-photo-guide-dots{display:flex;align-items:center;justify-content:center;gap:8px}.tb-photo-guide-dot{width:7px;height:7px;border-radius:999px;border:0;padding:0;background:#555}.tb-photo-guide-dot.active{width:20px;background:#c63d3d}
      .report-guide-card.available{cursor:pointer}.report-guide-card.available button{white-space:nowrap}
      @media (min-width:800px){.tb-photo-guide-page{padding:20px}.tb-photo-guide-page img{max-height:calc(100vh - 160px)}}
    `;
    document.head.appendChild(style);
  }

  function ensureViewer(){
    ensureStyle();
    let overlay=document.getElementById('tb-photo-guide-viewer');
    if(overlay)return overlay;
    overlay=document.createElement('div');
    overlay.id='tb-photo-guide-viewer';
    overlay.className='tb-photo-guide-overlay';
    overlay.setAttribute('role','dialog');
    overlay.setAttribute('aria-modal','true');
    overlay.setAttribute('aria-label','Instruções de fotos');
    overlay.innerHTML=`
      <div class="tb-photo-guide-head">
        <button type="button" class="tb-photo-guide-close" aria-label="Fechar guia">×</button>
        <div class="tb-photo-guide-title"><strong>INSTRUÇÕES DE FOTOS</strong><small>Deslize para o lado para avançar</small></div>
        <span class="tb-photo-guide-counter" aria-live="polite">1 / ${PAGES.length}</span>
      </div>
      <div class="tb-photo-guide-track">
        ${PAGES.map((src,i)=>`<section class="tb-photo-guide-page" data-page="${i}"><img src="${src}" alt="Instruções de fotos - página ${i+1} de ${PAGES.length}" ${i?'loading="lazy"':'loading="eager"'} decoding="async"></section>`).join('')}
      </div>
      <div class="tb-photo-guide-foot">
        <button type="button" class="tb-photo-guide-nav tb-photo-guide-prev" aria-label="Página anterior">‹</button>
        <div class="tb-photo-guide-dots">${PAGES.map((_,i)=>`<button type="button" class="tb-photo-guide-dot${i===0?' active':''}" data-page="${i}" aria-label="Ir para página ${i+1}"></button>`).join('')}</div>
        <button type="button" class="tb-photo-guide-nav tb-photo-guide-next" aria-label="Próxima página">›</button>
      </div>`;
    document.body.appendChild(overlay);
    const track=overlay.querySelector('.tb-photo-guide-track');
    const update=()=>{
      const index=Math.max(0,Math.min(PAGES.length-1,Math.round(track.scrollLeft/Math.max(1,track.clientWidth))));
      if(index===activePage&&overlay.querySelector('.tb-photo-guide-counter')?.textContent===`${index+1} / ${PAGES.length}`)return;
      activePage=index;
      overlay.querySelector('.tb-photo-guide-counter').textContent=`${index+1} / ${PAGES.length}`;
      overlay.querySelectorAll('.tb-photo-guide-dot').forEach((dot,i)=>dot.classList.toggle('active',i===index));
      overlay.querySelector('.tb-photo-guide-prev').disabled=index===0;
      overlay.querySelector('.tb-photo-guide-next').disabled=index===PAGES.length-1;
    };
    const go=index=>{activePage=Math.max(0,Math.min(PAGES.length-1,index));track.scrollTo({left:activePage*track.clientWidth,behavior:'smooth'});setTimeout(update,120);};
    overlay.querySelector('.tb-photo-guide-close').addEventListener('click',closeBuiltInPhotoGuide);
    overlay.querySelector('.tb-photo-guide-prev').addEventListener('click',()=>go(activePage-1));
    overlay.querySelector('.tb-photo-guide-next').addEventListener('click',()=>go(activePage+1));
    overlay.querySelectorAll('.tb-photo-guide-dot').forEach(dot=>dot.addEventListener('click',()=>go(Number(dot.dataset.page)||0)));
    track.addEventListener('scroll',()=>requestAnimationFrame(update),{passive:true});
    overlay.addEventListener('click',event=>{if(event.target===overlay)closeBuiltInPhotoGuide();});
    window.addEventListener('keydown',event=>{
      if(!overlay.classList.contains('open'))return;
      if(event.key==='Escape')closeBuiltInPhotoGuide();
      else if(event.key==='ArrowLeft')go(activePage-1);
      else if(event.key==='ArrowRight')go(activePage+1);
    });
    update();
    return overlay;
  }

  function openBuiltInPhotoGuide(page=0){
    const overlay=ensureViewer();
    const track=overlay.querySelector('.tb-photo-guide-track');
    activePage=Math.max(0,Math.min(PAGES.length-1,Number(page)||0));
    priorOverflow=document.body.style.overflow;
    document.body.style.overflow='hidden';
    overlay.classList.add('open');
    overlay.querySelector('.tb-photo-guide-counter').textContent=`${activePage+1} / ${PAGES.length}`;
    overlay.querySelectorAll('.tb-photo-guide-dot').forEach((dot,i)=>dot.classList.toggle('active',i===activePage));
    requestAnimationFrame(()=>{track.scrollLeft=activePage*track.clientWidth;overlay.querySelector('.tb-photo-guide-close')?.focus();});
    return false;
  }

  function closeBuiltInPhotoGuide(){
    const overlay=document.getElementById('tb-photo-guide-viewer');
    if(!overlay)return;
    overlay.classList.remove('open');
    document.body.style.overflow=priorOverflow;
  }

  function renderBuiltInGuideCard(id){
    const card=document.getElementById(id);if(!card)return;
    card.classList.add('available');
    card.innerHTML='<div><span>INSTRUÇÕES DE FOTOS</span><small>Guia incorporado ao aplicativo - 5 páginas</small></div><button type="button" onclick="openReportPhotoGuide()">ABRIR GUIA</button>';
  }

  async function renderBuiltInGuideBlocks(){
    ['weekly-report-photo-instruction','questionnaire-report-photo-instruction','student-global-report-guide-instruction'].forEach(id=>{const el=document.getElementById(id);if(el)el.textContent=INSTRUCTION;});
    ['weekly-report-guide-card','questionnaire-report-guide-card','student-global-report-guide-card'].forEach(renderBuiltInGuideCard);
    return {builtin:true,photoInstruction:INSTRUCTION,photoGuideName:'Instruções de fotos'};
  }

  function patchStaticUi(){
    ['weekly-report-guide-card','questionnaire-report-guide-card','student-global-report-guide-card'].forEach(renderBuiltInGuideCard);
    document.querySelectorAll('[onclick="openReportGuideManager()"]')?.forEach(btn=>{
      btn.textContent='INSTRUÇÕES DE FOTOS - GUIA INTERNO';
      btn.setAttribute('aria-label','Abrir instruções de fotos');
    });
  }

  window.openBuiltInPhotoGuide=openBuiltInPhotoGuide;
  window.closeBuiltInPhotoGuide=closeBuiltInPhotoGuide;
  window.openReportPhotoGuide=openBuiltInPhotoGuide;
  window.openReportGuideManager=openBuiltInPhotoGuide;
  window.v109RenderGuideCard=(id)=>renderBuiltInGuideCard(id);
  window.renderReportGuideBlocks=renderBuiltInGuideBlocks;
  patchStaticUi();
  ensureViewer();
  if('caches' in window){caches.open('team-bulls-photo-guide-v10-10-9').then(cache=>cache.addAll(PAGES.map(path=>new URL(path,location.href).href))).catch(()=>{});}
})();
