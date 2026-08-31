import fs from 'node:fs';
import {spawnSync} from 'node:child_process';

const fail=[];
const read=path=>fs.readFileSync(path,'utf8');
const assert=(ok,message)=>{if(!ok)fail.push(message);};
const has=(text,needle,message)=>assert(text.includes(needle),message);
const lacks=(text,needle,message)=>assert(!text.includes(needle),message);

const paths={
  usability:'modules/usability-checkup-v10_10_9.js',
  custom:'modules/custom-food-calorie-bridge-v10_10_12.js',
  feedback:'modules/trainer-feedback-history-v10_10_13.js',
  config:'config_v10_7.js',updater:'update_v10_10_9.js',sw:'sw.js',sw47:'sw_47.js'
};
for(const path of Object.values(paths)){
  assert(fs.existsSync(path),`Arquivo obrigatório ausente: ${path}`);
  if(path.endsWith('.js')&&fs.existsSync(path)){const syntax=spawnSync(process.execPath,['--check',path],{encoding:'utf8'});assert(syntax.status===0,`${path} possui JavaScript inválido: ${String(syntax.stderr||'').trim()}`);}
}

const usability=read(paths.usability),custom=read(paths.custom),feedback=read(paths.feedback),config=read(paths.config),updater=read(paths.updater),sw=read(paths.sw),sw47=read(paths.sw47),version=JSON.parse(read('version.json'));

has(usability,"const VERSION='10.10.13-usability3'",'Usabilidade não está na revisão de manutenção.');
has(usability,"button.textContent='SAIR'",'Opção SAIR desapareceu do menu móvel.');
has(usability,"typeof confirmLogout==='function'",'SAIR deixou de usar o logout canônico.');
has(usability,'const delays=[0,60,220,700,1800,4000]','Criação tardia do menu não possui tentativas limitadas.');
lacks(usability,'new MutationObserver','Usabilidade voltou a observar toda a árvore DOM continuamente.');
has(usability,'trainer-feedback-history-v10_10_13.js?v=10.10.13-feedbackhistory2','Histórico de feedbacks não é carregado sob demanda.');

has(custom,"const VERSION='10.10.13-customfood5'",'Ponte de alimentos personalizados não está na revisão segura.');
has(custom,"document.addEventListener('input',event=>{if(event.target?.id==='input-meal-items')syncVisibleTable();},true)",'Alimento personalizado não sincroniza na fase capture antes do cálculo da refeição.');
has(custom,"registry()?.setCustomItems?.([])",'Cache nutricional privado não é limpo na saída.');
has(custom,'__tbCustomFoodCacheClear','Logout não está protegido contra dados personalizados residuais.');
lacks(custom,'new MutationObserver','Ponte de alimentos personalizados voltou a observar o body continuamente.');

has(feedback,"const VERSION='10.10.13-feedbackhistory2'",'Histórico de feedbacks não está na revisão esperada.');
has(feedback,"db.collection('feedback').where('studentId','==',uid)",'Histórico não consulta apenas o aluno selecionado.');
has(feedback,"filter(item=>String(item.trainerId||'')===String(user.uid))",'Histórico não filtra o treinador autenticado.');
has(feedback,'AGUARDANDO LEITURA','Histórico perdeu status de leitura.');
lacks(feedback,'new MutationObserver','Histórico voltou a instalar observador global permanente.');
lacks(feedback,".delete()",'Histórico não deve excluir feedbacks enviados.');

for(const needle of [
  'usability-checkup-v10_10_9.js?v=10.10.13-usability3',
  'diet-portion-presets-v10_10_9.js?v=10.10.13-portions2',
  'custom-food-calorie-bridge-v10_10_12.js?v=10.10.13-customfood5',
  'student-home-profile-v10_10_12.js?v=10.10.12-studenthome2'
])has(config,needle,`Loader usa identidade de cache antiga: ${needle}`);
has(updater,"const CURRENT_BUILD=2026083101",'Updater não usa o build de manutenção.');
has(updater,'student-home-profile-v10_10_12.js?v=10.10.12-studenthome2','Updater ainda aquece a home antiga.');
has(updater,'custom-food-calorie-bridge-v10_10_12.js?v=10.10.13-customfood5','Updater ainda aquece a ponte nutricional antiga.');
has(sw,"const BUILD_REVISION=2026083101",'Service Worker não usa o build de manutenção.');
has(sw,"const CACHE_HOTFIX='hardening1'",'Cache global não foi rotacionado para a manutenção.');
has(sw,'trainer-feedback-history-v10_10_13.js?v=10.10.13-feedbackhistory2','Histórico não está preparado para uso offline após instalação.');
assert(sw===sw47,'sw.js e sw_47.js divergiram.');
assert(version.version==='10.10.9','Versão pública foi alterada indevidamente.');
assert(version.build===2026083101,'version.json não corresponde ao build de manutenção.');

if(fail.length){console.error('FALHA — manutenção/segurança\n- '+fail.join('\n- '));process.exit(1);}
console.log('APROVADO — cache, logout, histórico, alimentos personalizados e observadores DOM revisados sem alterar a versão pública.');
