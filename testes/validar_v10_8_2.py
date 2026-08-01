#!/usr/bin/env python3
"""Validação estática e de integridade — Team Bulls v10.8.2."""
from __future__ import annotations
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
import hashlib
import json
import re
import subprocess

ROOT=Path(__file__).resolve().parents[1]
REQUIRED=[
 'index.html','config_v10_7.js','app_v10_8_2_core.js','styles_v10_8_2.css','interaction_v10_8_2.js',
 'manifest_27.json','sw_40.js','modules/v107-core.js','modules/v107-invites.js','modules/v107-operations.js',
 'recuperar.html','recovery_v10.js','recovery_v10.css','boot_v10.js','viewport_v10_8_2.js',
 'firebase/firestore_23_compacto.rules','firebase/storage_4.rules','.github/workflows/team-bulls-validate.yml'
]
JS_FILES=[
 'config_v10_7.js','app_v10_8_2_core.js','interaction_v10_8_2.js','sw_40.js','recovery_v10.js',
 'boot_v10.js','viewport_v10_8_2.js','modules/v107-core.js','modules/v107-invites.js','modules/v107-operations.js'
]
STALE_REFS=[
 'manifest_25.json','manifest_26.json','styles_v10_8.css','styles_v10_8_1.css',
 'app_v10_8_core.js','app_v10_8_1_core.js','interaction_v10_8.js','interaction_v10_8_1.js',
 'sw_38.js','sw_39.js','viewport_v10_2_1.js'
]

class IndexParser(HTMLParser):
 def __init__(self):
  super().__init__();self.ids=[];self.assets=[]
 def handle_starttag(self,tag,attrs):
  data=dict(attrs)
  if data.get('id'):self.ids.append(data['id'])
  attr='src' if tag in {'script','img','audio','source'} else 'href' if tag=='link' else None
  if attr and data.get(attr):
   value=data[attr]
   if not value.startswith(('http:','https:','data:','blob:','#')):
    self.assets.append(value.split('?',1)[0].lstrip('./'))

def fail(message:str)->None:
 print('FALHA:',message);raise SystemExit(1)

def require_tokens(text:str,tokens:list[str],label:str)->None:
 for token in tokens:
  if token not in text:fail(f'{label} ausente: {token}')

def main()->None:
 missing=[name for name in REQUIRED if not (ROOT/name).is_file()]
 if missing:fail('arquivos ausentes: '+', '.join(missing))

 html=(ROOT/'index.html').read_text(encoding='utf-8')
 parser=IndexParser();parser.feed(html)
 duplicates=sorted(name for name,count in Counter(parser.ids).items() if count>1)
 if duplicates:fail('IDs duplicados: '+', '.join(duplicates))
 absent=sorted({asset for asset in parser.assets if not (ROOT/asset).exists()})
 if absent:fail('recursos inexistentes: '+', '.join(absent))
 for stale in STALE_REFS:
  if stale in html:fail('referência antiga no index: '+stale)
 require_tokens(html,[
  'id="portrait-lock-overlay"','id="pull-refresh-indicator"','id="pull-refresh-label"',
  'id="btn-forgot-password"','id="panel-reset"','id="reset-email"','id="btn-reset-password"',
  'app_v10_8_2_core.js','styles_v10_8_2.css','interaction_v10_8_2.js','manifest_27.json','viewport_v10_8_2.js',
  'interactive-widget=resizes-content','id="panel-login" onsubmit="event.preventDefault();doLogin()"',
  'id="login-pass" name="tb_access_secret"','autocomplete="one-time-code"','data-sensitive="true"'
 ],'interface/referência')

 manifest=json.loads((ROOT/'manifest_27.json').read_text(encoding='utf-8'))
 if manifest.get('start_url')!='./index.html?v=10.8.2':fail('start_url incorreto')
 if manifest.get('scope')!='./':fail('scope do PWA incorreto')
 if manifest.get('orientation')!='portrait-primary':fail('orientação não está em portrait-primary')

 for name in JS_FILES:
  run=subprocess.run(['node','--check',str(ROOT/name)],capture_output=True,text=True)
  if run.returncode:fail(f'JavaScript inválido em {name}: {run.stderr.strip()}')

 core=(ROOT/'app_v10_8_2_core.js').read_text(encoding='utf-8')
 require_tokens(core,[
  "const APP_VERSION='10.8.2'",'async function sendPasswordReset()','auth.sendPasswordResetEmail(email)',
  "auth.languageCode='pt-BR'",'Se existir uma conta vinculada a este e-mail',
  "navigator.serviceWorker.register('sw_40.js'","const V106_RULES_FILE='firestore_23_compacto.rules'",
  'rememberMediaObjectUrl(key,url)','buildProgressPhotoVariants(file)','progressPhotoThumbs','Array(6).fill(null)','Frente contraída','Costas contraída',
  "const allowFull=options.full===true&&CURRENT_USER?.role==='trainer'","resolvePhotoSource(record,{full:CURRENT_USER?.role==='trainer'})","const count=Array.isArray(item.photoIds)?item.photoIds.length:6",
  'function shouldAutoFocusEditor()','function clearTransientAuthSecrets()','function setAuthSecretsEnabled(enabled=true)',
  "else if(result!==false){clearTransientAuthSecrets();setAuthSecretsEnabled(false);}"
 ],'núcleo')
 if 'AlunoMSTEAM' in core or 'studentCode:' in core:fail('código fixo de cadastro ainda presente no núcleo')
 names=re.findall(r'\bfunction\s+([A-Za-z_$][\w$]*)\s*\(',core)
 duplicated_functions=sorted(name for name,count in Counter(names).items() if count>1)
 if duplicated_functions:fail('funções nomeadas duplicadas: '+', '.join(duplicated_functions))
 if (ROOT/'app_v10_8_2_core.js').stat().st_size>700_000:fail('núcleo ultrapassou o orçamento de 700 KB')

 interaction=(ROOT/'interaction_v10_8_2.js').read_text(encoding='utf-8')
 require_tokens(interaction,[
  "orientation.lock('portrait-primary')","addEventListener('wheel'",'PULL_THRESHOLD=78',
  "addEventListener('touchstart'","addEventListener('touchmove'",'Solte para atualizar',
  'flushDrafts','flushPendingMutationSync','registration.update()','location.reload()'
 ],'interação')

 css=(ROOT/'styles_v10_8_2.css').read_text(encoding='utf-8')
 require_tokens(css,[
  '#app{','overflow-y:auto!important','touch-action:pan-x pan-y pinch-zoom','#portrait-lock-overlay',
  '#pull-refresh-indicator','.pull-refresh-spinner','overscroll-behavior-y:none',
  'top:var(--viewport-offset-top,0px)','height:var(--app-height,100dvh)',
  '.virtual-keyboard-open .modal-backdrop.open','.virtual-keyboard-open #modal-day .modal-sheet'
 ],'CSS')
 if css.count('{')!=css.count('}'):fail('CSS com chaves desbalanceadas')

 core_module=(ROOT/'modules/v107-core.js').read_text(encoding='utf-8')
 require_tokens(core_module,[
  "TB.version='10.8.2'",'planDraftDirty=true','TB.flushDrafts=function()',
  'pendingMutationSync=new Map()','queueMutationSync(meta','TB.saveCloudVersion=',
  "setTimeout(()=>flushMutationSync(key),900)","document.documentElement.dataset.appVersion='10.8.2'",
  'MAX_FORM_DRAFT_AGE=1000*60*60*2',"DRAFT_DISABLED_MODAL_IDS=new Set(['modal-day'",
  "saveDayFolder:{label:'Salvar dia de treino',entity:'treino',modal:'modal-day'",
  "field.dataset.sensitive==='true'",'const baseOpenModal=openModal,baseCloseModal=closeModal'
 ],'módulo de continuidade')
 if 'setInterval(savePlanDraft' in core_module:fail('snapshot periódico antigo ainda presente')
 if 'modal-day-folder' in core_module:fail('rascunho ainda aponta para o modal antigo de dia')

 operations=(ROOT/'modules/v107-operations.js').read_text(encoding='utf-8')
 require_tokens(operations,['TEAM BULLS V10.8.2','renderSequence=0','renderIsCurrent(token','limit(180)','limit(300)','limit(120)'],'central de operações')
 invites=(ROOT/'modules/v107-invites.js').read_text(encoding='utf-8')
 require_tokens(invites,['crypto.getRandomValues','SHA-256','runTransaction','limit(120)','TeamBullsAuthFields?.clearSecrets?.()'],'convites')

 viewport=(ROOT/'viewport_v10_8_2.js').read_text(encoding='utf-8')
 require_tokens(viewport,['stableHeight=0','ensureFocusedFieldVisible()','virtual-keyboard-open','focusin',"visualViewport.addEventListener('resize'"],'viewport/teclado')

 sw=(ROOT/'sw_40.js').read_text(encoding='utf-8')
 require_tokens(sw,[
  "const CACHE_NAME='team-bulls-v10-8-2-runtime'",'REFRESH_APP_SHELL','refreshAppShell()',
  'IMMUTABLE_ASSETS',"request.cache==='reload'",'manifest_27.json','app_v10_8_2_core.js','interaction_v10_8_2.js','viewport_v10_8_2.js'
 ],'Service Worker')
 essential=re.search(r"const ESSENTIAL_ASSETS=\[(.*?)\];",sw,re.S)
 if not essential:fail('ESSENTIAL_ASSETS ausente')
 for asset in re.findall(r"'\./([^']+)'",essential.group(1)):
  if not (ROOT/asset).exists():fail('Service Worker referencia arquivo ausente: '+asset)

 rules=(ROOT/'firebase/firestore_23_compacto.rules').read_text(encoding='utf-8')
 storage_rules=(ROOT/'firebase/storage_4.rules').read_text(encoding='utf-8')
 workflow=(ROOT/'.github/workflows/team-bulls-validate.yml').read_text(encoding='utf-8')
 if 'python testes/validar_v10_8_2.py' not in workflow:fail('workflow aponta para validador antigo')
 if rules.count('{')!=rules.count('}'):fail('regras Firestore desbalanceadas')
 if storage_rules.count('{')!=storage_rules.count('}'):fail('regras Storage desbalanceadas')
 for collection in ['studentInvites','planVersions','planTemplates','auditLogs','notifications']:
  if f'match /{collection}/' not in rules:fail('regra ausente para '+collection)
 if 'photoIds.size() == 6' not in rules:fail('regra de seis fotos ausente')
 if 'progressPhotoThumbs' not in rules or 'progressPhotoThumbs' not in storage_rules:fail('miniaturas de progresso sem regras')
 if 'file.size>20*1024*1024' in core or 'ultrapassa 20 MB' in core:fail('limite antigo de arquivo original ainda presente')

 sums=[]
 for path in sorted(ROOT.rglob('*')):
  if path.is_file() and path.name!='SHA256SUMS-v10.8.2.txt' and '.git' not in path.parts:
   sums.append(hashlib.sha256(path.read_bytes()).hexdigest()+'  '+path.relative_to(ROOT).as_posix())
 (ROOT/'SHA256SUMS-v10.8.2.txt').write_text('\n'.join(sums)+'\n',encoding='utf-8')
 print(f'APROVADO: {len(parser.ids)} IDs únicos; {len(set(parser.assets))} recursos; {len(JS_FILES)} JavaScript; teclado, rascunhos, senha, pull-to-refresh, cache e regras validados.')

if __name__=='__main__':main()
