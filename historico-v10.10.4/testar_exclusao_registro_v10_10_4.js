'use strict';
const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..');
const core=fs.readFileSync(path.join(root,'app_v10_10_4_core.js'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
function assert(condition,message){if(!condition){throw new Error(message);}}

assert(core.includes('async function performDeleteSession(sid)'), 'operação central de exclusão ausente');
assert(core.includes('function deleteSession(sid)'), 'entrada de exclusão do cartão ausente');
assert(core.includes('function deleteEditedSession()'), 'exclusão pelo editor ausente');
assert(core.includes("onclick=\"deleteSession(${jsArg(sess.id)})\""), 'botão da sessão não chama exclusão diretamente');
assert(!core.includes("showConfirm('Excluir sessão','Apagar este registro?',function(){deleteSession("), 'confirmação duplicada ainda presente');
assert(core.includes("if(!sets.length){deleteEditedSession();return;}"), 'limpar todas as séries não oferece exclusão do registro');
assert(core.includes('removeSessionFromHistory(sessionId);'), 'histórico em memória não é limpo');
assert(core.includes('removeSessionFromArchive(CURRENT_USER.uid,sessionId);'), 'arquivo offline do aluno não é limpo');
assert(html.includes('id="btn-delete-edited-session"'), 'botão de apagar registro completo não existe no editor');
assert(html.includes('onclick="deleteEditedSession()"'), 'botão do editor não está conectado');

const editOverlay=core.slice(core.indexOf('const openEditSessionV101='),core.indexOf('const workoutPdfHtmlV101='));
assert(!editOverlay.includes(".btn-rm-set').disabled=true"), 'série realizada continua bloqueada contra remoção');
assert(!editOverlay.includes('if(remove)remove.disabled=true'), 'série BOS realizada continua bloqueada contra remoção');

console.log('APROVADO: exclusão direta, editor e limpeza de histórico validados.');
