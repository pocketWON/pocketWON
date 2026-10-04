# PocketWON / 포켓WON

Vanilla HTML/CSS/JavaScript 금융 기록 앱입니다. 현재 홈은 상단 헤더 없이 **잔액 Hero·3분할 상태 → 저축 챌린지/용돈 대비 구매 도넛 → 최소 지출일 왕관이 있는 주간 막대 → 습관 점수·AI 인사이트 → 홈/리포트/포켓WON 로고/목표/전체** 순서로 표시합니다. 중앙 로고는 기록 추가 버튼이고, 리포트에는 보고서 모양 아이콘을 사용합니다. 앱은 한 뷰포트를 채우며 문서 스크롤 없이 표시합니다. 모든 탭의 하단바는 84px로 고정됩니다. 이미지에서 추출한 파랑·네이비·파스텔과 기존 캐릭터 Sprite를 사용하며, 기본 접속에서는 가상 거래·잔액·목표·AI 예시를 표시합니다. ‘전체 → 실제 기록 보기’로 기존 로컬 데이터에 돌아갈 수 있습니다.

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

- [실행 앱](http://127.0.0.1:4173/ks6s3juocjzc2.kimi.page/index.html)
- [Golden Master 최종 구현·검증 보고서](docs/POCKETWON-PIXEL-FIDELITY.md)
- [Golden Master 비교·오버레이 갤러리](evidence/PIXEL-FIDELITY/index.html)

Vercel은 저장소 루트의 `vercel.json`을 사용합니다. 프로젝트의 Root Directory는 저장소 루트로 두고, `outputDirectory`로 지정한 `ks6s3juocjzc2.kimi.page/`만 서비스합니다. 별도 설치·빌드 과정은 없습니다. 이 폴더의 `index.html`이 `/`에 열리며 CSS·JavaScript·폰트·캐릭터도 같은 폴더의 상대 경로로 로드됩니다. 저장소 루트에는 앱 `index.html`이 없으므로 Output Directory 설정을 제거하면 기본 주소에서 `404 NOT_FOUND`가 발생합니다.

홈은 화면 높이에 맞춰 4행으로 배치하고, 폭 700px 이상에서는 2열×2행으로 가용 화면을 채웁니다. 긴 세부 화면은 하단바를 제외한 영역에 맞춥니다. 작은 화면에서는 본문이 축소될 수 있습니다. 브라우저 주소창은 웹페이지가 자동으로 제거할 수 없으므로 ‘전체 → 전체 화면’ 버튼 또는 지원 브라우저의 홈 화면 추가를 사용합니다.

- [최신 홈 개선·검증 보고서](docs/POCKETWON-PURCHASE-DASHBOARD.md)
- [최신 모바일 화면](evidence/DONUT-INTERACTION/production/live-app.jpg)
- [이번 변경 및 한계](docs/POCKETWON-FULLSCREEN-DEMO.md)
- [모바일 화면](evidence/FULLSCREEN-DEMO/viewport-final/chromium-390x844.png) · [데스크톱 화면](evidence/FULLSCREEN-DEMO/viewport-final/chromium-1440x900.png)
- [화면·하단바 검증](evidence/FULLSCREEN-DEMO/viewport-final/verification.json) · [가상 데이터·저장 격리](evidence/FULLSCREEN-DEMO/data-complete/verification.json)
- [입력·취소·포커스 흐름](evidence/FULLSCREEN-DEMO/flows-final/verification.json) · [키보드 입력](evidence/FULLSCREEN-DEMO/record-keyboard-pass2/verification.json)
- [캐릭터·카드 검사](evidence/FULLSCREEN-DEMO/dashboard-final/verification.json) · [빈 데이터·오류·확대](evidence/FULLSCREEN-DEMO/dashboard-edges-verified/verification.json)
- [로컬 미러 검증](evidence/FULLSCREEN-DEMO/delivery/delivery-integrity.json)

이전 보고서는 당시 구현 기록으로 보존합니다.

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

Header / 작업 영역 / Navigation을 `100dvh` 안에 배치합니다. 홈의 Header 영역은 0px입니다. safe area와 짧은 가로 화면도 고려하며 본문만 가용 영역에 맞춰 조정합니다. Full Product Shell부터 route/단계/포커스만 담는 UI 전용 browser history를 사용합니다. 사용자 입력·사진·금융 payload는 history에 넣지 않습니다.

실제 기록 모드에서 저장은 마지막 확인 단계에서 사용자가 기록·목표 저장 버튼을 활성화할 때만 기존 `pocketwon_demo_v1`에 발생합니다. 저장 직전 최신 상태를 다시 읽고 검사하며, 실패하면 초안을 유지합니다. 진입·항목/페이지 이동·읽기 재시도·모션은 쓰지 않습니다. 금융 계산·데이터 스키마·오류·포커스 처리를 유지하고 확인된 저장 뒤에만 결과와 성공 모션을 표시합니다. 목표 자동 축하는 정확한 `current >= target` 상태에 한해 앱 세션당 한 번 실행합니다.

Full Product Shell은 AI 9개와 비AI 22개 제품 영역을 상태·입력·확인 UI로 연결합니다. 실제 AI/OCR/API/서버/계정/푸시/은행/결제는 없습니다. 새 초안·설정·약속은 메모리에만 있으며, 기본 가상 모드는 예시 값을 표시하고 실제 기록·목표 저장을 차단합니다. `?demo=0`은 실제 기록 모드입니다. 로컬 [개발용 Preview](http://127.0.0.1:4173/ks6s3juocjzc2.kimi.page/index.html?preview=1)에서 상태를 선택할 수 있고 이 모드에서는 원래 기록·목표 저장도 차단합니다. `?aiPreview=1` 별칭도 지원합니다.

이번 변경 검증 진입점:

```sh
node tests/verify-business-contracts.cjs
node tests/verify-dashboard-data.cjs
node tests/verify-feature-contracts.cjs
node tests/verify-habit-score.cjs
node tests/verify-purchase-dashboard.cjs
node tests/verify-viewport-demo.cjs
node tests/verify-public-demo.cjs
node tests/verify-dashboard.cjs --capture --both
node tests/verify-dashboard.cjs --edges
node tests/verify-header-scroll.cjs
node tests/verify-product-flows.cjs
node tests/verify-record-keyboard.cjs
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

미러는 Sprite뿐 아니라 앱의 HTML/CSS/JS와 서비스 에셋 전체를 `deployments/PW-WOORI-05/site/out/`으로 동기화하고 SHA-256을 대조합니다. 최종 접근성 수정 후 재동기화한 [delivery 검증](evidence/SINGLE-SCREEN/delivery/delivery-integrity.json)은 앱/미러 50개 파일 일치와 원본·이전 증거 1,168개 해시 보존을 확인했습니다. 개발용 `sprite-source/`는 포함하지 않습니다. 이전 공개 배포 메타데이터·압축 파일·검수 증거를 보존합니다. 현재 공개 앱은 [pocketwon.vercel.app](https://pocketwon.vercel.app/)에서 제공합니다.
