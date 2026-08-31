import fs from 'node:fs';
import {spawnSync} from 'node:child_process';

const fail=[];
const assert=(ok,message)=>{if(!ok)fail.push(message);};
const read=file=>fs.readFileSync(file,'utf8');
const sw=read('sw.js');
const bridge=read('sw_47.js');

for(const file of ['sw.js','sw_47.js']){
  const syntax=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});
  assert(syntax.status===0,`${file} possui JavaScript inválido: ${String(syntax.stderr||'').trim()}`);
}

assert(sw===bridge,'sw.js e sw_47.js divergiram durante o resgate de inicialização.');
assert(sw.includes("const CACHE_HOTFIX='startup-rescue2';"),'Cache de resgate não foi rotacionado.');
assert(sw.includes('async function navigationNetworkFirst'),'Navegação ainda não prioriza uma cópia fresca da rede.');
assert(!sw.includes('navigationCacheFirst(request,event)'),'Estratégia cache-first antiga reapareceu na navegação.');
assert(sw.includes("'/update_v10_10_9.js','/app_v10_10_9_core.js'"),'Atualizador e core não estão classificados como mutáveis.');
assert(sw.includes("'/boot_v10.js','/config_v10_7.js'"),'Boot e configuração não estão classificados como mutáveis.');

const mutableCheck=sw.indexOf('if(MUTABLE_PATHS.has(relativePath))');
const genericVersioned=sw.indexOf("if(VERSIONED_PATH_PATTERN.test(fileName)||url.searchParams.has('v'))");
assert(mutableCheck>=0&&genericVersioned>=0&&mutableCheck<genericVersioned,'Arquivos mutáveis continuam caindo no cache-first por causa de ?v=.');

assert(sw.includes('const stale=keys.filter'),'Ativação não identifica caches antigos.');
assert(sw.includes('await Promise.all(stale.map(key=>caches.delete(key)))'),'Ativação não remove caches antigos.');
assert(sw.includes('if(stale.length)await forceRecoveredNavigation()'),'Cliente preso em cache antigo não recebe navegação de recuperação.');
assert(sw.includes("target.searchParams.set('cache-rescue',String(BUILD_REVISION))"),'Navegação de recuperação não é identificável/auditável.');
assert(sw.includes('await self.clients.claim()'),'Novo Service Worker não assume imediatamente os clientes abertos.');

assert(sw.includes("'./modules/student-home-layout-v10_10_15.js?v=10.10.15-home2'"),'Layout novo deixou de ser preparado pelo PWA.');
assert(sw.includes("'./modules/student-home-profile-v10_10_12.js?v=10.10.12-studenthome1'"),'Cabeçalho atual do aluno deixou de ser preparado pelo PWA.');

if(fail.length){
  console.error('FALHA — startup/cache recovery\n- '+fail.join('\n- '));
  process.exit(1);
}
console.log('Startup/cache recovery check OK — mutáveis network-first, cache antigo descartado e layout preservado.');
