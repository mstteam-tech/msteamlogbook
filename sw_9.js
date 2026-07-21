/* Team Bulls v9.4 — shell rápido + playlist local em cache sob demanda. */
'use strict';
const CACHE_NAME='team-bulls-v9-4-random-playlist-shell';
const AUDIO_CACHE_NAME='team-bulls-v9-4-random-playlist-audio';
const AUDIO_NAME_PATTERN=/^team-bulls-music-[a-z0-9-]+\.mp3$/i;
const ESSENTIAL_ASSETS=['./','./index.html','./manifest_8.json','./icon-192-v8-2.png','./icon-512-v8-2.png'];
const OPTIONAL_ASSETS=['./team-bulls-survival-bg-v8.webp'];

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE_NAME);
    await cache.addAll(ESSENTIAL_ASSETS);
    await Promise.allSettled(OPTIONAL_ASSETS.map(url=>cache.add(url)));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(key=>key.startsWith('team-bulls-')&&![CACHE_NAME,AUDIO_CACHE_NAME].includes(key)).map(key=>caches.delete(key)));
    await self.clients.claim();
  })());
});

function getAudioAsset(input){
  try{
    const url=new URL(input,self.location.href);
    if(url.origin!==self.location.origin)return'';
    const name=url.pathname.split('/').pop()||'';
    return AUDIO_NAME_PATTERN.test(name)?'./'+name:'';
  }catch(e){return'';}
}

self.addEventListener('message',event=>{
  if(event.data?.type!=='CACHE_AUDIO')return;
  const asset=getAudioAsset(event.data?.url||'');
  if(!asset)return;
  event.waitUntil((async()=>{
    const cache=await caches.open(AUDIO_CACHE_NAME);
    if(await cache.match(asset))return;
    try{
      const response=await fetch(asset,{cache:'no-cache'});
      if(response.ok&&response.status===200)await cache.put(asset,response.clone());
    }catch(e){/* A faixa continua disponível por streaming quando houver rede. */}
  })());
});

async function rangeFromCachedAudio(request,asset){
  const range=request.headers.get('range');
  if(!range)return null;
  const cached=await (await caches.open(AUDIO_CACHE_NAME)).match(asset);
  if(!cached)return null;
  const match=/bytes=(\d+)-(\d*)/.exec(range);
  if(!match)return cached;
  const buffer=await cached.arrayBuffer();
  const size=buffer.byteLength;
  const start=Math.min(Number(match[1])||0,Math.max(0,size-1));
  const requestedEnd=match[2]?Number(match[2]):size-1;
  const end=Math.min(Number.isFinite(requestedEnd)?requestedEnd:size-1,size-1);
  if(start>end)return new Response(null,{status:416,headers:{'Content-Range':`bytes */${size}`}});
  const chunk=buffer.slice(start,end+1);
  return new Response(chunk,{status:206,headers:{
    'Content-Type':cached.headers.get('Content-Type')||'audio/mpeg',
    'Content-Length':String(chunk.byteLength),
    'Content-Range':`bytes ${start}-${end}/${size}`,
    'Accept-Ranges':'bytes',
    'Cache-Control':'public, max-age=31536000, immutable'
  }});
}

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;

  const audioAsset=getAudioAsset(url.href);
  if(audioAsset){
    event.respondWith((async()=>{
      if(request.headers.has('range')){
        const ranged=await rangeFromCachedAudio(request,audioAsset);
        if(ranged)return ranged;
        try{return await fetch(request);}catch(e){return new Response('',{status:504});}
      }
      const cache=await caches.open(AUDIO_CACHE_NAME);
      const cached=await cache.match(audioAsset);
      if(cached)return cached;
      try{
        const response=await fetch(request);
        if(response.ok&&response.status===200)await cache.put(audioAsset,response.clone());
        return response;
      }catch(e){return new Response('',{status:504});}
    })());
    return;
  }

  if(request.mode==='navigate'){
    event.respondWith((async()=>{
      try{
        const response=await fetch(request);
        if(response.ok)(await caches.open(CACHE_NAME)).put('./index.html',response.clone());
        return response;
      }catch(e){
        return (await caches.match(request))||(await caches.match('./index.html'))||(await caches.match('./'))||new Response('Team Bulls indisponível offline.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});
      }
    })());
    return;
  }

  event.respondWith((async()=>{
    const cached=await caches.match(request);
    const network=fetch(request).then(async response=>{
      if(response.ok&&response.status===200)(await caches.open(CACHE_NAME)).put(request,response.clone());
      return response;
    }).catch(()=>null);
    return cached||(await network)||new Response('',{status:504});
  })());
});
