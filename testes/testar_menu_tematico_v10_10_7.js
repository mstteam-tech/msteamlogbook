
'use strict';
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'styles_v10_10_7.css'),'utf8');
function need(value,message){if(!value)throw new Error(message);}
const start=html.indexOf('<div class="quick-nav" aria-label="Atalhos do aluno">');
const end=html.indexOf('</div>\n<div class="content">',start);
need(start>=0&&end>start,'Grade temática não encontrada.');
const block=html.slice(start,end);
const labels=['Instruções','Suprimentos','Opções de Suprimentos','Técnicas','Substituições de exercícios','Relatórios','Evidências','Avisos','Registros'];
let previous=-1;
for(const label of labels){const pos=block.indexOf(`>${label}</span>`);need(pos>previous,`Ordem incorreta ou aba ausente: ${label}`);previous=pos;}
need((block.match(/<svg class="quick-nav-icon"/g)||[]).length===9,'As nove abas precisam de ícones SVG consistentes.');
need(!/quick-nav-btn[^>]*openFreeMeals\(\)/.test(block),'Refeição livre ainda aparece como aba separada.');
need(/openMeals\(\)[\s\S]*?aria-label="Suprimentos"[\s\S]*?<svg/.test(block),'Suprimentos não abre a área unificada.');
need(block.lastIndexOf('openCalendar()')>block.indexOf('openV107Operations(\'notices\')'),'Registros não está no final.');
need(html.includes('class="supplements-free-meal-card"'),'Acesso a refeições livres não foi incorporado em Suprimentos.');
need(html.includes('<button class="btn-icon" onclick="openMeals()">←</button>\n<div class="header-title">REFEIÇÕES LIVRES</div>'),'Refeições livres não retorna à área de Suprimentos.');
need(!html.includes('<button onclick="openFreeMeals()">🍔 REFEIÇÕES LIVRES</button>'),'Sidebar ainda expõe refeição livre separadamente.');
need(css.includes('.quick-nav-btn .quick-nav-icon')&&css.includes('.supplements-free-meal-card'),'Estilo temático ou hub unificado ausente.');
console.log('APROVADO: ordem, nomes, ícones temáticos e união de Suprimentos/Refeições Livres validados.');
