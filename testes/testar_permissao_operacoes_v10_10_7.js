'use strict';
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const ops=fs.readFileSync(path.join(root,'modules/v107-operations.js'),'utf8');
function need(v,m){if(!v)throw new Error(m);}
need(/data-v107-tab="overview"[^>]*data-v107-trainer-only/.test(html),'Visão geral não está marcada como exclusiva do treinador.');
need(ops.includes("const STUDENT_ALLOWED_TABS=new Set(['notices','sync'])"),'Lista restrita do aluno ausente.');
need(ops.includes("if(!isTrainer()&&!studentCanOpen(tab))"),'Abertura direta não foi bloqueada.');
need(ops.includes("if(!isTrainer()&&!studentCanOpen(requestedTab))"),'Troca de aba não foi bloqueada.');
need(ops.includes("baseShowScreen('screen-home',token)"),'Acesso por histórico/tela direta não foi bloqueado.');
need(ops.includes("screen.classList.toggle('v107-student-utility',!trainer)"),'Modo visual restrito do aluno ausente.');
console.log('APROVADO: Central de Operações exclusiva do treinador; aluno limitado a Avisos e Sincronização.');
