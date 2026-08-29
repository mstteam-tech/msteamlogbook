/* Team Bulls v10.10.12 — histórico somente leitura dos feedbacks enviados pelo treinador. */
'use strict';
(()=>{
  if(window.__TEAM_BULLS_TRAINER_FEEDBACK_HISTORY_1__)return;
  window.__TEAM_BULLS_TRAINER_FEEDBACK_HISTORY_1__=true;

  const VERSION='10.10.12-feedbackhistory1';
  let records=[];
  let activeStudentUid='';
  let loading=false;
  let observer=null;

  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const trainer=()=>typeof CURRENT_USER!=='undefined'&&CURRENT_USER?.role==='trainer'?CURRENT_USER:null;
  const uidOf=value=>String(value?.uid||value?.id||'').trim();
  const viewedStudent=()=>typeof VIEW_STUDENT!=='undefined'?VIEW_STUDENT:null;
  const viewedStudentUid=()=>uidOf(viewedStudent());
  const timestamp=value=>{try{if(value?.toMillis)return value.toMillis();if(value?.toDate)return value.toDate().getTime();const n=new Date(value||0).getTime();return Number.isFinite(n)?n:0;}catch(error){return 0;}};
  const formatDate=value=>{const ms=timestamp(value);return ms?new Date(ms).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'}):'data pendente';};
  const normalize=value=>String(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();

  function feedbackType(value){return ['general','weekly_report','protocol_update'].includes(String(value))?String(value):'general';}
  function typeLabel(value){const type=feedbackType(value);if(type==='weekly_report')return'RELATÓRIO SEMANAL';if(type==='protocol_update')return'ATUALIZAÇÃO COMPLETA';return'FEEDBACK GERAL';}
  function defaultTitle(data){const type=feedbackType(data?.feedbackType);if(type==='weekly_report')return'Feedback do relatório semanal';if(type==='protocol_update')return'Feedback da atualização completa';return'Feedback geral';}

  function ensureStyles(){
    if(document.getElementById('tb-feedback-history-style'))return;
    const style=document.createElement('style');
    style.id='tb-feedback-history-style';
    style.textContent=`
      .tb-feedback-history-entry{margin:12px 0;padding:13px 14px;border:1px solid rgba(225,29,72,.24);border-radius:10px;background:linear-gradient(135deg,rgba(225,29,72,.06),rgba(255,255,255,.015));display:flex;align-items:center;justify-content:space-between;gap:14px}
      .tb-feedback-history-entry-copy{min-width:0}.tb-feedback-history-entry-copy span{display:block;color:#c15569;font:700 8px 'DM Mono',monospace;letter-spacing:1px}.tb-feedback-history-entry-copy strong{display:block;margin-top:4px;color:#eee;font:800 16px 'Barlow Condensed',sans-serif}.tb-feedback-history-entry-copy small{display:block;margin-top:4px;color:#81766f;font-size:9px;line-height:1.45}.tb-feedback-history-entry button{flex:0 0 auto;border:1px solid rgba(225,29,72,.5);background:rgba(225,29,72,.1);color:#ff738c;border-radius:7px;padding:9px 11px;font:800 8px 'DM Mono',monospace;cursor:pointer}
      #tb-feedback-history-modal .modal-sheet{max-width:860px}.tb-feedback-history-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:10px}.tb-feedback-history-head-copy small{display:block;color:#756b65;font:500 9px 'DM Mono',monospace;margin-top:3px}.tb-feedback-history-summary{flex:0 0 auto;border:1px solid rgba(255,255,255,.08);border-radius:999px;padding:6px 9px;color:#aaa;font:700 8px 'DM Mono',monospace}
      .tb-feedback-history-filter{display:grid;grid-template-columns:1fr 210px;gap:8px;margin:10px 0 12px}.tb-feedback-history-filter input,.tb-feedback-history-filter select{width:100%;border:1px solid rgba(255,255,255,.1);border-radius:7px;background:#0c0c0c;color:#eee;padding:9px 10px;font:500 11px 'Barlow',sans-serif}
      .tb-feedback-history-list{max-height:min(58vh,620px);overflow:auto;display:grid;gap:9px;padding-right:3px}.tb-feedback-history-card{border:1px solid #2e2527;border-radius:9px;background:#101010;padding:12px}.tb-feedback-history-card.pending{border-left:3px solid #d49a3a}.tb-feedback-history-card.read{border-left:3px solid #3f9c67}.tb-feedback-history-meta{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}.tb-feedback-history-type{color:#c45a6c;font:700 8px 'DM Mono',monospace;letter-spacing:.7px}.tb-feedback-history-date{color:#746c67;font:500 8px 'DM Mono',monospace}.tb-feedback-history-card h3{margin:7px 0 5px;color:#f1eeeb;font:800 17px 'Barlow Condensed',sans-serif}.tb-feedback-history-message{white-space:pre-wrap;overflow-wrap:anywhere;color:#c8beb8;font:400 12px/1.55 'Barlow',sans-serif;max-height:170px;overflow:auto;padding:9px 10px;background:#0b0b0b;border:1px solid rgba(255,255,255,.055);border-radius:7px}.tb-feedback-history-foot{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:9px}.tb-feedback-history-status{font:700 8px 'DM Mono',monospace}.tb-feedback-history-card.read .tb-feedback-history-status{color:#71c792}.tb-feedback-history-card.pending .tb-feedback-history-status{color:#d5aa65}.tb-feedback-history-copy{border:1px solid rgba(255,255,255,.1);background:#151515;color:#bbb;border-radius:6px;padding:6px 8px;font:800 7px 'DM Mono',monospace}.tb-feedback-history-empty{padding:32px 14px;text-align:center;color:#796f69;font:500 10px/1.5 'DM Mono',monospace;border:1px dashed rgba(255,255,255,.09);border-radius:9px}.tb-feedback-history-error{color:#e09a9a}.tb-feedback-history-actions{display:flex;gap:8px;margin-top:12px}.tb-feedback-history-actions button{flex:1}
      @media(max-width:640px){.tb-feedback-history-entry{align-items:flex-start;flex-direction:column}.tb-feedback-history-entry button{width:100%}.tb-feedback-history-filter{grid-template-columns:1fr}.tb-feedback-history-list{max-height:56vh}.tb-feedback-history-head{align-items:flex-start}.tb-feedback-history-summary{font-size:7px}}
    `;
    document.head.appendChild(style);
  }

  function ensureModal(){
    let modal=document.getElementById('tb-feedback-history-modal');
    if(modal)return modal;
    modal=document.createElement('div');
    modal.className='modal-backdrop';
    modal.id='tb-feedback-history-modal';
    modal.innerHTML=`<div class="modal-sheet"><div class="modal-handle"></div><div class="tb-feedback-history-head"><div class="tb-feedback-history-head-copy"><div class="modal-title">Histórico de feedbacks</div><small id="tb-feedback-history-student">Aluno</small></div><span class="tb-feedback-history-summary" id="tb-feedback-history-summary">0 enviados</span></div><div class="tb-feedback-history-filter"><input id="tb-feedback-history-search" type="search" placeholder="Buscar no título ou conteúdo"><select id="tb-feedback-history-type"><option value="all">Todos os tipos</option><option value="general">Feedback geral</option><option value="weekly_report">Relatório semanal</option><option value="protocol_update">Atualização completa</option></select></div><div class="tb-feedback-history-list" id="tb-feedback-history-list"><div class="tb-feedback-history-empty">Carregando histórico...</div></div><div class="tb-feedback-history-actions"><button class="btn-primary" type="button" onclick="TeamBullsTrainerFeedbackHistory.newFeedback()">NOVO FEEDBACK</button><button class="btn-ghost" type="button" onclick="closeModal('tb-feedback-history-modal')">FECHAR</button></div></div>`;
    document.body.appendChild(modal);
    modal.querySelector('#tb-feedback-history-search')?.addEventListener('input',render);
    modal.querySelector('#tb-feedback-history-type')?.addEventListener('change',render);
    return modal;
  }

  function ensureEntry(){
    if(!trainer())return false;
    const screen=document.getElementById('screen-trainer-student'),archive=screen?.querySelector('#ts-archive-card');
    if(!screen||!archive)return false;
    let entry=screen.querySelector('.tb-feedback-history-entry');
    if(entry)return true;
    entry=document.createElement('section');
    entry.className='tb-feedback-history-entry';
    entry.innerHTML=`<div class="tb-feedback-history-entry-copy"><span>ACOMPANHAMENTO DO ALUNO</span><strong>Histórico de feedbacks enviados</strong><small>Consulte tudo o que você já transmitiu para este aluno e veja se ele já leu.</small></div><button type="button" onclick="TeamBullsTrainerFeedbackHistory.open()">VER HISTÓRICO</button>`;
    archive.insertAdjacentElement('afterend',entry);
    return true;
  }

  function filteredRecords(){
    const query=normalize(document.getElementById('tb-feedback-history-search')?.value),type=String(document.getElementById('tb-feedback-history-type')?.value||'all');
    return records.filter(item=>{
      if(type!=='all'&&feedbackType(item.feedbackType)!==type)return false;
      if(!query)return true;
      return normalize(`${item.title} ${item.message}`).includes(query);
    });
  }

  function render(){
    const host=document.getElementById('tb-feedback-history-list'),summary=document.getElementById('tb-feedback-history-summary');if(!host)return;
    const list=filteredRecords();
    if(summary)summary.textContent=`${records.length} enviado${records.length===1?'':'s'}`;
    if(loading){host.innerHTML='<div class="tb-feedback-history-empty">Carregando histórico...</div>';return;}
    if(!records.length){host.innerHTML='<div class="tb-feedback-history-empty">Nenhum feedback enviado por você para este aluno até o momento.</div>';return;}
    if(!list.length){host.innerHTML='<div class="tb-feedback-history-empty">Nenhum feedback corresponde ao filtro atual.</div>';return;}
    host.innerHTML=list.map((item,index)=>`<article class="tb-feedback-history-card ${item.read?'read':'pending'}"><div class="tb-feedback-history-meta"><span class="tb-feedback-history-type">${esc(typeLabel(item.feedbackType))}</span><span class="tb-feedback-history-date">${esc(formatDate(item.createdAt))}</span></div><h3>${esc(item.title||defaultTitle(item))}</h3><div class="tb-feedback-history-message">${esc(item.message||'')}</div><div class="tb-feedback-history-foot"><span class="tb-feedback-history-status">${item.read?'LIDO PELO ALUNO':'AGUARDANDO LEITURA'}</span><button class="tb-feedback-history-copy" type="button" data-feedback-copy="${index}">COPIAR</button></div></article>`).join('');
    host.querySelectorAll('[data-feedback-copy]').forEach(button=>button.addEventListener('click',()=>copyVisible(Number(button.dataset.feedbackCopy)||0)));
  }

  async function loadHistory(uid){
    const user=trainer();if(!user||!uid||typeof db==='undefined'||!db)return[];
    loading=true;render();
    try{
      const snap=typeof cloudGet==='function'
        ?await cloudGet(db.collection('feedback').where('studentId','==',uid),'histórico de feedbacks enviados')
        :await db.collection('feedback').where('studentId','==',uid).get();
      if(viewedStudentUid()!==uid||trainer()?.uid!==user.uid)return records;
      records=snap.docs.map(doc=>({id:doc.id,...doc.data()}))
        .filter(item=>String(item.trainerId||'')===String(user.uid))
        .sort((a,b)=>timestamp(b.createdAt)-timestamp(a.createdAt)||String(b.id).localeCompare(String(a.id)));
      activeStudentUid=uid;
      return records;
    }catch(error){
      console.warn('[Team Bulls] histórico de feedbacks',error);
      records=[];
      const host=document.getElementById('tb-feedback-history-list');
      if(host)host.innerHTML='<div class="tb-feedback-history-empty tb-feedback-history-error">Não foi possível carregar o histórico agora. Verifique a conexão e tente novamente.</div>';
      return records;
    }finally{loading=false;}
  }

  async function openHistory(){
    if(!trainer())return;
    const studentRecord=viewedStudent(),uid=uidOf(studentRecord);if(!uid)return alert('Selecione um aluno para consultar o histórico.');
    ensureStyles();ensureModal();
    const label=document.getElementById('tb-feedback-history-student');if(label)label.textContent=String(studentRecord?.name||'Aluno');
    const search=document.getElementById('tb-feedback-history-search'),type=document.getElementById('tb-feedback-history-type');if(search)search.value='';if(type)type.value='all';
    records=[];activeStudentUid=uid;loading=true;render();
    if(typeof openModal==='function')openModal('tb-feedback-history-modal');else document.getElementById('tb-feedback-history-modal')?.classList.add('open');
    await loadHistory(uid);render();
  }

  async function copyVisible(index){
    const item=filteredRecords()[index];if(!item)return;
    const text=[item.title||defaultTitle(item),item.message||''].filter(Boolean).join('\n\n');
    let ok=false;
    try{if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(text);ok=true;}}catch(error){}
    if(!ok){try{const area=document.createElement('textarea');area.value=text;area.readOnly=true;area.style.position='fixed';area.style.opacity='0';document.body.appendChild(area);area.select();ok=document.execCommand('copy');area.remove();}catch(error){}}
    if(typeof showToast==='function')showToast(ok?'✓ Feedback copiado':'Não foi possível copiar.',!ok);
  }

  function newFeedback(){
    if(typeof closeModal==='function')closeModal('tb-feedback-history-modal');
    if(typeof openFeedbackModal==='function')setTimeout(()=>openFeedbackModal('general'),60);
  }

  function enhanceFeedbackEditor(){
    const modal=document.getElementById('modal-feedback'),sheet=modal?.querySelector('.feedback-editor-sheet');if(!sheet||sheet.querySelector('[data-tb-feedback-history-open]'))return;
    const cancel=[...sheet.querySelectorAll('button')].find(button=>/cancelar/i.test(button.textContent||''));
    const button=document.createElement('button');button.type='button';button.className='btn-ghost';button.dataset.tbFeedbackHistoryOpen='1';button.textContent='VER HISTÓRICO DE FEEDBACKS';button.onclick=()=>{closeModal?.('modal-feedback');setTimeout(openHistory,60);};
    if(cancel)cancel.insertAdjacentElement('beforebegin',button);else sheet.appendChild(button);
  }

  function installWrap(){
    if(typeof renderTrainerStudent==='function'&&!renderTrainerStudent.__tbFeedbackHistory){
      const base=renderTrainerStudent;
      renderTrainerStudent=async function(){const result=await base.apply(this,arguments);requestAnimationFrame(()=>{ensureEntry();enhanceFeedbackEditor();});return result;};
      renderTrainerStudent.__tbFeedbackHistory=true;
    }
  }

  function install(){
    ensureStyles();ensureModal();installWrap();enhanceFeedbackEditor();ensureEntry();
    if(!observer&&document.body){observer=new MutationObserver(()=>{if(trainer()){ensureEntry();enhanceFeedbackEditor();installWrap();}});observer.observe(document.body,{childList:true,subtree:true});}
  }

  window.TeamBullsTrainerFeedbackHistory=Object.freeze({version:VERSION,open:openHistory,reload:()=>activeStudentUid?loadHistory(activeStudentUid).then(render):Promise.resolve([]),newFeedback});
  window.addEventListener('team-bulls-runtime-ready',install);
  window.addEventListener('pageshow',install,{passive:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
