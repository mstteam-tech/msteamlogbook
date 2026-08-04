'use strict';
const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
function assert(condition,message){if(!condition)throw new Error(message);}

const html=read('index.html');
const core=read('app_v10_10_5_core.js');
const updater=read('update_v10_10_5.js');
const worker=read('sw.js');
const bridge=read('sw_47.js');
const manifest=JSON.parse(read('manifest.json'));
const version=JSON.parse(read('version.json'));

assert(version.version==='10.10.5','version.json incorreto');
assert(manifest.start_url==='./index.html','start_url ainda está preso a uma versão antiga');
assert(manifest.scope==='./','scope do manifesto incorreto');
assert(html.includes('update_v10_10_5.js?v=10.10.5'),'gerenciador de atualização não é carregado');
assert(html.includes('manifest.json?v=10.10.5'),'manifesto estável não é utilizado');
assert(html.includes('modules/v107-core.js?v=10.10.5'),'módulos estáveis não possuem bust de versão');
assert(!core.includes("serviceWorker.register('sw_47.js'"),'núcleo ainda registra o worker obsoleto');
assert(updater.includes("navigator.serviceWorker.register(`./sw.js?v=${encodeURIComponent(CURRENT_VERSION)}`"),'worker estável não é registrado');
assert(updater.includes("fetch(`${VERSION_URL}?t=${Date.now()}`"),'verificação de versão não evita cache HTTP');
assert(updater.includes("sessionStorage.setItem(UPDATE_RELOAD_KEY,target)"),'recarga de atualização não possui proteção de estado');
assert(updater.includes("TB?.flushDrafts?.()"),'rascunhos não são salvos antes da atualização');
assert(updater.includes("manualCheck:()=>checkForUpdates"),'verificação manual não está exposta');
assert(worker.includes("const APP_VERSION='10.10.5'"),'versão do Service Worker incorreta');
assert(worker.includes("request.mode==='navigate'"),'navegação não é interceptada');
assert(worker.includes('navigationNetworkFirst(request,event)'),'navegação não prioriza rede');
assert(worker.includes("relativePath==='/version.json'"),'version.json não recebe estratégia fresca');
assert(worker.includes("await self.clients.claim()"),'novo worker não assume clientes');
assert(worker.includes("await self.skipWaiting()"),'novo worker não ativa imediatamente');
assert(worker.includes("key!==AUDIO_CACHE_NAME"),'limpeza de cache pode apagar áudio desnecessariamente');
assert(bridge.includes('ponte de migração'),'ponte para instalações v10.10.4 ausente');
assert(bridge.replace('ponte de migração para instalações controladas pelo antigo sw_47.js','Service Worker estável e atualização sem reinstalação')===worker,'ponte e worker principal divergiram');
console.log('APROVADO: atualização interna, manifesto estável, navegação network-first e ponte legada validados.');
