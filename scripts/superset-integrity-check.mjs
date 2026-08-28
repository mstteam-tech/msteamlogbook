import fs from 'node:fs';

const core = fs.readFileSync('app_v10_10_9_core.js','utf8');
const release = fs.readFileSync('modules/release-coherence-v10_10_10.js','utf8');

const fail = message => { console.error('FALHA:', message); process.exitCode = 1; };

// O núcleo precisa manter o vínculo semanal bilateral: A -> B e B -> A.
if (!core.includes('supersetExerciseId:source.id')) fail('vínculo bilateral semanal do Super Set não foi encontrado');
if (!core.includes('buildWeekTechniquePlanUpdates')) fail('propagação semanal de técnicas não foi encontrada');
if (!core.includes("oldRelated=(workout.exercises||[]).filter")) fail('limpeza do vínculo anterior do Super Set não foi encontrada');

// A camada final precisa tornar o parceiro selecionável e impedir pares inválidos.
if (!release.includes('populateWeeklySupersetSelect')) fail('seletor semanal de parceiro SS não foi instalado');
if (!release.includes("group.classList.toggle('tb-ss-active',checked)")) fail('grupo do parceiro SS não é exibido quando SS é marcado');
if (!release.includes("MESMO DIA — recomendado")) fail('exercícios do mesmo dia não são priorizados');
if (!release.includes("OUTROS DIAS — não permitido")) fail('exercícios de outro dia não são bloqueados');
if (!release.includes('weeklyPairOwner')) fail('colisões com outro Super Set semanal não são detectadas');
if (!release.includes("partnerId===String(ctx.source.id)")) fail('auto-vínculo SS não é rejeitado');
if (!release.includes("!sameExerciseDay(ctx.source,partner)")) fail('par SS entre dias diferentes não é rejeitado');
if (!release.includes("populateWeeklySupersetSelect({focus:true})")) fail('erro de parceiro não direciona o treinador ao seletor');
if (!release.includes("tb-superset-helper")) fail('estado visual do parceiro SS não foi adicionado');

// O editor base também deve receber proteção para não criar vínculos conflitantes.
if (!release.includes('populateBaseSupersetSelect')) fail('editor base de Super Set não foi protegido');
if (!release.includes('basePairOwner')) fail('colisões de Super Set no editor base não são detectadas');

if (!process.exitCode) console.log('APROVADO — Super Set: seleção do parceiro, mesmo dia, vínculo bilateral e prevenção de colisões validados.');
