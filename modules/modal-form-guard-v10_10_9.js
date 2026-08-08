/* Team Bulls v10.10.9 — proteção contra fechamento acidental de editores. */
'use strict';
(()=>{
  if(window.__TEAM_BULLS_MODAL_FORM_GUARD_V10109__)return;
  window.__TEAM_BULLS_MODAL_FORM_GUARD_V10109__=true;

  const EDITABLE_SELECTOR='input:not([type="hidden"]),textarea,select,[contenteditable="true"],[contenteditable=""]';
  const GUARDED_EVENTS=['pointerdown','mousedown','touchstart','click'];

  function isOpenBackdrop(node){
    return node instanceof HTMLElement&&node.classList.contains('modal-backdrop')&&node.classList.contains('open');
  }

  function shouldProtect(backdrop){
    if(!isOpenBackdrop(backdrop))return false;
    if(backdrop.dataset.tbBackdropClose==='allow')return false;
    if(backdrop.dataset.tbBackdropClose==='block')return true;
    return !!backdrop.querySelector(EDITABLE_SELECTOR);
  }

  function outsideSheet(event,backdrop){
    const target=event.target;
    if(!(target instanceof Element))return false;
    if(target===backdrop)return true;
    return !target.closest('.modal-sheet');
  }

  function guardBackdropEvent(event){
    const backdrop=event.currentTarget;
    if(!shouldProtect(backdrop)||!outsideSheet(event,backdrop))return;

    // Impede os listeners antigos de interpretarem o clique no fundo como
    // comando para fechar. Não bloqueamos o comportamento padrão em pointer/
    // touch down, permitindo que o teclado virtual perca foco normalmente.
    event.stopPropagation();
    event.stopImmediatePropagation();
    if(event.type==='click')event.preventDefault();
  }

  function bindBackdrop(backdrop){
    if(!(backdrop instanceof HTMLElement)||!backdrop.classList.contains('modal-backdrop')||backdrop.dataset.tbFormGuardBound==='1')return;
    backdrop.dataset.tbFormGuardBound='1';
    GUARDED_EVENTS.forEach(type=>backdrop.addEventListener(type,guardBackdropEvent,{capture:true,passive:type==='touchstart'}));
  }

  function bindAll(root=document){
    if(root instanceof HTMLElement&&root.classList.contains('modal-backdrop'))bindBackdrop(root);
    root.querySelectorAll?.('.modal-backdrop').forEach(bindBackdrop);
  }

  function install(){
    bindAll(document);
    const observer=new MutationObserver(records=>{
      records.forEach(record=>record.addedNodes.forEach(node=>{
        if(node instanceof HTMLElement)bindAll(node);
      }));
    });
    observer.observe(document.body,{childList:true,subtree:true});

    window.TeamBullsModalFormGuard=Object.freeze({
      shouldProtect,
      refresh:()=>bindAll(document),
      allowBackdropClose(id,allow=true){
        const modal=document.getElementById(String(id||''));
        if(modal?.classList.contains('modal-backdrop'))modal.dataset.tbBackdropClose=allow?'allow':'block';
      }
    });
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
