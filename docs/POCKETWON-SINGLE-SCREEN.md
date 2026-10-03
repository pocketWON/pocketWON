# PocketWON Single-Screen UX 재구축

기존 Vanilla HTML/CSS/JavaScript 앱을 하나의 `100dvh` 작업 화면으로 재구성했습니다. 구현은 `ks6s3juocjzc2.kimi.page/`, 로컬 미러는 `deployments/PW-WOORI-05/site/out/`입니다. 금융 데이터와 계산을 유지하면서 긴 화면을 페이지·상태 교체로 나눴습니다.

## 화면과 높이 배분

하단 메뉴는 **홈 / 기록 / 전체**입니다. 목표와 리포트는 Home 카드와 전체 메뉴에서 엽니다. 기존 Home·Record·Goal·Report·All의 의미를 유지하며 URL이나 브라우저 history를 변경하지 않습니다. 기록 페이지, 리포트 항목, 입력 초안은 세션 메모리에만 둡니다.

| 화면 | 현재 구조 |
| --- | --- |
| Home | 저장된 잔액 Hero + 기록하기·기록 내역·목표·리포트 2×2 카드 |
| 기록 | 잔액 + 높이에 맞춘 유한 개수 목록 + 이전/다음 페이지 |
| 기록 상세 | 정확한 금액 + 분류·날짜·메모를 끝까지 읽는 텍스트 페이지 |
| 목표 | 현재/목표/남은 금액, 진행률, 수정·기록 진입점; 긴 이름은 별도 읽기 화면 |
| 리포트 | 습관 / 돈 흐름 / 목표 중 한 항목만 표시 |
| 전체 | 기존 네 목적지의 카드 전체가 동작하는 메뉴 |

Shell은 Header / `minmax(0, 1fr)` 본문 / Navigation의 Grid입니다. safe area는 Shell에서 한 번 반영하고, 화면과 패널은 `min-width: 0`, `min-height: 0`으로 할당된 공간을 사용합니다. 기존 본문 스크롤과 큰 하단 보정 여백, greeting, stagger, 카드별 추가 pill CTA를 제거했습니다.

기본 Header/Nav는 56/64px이며 높이 667px 이하에서는 48/56px, 화면 gutter/gap은 12px입니다. **320×568, safe area 0 기준**으로 Header 48px + 본문 464px + Nav 56px입니다. Home 본문은 상하 여백 24px, Hero 약 144px, 간격 12px, Core Grid 약 284px로 배분하며 카드 두 행은 각각 약 136px입니다. safe area가 생기면 그만큼 usable height를 먼저 줄입니다.

큰 화면에서는 Hero를 최대 208px로 제한하고 남은 높이를 Core Grid에 배분합니다. 짧은 가로 화면은 Home의 좌우 배치, 기록의 요약/목록 분리, 리포트의 측면 항목 선택 등으로 재배치합니다. 핵심 터치 영역은 48px 이상을 유지합니다. 그림이나 보조 설명을 줄이는 것이 금융 정보·입력·행동을 자르는 대안이 되지 않도록 전체 컨트롤과 패널 경계를 검증합니다.

## 데이터와 입력 흐름

Home은 **지금 남은 용돈**을 표시합니다. 저장 데이터에 없는 주간 예산·기간·새 점수를 만들지 않습니다. 큰 금액은 필요할 때 축약하고 정확한 금액을 accessible label과 caption으로 제공합니다. 목록의 짧은 요약은 상세 진입점을 통해 전체 메모·분류·날짜·정확한 금액으로 이어집니다. 목록은 실제 가용 높이에 따라 1~6개를 보여줍니다. 크기가 바뀌면 포커스된 기록을 기준으로 페이지와 포커스를 복원하며, 포커스가 없으면 첫 표시 기록을 기준으로 삼습니다. `ResizeObserver`의 재계산은 다음 animation frame에 실행해 목록 교체와 크기 측정을 조정합니다.

기록 입력은 받은/쓴 돈 선택 → 금액 → 지출 분류 → 선택 메모 → 확인 순서입니다. 받은 돈은 지출 분류 단계를 생략합니다. 목표 입력은 이름 → 목표 금액 → 확인입니다. Native `<dialog>`에 현재 단계만 배치하고 다음 단계에서 내용을 교체합니다. Escape/닫기, 이전 단계, 포커스 복귀와 trap을 유지하며 입력 중 Enter·IME 조합으로 저장하지 않습니다. Home의 기록하기에서 시작한 입력을 취소하면 세션 안의 복귀 route를 사용해 Home의 **기록하기** 카드로 포커스를 돌립니다.

키보드가 viewport를 줄인 상태가 다음 단계까지 잠시 유지되어도 기록 입력을 이어갈 수 있습니다. 짧은 dialog에서는 지출 분류를 3열·48px 행으로 배치하고, 확인 내용을 정확한 텍스트 페이지로 나눕니다. 텍스트 페이지는 단계 변경과 닫기에서 dispose하며 저장 실패 시 초안을 유지합니다.

최종 저장 버튼을 활성화할 때 최신 저장 상태를 다시 읽고 유효성을 검사합니다. 기록은 기존 `applyTransaction`, 목표는 기존 `applyGoalUpdate`를 사용합니다. 목표를 수정해도 모은 돈을 늘리지 않으며, 이미 바뀐 목표 정보는 충돌로 처리합니다. 실패하면 초안과 원본 저장 문자열을 유지하고 같은 화면에서 다시 시도할 수 있습니다. 확인된 저장 한 번 뒤에만 결과 화면과 성공 Sprite를 표시합니다.

리포트의 `createReportViewModel`은 기존 코드와 동일합니다. 소수 점수와 음수 돈 흐름 차이를 그대로 표시하고, 집계 기간이 불명확하면 이를 명시합니다. 돈 흐름 항목에 기록 수와 확인 가능한 기록만 포함했다는 안내를 함께 표시합니다. `empty` / `invalid` / `unavailable`를 구분하고 **다시 불러오기**는 저장을 고치거나 덮어쓰지 않는 읽기 재시도입니다. 긴 목표 이름은 리포트 안에서도 별도 텍스트 페이지로 끝까지 읽습니다.

기존 `pocketwon_demo_v1` key/schema와 금융 계산을 유지합니다. 진입, 항목 변경, 페이지 이동, 읽기 재시도, Sprite 재생은 저장하지 않습니다. 새 API·인증·네트워크 저장 계층은 없습니다.

## Sprite와 접근성

59개 개별 생성 원본과 11개 시트, 포스터, source provenance, 기존 `createPocketWONSprite` 플레이어를 보존했습니다. 384×384 정사각 셀을 왜곡하거나 프레임별로 재배치하지 않고, 새 카드의 크기에 맞춰 동일한 비율로 표시합니다. 금융 의미와 조작은 DOM이 담당하며 Sprite는 `aria-hidden`, `pointer-events: none`입니다.

앱은 현재 화면의 모션 세션 하나를 소유합니다. 화면 교체에서는 이전 세션과 view를 dispose하고 새 DOM의 세션을 만든 뒤 mount합니다. 리포트 항목·기록 상태 교체는 `refresh()`로 제거된 플레이어를 정리하고 새 플레이어를 등록합니다. 액션 최대 1개 + idle 최대 1개, 성공 → 사용자 동작 → 진입 → idle 우선순위, 숨겨진 탭·열린 dialog·화면 밖 pause, reduced-motion의 정적 포스터를 유지합니다. 카드 등장은 위치 이동이나 개별 지연 없이 opacity fade를 함께 재생합니다. 목표 자동 축하는 반올림한 진행률이 아니라 정확한 `current >= target`으로 결정합니다.

Root 글꼴이 20px를 넘거나 viewport 폭이 300px 미만, 높이가 320px 미만, 또는 폭 500px 미만이면서 높이 480px 미만이면 `.pw-accessible` 재배치를 적용합니다. 마지막 조건은 desktop 확대 등으로 짧아진 좁은 viewport를 지원합니다. 필수 portrait·landscape 크기는 일반 no-scroll 배치를 유지합니다. 200% 글자 확대와 작은 viewport에서는 자연스러운 세로 읽기와 dialog 스크롤을 허용합니다. Body의 최소 폭을 0으로 풀고 Header 열을 터치 영역 크기에 맞추며 목표 행동 버튼을 세로로 쌓고 label 줄바꿈을 허용합니다. 접근성 dialog에서 Tab/Shift+Tab 순환으로 포커스된 버튼이 화면 밖에 있으면 세로 스크롤로 보이게 합니다. 확대를 막거나 글자를 축소해 no-scroll을 강제하지 않습니다. 일반 지원 화면의 no-scroll과 확대·좁은 화면의 기능 접근성을 별도로 검증합니다.

## 검증과 보존

```sh
python3 -m http.server 4173 --bind 127.0.0.1
node tests/verify-business-contracts.cjs
node tests/verify-single-screen.cjs
node tests/verify-record-stage.cjs
node tests/verify-record-keyboard.cjs
node tests/verify-sprite-stage.cjs
```

Browser suite는 Chromium/WebKit의 독립된 컨텍스트와 합성 저장 데이터만 사용합니다. `PW_BASE_URL`, `PW_PLAYWRIGHT_MODULE`, `PW_CHROMIUM_EXECUTABLE`, `PW_WEBKIT_EXECUTABLE`로 환경을 바꿀 수 있습니다. `PW_EVIDENCE_ROOT`를 지정하면 새 증거 디렉터리를 선택하며, 새 browser suite의 기본 출력도 실행 시각별 디렉터리입니다.

| 검증 | 확인 결과 / 증거 |
| --- | --- |
| 순수 금융·저장 계약 | 29개 그룹 PASS; 원본 함수와 합성 fixture의 계산·유효성·읽기/쓰기 경계 · [business-contracts.txt](../evidence/SINGLE-SCREEN/business-contracts.txt) |
| 앱 전체 browser matrix | 최종 392개 검사 PASS, geometry 380개, 오류 0 · [verification.json](../evidence/SINGLE-SCREEN/run-2026-10-03T09-35-08-376Z/verification.json) |
| 기록 추가 검증 | 20개 검사 PASS, 오류 0 · [verification.json](../evidence/SINGLE-SCREEN/record-stage-2026-10-03T09-34-37-253Z/verification.json) |
| 기록 키보드 높이 | VisualViewport 260px 유지, 20개 그룹/geometry 84개 PASS; 입력·단계 전환 경계 실패와 오류 0 · [verification.json](../evidence/SINGLE-SCREEN/record-vv260-2026-10-03T09-36-37-874Z/verification.json) |
| Sprite stage | 32개 검사 PASS, 오류 0 · [verification.json](../evidence/SINGLE-SCREEN/sprite-stage-2026-10-03T09-12-10-603Z/sprites/verification.json) |
| Sprite 실제 픽셀 경계 | 전체 프레임 합집합 252개 장면/448개 플레이어 + 일반 모션 72개 장면/128개 플레이어; 영역 이탈·글자 충돌·오류 0 · [검증 설명](../evidence/SINGLE-SCREEN/art-bounds/README.md) |
| 목표 추가 검증 | 24개 그룹, geometry 101개, 오류 0 · [results.json](../evidence/SINGLE-SCREEN/goal-check/results.json) |
| 리포트 추가 검증 | Chromium/WebKit 66개 geometry·상태·전체 이름 읽기 검사 + 20개 모션 검사 PASS; 실행 로그 확인, 별도 파일 산출 없음 |
| 접근성 재배치 | 60개 사례, 잘림·접근 불가 행동·실행 오류 0 · [read-only-findings.json](../evidence/SINGLE-SCREEN/accessibility-final/read-only-findings.json) |
| 기록 확인 페이지 접근성 | 최종 60개 경계·컨트롤 검사 + 36개 정확한 확인 내용 복원, findings·오류 0 · [검증 설명](../evidence/SINGLE-SCREEN/accessibility-record-pager-after-focus-fix/README.md) / [read-only-findings.json](../evidence/SINGLE-SCREEN/accessibility-record-pager-after-focus-fix/read-only-findings.json) |
| 짧은 확대 viewport | 480×360, 두 엔진 14개 검사 PASS, 오류 0 · [verification.json](../evidence/SINGLE-SCREEN/zoom-fallback-2026-10-03T09-27-13-258Z/verification.json) |
| 로컬 미러·보존 | 앱/미러 50개 파일 일치, 원본·이전 증거 1,168개 해시 보존 PASS · [delivery-integrity.json](../evidence/SINGLE-SCREEN/delivery/delivery-integrity.json) |

앱 matrix는 Chromium 153.0.8010.12 / WebKit 26.5에서 320×568, 360×640, 375×667, 390×844, 393×852, 412×915, 430×932와 safe area, 일반/감소 모션, 1024px desktop, 667×375·844×390 가로 화면을 검사했습니다. 문서 높이만 검사하지 않고 본문·현재 패널의 `scrollHeight/scrollWidth`, 텍스트와 컨트롤 경계, 목록/상세/확인/결과 상태도 검사합니다. 두 엔진의 392개 검사가 통과했고 스크린샷 60개를 남겼습니다.

리포트 추가 검증은 320×568의 20/34px safe area, 667×375, 412×915에서 최대 안전 정수·음수 차이·정밀 소수 점수·부분/빈/손상/읽기 실패 데이터를 확인했습니다. 모션 검사에서는 항목 교체 후 플레이어 등록과 단일 세션, 숨김/reduced-motion 중단과 복귀를 확인했습니다. page error와 저장 쓰기는 0개입니다.

Sprite 경계 검증은 셀 사각형 대신 모든 프레임의 실제 alpha 픽셀 합집합을 카드·패널과 대조했습니다. 1 CSS px 허용 오차 안에서 영역을 유지하며 주변 금융 정보·label과 겹치지 않았습니다. [원본 alpha와 해시](../evidence/SINGLE-SCREEN/art-bounds/source-alpha.json), [전체 장면 경계](../evidence/SINGLE-SCREEN/art-bounds/rendered-boundaries.json), [실제 성공 모션 경계](../evidence/SINGLE-SCREEN/art-bounds/live-success-boundaries.json)를 보존합니다.

키보드 높이는 **합성 VisualViewport**로 검사했습니다. 기록 키보드 suite는 260px 높이를 유지한 종류·금액·분류·메모·확인 단계와 오류·재시도·중복 저장 방지를 확인합니다. 물리 모바일 키보드·실기기 screen reader 검증을 수행했다고 주장하지 않습니다.

이전 실행 증거와 문서는 그대로 두고, 이번 시작 상태와 원본 테스트는 [baseline](../evidence/SINGLE-SCREEN/baseline/manifest.json)에 보존했습니다. 기존 `verify-home/record/goal/report/shell/reference-sync` 진입점은 현재 금융 계약과 화면 suite를 실행하는 호환 launcher이며, 원본 테스트 snapshot도 baseline에 남깁니다.

로컬 미러 동기화 명령:

```sh
python3 scripts/sync-sprite-mirror.py --evidence-root evidence/SINGLE-SCREEN/delivery
python3 scripts/verify-single-screen-delivery.py --evidence-root evidence/SINGLE-SCREEN/delivery
```

동기화는 Sprite뿐 아니라 현재 앱의 HTML/CSS/JS/font/최종 이미지 전체를 `deployments/PW-WOORI-05/site/out/`에 복사하고 SHA-256을 대조합니다. 최종 접근성 포커스 수정 후 다시 동기화한 [미러 명세](../evidence/SINGLE-SCREEN/delivery/mirror-manifest.json)의 50개 파일이 일치했습니다. 개발용 `sprite-source/`는 제외하며 이전 공개 배포 메타데이터·압축 파일·증거를 덮어쓰지 않습니다. 이어서 실행한 delivery verifier는 보존 명세의 원본·이전 증거 파일 1,168개와 현재 앱/미러의 전체 파일 집합·최종 SHA-256을 대조해 [PASS 결과](../evidence/SINGLE-SCREEN/delivery/delivery-integrity.json)를 기록했습니다. 공개 배포는 수행하지 않았습니다.
