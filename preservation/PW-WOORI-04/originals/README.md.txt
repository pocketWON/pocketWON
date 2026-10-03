# PocketWON / 포켓WON

PW-WOORI-03: 승인된 Light 디자인 시스템·홈 위에 기록 탭과 명시적 거래 저장을 구현했습니다. 목표·리포트·전체는 placeholder로 유지합니다. PW-WOORI-01/02 승인 이력을 바탕으로 이번 기록 슬라이스의 검수를 기다립니다.

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

- [실행 앱](http://127.0.0.1:4173/ks6s3juocjzc2.kimi.page/index.html)
- [기록 검수 갤러리 · 23개 제출 항목](http://127.0.0.1:4173/evidence/PW-WOORI-03/index.html)
- [기록 구현·검증 보고서](docs/PW-WOORI-03.md)
- [전체 소스 diff](evidence/PW-WOORI-03/source.patch)
- [PW-WOORI-02 홈 보고서](docs/PW-WOORI-02.md)
- [PW-WOORI-01 Shell 보고서](docs/PW-WOORI-01.md)

새 프레임워크나 앱 런타임 의존성이 없는 정적 앱입니다. 원본 구현과 과거 검수 자료는 preservation/evidence 폴더에 보존합니다.

저장은 사용자가 유효한 입력으로 **기록 저장 버튼을 직접 활성화했을 때만** `pocketwon_demo_v1`에 발생합니다. 진입·입력·닫기·탭 이동·reload는 쓰지 않습니다. 빈 저장소의 첫 받은 돈 기록은 0원 기준으로 시작하며, 손상된 기존 데이터는 덮어쓰지 않습니다. 홈은 재진입 시 최신 값을 읽습니다.

캡처의 수치는 격리된 테스트 context의 원본 fixture·합성 데이터이며 실제 사용자 데이터가 아닙니다. 테스트는 기존 개발 환경의 Playwright를 사용하며 사용자 브라우저 프로필을 열지 않습니다.

```sh
node tests/verify-record.cjs
node tests/verify-home.cjs
node tests/verify-shell.cjs
python3 tests/build-record-delivery.py
```

서버 실행 후 검증합니다. 새 결과는 PW-WOORI-03에만 저장됩니다. 기존 환경의 Chromium/WebKit 실행 경로를 사용하며 `PW_PLAYWRIGHT_MODULE`, `PW_CHROMIUM_EXECUTABLE`, `PW_WEBKIT_EXECUTABLE`, `PW_BASE_URL`로 재지정할 수 있습니다. `PW_BASE_URL`은 localhost/127.0.0.1만 허용합니다. 제출 생성기는 세 검증 결과가 모두 PASS인 경우에만 보고서·갤러리·diff·해시 명세를 생성합니다.
