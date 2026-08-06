'use strict';
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const corePath=path.join(__dirname,'..','app_v10_10_9_core.js');
const source=fs.readFileSync(corePath,'utf8');
function extractFunction(name){
  const marker='function '+name+'(';
  const start=source.indexOf(marker);
  if(start<0)throw new Error('Função ausente: '+name);
  const next=source.indexOf('\nfunction ',start+marker.length);
  if(next<0)throw new Error('Fim da função não encontrado: '+name);
  return source.slice(start,next).trim();
}
const fn=extractFunction('uploadReportGuidePdf');
async function successCase(){
  let progress=-1;
  const task={snapshot:{ok:true},cancelled:false,on(event,onProgress,onError,onComplete){
    if(event!=='state_changed')throw new Error('Evento incorreto');
    setTimeout(()=>{onProgress({bytesTransferred:50,totalBytes:100});onComplete();},5);
  },cancel(){this.cancelled=true;}};
  const context={Promise,setTimeout,clearTimeout,Math,Number,Error,console};
  vm.createContext(context);
  vm.runInContext(`const V10102_GUIDE_UPLOAD_TIMEOUT_MS=80;let V10102_GUIDE_UPLOAD_TASK=null;${fn};this.run=uploadReportGuidePdf;`,context);
  const result=await context.run({ref:()=>({put:()=>task})},'reportGuides/trainer/photo-guide.pdf',{size:100},value=>{progress=value;});
  if(result!==task.snapshot||progress!==50)throw new Error('Upload concluído ou progresso incorreto');
}
async function timeoutCase(){
  const task={snapshot:{},cancelled:false,on(){},cancel(){this.cancelled=true;}};
  const context={Promise,setTimeout,clearTimeout,Math,Number,Error,console};
  vm.createContext(context);
  vm.runInContext(`const V10102_GUIDE_UPLOAD_TIMEOUT_MS=20;let V10102_GUIDE_UPLOAD_TASK=null;${fn};this.run=uploadReportGuidePdf;`,context);
  let failed=false;
  try{await context.run({ref:()=>({put:()=>task})},'reportGuides/trainer/photo-guide.pdf',{size:100},()=>{});}catch(error){failed=error?.code==='team-bulls/timeout';}
  if(!failed||!task.cancelled)throw new Error('Timeout não cancelou e liberou o upload');
}
(async()=>{await successCase();await timeoutCase();console.log('APROVADO: upload do guia geral conclui, informa progresso e cancela em timeout.');})().catch(error=>{console.error(error);process.exit(1);});
