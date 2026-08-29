import fs from 'node:fs';
import {spawnSync} from 'node:child_process';

const file='modules/heic-libheif-worker-v10_10_12.js';
const fail=[];
const assert=(ok,message)=>{if(!ok)fail.push(message);};
assert(fs.existsSync(file),'Worker HEIC ausente.');
const source=fs.existsSync(file)?fs.readFileSync(file,'utf8'):'';
if(source){
  const syntax=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});
  assert(syntax.status===0,'Worker HEIC possui JavaScript inválido: '+String(syntax.stderr||'').trim());
}
for(const [needle,message] of [
  ["libheif-js@1.19.8/libheif/libheif.js",'Versão do libheif não está fixada.'],
  ['function resolveLibheif()','Worker não resolve as formas diferentes de exportação do libheif.'],
  ["typeof libheif!=='undefined'",'Worker não procura o global lexical libheif.'],
  ['self.module?.exports','Worker não possui fallback CommonJS.'],
  ['candidate?.default','Worker não possui fallback para export default.'],
  ["typeof candidate.HeifDecoder==='function'",'Worker não valida HeifDecoder antes de ficar pronto.'],
  ['HEIF=resolveLibheif()','Worker não usa o decoder efetivamente resolvido.'],
  ['const MAX_PIXELS=32000000','Limite preventivo de pixels HEIC foi removido.'],
  ["self.postMessage({type:'ready',ok:ready,error:initError})",'Handshake de inicialização HEIC foi removido.']
])assert(source.includes(needle),message);
if(fail.length){console.error('FALHA — worker HEIC/libheif\n- '+fail.join('\n- '));process.exit(1);}
console.log('APROVADO — worker HEIC resolve exports libheif de forma compatível e mantém limites de segurança.');
