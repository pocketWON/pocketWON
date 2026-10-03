# PocketWON / 포켓WON

PW-WOORI-02: 승인된 Light 디자인 시스템과 App Shell 위에 읽기 전용 홈을 구현했습니다. 기록·목표·리포트·전체는 placeholder 상태를 유지합니다.

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

- [실행 앱](http://127.0.0.1:4173/ks6s3juocjzc2.kimi.page/index.html)
- [홈 검수 갤러리](http://127.0.0.1:4173/evidence/PW-WOORI-02/index.html)
- [홈 구현·검증·보존 보고서](docs/PW-WOORI-02.md)
- [홈 변경 파일](evidence/PW-WOORI-02/changed-files.md)
- [PW-WOORI-01 보고서](docs/PW-WOORI-01.md)

새 프레임워크나 앱 런타임 의존성 없이 정적 파일로 동작합니다. 원본 구현은 preservation 폴더의 비실행 텍스트로 보존되어 있으며 앱에서 사용하지 않습니다.

홈은 `pocketwon_demo_v1`만 읽으며 저장·삭제·초기화하지 않습니다. 저장소가 비었거나 읽을 수 없으면 빈 상태를 표시합니다. 검수 갤러리의 값은 격리된 테스트 context에 주입한 원본 데이터이며 실제 사용자 데이터가 아닙니다.

기존 개발 환경의 Playwright로 `node tests/verify-home.cjs`와 `node tests/verify-shell.cjs`를 실행합니다. 새 결과는 `evidence/PW-WOORI-02`에만 저장됩니다. PW-WOORI-01의 증거 파일은 유지합니다.
