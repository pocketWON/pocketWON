"""Build the PW-WOORI-03 review bundle from completed local test evidence."""
from pathlib import Path
from datetime import datetime, timezone
import difflib
import hashlib
import html
import json

root = Path(__file__).resolve().parent.parent
out = root / 'evidence/PW-WOORI-03'
baseline = json.loads((root / 'preservation/PW-WOORI-03/baseline.json').read_text())
reports = {name: json.loads((out / suffix / 'verification.json').read_text()) for name, suffix in [('record', ''), ('home', 'home'), ('shell', 'shell')]}
assert all(report['status'] == 'PASS' for report in reports.values()), 'Complete all three checks before submitting.'
assert all(not report.get('consoleErrors') and not report.get('resourceErrors') and not report.get('networkErrors') for report in reports.values())
sha = lambda data: hashlib.sha256(data).hexdigest()
for name, digest in baseline['files'].items():
    if name not in baseline['snapshots']:
        assert sha((root / name).read_bytes()) == digest, name
for kind in ['in', 'out']:
    pair = json.loads((out / f'storage-{kind}.json').read_text())
    before = json.dumps(pair['before'], ensure_ascii=False, indent=2) + '\n'
    after = json.dumps(pair['after'], ensure_ascii=False, indent=2) + '\n'
    (out / f'storage-{kind}.diff').write_text(''.join(difflib.unified_diff(before.splitlines(True), after.splitlines(True), fromfile='before/pocketwon_demo_v1', tofile='after/pocketwon_demo_v1')))

counts = {name: len(report['checks']) for name, report in reports.items()}
record = reports['record']
chrome = record['browsers']['chromium']['version']
webkit = record['browsers']['webkit']['version']
minimum = min(check['detail']['minimumSheet'] for check in record['checks'] if 'minimumSheet' in (check.get('detail') if isinstance(check.get('detail'), dict) else {}))
source_files = [
    'ks6s3juocjzc2.kimi.page/index.html', 'ks6s3juocjzc2.kimi.page/scripts/state.js',
    'ks6s3juocjzc2.kimi.page/scripts/record.js', 'ks6s3juocjzc2.kimi.page/scripts/app.js',
    'ks6s3juocjzc2.kimi.page/scripts/icons.js', 'ks6s3juocjzc2.kimi.page/styles/record.css',
    'tests/verify-record.cjs', 'tests/verify-home.cjs', 'tests/verify-shell.cjs',
    'tests/build-record-delivery.py', 'README.md', 'docs/PW-WOORI-03.md',
]
changed = '# PW-WOORI-03 변경 파일\n\n'
for name in source_files:
    changed += f'- {"수정" if name in baseline["files"] else "추가"}: `{name}`\n'
changed += '\n`tokens.css`, `base.css`, `shell.css`, `home.css`, `home.js`, `tabs.js`는 변경하지 않았습니다. icons.js는 닫기 아이콘 하나만 추가했습니다.\n\n'
changed += '생성 증거는 `evidence/PW-WOORI-03/`, 구현 전 스냅샷·해시는 `preservation/PW-WOORI-03/`에 있습니다. 전체 파일 해시는 delivery.json을 확인하세요. 이전 슬라이스 증거는 바이트 동일합니다.\n'
(out / 'changed-files.md').write_text(changed)

screens = [
    ('6. 기록 기본 화면 360×844', '360x844-record'),
    ('7. 기록 기본 화면 390×844', '390x844-record'),
    ('8. 기록 기본 화면 430×844', '430x844-record'),
    ('9. 새 기록 Sheet — 받은 돈', 'sheet-received'),
    ('10. 새 기록 Sheet — 쓴 돈', 'sheet-spent'),
    ('11. 카테고리 wrapping — root 200%', 'category-wrapping'),
    ('12. 금액 validation 오류', 'validation-error'),
    ('13. 잔액 부족', 'insufficient-balance'),
    ('14. storage write failure', 'storage-write-failure'),
    ('15. 빈 거래 목록', 'empty-transactions'),
    ('16. 최근 기록 다수 — 20개 제한', 'many-transactions'),
]
extra_screens = [
    ('빈 저장소 — 첫 저장 전', 'empty-key'), ('invalid category', 'invalid-category'),
    ('손상 JSON', 'invalid-json'), ('누락 필드', 'partial-state'), ('잘못된 거래', 'invalid-row'),
    ('360×640', '360x640-record'), ('360×640 Sheet', '360x640-sheet'),
    ('360×640 root 200%', '360x640-200percent-sheet'), ('긴 금액 root 200%', 'long-amount-200percent'),
    ('safe area', 'safe-area-sheet'), ('키보드 높이 모사 — 360×440', 'keyboard-height-simulation'),
    ('다수 기록 마지막 행', 'many-transactions-bottom'),
    ('지출 저장 후 기록', 'saved-out'), ('입금 저장 후 기록', 'saved-in'),
    ('18. 지출 후 홈', 'home-after-out'), ('18. 입금 후 홈', 'home-after-in'),
    ('19. 지출 reload 후', 'reload-out'), ('19. 입금 reload 후', 'reload-in'),
]
for _, name in screens + extra_screens:
    assert (out / 'screenshots' / f'{name}.png').is_file(), name

report_text = f'''# PW-WOORI-03 — 기록 화면 및 거래 저장 제출

기록 탭과 명시적 저장을 구현했습니다. **기록 {counts['record']}개 + 홈 {counts['home']}개 + Shell {counts['shell']}개 = {sum(counts.values())}개 검증 묶음 PASS**입니다. Chromium {chrome} / WebKit {webkit}에서 검사했습니다.

[23개 제출 항목 갤러리](../evidence/PW-WOORI-03/index.html) · [기계 판독 결과](../evidence/PW-WOORI-03/verification.json)

PW-WOORI-01/02 승인된 디자인을 유지합니다. 이번 보고서의 캡처는 격리된 임시 context의 원본 fixture·합성 데이터이며 실제 사용자 잔액이나 사용자 브라우저 저장소를 나타내지 않습니다.

## 1. 변경 파일 목록과 보존

[변경 파일](../evidence/PW-WOORI-03/changed-files.md) · [전체 파일 해시](../evidence/PW-WOORI-03/delivery.json)

활성 앱은 진입 HTML, state/app/icons 수정과 record.js/record.css 추가입니다. 닫기 아이콘 하나를 기존 라인 아이콘 집합에 추가했습니다. tests 3종과 제출 생성기, README, 본 보고서를 포함합니다.

Git 저장소가 아니므로 구현 전 {len(baseline['files'])}개 파일의 SHA-256과 변경 대상 {len(baseline['snapshots'])}개의 원본을 비실행 텍스트로 보존했습니다. 변경 허용 원본을 제외한 {len(baseline['files']) - len(baseline['snapshots'])}개 파일은 바이트 동일합니다. tokens/base/shell/home 스타일과 home.js/tabs.js, PW-WOORI-01/02 증거를 그대로 유지했습니다.

## 2. 기존 transaction schema 분석

원본 근거: [보존 HTML](../preservation/PW-WOORI-01/original-index.html.txt)의 defaultState(1512행), txRow(1805행), CATS(1857행), 기록 저장(1971행 이후).

```js
{{
  type: 'in' | 'out',
  amount: number,
  category: string,
  ts: string,
  receipt: boolean,
  memo?: string // 사용자 승인된 선택적 확장
}}
```

원본 거래에 ID·memo·date 필드는 없으며 날짜는 ts입니다. 초기 fixture는 timezone 없는 ISO 로컬 문자열이고 원본 저장은 `new Date().toISOString()`입니다. 새 기록도 저장 순간을 ISO UTC로 저장하고 로컬 시간으로 표시합니다. 카테고리는 받은 돈 `용돈` 1종, 쓴 돈 `간식/문구/게임/교통/기타` 5종입니다. 선물·보상·편의점 등 새 분류를 만들지 않았습니다.

원본처럼 거래 배열 맨 앞에 추가하고 새 거래는 `receipt: false`입니다. memo는 Unicode code point 기준 최대 50자, 양끝 공백 제거 후 비어 있으면 필드를 생략합니다. 기존 거래·알 수 없는 추가 속성은 유지합니다.

목록은 날짜가 모두 신뢰 가능하면 복사본을 최신순으로 정렬·그룹화합니다. 불명확한 날짜가 섞이면 저장 배열 순서를 유지하며 '날짜 확인 안 됨'으로 표시합니다. 원본 배열의 순서를 재저장하지 않습니다. 이전 연도의 날짜에는 연도를 함께 표시합니다. 잘못된 거래는 확인 불가 안내를 제공하고 저장을 막습니다.

## 3. 받은 돈 / 쓴 돈 저장 변경 필드

| 구분 | balance | monthly.saving | monthly.spending | transactions |
|---|---|---|---|---|
| 받은 돈 | +amount | +amount | 유지 | 새 in 거래를 앞에 추가 |
| 쓴 돈 | −amount | 유지 | +amount | 새 out 거래를 앞에 추가 |

원본의 monthly.saving은 받은 돈 누계로 유지하며 UI에 저축으로 노출하지 않습니다. monthly에 기간 식별자가 없어 월 초기화나 재계산을 하지 않습니다. habitScore·goal·monthly.goal·missions·points·recordedDays·streak 등은 변경하지 않습니다.

| 검증 | 저장 전 | 저장 후 |
|---|---|---|
| A. 쓴 돈 3,500원 | balance 32,500 / spending 12,300 | balance **29,000** / spending **15,800** |
| B. 받은 돈 10,000원 | balance 32,500 / saving 15,200 | balance **42,500** / saving **25,200** |
| 홈 남은 돈 | saving − spending | A **−600원**, B **12,900원** |

빈 키의 첫 유효 저장에만 `balance`, `monthly: {{saving, spending}}`, `transactions`를 생성합니다. 첫 기록 전에는 '확인 전'과 0원 시작 안내를 표시하며 데모 잔액·사용자·목표·점수를 채우지 않습니다. 0원 기준의 첫 지출은 잔액 부족으로 막습니다.

## 4. 새 state 함수 구조

| 함수 | 책임 |
|---|---|
| loadPocketWONState | loaded/empty/invalid/unavailable 구분, 읽기만 수행 |
| createRecordViewModel | 잔액·최근 20개·유효성·날짜 표시, 순수 변환 |
| validateRecordDraft | type/category/금액/메모/원본 상태/잔액/합산 범위 검증 |
| applyTransaction | 검증 후 새 state/monthly/transactions 생성, 원본 불변 |
| persistPocketWONState | 단일 setItem, saved/failed 반환 |

record.js는 View·native dialog·입력·제출 순서를 담당하고 app.js는 View 생성·해제와 탭 이동을 관리합니다. home.js는 수정하지 않았습니다.

## 5. localStorage write 조건

유효한 입력으로 **기록 저장 버튼을 마우스·터치·키보드로 활성화**했을 때만 `pocketwon_demo_v1`에 한 번 씁니다. 입력 중 Enter는 저장하지 않습니다.

제출 잠금 → 최신 storage 재조회 → 검증 → 새 상태 계산 → setItem → 성공 후에만 화면 갱신 순서입니다. 동일 Sheet의 연속 click/submit은 한 거래만 생성합니다. 입력·닫기·진입·tab 이동·reload는 쓰기 0회이며 theme/intro/무관 키는 읽거나 변경하지 않습니다.

저장 실패에는 Sheet·입력·기존 화면·저장 문자열을 유지하고 지정 문구를 표시합니다. 재시도는 최신 값을 다시 읽습니다. 손상·누락 상태 자동 복구나 마이그레이션은 없습니다. 받은 돈의 balance/saving 합산과 쓴 돈의 spending 합산도 safe integer를 확인합니다.

저장 직전 다른 상태로 변경된 경우와 키 삭제·읽기 오류를 실제 브라우저에서 검증했습니다. localStorage는 여러 탭에 대한 원자적 트랜잭션을 제공하지 않으므로 동시 탭 간 무손실 저장까지 보장하지 않습니다.

'''
for title, name in screens:
    report_text += f'## {title}\n\n![{title}](../evidence/PW-WOORI-03/screenshots/{name}.png)\n\n'
report_text += f'''## 17. 저장 전/후 storage JSON diff

- [받은 돈 JSON](../evidence/PW-WOORI-03/storage-in.json) · [받은 돈 diff](../evidence/PW-WOORI-03/storage-in.diff)
- [쓴 돈 JSON](../evidence/PW-WOORI-03/storage-out.json) · [쓴 돈 diff](../evidence/PW-WOORI-03/storage-out.diff)

JSON diff는 격리 fixture의 저장 전후 구조를 읽기 좋게 정렬하지 않고 들여쓰기한 비교입니다. 실제 브라우저 검증은 실패·금지 경로에서 원래 저장 문자열의 동일성을 별도로 확인합니다. 타 키 문자열과 기존 거래, 비대상 필드의 동일성도 확인합니다.

## 18. 저장 후 홈 갱신 화면

![지출 후 홈](../evidence/PW-WOORI-03/screenshots/home-after-out.png)

![입금 후 홈](../evidence/PW-WOORI-03/screenshots/home-after-in.png)

홈 재진입 시 로더를 다시 호출하는 기존 구조를 유지했습니다. balance·받은 돈·쓴 돈·남은 돈 네 값의 DOM·접근성 이름을 검사했습니다. 홈 디자인·레이아웃·문구는 변경하지 않았습니다. [시각 회귀 비교](../evidence/PW-WOORI-03/visual-regression.json)에서 360/390px 홈은 픽셀 동일, 430px은 카드 테두리의 19픽셀에서 채널값 최대 1 차이만 관찰됐습니다. 430px 이미지가 바이트 동일하다고 주장하지 않습니다. 세 placeholder의 3개 폭 이미지 9개는 바이트 동일합니다.

## 19. reload persistence 검증

![입금 reload 후 기록](../evidence/PW-WOORI-03/screenshots/reload-in.png)

두 거래 유형 모두 저장 문자열과 새 거래가 reload 후 유지됩니다. reload는 홈으로 돌아가는 기존 동작을 유지하고 기록 탭에 재진입해 확인했습니다. reload 이후 저장 호출은 0회입니다.

## 20. keyboard / accessibility / 반응형

[접근성 트리](../evidence/PW-WOORI-03/accessibility-tree.txt)

- native modal dialog 이름·제목, native radio fieldset/legend, label/input 연결, 오류 aria-describedby·aria-invalid, 저장 실패 role=alert, 성공 role=status.
- 첫 의미 있는 type control 포커스, radio Space/방향키, Tab·Shift+Tab 포커스 제한, Escape·닫기 후 CTA 포커스 복귀를 양 브라우저에서 확인했습니다.
- WebKit은 native radio 방향키 이동 후 `:focus-visible`을 생략하는 경우가 있어 라디오 `:focus` 자체에도 2px 테두리를 표시합니다. 실제 활성 요소와 테두리의 굵기·스타일을 검사했습니다.
- 360/390/430×844, 360×640 및 각 root 200%에서 기본 화면·Sheet를 검사했습니다. 최소 48px 상당 터치 영역, 내부 스크롤, 칩 wrapping, 긴 금액, nav 간섭·가로 overflow를 검사했습니다.
- 47px 상단/34px 하단/24px 좌우 safe area 주입, 360×440 키보드 높이 모사도 통과했습니다. Sheet 높이는 현재 dvh와 visualViewport 중 작은 높이로 제한합니다. 하단 safe area는 footer에서 한 번만 적용합니다.
- 선택 chip은 기존 primary-hover 색을 사용해 primary-soft 배경과 충분한 대비를 확보합니다. 측정한 Sheet 텍스트 최소 대비는 **{minimum:.3f}:1**이며 기본 화면 텍스트도 4.5:1 이상입니다. 금융 의미 색은 금액에만 사용하고 +/- 및 접근성 이름을 제공합니다.

실물 iPhone/Android 키보드·스크린리더 실기기 검증 및 axe 감사는 수행하지 않았습니다. visual viewport·키보드 검증은 브라우저 resize 모사와 DOM/키보드 검사 범위입니다. '10초 기록'은 항목 수와 흐름에 대한 자체 검수이며 어린이 사용자 대상 시간 측정을 주장하지 않습니다.

## 21. console / page error

최종 기록·홈·Shell 검증 전체 **0건**입니다. [기록 결과](../evidence/PW-WOORI-03/verification.json), [홈 결과](../evidence/PW-WOORI-03/home/verification.json), [Shell 결과](../evidence/PW-WOORI-03/shell/verification.json)를 제공합니다.

## 22. failed resource 요청

requestfailed와 HTTP 4xx/5xx **0건**입니다. 기존 Pretendard CDN만 유지하며 SDK를 재활성화하지 않았습니다. 테스트는 기존 로컬 Chromium/WebKit을 사용했습니다.

## 23. 전체 source diff

[소스·테스트·문서 전체 diff](../evidence/PW-WOORI-03/source.patch)

진입 HTML, 활성 JS/CSS, 검사 코드와 제출 생성기, README와 본 보고서의 변경을 구현 전 원본과 비교합니다. 생성 이미지·검증 결과·보존 사본은 source diff와 구분하고 delivery.json에 해시로 기록합니다.

## 시각 품질 자체 점검

| 항목 | 판정 |
|---|---|
| 우리WON 계열의 차분한 White/pale blue | YES |
| 빽빽한 가계부·불필요한 설정 없음 | YES |
| 새 기록 추가가 유일한 기본 화면 primary CTA | YES |
| 금액 입력 영역의 숫자가 가장 강한 위계 | YES |
| 카테고리 무지개색 없음 | YES |
| 받은/쓴 돈·금액·종류·선택 메모의 짧은 기록 흐름 | YES |
| 최근 기록의 명확한 숫자·+/− | YES |
| 홈과 공통 토큰·라인 아이콘 유지 | YES |
| 실패·잔액 부족은 짧은 인라인 문구 | YES |
| 추가 입력·목표·통계 기능 없음 | YES |

## 재현과 완료 경계

```sh
python3 -m http.server 4173 --bind 127.0.0.1
# 별도 터미널에서
node tests/verify-record.cjs
node tests/verify-home.cjs
node tests/verify-shell.cjs
python3 tests/build-record-delivery.py
```

JavaScript 구문 검사도 통과했습니다. 정적 프로젝트이며 프레임워크 build/lint와 신규 런타임 의존성은 없습니다. 검증 환경 경로 override는 README를 따릅니다. 테스트 fixture는 계측 시작 전에 임시 context에만 주입하고 종료 시 폐기합니다.

초기 검사에서 발견한 viewport 축소 시 Sheet 상한 문제와 WebKit radio 포커스 표시를 수정했고, 선택 chip 대비를 보완한 뒤 최종 소스로 전체 검사를 통과했습니다. 과거 증거 파일은 수정하지 않았습니다.

**PW-WOORI-03 제출로 작업을 멈추고 검수를 기다립니다. 목표·리포트·전체 개발, 외부 게시·배포는 진행하지 않았습니다.**
'''
(root / 'docs/PW-WOORI-03.md').write_text(report_text)

links = [
    ('1. 변경 파일', 'changed-files.md'), ('2–5. 원본 schema·변경 필드·state 함수·쓰기 조건', '../../docs/PW-WOORI-03.md'),
    ('17. 받은 돈 JSON diff', 'storage-in.diff'), ('17. 쓴 돈 JSON diff', 'storage-out.diff'),
    ('19–22. 기록 검증 결과', 'verification.json'), ('20. 접근성 트리', 'accessibility-tree.txt'),
    ('21–22. 홈 회귀 검증', 'home/verification.json'), ('21–22. Shell 회귀 검증', 'shell/verification.json'),
    ('23. 전체 source diff', 'source.patch'), ('전체 해시', 'delivery.json'), ('홈·placeholder 시각 회귀', 'visual-regression.json'),
]
gallery = '''<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PW-WOORI-03 검수 자료</title><style>
*{box-sizing:border-box}body{margin:0;background:#f5f8fc;color:#20252b;font:16px/1.6 system-ui,sans-serif}main{max-width:1320px;margin:auto;padding:32px 20px}h1{font-size:28px}h2{font-size:18px}a{color:#0067ac}.links{display:flex;flex-wrap:wrap;gap:12px 24px;margin:24px 0}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr));gap:24px}figure{margin:0;padding:16px;background:white;border:1px solid #dde5ee;border-radius:16px}img{display:block;max-width:100%;height:auto;margin:auto;border:1px solid #dde5ee}figcaption{margin-bottom:12px;font-weight:600}.note{color:#526170}code{overflow-wrap:anywhere}a:focus-visible{outline:2px solid #0075c8;outline-offset:3px}</style></head><body><main>'''
gallery += f'<h1>PW-WOORI-03 · 기록 화면</h1><p>기록 {counts["record"]} + 홈 {counts["home"]} + Shell {counts["shell"]} = {sum(counts.values())}개 검증 묶음 PASS</p><p class="note">모든 캡처는 임시 브라우저 context의 fixture입니다. 사용자 저장소에 데이터를 주입하지 않았습니다. 이미지를 누르면 원본 크기로 열립니다.</p><nav class="links">'
for label, href in links:
    gallery += f'<a href="{html.escape(href)}">{html.escape(label)}</a>'
gallery += '</nav><h2>요청한 화면과 오류 상태</h2><div class="grid">'
for title, name in screens + extra_screens:
    gallery += f'<figure><figcaption>{html.escape(title)}</figcaption><a href="screenshots/{name}.png"><img src="screenshots/{name}.png" alt="{html.escape(title)}" loading="lazy"></a></figure>'
gallery += '</div><p class="note">실물 모바일 키보드·스크린리더 테스트는 미수행입니다. 여러 탭의 동시 localStorage 쓰기에 대한 원자적 트랜잭션을 보장하지 않습니다. 목표·리포트·전체는 placeholder이며 다음 슬라이스를 구현하지 않았습니다.</p></main></body></html>'
(out / 'index.html').write_text(gallery)

patch = ''
for name in source_files:
    original = root / 'preservation/PW-WOORI-03/originals' / (name + '.txt')
    before = original.read_text() if original.exists() else ''
    after = (root / name).read_text()
    patch += ''.join(difflib.unified_diff(before.splitlines(True), after.splitlines(True), fromfile='a/' + name if original.exists() else '/dev/null', tofile='b/' + name))
(out / 'source.patch').write_text(patch)
files = {str(p.relative_to(root)): sha(p.read_bytes()) for p in root.rglob('*') if p.is_file() and '__pycache__' not in p.parts and p != out / 'delivery.json'}
delivery = {'generatedAt': datetime.now(timezone.utc).isoformat(), 'status': 'PASS', 'checks': counts, 'sourceFiles': source_files, 'baselineFileCount': len(baseline['files']), 'preservedFiles': len(baseline['files']) - len(baseline['snapshots']), 'files': files, 'selfHashExcluded': True}
(out / 'delivery.json').write_text(json.dumps(delivery, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'status': 'PASS', 'checks': counts, 'sourceFiles': len(source_files), 'evidenceImages': len(record['screenshots']), 'hashedFiles': len(files)}, ensure_ascii=False))
