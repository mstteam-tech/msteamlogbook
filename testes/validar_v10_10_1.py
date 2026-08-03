from pathlib import Path
from html.parser import HTMLParser
from collections import Counter
import hashlib,json,re,subprocess
ROOT=Path(__file__).resolve().parents[1]
VERSION='10.10.1'
REQUIRED=['index.html','manifest_31.json','sw_44.js','app_v10_10_1_core.js','styles_v10_10_1.css','interaction_v10_10_1.js','viewport_v10_10_1.js','boot_v10.js','config_v10_7.js','recovery_v10.js','recuperar.html','firebase/firestore_26_compacto.rules','firebase/storage_5.rules','modules/v107-core.js','modules/v107-invites.js','modules/v107-operations.js','testes/testar_orientacao_v10_10_1.js']
JS_FILES=['boot_v10.js','config_v10_7.js','recovery_v10.js','app_v10_10_1_core.js','interaction_v10_10_1.js','viewport_v10_10_1.js','modules/v107-core.js','modules/v107-invites.js','modules/v107-operations.js']
class Parser(HTMLParser):
 def __init__(self): super().__init__();self.ids=[];self.assets=[]
 def handle_starttag(self,tag,attrs):
  d=dict(attrs)
  if d.get('id'):self.ids.append(d['id'])
  attr='src' if tag in {'script','img','audio','source'} else 'href' if tag=='link' else None
  if attr and d.get(attr) and not d[attr].startswith(('http:','https:','data:','blob:','#')):self.assets.append(d[attr].split('?',1)[0].lstrip('./'))
def fail(msg):print('FALHA:',msg);raise SystemExit(1)
def need(text,tokens,label):
 for token in tokens:
  if token not in text:fail(f'{label} ausente: {token}')
def main():
 missing=[x for x in REQUIRED if not (ROOT/x).is_file()]
 if missing:fail('arquivos ausentes: '+', '.join(missing))
 html=(ROOT/'index.html').read_text(encoding='utf-8');p=Parser();p.feed(html)
 dup=[x for x,c in Counter(p.ids).items() if c>1]
 if dup:fail('IDs duplicados: '+', '.join(dup))
 absent=sorted({x for x in p.assets if not (ROOT/x).is_file()})
 if absent:fail('recursos inexistentes: '+', '.join(absent))
 need(html,['app_v10_10_1_core.js','styles_v10_10_1.css','interaction_v10_10_1.js','viewport_v10_10_1.js','manifest_31.json','id="diet-energy-summary"','id="ts-diet-energy-summary"','id="input-diet-total-expenditure"','id="input-diet-training-energy"','id="input-diet-rest-energy"','id="modal-supplement-catalog"','id="input-diet-support-catalog"','MINHA LISTA PRIVADA DE SUPLEMENTOS','id="input-feedback-type"','value="protocol_update"','id="input-feedback-title"','maxlength="30000"','FEEDBACK EXTENSO DA ATUALIZAÇÃO'],'interface')
 manifest=json.loads((ROOT/'manifest_31.json').read_text(encoding='utf-8'))
 if manifest.get('start_url')!='./index.html?v=10.10.1' or manifest.get('scope')!='./':fail('manifesto incorreto')
 for name in JS_FILES:
  result=subprocess.run(['node','--check',str(ROOT/name)],capture_output=True,text=True)
  if result.returncode:fail(f'JavaScript inválido em {name}: {result.stderr.strip()}')
 core=(ROOT/'app_v10_10_1_core.js').read_text(encoding='utf-8')
 need(core,["const APP_VERSION='10.10.1'","navigator.serviceWorker.register('sw_44.js'","const V106_RULES_FILE='firestore_26_compacto.rules'","const V1010_VERSION='10.10.1'",'normalizeDietEnergySummary','renderDietEnergySummary','totalExpenditure','trainingDayEnergy','restDayEnergy',"trainerSupplementCatalog').doc(CURRENT_USER.uid)",'A lista privada pertence à conta do treinador','orderBy(\'createdAt\',\'asc\').limit(1)','await checkFeedback();','message.length>30000',"feedbackType:type",'protocolStartDate','protocolCycle'],'núcleo')
 names=re.findall(r'\bfunction\s+([A-Za-z_$][\w$]*)\s*\(',core);dupfunc=[n for n,c in Counter(names).items() if c>1]
 if dupfunc:fail('funções nomeadas duplicadas: '+', '.join(sorted(dupfunc)))
 interaction=(ROOT/'interaction_v10_10_1.js').read_text(encoding='utf-8')
 need(interaction,["function isPhysicalLandscape()","type.startsWith('portrait')","screenWidth>0&&screenHeight>0","keyboardOpen)return false","window.visualViewport?.addEventListener('resize',scheduleOrientationSync"],'orientação física')
 orientation_test=subprocess.run(['node',str(ROOT/'testes/testar_orientacao_v10_10_1.js')],capture_output=True,text=True)
 if orientation_test.returncode:fail('regressão de orientação: '+orientation_test.stderr.strip())
 css=(ROOT/'styles_v10_10_1.css').read_text(encoding='utf-8');need(css,['.diet-energy-grid','.supplement-catalog-list','.feedback-long-text','#feedback-banner .feedback-banner-text','html.mobile-landscape-blocked #portrait-lock-overlay{display:flex;}'],'CSS')
 if '@media(max-width:899px) and (orientation:landscape)' in css:fail('overlay ainda depende do viewport e pode confundir teclado com rotação')
 if css.count('{')!=css.count('}'):fail('CSS desbalanceado')
 rules=(ROOT/'firebase/firestore_26_compacto.rules').read_text(encoding='utf-8');need(rules,['match /trainerSupplementCatalog/{trainerUid}','request.auth.uid == trainerUid','requiredText(request.resource.data.message, 30000)',"feedbackType', 'general') in ['general', 'weekly_report', 'protocol_update']"],'regras Firestore')
 if rules.count('{')!=rules.count('}'):fail('Firestore Rules desbalanceadas')
 sw=(ROOT/'sw_44.js').read_text(encoding='utf-8');need(sw,["const CACHE_NAME='team-bulls-v10-10-1-runtime'",'manifest_31.json','app_v10_10_1_core.js','styles_v10_10_1.css'],'Service Worker')
 workflow=(ROOT/'.github/workflows/team-bulls-validate.yml').read_text(encoding='utf-8')
 if 'python testes/validar_v10_10_1.py' not in workflow:fail('workflow incorreto')
 sums=[]
 for path in sorted(ROOT.rglob('*')):
  if path.is_file() and path.name!='SHA256SUMS-v10.10.1.txt' and '__pycache__' not in path.parts:sums.append(hashlib.sha256(path.read_bytes()).hexdigest()+'  '+path.relative_to(ROOT).as_posix())
 (ROOT/'SHA256SUMS-v10.10.1.txt').write_text('\n'.join(sums)+'\n',encoding='utf-8')
 result={'version':VERSION,'status':'approved','html_ids':len(p.ids),'assets':len(set(p.assets)),'javascript_files':len(JS_FILES),'diet_energy_fields':3,'private_supplement_catalog':True,'sequential_feedback':True,'feedback_max_characters':30000,'firestore_rules':'firestore_26_compacto.rules','storage_rules':'storage_5.rules','service_worker':'sw_44.js','manifest':'manifest_31.json','keyboard_orientation_false_positive_fixed':True}
 (ROOT/'testes/RESULTADO-VALIDACAO-v10.10.1.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print(f"APROVADO: {len(p.ids)} IDs únicos; {len(set(p.assets))} recursos; tabela calórica, suplementos privados, feedbacks e orientação com teclado validados.")
if __name__=='__main__':main()
