/* Team Bulls v8.1 — cache leve e atualização segura do PWA. */
'use strict';

const CACHE_NAME='team-bulls-v8-1-shell';
const SHELL_ASSETS=[
  './',
  './manifest_4.json',
  './team-bulls-survival-bg-v8.webp',
  './icon-192-v8.png',
  './icon-512-v8.png'
];

self.addEventListener('install',event=>{
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache=>Promise.all(SHELL_ASSETS.map(url=>cache.add(url).catch(()=>null))))
      .then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(key=>key.startsWith('team-bulls-')&&key!==CACHE_NAME).map(key=>caches.delete(key))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;

  if(request.mode==='navigate'){
    event.respondWith(
      fetch(request)
        .then(response=>{
          if(response.ok)caches.open(CACHE_NAME).then(cache=>cache.put(request,response.clone()));
          return response;
        })
        .catch(()=>caches.match(request).then(cached=>cached||caches.match('./')))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached=>{
      const update=fetch(request).then(response=>{
        if(response.ok)caches.open(CACHE_NAME).then(cache=>cache.put(request,response.clone()));
        return response;
      });
      return cached||update;
    })
  );
});
