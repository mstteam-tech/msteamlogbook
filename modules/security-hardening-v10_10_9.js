/* Team Bulls v10.10.9 — isolamento de treinador e saneamento defensivo da UI. */
'use strict';
(()=>{
  if(window.__TEAM_BULLS_SECURITY_HARDENING_V10109__)return;
  window.__TEAM_BULLS_SECURITY_HARDENING_V10109__=true;

  const VERSION='10.10.9-security1';
  const SAFE_COLORS=new Set(['#e11d48','#3b82f6','#22c55e','#a855f7','#ec4899','#14b8a6','#f59e0b','#ef4444','#64748b']);
  const DEFAULT_COLOR='#e11d48';
  const authorizedStudents=new Set();

  function safeColor(value){
    const color=String(value||'').toLowerCase();
    return SAFE_COLORS.has(color)?color:DEFAULT_COLOR;
  }

  /* Dados locais/cacheados também passam pelo mesmo conjunto fechado de cores.
     Isso evita que um valor legado ou adulterado alcance atributos style gerados
     pela interface. */
  if(typeof normalizeWorkoutCollection==='function'&&!normalizeWorkoutCollection.__tbSecurity1){
    const base=normalizeWorkoutCollection;
    const wrapped=function(items){
      return base(items).map(workout=>({...workout,color:safeColor(workout?.color)}));
    };
    wrapped.__tbSecurity1=true;
    normalizeWorkoutCollection=wrapped;
  }

  function trainerSessionValid(){
    return typeof CURRENT_USER!=='undefined'&&CURRENT_USER?.role==='trainer'&&CURRENT_USER?.uid&&typeof db!=='undefined'&&db;
  }

  if(typeof renderTrainer==='function'&&!renderTrainer.__tbSecurity1){
    const securedRenderTrainer=async function(){
      if(!trainerSessionValid())return;
      ensureGlobalCatalogs?.();
      const trainerUid=String(CURRENT_USER.uid);
      const loadSeq=++TRAINER_LIST_LOAD_SEQ;
      const chip=document.getElementById('trainer-chip-name');if(chip)chip.textContent=CURRENT_USER?.name||'treinador';
      try{
        /* A consulta já nasce limitada ao trainerId. As regras do Firestore
           repetem a mesma autorização no servidor; este filtro não é a barreira
           de segurança, mas impede consultas incompatíveis com as regras. */
        const snap=await withTimeout(
          db.collection('users').where('trainerId','==',trainerUid).get(),
          CLOUD_READ_TIMEOUT_MS,'lista de alunos'
        );
        const students=snap.docs.map(d=>({...d.data(),uid:d.id})).filter(student=>student.role==='student'&&String(student.trainerId||'')===trainerUid);
        if(loadSeq!==TRAINER_LIST_LOAD_SEQ||CURRENT_USER?.role!=='trainer'||String(CURRENT_USER.uid)!==trainerUid)return;
        authorizedStudents.clear();students.forEach(student=>authorizedStudents.add(String(student.uid)));
        students.sort((a,b)=>normalizedName(a.name).localeCompare(normalizedName(b.name),'pt-BR')||a.uid.localeCompare(b.uid));
        const active=students.filter(s=>s.status==='active').length;
        const inactive=students.filter(s=>s.status==='inactive').length;
        const stats=document.getElementById('trainer-stats');if(stats)stats.innerHTML=
          `<div class="stat-cell"><div class="num">${students.length}</div><div class="lbl">Arquivos</div></div>`+
          `<div class="stat-cell"><div class="num" style="color:var(--success)">${active}</div><div class="lbl">Ativos</div></div>`+
          `<div class="stat-cell"><div class="num" style="color:var(--text-muted)">${inactive}</div><div class="lbl">Pausados</div></div>`;
        const list=document.getElementById('student-list'),empty=document.getElementById('student-empty');
        if(!list)return;
        if(!students.length){list.innerHTML='';if(empty)empty.style.display='block';return;}
        if(empty)empty.style.display='none';
        list.innerHTML=students.map(s=>{
          const initials=(s.name||'?').split(' ').map(n=>n[0]).slice(0,2).join('').toUpperCase();
          const isActive=s.status==='active',toggleLabel=isActive?'PAUSAR':'ATIVAR',toggleClass=isActive?'deactivate':'activate';
          return`<div class="student-card" data-student-uid="${esc(s.uid)}">
            <div class="student-avatar">${esc(initials)}</div>
            <div class="student-info">
              <div class="archive-file-kicker">ARQUIVO ${studentArchiveCode(s.uid)}</div>
              <div class="student-name">${esc(s.name||'Sem nome')}</div>
              <div class="student-meta">${esc(s.email||'')} <span class="badge ${isActive?'badge-active':'badge-inactive'}">${isActive?'● ativo':'○ inativo'}</span></div>
            </div>
            <div class="student-actions">
              <button class="btn-view-student" onclick="viewStudent(${jsArg(s.uid)},${jsArg(s.name||'Aluno')},${jsArg(s.email||'')},${jsArg(s.status||'active')})">ABRIR</button>
              <button class="toggle-btn ${toggleClass}" onclick="toggleStudent(${jsArg(s.uid)},${isActive})">${toggleLabel}</button>
            </div>
          </div>`;
        }).join('');
      }catch(error){
        if(loadSeq===TRAINER_LIST_LOAD_SEQ){
          console.error('renderTrainer seguro',error);
          const list=document.getElementById('student-list'),empty=document.getElementById('student-empty');
          if(list)list.innerHTML='<div class="session-block" style="border-color:var(--warn)"><div style="color:var(--warn);font-size:13px;margin-bottom:8px">Não foi possível carregar os alunos autorizados.</div><button class="btn-add-set" onclick="renderTrainer()">TENTAR NOVAMENTE</button></div>';
          if(empty)empty.style.display='none';
        }
      }
    };
    securedRenderTrainer.__tbSecurity1=true;
    renderTrainer=securedRenderTrainer;
  }

  if(typeof viewStudent==='function'&&!viewStudent.__tbSecurity1){
    const base=viewStudent;
    const wrapped=async function(uidValue,...args){
      const target=String(uidValue||'');
      if(CURRENT_USER?.role==='trainer'&&!authorizedStudents.has(target)){
        showToast?.('Este aluno não está vinculado à sua conta de treinador.',true);return false;
      }
      return base.call(this,uidValue,...args);
    };
    wrapped.__tbSecurity1=true;viewStudent=wrapped;
  }

  if(typeof toggleStudent==='function'&&!toggleStudent.__tbSecurity1){
    const base=toggleStudent;
    const wrapped=function(uidValue,...args){
      const target=String(uidValue||'');
      if(CURRENT_USER?.role==='trainer'&&!authorizedStudents.has(target)){
        showToast?.('Alteração bloqueada: aluno não vinculado a este treinador.',true);return false;
      }
      return base.call(this,uidValue,...args);
    };
    wrapped.__tbSecurity1=true;toggleStudent=wrapped;
  }

  window.TeamBullsSecurityAudit=Object.freeze({version:VERSION,safeColor});
  if(CURRENT_USER?.role==='trainer'&&document.getElementById('screen-trainer')?.classList.contains('active'))queueMicrotask(()=>renderTrainer());
})();