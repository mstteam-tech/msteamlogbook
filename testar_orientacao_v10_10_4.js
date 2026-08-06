from pathlib import Path
from html.parser import HTMLParser
from collections import Counter
import hashlib
import json
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]
VERSION = '10.10.4'
REQUIRED = [
    'index.html', 'manifest_34.json', 'sw_47.js', 'app_v10_10_4_core.js',
    'styles_v10_10_4.css', 'interaction_v10_10_4.js', 'viewport_v10_10_4.js',
    'boot_v10.js', 'config_v10_7.js', 'recovery_v10.js', 'recuperar.html',
    'firebase/firestore_26_compacto.rules', 'firebase/storage_5.rules',
    'modules/v107-core.js', 'modules/v107-invites.js', 'modules/v107-operations.js',
    'testes/testar_orientacao_v10_10_4.js', 'testes/testar_guia_global_v10_10_4.js',
    'testes/testar_destino_exercicio_v10_10_4.js',
    'testes/testar_exclusao_registro_v10_10_4.js'
]
JS_FILES = [
    'boot_v10.js', 'config_v10_7.js', 'recovery_v10.js', 'app_v10_10_4_core.js',
    'interaction_v10_10_4.js', 'viewport_v10_10_4.js', 'modules/v107-core.js',
    'modules/v107-invites.js', 'modules/v107-operations.js', 'sw_47.js'
]

class Parser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = []
        self.assets = []

    def handle_starttag(self, tag, attrs):
        data = dict(attrs)
        if data.get('id'):
            self.ids.append(data['id'])
        attr = 'src' if tag in {'script', 'img', 'audio', 'source'} else 'href' if tag == 'link' else None
        if attr and data.get(attr) and not data[attr].startswith(('http:', 'https:', 'data:', 'blob:', '#')):
            self.assets.append(data[attr].split('?', 1)[0].lstrip('./'))

def fail(message):
    print('FALHA:', message)
    raise SystemExit(1)

def need(text, tokens, label):
    for token in tokens:
        if token not in text:
            fail(f'{label} ausente: {token}')

def run_node(path):
    return subprocess.run(['node', str(path)], capture_output=True, text=True)

def main():
    missing = [item for item in REQUIRED if not (ROOT / item).is_file()]
    if missing:
        fail('arquivos ausentes: ' + ', '.join(missing))

    html = (ROOT / 'index.html').read_text(encoding='utf-8')
    parser = Parser()
    parser.feed(html)
    duplicates = [item for item, count in Counter(parser.ids).items() if count > 1]
    if duplicates:
        fail('IDs duplicados: ' + ', '.join(duplicates))
    absent_assets = sorted({item for item in parser.assets if not (ROOT / item).is_file()})
    if absent_assets:
        fail('recursos inexistentes: ' + ', '.join(absent_assets))

    need(html, [
        'app_v10_10_4_core.js', 'styles_v10_10_4.css', 'interaction_v10_10_4.js',
        'viewport_v10_10_4.js', 'manifest_34.json', 'id="student-global-report-guide-panel"',
        'id="student-global-report-guide-card"', 'id="student-global-report-guide-instruction"',
        'id="btn-save-report-guide"', 'id="report-guide-upload-progress"',
        'Guia geral de fotos — todos os alunos', 'Envie o PDF uma única vez',
        'id="diet-energy-summary"', 'id="modal-supplement-catalog"',
        'MINHA LISTA PRIVADA DE SUPLEMENTOS', 'maxlength="30000"',
        'id="btn-delete-edited-session"', 'onclick="deleteEditedSession()"'
    ], 'interface')

    manifest = json.loads((ROOT / 'manifest_34.json').read_text(encoding='utf-8'))
    if manifest.get('start_url') != './index.html?v=10.10.4' or manifest.get('scope') != './':
        fail('manifesto incorreto')

    for name in JS_FILES:
        result = subprocess.run(['node', '--check', str(ROOT / name)], capture_output=True, text=True)
        if result.returncode:
            fail(f'JavaScript inválido em {name}: {result.stderr.strip()}')

    core = (ROOT / 'app_v10_10_4_core.js').read_text(encoding='utf-8')
    need(core, [
        "const APP_VERSION='10.10.4'", "navigator.serviceWorker.register('sw_47.js'",
        "const V106_RULES_FILE='firestore_26_compacto.rules'", "const V1010_VERSION='10.10.4'",
        'function uploadReportGuidePdf', 'V10102_GUIDE_UPLOAD_TIMEOUT_MS=180000',
        "task.on('state_changed'", 'task?.cancel?.()', 'v10102SetGuideManagerBusy',
        'student-global-report-guide-card', 'V10102_OPEN_MY_QUESTIONNAIRES',
        'Todos os alunos vinculados podem acessá-lo na aba Relatórios',
        'setTimeout(()=>{if(globalReady?.())finish(true)',
        'normalizeDietEnergySummary', "trainerSupplementCatalog').doc(CURRENT_USER.uid)",
        "orderBy('createdAt','asc').limit(1)", 'message.length>30000',
        'let EXERCISE_MODAL_CONTEXT=null', 'function lockExerciseModalContext',
        'function exerciseModalWorkout', 'function validateExerciseModalDay',
        "syncExerciseDestinationBeforeClose('student',localWorkout,dayName)",
        'async function performDeleteSession(sid)', 'function deleteEditedSession()',
        'if(!sets.length){deleteEditedSession();return;}',
        'removeSessionFromHistory(sessionId)', 'removeSessionFromArchive(CURRENT_USER.uid,sessionId)'
    ], 'núcleo')
    names = re.findall(r'\bfunction\s+([A-Za-z_$][\w$]*)\s*\(', core)
    duplicate_functions = [name for name, count in Counter(names).items() if count > 1]
    if duplicate_functions:
        fail('funções nomeadas duplicadas: ' + ', '.join(sorted(duplicate_functions)))

    interaction = (ROOT / 'interaction_v10_10_4.js').read_text(encoding='utf-8')
    need(interaction, [
        'function isPhysicalLandscape()', "type.startsWith('portrait')",
        'screenWidth>0&&screenHeight>0', 'keyboardOpen)return false',
        "window.visualViewport?.addEventListener('resize',scheduleOrientationSync",
        'function contextSignature(snapshot)', 'function syncCurrentSnapshot',
        'syncCurrent:()=>syncCurrentSnapshot(capture())'
    ], 'orientação física')

    orientation_test = run_node(ROOT / 'testes/testar_orientacao_v10_10_4.js')
    if orientation_test.returncode:
        fail('regressão de orientação: ' + orientation_test.stderr.strip())
    guide_test = run_node(ROOT / 'testes/testar_guia_global_v10_10_4.js')
    if guide_test.returncode:
        fail('regressão do guia geral: ' + guide_test.stderr.strip())
    exercise_destination_test = run_node(ROOT / 'testes/testar_destino_exercicio_v10_10_4.js')
    if exercise_destination_test.returncode:
        fail('regressão do destino do exercício: ' + exercise_destination_test.stderr.strip())
    session_delete_test = run_node(ROOT / 'testes/testar_exclusao_registro_v10_10_4.js')
    if session_delete_test.returncode:
        fail('regressão da exclusão de registros: ' + session_delete_test.stderr.strip())

    css = (ROOT / 'styles_v10_10_4.css').read_text(encoding='utf-8')
    need(css, [
        '.global-report-guide-panel', '.report-guide-upload-progress',
        '.report-guide-manager-status[data-state="error"]', '.diet-energy-grid',
        '.supplement-catalog-list', '.feedback-long-text',
        'html.mobile-landscape-blocked #portrait-lock-overlay{display:flex;}'
    ], 'CSS')
    if '@media(max-width:899px) and (orientation:landscape)' in css:
        fail('overlay ainda depende do viewport e pode confundir teclado com rotação')
    if css.count('{') != css.count('}'):
        fail('CSS desbalanceado')

    firestore = (ROOT / 'firebase/firestore_26_compacto.rules').read_text(encoding='utf-8')
    need(firestore, [
        'match /reportSettings/{trainerUid}', 'userData(request.auth.uid).trainerId == trainerUid',
        'match /trainerSupplementCatalog/{trainerUid}',
        'requiredText(request.resource.data.message, 30000)'
    ], 'regras Firestore')
    storage = (ROOT / 'firebase/storage_5.rules').read_text(encoding='utf-8')
    need(storage, [
        'match /reportGuides/{trainerUid}/photo-guide.pdf',
        'activeStudentOf(trainerUid)', 'request.resource.size <= 25 * 1024 * 1024',
        "request.resource.contentType == 'application/pdf'"
    ], 'regras Storage')
    if firestore.count('{') != firestore.count('}') or storage.count('{') != storage.count('}'):
        fail('regras Firebase desbalanceadas')

    sw = (ROOT / 'sw_47.js').read_text(encoding='utf-8')
    need(sw, [
        "const CACHE_NAME='team-bulls-v10-10-4-runtime'", 'manifest_34.json',
        'app_v10_10_4_core.js', 'styles_v10_10_4.css'
    ], 'Service Worker')
    workflow = (ROOT / '.github/workflows/team-bulls-validate.yml').read_text(encoding='utf-8')
    if 'python testes/validar_v10_10_4.py' not in workflow:
        fail('workflow incorreto')

    sums = []
    for path in sorted(ROOT.rglob('*')):
        if path.is_file() and path.name != 'SHA256SUMS-v10.10.4.txt' and '__pycache__' not in path.parts:
            sums.append(hashlib.sha256(path.read_bytes()).hexdigest() + '  ' + path.relative_to(ROOT).as_posix())
    (ROOT / 'SHA256SUMS-v10.10.4.txt').write_text('\n'.join(sums) + '\n', encoding='utf-8')
    result = {
        'version': VERSION, 'status': 'approved', 'html_ids': len(parser.ids),
        'assets': len(set(parser.assets)), 'javascript_files': len(JS_FILES),
        'global_photo_guide': True, 'guide_available_without_pending_report': True,
        'guide_upload_timeout_seconds': 180, 'guide_upload_progress': True,
        'optional_sdk_loader_timeout_seconds': 10, 'firestore_rules': 'firestore_26_compacto.rules',
        'storage_rules': 'storage_5.rules', 'service_worker': 'sw_47.js',
        'manifest': 'manifest_34.json', 'keyboard_orientation_false_positive_fixed': True,
        'exercise_day_context_locked': True, 'same_screen_navigation_context_fixed': True,
        'session_delete_confirm_fixed': True, 'session_edit_full_delete': True,
        'performed_backoff_rows_removable': True
    }
    (ROOT / 'testes/RESULTADO-VALIDACAO-v10.10.4.json').write_text(
        json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8'
    )
    print(
        f'APROVADO: {len(parser.ids)} IDs únicos; {len(set(parser.assets))} recursos; '
        'guia geral, destino dos exercícios, exclusão de registros, histórico móvel, cache e regras validados.'
    )

if __name__ == '__main__':
    main()
