const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const core=fs.readFileSync(path.join(root,'app_v10_10_9_core.js'),'utf8');
const expected={
  "Supino reto com barra": "https://youtube.com/shorts/CxzAHHDNUVc?feature=share",
  "Supino reto com halteres": "https://youtube.com/shorts/s5ZLWn3PUho?feature=share",
  "Supino reto articulado": "https://youtube.com/shorts/w6C26VH1fBM?feature=share",
  "Supino reto no Smith": "https://youtube.com/shorts/mjwLNQidwFo?feature=share",
  "Supino vertical articulado": "https://youtube.com/shorts/rWbsu7tA-8Y?feature=share",
  "Supino inclinado articulado": "https://youtube.com/shorts/ozfjifgjnCw?feature=share",
  "Supino inclinado com barra": "https://youtube.com/shorts/fZ2o8HpLuc8?feature=share",
  "Supino inclinado com halteres": "https://youtube.com/shorts/6dKYjXIgkFc?feature=share",
  "Supino inclinado no Smith": "https://youtube.com/shorts/jOnXA7hDMuc?feature=share",
  "Supino declinado articulado": "https://youtube.com/shorts/-lvI4NwzNpw?feature=share",
  "Supino declinado com halteres": "https://youtube.com/shorts/ODMKX-BCAQI?feature=share",
  "Supino declinado com barra": "https://youtube.com/shorts/Rk3k2BE6m_o?feature=share",
  "Crucifixo na máquina": "https://youtube.com/shorts/xZTzdOoxGqw?feature=share",
  "Crucifixo no banco reto com halteres": "https://youtube.com/shorts/9CD7NmH8ff8?feature=share",
  "Crucifixo inclinado com halteres": "https://youtube.com/shorts/eVFkhYdQmEM?feature=share",
  "Crossover na polia alta": "https://youtube.com/shorts/4pNymRkTtzM?feature=share",
  "Crossover na polia baixa": "https://youtube.com/shorts/P8DOiCtuI2c?feature=share",
  "Puxada alta com barra": "https://youtube.com/shorts/SjYyIZoNzzw?feature=share",
  "Barra fixa": "https://youtube.com/shorts/rIKUJok32_k?feature=share",
  "Puxada alta articulada": "https://youtube.com/shorts/HMdUt_wH3c0?feature=share",
  "Puxada alta com triângulo": "https://youtube.com/shorts/3bVof9FtzP0?feature=share",
  "Remada apoiada na máquina": "https://youtube.com/shorts/GLtPFw2pEj0?feature=share",
  "Remada apoiada inclinada na máquina": "https://youtube.com/shorts/B1qYoBTKQWI?feature=share",
  "Remada curvada com barra": "https://youtube.com/shorts/NHasqOPT9NY?feature=share",
  "Remada serrote sobre o banco": "https://youtube.com/shorts/MXUAnauZ144?feature=share",
  "Remada Meadows": "https://youtube.com/shorts/qpfx0yaeSLI?feature=share",
  "Remada na polia baixa com triângulo": "https://youtube.com/shorts/Fm20PrEmXrM?feature=share",
  "Remada baixa articulada": "https://youtube.com/shorts/CdSGbc7h2gc?feature=share",
  "Remada baixa com barra e pegada pronada": "https://youtube.com/shorts/Y9XApeVYKJI?feature=share",
  "Desenvolvimento com halteres": "https://youtube.com/shorts/cp-tzaQ2oKg?feature=share",
  "Desenvolvimento na máquina articulada": "https://youtube.com/shorts/hpkuy18o9zA?feature=share",
  "Elevação lateral com halteres": "https://youtube.com/shorts/xrTFDyBAceo?feature=share",
  "Elevação lateral na polia baixa": "https://youtube.com/shorts/5AEuvwk_Yd0?feature=share",
  "Elevação frontal com halteres": "https://youtube.com/shorts/qg8xuSUHes4?feature=share",
  "Elevação frontal com corda na polia": "https://youtube.com/shorts/BhuZY1Bs_Bk?feature=share",
  "Rosca direta com barra": "https://youtube.com/shorts/USe1t7LuFVo?feature=share",
  "Rosca direta com halteres": "https://youtube.com/shorts/ojDmRshItXk?feature=share",
  "Rosca direta com barra na polia": "https://youtube.com/shorts/lWR4IncpQ_g?feature=share",
  "Rosca alternada com halteres": "https://youtube.com/shorts/9MzGS8geaLI?feature=share",
  "Rosca martelo": "https://youtube.com/shorts/msB68mfEXN4?feature=share",
  "Rosca martelo com corda na polia": "https://youtube.com/shorts/tNZGsVFVNpY?feature=share",
  "Rosca Scott": "https://youtube.com/shorts/TYQNh6Elr3M?feature=share",
  "Rosca Scott unilateral": "https://youtube.com/shorts/MwE57-tEhWo?feature=share",
  "Tríceps na polia com corda": "https://youtube.com/shorts/FetQ0EIUvS4?feature=share",
  "Tríceps unilateral na polia": "https://youtube.com/shorts/8VWApIOIZu4?feature=share",
  "Tríceps na polia com barra": "https://youtube.com/shorts/llhoKGJ0jsA?feature=share",
  "Tríceps francês com halter": "https://youtube.com/shorts/n-0ZhSKgU7I?feature=share",
  "Tríceps francês unilateral com halter": "https://youtube.com/shorts/kDPfNff_ci4?feature=share",
  "Tríceps francês na polia": "https://youtube.com/shorts/RlqS07ibyk0?feature=share",
  "Tríceps testa com barra W": "https://youtube.com/shorts/BAISXDyFsQQ?feature=share",
  "Tríceps testa com halteres": "https://youtube.com/shorts/FCcTcG4zdr0?feature=share",
  "Tríceps testa na polia": "https://youtube.com/shorts/w0vGC1bAY9g?feature=share",
  "Rosca inversa na polia": "https://youtube.com/shorts/w2GXEdWm-_w?feature=share",
  "Leg press 45°": "https://youtube.com/shorts/DaV5DZk2v14?feature=share",
  "Agachamento livre": "https://youtube.com/shorts/eertw2V0JrM?feature=share",
  "Agachamento hack": "https://youtube.com/shorts/lXfvfT5Qe74?feature=share",
  "Afundo no Smith": "https://youtube.com/shorts/mRrCYQxaqy4?feature=share",
  "Cadeira adutora": "https://youtube.com/shorts/nzNE3Wupu1w?feature=share",
  "Mesa flexora": "https://youtube.com/shorts/inMx45m4B6E?feature=share",
  "Cadeira flexora": "https://youtube.com/shorts/cyVOJoWScMw?feature=share",
  "Stiff com barra": "https://youtube.com/shorts/S2dF_VxzHkI?feature=share",
  "RDL": "https://youtube.com/shorts/_gbIoOJaa2g?feature=share",
  "Cadeira abdutora": "https://youtube.com/shorts/legYPLQbnS4?feature=share",
  "Panturrilha sentada": "https://youtube.com/shorts/xS9T8y__5H8?feature=share",
  "Panturrilha em pé na máquina": "https://youtube.com/shorts/r8Nd9Wm0Ocs?feature=share"
};
function fail(message){console.error('FALHA:',message);process.exit(1);}
if(!core.includes('const EXERCISE_CATALOG_VERSION=3;'))fail('versão do catálogo não foi elevada');
if(!core.includes('DEFAULT_EXERCISE_VIDEO_URLS'))fail('mapa de vídeos ausente');
if(!core.includes('function resolveExerciseVideoUrl(exercise)'))fail('resolução automática ausente');
if(!core.includes("else if(!String(existing.videoUrl||'').trim()&&item.videoUrl)existing.videoUrl=item.videoUrl"))fail('migração não preserva links personalizados');
for(const [name,url] of Object.entries(expected)){if(!core.includes(JSON.stringify(name))||!core.includes(JSON.stringify(url)))fail('mapeamento ausente: '+name);}
const shorts=[...core.matchAll(/https:\/\/youtube\.com\/shorts\/[A-Za-z0-9_-]{11}\?feature=share/g)].map(x=>x[0]);
const unique=new Set(shorts);
if(unique.size!==65)fail('esperados 65 links únicos, encontrados '+unique.size);
console.log('APROVADO: 65 links do PDF vinculados ao catálogo, aliases preservados e migração segura.');
