#!/usr/bin/env python3
"""Validação estática e de integridade — Team Bulls v10.9.0."""
from __future__ import annotations
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
import hashlib, json, re, subprocess

ROOT=Path(__file__).resolve().parents[1]
VERSION='10.9.0'
REQUIRED=[
 'index.html','config_v10_7.js','app_v10_9_0_core.js','styles_v10_9_0.css','interaction_v10_9_0.js',
 'manifest_29.json','sw_42.js','modules/v107-core.js','modules/v107-invites.js','modules/v107-operations.js',
 'recuperar.html','recovery_v10.js','recovery_v10.css','boot_v10.js','viewport_v10_9_0.js',
 'firebase/firestore_25_compacto.rules','firebase/storage_5.rules','.github/workflows/team-bulls-validate.yml'
]
JS_FILES=['config_v10_7.js','app_v10_9_0_core.js','interaction_v10_9_0.js','sw_42.js','recovery_v10.js','boot_v10.js','viewport_v10_9_0.js','modules/v107-core.js','modules/v107-invites.js','modules/v107-operations.js']
STALE=['app_v10_8_3_core.js','styles_v10_8_3.css','interaction_v10_8_3.js','manifest_28.json','sw_41.js','viewport_v10_8_3.js','firestore_24_compacto.rules','storage_4.rules']

class IndexParser(HTMLParser):
 def __init__(self): super().__init__(); self.ids=[]; self.assets=[]
 def handle_starttag(self,tag,attrs):
  d=dict(attrs)
  if d.get('id'): self.ids.append(d['id'])
  attr='src' if tag in {'script','img','audio','source'} else 'href' if tag=='link' else None
  if attr and d.get(attr) and not d[attr].startswith(('http:','https:','data:','blob:','#')):
   self.assets.append(d[attr].split('?',1)[0].lstrip('./'))

def fail(msg): print('FALHA:',msg); raise SystemExit(1)
def need(text,tokens,label):
 for token in tokens:
  if token not in text: fail(f'{label} ausente: {token}')

def main():
 missing=[p for p in REQUIRED if not (ROOT/p).is_file()]
 if missing: fail('arquivos ausentes: '+', '.join(missing))
 html=(ROOT/'index.html').read_text(encoding='utf-8'); p=IndexParser(); p.feed(html)
 dups=[x for x,c in Counter(p.ids).items() if c>1]
 if dups: fail('IDs duplicados: '+', '.join(sorted(dups)))
 absent=sorted({a for a in p.assets if not (ROOT/a).is_file()})
 if absent: fail('recursos inexistentes: '+', '.join(absent))
 for stale in STALE:
  if stale in html: fail('referência antiga no index: '+stale)
 need(html,[
  'styles_v10_9_0.css','app_v10_9_0_core.js','interaction_v10_9_0.js','viewport_v10_9_0.js','manifest_29.json',
  'RELATÓRIO SEMANAL','id="weekly-photo-0"','id="weekly-photo-5"','id="report-photo-0"','id="report-photo-5"',
  'id="questionnaire-request-mode"','value="written"','value="photos"','SOMENTE RELATÓRIO ESCRITO','SOMENTE 6 FOTOS',
  'id="weekly-report-photo-instruction"','id="questionnaire-report-photo-instruction"','id="weekly-report-guide-card"','id="questionnaire-report-guide-card"',
  'id="modal-report-guide-manager"','id="input-report-guide-pdf"','accept="application/pdf,.pdf"',
  'id="trainer-protocol-start-date"','id="trainer-protocol-interval-weeks"','value="4"','id="trainer-protocol-review-complete"',
  'id="protocol-review-home-banner"','id="trainer-protocol-alert"','id="modal-protocol-review-info"'
 ],'interface')
 if len(re.findall(r'id="weekly-photo-[0-5]"',html))!=6: fail('relatório semanal não possui 6 fotos')
 if len(re.findall(r'id="report-photo-[0-5]"',html))!=6: fail('relatórios extras não possuem 6 fotos')
 if re.search(r'>[^<]*(CHECK-IN|Check-in|check-in)[^<]*<',html): fail('nome antigo de check-in ainda visível')

 manifest=json.loads((ROOT/'manifest_29.json').read_text(encoding='utf-8'))
 if manifest.get('start_url')!='./index.html?v=10.9.0' or manifest.get('scope')!='./': fail('manifesto com rota incorreta')
 if manifest.get('orientation')!='portrait-primary': fail('orientação não está em portrait-primary')

 for name in JS_FILES:
  proc=subprocess.run(['node','--check',str(ROOT/name)],capture_output=True,text=True)
  if proc.returncode: fail(f'JavaScript inválido em {name}: {proc.stderr.strip()}')

 core=(ROOT/'app_v10_9_0_core.js').read_text(encoding='utf-8')
 need(core,[
  "const APP_VERSION='10.9.0'","navigator.serviceWorker.register('sw_42.js'","const V106_RULES_FILE='firestore_25_compacto.rules'",
  'auth.sendPasswordResetEmail(email)','buildProgressPhotoVariants(file)','Array(6).fill(null)',
  "const V109_RECOMMENDATION_QUESTION='Em uma escala de 0/10, o quanto você recomenda o meu trabalho para alguém? E por quê?';",
  'V109_DEFAULT_QUESTIONNAIRE_SECTIONS','buildWeeklyCheckinQuestions()','Responda todas as perguntas do relatório semanal.',
  "V109_REPORT_MODES=new Set(['full','written','photos'])",'function requestWrittenOnlyReport()','function requestPhotoOnlyReport()',
  "requestMode:mode",'requiredPhotoCount:requiresPhotos?6:0','allQuestionsRequired:requiresAnswers',
  'answers.length!==(report.questions||[]).length','QUESTIONNAIRE_REPORT_FILES.some(file=>!(file instanceof File))',
  "reportSettings').doc(trainerId)",'reportGuides/${trainerId.replace','application/pdf','openReportPhotoGuide()',
  "protocolReviewSchedules').doc(studentUid)",'intervalWeeks:4','_exists:false','_exists:true',
  'v104SyncCycleSchedule=async function(){return null;};','Ajustes semanais não reiniciam a contagem',
  'loadTrainerProtocolReviewAlerts','protocol-due-badge','v109SyncActiveProtocolDates','v109SyncProtocolMetadataToWeeklySchedule'
 ],'núcleo')
 question_block=re.search(r'const V109_DEFAULT_QUESTIONNAIRE_SECTIONS=\[(.*?)\n\];',core,re.S)
 if not question_block: fail('estrutura das perguntas padrão ausente')
 question_entries=[]
 for group in re.findall(r'questions:\[(.*?)\]',question_block.group(1),re.S):
  question_entries.extend(re.findall(r"'(?:\\.|[^'])*'|V109_RECOMMENDATION_QUESTION",group))
 if len(question_entries)!=18 or question_entries[-1]!='V109_RECOMMENDATION_QUESTION': fail('relatórios escritos não possuem exatamente 18 perguntas com recomendação na posição 18')
 if core.count(VERSION)<4: fail('identificação da versão insuficiente no núcleo')
 if (ROOT/'app_v10_9_0_core.js').stat().st_size>700_000: fail('núcleo ultrapassou 700 KB')
 names=re.findall(r'\bfunction\s+([A-Za-z_$][\w$]*)\s*\(',core)
 dupfunc=[n for n,c in Counter(names).items() if c>1]
 if dupfunc: fail('funções nomeadas duplicadas: '+', '.join(sorted(dupfunc)))
 if 'file.size>20*1024*1024' in core or 'ultrapassa 20 MB' in core: fail('limite antigo de foto original ainda presente')

 interaction=(ROOT/'interaction_v10_9_0.js').read_text(encoding='utf-8')
 need(interaction,["orientation.lock('portrait-primary')",'PULL_THRESHOLD=78','location.reload()',
  'navegação móvel integrada ao histórico','history.replaceState','history.pushState','addEventListener(\'popstate\'',
  'sentinel:true','window.showScreen=function','window.openModal=function','window.closeModal=function','TeamBullsNavigation'
 ],'interação e histórico')
 css=(ROOT/'styles_v10_9_0.css').read_text(encoding='utf-8')
 need(css,['overflow-y:auto!important','#pull-refresh-indicator','.virtual-keyboard-open .modal-backdrop.open','.report-guide-card','.protocol-review-card','.trainer-protocol-alert','.protocol-due-badge'],'CSS')
 if css.count('{')!=css.count('}'): fail('CSS desbalanceado')

 module=(ROOT/'modules/v107-core.js').read_text(encoding='utf-8')
 need(module,["TB.version='10.9.0'","document.documentElement.dataset.appVersion='10.9.0'",'TB.flushDrafts=function()'],'módulo de continuidade')
 operations=(ROOT/'modules/v107-operations.js').read_text(encoding='utf-8')
 need(operations,['TEAM BULLS V10.9.0','recuperar.html?v=10.9.0','limit(180)','limit(300)','limit(120)'],'central de operações')
 viewport=(ROOT/'viewport_v10_9_0.js').read_text(encoding='utf-8'); need(viewport,['visualViewport.addEventListener(\'resize\'','virtual-keyboard-open','ensureFocusedFieldVisible()'],'viewport')
 sw=(ROOT/'sw_42.js').read_text(encoding='utf-8'); need(sw,["const CACHE_NAME='team-bulls-v10-9-0-runtime'",'manifest_29.json','app_v10_9_0_core.js','interaction_v10_9_0.js','viewport_v10_9_0.js','REFRESH_APP_SHELL'],'Service Worker')
 essential=re.search(r'const ESSENTIAL_ASSETS=\[(.*?)\];',sw,re.S)
 if not essential: fail('ESSENTIAL_ASSETS ausente')
 for asset in re.findall(r"'\./([^']+)'",essential.group(1)):
  if not (ROOT/asset).is_file(): fail('Service Worker referencia arquivo ausente: '+asset)

 rules=(ROOT/'firebase/firestore_25_compacto.rules').read_text(encoding='utf-8'); storage=(ROOT/'firebase/storage_5.rules').read_text(encoding='utf-8')
 if rules.count('{')!=rules.count('}'): fail('Firestore Rules desbalanceadas')
 if storage.count('{')!=storage.count('}'): fail('Storage Rules desbalanceadas')
 need(rules,['match /reportSettings/{trainerUid}','match /protocolReviewSchedules/{uid}',"requestMode', 'full') in ['full', 'written', 'photos']",'request.resource.data.photoIds.size() == 6','request.resource.data.answers.size() == resource.data.questions.size()',"request.resource.data.get('lastCompletedDate', '') == '' || isoDate(request.resource.data.get('lastCompletedDate', ''))"],'regras Firestore')
 need(storage,['match /reportGuides/{trainerUid}/photo-guide.pdf','activeStudentOf(trainerUid)',"request.resource.contentType == 'application/pdf'"],'regras Storage')
 workflow=(ROOT/'.github/workflows/team-bulls-validate.yml').read_text(encoding='utf-8')
 if 'python testes/validar_v10_9_0.py' not in workflow: fail('workflow aponta para validador incorreto')

 sums=[]
 for path in sorted(ROOT.rglob('*')):
  if path.is_file() and path.name!='SHA256SUMS-v10.9.0.txt' and '.git' not in path.parts and '__pycache__' not in path.parts:
   sums.append(hashlib.sha256(path.read_bytes()).hexdigest()+'  '+path.relative_to(ROOT).as_posix())
 (ROOT/'SHA256SUMS-v10.9.0.txt').write_text('\n'.join(sums)+'\n',encoding='utf-8')
 result={'version':VERSION,'status':'approved','html_ids':len(p.ids),'assets':len(set(p.assets)),'javascript_files':len(JS_FILES),'weekly_photos':6,'extra_report_photos':6,'written_questions':18,'report_modes':['full','written','photos'],'protocol_review_default_weeks':4,'firestore_rules':'firestore_25_compacto.rules','storage_rules':'storage_5.rules','service_worker':'sw_42.js','manifest':'manifest_29.json'}
 (ROOT/'testes/RESULTADO-VALIDACAO-v10.9.0.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print(f"APROVADO: {len(p.ids)} IDs únicos; {len(set(p.assets))} recursos; {len(JS_FILES)} JavaScript; relatórios, guia PDF, ciclos e navegação móvel validados.")

if __name__=='__main__': main()
