'use strict';
(()=>{
 const button=document.getElementById('run'),status=document.getElementById('status');
 async function timeout(task,ms){return Promise.race([task,new Promise((_,reject)=>setTimeout(()=>reject(new Error('tempo esgotado')),ms))]);}
 async function run(){
  button.disabled=true;status.textContent='Removendo atualização antiga...';
  try{
   if('serviceWorker' in navigator){const registrations=await timeout(navigator.serviceWorker.getRegistrations(),5000);await Promise.allSettled(registrations.filter(reg=>location.href.startsWith(reg.scope)).map(reg=>reg.unregister()));}
   if('caches' in window){const keys=await timeout(caches.keys(),5000);await Promise.allSettled(keys.filter(key=>key.startsWith('team-bulls-')).map(key=>caches.delete(key)));}
   status.textContent='Correção concluída. Abrindo a versão nova...';
   setTimeout(()=>location.replace('./index.html?v=10.10.3&recuperado='+Date.now()),450);
  }catch(error){status.textContent='Não foi possível concluir automaticamente. Feche as outras abas do app e tente novamente.';button.disabled=false;}
 }
 button.addEventListener('click',run);
 if(new URLSearchParams(location.search).get('auto')==='1')setTimeout(run,100);
})();
