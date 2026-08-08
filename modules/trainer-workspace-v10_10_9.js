/* Team Bulls v10.10.9 — atalhos de prescrição e rascunho privado do treinador. */
'use strict';
(()=>{
  if(window.__TEAM_BULLS_TRAINER_WORKSPACE_V10109__)return;
  window.__TEAM_BULLS_TRAINER_WORKSPACE_V10109__=true;

  const PRESCRIPTION_SCREENS=new Set([
    'screen-ts-workout','screen-ts-day','screen-ts-exercise',
    'screen-ts-meals','screen-ts-diet-detail'
  ]);
  const NOTE_MAX=5000;
  let reportLoadToken=0;

  function trainerStudent(){
    if(typeof CURRENT_USER==='undefined'||CURRENT_USER?.role!=='trainer')return null;
    if(typeof VIEW_STUDENT==='undefined'||!VIEW_STUDENT?.uid)return null;
    return VIEW_STUDENT;
  }
  function activeScreenId(){return document.querySelector('.screen.active')?.id||'';}
  function studentName(){return String(trainerStudent()?.name||'Aluno').trim()||'Aluno';}
  function safe(value){return typeof esc==='function'?esc(value):String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
  function dateLabel(value){
    try{
      if(!value)return'—';
      if(typeof value==='string')return typeof fmt==='function'?fmt(value):value;
      const date=typeof value.toDate==='function'?value.toDate():value?.seconds?new Date(value.seconds*1000):null;
      return date instanceof Date&&!Number.isNaN(date.getTime())?date.toLocaleDateString('pt-BR'):'—';
    }catch(error){return'—';}
  }

  function ensureStyles(){
    if(document.getElementById('tb-trainer-workspace-style'))return;
    const style=document.createElement('style');style.id='tb-trainer-workspace-style';style.textContent=`
      .tb-trainer-tools{position:fixed;right:14px;bottom:18px;z-index:7600;display:none;gap:8px;align-items:center;padding:7px;border:1px solid rgba(255,255,255,.1);border-radius:14px;background:rgba(12,12,12,.94);box-shadow:0 12px 36px rgba(0,0,0,.45);backdrop-filter:blur(10px)}
      .tb-trainer-tools.visible{display:flex}.tb-trainer-tool{min-height:40px;border:1px solid rgba(198,61,61,.42);border-radius:10px;background:#211313;color:#fff;padding:0 11px;font:800 10px/1 'DM Mono',monospace;letter-spacing:.04em;cursor:pointer;white-space:nowrap}.tb-trainer-tool.secondary{background:#171717;border-color:rgba(255,255,255,.14)}
      .tb-workspace-sheet{max-width:720px}.tb-workspace-title-sub{margin:-5px 0 14px;color:#888;font:500 10px/1.4 'DM Mono',monospace}.tb-workspace-list{display:grid;gap:8px;max-height:min(58vh,560px);overflow:auto;padding-right:3px}.tb-workspace-section{margin:13px 0 7px;color:#aaa;font:800 10px/1.2 'DM Mono',monospace;letter-spacing:.07em}.tb-workspace-report{width:100%;display:flex;align-items:center;justify-content:space-between;gap:10px;text-align:left;border:1px solid rgba(255,255,255,.09);border-radius:11px;background:#171717;color:#eee;padding:11px 12px}.tb-workspace-report[disabled]{opacity:.55}.tb-workspace-report strong{display:block;font-size:12px}.tb-workspace-report small{display:block;margin-top:4px;color:#888;font:500 9px/1.35 'DM Mono',monospace}.tb-workspace-status{flex:0 0 auto;color:#c7c7c7;font:800 9px/1 'DM Mono',monospace}.tb-workspace-empty{padding:16px;border:1px dashed rgba(255,255,255,.12);border-radius:10px;color:#777;font:500 10px/1.5 'DM Mono',monospace}.tb-private-note{width:100%;min-height:250px;resize:vertical}.tb-private-note-hint{margin:8px 0 14px;color:#777;font:500 9px/1.45 'DM Mono',monospace}.tb-note-status{min-height:18px;margin-top:8px;color:#888;font:600 9px/1.35 'DM Mono',monospace}
      @media(max-width:899px){.tb-trainer-tools{right:10px;bottom:74px;left:10px;justify-content:center}.tb-trainer-tool{flex:1;padding:0 7px}.tb-workspace-sheet{max-height:88vh}.tb-workspace-list{max-height:52vh}}
    `;document.head.appendChild(style);
  }

  function ensureDock(){
    ensureStyles();let dock=document.getElementById('tb-trainer-tools');if(dock)return dock;
    dock=document.createElement('div');dock.id='tb-trainer-tools';dock.className='tb-trainer-tools';dock.setAttribute('aria-label','Ferramentas privadas do treinador');
    dock.innerHTML='<button type="button" class="tb-trainer-tool" id="tb-open-student-reports">📋 RELATÓRIOS / FOTOS</button><button type="button" class="tb-trainer-tool secondary" id="tb-open-private-note">✎ RASCUNHO</button>';
    document.body.appendChild(dock);
    dock.querySelector('#tb-open-student-reports').addEventListener('click',openQuickReports);
    dock.querySelector('#tb-open-private-note').addEventListener('click',openPrivateNote);
    return dock;
  }
  function syncDock(){
    const dock=ensureDock(),student=trainerStudent(),visible=!!student&&PRESCRIPTION_SCREENS.has(activeScreenId());dock.classList.toggle('visible',visible);
    if(visible){dock.querySelector('#tb-open-private-note').title='Rascunho privado de '+studentName();dock.querySelector('#tb-open-student-reports').title='Relatórios e fotos de '+studentName();}
  }

  function ensureReportsModal(){
    let modal=document.getElementById('tb-trainer-reports-modal');if(modal)return modal;
    modal=document.createElement('div');modal.id='tb-trainer-reports-modal';modal.className='modal-backdrop';modal.dataset.tbBackdropClose='allow';modal.innerHTML=`<div class="modal-sheet tb-workspace-sheet"><div class="modal-handle"></div><div class="modal-title" id="tb-trainer-reports-title">Relatórios e fotos</div><div class="tb-workspace-title-sub" id="tb-trainer-reports-sub"></div><div id="tb-trainer-reports-content" class="tb-workspace-list"></div><button type="button" class="btn-ghost" id="tb-trainer-reports-refresh">ATUALIZAR</button><button type="button" class="btn-ghost" onclick="closeModal('tb-trainer-reports-modal')">FECHAR</button></div>`;
    document.body.appendChild(modal);modal.querySelector('#tb-trainer-reports-refresh').addEventListener('click',loadQuickReports);return modal;
  }
  function questionnaireLabel(q){
    try{if(typeof v109ReportModeLabel==='function'&&typeof v109ReportMode==='function')return v109ReportModeLabel(v109ReportMode(q));}catch(error){}
    return q?.reportType==='photo-only'?'Somente fotos':q?.reportType==='written-only'?'Relatório escrito':'Relatório solicitado';
  }
  function renderQuickReports(weekly,questionnaires){
    const host=document.getElementById('tb-trainer-reports-content');if(!host)return;
    const parts=[];
    parts.push('<div class="tb-workspace-section">RELATÓRIOS SEMANAIS</div>');
    if(weekly.length)parts.push(...weekly.slice(0,12).map(item=>{const photos=Array.isArray(item.photoIds)?item.photoIds.length:6;return`<button type="button" class="tb-workspace-report" data-tb-weekly="${safe(item.id)}"><span><strong>${safe(item.requestKind==='manual'?'Relatório extra':'Relatório semanal')}</strong><small>${safe(dateLabel(item.submittedDate||item.dueDate))} · ${Number(item.weight||0)>0?safe(Number(item.weight).toLocaleString('pt-BR',{maximumFractionDigits:1}))+' kg · ':''}${photos} foto(s)</small></span><span class="tb-workspace-status">ABRIR ›</span></button>`;}));
    else parts.push('<div class="tb-workspace-empty">Nenhum relatório semanal enviado por este aluno.</div>');
    parts.push('<div class="tb-workspace-section">RELATÓRIOS SOLICITADOS</div>');
    if(questionnaires.length)parts.push(...questionnaires.slice(0,12).map(q=>{const answered=!!q.answered,photos=Array.isArray(q.photoIds)?q.photoIds.length:0;return`<button type="button" class="tb-workspace-report" data-tb-questionnaire="${safe(q.id)}" ${answered?'':'disabled'}><span><strong>${safe(questionnaireLabel(q))}</strong><small>${safe(dateLabel(q.answeredAt||q.createdAt))}${answered?` · ${photos} foto(s)`:' · aguardando aluno'}</small></span><span class="tb-workspace-status">${answered?'ABRIR ›':'PENDENTE'}</span></button>`;}));
    else parts.push('<div class="tb-workspace-empty">Nenhuma solicitação de relatório encontrada.</div>');
    host.innerHTML=parts.join('');
    host.querySelectorAll('[data-tb-weekly]').forEach(button=>button.addEventListener('click',()=>{const id=button.dataset.tbWeekly;if(typeof viewWeeklyCheckin==='function')viewWeeklyCheckin(id);}));
    host.querySelectorAll('[data-tb-questionnaire]').forEach(button=>button.addEventListener('click',()=>{const id=button.dataset.tbQuestionnaire;if(typeof viewQuestionnaire==='function')viewQuestionnaire(id,true);}));
  }
  async function loadQuickReports(){
    const student=trainerStudent(),host=document.getElementById('tb-trainer-reports-content');if(!student||!host)return;
    const token=++reportLoadToken;host.innerHTML='<div class="tb-workspace-empty">Carregando relatórios e referências fotográficas…</div>';
    try{
      const weeklyPromise=typeof fetchWeeklyCheckins==='function'?fetchWeeklyCheckins(student.uid):cloudGet(db.collection('weeklyCheckins').where('studentId','==',student.uid),'relatórios semanais rápidos').then(s=>s.docs.map(d=>({...d.data(),id:d.id}))); 
      const questionnairePromise=cloudGet(db.collection('questionnaires').where('studentId','==',student.uid),'relatórios rápidos').then(s=>s.docs.map(d=>({...d.data(),id:d.id})));
      const [weeklyRaw,questionnairesRaw]=await Promise.all([weeklyPromise,questionnairePromise]);if(token!==reportLoadToken||trainerStudent()?.uid!==student.uid)return;
      const weekly=(Array.isArray(weeklyRaw)?weeklyRaw:[]).sort((a,b)=>String(b.submittedDate||b.dueDate||'').localeCompare(String(a.submittedDate||a.dueDate||'')));
      const questionnaires=(Array.isArray(questionnairesRaw)?questionnairesRaw:[]).sort((a,b)=>(b.answeredAt?.seconds||b.createdAt?.seconds||0)-(a.answeredAt?.seconds||a.createdAt?.seconds||0));
      if(typeof WEEKLY_CHECKINS!=='undefined')WEEKLY_CHECKINS=weekly;
      if(typeof TS_QUEST_CACHE!=='undefined')TS_QUEST_CACHE=questionnaires;
      renderQuickReports(weekly,questionnaires);
    }catch(error){if(token!==reportLoadToken)return;host.innerHTML='<div class="tb-workspace-empty">Não foi possível carregar os relatórios agora. Verifique a conexão e tente novamente.</div>';}
  }
  function openQuickReports(){
    const student=trainerStudent();if(!student)return;ensureReportsModal();document.getElementById('tb-trainer-reports-title').textContent='Relatórios e fotos';document.getElementById('tb-trainer-reports-sub').textContent=studentName()+' · consulta rápida sem sair da prescrição';openModal('tb-trainer-reports-modal');loadQuickReports();
  }

  function ensureNoteModal(){
    let modal=document.getElementById('tb-trainer-note-modal');if(modal)return modal;
    modal=document.createElement('div');modal.id='tb-trainer-note-modal';modal.className='modal-backdrop';modal.dataset.tbBackdropClose='block';modal.innerHTML=`<div class="modal-sheet tb-workspace-sheet"><div class="modal-handle"></div><div class="modal-title">Rascunho privado</div><div class="tb-workspace-title-sub" id="tb-private-note-student"></div><textarea id="tb-private-note-text" class="form-input tb-private-note" maxlength="${NOTE_MAX}" rows="10" placeholder="Ex.: pontos observados nas fotos, ajustes para próximo treino, estratégia da dieta, lembretes para a próxima revisão…"></textarea><div class="tb-private-note-hint">Somente sua conta de treinador pode acessar este rascunho. O aluno não recebe nem consegue consultar este conteúdo.</div><button type="button" class="btn-primary" id="tb-private-note-save">SALVAR RASCUNHO</button><button type="button" class="btn-ghost" onclick="closeModal('tb-trainer-note-modal')">FECHAR</button><div class="tb-note-status" id="tb-private-note-status"></div></div>`;
    document.body.appendChild(modal);modal.querySelector('#tb-private-note-save').addEventListener('click',savePrivateNote);return modal;
  }
  function trainerPrivateRef(){const user=typeof CURRENT_USER!=='undefined'?CURRENT_USER:null;if(user?.role!=='trainer'||!db)return null;return db.collection('trainerSupplementCatalog').doc(user.uid);}
  async function readPrivateNote(studentUid){
    const ref=trainerPrivateRef();if(!ref)return'';const snap=await cloudGet(ref,'rascunho privado do treinador');if(!snap.exists)return'';const data=snap.data()||{},entry=data.studentNotes&&typeof data.studentNotes==='object'?data.studentNotes[studentUid]:null;return String(typeof entry==='string'?entry:entry?.text||'').slice(0,NOTE_MAX);
  }
  async function openPrivateNote(){
    const student=trainerStudent();if(!student)return;ensureNoteModal();const text=document.getElementById('tb-private-note-text'),status=document.getElementById('tb-private-note-status');document.getElementById('tb-private-note-student').textContent=studentName()+' · rascunho individual deste aluno';text.value='';text.dataset.studentUid=student.uid;status.textContent='Carregando…';openModal('tb-trainer-note-modal');
    try{const value=await readPrivateNote(student.uid);if(text.dataset.studentUid!==student.uid)return;text.value=value;status.textContent=value?'Rascunho carregado.':'Nenhuma anotação salva ainda.';}catch(error){status.textContent='Não foi possível carregar agora.';}
  }
  async function savePrivateNote(){
    const student=trainerStudent(),text=document.getElementById('tb-private-note-text'),status=document.getElementById('tb-private-note-status'),ref=trainerPrivateRef();if(!student||!text||!ref)return;const targetUid=String(text.dataset.studentUid||'');if(targetUid!==student.uid){status.textContent='O aluno ativo mudou. Feche e abra o rascunho novamente.';return;}const value=String(text.value||'').normalize('NFKC').trim().slice(0,NOTE_MAX);
    if(typeof beginAction==='function'&&!beginAction('trainer-private-note','tb-trainer-note-modal'))return;status.textContent='Salvando…';
    try{
      const snap=await cloudGet(ref,'verificar rascunhos privados'),now=new Date().toISOString();
      if(snap.exists){const data=snap.data()||{},notes=data.studentNotes&&typeof data.studentNotes==='object'?{...data.studentNotes}:{},previous=notes[targetUid]&&typeof notes[targetUid]==='object'?notes[targetUid]:{};notes[targetUid]={...previous,text:value,updatedAt:now};await cloudWrite(ref.set({trainerId:CURRENT_USER.uid,studentNotes:notes,updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true}),'salvar rascunho privado');}
      else{await cloudWrite(ref.set({trainerId:CURRENT_USER.uid,items:[],studentNotes:{[targetUid]:{text:value,updatedAt:now}},updatedAt:firebase.firestore.FieldValue.serverTimestamp()}),'criar rascunho privado');}
      status.textContent='✓ Rascunho salvo. Apenas você pode acessá-lo.';if(typeof showToast==='function')showToast('✓ Rascunho privado salvo');
    }catch(error){status.textContent=typeof cloudWriteError==='function'?cloudWriteError(error,'salvar o rascunho'):'Não foi possível salvar o rascunho.';}
    finally{if(typeof endAction==='function')endAction('trainer-private-note','tb-trainer-note-modal');}
  }

  function wrapShowScreen(){
    const base=window.showScreen;if(typeof base!=='function'||base.__tbTrainerWorkspace)return;
    const wrapped=function(){const result=base.apply(this,arguments);requestAnimationFrame(syncDock);return result;};wrapped.__tbTrainerWorkspace=true;window.showScreen=wrapped;
  }
  function install(){ensureStyles();ensureDock();ensureReportsModal();ensureNoteModal();wrapShowScreen();syncDock();document.addEventListener('team-bulls:student-context-changed',syncDock,{passive:true});window.addEventListener('pageshow',syncDock,{passive:true});window.TeamBullsTrainerWorkspace=Object.freeze({sync:syncDock,openReports:openQuickReports,openNote:openPrivateNote});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
