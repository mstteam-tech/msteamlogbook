#!/usr/bin/env python3
"""Validação estática — Team Bulls v10.7.1."""
from __future__ import annotations
from html.parser import HTMLParser
from pathlib import Path
import hashlib,json,re,subprocess

ROOT=Path(__file__).resolve().parents[1]
REQUIRED=[
 'index.html','config_v10_7.js','app_v10_7_1_core.js','styles_v10_7_1.css','interaction_v10_7_1.js',
 'manifest_23.json','sw_36.js','modules/v107-core.js','modules/v107-invites.js','modules/v107-operations.js',
 'recuperar.html','recovery_v10.js','recovery_v10.css','boot_v10.js','viewport_v10_2_1.js',
 'firebase/firestore_22_compacto.rules','firebase/storage_3.rules'
]
class IndexParser(HTMLParser):
 def __init__(self):super().__init__();self.ids=[];self.assets=[]
 def handle_starttag(self,tag,attrs):
  data=dict(attrs)
  if data.get('id'):self.ids.append(data['id'])
  attr='src' if tag in {'script','img','audio','source'} else 'href' if tag=='link' else None
  if attr and data.get(attr):
   value=data[attr]
   if not value.startswith(('http:','https:','data:','blob:','#')):self.assets.append(value.split('?',1)[0].lstrip('./'))
def fail(message):print('FALHA:',message);raise SystemExit(1)
def main():
 missing=[name for name in REQUIRED if not (ROOT/name).is_file()]
 if missing:fail('arquivos ausentes: '+', '.join(missing))
 html=(ROOT/'index.html').read_text(encoding='utf-8');parser=IndexParser();parser.feed(html)
 dup=sorted({x for x in parser.ids if parser.ids.count(x)>1})
 if dup:fail('IDs duplicados: '+', '.join(dup))
 absent=sorted({x for x in parser.assets if not (ROOT/x).exists()})
 if absent:fail('recursos inexistentes: '+', '.join(absent))
 for stale in ['manifest_22.json','styles_v10_7.css"','app_v10_7_core.js"','sw_35.js']:
  if stale in html:fail('referência antiga no index: '+stale)
 if 'id="portrait-lock-overlay"' not in html:fail('barreira de orientação ausente')
 manifest=json.loads((ROOT/'manifest_23.json').read_text(encoding='utf-8'))
 if manifest.get('start_url')!='./index.html?v=10.7.1':fail('start_url incorreto')
 if manifest.get('orientation')!='portrait-primary':fail('orientação não está em portrait-primary')
 js=['config_v10_7.js','app_v10_7_1_core.js','interaction_v10_7_1.js','sw_36.js','recovery_v10.js','boot_v10.js','viewport_v10_2_1.js','modules/v107-core.js','modules/v107-invites.js','modules/v107-operations.js']
 for name in js:
  run=subprocess.run(['node','--check',str(ROOT/name)],capture_output=True,text=True)
  if run.returncode:fail(f'JavaScript inválido em {name}: {run.stderr.strip()}')
 css=(ROOT/'styles_v10_7_1.css').read_text(encoding='utf-8')
 for token in ['#app{','overflow-y:auto!important','touch-action:pan-x pan-y pinch-zoom','#portrait-lock-overlay']:
  if token not in css:fail('correção CSS ausente: '+token)
 interaction=(ROOT/'interaction_v10_7_1.js').read_text(encoding='utf-8')
 for token in ["orientation.lock('portrait-primary')","addEventListener('wheel'","scroller.scrollTop+=delta"]:
  if token not in interaction:fail('correção de interação ausente: '+token)
 sw=(ROOT/'sw_36.js').read_text(encoding='utf-8')
 essential=re.search(r"const ESSENTIAL_ASSETS=\[(.*?)\];",sw,re.S)
 if not essential:fail('ESSENTIAL_ASSETS ausente')
 for asset in re.findall(r"'\./([^']+)'",essential.group(1)):
  if not (ROOT/asset).exists():fail('Service Worker referencia arquivo ausente: '+asset)
 rules=(ROOT/'firebase/firestore_22_compacto.rules').read_text(encoding='utf-8')
 if rules.count('{')!=rules.count('}'):fail('regras Firestore desbalanceadas')
 sums=[]
 for path in sorted(ROOT.rglob('*')):
  if path.is_file() and path.name!='SHA256SUMS-v10.7.1.txt' and '.git' not in path.parts:
   sums.append(hashlib.sha256(path.read_bytes()).hexdigest()+'  '+path.relative_to(ROOT).as_posix())
 (ROOT/'SHA256SUMS-v10.7.1.txt').write_text('\n'.join(sums)+'\n',encoding='utf-8')
 print(f'APROVADO: {len(parser.ids)} IDs; {len(set(parser.assets))} recursos; {len(js)} JavaScript; retrato e rolagem validados.')
if __name__=='__main__':main()
