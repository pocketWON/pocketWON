# PW-WOORI-01 변경 파일 목록

기존 파일 수정 1개. 나머지 기존 16개 파일은 해시가 동일합니다. 아래 경로는 워크스페이스 루트 기준입니다.

## 수정

- `ks6s3juocjzc2.kimi.page/index.html` — 기존 통합 UI를 새 Shell 진입점으로 교체

## 새 앱 소스

- `ks6s3juocjzc2.kimi.page/scripts/app.js`
- `ks6s3juocjzc2.kimi.page/scripts/icons.js`
- `ks6s3juocjzc2.kimi.page/scripts/tabs.js`
- `ks6s3juocjzc2.kimi.page/styles/base.css`
- `ks6s3juocjzc2.kimi.page/styles/shell.css`
- `ks6s3juocjzc2.kimi.page/styles/tokens.css`

## 기존 구현 보존

- `preservation/PW-WOORI-01/baseline.json`
- `preservation/PW-WOORI-01/original-index.html.txt`

## 검증 코드·fixture

- `tests/fixtures/design-system.html`
- `tests/verify-shell.cjs`

## 문서

- `docs/PW-WOORI-01.md`

## 검수 결과·실행 캡처

- `evidence/PW-WOORI-01/changed-files.md`
- `evidence/PW-WOORI-01/delivery.json`
- `evidence/PW-WOORI-01/index.html`
- `evidence/PW-WOORI-01/screenshots/360x844-all.png`
- `evidence/PW-WOORI-01/screenshots/360x844-goal.png`
- `evidence/PW-WOORI-01/screenshots/360x844-home.png`
- `evidence/PW-WOORI-01/screenshots/360x844-record.png`
- `evidence/PW-WOORI-01/screenshots/360x844-report.png`
- `evidence/PW-WOORI-01/screenshots/390x844-all.png`
- `evidence/PW-WOORI-01/screenshots/390x844-goal.png`
- `evidence/PW-WOORI-01/screenshots/390x844-home.png`
- `evidence/PW-WOORI-01/screenshots/390x844-record.png`
- `evidence/PW-WOORI-01/screenshots/390x844-report.png`
- `evidence/PW-WOORI-01/screenshots/430x844-all.png`
- `evidence/PW-WOORI-01/screenshots/430x844-goal.png`
- `evidence/PW-WOORI-01/screenshots/430x844-home.png`
- `evidence/PW-WOORI-01/screenshots/430x844-record.png`
- `evidence/PW-WOORI-01/screenshots/430x844-report.png`
- `evidence/PW-WOORI-01/screenshots/design-system-fixture.png`
- `evidence/PW-WOORI-01/source.patch`
- `evidence/PW-WOORI-01/verification.json`

## 프로젝트 안내

- `README.md`

source.patch는 실행 코드·검증 코드·문서 11개 파일의 diff입니다. 원본 스냅샷과 생성된 이미지·검증 결과는 별도 제출 자료이며 patch에 중복 포함하지 않습니다. 임시 폴더의 원본에 patch를 적용한 후 11개 파일의 바이트 일치를 검증했습니다.
