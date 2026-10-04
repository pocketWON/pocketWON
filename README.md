# PocketWON / 포켓WON

Vanilla HTML/CSS/JavaScript 금융 기록 앱입니다. 현재 홈은 상단 헤더 없이 **잔액 Hero·3분할 상태 → 저축 챌린지/6색 도넛 → 주간 막대 차트 → AI 인사이트 → 홈/리포트/포켓WON 로고/목표/전체** 순서로 표시합니다. 중앙 로고는 기록 추가 버튼이고, 리포트에는 보고서 모양 아이콘을 사용합니다. 세로 스크롤은 유지하면서 스크롤바를 숨깁니다. 이미지에서 추출한 파랑·네이비·파스텔과 기존 캐릭터 Sprite를 사용하며, 주간 저축 이력·AI 서비스가 없는 영역은 미연동 상태를 표시합니다.

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

- [실행 앱](http://127.0.0.1:4173/ks6s3juocjzc2.kimi.page/index.html)
- [Golden Master 최종 구현·검증 보고서](docs/POCKETWON-PIXEL-FIDELITY.md)
- [Golden Master 비교·오버레이 갤러리](evidence/PIXEL-FIDELITY/index.html)

홈은 대표 390×844에서 한 화면에 들어갑니다. 짧은 화면과 safe area로 공간이 부족하면 카드 비율을 유지하고 세로 스크롤을 허용합니다. 초기 Golden Master 검증은 양 브라우저 552개 보고 항목과 대시보드 148개 geometry case를 통과했습니다. 이후 사용자 요청으로 헤더와 캐릭터 옆 문구·강조선을 제거하고 하단 아이콘을 수정했습니다. [최신 화면](evidence/REPORT-DOCUMENT-ICON/chromium-home.png) · [최신 대시보드 검증](evidence/MAIN-PUSH/dashboard/verification.json) · [헤더 제거·화면 복귀 검증](evidence/MAIN-PUSH/header/verification.json) · [최신 로컬 미러 검증](evidence/MAIN-PUSH/delivery/delivery-integrity.json). 아래 이전 보고서는 당시 구현 기록으로 보존합니다.

- [Reference Dashboard 구현·검증 보고서](docs/POCKETWON-REFERENCE-DASHBOARD.md)
- [Reference Dashboard 비교 갤러리](evidence/REFERENCE-DASHBOARD/index.html)
- [Full Product Shell 보고서](<docs/POCKETWON-FULL-PRODUCT-SHELL.md>)
- [Single-Screen 구조·검증 보고서](docs/POCKETWON-SINGLE-SCREEN.md)
- [Single-Screen 검증 갤러리](evidence/SINGLE-SCREEN/index.html)
- [Sprite 재생·프레임 검수](http://127.0.0.1:4173/evidence/SPRITE-MOTION/index.html)
- [기존 Sprite 구현·검증 보고서](docs/POCKETWON-SPRITE-MOTION.md)
- [이전 Reference UI 보고서](docs/POCKETWON-REFERENCE-SYNC.md)
- [프레임 제작과 참조 규칙](sprite-source/GENERATION.md)
- [시트·압축·해시 명세](evidence/SPRITE-MOTION/assets.json)

일반 지원 화면에서는 Header / Hero·작업 영역 / Navigation을 `100dvh` 안에 배치합니다. 320×568부터 검증하며 safe area와 짧은 가로 화면도 고려합니다. Root 글꼴이 20px를 넘는 글자 확대, 폭 300px 미만, 높이 440px 미만, 또는 폭 500px 미만이면서 높이 620px 미만이면 읽기와 기능 접근성을 위해 재배치와 세로 스크롤을 허용합니다. URL은 바꾸지 않으며, Full Product Shell부터 route/단계/포커스만 담는 UI 전용 browser history를 사용합니다. 사용자 입력·사진·금융 payload는 history에 넣지 않습니다.

저장은 마지막 확인 단계에서 사용자가 기록·목표 저장 버튼을 활성화할 때만 기존 `pocketwon_demo_v1`에 발생합니다. 저장 직전 최신 상태를 다시 읽고 검사하며, 실패하면 초안을 유지합니다. 진입·항목/페이지 이동·읽기 재시도·모션은 쓰지 않습니다. 금융 계산·데이터 스키마·오류·포커스 처리를 유지하고 확인된 저장 뒤에만 결과와 성공 모션을 표시합니다. 목표 자동 축하는 정확한 `current >= target` 상태에 한해 앱 세션당 한 번 실행합니다.

Full Product Shell은 AI 9개와 비AI 22개 제품 영역을 상태·입력·확인 UI로 연결합니다. 실제 AI/OCR/API/서버/계정/푸시/은행/결제는 없습니다. 새 초안·설정·약속은 메모리에만 있으며, 기본 모드에는 fixture가 나오지 않습니다. 로컬 [개발용 Preview](http://127.0.0.1:4173/ks6s3juocjzc2.kimi.page/index.html?preview=1)에서 상태를 선택할 수 있고 이 모드에서는 원래 기록·목표 저장도 차단합니다. `?aiPreview=1` 별칭도 지원합니다.

현재 검증 진입점:

```sh
node tests/verify-business-contracts.cjs
node tests/verify-dashboard-data.cjs
PW_EVIDENCE_ROOT=evidence/PIXEL-FIDELITY/new-run node tests/verify-dashboard.cjs
node tests/verify-header-scroll.cjs
node tests/verify-habit-score.cjs
node tests/verify-single-screen.cjs
node tests/verify-record-stage.cjs
node tests/verify-record-keyboard.cjs
node tests/verify-sprite-stage.cjs
node tests/verify-feature-contracts.cjs
node tests/verify-ai-shell.cjs
node tests/verify-product-shell.cjs
node tests/verify-product-flows.cjs
node tests/verify-product-edge-cases.cjs
node tests/verify-feature-accessibility.cjs
```

금융 계약 suite는 Node.js만 사용하고, 화면·Sprite suite는 위 로컬 서버와 기존 Playwright·Chromium·WebKit을 사용합니다. browser suite는 독립된 컨텍스트와 합성 데이터로 실행하며 기본 증거 디렉터리는 `evidence/SINGLE-SCREEN/` 아래 실행 시각별로 생성됩니다. `PW_EVIDENCE_ROOT`, `PW_BASE_URL`, `PW_PLAYWRIGHT_MODULE`, `PW_CHROMIUM_EXECUTABLE`, `PW_WEBKIT_EXECUTABLE`로 출력과 실행 환경을 지정할 수 있습니다. 기존 테스트 진입점은 현재 suite로 연결하며 원본 snapshot은 [이번 작업 baseline](evidence/SINGLE-SCREEN/baseline/manifest.json)에 보존합니다. 상세 결과와 검증 한계는 구조 보고서에 기록합니다. 모바일 키보드 검사는 합성 VisualViewport이며 물리 기기 검증은 수행하지 않았습니다.

Sprite는 개별 AI 원본 59개를 11개 시트로 패킹한 기존 에셋을 재사용합니다. 금융 정보·버튼·입력은 DOM에 남기고, 장식 Sprite는 동일한 정사각 셀로 재생합니다. 현재 화면의 모션 세션 하나가 플레이어 정리와 재등록을 담당하며 액션 1개 + idle 1개 예산, dialog·숨김 중 pause와 reduced-motion 포스터를 유지합니다. 새 앱 런타임 의존성은 없습니다.

필요할 때 Sprite를 원본에서 다시 패킹합니다.

```sh
python3 scripts/build-sprites.py
```

Pillow 패커는 512px 원본을 384px 셀로 패킹하고 실제 픽셀·alpha·해시를 검증합니다. 이번 작업의 로컬 미러 동기화는 새 증거 위치를 지정합니다.

```sh
python3 scripts/sync-sprite-mirror.py --evidence-root evidence/FULL-PRODUCT-SHELL/delivery
python3 scripts/verify-single-screen-delivery.py --evidence-root evidence/FULL-PRODUCT-SHELL/delivery
```

Full Product Shell의 [delivery 검증](<evidence/FULL-PRODUCT-SHELL/delivery/delivery-integrity.json>)은 앱/미러 74개 파일 일치와 과거 1,168개 해시 보존을 확인했습니다. [검증 갤러리](<evidence/FULL-PRODUCT-SHELL/index.html>)와 [전체 변경 파일](<evidence/FULL-PRODUCT-SHELL/file-inventory.json>)을 제공합니다.

미러는 Sprite뿐 아니라 앱의 HTML/CSS/JS와 서비스 에셋 전체를 `deployments/PW-WOORI-05/site/out/`으로 동기화하고 SHA-256을 대조합니다. 최종 접근성 수정 후 재동기화한 [delivery 검증](evidence/SINGLE-SCREEN/delivery/delivery-integrity.json)은 앱/미러 50개 파일 일치와 원본·이전 증거 1,168개 해시 보존을 확인했습니다. 개발용 `sprite-source/`는 포함하지 않습니다. 이전 공개 배포 메타데이터·압축 파일·검수 증거를 보존했으며 공개 배포는 수행하지 않았습니다.
