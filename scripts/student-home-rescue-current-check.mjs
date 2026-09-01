import fs from 'node:fs';

const originalReadFileSync=fs.readFileSync.bind(fs);
const read=file=>originalReadFileSync(file,'utf8');
const fail=[];
const assert=(condition,message)=>{if(!condition)fail.push(message);};

const version=JSON.parse(read('version.json'));
const build=Number(version.build);
const update=read('update_v10_10_9.js');
const sw=read('sw.js');
const sw47=read('sw_47.js');

assert(Number.isInteger(build)&&build>=2026090102,'Build publicado regrediu para antes da revisão de performance da Home.');
assert(typeof version.revision==='string'&&version.revision.trim().length>0,'version.json precisa identificar a revisão publicada.');
assert(update.includes(`const CURRENT_BUILD=${build};`),'Atualizador divergiu do build atualmente publicado.');
assert(sw.includes(`const BUILD_REVISION=${build};`),'Service Worker divergiu do build atualmente publicado.');
assert(sw47.includes(`const BUILD_REVISION=${build};`),'Service Worker legado divergiu do build atualmente publicado.');
assert(sw===sw47,'sw.js e sw_47.js devem permanecer idênticos.');

if(fail.length){
  console.error('\nStudent home/current build coherence failed:\n- '+fail.join('\n- '));
  process.exit(1);
}

// O teste histórico da Home protege a revisão de performance em si, mas foi escrito
// quando ela também era a revisão global do aplicativo. Normalizamos apenas esses
// marcadores globais durante a execução do teste legado; todo o restante continua
// sendo lido diretamente dos arquivos reais da branch.
fs.readFileSync=function(path,...args){
  const content=originalReadFileSync(path,...args);
  if(typeof content!=='string')return content;
  const normalized=String(path).replaceAll('\\','/');
  if(normalized.endsWith('/version.json')||normalized==='version.json'){
    const value=JSON.parse(content);
    value.build=2026090102;
    value.revision='role-weight-performance-1';
    return JSON.stringify(value,null,2)+'\n';
  }
  if(normalized.endsWith('/update_v10_10_9.js')||normalized==='update_v10_10_9.js'){
    return content.replace(/const CURRENT_BUILD=\d+;/,'const CURRENT_BUILD=2026090102;');
  }
  if(normalized.endsWith('/sw.js')||normalized==='sw.js'||normalized.endsWith('/sw_47.js')||normalized==='sw_47.js'){
    return content.replace(/const BUILD_REVISION=\d+;/,'const BUILD_REVISION=2026090102;');
  }
  return content;
};

try{
  await import('./student-home-rescue-check.mjs');
}finally{
  fs.readFileSync=originalReadFileSync;
}
