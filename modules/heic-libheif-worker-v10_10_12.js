/* Team Bulls v10.10.12 — worker dedicado para decodificar HEIC/HEIF fora da CSP da página. */
'use strict';

const LIBHEIF_URL='https://cdn.jsdelivr.net/npm/libheif-js@1.19.8/libheif/libheif.js';
const MAX_PIXELS=32000000;
let ready=false;
let initError='';
let libheifApi=null;

function fail(message){initError=String(message||'Falha ao inicializar o decoder HEIC.');}
function resolveLibheif(){
  try{
    if(typeof libheif!=='undefined'&&libheif&&typeof libheif.HeifDecoder==='function')return libheif;
  }catch(error){}
  if(self.libheif&&typeof self.libheif.HeifDecoder==='function')return self.libheif;
  return null;
}

try{
  importScripts(LIBHEIF_URL);
  libheifApi=resolveLibheif();
  ready=!!libheifApi;
  if(!ready)fail('A biblioteca libheif foi carregada, mas o decoder não ficou disponível.');
}catch(error){
  fail(error?.message||'Não foi possível carregar o decoder HEIC.');
}

self.postMessage({type:'ready',ok:ready,error:initError});

self.addEventListener('message',event=>{
  const id=String(event.data?.id||'');
  if(!id)return;
  if(!ready||!libheifApi){self.postMessage({id,ok:false,error:initError||'Decoder HEIC indisponível.'});return;}
  try{
    const buffer=event.data?.buffer;
    if(!(buffer instanceof ArrayBuffer)||!buffer.byteLength)throw new Error('Arquivo HEIC vazio ou inválido.');
    const decoder=new libheifApi.HeifDecoder();
    const images=decoder.decode(new Uint8Array(buffer));
    const image=Array.isArray(images)?images[0]:null;
    if(!image)throw new Error('O arquivo HEIC não contém uma imagem decodificável.');
    const width=Number(image.get_width?.()||0),height=Number(image.get_height?.()||0);
    if(!width||!height)throw new Error('Dimensões HEIC inválidas.');
    if(width*height>MAX_PIXELS)throw new Error('A foto HEIC é grande demais para conversão segura neste aparelho.');
    const rgba=new Uint8ClampedArray(width*height*4);
    const target={data:rgba,width,height};
    image.display(target,displayData=>{
      try{
        if(!displayData)throw new Error('O decoder HEIC não conseguiu renderizar a imagem.');
        const data=displayData.data instanceof Uint8ClampedArray?displayData.data:rgba;
        self.postMessage({id,ok:true,width,height,rgba:data.buffer},[data.buffer]);
      }catch(error){self.postMessage({id,ok:false,error:error?.message||'Falha ao renderizar HEIC.'});}
    });
  }catch(error){
    self.postMessage({id,ok:false,error:error?.message||'Falha ao decodificar HEIC.'});
  }
});
