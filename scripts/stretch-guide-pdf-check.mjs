import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const fail=[];
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const assert=(condition,message)=>{if(!condition)fail.push(message);};
const has=(text,needle,message)=>assert(text.includes(needle),message);
const lacks=(text,needle,message)=>assert(!text.includes(needle),message);

const modulePath='modules/stretch-guide-pdf-v10_10_9.js';
assert(fs.existsSync(path.join(root,modulePath)),'Módulo do PDF de alongamentos ausente.');
const source=read(modulePath);
const config=read('config_v10_7.js');
const sw=read('sw.js');

has(source,"const VERSION='10.10.9-stretchpdf1'",'Versão do visualizador exato ausente.');
has(source,'const PAGE_COUNT=10','Visualizador não declara as 10 páginas do PDF.');
has(source,"./assets/stretch-guide/page-${String(index+1).padStart(2,'0')}.avif",'Visualizador não aponta para as páginas renderizadas do PDF.');
has(source,'data-src=', 'As páginas deixaram de usar carregamento sob demanda.');
has(source,'function ensurePageLoaded','Carregamento sob demanda das páginas ausente.');
has(source,'function warmPages','Pré-carregamento somente das páginas vizinhas ausente.');
has(source,'scroll-snap-type:x mandatory','Swipe horizontal do guia ausente.');
has(source,"event.key==='ArrowLeft'",'Navegação por teclado para a esquerda ausente.');
has(source,"event.key==='ArrowRight'",'Navegação por teclado para a direita ausente.');
has(source,"document.getElementById('tb-stretch-viewer')?.remove()",'Visualizador HTML antigo não é neutralizado.');
has(source,"document.querySelectorAll('[data-tb-stretch-nav],[data-tb-stretch-home]')",'Atalhos antigos não são reconectados ao visualizador real.');
has(source,'window.openStretchGuide=openStretchPdfGuide','Abertura global não foi substituída pelo PDF real.');
has(source,'window.closeStretchGuide=closeStretchPdfGuide','Fechamento global não foi substituído pelo PDF real.');
lacks(source,"db.collection(",'Guia de alongamentos não deve acessar Firestore.');
lacks(source,'firebase.storage','Guia de alongamentos não deve acessar Storage.');
lacks(source,'signInWithEmailAndPassword','Guia de alongamentos não deve alterar autenticação.');

const loader="./modules/stretch-guide-pdf-v10_10_9.js?v=10.10.9-stretchpdf1";
has(config,loader,'Loader não inclui o visualizador exato do PDF.');
assert(config.indexOf('student-guidance-v10_10_9-v2.js')<config.indexOf('stretch-guide-pdf-v10_10_9.js'),'PDF exato precisa carregar depois das orientações do aluno.');
assert(config.indexOf('stretch-guide-pdf-v10_10_9.js')<config.indexOf('modal-stack-stability-v10_10_9.js'),'PDF exato precisa carregar antes da camada final de modais.');

const requiredShell=sw.slice(sw.indexOf('const REQUIRED_SHELL=['),sw.indexOf('const OPTIONAL_SHELL=['));
lacks(requiredShell,'assets/stretch-guide/','As imagens do PDF não podem entrar no shell crítico/login.');

let totalBytes=0;
for(let page=1;page<=10;page+=1){
  const rel=`assets/stretch-guide/page-${String(page).padStart(2,'0')}.avif`;
  const full=path.join(root,rel);
  assert(fs.existsSync(full),`Página real ausente: ${rel}`);
  if(!fs.existsSync(full))continue;
  const data=fs.readFileSync(full);
  totalBytes+=data.length;
  assert(data.length>3000,`Página ${page} parece vazia ou inválida.`);
  assert(data.subarray(4,12).toString('ascii').includes('ftypavif'),`Página ${page} não é AVIF válido.`);
}
assert(totalBytes<200*1024,`Páginas do guia somam ${totalBytes} bytes; revisar impacto no mobile.`);

if(fail.length){
  console.error('\nFalhas do guia PDF de alongamentos:\n- '+fail.join('\n- '));
  process.exit(1);
}
console.log(`Stretch guide PDF check OK — 10 páginas reais, ${(totalBytes/1024).toFixed(1)} KiB, carregamento sob demanda.`);
