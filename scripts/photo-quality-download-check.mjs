import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const root=process.cwd();
const fail=[];
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const has=(text,needle,message)=>{if(!text.includes(needle))fail.push(message);};
const assert=(value,message)=>{if(!value)fail.push(message);};

const modulePath='modules/photo-quality-download-v10_10_9.js';
assert(fs.existsSync(path.join(root,modulePath)),'Módulo de qualidade/download de fotos ausente.');
const source=read(modulePath);
const config=read('config_v10_7.js');
const rules=read('firebase/storage_5.rules');
const sw=read('sw.js');
const sw47=read('sw_47.js');
const syntax=spawnSync(process.execPath,['--check',modulePath],{encoding:'utf8'});
assert(syntax.status===0,'Módulo de fotos possui JavaScript inválido: '+String(syntax.stderr||'').trim());

has(source,"const VERSION='10.10.9-photoquality2'",'Hotfix de ingestão móvel não está ativo.');
has(source,"const ORIGINAL_KIND='progressPhotoOriginals'",'Arquivo original não é preservado em caminho separado.');
has(source,'MAX_ORIGINAL_BYTES=25*1024*1024','Limite de original de 25 MiB ausente.');
has(source,'buildProgressPhotoVariants.__tbOriginalArchive','Captura da foto fonte antes da otimização ausente.');
has(source,"kind==='progressPhotos'?pendingOriginals.get(dataUrl):null",'Original não acompanha o upload da foto de progresso.');
has(source,"contentDisposition:`attachment; filename=",'Original não preserva nome para download.');
has(source,"button.textContent='↓ BAIXAR FOTO ORIGINAL'",'Botão de download do treinador ausente.');
has(source,"CURRENT_USER?.role==='trainer'",'Download não está restrito à interface do treinador.');
has(source,'safePhotoDataUrl(record?.dataUrl)','Compatibilidade de download com fotos antigas em Firestore ausente.');
has(source,'service.ref(original).delete()','Exclusão não remove o original associado.');

has(source,'function releaseLegacyReportPreviewSurfaces()','Previews pesados dos relatórios não são liberados antes da compressão.');
has(source,"if(url.startsWith('blob:'))",'Object URLs de fotos em resolução cheia podem permanecer retidos.');
has(source,'await nextPaint();','Compressão não dá ao navegador oportunidade de liberar as superfícies antigas.');
has(source,'previewWeeklyCheckinPhoto=function','Relatório semanal não usa preview leve.');
has(source,'previewQuestionnaireReportPhoto=function','Questionário com fotos não usa preview leve.');
has(source,'encodeImageVariant(decoded,520,.68,240000)','Preview continua usando resolução excessiva no celular.');
has(source,'const bitmap=await createImageBitmap(file);','Fallback Android sem imageOrientation está ausente.');
has(source,"type==='image/heic'||type==='image/heif'",'Erro específico para HEIC/HEIF não está presente.');
has(source,"raw==='image/jpg'||raw==='image/pjpeg'",'Normalização de JPEGs com MIME legado ausente.');

has(config,"./modules/photo-quality-download-v10_10_9.js?v=10.10.9-photoquality2",'Loader não inclui a revisão móvel do módulo de fotos.');
has(sw,"./modules/photo-quality-download-v10_10_9.js?v=10.10.9-photoquality2",'Service Worker principal não renova a revisão móvel das fotos.');
has(sw47,"./modules/photo-quality-download-v10_10_9.js?v=10.10.9-photoquality2",'Service Worker legado não renova a revisão móvel das fotos.');
has(rules,'match /progressPhotoOriginals/{uid}/{photoId}','Regras do Storage não cobrem originais.');
has(rules,"request.resource.contentType.matches('image/(jpeg|png|webp|gif|avif|heic|heif)')",'Tipos de imagem originais permitidos estão incorretos.');
has(rules,'validOriginalProgressPhoto(25 * 1024 * 1024)','Limite do Storage para original não é 25 MiB.');
has(rules,'function trainerOwns(uid)','Regras do Storage não validam o vínculo treinador → aluno.');
has(rules,'allow read: if trainerOwns(uid) || activeOwner(uid);','Treinador vinculado/aluno não têm leitura compatível com fotos existentes.');
assert(!rules.includes('allow read: if isTrainer() || activeOwner(uid);'),'Qualquer treinador voltou a ter acesso às fotos de qualquer aluno.');

if(fail.length){console.error('\nFalhas de qualidade/download de fotos:\n- '+fail.join('\n- '));process.exit(1);}
console.log('Photo quality/download check OK — original preservado, preview móvel leve, fallback de decode e download restrito validados.');
