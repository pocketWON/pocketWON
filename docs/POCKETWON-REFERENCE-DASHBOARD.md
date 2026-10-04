# FINAL IMPLEMENTATION REPORT — 포켓WON Reference Dashboard

2026-10-04. 기존 실제 앱에 통합한 홈 재설계입니다. 별도 mock 페이지나 신규 런타임 dependency는 없습니다.

## 1. 변경한 화면 구조

헤더 → 잔액 Hero → Hero 하단 3분할 Money Summary → 동일 크기 2×2 Dashboard → 5항목 Navigation으로 구성했습니다. Header는 포켓WON / 알림 / 프로필, Dashboard는 목표 / 원형 습관 점수 / 거래 달력 / 주간 지출입니다.

Primary 390×844에서 Header 56px, Hero 약248px, Grid 약422px(동일한 두 행), Nav76px입니다. Hero 좌표는 x10/y66, 폭370px입니다. Nav의 중앙 버튼 돌출 공간을 메인 하단 여백으로 확보했습니다.

레퍼런스에서 앱 내부만 추출한 영역 기준은 x53–799/y171–1748이며, Header 약7%, Hero30%, Grid50%, Nav11%의 세로 구성입니다. 이미지의 아래 행이 더 높은 부분은 사용자가 확정한 네 카드 동일 크기 규칙으로 조정했습니다.

## 2. 변경한 파일

실행 소스 변경은 다음 6개입니다.

- `ks6s3juocjzc2.kimi.page/index.html`
- `ks6s3juocjzc2.kimi.page/scripts/app.js`
- `ks6s3juocjzc2.kimi.page/scripts/home.js`
- `ks6s3juocjzc2.kimi.page/scripts/icons.js`
- `ks6s3juocjzc2.kimi.page/styles/shell.css`
- `ks6s3juocjzc2.kimi.page/styles/home.css`

기존 브라우저 suite 6개의 UI 진입점 기대값을 변경하고 `verify-dashboard-data.cjs`, `verify-dashboard.cjs`를 추가했습니다. README·이 보고서·새 증거 갤러리와 로컬 배포 미러를 갱신했습니다. 기존 작업 트리의 수정 사항은 보존했습니다.

정확한 소스 변경 및 보호 파일 목록: [source-change-inventory.json](../evidence/REFERENCE-DASHBOARD/source-change-inventory.json).

## 3. 새로 만든 component

기존 Vanilla DOM renderer 안의 작은 함수로 AllowanceHero, MoneyBreakdown, GoalCard, HabitCard, CalendarCard, WeeklyCard 역할을 구성했습니다. CharacterStage는 기존 balance player의 안전한 시각 영역입니다.

`createHomeDashboardModel(loaded, now)`는 동일한 loaded snapshot에서 calendar projection과 주간 지출을 만드는 읽기 전용 presentation adapter입니다. 데이터 스키마나 writer를 추가하지 않습니다.

## 4. 재사용한 component

기존 App Shell, PWUI의 button/heading/money, 기존 알림·프로필·기록 입력·기록 목록·목표·리포트·전체 메뉴 화면, PWNavigation, PWFeatureModels.calendar, pwIllustrationPanel, pwSpriteEntryMotion, PocketWONMotion을 재사용했습니다.

## 5. 기존 캐릭터/그래픽 중 유지한 항목

balance 캐릭터는 Hero 안에서 기존 컴포넌트로 재생합니다. goal 캐릭터는 목표 카드에, balance poster는 프로필 아바타에 재배치했습니다. 기존 캐릭터 PNG·poster·sprite atlas·font 등 모든 서비스 자산은 바이트 단위로 보존했습니다. 새 이미지 생성은 수행하지 않았습니다.

## 6. Sprite / Animation 보존 내역

- 정사각384px 셀, 배경 시트 크기·frame 위치·count·steps 및 keyframe 그대로 유지.
- balance idle6frames/6FPS, action8frames/10FPS; success10frames/10FPS 유지.
- 실제 적용되는200ms ease 등장 효과와 player/session 생명주기 유지.
- action1개+idle1개 예산, 숨김·dialog·offscreen pause, reduced-motion poster, 오류 fallback 유지.
- 전체 원본 프레임의 alpha union과 alpha row mask로 실제 렌더에서 캐릭터 clipping·금융 텍스트 충돌을 검사.
- 코드·테마·글꼴·자산을 포함한 보호 파일37개가 작업 시작 baseline과 동일.

## 7. 기존 기능 연결 상태

| 새 진입점 | 기존 목적지 |
| --- | --- |
| Hero / 용돈 내역 | record list |
| 목표 카드 / 목표 메뉴 | goal |
| 금융 습관 | report / habit |
| 이번 주 지표 | report / flow |
| 중앙 + | record / form |
| 알림 / 프로필 | 기존 feature 화면 |
| 전체 메뉴 | 기존 제품 그룹·기능 |

중앙 + 입력을 취소하면 원래 화면과 버튼 포커스로 복귀합니다. 중첩된 feature의 returnTo도 UI 메모리로 보존하며 라우터 history 계약은 그대로입니다. 홈의 AI 코칭 버튼은 기존 전체 메뉴에서 접근합니다.

## 8. Responsive 처리

360/375/390/393/402/412/430px와667/740/780/812/844/852/874/896/932px의 모든 조합을 두 브라우저에서 검증합니다. 320×568, safe area, desktop, landscape, 200% text도 포함합니다.

정상 모바일에서는100dvh 안에 모든 핵심 영역이 표시됩니다. 모바일 폭500px 미만·높이620px 미만, 높이440px 미만의 가로 화면, 큰 글꼴에서는 기존 접근성 모드를 사용해 세로 재배치를 허용합니다. 2열과 동일 카드 크기는 유지합니다.

달력은7열을 유지하고 거래 이름·부호 있는 금액을 축약합니다. 6주 달력과 짧은 화면에서는 셀을2줄로 압축합니다. 날짜 셀은 작은 버튼으로 만들지 않고 제목·월 이동에44px 이상 터치 영역을 확보했습니다.

## 9. 제거한 기존 UI 구조

홈의 기록하기 / 기록 내역 / 목표 / 리포트 장식형 행동 카드4개와3항목 Nav를 정보 중심 카드와5항목 Nav로 대체했습니다. 반복 그래픽·긴 설명·별도 quick action row는 추가하지 않았습니다. 실제 기능은 기존 화면과 중앙 +에서 유지됩니다.

## 10. 유지한 business logic

저장 키·금융 계산10개 함수·카테고리 검증·기록 저장·목표 저장·현재 모은 돈·정확한 완료 조건·습관 점수·provider·라우터·schema를 유지했습니다. 홈과 월 이동은 저장하지 않습니다.

Hero와 요약의 남은 돈은 저장된 balance입니다. 받은 돈·쓴 돈은 기간 정보가 없는 저장 누계이며 월 집계로 오인시키지 않습니다. 주간 차트는 브라우저 날짜 기준 월–일의 실제 유효한 지출만 합산합니다. 미래는 미집계, overflow/없는 데이터는 미확인, 유효한0은0으로 구분합니다. 유효하지 않은 거래는 기존 검증 기준으로 제외하고 제외 건수를 접근성 설명에 제공합니다.

## 11. 테스트 결과

- 기존 브라우저 회귀9suite /544checks PASS. Chromium·WebKit 런타임 오류0.
- 금융 계약29groups, feature contracts, 신규 dashboard data5groups PASS.
- 신규 Dashboard suite: 모든 요청 viewport 조합과 safe area/긴 금액/긴 목표/소수/빈·오류/6주 달력/200% 글자·복귀 경로 검증. 최종 결과는 아래 JSON에 기록.
- 시각 보정4회: macro layout → character/card/calendar geometry → typography/chart density → short-screen ring containment.
- source/mirror74files 일치, 과거 보호 파일1,168개 보존. 로컬 미러만 동기화.

[기존 회귀 결과](../evidence/REFERENCE-DASHBOARD/regression-summary.json) · [최종 Dashboard 결과](../evidence/REFERENCE-DASHBOARD/verification/dashboard-final-render/verification.json) · [Delivery 검증](../evidence/REFERENCE-DASHBOARD/delivery/delivery-integrity.json) · [비교 갤러리](../evidence/REFERENCE-DASHBOARD/index.html).

자체 시각 평가(픽셀 유사도 측정값이 아닌 screenshot 기반 구성 평가): Structure100 / Proportion94 / Spacing92 / Component92 / Typography92 / Overall94.5. 기존 캐릭터·색상, 사용자가 선택한 동일 행 높이와 실제 지출 데이터는 차이로 감점하지 않았습니다. 큰 silhouette·Hero 비중·캐릭터 역할·3분할 요약·그리드·Nav가 목표 구조에 수렴했습니다.

## 12. 남아 있는 이슈와 확인 범위

검증한 viewport·데이터 상태에서 열린 기능/overflow/clipping 회귀는 없습니다. 반폭 달력의 긴 이름·금액은 의도적으로 축약되며 전체 값은 접근성 설명과 기존 기록 상세에서 확인합니다. 매우 짧은 화면·글자 확대는 세로 재배치합니다.

물리 기기와 실제 모바일 키보드 검증은 수행하지 않았습니다. 기존 API/AI/provider 준비 상태는 그대로이며 새 backend 기능을 구현하지 않았습니다. 갤러리 screenshot은 격리된 검증 데이터로 실행한 실제 앱의 렌더 결과이고 production 기본값이나 사용자 저장값을 변경하지 않았습니다. 공개 배포는 수행하지 않았습니다.
