# PocketWON / 포켓WON

Vanilla HTML/CSS/JavaScript 금융 기록 앱입니다. 현재 UI는 **한 화면의 잔액 + 네 가지 행동**을 중심으로 구성하며, 기록 목록·긴 상세·입력 흐름은 페이지와 상태 교체로 나눕니다. 하단 메뉴는 홈 / 기록 / 전체이며 기존 목표와 리포트도 유지합니다.

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

- [실행 앱](http://127.0.0.1:4173/ks6s3juocjzc2.kimi.page/index.html)
- [Single-Screen 구조·검증 보고서](docs/POCKETWON-SINGLE-SCREEN.md)
- [Single-Screen 검증 갤러리](evidence/SINGLE-SCREEN/index.html)
- [Sprite 재생·프레임 검수](http://127.0.0.1:4173/evidence/SPRITE-MOTION/index.html)
- [기존 Sprite 구현·검증 보고서](docs/POCKETWON-SPRITE-MOTION.md)
- [이전 Reference UI 보고서](docs/POCKETWON-REFERENCE-SYNC.md)
- [프레임 제작과 참조 규칙](sprite-source/GENERATION.md)
- [시트·압축·해시 명세](evidence/SPRITE-MOTION/assets.json)

일반 지원 화면에서는 Header / Hero·작업 영역 / Navigation을 `100dvh` 안에 배치합니다. 320×568부터 검증하며 safe area와 짧은 가로 화면도 고려합니다. Root 글꼴이 20px를 넘는 글자 확대, 폭 300px 미만, 높이 320px 미만, 또는 폭 500px 미만이면서 높이 480px 미만이면 읽기와 기능 접근성을 위해 재배치와 세로 스크롤을 허용합니다. URL·브라우저 history를 바꾸지 않습니다.

저장은 마지막 확인 단계에서 사용자가 기록·목표 저장 버튼을 활성화할 때만 기존 `pocketwon_demo_v1`에 발생합니다. 저장 직전 최신 상태를 다시 읽고 검사하며, 실패하면 초안을 유지합니다. 진입·항목/페이지 이동·읽기 재시도·모션은 쓰지 않습니다. 금융 계산·데이터 스키마·오류·포커스 처리를 유지하고 확인된 저장 뒤에만 결과와 성공 모션을 표시합니다. 목표 자동 축하는 정확한 `current >= target` 상태에 한해 앱 세션당 한 번 실행합니다.

현재 검증 진입점:

```sh
node tests/verify-business-contracts.cjs
node tests/verify-single-screen.cjs
node tests/verify-record-stage.cjs
node tests/verify-record-keyboard.cjs
node tests/verify-sprite-stage.cjs
```

금융 계약 suite는 Node.js만 사용하고, 화면·Sprite suite는 위 로컬 서버와 기존 Playwright·Chromium·WebKit을 사용합니다. browser suite는 독립된 컨텍스트와 합성 데이터로 실행하며 기본 증거 디렉터리는 `evidence/SINGLE-SCREEN/` 아래 실행 시각별로 생성됩니다. `PW_EVIDENCE_ROOT`, `PW_BASE_URL`, `PW_PLAYWRIGHT_MODULE`, `PW_CHROMIUM_EXECUTABLE`, `PW_WEBKIT_EXECUTABLE`로 출력과 실행 환경을 지정할 수 있습니다. 기존 테스트 진입점은 현재 suite로 연결하며 원본 snapshot은 [이번 작업 baseline](evidence/SINGLE-SCREEN/baseline/manifest.json)에 보존합니다. 상세 결과와 검증 한계는 구조 보고서에 기록합니다. 모바일 키보드 검사는 합성 VisualViewport이며 물리 기기 검증은 수행하지 않았습니다.

Sprite는 개별 AI 원본 59개를 11개 시트로 패킹한 기존 에셋을 재사용합니다. 금융 정보·버튼·입력은 DOM에 남기고, 장식 Sprite는 동일한 정사각 셀로 재생합니다. 현재 화면의 모션 세션 하나가 플레이어 정리와 재등록을 담당하며 액션 1개 + idle 1개 예산, dialog·숨김 중 pause와 reduced-motion 포스터를 유지합니다. 새 앱 런타임 의존성은 없습니다.

필요할 때 Sprite를 원본에서 다시 패킹합니다.

```sh
python3 scripts/build-sprites.py
```

Pillow 패커는 512px 원본을 384px 셀로 패킹하고 실제 픽셀·alpha·해시를 검증합니다. 이번 작업의 로컬 미러 동기화는 새 증거 위치를 지정합니다.

```sh
python3 scripts/sync-sprite-mirror.py --evidence-root evidence/SINGLE-SCREEN/delivery
python3 scripts/verify-single-screen-delivery.py --evidence-root evidence/SINGLE-SCREEN/delivery
```

미러는 Sprite뿐 아니라 앱의 HTML/CSS/JS와 서비스 에셋 전체를 `deployments/PW-WOORI-05/site/out/`으로 동기화하고 SHA-256을 대조합니다. 최종 접근성 수정 후 재동기화한 [delivery 검증](evidence/SINGLE-SCREEN/delivery/delivery-integrity.json)은 앱/미러 50개 파일 일치와 원본·이전 증거 1,168개 해시 보존을 확인했습니다. 개발용 `sprite-source/`는 포함하지 않습니다. 이전 공개 배포 메타데이터·압축 파일·검수 증거를 보존했으며 공개 배포는 수행하지 않았습니다.
