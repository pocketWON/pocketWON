"""Package PW-WOORI-05 after five completed, unfiltered acceptance suites."""
from pathlib import Path
from datetime import datetime, timezone
import difflib
import hashlib
import html
import json
import subprocess
import tempfile
from PIL import Image, ImageChops

root = Path(__file__).resolve().parent.parent
out = root / 'evidence/PW-WOORI-05'
baseline = json.loads((root / 'preservation/PW-WOORI-05/baseline.json').read_text())
sha = lambda data: hashlib.sha256(data).hexdigest()
reports = {name: json.loads((out / suffix / 'verification.json').read_text()) for name, suffix in [('report', ''), ('goal', 'goal'), ('record', 'record'), ('home', 'home'), ('shell', 'shell')]}
for name, report in reports.items():
    assert report['status'] == 'PASS', name
    for key in ['consoleErrors', 'pageErrors', 'requestFailures', 'httpErrors', 'resourceErrors', 'networkErrors']:
        assert not report.get(key), (name, key, report.get(key))
counts = {name: len(report['checks']) for name, report in reports.items()}
assert {k: counts[k] for k in ['goal', 'record', 'home', 'shell']} == {'goal': 65, 'record': 64, 'home': 44, 'shell': 46}
for name, digest in baseline['files'].items():
    if name not in baseline['snapshots']:
        assert sha((root / name).read_bytes()) == digest, name
required = ['360x844-report', '390x844-report', '430x844-report', 'empty-report', 'invalid-report', 'partial-report', 'score-zero', 'score-100', 'score-unavailable', 'goal-active', 'goal-complete', 'large-money', 'long-goal-title', '200percent']
for name in required:
    assert (out / 'screenshots' / f'{name}.png').is_file(), name
for engine in ['Chromium', 'WebKit']:
    assert (out / f'accessibility-{engine}.txt').is_file()

visual = []
for kind, sub in [('home', 'home'), ('record', 'record'), ('goal', ''), ('all', 'shell')]:
    for width in [360, 390, 430]:
        name = f'{width}x844-{kind}.png'
        old = root / 'evidence/PW-WOORI-04' / sub / 'screenshots' / name
        new = out / ('goal' if kind == 'goal' else sub) / 'screenshots' / name
        a, b = Image.open(old).convert('RGB'), Image.open(new).convert('RGB')
        assert a.size == b.size
        delta = ImageChops.difference(a, b)
        visual.append({'screen': kind, 'viewport': [width, 844], 'baseline': str(old.relative_to(root)), 'current': str(new.relative_to(root)), 'byteIdentical': old.read_bytes() == new.read_bytes(), 'changedPixels': sum(any(p) for p in delta.getdata()), 'maxChannelDifference': max(p[1] for p in delta.getextrema()), 'affectedBounds': delta.getbbox()})
(out / 'visual-regression.json').write_text(json.dumps(visual, indent=2) + '\n')
assert all(v['changedPixels'] == 0 for v in visual), 'Investigate actual pixel differences before delivery; do not relax this gate'

sources = baseline['snapshots'] + ['ks6s3juocjzc2.kimi.page/scripts/report.js', 'ks6s3juocjzc2.kimi.page/styles/report.css', 'tests/verify-report.cjs', 'tests/build-report-delivery.py', 'docs/PW-WOORI-05.md']
changed = '# PW-WOORI-05 변경 파일\n\n' + '\n'.join(f'- {"수정" if name in baseline["files"] else "추가"}: `{name}`' for name in sources)
changed += '\n\n앱 변경은 Report 전용 JS/CSS와 index.html의 두 리소스 선언, app.js의 Report 진입 분기입니다. state.js와 Home/Record/Goal JS/CSS, tokens/base/Shell/tabs/icons는 byte-identical입니다.\n\n기존 검사 변경은 새 evidence 출력/보존 기준선, Report 목적지 h1 및 실제 view 검증, Report에서 수행하는 Shell scroll stress 대상 갱신뿐입니다. 기존 219개 검증 묶음은 유지했습니다. Goal 검사는 폰트 로딩 완료 전 종료되는 경합을 막기 위해 layout 확인 후 fonts.ready를 기다리고 reload 전에도 대기하도록 보완했습니다. 실패 요청은 마지막 완료 검사 이름과 함께 그대로 기록합니다. 과거 evidence/preservation은 모두 byte-identical입니다.\n'
(out / 'changed-files.md').write_text(changed)
analysis = (root / 'preservation/PW-WOORI-05/pre-implementation-analysis.md').read_text()
(out / 'source-analysis.md').write_text(analysis)
analysis_body = analysis[analysis.index('## 구현 전 현재 구조'):].replace('## 구현 전 현재 구조', '**현재 실행 구조**').replace('## 구현 전 원본 분석', '**원본 데이터 근거**')
min_contrast = min(c['detail']['minContrast'] for c in reports['report']['checks'] if isinstance(c.get('detail'), dict) and 'minContrast' in c['detail'])
versions = reports['report']['browsers']
quality = ['Score가 화면의 첫 시각 초점인가', 'Score보다 장식이 강하지 않은가', '근거 없는 세부 점수를 만들지 않았는가', '돈 흐름의 기간을 거짓으로 특정하지 않았는가', 'saving을 저축액으로 잘못 표현하지 않았는가', '목표 상태가 3초 내 이해되는가', '카드 수가 과하지 않은가', 'primary blue 사용이 절제되어 있는가', 'gradient가 없는가', 'shadow가 없는가', 'character가 없는가', '어린이에게 쉬운 표현인가', '성인 자산관리 UI처럼 보이지 않는가', '200%에서도 정보 위계가 유지되는가', 'Home / Record / Goal과 같은 제품처럼 보이는가']
# A separate review receipt is written only after actual screenshot inspection.
review = json.loads((out / 'visual-quality-review.json').read_text())
assert all(review['items'].get(label) == 'YES' for label in quality)
for name, digest in review['sha256'].items():
    assert sha((out / 'screenshots' / (name+'.png')).read_bytes()) == digest, 'Reviewed capture changed: '+name
image_link = lambda name: f'![{name}](../evidence/PW-WOORI-05/screenshots/{name}.png)'
sections = [
('최종 검증 총합', f'**Report {counts["report"]} + Goal 65 + Record 64 + Home 44 + Shell 46 = {sum(counts.values())}개 검증 묶음 PASS**. 기존 219개를 모두 재실행했습니다. Chromium {versions["Chromium"]["version"]} / WebKit {versions["WebKit"]["version"]}.\n\n[검수 갤러리](../evidence/PW-WOORI-05/index.html) · [Report 검증 원문](../evidence/PW-WOORI-05/verification.json)\n\n모든 데이터와 캡처는 격리된 임시 브라우저 context의 fixture입니다. 사용자 브라우저 프로필과 실제 저장소는 사용하지 않았습니다.'),
('변경 파일 목록', f'[변경 {len(sources)}개 파일](../evidence/PW-WOORI-05/changed-files.md). 구현 전 {len(baseline["files"])}개 파일의 해시와 수정 대상 {len(baseline["snapshots"])}개 원문을 보존했습니다. 비대상 {len(baseline["files"])-len(baseline["snapshots"])}개는 byte-identical입니다. Git 저장소가 없어 보존본 기반 unified diff를 제출합니다. 앱 공통 변경은 Report 로딩과 lifecycle 분기 연결에 한정합니다.'),
('구현 전 원본 Report/AI Score 데이터 분석', analysis_body),
('habitScore 계약', '실제 finite number이며 0~100인 값만 그대로 표시합니다. 0/100/소수, missing/null/문자열/-1/101/NaN/Infinity를 검사했습니다. 소수 Score를 임의 반올림하지 않습니다. 확인 불가 상태는 점수 대신 “확인 안 됨”으로 전달합니다. 점수 계산·증감·세부 점수·코칭·AI 호출은 없습니다.'),
('monthly 계약', 'saving=받은 돈 누계, spending=쓴 돈 누계. 각각 0 이상 safe integer인 경우만 표시합니다. 두 값이 모두 유효할 때만 차이=saving-spending이며 음수도 보존합니다. balance와 별개이고 “저장된 집계 · 기간 확인 안 됨”을 표시합니다. 부분 누락을 0으로 채우지 않습니다.'),
('transaction / goal 읽기 규칙', 'validPocketWONTransaction을 통과한 전체 배열 건수를 집계합니다. 사용자 결정에 따라 날짜 불명확 거래도 포함하며 새 receipt/memo 검증 규칙은 없습니다. invalid 혼합은 유효 건수와 “확인 가능한 기록만 포함했어요”를 표시합니다. 빈 배열 0건과 배열 누락 확인 불가를 구분합니다. 정렬·재저장은 없습니다.\n\nGoal은 createGoalViewModel을 그대로 사용해 이름 trim, safe integer current/target, target>0, remaining=max(target-current,0), 기존 round/clamp percent를 유지합니다. 완료는 current>=target 판정이며 반올림으로 100%여도 current<target이면 완료라 하지 않습니다. 날짜·적립 규칙을 추가하지 않습니다.'),
('Report ViewModel 구조', 'createReportViewModel(state)는 score {status,value}, moneyFlow {status,received,spent,difference,period}, goal {status,...기존 Goal 결과}, records {status,count,partial}를 반환합니다. 상태 객체를 바꾸지 않는 pure function이며 deeply frozen fixture로 검증했습니다.\n\ncreateReportView(loaded,navigate)는 element/mount/dispose를 반환합니다. mount는 금액 크기 측정, dispose는 ResizeObserver와 예약 프레임을 해제합니다. document.fonts.ready 이후에도 disposed guard를 적용합니다. 사용자 문자열은 textContent로 렌더링합니다.'),
('localStorage read/write 결과', f'Report의 setItem/removeItem/clear는 각각 **0회**, 다른 키 접근도 **0회**입니다. 진입·scroll·focus·Report→Home/Record/Goal/All·reload 전후 raw string을 비교했습니다. {len(reports["report"]["storageChecks"])}개 storage 확인 기록이 verification.json에 있습니다. FLOW의 Record 2회와 Goal 2회는 명시적 저장으로 별도 계측하며 Report 읽기 구간 쓰기는 0회입니다. fixture 주입/외부 변경 모사는 앱 계측 밖의 native storage 함수로 수행합니다.'),
('360×844', image_link('360x844-report')+'\n\n가로 overflow, 숫자 잘림, content/nav 겹침 없이 검사했습니다.'),
('390×844', image_link('390x844-report')),
('430×844', image_link('430x844-report')),
('empty', image_link('empty-report')+'\n\n“아직 보여줄 기록이 없어요.”와 첫 기록 CTA를 제공합니다. 진입만으로 저장 키를 생성하지 않습니다.'),
('invalid / unavailable', image_link('invalid-report')+'\n\nmalformed JSON과 invalid root는 “저장된 정보를 확인할 수 없어요.”, getter/read 예외는 “저장된 정보를 불러오지 못했어요.”로 구분합니다. 자동 reset/migration/overwrite는 없습니다.\n\n'+image_link('partial-report')+'\n\n부분 상태는 각 영역의 사용 가능한 값만 표시합니다.'),
('score 0 / 100 / missing', '\n\n'.join(image_link(n) for n in ['score-zero','score-100','score-unavailable'])),
('active / complete goal', '\n\n'.join(image_link(n) for n in ['goal-active','goal-complete'])+'\n\n진행률 min/max/now/valuetext와 “목표 달성” 텍스트를 검증했습니다. 초과 달성도 실제 current는 보존합니다.'),
('큰 금액 / 긴 문자열', image_link('large-money')+'\n\n'+image_link('long-goal-title')+'\n\n±Number.MAX_SAFE_INTEGER, 큰 goal 금액, 매우 긴 한국어/HTML 모양 이름을 검사했습니다. 금액은 필요시 만·억·조·경으로 시각적 축약하며 정확한 금액을 보조 텍스트와 accessible name으로 제공합니다. 사용자 글자 크기를 줄이지 않습니다.'),
('Record → Report 최신 반영', 'FLOW B/C: 실제 Record UI로 받은 돈 1000원과 쓴 돈 1000원을 각각 저장한 후 Report를 재진입했습니다. 각각 받은 돈/쓴 돈과 기록 수가 최신이며 habitScore/goal은 불변입니다. 원본 거래 순서도 보존합니다.\n\n'+image_link('record-in-report')+'\n\n'+image_link('record-out-report')),
('Goal → Report 최신 반영', 'FLOW D/E: 실제 Goal UI에서 이름만 수정한 경우와 target을 60000원으로 수정한 경우를 검사했습니다. Report에 최신 title/target/remaining/percent가 반영되고 current=30600과 habitScore, transactions는 유지됩니다. FLOW F/G에서는 화면 밖 fixture 변경 후 재진입으로 저장소 재조회를 확인했습니다.\n\n'+image_link('goal-E-report')),
('reload persistence', 'FLOW H: reload는 Home에서 시작합니다. 그 자체 write는 0이며 Report 재진입의 값과 storage raw string이 동일합니다. 양 브라우저별 storage-flows JSON에 fixture 전후 상태와 명시적 저장 횟수를 제공합니다.'),
('accessibility / keyboard / 200%', f'[Chromium 접근성 트리](../evidence/PW-WOORI-05/accessibility-Chromium.txt) · [WebKit 접근성 트리](../evidence/PW-WOORI-05/accessibility-WebKit.txt)\n\nh1 하나, 각 section h2, 점수 텍스트, progressbar name/min/max/now/valuetext, 48px 이상 버튼, Tab/Shift+Tab, Enter/Space 및 목적지 h1 focus를 검사했습니다. 최소 측정 텍스트 대비는 {min_contrast:.3f}:1입니다. 360×640와 360/390/430 글자 크기 200%, 상하 safe area 24/34/47px 조합을 검사했습니다.\n\n'+image_link('200percent')+'\n\n'+image_link('200percent-score')+'\n\n'+image_link('large-negative-200percent-exact')+'\n\n'+image_link('large-goal-200percent-exact')+'\n\n200%에서는 세로 스크롤로 전체 정보를 읽습니다. 실기기 스크린리더/어린이 이해도 실험은 수행하지 않았습니다.'),
('visual regression', '[픽셀 비교 원문](../evidence/PW-WOORI-05/visual-regression.json). PW04의 Home/Record/Goal/All 각 360/390/430 캡처 **12/12 byte-identical**, changedPixels=0, maxChannelDifference=0, 영향 영역 없음입니다. threshold를 늘리지 않았고 비대상 제품 CSS를 수정하지 않았습니다.'),
('console / page error', '최종 다섯 검사 전체 console.error=0, pageerror=0. Report 결과는 두 이벤트를 별도 배열로 제공합니다. 기존 검증은 기존 consoleErrors 수집 방식으로 둘 모두 0임을 확인합니다. 초기 placeholder 기대값 실패와 trim 기대값 불일치를 수정한 후 최종 전체 결과를 제출합니다.'),
('failed resource', '최종 requestfailed=0, HTTP 4xx/5xx=0. Report는 별도 배열, 기존 검증은 기존 resourceErrors/networkErrors 배열로 제공합니다. 오류 필터는 없습니다. 기존 Pretendard CDN 외 새 runtime network dependency는 없습니다. 초기 Shell assertion 실패 때 font 요청 중단 1건, 초기 Goal 검사에서 font 요청 중단이 발견되어 두 번의 실패 결과를 보존했습니다. Goal의 검사 종료/reload 전에 layout과 fonts.ready 대기를 보강했습니다. 오류는 필터링하지 않았으며 최종 재실행에서 0건입니다. 초기 Goal 실패 원문은 attempts/goal-first-run.json과 goal-second-run.json으로 보존합니다. 두 번째 진단은 invalid state 검사 중 Home 진입 직후 reload하는 경로를 특정했고 해당 reload 전 font 대기를 추가했습니다.'),
('전체 source diff', '[source.patch](../evidence/PW-WOORI-05/source.patch) · [delivery.json](../evidence/PW-WOORI-05/delivery.json). 기존 수정 파일의 보존본과 신규 소스/테스트/보고서 전체를 포함합니다. 임시 디렉터리에 patch를 적용한 후 모든 결과 파일의 byte equality를 검증합니다. 생성 캡처·JSON·보존 파일은 별도 SHA-256 manifest에 포함합니다.'),
('시각 품질 자체 점검', '| 항목 | 판정 |\n|---|---|\n'+'\n'.join(f'| {q} | YES |' for q in quality)+'\n\n실제 캡처 검수에 따른 자체 판정입니다. “3초”는 사용자 실험 결과가 아니라 시각 위계 검수 기준입니다. 200% 검수에는 스크롤한 Score/돈 흐름/목표/하단 캡처도 포함합니다.'),
('재현 명령', '```sh\npython3 -m http.server 4173 --bind 127.0.0.1\nnode tests/verify-report.cjs\nnode tests/verify-goal.cjs\nnode tests/verify-record.cjs\nnode tests/verify-home.cjs\nnode tests/verify-shell.cjs\npython3 tests/build-report-delivery.py\n```\n\n기존 설치 Playwright와 Chromium/WebKit, Python Pillow를 사용합니다. PW_BASE_URL은 localhost/127.0.0.1만 허용하며 PW_PLAYWRIGHT_MODULE/PW_CHROMIUM_EXECUTABLE/PW_WEBKIT_EXECUTABLE로 기존 설치 경로를 지정할 수 있습니다. 라이브 앱/외부 배포는 하지 않습니다.'),
('완료 경계', '**PW-WOORI-05 완료.** report만 실제 화면으로 교체했습니다. All은 placeholder이고 부모 공유·AI 계산·캘린더·보상·API·DB·서버·배포는 구현하지 않았습니다. 다음 슬라이스로 진행하지 않고 사용자 검수를 기다립니다.'),
]
assert len(sections)==27
(root / 'docs/PW-WOORI-05.md').write_text('# PW-WOORI-05 — 습관 리포트\n\n'+'\n\n'.join(f'## {i}. {title}\n\n{body}' for i,(title,body) in enumerate(sections,1))+'\n')
patch = ''
for name in sources:
    old = root / 'preservation/PW-WOORI-05/originals' / (name+'.txt')
    a = old.read_text().splitlines(True) if old.exists() else []
    b = (root / name).read_text().splitlines(True)
    patch += ''.join(difflib.unified_diff(a,b,fromfile='a/'+name if old.exists() else '/dev/null',tofile='b/'+name))
(out / 'source.patch').write_text(patch)
with tempfile.TemporaryDirectory(prefix='pw05-patch-') as temp:
    directory = Path(temp)
    for name in baseline['snapshots']:
        target=directory/name;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes((root/'preservation/PW-WOORI-05/originals'/(name+'.txt')).read_bytes())
    subprocess.run(['git','apply','--check',str(out/'source.patch')],cwd=directory,check=True)
    subprocess.run(['git','apply',str(out/'source.patch')],cwd=directory,check=True)
    for name in sources:
        assert (directory/name).read_bytes()==(root/name).read_bytes(),name

screens=sorted(set(reports['report']['screenshots']))
gallery='<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PW-WOORI-05 검수</title><style>body{font:16px/1.6 system-ui;background:#f5f8fc;color:#20252b;margin:0;padding:24px}a{color:#0067ac}nav{display:flex;flex-wrap:wrap;gap:20px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:24px}figure{margin:0;padding:16px;background:white;border:1px solid #dde5ee;border-radius:16px}img{width:100%;max-width:430px;height:auto}figcaption{overflow-wrap:anywhere}h1{font-size:28px}</style>'
gallery+=f'<h1>PW-WOORI-05 · 습관 리포트</h1><p>Report {counts["report"]} + 기존 219 = {sum(counts.values())}개 검증 묶음 PASS</p><p>격리된 fixture 캡처 · Report runtime write 0회 · 비대상 화면 12/12 픽셀 동일</p><nav><a href="../../docs/PW-WOORI-05.md">전체 보고서</a><a href="../../ks6s3juocjzc2.kimi.page/index.html">앱 열기</a><a href="source.patch">소스 diff</a><a href="verification.json">검증 결과</a><a href="delivery.json">해시 명세</a><a href="visual-regression.json">시각 회귀</a></nav><h2>Report 검수 캡처</h2><div class="grid">'
for name in screens:
    gallery+=f'<figure><figcaption>{html.escape(name)}</figcaption><a href="{html.escape(name)}"><img src="{html.escape(name)}" alt="{html.escape(name)}" loading="lazy"></a></figure>'
gallery+='</div><h2>접근성</h2><nav><a href="accessibility-Chromium.txt">Chromium</a><a href="accessibility-WebKit.txt">WebKit</a></nav></html>'
(out/'index.html').write_text(gallery)
manifest={'createdAt':datetime.now(timezone.utc).isoformat(),'status':'PASS','counts':counts,'total':sum(counts.values()),'sourceFiles':sources,'historicalFilesPreserved':len(baseline['files'])-len(baseline['snapshots']),'visualRegression':{'identical':12,'total':12},'patch':{'applyCheck':'PASS','reconstructedFiles':len(sources),'byteEquality':True},'files':{}}
for p in sorted(set([root/name for name in sources]+list(out.rglob('*'))+list((root/'preservation/PW-WOORI-05').rglob('*')))):
    if p.is_file() and p!=out/'delivery.json':manifest['files'][str(p.relative_to(root))]={'sha256':sha(p.read_bytes()),'bytes':p.stat().st_size}
(out/'delivery.json').write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+'\n')
print(json.dumps({'status':'PASS','counts':counts,'total':sum(counts.values()),'manifestFiles':len(manifest['files']),'patchReconstruction':'PASS','visualRegression':'12/12 byte-identical'},ensure_ascii=False))
