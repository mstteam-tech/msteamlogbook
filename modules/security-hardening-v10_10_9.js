/* Team Bulls v10.10.10 — isolamento de treinador, lista completa vinculada e saneamento defensivo da UI. */
'use strict';
(()=>{
  if(window.__TEAM_BULLS_SECURITY_HARDENING_V101010__)return;
  window.__TEAM_BULLS_SECURITY_HARDENING_V101010__=true;

  const VERSION='10.10.10-security2';
  const SAFE_COLORS=new Set(['#e11d48','#3b82f6','#22c55e','#a855f7','#ec4899','#14b8a6','#f59e0b','#ef4444','#64748b']);
  const DEFAULT_COLOR='#e11d48';
  const authorizedStudents=new Set();

  function safeColor(value){
    const color=String(value||'').toLowerCase();
    return SAFE_COLORS.has(color)?color:DEFAULT_COLOR;
  }

  if(typeof normalizeWorkoutCollection==='function'&&!normalizeWorkoutCollection.__tbSecurity2){
    const base=normalizeWorkoutCollection;
    const wrapped=function(items){return base(items).map(workout=>({...workout,color:safeColor(workout?.color)}));};
    wrapped.__tbSecurity2=true;
    normalizeWorkoutCollection=wrapped;
  }

  function trainerSessionValid(){
    return typeof CURRENT_USER!=='undefined'&&CURRENT_USER?.role==='trainer'&&CURRENT_USER?.uid&&typeof db!=='undefined'&&db;
  }

  function ensureMobileStyles(){
    if(document.getElementById('tb-security-mobile-style'))return;
    const style=document.createElement('style');style.id='tb-security-mobile-style';style.textContent=`
      #screen-trainer #student-list{width:100%;min-width:0;overflow:visible;}
      #screen-trainer .student-card{width:100%;min-width:0;}
      #screen-trainer .student-info{min-width:0;overflow:hidden;}
      #screen-trainer .student-meta{display:block;min-width:0;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
      #screen-trainer .student-actions{flex:0 0 auto;min-width:max-content;}
      .tb-student-link-health{margin:10px 18px 0;padding:9px 11px;border:1px solid var(--border);background:rgba(255,255,255,.025);color:var(--text-muted);font:500 9px/1.45 'DM Mono',monospace;letter-spacing:.25px;}
      .tb-student-link-health.warn{border-color:rgba(245,158,11,.45);color:#d7b36a;background:rgba(245,158,11,.06);}
      @media(max-width:520px){
        #screen-trainer .student-card{align-items:center;gap:9px;padding:13px 12px;}
        #screen-trainer .student-avatar{width:40px;height:40px;font-size:17px;}
        #screen-trainer .student-actions{gap:5px;}
        #screen-trainer .btn-view-student,#screen-trainer .toggle-btn{padding-left:9px;padding-right:9px;min-width:0;}
      }
      @media(max-width:370px){
        #screen-trainer .student-card{display:grid;grid-template-columns:40px minmax(0,1fr);align-items:center;}
        #screen-trainer .student-actions{grid-column:2;justify-content:flex-start;width:100%;}
      }
    `;document.head.appendChild(style);
  }

  function renderLinkHealth(message,warn=false){
    const screen=document.getElementById('screen-trainer');if(!screen)return;
    let el=document.getElementById('tb-student-link-health');
    if(!el){
      el=document.createElement('div');el.id='tb-student-link-health';el.className='tb-student-link-health';
      const list=document.getElementById('student-list');
      (list?.parentElement||screen).insertBefore(el,list||null);
    }
    el.classList.toggle('warn',!!warn);el.textContent=message;
  }

  async function auditInviteLinks(trainerUid,visibleCount){
    try{
      const snap=await cloudGet(db.collection('studentInvites').where('trainerId','==',trainerUid).limit(120),'verificar vínculos dos alunos');
      const usedIds=new Set();
      snap.docs.forEach(doc=>{const usedBy=String(doc.data()?.usedBy||'');if(usedBy)usedIds.add(usedBy);});
      const missing=Math.max(0,[...usedIds].filter(uid=>!authorizedStudents.has(uid)).length);
      if(missing>0){
        renderLinkHealth(`${visibleCount} aluno(s) estão vinculados a esta conta. Há ${missing} convite(s) já utilizados que não correspondem aos perfis atualmente vinculados. Isso pode indicar cadastro antigo sem trainerId.`,true);
      }else{
        renderLinkHealth(`${visibleCount} aluno(s) vinculado(s) a esta conta de treinador.`);
      }
    }catch(error){
      renderLinkHealth(`${visibleCount} aluno(s) vinculado(s) a esta conta.`);
    }
  }

  if(typeof renderTrainer==='function'&&!renderTrainer.__tbSecurity2){
    const securedRenderTrainer=async function(){
      if(!trainerSessionValid())return;
      ensureMobileStyles();
      ensureGlobalCatalogs?.();
      const trainerUid=String(CURRENT_USER.uid),loadSeq=++TRAINER_LIST_LOAD_SEQ;
      const chip=document.getElementById('trainer-chip-name');if(chip)chip.textContent=CURRENT_USER?.name||'treinador';
      try{
        /* A consulta precisa reproduzir o vínculo usado pelas regras do Firestore. */
        const snap=await withTimeout(
          db.collection('users').where('role','==','student').where('trainerId','==',trainerUid).get(),
          CLOUD_READ_TIMEOUT_MS,'lista de alunos vinculados'
        );
        const students=snap.docs.map(d=>({...d.data(),uid:d.id})).filter(student=>student.role==='student'&&String(student.trainerId||'')===trainerUid);
        if(loadSeq!==TRAINER_LIST_LOAD_SEQ||CURRENT_USER?.role!=='trainer'||String(CURRENT_USER.uid)!==trainerUid)return;
        authorizedStudents.clear();students.forEach(student=>authorizedStudents.add(String(student.uid)));
        students.sort((a,b)=>normalizedName(a.name).localeCompare(normalizedName(b.name),'pt-BR')||a.uid.localeCompare(b.uid));
        const active=students.filter(s=>s.status==='active').length,inactive=students.filter(s=>s.status==='inactive').length;
        const stats=document.getElementById('trainer-stats');if(stats)stats.innerHTML=
          `<div class="stat-cell"><div class="num">${students.length}</div><div class="lbl">Arquivos</div></div>`+
          `<div class="stat-cell"><div class="num" style="color:var(--success)">${active}</div><div class="lbl">Ativos</div></div>`+
          `<div class="stat-cell"><div class="num" style="color:var(--text-muted)">${inactive}</div><div class="lbl">Pausados</div></div>`;
        const list=document.getElementById('student-list'),empty=document.getElementById('student-empty');
        if(!list)return;
        if(!students.length){list.innerHTML='';if(empty)empty.style.display='block';renderLinkHealth('Nenhum aluno está atualmente vinculado a esta conta.',true);return;}
        if(empty)empty.style.display='none';
        list.innerHTML=students.map(s=>{
          const initials=(s.name||'?').split(/\s+/).filter(Boolean).map(n=>n[0]).slice(0,2).join('').toUpperCase();
          const isActive=s.status==='active',toggleLabel=isActive?'PAUSAR':'ATIVAR',toggleClass=isActive?'deactivate':'activate';
          return`<div class="student-card" data-student-uid="${esc(s.uid)}">
            <div class="student-avatar">${esc(initials)}</div>
            <div class="student-info">
              <div class="archive-file-kicker">ARQUIVO ${studentArchiveCode(s.uid)}</div>
              <div class="student-name">${esc(s.name||'Sem nome')}</div>
              <div class="student-meta" title="${esc(s.email||'')}">${esc(s.email||'')} <span class="badge ${isActive?'badge-active':'badge-inactive'}">${isActive?'● ativo':'○ inativo'}</span></div>
            </div>
            <div class="student-actions">
              <button class="btn-view-student" onclick="viewStudent(${jsArg(s.uid)},${jsArg(s.name||'Aluno')},${jsArg(s.email||'')},${jsArg(s.status||'active')})">ABRIR</button>
              <button class="toggle-btn ${toggleClass}" onclick="toggleStudent(${jsArg(s.uid)},${isActive})">${toggleLabel}</button>
            </div>
          </div>`;
        }).join('');
        auditInviteLinks(trainerUid,students.length).catch(()=>{});
      }catch(error){
        if(loadSeq===TRAINER_LIST_LOAD_SEQ){
          console.error('renderTrainer seguro',error);
          const list=document.getElementById('student-list'),empty=document.getElementById('student-empty');
          if(list)list.innerHTML='<div class="session-block" style="border-color:var(--warn)"><div style="color:var(--warn);font-size:13px;margin-bottom:8px">Não foi possível carregar os alunos autorizados.</div><button class="btn-add-set" onclick="renderTrainer()">TENTAR NOVAMENTE</button></div>';
          if(empty)empty.style.display='none';
          renderLinkHealth('Falha ao consultar os alunos vinculados. A lista foi mantida vazia para não expor dados de outra conta.',true);
        }
      }
    };
    securedRenderTrainer.__tbSecurity2=true;
    renderTrainer=securedRenderTrainer;
  }

  if(typeof viewStudent==='function'&&!viewStudent.__tbSecurity2){
    const base=viewStudent;
    const wrapped=async function(uidValue,...args){
      const target=String(uidValue||'');
      if(CURRENT_USER?.role==='trainer'&&!authorizedStudents.has(target)){showToast?.('Este aluno não está vinculado à sua conta de treinador.',true);return false;}
      return base.call(this,uidValue,...args);
    };
    wrapped.__tbSecurity2=true;viewStudent=wrapped;
  }

  if(typeof toggleStudent==='function'&&!toggleStudent.__tbSecurity2){
    const base=toggleStudent;
    const wrapped=function(uidValue,...args){
      const target=String(uidValue||'');
      if(CURRENT_USER?.role==='trainer'&&!authorizedStudents.has(target)){showToast?.('Alteração bloqueada: aluno não vinculado a este treinador.',true);return false;}
      return base.call(this,uidValue,...args);
    };
    wrapped.__tbSecurity2=true;toggleStudent=wrapped;
  }

  window.TeamBullsSecurityAudit=Object.freeze({version:VERSION,safeColor});
  if(CURRENT_USER?.role==='trainer'&&document.getElementById('screen-trainer')?.classList.contains('active'))queueMicrotask(()=>renderTrainer());
})();