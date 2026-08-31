/* Team Bulls v10.10.15 — Home do aluno + hotbar, isoladas do boot crítico. */
'use strict';
(()=>{
  if(window.__TEAM_BULLS_STUDENT_HOME_LAYOUT_10_10_15__)return;
  window.__TEAM_BULLS_STUDENT_HOME_LAYOUT_10_10_15__=true;

  const VERSION='10.10.15-home2';
  const MAX_FEEDBACKS=5;
  const MAX_WEIGHT_POINTS=10;
  const REFRESH_TTL=30000;
  let refreshSequence=0;
  let lastRefreshUid='';
  let lastRefreshAt=0;
  let hotbarIntent='home';
  let observers=[];
  let initTries=0;

  const currentUser=()=>{try{return typeof CURRENT_USER!=='undefined'?CURRENT_USER:null;}catch(error){return null;}};
  const student=()=>{const user=currentUser();return user?.role==='student'?user:null;};
  const uidOf=value=>String(value?.uid||value?.id||'').trim();
  const studentUid=()=>uidOf(student());
  const cloudReady=()=>{try{return typeof MODE!=='undefined'&&MODE==='cloud'&&typeof db!=='undefined'&&!!db;}catch(error){return false;}};
  const activeScreen=()=>document.querySelector('.screen.active')?.id||'';
  const createdMillis=value=>{try{if(value?.toMillis)return value.toMillis();if(value?.toDate)return value.toDate().getTime();const ms=new Date(value||0).getTime();return Number.isFinite(ms)?ms:0;}catch(error){return 0;}};
  const validIso=value=>/^\d{4}-\d{2}-\d{2}$/.test(String(value||''));
  const fmtDate=value=>{
    const raw=String(value||'');
    if(validIso(raw)){const [year,month,day]=raw.split('-');return `${day}/${month}/${year}`;}
    const ms=createdMillis(value);return ms?new Date(ms).toLocaleDateString('pt-BR'):'—';
  };

  function ensureStyles(){
    if(document.getElementById('tb-student-home-layout-style'))return;
    const style=document.createElement('style');
    style.id='tb-student-home-layout-style';
    style.textContent=`
      #screen-home.tb-survivor-home .quick-nav{display:none!important}
      #screen-home.tb-survivor-home #home-stats{align-items:stretch}
      #screen-home.tb-survivor-home #home-stats>.stat-cell{position:relative;display:flex;flex-direction:column;justify-content:center;min-height:112px!important;padding-bottom:13px!important;border-color:#3f332c;background:linear-gradient(155deg,#171412,#10100f 72%)}
      .tb-protocol-next{display:block;margin:9px -1px -2px;padding:7px 5px 0;border-top:1px solid #302822;font:500 7px/1.45 'DM Mono',monospace;color:#776b62;letter-spacing:.55px;text-transform:uppercase}
      .tb-protocol-next strong{display:block;margin-top:1px;color:#cbbbae;font:500 9px/1.35 'DM Mono',monospace;letter-spacing:.35px}
      .tb-protocol-next[data-state="pending"] strong{color:#d78086}
      .tb-home-intelligence{padding:2px 18px 14px}
      .tb-home-section-head{display:flex;align-items:center;gap:8px;margin:15px 0 9px}
      .tb-home-section-head::before{content:'';width:13px;height:2px;background:#73423c;box-shadow:0 0 8px rgba(225,29,72,.18)}
      .tb-home-section-head strong{font:500 9px 'DM Mono',monospace;color:#887a70;letter-spacing:1.2px;text-transform:uppercase}
      .tb-home-section-head span{margin-left:auto;font:400 7px 'DM Mono',monospace;color:#514a45;letter-spacing:.65px;text-transform:uppercase}
      .tb-feedback-stack{display:grid;gap:7px}
      .tb-feedback-compact{border:1px solid #362d28;background:linear-gradient(145deg,#151311,#0e0e0d 74%);border-radius:8px;overflow:hidden}
      .tb-feedback-compact[data-unread="true"]{border-color:#57323a;box-shadow:inset 3px 0 #8f2732}
      .tb-feedback-toggle{width:100%;display:flex;align-items:flex-start;gap:9px;padding:10px 11px;border:0;background:transparent;color:#eee;text-align:left;cursor:pointer}
      .tb-feedback-index{width:24px;height:24px;flex:0 0 24px;display:grid;place-items:center;border:1px solid #44372f;background:#0d0c0b;color:#9e8f83;font:500 7px 'DM Mono',monospace}
      .tb-feedback-copy{min-width:0;flex:1}
      .tb-feedback-copy strong{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font:700 15px/1.15 'Barlow Condensed',sans-serif;color:#e7ddd5;letter-spacing:.2px}
      .tb-feedback-copy small{display:block;margin-top:3px;font:400 7px/1.4 'DM Mono',monospace;color:#685f59;letter-spacing:.45px;text-transform:uppercase}
      .tb-feedback-chevron{padding-top:2px;color:#796d64;font:500 10px 'DM Mono',monospace}
      .tb-feedback-body{display:none;padding:0 12px 12px 44px;color:#c8bbb2;font:400 12px/1.5 'Barlow',sans-serif;white-space:pre-wrap;overflow-wrap:anywhere}
      .tb-feedback-compact.is-open .tb-feedback-body{display:block}
      .tb-feedback-empty,.tb-weight-empty{padding:14px 12px;border:1px dashed #332b26;background:#0e0d0c;color:#685f59;font:400 8px/1.5 'DM Mono',monospace;letter-spacing:.5px;text-align:center;text-transform:uppercase}
      .tb-weight-panel{border:1px solid #382f29;background:linear-gradient(150deg,#151311,#0d0d0c 78%);border-radius:9px;padding:11px}
      .tb-weight-summary{display:flex;align-items:flex-end;gap:12px;margin-bottom:8px}
      .tb-weight-current{font:800 27px/1 'Barlow Condensed',sans-serif;color:#dfd3ca}
      .tb-weight-current small{font:500 9px 'DM Mono',monospace;color:#6f655e;margin-left:3px}
      .tb-weight-delta{margin-left:auto;font:500 8px 'DM Mono',monospace;color:#9c8f86;letter-spacing:.4px}
      .tb-weight-chart{width:100%;height:150px;display:block;background:#0c0b0a;border:1px solid #29231f}
      .tb-hotbar-shell{display:none;position:fixed;z-index:56;left:50%;transform:translateX(-50%);bottom:0;width:min(480px,100%);padding:8px 9px calc(8px + env(safe-area-inset-bottom));background:linear-gradient(180deg,rgba(8,8,8,0),rgba(8,8,8,.98) 22%);pointer-events:none}
      .tb-student-hotbar{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:3px;padding:5px;border:1px solid #47382f;background:#0c0b0a;border-radius:10px;box-shadow:0 12px 34px rgba(0,0,0,.52);pointer-events:auto}
      .tb-student-hotbar button{min-width:0;height:51px;border:1px solid transparent;border-radius:7px;background:transparent;color:#756a62;padding:5px 2px;font:500 6.5px/1.15 'DM Mono',monospace;letter-spacing:.35px;text-transform:uppercase;cursor:pointer}
      .tb-student-hotbar button svg{display:block;width:19px;height:19px;margin:0 auto 5px;fill:none;stroke:#aa9b90;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}
      .tb-student-hotbar button.is-active{border-color:#594238;background:#171210;color:#d9cbc1}
      .tb-student-hotbar button.is-active svg{stroke:#ded0c5}
      html.tb-student-hotbar-on #app{padding-bottom:max(84px,calc(74px + env(safe-area-inset-bottom)))}
      html.tb-student-hotbar-on .screen{padding-bottom:max(104px,calc(92px + env(safe-area-inset-bottom)))}
      @media(max-width:899px),(pointer:coarse){html.tb-student-hotbar-on .tb-hotbar-shell{display:block}}
      @media(min-width:900px) and (pointer:fine){.tb-hotbar-shell{display:none!important}}
      @media(max-width:360px){.tb-student-hotbar button{font-size:5.8px;letter-spacing:.15px}.tb-student-hotbar button svg{width:18px;height:18px}}
    `;
    document.head.appendChild(style);
  }

  function svgIcon(name){
    const paths={
      home:'<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10.5V20h13v-9.5"/>',
      workout:'<path d="M4 9v6M7 7v10M10 10v4M14 10v4M17 7v10M20 9v6M10 12h4"/>',
      meals:'<path d="M7 3v8M4 3v5a3 3 0 0 0 6 0V3M7 11v10M16 3v18M16 3c3 2 4 5 4 8h-4"/>',
      instructions:'<path d="M2.5 5.5A4 4 0 0 1 6.5 4H11v15H6.5a4 4 0 0 0-4 2z"/><path d="M21.5 5.5A4 4 0 0 0 17.5 4H13v15h4.5a4 4 0 0 1 4 2z"/>',
      reports:'<path d="M6 2h9l4 4v16H6z"/><path d="M14 2v5h5M9 12h6M9 16h6"/>'
    };
    return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name]||''}</svg>`;
  }

  function ensureHotbar(){
    let shell=document.getElementById('tb-hotbar-shell');
    if(shell)return shell;
    shell=document.createElement('div');
    shell.id='tb-hotbar-shell';shell.className='tb-hotbar-shell';shell.hidden=true;
    shell.setAttribute('aria-label','Navegação principal do aluno');
    const nav=document.createElement('nav');nav.className='tb-student-hotbar';
    const items=[
      ['home','INÍCIO',()=>{hotbarIntent='home';if(typeof goHome==='function')goHome();}],
      ['workout','TREINO',()=>{hotbarIntent='workout';if(typeof goHome==='function')goHome();setTimeout(()=>{document.getElementById('workout-list')?.scrollIntoView({behavior:'smooth',block:'start'});setHotbarActive('workout');},90);}],
      ['meals','SUPRIMENTOS',()=>{hotbarIntent='meals';if(typeof openMeals==='function')openMeals();}],
      ['instructions','INSTRUÇÕES',()=>{hotbarIntent='instructions';if(typeof openInstructions==='function')openInstructions();}],
      ['reports','RELATÓRIOS',()=>{hotbarIntent='reports';if(typeof openMyQuestionnaires==='function')openMyQuestionnaires();}]
    ];
    items.forEach(([key,label,action])=>{const button=document.createElement('button');button.type='button';button.dataset.hotbar=key;button.innerHTML=svgIcon(key)+`<span>${label}</span>`;button.addEventListener('click',action);nav.appendChild(button);});
    shell.appendChild(nav);document.body.appendChild(shell);return shell;
  }

  function setHotbarActive(key){document.querySelectorAll('.tb-student-hotbar button').forEach(button=>button.classList.toggle('is-active',button.dataset.hotbar===key));}
  function hotbarKeyForScreen(id){
    const screen=String(id||'');
    if(screen==='screen-home')return hotbarIntent==='workout'?'workout':'home';
    if(screen==='screen-meals'||screen.includes('diet'))return'meals';
    if(screen==='screen-instructions')return'instructions';
    if(screen==='screen-my-quest'||screen.includes('questionnaire')||screen.includes('weekly-checkin'))return'reports';
    if(/(?:workout|exercise|screen-day$|screen-day-)/.test(screen)&&!screen.includes('trainer')&&!screen.includes('ts-'))return'workout';
    return'';
  }

  function syncHotbar(){
    ensureHotbar();
    const id=activeScreen(),visible=!!student()&&!['screen-loading','screen-auth'].includes(id)&&!id.includes('trainer')&&!id.startsWith('screen-ts-');
    document.documentElement.classList.toggle('tb-student-hotbar-on',visible);
    const shell=document.getElementById('tb-hotbar-shell');if(shell)shell.hidden=!visible;
    if(!visible)return;
    const key=hotbarKeyForScreen(id);if(key)setHotbarActive(key);else document.querySelectorAll('.tb-student-hotbar button').forEach(button=>button.classList.remove('is-active'));
    if(id==='screen-home'){applyStudentHomeStructure();scheduleRefresh(false);}
  }

  function reduceStudentNavigation(){
    if(!student())return;
    const home=document.getElementById('screen-home');if(home)home.classList.add('tb-survivor-home');
    const desktop=document.getElementById('student-desktop-nav');
    if(!desktop)return;
    const blocked=['openFoodOptions','openTechniques','openExerciseOptions','openPhotos',"openV107Operations('notices')",'openCalendar',"openV107Operations('sync')"];
    desktop.querySelectorAll('button').forEach(button=>{const action=String(button.getAttribute('onclick')||'');if(blocked.some(item=>action.includes(item)))button.style.display='none';});
  }

  function ensureNextDateSlots(){
    const stats=document.getElementById('home-stats');if(!stats)return[];
    const cells=[...stats.querySelectorAll(':scope > .stat-cell')];if(cells.length<2)return[];
    cells.slice(0,2).forEach((cell,index)=>{
      let slot=cell.querySelector('.tb-protocol-next');
      if(!slot){slot=document.createElement('span');slot.className='tb-protocol-next';slot.dataset.kind=index===0?'training':'diet';slot.innerHTML=`<span>${index===0?'PRÓXIMA ATUALIZAÇÃO':'PRÓXIMO PROTOCOLO'}</span><strong>CARREGANDO...</strong>`;cell.appendChild(slot);}
    });
    return cells.slice(0,2).map(cell=>cell.querySelector('.tb-protocol-next'));
  }

  async function refreshNextProtocolDate(uid,sequence){
    const slots=ensureNextDateSlots();if(slots.length<2)return;
    let state=null;
    try{
      if(typeof loadProtocolReviewSchedule==='function'&&typeof v109ProtocolState==='function'){
        const schedule=await loadProtocolReviewSchedule(uid,true);state=v109ProtocolState(schedule);
      }
    }catch(error){console.warn('[Team Bulls] Cronograma da home indisponível',error);}
    if(sequence!==refreshSequence||studentUid()!==uid)return;
    const date=state?.nextDueDate?fmtDate(state.nextDueDate):'A DEFINIR',pending=!!state?.pending;
    slots.forEach((slot,index)=>{if(!slot)return;slot.dataset.state=pending?'pending':'scheduled';const label=slot.querySelector('span'),strong=slot.querySelector('strong');if(label)label.textContent=pending?'ATUALIZAÇÃO PENDENTE DESDE':index===0?'PRÓXIMA ATUALIZAÇÃO':'PRÓXIMO PROTOCOLO';if(strong)strong.textContent=date;});
  }

  function ensureHomeInsights(){
    const stats=document.getElementById('home-stats'),home=document.getElementById('screen-home');if(!stats||!home)return null;
    let host=document.getElementById('tb-home-intelligence');if(host)return host;
    host=document.createElement('section');host.id='tb-home-intelligence';host.className='tb-home-intelligence';
    const feedbackHead=document.createElement('div');feedbackHead.className='tb-home-section-head';feedbackHead.innerHTML='<strong>FEEDBACKS DO TREINADOR</strong><span>TRANSMISSÕES</span>';
    const feedback=document.createElement('div');feedback.id='tb-home-feedbacks';feedback.className='tb-feedback-stack';feedback.innerHTML='<div class="tb-feedback-empty">CARREGANDO TRANSMISSÕES...</div>';
    const weightHead=document.createElement('div');weightHead.className='tb-home-section-head';weightHead.innerHTML='<strong>EVOLUÇÃO DO PESO</strong><span>REGISTROS</span>';
    const weight=document.createElement('div');weight.id='tb-home-weight';weight.innerHTML='<div class="tb-weight-empty">CARREGANDO REGISTROS...</div>';
    host.append(feedbackHead,feedback,weightHead,weight);stats.insertAdjacentElement('afterend',host);return host;
  }

  function feedbackTypeLabel(data){const type=String(data?.feedbackType||'general');if(type==='protocol_update')return'ATUALIZAÇÃO COMPLETA';if(type==='weekly_report')return'RELATÓRIO SEMANAL';return'TRANSMISSÃO';}

  async function fetchStudentFeedbacks(uid){
    if(!cloudReady())return[];
    try{
      /* Sem limit antes da ordenação: garante que os 5 exibidos sejam realmente os mais recentes sem exigir índice composto novo. */
      const query=db.collection('feedback').where('studentId','==',uid);
      const snap=typeof cloudGet==='function'?await cloudGet(query,'feedbacks da home'):await query.get();
      return snap.docs.map(doc=>({id:doc.id,...doc.data()})).sort((a,b)=>createdMillis(b.createdAt)-createdMillis(a.createdAt)||String(b.id).localeCompare(String(a.id))).slice(0,MAX_FEEDBACKS);
    }catch(error){console.warn('[Team Bulls] Feedbacks compactos indisponíveis',error);return[];}
  }

  function renderFeedbacks(items){
    const host=document.getElementById('tb-home-feedbacks');if(!host)return;host.replaceChildren();
    if(!items.length){const empty=document.createElement('div');empty.className='tb-feedback-empty';empty.textContent='NENHUM FEEDBACK DO TREINADOR REGISTRADO';host.appendChild(empty);return;}
    items.forEach((item,index)=>{
      const card=document.createElement('article');card.className='tb-feedback-compact';card.dataset.unread=item.read===true?'false':'true';
      const toggle=document.createElement('button');toggle.type='button';toggle.className='tb-feedback-toggle';toggle.setAttribute('aria-expanded','false');
      const badge=document.createElement('span');badge.className='tb-feedback-index';badge.textContent=String(index+1).padStart(2,'0');
      const copy=document.createElement('span');copy.className='tb-feedback-copy';
      const title=document.createElement('strong');title.textContent=String(item.title||feedbackTypeLabel(item)||'Feedback do treinador').trim().slice(0,160);
      const meta=document.createElement('small'),date=fmtDate(item.createdAt);meta.textContent=`${feedbackTypeLabel(item)}${date!=='—'?' // '+date:''}${item.read===true?'':' // NOVO'}`;
      copy.append(title,meta);
      const chevron=document.createElement('span');chevron.className='tb-feedback-chevron';chevron.textContent='▸';
      const body=document.createElement('div');body.className='tb-feedback-body';body.textContent=String(item.message||'').trim()||'Sem conteúdo adicional.';
      toggle.append(badge,copy,chevron);toggle.addEventListener('click',()=>{const open=card.classList.toggle('is-open');toggle.setAttribute('aria-expanded',open?'true':'false');chevron.textContent=open?'▾':'▸';});
      card.append(toggle,body);host.appendChild(card);
    });
  }

  async function fetchWeightHistory(uid){
    if(!cloudReady())return[];
    try{
      /* Consulta todos os registros do próprio aluno e só então ordena/deduplica por data. */
      const query=db.collection('progressPhotos').where('userId','==',uid);
      const snap=typeof cloudGet==='function'?await cloudGet(query,'evolução de peso da home'):await query.get();
      const byDate=new Map();
      snap.docs.forEach(doc=>{const data=doc.data()||{},weight=Number(data.weight),date=String(data.date||'');if(!Number.isFinite(weight)||weight<20||weight>500||!validIso(date))return;const current=byDate.get(date),stamp=createdMillis(data.createdAt);if(!current||stamp>=current.stamp)byDate.set(date,{date,weight:Math.round(weight*10)/10,stamp});});
      return [...byDate.values()].sort((a,b)=>a.date.localeCompare(b.date)).slice(-MAX_WEIGHT_POINTS);
    }catch(error){console.warn('[Team Bulls] Histórico de peso indisponível',error);return[];}
  }

  function svgNode(name,attrs={}){const node=document.createElementNS('http://www.w3.org/2000/svg',name);Object.entries(attrs).forEach(([key,value])=>node.setAttribute(key,String(value)));return node;}
  function renderWeightChart(points){
    const host=document.getElementById('tb-home-weight');if(!host)return;host.replaceChildren();
    if(!points.length){const empty=document.createElement('div');empty.className='tb-weight-empty';empty.textContent='SEM REGISTROS DE PESO PARA EXIBIR';host.appendChild(empty);return;}
    const panel=document.createElement('div');panel.className='tb-weight-panel';
    const summary=document.createElement('div');summary.className='tb-weight-summary';
    const current=document.createElement('div');current.className='tb-weight-current';current.textContent=points.at(-1).weight.toLocaleString('pt-BR',{maximumFractionDigits:1});const unit=document.createElement('small');unit.textContent='KG';current.appendChild(unit);
    const delta=document.createElement('div');delta.className='tb-weight-delta';const change=Math.round((points.at(-1).weight-points[0].weight)*10)/10;delta.textContent=points.length>1?`${change>0?'+':''}${change.toLocaleString('pt-BR',{maximumFractionDigits:1})} KG // ${points.length} REGISTROS`:'1 REGISTRO';
    summary.append(current,delta);panel.appendChild(summary);
    const width=320,height=150,pad={l:32,r:12,t:14,b:27},plotW=width-pad.l-pad.r,plotH=height-pad.t-pad.b;
    const weights=points.map(point=>point.weight),rawMin=Math.min(...weights),rawMax=Math.max(...weights),spread=Math.max(1,rawMax-rawMin),min=rawMin-spread*.18,max=rawMax+spread*.18;
    const svg=svgNode('svg',{viewBox:`0 0 ${width} ${height}`,class:'tb-weight-chart','aria-label':'Gráfico de evolução do peso'});
    for(let i=0;i<4;i++){const ratio=i/3,y=pad.t+plotH*ratio,line=svgNode('line',{x1:pad.l,y1:y,x2:width-pad.r,y2:y,stroke:'#2f2823','stroke-width':1});svg.appendChild(line);const label=svgNode('text',{x:3,y:y+3,fill:'#6f655e','font-size':7,'font-family':'DM Mono, monospace'});label.textContent=(max-(max-min)*ratio).toLocaleString('pt-BR',{maximumFractionDigits:1});svg.appendChild(label);}
    const coords=points.map((point,index)=>{const x=points.length===1?pad.l+plotW/2:pad.l+(plotW*index/(points.length-1)),y=pad.t+((max-point.weight)/(max-min))*plotH;return{x,y,point};});
    if(coords.length>1)svg.appendChild(svgNode('polyline',{points:coords.map(p=>`${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '),fill:'none',stroke:'#a42b38','stroke-width':2.2}));
    coords.forEach((item,index)=>{svg.appendChild(svgNode('circle',{cx:item.x,cy:item.y,r:3.2,fill:'#d7c8bc',stroke:'#a42b38','stroke-width':1.5}));if(index===0||index===coords.length-1||coords.length<=5){const label=svgNode('text',{x:item.x,y:height-9,fill:'#655d57','font-size':6.5,'font-family':'DM Mono, monospace','text-anchor':index===0?'start':index===coords.length-1?'end':'middle'});label.textContent=fmtDate(item.point.date).slice(0,5);svg.appendChild(label);}});
    panel.appendChild(svg);host.appendChild(panel);
  }

  function applyStudentHomeStructure(){if(!student())return;reduceStudentNavigation();ensureNextDateSlots();ensureHomeInsights();}
  async function refreshHome(force=false){
    const uid=studentUid();if(!uid)return;
    applyStudentHomeStructure();
    const now=Date.now();if(!force&&lastRefreshUid===uid&&now-lastRefreshAt<REFRESH_TTL)return;
    lastRefreshUid=uid;lastRefreshAt=now;const sequence=++refreshSequence;
    await Promise.allSettled([
      refreshNextProtocolDate(uid,sequence),
      fetchStudentFeedbacks(uid).then(items=>{if(sequence===refreshSequence&&studentUid()===uid)renderFeedbacks(items);}),
      fetchWeightHistory(uid).then(points=>{if(sequence===refreshSequence&&studentUid()===uid)renderWeightChart(points);})
    ]);
  }
  function scheduleRefresh(force=false){setTimeout(()=>{if(activeScreen()==='screen-home')refreshHome(force).catch(()=>{});},80);}
  function observeScreens(){observers.forEach(observer=>observer.disconnect());observers=[];document.querySelectorAll('.screen').forEach(screen=>{const observer=new MutationObserver(records=>{if(records.some(record=>record.attributeName==='class'))syncHotbar();});observer.observe(screen,{attributes:true,attributeFilter:['class']});observers.push(observer);});}

  function boot(){
    ensureStyles();ensureHotbar();observeScreens();syncHotbar();
    window.addEventListener('pageshow',()=>{syncHotbar();scheduleRefresh(true);},{passive:true});
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){syncHotbar();scheduleRefresh(true);}});
    window.addEventListener('team-bulls-v107-ready',()=>{syncHotbar();scheduleRefresh(true);});
    window.addEventListener('team-bulls-runtime-ready',()=>{syncHotbar();scheduleRefresh(true);});
    setInterval(()=>{if(student()){syncHotbar();if(activeScreen()==='screen-home')scheduleRefresh(false);}else document.documentElement.classList.remove('tb-student-hotbar-on');},5000);
    window.TeamBullsStudentHomeLayout=Object.freeze({version:VERSION,refresh:()=>refreshHome(true),syncHotbar});
  }

  function waitForApp(){
    initTries++;
    const ready=document.getElementById('screen-home')&&typeof window.MutationObserver==='function';
    if(ready){boot();return;}
    if(initTries<80)setTimeout(waitForApp,100);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',waitForApp,{once:true});else waitForApp();
})();