/* Team Bulls v10.10.9 — páginas reais da planilha de alongamentos. */
'use strict';
(()=>{
  if(window.__TEAM_BULLS_STRETCH_PDF_V10109__)return;
  window.__TEAM_BULLS_STRETCH_PDF_V10109__=true;

  const VERSION='10.10.9-stretchpdf2';
  const PAGE_COUNT=10;
  const CACHE_NAME='team-bulls-stretch-guide-v10-10-9-stretchpdf2';
  const PAGES=Array.from({length:PAGE_COUNT},(_,index)=>`./assets/stretch-guide/page-${String(index+1).padStart(2,'0')}.avif?v=${VERSION}`);
  let activePage=0;
  let priorBodyOverflow='';

  function removeLegacyViewer(){
    document.getElementById('tb-stretch-viewer')?.remove();
  }

  function ensureStyles(){
    if(document.getElementById('tb-stretch-pdf-style'))return;
    const style=document.createElement('style');
    style.id='tb-stretch-pdf-style';
    style.textContent=`
      .tb-stretch-pdf-overlay{position:fixed;inset:0;z-index:100220;background:#080808;display:none;flex-direction:column;color:#fff;overscroll-behavior:contain}
      .tb-stretch-pdf-overlay.open{display:flex}
      .tb-stretch-pdf-head{height:58px;display:flex;align-items:center;gap:12px;padding:0 14px;border-bottom:1px solid rgba(185,43,43,.35);background:#0d0d0d;flex:0 0 auto}
      .tb-stretch-pdf-close,.tb-stretch-pdf-nav{appearance:none;border:1px solid rgba(255,255,255,.16);background:#171717;color:#fff;min-width:42px;height:40px;font:700 20px/1 system-ui;cursor:pointer}
      .tb-stretch-pdf-title{min-width:0;flex:1}.tb-stretch-pdf-title strong{display:block;font:800 15px/1.1 'Barlow Condensed',sans-serif;letter-spacing:.04em}.tb-stretch-pdf-title small{display:block;margin-top:3px;color:#a8a8a8;font:500 10px/1.2 'DM Mono',monospace}.tb-stretch-pdf-counter{font:700 11px/1 'DM Mono',monospace;color:#d8d8d8;white-space:nowrap}
      .tb-stretch-pdf-track{display:flex;flex:1;min-height:0;overflow-x:auto;overflow-y:hidden;scroll-snap-type:x mandatory;scroll-behavior:smooth;-webkit-overflow-scrolling:touch;touch-action:pan-x pinch-zoom;background:#111;scrollbar-width:none}
      .tb-stretch-pdf-track::-webkit-scrollbar{display:none}
      .tb-stretch-pdf-page{flex:0 0 100%;height:100%;scroll-snap-align:center;display:flex;align-items:center;justify-content:center;padding:10px;box-sizing:border-box;overflow:hidden}
      .tb-stretch-pdf-page img{display:block;max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain;background:#fff;box-shadow:0 8px 32px rgba(0,0,0,.35)}
      .tb-stretch-pdf-foot{height:62px;display:grid;grid-template-columns:46px 1fr 46px;align-items:center;gap:10px;padding:0 12px;border-top:1px solid rgba(185,43,43,.35);background:#0d0d0d;flex:0 0 auto}
      .tb-stretch-pdf-dots{display:flex;align-items:center;justify-content:center;gap:5px}.tb-stretch-pdf-dot{width:6px;height:6px;border-radius:99px;border:0;padding:0;background:#555}.tb-stretch-pdf-dot.active{width:18px;background:#b92727}
      .tb-stretch-pdf-error{display:none;color:#d7c7bf;font:700 12px/1.4 system-ui;text-align:center;padding:20px}.tb-stretch-pdf-page.failed .tb-stretch-pdf-error{display:block}.tb-stretch-pdf-page.failed img{display:none}
      @media(min-width:800px){.tb-stretch-pdf-page{padding:20px}.tb-stretch-pdf-page img{max-height:calc(100vh - 160px)}}
    `;
    document.head.appendChild(style);
  }

  function cachePage(src){
    if(!('caches' in window))return;
    let href='';
    try{href=new URL(src,location.href).href;}catch(error){return;}
    caches.open(CACHE_NAME).then(async cache=>{
      if(await cache.match(href))return;
      await cache.add(href);
    }).catch(()=>{});
  }

  function ensurePageLoaded(index,{retry=false}={}){
    const safe=Math.max(0,Math.min(PAGES.length-1,Number(index)||0));
    const page=document.querySelector(`#tb-stretch-pdf-viewer .tb-stretch-pdf-page[data-page="${safe}"]`);
    const image=page?.querySelector('img');
    if(!image)return;
    if(retry){image.dataset.failed='';image.dataset.loaded='';page.classList.remove('failed');}
    if(image.dataset.loaded==='1'||image.dataset.failed==='1')return;
    const src=image.dataset.src;if(!src)return;
    image.dataset.loaded='1';
    image.src=src;
    cachePage(src);
  }

  function warmPages(index){
    [index-1,index,index+1].forEach(page=>{if(page>=0&&page<PAGES.length)ensurePageLoaded(page);});
  }

  function ensureViewer(){
    removeLegacyViewer();
    ensureStyles();
    let overlay=document.getElementById('tb-stretch-pdf-viewer');
    if(overlay)return overlay;
    overlay=document.createElement('div');
    overlay.id='tb-stretch-pdf-viewer';
    overlay.className='tb-stretch-pdf-overlay';
    overlay.setAttribute('role','dialog');
    overlay.setAttribute('aria-modal','true');
    overlay.setAttribute('aria-label','Planilha de alongamentos');
    overlay.innerHTML=`
      <div class="tb-stretch-pdf-head">
        <button type="button" class="tb-stretch-pdf-close" aria-label="Fechar alongamentos">×</button>
        <div class="tb-stretch-pdf-title"><strong>ALONGAMENTOS</strong><small>Planilha original · deslize para navegar</small></div>
        <span class="tb-stretch-pdf-counter" aria-live="polite">1 / ${PAGES.length}</span>
      </div>
      <div class="tb-stretch-pdf-track">
        ${PAGES.map((src,index)=>`<section class="tb-stretch-pdf-page" data-page="${index}"><img data-src="${src}" alt="Planilha de alongamentos - página ${index+1} de ${PAGES.length}" decoding="async"><div class="tb-stretch-pdf-error">Não foi possível carregar esta página. Toque aqui para tentar novamente.</div></section>`).join('')}
      </div>
      <div class="tb-stretch-pdf-foot">
        <button type="button" class="tb-stretch-pdf-nav tb-stretch-pdf-prev" aria-label="Página anterior">‹</button>
        <div class="tb-stretch-pdf-dots">${PAGES.map((_,index)=>`<button type="button" class="tb-stretch-pdf-dot${index?'':' active'}" data-page="${index}" aria-label="Ir para página ${index+1}"></button>`).join('')}</div>
        <button type="button" class="tb-stretch-pdf-nav tb-stretch-pdf-next" aria-label="Próxima página">›</button>
      </div>`;
    document.body.appendChild(overlay);

    const track=overlay.querySelector('.tb-stretch-pdf-track');
    const update=()=>{
      const index=Math.max(0,Math.min(PAGES.length-1,Math.round(track.scrollLeft/Math.max(1,track.clientWidth))));
      activePage=index;
      overlay.querySelector('.tb-stretch-pdf-counter').textContent=`${index+1} / ${PAGES.length}`;
      overlay.querySelectorAll('.tb-stretch-pdf-dot').forEach((dot,item)=>dot.classList.toggle('active',item===index));
      overlay.querySelector('.tb-stretch-pdf-prev').disabled=index===0;
      overlay.querySelector('.tb-stretch-pdf-next').disabled=index===PAGES.length-1;
      warmPages(index);
    };
    const go=index=>{
      activePage=Math.max(0,Math.min(PAGES.length-1,index));
      warmPages(activePage);
      track.scrollTo({left:activePage*track.clientWidth,behavior:'smooth'});
      setTimeout(update,120);
    };
    overlay.querySelector('.tb-stretch-pdf-close').addEventListener('click',closeStretchPdfGuide);
    overlay.querySelector('.tb-stretch-pdf-prev').addEventListener('click',()=>go(activePage-1));
    overlay.querySelector('.tb-stretch-pdf-next').addEventListener('click',()=>go(activePage+1));
    overlay.querySelectorAll('.tb-stretch-pdf-dot').forEach(dot=>dot.addEventListener('click',()=>go(Number(dot.dataset.page)||0)));
    overlay.querySelectorAll('.tb-stretch-pdf-page').forEach((page,index)=>{
      const image=page.querySelector('img');
      image.addEventListener('error',()=>{image.dataset.failed='1';page.classList.add('failed');});
      image.addEventListener('load',()=>{image.dataset.failed='';page.classList.remove('failed');});
      page.querySelector('.tb-stretch-pdf-error').addEventListener('click',()=>ensurePageLoaded(index,{retry:true}));
    });
    track.addEventListener('scroll',()=>requestAnimationFrame(update),{passive:true});
    overlay.addEventListener('click',event=>{if(event.target===overlay)closeStretchPdfGuide();});
    window.addEventListener('keydown',event=>{
      if(!overlay.classList.contains('open'))return;
      if(event.key==='Escape')closeStretchPdfGuide();
      else if(event.key==='ArrowLeft')go(activePage-1);
      else if(event.key==='ArrowRight')go(activePage+1);
    });
    update();
    return overlay;
  }

  function openStretchPdfGuide(page=0){
    const overlay=ensureViewer();
    const track=overlay.querySelector('.tb-stretch-pdf-track');
    activePage=Math.max(0,Math.min(PAGES.length-1,Number(page)||0));
    priorBodyOverflow=document.body.style.overflow;
    document.body.style.overflow='hidden';
    overlay.classList.add('open');
    warmPages(activePage);
    overlay.querySelector('.tb-stretch-pdf-counter').textContent=`${activePage+1} / ${PAGES.length}`;
    overlay.querySelectorAll('.tb-stretch-pdf-dot').forEach((dot,index)=>dot.classList.toggle('active',index===activePage));
    requestAnimationFrame(()=>{track.scrollLeft=activePage*track.clientWidth;overlay.querySelector('.tb-stretch-pdf-close')?.focus();});
    return false;
  }

  function closeStretchPdfGuide(){
    const overlay=document.getElementById('tb-stretch-pdf-viewer');
    if(!overlay)return;
    overlay.classList.remove('open');
    document.body.style.overflow=priorBodyOverflow;
  }

  function rebindEntryPoints(){
    document.querySelectorAll('[data-tb-stretch-nav],[data-tb-stretch-home]').forEach(button=>{button.onclick=()=>openStretchPdfGuide();});
  }

  removeLegacyViewer();
  rebindEntryPoints();
  window.openStretchGuide=openStretchPdfGuide;
  window.closeStretchGuide=closeStretchPdfGuide;
  window.openStretchPdfGuide=openStretchPdfGuide;
  window.closeStretchPdfGuide=closeStretchPdfGuide;
  window.TeamBullsStretchPdf=Object.freeze({version:VERSION,pages:PAGE_COUNT,open:openStretchPdfGuide,close:closeStretchPdfGuide,refresh:rebindEntryPoints});
})();
