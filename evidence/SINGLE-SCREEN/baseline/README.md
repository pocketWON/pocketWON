# PocketWON / 포켓WON

Vanilla HTML/CSS/JavaScript 금융 기록 앱입니다. Home·기록·목표·리포트·전체 화면에 투명 배경의 실제 프레임 Sprite를 연결했습니다. 개별 AI 원본 59개를 코드로 11개 시트에 패킹하며, 금융 정보와 조작은 DOM에 유지합니다.

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

- [실행 앱](http://127.0.0.1:4173/ks6s3juocjzc2.kimi.page/index.html)
- [Sprite 재생·프레임 검수](http://127.0.0.1:4173/evidence/SPRITE-MOTION/index.html)
- [Sprite 구현·검증 보고서](docs/POCKETWON-SPRITE-MOTION.md)
- [이전 Reference UI 보고서](docs/POCKETWON-REFERENCE-SYNC.md)
- [프레임 제작과 참조 규칙](sprite-source/GENERATION.md)
- [시트·압축·해시 명세](evidence/SPRITE-MOTION/assets.json)

저장은 유효한 기록·목표 저장 버튼을 사용자가 직접 활성화할 때만 기존 `pocketwon_demo_v1`에 발생합니다. 진입·재생·탭 이동은 쓰지 않습니다. 기존 금융 계산·데이터 스키마·오류·포커스 처리를 유지하며, 저장 성공이 확인된 뒤에만 축하 모션을 실행합니다. 자동 목표 달성 축하는 정확한 `current >= target` 상태에 한해 앱 세션당 한 번 실행합니다.

서버를 실행한 뒤 검증합니다. 기존 증거를 보존하려면 각 실행에 새 출력 디렉터리를 지정하세요.

```sh
PW_EVIDENCE_ROOT=evidence/SPRITE-MOTION/new-run node tests/verify-sprites.cjs
PW_EVIDENCE_ROOT=evidence/SPRITE-MOTION/new-run node tests/verify-shell.cjs
PW_EVIDENCE_ROOT=evidence/SPRITE-MOTION/new-run node tests/verify-home.cjs
PW_EVIDENCE_ROOT=evidence/SPRITE-MOTION/new-run node tests/verify-record.cjs
PW_EVIDENCE_ROOT=evidence/SPRITE-MOTION/new-run node tests/verify-goal.cjs
PW_EVIDENCE_ROOT=evidence/SPRITE-MOTION/new-run node tests/verify-report.cjs
PW_EVIDENCE_ROOT=evidence/SPRITE-MOTION/new-run node tests/verify-reference-sync.cjs
```

기존 Playwright·Chromium·WebKit을 사용합니다. `PW_PLAYWRIGHT_MODULE`, `PW_CHROMIUM_EXECUTABLE`, `PW_WEBKIT_EXECUTABLE`, `PW_BASE_URL`로 환경을 재지정할 수 있습니다. 브라우저 검증은 localhost/127.0.0.1에서 격리된 합성 데이터로만 실행합니다. 새 프레임워크나 앱 런타임 의존성은 없습니다.

```sh
python3 scripts/build-sprites.py
python3 scripts/sync-sprite-mirror.py
```

Pillow 패커는 512px 원본을 384px 셀로 패킹하고 실제 픽셀·alpha·해시를 검증합니다. 미러 스크립트는 `deployments/PW-WOORI-05/site/out/`만 동기화합니다. 개발용 `sprite-source/`는 배포에 포함하지 않습니다. 이전 배포 메타데이터·압축 파일·검수 증거는 보존하며, 공개 배포는 이번 작업 범위에 포함하지 않습니다.
