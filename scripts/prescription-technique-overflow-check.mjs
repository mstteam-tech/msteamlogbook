import fs from 'node:fs';

const release = fs.readFileSync('modules/release-coherence-v10_10_10.js','utf8');
const styles = fs.readFileSync('styles_v10_10_9.css','utf8');

const fail = message => { console.error('FALHA:', message); process.exitCode = 1; };

if (!styles.includes('#modal-prescription .prescription-tech-panel')) fail('painel de técnicas não existe no CSS base');
if (!styles.includes('overflow:hidden')) fail('cenário-base de overflow não foi localizado');
if (!release.includes('installPrescriptionTechniqueOverflowFix')) fail('hotfix de overflow não foi instalado');
if (!release.includes('overflow-y:auto!important')) fail('painel de técnicas não ganhou rolagem vertical');
if (!release.includes('overflow-x:hidden!important')) fail('overflow horizontal não foi protegido');
if (!release.includes('max-height:min(180px,32dvh)!important')) fail('seletor de técnicas não foi limitado em telas baixas');
if (!release.includes('.week-superset-config')) fail('configuração de exercício conjugado não está protegida');
if (!release.includes('.myo-optional-config')) fail('configuração opcional de Myo Reps não está protegida');

if (!process.exitCode) console.log('APROVADO — editor de técnicas mantém SS/Myo e controles inferiores acessíveis em telas desktop baixas.');
