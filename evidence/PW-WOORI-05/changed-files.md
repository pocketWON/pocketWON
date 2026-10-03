# PW-WOORI-05 변경 파일

- 수정: `ks6s3juocjzc2.kimi.page/index.html`
- 수정: `ks6s3juocjzc2.kimi.page/scripts/app.js`
- 수정: `tests/verify-goal.cjs`
- 수정: `tests/verify-record.cjs`
- 수정: `tests/verify-home.cjs`
- 수정: `tests/verify-shell.cjs`
- 추가: `ks6s3juocjzc2.kimi.page/scripts/report.js`
- 추가: `ks6s3juocjzc2.kimi.page/styles/report.css`
- 추가: `tests/verify-report.cjs`
- 추가: `tests/build-report-delivery.py`
- 추가: `docs/PW-WOORI-05.md`

앱 변경은 Report 전용 JS/CSS와 index.html의 두 리소스 선언, app.js의 Report 진입 분기입니다. state.js와 Home/Record/Goal JS/CSS, tokens/base/Shell/tabs/icons는 byte-identical입니다.

기존 검사 변경은 새 evidence 출력/보존 기준선, Report 목적지 h1 및 실제 view 검증, Report에서 수행하는 Shell scroll stress 대상 갱신뿐입니다. 기존 219개 검증 묶음은 유지했습니다. Goal 검사는 폰트 로딩 완료 전 종료되는 경합을 막기 위해 layout 확인 후 fonts.ready를 기다리고 reload 전에도 대기하도록 보완했습니다. 실패 요청은 마지막 완료 검사 이름과 함께 그대로 기록합니다. 과거 evidence/preservation은 모두 byte-identical입니다.
