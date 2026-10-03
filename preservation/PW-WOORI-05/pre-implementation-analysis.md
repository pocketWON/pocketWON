# PW-WOORI-05 — 습관 리포트

구현 전 조사 기록. 최종 검증 결과는 구현·검증 후 아래 분석을 보존하여 완성한다.

## 구현 전 현재 구조

실행 진입점은 `ks6s3juocjzc2.kimi.page/index.html`이다. app.js의 showScreen은 기존 view.dispose → 탭별 create → replaceChildren → mount 순서로 작동한다. Home/Record/Goal 진입 때마다 loadPocketWONState()를 호출한다. Report/All은 else 분기 placeholder였다. Report 전용 분기를 추가해 같은 재조회 구조를 사용하고 navigate callback은 showScreen(target, true)로 h1 focus를 유지한다. Record와 Goal은 sheet 열기 및 저장 직전에 재조회하며 저장은 명시적 제출에만 수행한다. Report에는 제출 동작이 없다.

## 구현 전 원본 분석

원본: `preservation/PW-WOORI-01/original-index.html.txt` (비실행 참조).

| 원본 줄 | 함수/필드 | 실제 의미와 채택 경계 |
|---|---|---|
|1512–1565|defaultState|habitScore 82, monthly.saving 15200/spending 12300/goal 45000, goal title/target/current/daysLeft, transactions 4건, streak 7, points 1250, missions boolean 배열, recordedDays 일 숫자 배열. fixture 전용 값이며 앱 기본값으로 주입하지 않는다.|
|1570–1588|loadState/saveState/resetState|원본은 잘못된 상태에 default를 넣고 저장/reset한다. 현재 loadPocketWONState의 loaded/empty/invalid/unavailable 계약만 사용한다.|
|1981–1991|기록 저장|in은 balance와 monthly.saving 증가, out은 balance 감소/monthly.spending 증가. recordedDays와 streak를 갱신하던 원본 동작은 재사용하지 않는다. saving은 받은 돈 누계이며 월 식별자는 없다.|
|2054–2057|bindGoal 미션 처리|missions 변경, current에 1000 가산, points에 10 가산. 승인된 PW04와 충돌하므로 미사용.|
|2088–2112|goalSave|title/target/current/daysLeft, monthly.goal을 저장하던 원본. Report는 현재 createGoalViewModel만 사용하며 current 직접 편집/자동 적립은 없다.|
|2127–2143|categoryTotals/coachMessage|거래 외 CAT_BASE/CAT_HIDDEN 고정값과 0.55/6000 임계값에 의한 코칭. 실제 분석 근거로 채택하지 않는다.|
|2145–2240|renderScore/bindScore|habitScore 표시 외 plan 100/72/100/85, 분모 17000/12000 등 고정 비교값 및 heuristic 코칭. 도움말의 점수 계산 주장과 달리 habitScore 생성·갱신 구현은 발견되지 않는다. 단일 저장 점수 표시만 채택한다.|
|2301–2371|renderCalendar/bindCalendar|2024년 5월 고정 기준월, calOffset, recordedDays, specialDays, today, streak, points 의존. 일 숫자만으로 현재 월/오늘 기록을 추정할 수 없다. 월 이동도 saveState 호출하므로 재사용하지 않는다.|
|2386–2448|renderParentReport/bindParentReport|scores=[65,72,82,90]와 weeks가 하드코딩. user.name·habitScore·streak 공유, navigator.share/clipboard 호출. 조사 근거로만 보며 공유·추이·칭찬·보상 UI는 구현하지 않는다.|

현재 state.js: pwMoney는 0 이상 safe integer, validPocketWONTransaction은 object/type in 또는 out/양의 safe integer amount/비어 있지 않은 category를 검사한다. ts의 날짜 신뢰성은 parsePocketWONDate로 별도 판정한다. 사용자 확정에 따라 Report 건수는 기존 거래 검증 함수를 사용하며 날짜 불명확 거래도 포함한다. receipt/memo의 새 검증 규칙을 만들지 않는다. createGoalViewModel은 null/missing goal을 empty, 잘못된 이름/금액을 invalid로 분리하고 current>=target으로 완료를 판단한다. percent는 기존 Math.round와 0~100 clamp를 유지한다.
