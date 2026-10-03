"""Build PW-WOORI-04 review evidence only after all four suites complete."""
from pathlib import Path
from datetime import datetime, timezone
import difflib
import hashlib
import html
import json
from PIL import Image, ImageChops

root = Path(__file__).resolve().parent.parent
out = root / 'evidence/PW-WOORI-04'
baseline = json.loads((root / 'preservation/PW-WOORI-04/baseline.json').read_text())
reports = {name: json.loads((out / suffix / 'verification.json').read_text()) for name, suffix in [('goal', ''), ('record', 'record'), ('home', 'home'), ('shell', 'shell')]}
assert all(r['status'] == 'PASS' for r in reports.values()), 'All four suites must finish with PASS'
assert all(not r.get('consoleErrors') and not r.get('resourceErrors') and not r.get('networkErrors') for r in reports.values())
sha = lambda data: hashlib.sha256(data).hexdigest()
for name, digest in baseline['files'].items():
    if name not in baseline['snapshots']:
        assert sha((root / name).read_bytes()) == digest, name

screens = [
    (8, '목표 있음 — 360×844', '360x844-goal'),
    (9, '목표 있음 — 390×844', '390x844-goal'),
    (10, '목표 있음 — 430×844', '430x844-goal'),
    (11, '목표 없음', 'empty-goal'),
    (12, '목표 만들기 Sheet', 'sheet-create'),
    (13, '목표 수정 Sheet', 'sheet-edit'),
    (14, 'target validation 오류', 'target-validation'),
    (15, 'current보다 작은 target 오류', 'below-current-error'),
    (16, '목표 완료 상태', 'complete'),
    (17, '긴 목표 이름·큰 금액', 'large-long'),
    (18, 'storage failure 상태', 'storage-failure'),
]
for _, _, name in screens:
    assert (out / 'screenshots' / f'{name}.png').is_file(), name
for name in ['home-after-create', 'home-after-edit', 'reload-create', 'reload-edit', 'keyboard-height', 'safe-area-sheet', 'large-long-200percent']:
    assert (out / 'screenshots' / f'{name}.png').is_file(), name
for kind in ['create', 'edit', 'title', 'no-goal']:
    pair = json.loads((out / f'storage-{kind}.json').read_text())
    strings = [json.dumps(pair[k], ensure_ascii=False, indent=2) + '\n' for k in ['before', 'after']]
    (out / f'storage-{kind}.diff').write_text(''.join(difflib.unified_diff(strings[0].splitlines(True), strings[1].splitlines(True), fromfile='before/pocketwon_demo_v1', tofile='after/pocketwon_demo_v1')))

visual = []
for kind, names in [('home', [f'{w}x844-home' for w in [360, 390, 430]]), ('record', [f'{w}x844-record' for w in [360, 390, 430]]), ('shell', [f'{w}x844-{tab}' for w in [360, 390, 430] for tab in ['report', 'all']])]:
    for name in names:
        old_base = root / 'evidence/PW-WOORI-03' / ('' if kind == 'record' else kind)
        old = old_base / 'screenshots' / f'{name}.png'
        new = out / kind / 'screenshots' / f'{name}.png'
        a, b = Image.open(old).convert('RGBA'), Image.open(new).convert('RGBA')
        assert a.size == b.size
        diff = ImageChops.difference(a, b)
        extrema = diff.getextrema()
        visual.append({'screen': f'{kind}/{name}', 'byteIdentical': old.read_bytes() == new.read_bytes(), 'changedPixels': sum(1 for pixel in diff.getdata() if any(pixel)), 'maxChannelDelta': max(pair[1] for pair in extrema)})
(out / 'visual-regression.json').write_text(json.dumps(visual, indent=2) + '\n')
visual_summary = f"{sum(v['byteIdentical'] for v in visual)}/{len(visual)}개 캡처는 바이트 동일합니다. " + ' '.join(f"{v['screen']}은 {v['changedPixels']}픽셀에서 채널값 최대 {v['maxChannelDelta']} 차이가 있습니다." for v in visual if not v['byteIdentical'])

sources = baseline['snapshots'] + ['ks6s3juocjzc2.kimi.page/scripts/goal.js', 'ks6s3juocjzc2.kimi.page/styles/goal.css', 'tests/verify-goal.cjs', 'tests/build-goal-delivery.py', 'docs/PW-WOORI-04.md']
changed = '# PW-WOORI-04 변경 파일\n\n' + '\n'.join(f'- {"수정" if name in baseline["files"] else "추가"}: `{name}`' for name in sources)
changed += '\n\nHome·Record JS/CSS, Shell 스타일, tokens/base/tabs/icons와 과거 preservation/evidence는 변경하지 않았습니다. 공통 state는 Goal 순수 함수를 추가했고, 기존 transaction/persist 구현은 그대로입니다.\n'
(out / 'changed-files.md').write_text(changed)
counts = {key: len(r['checks']) for key, r in reports.items()}
versions = reports['goal']['browsers']
contrast = [r['detail'] for r in reports['goal']['checks'] if isinstance(r.get('detail'), dict) and 'minScreen' in r['detail']]
minimum = min(min(v.values()) for v in contrast)
text = f'''# PW-WOORI-04 — 단일 목표 화면과 목표 관리

목표 탭만 구현했습니다. Goal {counts['goal']} + Record {counts['record']} + Home {counts['home']} + Shell {counts['shell']} = **{sum(counts.values())}개 검증 묶음 PASS**입니다. Chromium {versions['chromium']['version']} / WebKit {versions['webkit']['version']}에서 검사했습니다.

[26개 제출 항목 갤러리](../evidence/PW-WOORI-04/index.html) · [Goal 검사 원문](../evidence/PW-WOORI-04/verification.json) · [전체 source diff](../evidence/PW-WOORI-04/source.patch)

모든 캡처·JSON은 격리된 임시 브라우저 context의 fixture입니다. 실제 사용자 저장소·금액을 사용하지 않았습니다.

## 1. 변경 파일 목록

[변경 파일 12개](../evidence/PW-WOORI-04/changed-files.md). 구현 전 {len(baseline['files'])}개 파일의 SHA-256과 변경 대상 기존 파일 7개를 비실행 텍스트로 보존했습니다. 비대상 {len(baseline['files'])-len(baseline['snapshots'])}개는 바이트 동일합니다. Git 저장소가 아니므로 보존본과 unified diff를 제공합니다.

## 2. 원본 goal schema 전체 분석

원본 근거: 보존 HTML 1512~1528행의 defaultState, 2001~2113행의 renderGoal/bindGoal/openGoalDialog. 원본 SHA-256은 `24405c1c583da11d362f82b067add7fb7c62e152cba55f44d331f161b62314ba`입니다.

```js
goal: {{
  title: "게임 아이템",
  target: 45000,
  current: 30600,
  daysLeft: 12
}}
```

단일 객체이며 ID·목록·사진·완료 history가 없습니다. daysLeft는 저장 당시 계산한 남은 일수로 절대 날짜가 아닙니다. 이번에는 표시·갱신하지 않고 기존 값과 알 수 없는 추가 속성을 그대로 보존합니다.

원본 기본값은 이미 30,600원을 모은 데모 fixture입니다. 안전한 신규 생성 경로는 없습니다. openGoalDialog는 g.daysLeft/g.title을 먼저 참조하므로 goal이 없는 상태를 지원하지 않습니다. 신규 0원 시작은 이번 사용자 승인으로 추가한 규칙이며 원본의 초기값이라고 주장하지 않습니다.

## 3. goal.current 변경 경로

| 원본 동작 | current 변경 | 함께 바뀌는 필드 |
|---|---|---|
| 기본 데모 로드·resetState | 30,600 | reset은 전체 defaultState 복원 후 저장 |
| 목표 편집창 저장 | 입력 current를 target 이하로 clamp | goal.title/target/daysLeft, monthly.goal |
| 미완료 미션 클릭 | target 미만이면 최대 1,000 증가, target 상한 | missions[i]=true, points+=10 |
| 받은 돈·쓴 돈 기록 | 변경 없음 | balance, monthly.saving/spending, transactions 등 |

원본의 목표 편집은 이름·금액·현재금액·날짜 4개 입력이었으며 goal 객체 전체를 재구성했습니다. 이번에는 이름·target만 입력하고 current 자동 감소와 직접 편집을 제거했습니다. 달성 상태는 current>=target의 읽기 결과로 표현하며 데이터를 삭제하거나 전환하지 않습니다.

## 4. balance / monthly.goal 관계

balance=32,500, monthly.saving=15,200, goal.current=30,600으로 서로 다른 값입니다. balance 차감→current 증가 또는 받은 돈→current 증가 규칙은 없습니다. monthly.saving은 받은 돈 누계입니다.

원본 목표 저장은 monthly.goal=target을 수행합니다. 승인된 이번 규칙은 **기존 monthly.goal이 있을 때만 동기화**, 없으면 추가하지 않음입니다. saving/spending/balance/transactions는 목표 수정으로 변경하지 않습니다. 존재하지만 금액 계약이 잘못된 monthly.goal은 자동 수정하지 않고 저장을 차단합니다.

## 5. 목표 적립 기능 구현 여부

**미구현 — 원본 데이터 계약상 안전한 적립 로직을 확인하지 못해 제외.**

미션 버튼은 잔액·거래와 연결되지 않은 데모 수치·포인트 변경입니다. 목표에 모으기 버튼, disabled 예고 버튼, 미션·보상·송금 로직을 만들지 않았습니다. 다음 행동은 기록 탭 이동 하나입니다.

## 6. Goal state 함수 구조

| 함수 | 역할 |
|---|---|
| loadPocketWONState | loaded/empty/invalid/unavailable, 읽기만 수행 |
| createGoalViewModel | empty/invalid/active/complete, current·target·remaining·percent |
| validateGoalDraft | trim·1~30 code points·숫자 문자열·safe integer·target>=current·저장 계약 |
| applyGoalUpdate | 순수 변환, 기존 객체 불변, 추가 속성·current 보존 |
| persistPocketWONState | 기존 단일 setItem 지점, saved/failed 반환 |

goal.js는 화면·native dialog·입력·포커스·명시적 제출을 담당합니다. app.js는 탭 생성/해제와 이동을 담당합니다. Home adapter/레이아웃과 Record transaction 구현을 수정하지 않았습니다.

## 7. localStorage write 조건

유효한 입력으로 저장 버튼을 마우스·터치·키보드로 명시적으로 활성화할 때만 `pocketwon_demo_v1`에 저장합니다. 입력 중 Enter는 저장하지 않습니다.

제출 잠금→최신 저장소 읽기→상태/입력 검증→순수 변환→단일 setItem→성공 후 화면 갱신 순서입니다. 같은 Sheet의 연속 활성화는 한 번만 저장합니다. 읽기 실패·손상 JSON·부분 용돈 정보·invalid goal·손상 monthly.goal·금액 범위 오류는 저장하지 않습니다.

편집 중 current나 balance가 바뀌면 최신 값을 사용합니다. 목표 삭제·다른 목표 생성·이름/target 변경은 입력을 유지하고 재확인을 안내합니다. 저장 실패는 setItem 시도 1회가 실패한 것이며 성공한 쓰기는 없습니다. 기존 문자열·화면·입력을 보존하고 성공 feedback을 표시하지 않습니다.

완전히 빈 키의 첫 목표 저장에만 사용자 승인된 최소 상태 `balance:0, monthly:{{saving:0, spending:0}}, transactions:[]`와 current=0 goal을 생성합니다. 기존 missing/null goal은 유효한 용돈 상태 안에서만 생성합니다. 데모 이름·금액·날짜·점수는 채우지 않습니다.

진입·입력·취소·탭 이동·reload는 쓰기 0회입니다. 타 키 변경·마이그레이션·removeItem/clear는 없습니다. localStorage는 여러 탭의 원자적 거래를 제공하지 않으므로 동시 탭 저장의 무손실 보장은 하지 않습니다.
'''
for n, label, name in screens:
    text += f'\n## {n}. {label}\n\n![{label}](../evidence/PW-WOORI-04/screenshots/{name}.png)\n'
    if n == 17:
        text += '\n![큰 금액 200%](../evidence/PW-WOORI-04/screenshots/large-money-200percent.png)\n'
text += f'''
## 19. 저장 전/후 JSON diff

- [신규 생성 JSON](../evidence/PW-WOORI-04/storage-create.json) · [diff](../evidence/PW-WOORI-04/storage-create.diff)
- [target 수정 JSON](../evidence/PW-WOORI-04/storage-edit.json) · [diff](../evidence/PW-WOORI-04/storage-edit.diff)
- [이름만 수정 JSON](../evidence/PW-WOORI-04/storage-title.json) · [diff](../evidence/PW-WOORI-04/storage-title.diff)
- [기존 goal 없음 JSON](../evidence/PW-WOORI-04/storage-no-goal.json) · [diff](../evidence/PW-WOORI-04/storage-no-goal.diff)

42,000/100,000→target 120,000 저장 후 current는 42,000입니다. title만 수정해도 current/target이 유지됩니다. 기존 daysLeft·추가 속성과 비대상 데이터는 불변성을 검사했습니다. diff는 가독성을 위한 JSON 표현이며 실패 경로는 저장 문자열 자체의 동일성을 검사합니다.

## 20. 저장 후 Home 목표 카드

![생성 후 Home](../evidence/PW-WOORI-04/screenshots/home-after-create.png)

![수정 후 Home](../evidence/PW-WOORI-04/screenshots/home-after-edit.png)

Home 재진입의 기존 재조회 구조를 사용합니다. 새 이름·목표금액·progress를 DOM으로 확인했습니다. 완료 목표의 Home 표현은 기존 완료 안내를 유지합니다. [시각 회귀 측정](../evidence/PW-WOORI-04/visual-regression.json)에서 Home·Record와 report/all의 이전 캡처를 비교했습니다. {visual_summary} 바이트 동일 여부와 픽셀 차이를 구분해 기록했습니다.

## 21. reload persistence

![수정 후 reload](../evidence/PW-WOORI-04/screenshots/reload-edit.png)

생성·target 수정·이름 수정·기존 goal 없음 모두 reload 후 storage 문자열과 목표가 유지됩니다. 기존 Shell처럼 reload는 Home으로 시작하며 목표 탭 재진입으로 확인합니다. reload 이후 쓰기는 0회입니다.

## 22. Record 회귀

[Record {counts['record']}개 검증 결과](../evidence/PW-WOORI-04/record/verification.json). 받은 돈·쓴 돈·잔액 부족·실패 후 재시도·persistence·중복 저장 방지·keyboard/accessibility가 통과했습니다.

Goal 저장 후 실제 Record UI로 받은 돈 10,000원을 저장하는 추가 검사도 통과했습니다. balance만 기록 계약대로 증가하고 goal 전체와 monthly.goal은 유지됩니다. 빈 저장소에서 목표를 먼저 만든 뒤에도 첫 기록이 정상 저장됩니다.

## 23. keyboard / accessibility / 반응형

[Chromium 접근성 트리](../evidence/PW-WOORI-04/accessibility-Chromium.txt) · [WebKit 접근성 트리](../evidence/PW-WOORI-04/accessibility-WebKit.txt)

- h1/h2와 이름 있는 progressbar, min/max/now/valuetext, 완료 상태 텍스트를 제공합니다.
- Sheet는 이름 있는 native modal dialog입니다. 첫 이름 입력 focus, label, aria-describedby/invalid, 오류 alert, 성공 status를 제공합니다.
- Tab/Shift+Tab은 저장 버튼 활성/비활성 모두 dialog 안에서 순환합니다. Escape·닫기·성공 후 trigger로 복귀하고 focus-visible과 48px 이상 터치 영역을 유지합니다.
- 360/390/430×844, 360×640와 각 200% root font에서 화면·Sheet, 큰 금액·긴 이름·오류·완료 상태의 가로 overflow와 nav 간섭을 검사했습니다.
- 47/34/24px safe area 주입과 360×440 키보드 높이 모사를 검사했습니다. Sheet 내부 스크롤과 화면 안 저장 버튼을 확인했습니다. 하단 safe area는 footer에서 한 번만 적용합니다.
- 큰 금액은 숫자와 단위를 분리하고 필요하면 축약·줄바꿈합니다. 정확한 금액을 보조 텍스트·접근성 이름으로 유지하며 사용자 글자 크기를 줄이지 않습니다.
- 측정한 기본 화면·Sheet 텍스트 대비 최솟값은 {minimum:.3f}:1입니다.

실물 iPhone/Android 키보드, 스크린리더 실기기, axe 검사는 수행하지 않았습니다. 브라우저 접근성 트리·DOM·키보드 검사와 viewport 모사 범위입니다. 어린이 대상 3초 이해도 실험은 수행하지 않았으며 시각 위계를 자체 검수했습니다.

## 24. console / page error

최종 4개 검사 전체 0건입니다. 초기 200% 금액 overflow를 보완했고, 테스트 context 종료 전 웹폰트 로딩을 기다리도록 해 정상 로딩을 확인한 뒤 종료합니다. 오류를 필터로 숨기지 않습니다.

## 25. failed resource

최종 requestfailed 및 HTTP 4xx/5xx 0건입니다. 기존 Pretendard CDN만 사용하며 앱에 신규 런타임 의존성·API·SDK를 추가하지 않았습니다. 검사는 로컬 서버와 격리된 브라우저 context에서 수행했습니다.

## 26. 전체 source diff

[전체 source diff](../evidence/PW-WOORI-04/source.patch) · [파일 해시 명세](../evidence/PW-WOORI-04/delivery.json)

소스·검사·제출 생성기·README·보고서를 포함합니다. 생성 이미지·JSON과 보존 파일은 source diff 대신 해시 명세로 구분합니다.

## 시각 품질 자체 점검

| 검수 항목 | 판정 |
|---|---|
| 장식이 목표 이름보다 강하지 않음 | YES |
| 현재 모은 금액이 쉽게 읽힘 | YES |
| 하나의 progress와 퍼센트로 진행률을 바로 파악 | YES |
| Hero 하나와 간단한 정보로 카드 수 절제 | YES |
| primary blue 사용 절제 | YES |
| 쉬운 문구와 작은 아이콘, 유치한 장식 없음 | YES |
| 이름/금액 두 항목의 짧은 form | YES |
| 기존 current 임의 변경 없음 | YES |
| 새로운 적립/이체 규칙 없음 | YES |
| Home/Record와 같은 토큰·Sheet 패턴 | YES |

## 재현과 완료 경계

```sh
python3 -m http.server 4173 --bind 127.0.0.1
node tests/verify-goal.cjs
node tests/verify-record.cjs
node tests/verify-home.cjs
node tests/verify-shell.cjs
python3 tests/build-goal-delivery.py
```

검사는 기존 설치된 Playwright/Chromium/WebKit을 사용합니다. `PW_BASE_URL`은 localhost/127.0.0.1만 허용합니다. 실행 경로는 기존 PW_PLAYWRIGHT_MODULE/PW_CHROMIUM_EXECUTABLE/PW_WEBKIT_EXECUTABLE 환경변수로 재지정할 수 있습니다. 제출 생성기의 PNG 비교에는 기존 Pillow를 사용하며 앱 런타임 의존성이 아닙니다.

**PW-WOORI-04 완료 후 작업을 멈추고 검수를 기다립니다. 리포트·전체는 placeholder이며 목표 삭제·다중 목표·적립·부모 기능·배포는 구현하지 않았습니다.**
'''
(root / 'docs/PW-WOORI-04.md').write_text(text)
labels = [
    '변경 파일 목록', '원본 goal schema 전체 분석', 'goal.current 변경 경로', 'balance/monthly.goal 관계', '목표 적립 구현 여부와 근거', 'Goal state 함수 구조', 'localStorage write 조건',
] + [label for _, label, _ in screens] + ['저장 전/후 JSON diff', '저장 후 Home 목표 카드', 'reload persistence', 'Record 회귀 결과', 'keyboard / accessibility', 'console/page error', 'failed resource', '전체 source diff']
assert len(labels) == 26
links = {1: 'changed-files.md', 19: 'storage-edit.diff', 22: 'record/verification.json', 23: 'accessibility-Chromium.txt', 24: 'verification.json', 25: 'verification.json', 26: 'source.patch'}
screen_by_index = {n: name for n, _, name in screens} | {20: 'home-after-edit', 21: 'reload-edit'}
gallery = '''<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PW-WOORI-04 검수 자료</title><style>
*{box-sizing:border-box}body{margin:0;background:#f5f8fc;color:#20252b;font:16px/1.65 system-ui,sans-serif}main{max-width:1200px;margin:auto;padding:32px 20px}h1{margin:0}a{color:#0067ac}nav{display:flex;gap:20px;flex-wrap:wrap}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:24px;margin-top:24px}article{background:white;border:1px solid #dde5ee;border-radius:16px;padding:20px;overflow-wrap:anywhere}h2{font-size:18px;margin:0 0 16px}img{display:block;max-width:100%;height:auto;margin:auto;border:1px solid #e7edf2}.note{color:#526170}summary{cursor:pointer;min-height:48px}details a{display:block;padding:8px}</style></head><body><main>'''
gallery += f'<h1>PW-WOORI-04 · 목표</h1><p>Goal {counts["goal"]} · Record {counts["record"]} · Home {counts["home"]} · Shell {counts["shell"]} — {sum(counts.values())}개 검증 묶음 PASS</p><p class="note">격리된 테스트 fixture의 캡처입니다. 실제 사용자 금액이 아닙니다. 앱의 리포트·전체 탭은 placeholder로 유지합니다.</p><nav><a href="../../ks6s3juocjzc2.kimi.page/index.html">앱 열기</a><a href="../../docs/PW-WOORI-04.md">전체 보고서</a><a href="source.patch">전체 source diff</a><a href="delivery.json">해시 명세</a><a href="visual-regression.json">시각 회귀</a></nav><div class="grid">'
for n, label in enumerate(labels, 1):
    gallery += f'<article><h2>{n}. {html.escape(label)}</h2>'
    if n in screen_by_index:
        name = screen_by_index[n]
        gallery += f'<a href="screenshots/{name}.png"><img src="screenshots/{name}.png" alt="{html.escape(label)}" loading="lazy"></a>'
    else:
        gallery += f'<a href="{links.get(n, "../../docs/PW-WOORI-04.md")}">근거와 결과 보기</a>'
    gallery += '</article>'
gallery += '</div><details><summary>추가 반응형·200%·오류 캡처</summary>'
for name in sorted(reports['goal']['screenshots']):
    gallery += f'<a href="{html.escape(name)}">{html.escape(name)}</a>'
gallery += '</details><p class="note">실물 모바일 키보드·스크린리더 검증은 미수행입니다. viewport 모사와 브라우저 DOM/키보드 검사 결과입니다. PW-WOORI-04 완료 후 검수를 기다립니다.</p></main></body></html>'
(out / 'index.html').write_text(gallery)
patch = ''
for name in sources:
    saved = root / 'preservation/PW-WOORI-04/originals' / (name + '.txt')
    before = saved.read_text() if saved.exists() else ''
    after = (root / name).read_text()
    patch += ''.join(difflib.unified_diff(before.splitlines(True), after.splitlines(True), fromfile='before/' + name, tofile='after/' + name))
(out / 'source.patch').write_text(patch)
manifest = {'createdAt': datetime.now(timezone.utc).isoformat(), 'status': 'PASS', 'counts': counts, 'sourceFiles': sources, 'historicalFilesPreserved': len(baseline['files']) - len(baseline['snapshots']), 'files': {}}
for file in [*(root / 'ks6s3juocjzc2.kimi.page').rglob('*'), *out.rglob('*'), *(root / 'preservation/PW-WOORI-04').rglob('*'), *(root / 'tests').glob('*'), root / 'README.md', root / 'docs/PW-WOORI-04.md']:
    if file.is_file() and file != out / 'delivery.json': manifest['files'][str(file.relative_to(root))] = sha(file.read_bytes())
(out / 'delivery.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'status': 'PASS', 'counts': counts, 'sourceFiles': len(sources), 'visualRegression': visual}, indent=2))
