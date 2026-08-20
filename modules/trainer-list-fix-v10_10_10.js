/* Team Bulls v10.10.10 — lista do treinador: vínculo seguro + renderização sem corte no mobile. */
'use strict';
(()=>{
  if(window.__TB_TRAINER_LIST_FIX_V101010__)return;
  window.__TB_TRAINER_LIST_FIX_V101010__=true;

  let loadSeq=0;
  const escText=value=>typeof esc==='function'?esc(value):String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const arg=value=>typeof jsArg==='function'?jsArg(value):JSON.stringify(String(value??''));

  function ensureStyles(){
    if(document.getElementById('tb-trainer-list-fix-style'))return;
    const style=document.createElement('style');
    style.id='tb-trainer-list-fix-style';
    style.textContent=`
      #screen-trainer #student-list{width:100%;min-width:0;overflow:visible;}
      #screen-trainer .student-card{width:100%;min-width:0;}
      #screen-trainer .student-info{min-width:0;overflow:hidden;}
      #screen-trainer .student-meta{min-width:0;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:block;}
      #screen-trainer .student-actions{flex:0 0 auto;min-width:max-content;}
      @media(max-width:520px){
        #screen-trainer .student-card{align-items:center;gap:9px;padding:13px 12px;}
        #screen-trainer .student-avatar{width:40px;height:40px;font-size:17px;}
        #screen-trainer .student-actions{gap:5px;}
        #screen-trainer .btn-view-student,#screen-trainer .toggle-btn{padding-left:9px;padding-right:9px;min-width:0;}
      }
      @media(max-width:370px){
        #screen-trainer .student-card{display:grid;grid-template-columns:40px minmax(0,1fr);align-items:center;}
        #screen-trainer .student-actions{grid-column:2;justify-content:flex-start;width:100%;}
        #screen-trainer .student-actions button{flex:0 1 auto;}
      }
    `;
    document.head.appendChild(style);
  }

  function renderStudents(students){
    const stats=document.getElementById('trainer-stats');
    const list=document.getElementById('student-list');
    const empty=document.getElementById('student-empty');
    if(!list||!empty)return;
    const active=students.filter(s=>s.status==='active').length;
    const inactive=students.filter(s=>s.status==='inactive').length;
    if(stats)stats.innerHTML=
      `<div class="stat-cell"><div class="num">${students.length}</div><div class="lbl">Arquivos</div></div>`+
      `<div class="stat-cell"><div class="num" style="color:var(--success)">${active}</div><div class="lbl">Ativos</div></div>`+
      `<div class="stat-cell"><div class="num" style="color:var(--text-muted)">${inactive}</div><div class="lbl">Pausados</div></div>`;
    if(!students.length){list.innerHTML='';empty.style.display='block';return;}
    empty.style.display='none';
    list.innerHTML=students.map(s=>{
      const initials=(s.name||'?').split(/\s+/).filter(Boolean).map(n=>n[0]).slice(0,2).join('').toUpperCase();
      const isActive=s.status==='active';
      const toggleLabel=isActive?'PAUSAR':'ATIVAR';
      const toggleClass=isActive?'deactivate':'activate';
      return`<div class="student-card" data-student-uid="${escText(s.uid)}">
        <div class="student-avatar">${escText(initials)}</div>
        <div class="student-info">
          <div class="archive-file-kicker">ARQUIVO ${typeof studentArchiveCode==='function'?studentArchiveCode(s.uid):''}</div>
          <div class="student-name">${escText(s.name||'Sem nome')}</div>
          <div class="student-meta" title="${escText(s.email||'')}">${escText(s.email||'')} <span class="badge ${isActive?'badge-active':'badge-inactive'}">${isActive?'● ativo':'○ inativo'}</span></div>
        </div>
        <div class="student-actions">
          <button class="btn-view-student" onclick="viewStudent(${arg(s.uid)},${arg(s.name||'Aluno')},${arg(s.email||'')},${arg(s.status||'active')})">ABRIR</button>
          <button class="toggle-btn ${toggleClass}" onclick="toggleStudent(${arg(s.uid)},${isActive})">${toggleLabel}</button>
        </div>
      </div>`;
    }).join('');
  }

  async function renderTrainerSafe(){
    if(CURRENT_USER?.role!=='trainer')return;
    ensureStyles();
    const seq=++loadSeq;
    const chip=document.getElementById('trainer-chip-name');
    if(chip)chip.textContent=CURRENT_USER?.name||'treinador';
    try{
      if(typeof ensureGlobalCatalogs==='function')ensureGlobalCatalogs();
      const trainerId=String(CURRENT_USER.uid||'');
      if(!trainerId||!db)throw new Error('Treinador não autenticado.');
      /* O filtro trainerId é obrigatório: além de corrigir a lista, impede que
         o cliente tente carregar alunos pertencentes a outro treinador. */
      const snap=await withTimeout(
        db.collection('users').where('role','==','student').where('trainerId','==',trainerId).get(),
        CLOUD_READ_TIMEOUT_MS,
        'lista de alunos vinculados'
      );
      const students=snap.docs.map(d=>({...d.data(),uid:d.id}));
      if(seq!==loadSeq||CURRENT_USER?.role!=='trainer'||CURRENT_USER.uid!==trainerId)return;
      students.sort((a,b)=>normalizedName(a.name).localeCompare(normalizedName(b.name),'pt-BR')||a.uid.localeCompare(b.uid));
      renderStudents(students);
      /* Atualiza alertas somente depois da lista estar no DOM. */
      if(typeof loadTrainerProtocolReviewAlerts==='function')loadTrainerProtocolReviewAlerts().catch(()=>{});
    }catch(error){
      if(seq!==loadSeq)return;
      console.error('[Team Bulls] Falha ao carregar alunos vinculados',error);
      const list=document.getElementById('student-list'),empty=document.getElementById('student-empty');
      if(list)list.innerHTML='';
      if(empty){empty.style.display='block';empty.textContent=String(error?.code||'').includes('permission-denied')?'Não foi possível consultar os alunos vinculados a esta conta. Verifique o vínculo do treinador e as regras do Firebase.':'Não foi possível carregar os alunos agora. Verifique a conexão e tente novamente.';}
      if(typeof showToast==='function')showToast('Não foi possível atualizar a lista de alunos.',true);
    }
  }

  function install(){
    if(typeof renderTrainer!=='function')return false;
    if(renderTrainer.__tbTrainerListFix)return true;
    const base=renderTrainer;
    const wrapped=function(){return renderTrainerSafe.apply(this,arguments);};
    wrapped.__tbTrainerListFix=true;
    wrapped.__tbTrainerListBase=base;
    renderTrainer=wrapped;
    ensureStyles();
    return true;
  }

  if(!install()){
    document.addEventListener('team-bulls-v107-ready',()=>{install();}, {once:true});
    document.addEventListener('DOMContentLoaded',()=>install(),{once:true});
    window.addEventListener('load',()=>install(),{once:true});
  }
})();
