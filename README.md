# PocketWON / 포켓WON

PW-WOORI-04: 승인된 Shell·Home·Record 위에 단일 목표 화면과 목표 생성·수정을 구현했습니다. 리포트·전체는 placeholder입니다. PW-WOORI-04 검수를 기다립니다.

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

- [실행 앱](http://127.0.0.1:4173/ks6s3juocjzc2.kimi.page/index.html)
- [목표 검수 갤러리 · 26개 제출 항목](http://127.0.0.1:4173/evidence/PW-WOORI-04/index.html)
- [목표 구현·검증 보고서](docs/PW-WOORI-04.md)
- [전체 source diff](evidence/PW-WOORI-04/source.patch)
- [PW-WOORI-03 기록 보고서](docs/PW-WOORI-03.md)
- [PW-WOORI-02 홈 보고서](docs/PW-WOORI-02.md)
- [PW-WOORI-01 Shell 보고서](docs/PW-WOORI-01.md)

새 프레임워크나 앱 런타임 의존성이 없는 정적 앱입니다. 기존 원본과 과거 검수 자료는 preservation/evidence에 보존합니다.

저장은 사용자가 유효한 입력으로 **기록 저장 또는 목표 저장 버튼을 직접 활성화할 때만** `pocketwon_demo_v1`에 발생합니다. 진입·입력·닫기·탭 이동·reload는 쓰지 않습니다. 기존 손상 데이터는 자동 복구하지 않습니다. 신규 목표는 승인된 0원 시작이며, 완전히 빈 키에서는 첫 명시적 목표 저장에만 최소 0원 용돈 상태를 함께 생성합니다.

기존 목표 편집은 current·daysLeft·추가 속성을 보존합니다. 기존 monthly.goal이 있을 때만 target과 동기화합니다. 목표 적립 기능은 원본에서 안전한 계약을 확인하지 못해 제외했습니다. Record는 goal.current를 변경하지 않습니다. Home은 재진입 시 최신 값을 읽습니다.

```sh
node tests/verify-goal.cjs
node tests/verify-record.cjs
node tests/verify-home.cjs
node tests/verify-shell.cjs
python3 tests/build-goal-delivery.py
```

서버 실행 후 검증합니다. 새 결과는 PW-WOORI-04에만 저장됩니다. 과거 제출 생성기는 이전 슬라이스용으로 보존되어 있으므로 이번 검수에는 실행하지 않습니다. 현재 생성기는 네 검증 결과가 모두 PASS일 때 보고서·갤러리·diff·해시 명세를 만듭니다.

테스트는 기존 Playwright와 Chromium/WebKit을 사용합니다. `PW_PLAYWRIGHT_MODULE`, `PW_CHROMIUM_EXECUTABLE`, `PW_WEBKIT_EXECUTABLE`, `PW_BASE_URL`로 재지정할 수 있습니다. `PW_BASE_URL`은 localhost/127.0.0.1만 허용합니다. 제출 생성기의 PNG 비교는 기존 Pillow를 사용합니다.

캡처와 JSON의 금액은 격리된 임시 테스트 context의 fixture이며 실제 사용자 데이터가 아닙니다. 실물 모바일 키보드·스크린리더 검증은 미수행입니다. 배포는 진행하지 않았습니다.
