/* Team Bulls v10.10.24 — biblioteca de treinos do aluno em tela própria. */
'use strict';
(()=>{
  if(window.__TEAM_BULLS_STUDENT_WORKOUT_LIBRARY_101024__)return;
  window.__TEAM_BULLS_STUDENT_WORKOUT_LIBRARY_101024__=true;

  const VERSION='10.10.24-workoutlibrary2';
  let patchTimer=null;

  const currentUser=()=>{try{return typeof CURRENT_USER!=='undefined'?CURRENT_USER:null;}catch(error){return null;}};
  const coreMode=()=>{try{return typeof MODE!=='undefined'?MODE:'';}catch(error){return'';}};
  const studentContext=()=>{
    if(currentUser()?.role==='trainer'||document.body?.classList.contains('trainer-desktop'))return false;
    if(currentUser()?.role==='student')return true;
    return coreMode()==='local'||document.body?.classList.contains('student-desktop');
  };

  function injectStyles(){
    if(document.getElementById('tb-student-workout-library-style'))return;
    const style=document.createElement('style');
    style.id='tb-student-workout-library-style';
    style.textContent=`
      #screen-home #workout-list,
      #screen-home #workout-empty,
      #screen-home .tb-home-workout-source-hidden{display:none!important}
      #screen-workout-library .content{max-width:1420px;margin:0 auto;padding-top:14px}
      .tb-workout-library-hero{border:1px solid #43352d;border-left:3px solid #9d2832;background:linear-gradient(150deg,#171311,#0e0d0c 76%);padding:14px 15px;margin-bottom:12px}
      .tb-workout-library-hero span{display:block;color:#9c313b;font:600 8px 'DM Mono',monospace;letter-spacing:1.1px;text-transform:uppercase}
      .tb-workout-library-hero strong{display:block;margin-top:5px;color:#e8ddd5;font:800 24px/1 'Barlow Condensed',sans-serif;letter-spacing:.25px}
      .tb-workout-library-hero p{margin:6px 0 0;color:#81756d;font-size:11px;line-height:1.45}
      #tb-student-workout-list{display:grid;gap:8px}
      #screen-workout-library .empty-state{margin-top:8px}
      @media(max-width:720px){#screen-workout-library .content{padding-top:10px}.tb-workout-library-hero{padding:12px}.tb-workout-library-hero strong{font-size:21px}}
    `;
    document.head.appendChild(style);
  }

  function hideHomeWorkoutSource(){
    if(!studentContext())return false;
    const list=document.querySelector('#screen-home #workout-list');
    const empty=document.querySelector('#screen-home #workout-empty');
    const header=list?.previousElementSibling?.classList?.contains('section-header')?list.previousElementSibling:null;
    [header,list,empty].filter(Boolean).forEach(element=>{
      element.classList.add('tb-home-workout-source-hidden');
      element.setAttribute('aria-hidden','true');
    });
    return !!list;
  }

  function ensureScreen(){
    let screen=document.getElementById('screen-workout-library');
    if(screen)return screen;
    const app=document.getElementById('app');if(!app)return null;
    screen=document.createElement('div');screen.className='screen';screen.id='screen-workout-library';
    screen.innerHTML=`<div class="header"><button class="btn-icon" type="button" onclick="goHome()" aria-label="Voltar ao início">←</button><div class="header-title">TREINOS</div><button class="btn-icon ghost" type="button" onclick="TeamBullsStudentWorkoutLibrary.refresh()" aria-label="Atualizar lista de treinos" title="Atualizar">↻</button></div><div class="content"><section class="tb-workout-library-hero"><span>SEUS PROTOCOLOS</span><strong id="tb-workout-library-count">Treinos disponíveis</strong><p>Acesse aqui todos os seus treinos pela aba Treino da navegação principal.</p></section><div id="tb-student-workout-list"></div><div class="empty-state" id="tb-student-workout-empty" style="display:none"><div class="empty-icon">🏋️</div><div class="empty-label">Nenhum treino disponível</div><div class="empty-hint">Seu treinador ainda não cadastrou um protocolo.</div></div></div>`;
    app.appendChild(screen);return screen;
  }

  function syncList(){
    ensureScreen();hideHomeWorkoutSource();
    const source=document.getElementById('workout-list');
    const target=document.getElementById('tb-student-workout-list');
    const empty=document.getElementById('tb-student-workout-empty');
    const sourceEmpty=document.getElementById('workout-empty');
    if(!target||!empty)return false;
    target.replaceChildren();
    if(source){Array.from(source.children).forEach(node=>target.appendChild(node.cloneNode(true)));}
    const count=target.querySelectorAll('.workout-card').length;
    const countLabel=document.getElementById('tb-workout-library-count');
    if(countLabel)countLabel.textContent=count===1?'1 treino disponível':`${count} treinos disponíveis`;
    const sourceIsEmpty=!source||(!source.children.length&&sourceEmpty?.style.display!=='none');
    empty.style.display=sourceIsEmpty?'block':'none';
    return true;
  }

  function setWorkoutActive(){
    document.querySelectorAll('.tb-v17-hotbar button').forEach(button=>button.classList.toggle('is-active',button.dataset.hotbar==='workout'));
  }

  function openLibrary(){
    if(!studentContext())return false;
    injectStyles();ensureScreen();hideHomeWorkoutSource();syncList();
    if(typeof showScreen==='function')showScreen('screen-workout-library');
    else document.getElementById('screen-workout-library')?.classList.add('active');
    requestAnimationFrame(()=>{syncList();setWorkoutActive();window.scrollTo({top:0,behavior:'auto'});});
    return true;
  }

  function patchHotbar(){
    if(!studentContext())return false;
    const button=document.querySelector('.tb-v17-hotbar [data-hotbar="workout"]');
    if(!button)return false;
    if(button.dataset.tbWorkoutLibrary==='1')return true;
    const replacement=button.cloneNode(true);
    replacement.dataset.tbWorkoutLibrary='1';
    replacement.setAttribute('aria-label','TREINO');replacement.title='TREINO';
    replacement.addEventListener('click',event=>{event.preventDefault();openLibrary();});
    button.replaceWith(replacement);
    return true;
  }

  function patchSoon(attempt=0){
    if(patchHotbar()||attempt>=20)return;
    clearTimeout(patchTimer);patchTimer=setTimeout(()=>patchSoon(attempt+1),attempt<5?80:220);
  }

  function sync(){
    injectStyles();ensureScreen();hideHomeWorkoutSource();patchSoon();
    if(document.getElementById('screen-workout-library')?.classList.contains('active')){syncList();setWorkoutActive();}
  }

  function install(){sync();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
  window.addEventListener('team-bulls-student-runtime-ready',sync);
  window.addEventListener('team-bulls-runtime-ready',sync);
  window.addEventListener('pageshow',sync,{passive:true});

  window.TeamBullsStudentWorkoutLibrary=Object.freeze({version:VERSION,open:openLibrary,refresh:syncList,patchHotbar,hideHomeWorkoutSource});
})();
