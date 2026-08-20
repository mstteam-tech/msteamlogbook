import fs from 'node:fs';

const fail=[];
const read=path=>fs.readFileSync(path,'utf8');
const assert=(condition,message)=>{if(!condition)fail.push(message);};
const has=(text,needle,message)=>assert(text.includes(needle),message);

for(const path of ['config_v10_7.js','modules/usability-checkup-v10_10_9.js','modules/modal-stack-stability-v10_10_9.js']){
  assert(fs.existsSync(path),`Arquivo obrigatório ausente: ${path}`);
}
if(fail.length){console.error(fail.join('\n'));process.exit(1);}

const config=read('config_v10_7.js');
const usability=read('modules/usability-checkup-v10_10_9.js');
const modal=read('modules/modal-stack-stability-v10_10_9.js');

has(config,'./modules/usability-checkup-v10_10_9.js?v=10.10.9-usability1','Camada de usabilidade não está carregada.');
has(config,"setTimeout(()=>finish(false,'tempo limite')",'Loader opcional não possui limite de espera.');
has(config,'deferredBatchCount%4===0','Loader não devolve tempo de pintura à interface entre lotes.');
assert(config.indexOf('usability-checkup-v10_10_9.js')<config.indexOf('modal-stack-stability-v10_10_9.js'),'Estabilidade de modais deve continuar sendo a última camada de UI.');

has(usability,'scrollByHistoryKey','Navegação não preserva posição por entrada do histórico.');
has(usability,"window.addEventListener('popstate'",'Restauração de scroll ao voltar está ausente.');
has(usability,'scrollActiveWeekIntoView','Semana ativa não é revelada automaticamente na grade.');
has(usability,'min-height:44px','Alvos de toque móveis não foram ampliados.');
has(usability,'content-visibility:auto','Listas móveis não usam renderização sob demanda.');
has(usability,"button.setAttribute('aria-busy','true')",'Ações assíncronas não expõem estado ocupado.');
has(usability,"window.addEventListener('pagehide',releaseMediaUrls",'URLs de mídia não são liberadas em todas as saídas da página.');

has(modal,'const HEALTH_CHECK_MS=1900','Intervalo otimizado do monitor de modais ausente.');
has(modal,"runtime:'health2'",'Runtime otimizado de modais não identificado.');
has(modal,'if(document.hidden||!openModals().length)return;','Monitor de modais continua trabalhando com a página oculta.');
has(modal,"window.addEventListener('pagehide',pauseHealthCheck",'Monitor de modais não é pausado ao sair da página.');
const recovery=modal.indexOf('function recoverOrphanedTop()');
const keyboard=modal.indexOf('if(keyboardEditing(top))return false;',recovery);
const rendered=modal.indexOf('if(renderedPanel(top))',recovery);
assert(recovery>=0&&keyboard>recovery&&rendered>keyboard,'Recuperação de modal força layout antes de verificar se o usuário está digitando.');

if(fail.length){console.error(fail.join('\n'));process.exit(1);}
console.log('Usability check-up OK');
