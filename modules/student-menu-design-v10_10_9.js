/* Team Bulls v10.10.9 — menu visual do aluno inspirado no layout aprovado. */
'use strict';
(()=>{
  if(window.__TEAM_BULLS_STUDENT_MENU_DESIGN_V10109__)return;
  window.__TEAM_BULLS_STUDENT_MENU_DESIGN_V10109__=true;

  const MENU_ID='tb-student-menu';
  const NOTICE_BADGE_ID='tb-student-menu-notice-badge';

  const ICONS=Object.freeze({
    instructions:'<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M10 15c8-3 15-2 22 3v33c-7-5-14-6-22-3V15Zm44 0c-8-3-15-2-22 3v33c7-5 14-6 22-3V15Z"/><path d="M32 18v33"/></svg>',
    meals:'<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M17 9v20M12 9v13c0 5 3 8 5 8s5-3 5-8V9M17 30v25M42 9c-7 7-8 16-8 25h8v21M42 9v46"/></svg>',
    food:'<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M10 22h44l-5 27H15l-5-27Z"/><path d="M17 22c4-8 10-11 15-11s11 3 15 11M22 31h20M20 38h24"/></svg>',
    techniques:'<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M8 25v14M13 20v24M18 25v14M46 25v14M51 20v24M56 25v14M18 29h28M18 35h28"/></svg>',
    substitutions:'<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M12 20h35M40 12l8 8-8 8M52 44H17M24 36l-8 8 8 8"/></svg>',
    reports:'<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M18 10h28v44H18z"/><path d="M25 36V25M32 36V18M39 36v-7M25 44h14"/><path d="M26 10V7h12v3"/></svg>',
    evidence:'<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M10 20h12l4-6h13l4 6h11v31H10z"/><circle cx="32" cy="35" r="10"/><path d="M15 26h5"/></svg>',
    notices:'<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M17 46h30l-4-7V28c0-7-4-12-11-12s-11 5-11 12v11l-4 7Z"/><path d="M27 49c1 5 9 5 10 0M29 12h6"/></svg>',
    records:'<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M16 10h32v44H16z"/><path d="m22 23 3 3 5-6M34 24h8M22 34l3 3 5-6M34 35h8M22 45l3 3 5-6M34 46h8"/></svg>'
  });

  const MENU_ITEMS=Object.freeze([
    {key:'instructions',label:'INSTRUÇÕES',run:()=>openInstructions()},
    {key:'meals',label:'SUPRIMENTOS',run:()=>openMeals()},
    {key:'food',label:'OPÇÕES DE<br>SUPRIMENTOS',run:()=>openFoodOptions()},
    {key:'techniques',label:'TÉCNICAS',run:()=>openTechniques()},
    {key:'substitutions',label:'SUBSTITUIÇÕES DE<br>EXERCÍCIOS',run:()=>openExerciseOptions()},
    {key:'reports',label:'RELATÓRIOS',run:()=>openMyQuestionnaires()},
    {key:'evidence',label:'EVIDÊNCIAS',run:()=>openPhotos()},
    {key:'notices',label:'AVISOS',run:()=>openV107Operations('notices'),badge:true},
    {key:'records',label:'REGISTROS',run:()=>openCalendar()}
  ]);

  function isStudentContext(){
    const screen=document.querySelector('.screen.active')?.id||'';
    if(!screen||screen==='screen-auth'||screen==='screen-loading')return false;
    const user=typeof CURRENT_USER!=='undefined'?CURRENT_USER:null;
    if(user?.role==='trainer')return false;
    if(user?.role==='student')return true;
    const mode=typeof MODE!=='undefined'?String(MODE||''):'';
    const access=typeof ACCESS_MODE!=='undefined'?String(ACCESS_MODE||''):'';
    return document.body.classList.contains('student-desktop')||mode==='local'||['local-inactive','offline-registered'].includes(access);
  }

  function bullMark(){
    return `<svg class="tb-student-menu-bull" viewBox="0 0 88 70" aria-hidden="true">
      <path d="M30 18C18 17 10 10 8 2c8 7 17 8 26 5M58 18C70 17 78 10 80 2c-8 7-17 8-26 5"/>
      <path d="M25 14c2 8 2 14 1 20 0 15 8 27 18 31 10-4 18-16 18-31-1-6-1-12 1-20-6 4-12 6-19 6s-13-2-19-6Z"/>
      <path d="M33 31h7M48 31h7M37 45c4 3 10 3 14 0M39 53h10M44 20v24"/>
    </svg>`;
  }

  function hamburgerIcon(){return '<span class="tb-student-menu-hamb"><i></i><i></i><i></i></span>';}

  function cardHtml(item){
    const badge=item.badge?`<span class="tb-student-menu-badge" id="${NOTICE_BADGE_ID}" hidden></span>`:'';
    return `<button type="button" class="tb-student-menu-card" data-tb-menu-key="${item.key}" aria-label="${item.label.replace(/<br>/g,' ')}">
      <span class="tb-student-menu-icon">${ICONS[item.key]}</span>
      <span class="tb-student-menu-label">${item.label}</span>
      <span class="tb-student-menu-accent" aria-hidden="true"></span>${badge}
    </button>`;
  }

  function ensureStyles(){
    if(document.getElementById('tb-student-menu-design-style'))return;
    const style=document.createElement('style');style.id='tb-student-menu-design-style';style.textContent=`
      .tb-student-menu-trigger,.tb-student-menu-floating{width:40px;height:40px;min-width:40px;padding:0;border:0;background:transparent;color:#d8d0c7;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;border-radius:6px;touch-action:manipulation}
      .tb-student-menu-trigger:hover,.tb-student-menu-floating:hover,.tb-student-menu-trigger:focus-visible,.tb-student-menu-floating:focus-visible{background:#171514;outline:1px solid #564941;color:#fff}
      .tb-student-menu-trigger[hidden],.tb-student-menu-floating[hidden]{display:none!important}
      .tb-student-menu-hamb{width:24px;display:grid;gap:5px}.tb-student-menu-hamb i{height:1px;background:currentColor;display:block;box-shadow:0 0 4px rgba(255,255,255,.12)}
      .tb-student-menu-floating{position:fixed;left:max(12px,env(safe-area-inset-left));top:max(12px,env(safe-area-inset-top));z-index:3600;background:rgba(9,8,7,.94);border:1px solid #423a34;box-shadow:0 6px 24px rgba(0,0,0,.42)}

      #tb-student-menu.modal-backdrop{z-index:7600;display:none;align-items:stretch;justify-content:stretch;padding:0;background:#070707;overflow:auto;overscroll-behavior:contain}
      #tb-student-menu.modal-backdrop.open{display:block}
      .tb-student-menu-panel{width:100%;min-height:100%;padding-bottom:max(38px,env(safe-area-inset-bottom));color:#eee;background:
        radial-gradient(circle at 50% 0,rgba(146,18,20,.08),transparent 30%),
        repeating-linear-gradient(135deg,rgba(255,255,255,.009) 0 1px,transparent 1px 4px),
        radial-gradient(circle at 30% 25%,rgba(255,255,255,.025),transparent 22%),#070707}
      .tb-student-menu-header{min-height:148px;padding:max(18px,env(safe-area-inset-top)) max(22px,env(safe-area-inset-right)) 18px max(22px,env(safe-area-inset-left));display:grid;grid-template-columns:54px 92px minmax(0,1fr) 54px;align-items:center;gap:18px;border-bottom:1px solid #8f1518;box-shadow:0 1px 0 rgba(255,0,0,.12),0 18px 45px rgba(0,0,0,.22)}
      .tb-student-menu-close{width:54px;height:54px;border:0;background:transparent;color:#d8d0c7;display:flex;align-items:center;justify-content:center;cursor:pointer;border-radius:7px}.tb-student-menu-close:hover,.tb-student-menu-close:focus-visible{background:#151312;outline:1px solid #4b4038}
      .tb-student-menu-bull{width:86px;height:68px;fill:none;stroke:#d81e23;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round;filter:drop-shadow(0 0 7px rgba(190,20,24,.18))}
      .tb-student-menu-brand{font-family:'Anton','Barlow Condensed','Arial Narrow',sans-serif;font-weight:400;font-size:clamp(50px,7vw,78px);line-height:.92;letter-spacing:.015em;text-transform:uppercase;color:#c7191d;white-space:nowrap;text-shadow:0 2px 0 #480608,0 6px 18px rgba(0,0,0,.48);background-image:linear-gradient(180deg,#d32327 0%,#b50d12 100%),repeating-linear-gradient(120deg,transparent 0 5px,rgba(0,0,0,.28) 5px 6px);background-blend-mode:multiply;-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
      .tb-student-menu-header-spacer{width:54px}
      .tb-student-menu-grid{width:min(960px,calc(100% - 44px));margin:0 auto;padding:62px 0 34px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px}
      .tb-student-menu-card{position:relative;min-height:264px;padding:34px 18px 28px;border:1px solid #4a4540;border-radius:14px;background:linear-gradient(145deg,#171717 0%,#0e0e0e 72%);box-shadow:inset 0 0 0 1px rgba(255,255,255,.012),0 12px 28px rgba(0,0,0,.24);color:#e8e1d8;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:24px;cursor:pointer;transition:transform .14s ease,border-color .14s ease,background .14s ease;touch-action:manipulation;overflow:hidden}
      .tb-student-menu-card::before{content:'';position:absolute;inset:0;background:radial-gradient(circle at 50% 18%,rgba(255,255,255,.035),transparent 31%),repeating-linear-gradient(135deg,rgba(255,255,255,.007) 0 1px,transparent 1px 5px);pointer-events:none}
      .tb-student-menu-card:hover,.tb-student-menu-card:focus-visible{border-color:#776b62;background:linear-gradient(145deg,#1b1a19,#10100f);outline:0;transform:translateY(-2px)}
      .tb-student-menu-card:active{transform:scale(.985)}
      .tb-student-menu-icon{height:66px;display:flex;align-items:center;justify-content:center;color:#d9d1c7;filter:drop-shadow(0 2px 2px #000)}.tb-student-menu-icon svg{width:64px;height:64px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
      .tb-student-menu-label{font-family:'Barlow Condensed','DM Mono',monospace;font-size:19px;font-weight:400;line-height:1.28;letter-spacing:.16em;text-transform:uppercase;text-align:center;color:#e5ddd4;position:relative;z-index:1}
      .tb-student-menu-accent{width:58px;height:2px;background:#c4161a;box-shadow:0 0 8px rgba(196,22,26,.18);position:relative;z-index:1}
      .tb-student-menu-badge{position:absolute;left:50%;bottom:24px;transform:translateX(-50%);min-width:32px;height:32px;padding:0 8px;border-radius:20px;background:#c7191d;border:1px solid #f14c50;color:#fff;font:700 16px/30px 'Barlow',sans-serif;text-align:center;box-shadow:0 3px 10px rgba(0,0,0,.42)}
      .tb-student-menu-secondary{width:min(960px,calc(100% - 44px));margin:0 auto;padding:2px 0 42px;display:flex;flex-wrap:wrap;justify-content:center;gap:8px;border-top:1px solid #221f1d;padding-top:22px}
      .tb-student-menu-secondary button{border:1px solid #36312d;background:#0d0c0b;color:#8e8379;padding:10px 14px;font:500 9px/1 'DM Mono',monospace;letter-spacing:.08em;cursor:pointer}.tb-student-menu-secondary button:hover,.tb-student-menu-secondary button:focus-visible{border-color:#66584f;color:#ddd2c7;outline:0}.tb-student-menu-secondary button.danger{border-color:#522427;color:#bd7779}

      @media(min-width:900px){
        body.student-desktop{--desktop-sidebar:0px!important;--desktop-sidebar-current:0px!important}
        body.student-desktop .student-desktop-nav{display:none!important}
        body.student-desktop #app{margin-left:0!important;width:100%!important;max-width:none!important}
        body.student-desktop .screen.active{max-width:none!important}
      }
      @media(max-width:719px){
        .tb-student-menu-header{min-height:104px;grid-template-columns:42px 56px minmax(0,1fr) 10px;gap:10px;padding-left:max(14px,env(safe-area-inset-left));padding-right:max(14px,env(safe-area-inset-right))}
        .tb-student-menu-close{width:42px;height:42px}.tb-student-menu-bull{width:54px;height:46px}.tb-student-menu-brand{font-size:clamp(36px,10vw,50px)}.tb-student-menu-header-spacer{width:10px}
        .tb-student-menu-grid{width:min(100% - 24px,560px);padding-top:24px;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
        .tb-student-menu-card{min-height:178px;padding:24px 10px 20px;gap:16px;border-radius:11px}.tb-student-menu-icon{height:48px}.tb-student-menu-icon svg{width:48px;height:48px}.tb-student-menu-label{font-size:15px;letter-spacing:.11em}.tb-student-menu-accent{width:42px}
        .tb-student-menu-secondary{width:min(100% - 24px,560px);padding-bottom:28px}.tb-student-menu-secondary button{flex:1 1 130px}
      }
      @media(max-width:350px){.tb-student-menu-grid{grid-template-columns:1fr}.tb-student-menu-card{min-height:150px}.tb-student-menu-brand{font-size:34px}}
    `;document.head.appendChild(style);
  }

  function ensureMenu(){
    let modal=document.getElementById(MENU_ID);if(modal)return modal;
    modal=document.createElement('div');modal.id=MENU_ID;modal.className='modal-backdrop';modal.dataset.tbBackdropClose='block';modal.setAttribute('aria-label','Menu principal do aluno');
    modal.innerHTML=`<div class="tb-student-menu-panel" role="dialog" aria-modal="true" aria-label="Menu Team Bulls">
      <header class="tb-student-menu-header">
        <button type="button" class="tb-student-menu-close" aria-label="Fechar menu">${hamburgerIcon()}</button>
        ${bullMark()}
        <div class="tb-student-menu-brand">TEAM BULLS</div><span class="tb-student-menu-header-spacer" aria-hidden="true"></span>
      </header>
      <main class="tb-student-menu-grid">${MENU_ITEMS.map(cardHtml).join('')}</main>
      <nav class="tb-student-menu-secondary" aria-label="Ações complementares">
        <button type="button" data-tb-secondary="home">INÍCIO</button><button type="button" data-tb-secondary="workouts">TREINOS</button><button type="button" data-tb-secondary="sync">SINCRONIZAÇÃO</button><button type="button" data-tb-secondary="settings">CONFIGURAÇÕES</button><button type="button" class="danger" data-tb-secondary="logout">SAIR</button>
      </nav>
    </div>`;
    document.body.appendChild(modal);
    modal.querySelector('.tb-student-menu-close').addEventListener('click',closeStudentMenu);
    modal.querySelectorAll('[data-tb-menu-key]').forEach(button=>button.addEventListener('click',()=>{
      const item=MENU_ITEMS.find(entry=>entry.key===button.dataset.tbMenuKey);if(item)navigate(item.run);
    }));
    modal.querySelectorAll('[data-tb-secondary]').forEach(button=>button.addEventListener('click',()=>runSecondary(button.dataset.tbSecondary)));
    return modal;
  }

  function ensureTriggers(){
    document.querySelectorAll('.screen .header').forEach(header=>{
      if(header.querySelector('.tb-student-menu-trigger'))return;
      const button=document.createElement('button');button.type='button';button.className='tb-student-menu-trigger';button.hidden=true;button.setAttribute('aria-label','Abrir menu Team Bulls');button.title='Menu';button.innerHTML=hamburgerIcon();button.addEventListener('click',openStudentMenu);header.prepend(button);
    });
    let floating=document.getElementById('tb-student-menu-floating');
    if(!floating){floating=document.createElement('button');floating.type='button';floating.id='tb-student-menu-floating';floating.className='tb-student-menu-floating';floating.hidden=true;floating.setAttribute('aria-label','Abrir menu Team Bulls');floating.title='Menu';floating.innerHTML=hamburgerIcon();floating.addEventListener('click',openStudentMenu);document.body.appendChild(floating);}
  }

  function syncNoticeBadge(){
    const target=document.getElementById(NOTICE_BADGE_ID);if(!target)return;
    const source=document.getElementById('v107-nav-notice-count');const raw=String(source?.textContent||'').trim();const number=Math.max(0,Number.parseInt(raw,10)||0);
    target.hidden=number<=0;target.textContent=number>99?'99+':String(number);
  }

  function openStudentMenu(){
    if(!isStudentContext())return;
    ensureMenu();syncNoticeBadge();
    try{if(typeof openModal==='function')openModal(MENU_ID);else document.getElementById(MENU_ID)?.classList.add('open');}catch(error){document.getElementById(MENU_ID)?.classList.add('open');}
  }
  function closeStudentMenu(){
    try{if(typeof closeModal==='function')closeModal(MENU_ID);else document.getElementById(MENU_ID)?.classList.remove('open');}catch(error){document.getElementById(MENU_ID)?.classList.remove('open');}
  }
  function navigate(action){
    closeStudentMenu();requestAnimationFrame(()=>{try{action();}catch(error){console.error('[Team Bulls] Falha ao abrir item do menu',error);if(typeof showToast==='function')showToast('Não foi possível abrir esta área agora.',true);}});
  }
  function runSecondary(key){
    if(key==='home'){navigate(()=>goHome());return;}
    if(key==='workouts'){navigate(()=>{goHome();setTimeout(()=>document.getElementById('workout-list')?.scrollIntoView({behavior:'smooth',block:'start'}),90);});return;}
    if(key==='sync'){navigate(()=>openV107Operations('sync'));return;}
    if(key==='settings'){navigate(()=>openSettings());return;}
    if(key==='logout'){closeStudentMenu();requestAnimationFrame(()=>confirmLogout());}
  }

  function syncAvailability(){
    ensureTriggers();const student=isStudentContext();const active=document.querySelector('.screen.active');
    document.querySelectorAll('.tb-student-menu-trigger').forEach(button=>{button.hidden=!student;});
    const floating=document.getElementById('tb-student-menu-floating');const activeHasTrigger=!!active?.querySelector('.header .tb-student-menu-trigger');
    if(floating)floating.hidden=!student||activeHasTrigger;
    if(!student&&document.getElementById(MENU_ID)?.classList.contains('open'))closeStudentMenu();
  }

  function wrapShowScreen(){
    const base=window.showScreen;if(typeof base!=='function'||base.__tbStudentMenuDesign)return;
    const wrapped=function(){const result=base.apply(this,arguments);requestAnimationFrame(syncAvailability);return result;};wrapped.__tbStudentMenuDesign=true;window.showScreen=wrapped;
  }

  function install(){ensureStyles();ensureMenu();ensureTriggers();wrapShowScreen();syncAvailability();window.addEventListener('pageshow',syncAvailability,{passive:true});window.addEventListener('resize',syncAvailability,{passive:true});window.TeamBullsStudentMenu=Object.freeze({open:openStudentMenu,close:closeStudentMenu,sync:syncAvailability});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
