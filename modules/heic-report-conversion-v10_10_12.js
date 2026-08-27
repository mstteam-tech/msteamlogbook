/* Team Bulls v10.10.12 — conversão HEIC/HEIF local sob demanda para relatórios. */
'use strict';
(()=>{
  if(window.__TEAM_BULLS_HEIC_REPORT_CONVERSION__)return;
  window.__TEAM_BULLS_HEIC_REPORT_CONVERSION__=true;

  const VERSION='10.10.12-heic1';
  const MAX_HEIC_BYTES=25*1024*1024;
  const LIB_URL='https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js';
  const LIB_INTEGRITY='sha512-VjmsArkf8Vv2yyvbXCyVxp+R3n4N2WyS1GEQ+YQxa7Hu0tx836WpY4nW9/T1W5JBmvuIsxkVH/DlHgp7NEMjDw==';
  let libraryPromise=null;
  const batchInFlight=new WeakSet();

  const fileType=file=>{
    const raw=String(file?.type||'').toLowerCase().trim();
    if(raw==='image/heic'||raw==='image/heif')return raw;
    const name=String(file?.name||'').toLowerCase();
    if(/\.heic$/.test(name))return'image/heic';
    if(/\.heif$/.test(name))return'image/heif';
    return'';
  };
  const isHeic=file=>!!fileType(file);
  const timeout=(promise,ms,label)=>new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new Error(`${label} demorou mais que o esperado.`)),ms);
    Promise.resolve(promise).then(value=>{clearTimeout(timer);resolve(value);},error=>{clearTimeout(timer);reject(error);});
  });
  const nextPaint=()=>new Promise(resolve=>requestAnimationFrame(()=>resolve()));

  function loadConverter(){
    if(typeof window.heic2any==='function')return Promise.resolve(window.heic2any);
    if(libraryPromise)return libraryPromise;
    libraryPromise=new Promise((resolve,reject)=>{
      const existing=document.querySelector(`script[data-team-bulls-heic="${VERSION}"]`);
      if(existing){
        const started=Date.now();
        const poll=()=>{if(typeof window.heic2any==='function')return resolve(window.heic2any);if(Date.now()-started>15000)return reject(new Error('Conversor HEIC indisponível.'));setTimeout(poll,80);};
        poll();return;
      }
      if(navigator.onLine===false){reject(new Error('Conecte-se à internet uma vez para preparar a conversão de fotos HEIC.'));return;}
      const script=document.createElement('script');
      script.src=LIB_URL;script.async=true;script.crossOrigin='anonymous';script.integrity=LIB_INTEGRITY;script.referrerPolicy='no-referrer';script.dataset.teamBullsHeic=VERSION;
      script.onload=()=>typeof window.heic2any==='function'?resolve(window.heic2any):reject(new Error('Conversor HEIC carregado de forma inválida.'));
      script.onerror=()=>reject(new Error('Não foi possível carregar o conversor HEIC seguro. Verifique a conexão e tente novamente.'));
      document.head.appendChild(script);
    }).catch(error=>{libraryPromise=null;throw error;});
    return libraryPromise;
  }

  async function convertHeic(file){
    if(!(file instanceof Blob)||!isHeic(file))return file;
    if(!file.size||file.size>MAX_HEIC_BYTES)throw new Error('A foto HEIC excede 25 MB. Escolha uma foto menor.');
    const converter=await timeout(loadConverter(),18000,'Carregar conversor HEIC');
    const result=await timeout(converter({blob:file,toType:'image/jpeg',quality:.94}),50000,'Converter foto HEIC');
    const blob=Array.isArray(result)?result[0]:result;
    if(!(blob instanceof Blob)||!blob.size)throw new Error('A conversão HEIC não gerou uma imagem válida.');
    const base=String(file?.name||'foto').replace(/\.(heic|heif)$/i,'')||'foto';
    try{return new File([blob],`${base}.jpg`,{type:'image/jpeg',lastModified:Number(file?.lastModified)||Date.now()});}
    catch(error){blob.name=`${base}.jpg`;return blob;}
  }

  function installDecoder(){
    if(typeof decodeImageForCompression!=='function'||decodeImageForCompression.__tbHeicConversion)return false;
    const baseDecode=decodeImageForCompression;
    const wrapped=async function(file){
      if(!isHeic(file))return baseDecode(file);
      try{return await baseDecode(file);}catch(nativeError){
        try{
          const jpeg=await convertHeic(file);
          return await baseDecode(jpeg);
        }catch(error){
          const name=String(file?.name||'esta foto');
          const detail=String(error?.message||'').trim();
          throw new Error(`Não foi possível converter ${name} de HEIC/HEIF para JPG${detail?`: ${detail}`:'.'}`);
        }
      }
    };
    wrapped.__tbHeicConversion=true;wrapped.__tbHeicVersion=VERSION;
    decodeImageForCompression=wrapped;
    return true;
  }

  function syntheticEvent(file){
    return{target:{files:[file],value:''},currentTarget:null};
  }
  function clearBatchInput(target){
    try{if(target&&'value'in target)target.value='';}catch(error){}
  }
  async function processSixPhotoBatch(base,event,kind){
    const target=event?.target||null;
    const selected=Array.from(target?.files||[]);
    if(selected.length<=1)return null;
    if(selected.length!==6){
      clearBatchInput(target);
      alert('Selecione exatamente 6 fotos de uma vez, na ordem indicada: Frente, Costas, Lado direito, Lado esquerdo, Frente contraída e Costas contraída.');
      return false;
    }
    if(target&&typeof target==='object'&&batchInFlight.has(target))return false;
    if(target&&typeof target==='object')batchInFlight.add(target);
    try{
      for(let slot=0;slot<6;slot++){
        if(typeof showToast==='function')showToast(`Preparando foto ${slot+1} de 6...`);
        await base(slot,syntheticEvent(selected[slot]));
        await nextPaint();
      }
      let complete=false;
      try{
        const files=kind==='weekly'
          ?(typeof WEEKLY_CHECKIN_FILES!=='undefined'?WEEKLY_CHECKIN_FILES:null)
          :(typeof QUESTIONNAIRE_REPORT_FILES!=='undefined'?QUESTIONNAIRE_REPORT_FILES:null);
        complete=Array.isArray(files)&&files.length===6&&files.every(file=>file instanceof File);
      }catch(error){}
      if(complete&&typeof showToast==='function')showToast('✓ As 6 fotos foram preparadas na ordem selecionada');
      return complete;
    }finally{
      clearBatchInput(target);
      if(target&&typeof target==='object')batchInFlight.delete(target);
    }
  }

  function installBatchPreviewBridge(){
    let changed=false;
    if(typeof previewWeeklyCheckinPhoto==='function'&&!previewWeeklyCheckinPhoto.__tbSixPhotoBatch){
      const base=previewWeeklyCheckinPhoto;
      const wrapped=function(index,event){
        const count=Number(event?.target?.files?.length)||0;
        if(count>1)return processSixPhotoBatch(base,event,'weekly');
        return base.apply(this,arguments);
      };
      wrapped.__tbSixPhotoBatch=true;wrapped.__tbBase=base;
      previewWeeklyCheckinPhoto=wrapped;changed=true;
    }
    if(typeof previewQuestionnaireReportPhoto==='function'&&!previewQuestionnaireReportPhoto.__tbSixPhotoBatch){
      const base=previewQuestionnaireReportPhoto;
      const wrapped=function(index,event){
        const count=Number(event?.target?.files?.length)||0;
        if(count>1)return processSixPhotoBatch(base,event,'questionnaire');
        return base.apply(this,arguments);
      };
      wrapped.__tbSixPhotoBatch=true;wrapped.__tbBase=base;
      previewQuestionnaireReportPhoto=wrapped;changed=true;
    }
    return changed;
  }

  function install(){
    const decoder=installDecoder();
    const batch=installBatchPreviewBridge();
    return decoder||batch;
  }

  install();
  window.addEventListener('team-bulls-runtime-state',install);
  window.addEventListener('team-bulls-runtime-ready',install);
  window.TeamBullsHeicReportConversion=Object.freeze({version:VERSION,isHeic,convert:convertHeic,install});
})();
