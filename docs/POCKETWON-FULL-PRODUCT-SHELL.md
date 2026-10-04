# PocketWON Full Product Frontend Shell — 최종 A~I 보고

[실행 앱](http://127.0.0.1:4173/ks6s3juocjzc2.kimi.page/index.html) · [로컬 개발 Preview](http://127.0.0.1:4173/ks6s3juocjzc2.kimi.page/index.html?preview=1) · [검증 갤러리](<evidence/FULL-PRODUCT-SHELL/index.html>) · [전체 변경 파일 inventory](<evidence/FULL-PRODUCT-SHELL/file-inventory.json>)

## 범위와 사전 분석

기존 Vanilla HTML/CSS/JS, 3탭, 모바일 한 화면 홈, 금융 저장, 단일 목표, 리포트, Sprite Motion을 보존했다. AI 9개와 비AI 22개 제품 영역을 준비 상태·데이터 슬롯·직접 입력·확인 UI로 연결했다. 실제 AI/LLM/OCR/추천/평가/개인화/API/서버/DB/계정/푸시/클라우드/은행/송금/결제는 **구현하거나 연결하지 않았다**.

실행 진입점은 [index.html](<ks6s3juocjzc2.kimi.page/index.html>), 화면 factory/controller는 [app.js](<ks6s3juocjzc2.kimi.page/scripts/app.js>), 유일한 금융 writer는 [state.js](<ks6s3juocjzc2.kimi.page/scripts/state.js>), native dialog와 긴 텍스트 pager는 [ui.js](<ks6s3juocjzc2.kimi.page/scripts/ui.js>)다. 하단은 홈/기록/전체, 기존 목표·리포트 목적지도 유지한다. `monthly.saving`은 받은 돈 누계이며 저축액이 아니다.

사전 read-only 검증: 기존 금융 계약 29그룹, 전체 JS 문법 PASS. 기존 4173 서버와 실제 소스 일치. 격리 Chromium/WebKit 320×568 빈 상태의 주요 이동·기록 dialog·ESC에서 콘솔 오류와 저장 시도 0. 원본과 과거 증거는 보존했다.

## A. 기존 실제 동작

- 저장된 잔액·받은 돈 누계·쓴 돈·차이·목표·습관 점수를 그대로 읽어 표시한다.
- 정상 모드의 기존 받은 돈/쓴 돈 입력과 최종 명시적 저장은 그대로 동작한다. 최신 잔액·검증·50 Unicode code-point 메모·저장 실패 초안·중복 저장 방지를 보존했다.
- 기존 목표 만들기/이름·금액 수정도 정상 모드에서 동작한다. `current`·`daysLeft`·거래·잔액과 목표 자동 배분은 바꾸지 않는다.
- 리포트의 세 탭과 정확한 소수 점수·부호 있는 차이·목표 진행·전체 기록 수를 보존했다.
- 금융 함수 10개의 본문과 guard는 baseline과 일치한다. 저장 스키마·키·Sprite 엔진·manifest·11개 시트·원본 프레임은 바꾸지 않았다.
- Snapshot의 날짜가 없는 구형 missions/streak를 현재 출석으로 추정하지 않는다.

## B. 비AI 22개 제품 영역

| # | 영역 | 이번 단계의 동작 |
|---|---|---|
| 1 | 돈 기록 | 기존 실제 기록 유지. 받은 돈 출처·날짜 선택은 준비 안내 슬롯이며 자동 분류/날짜 변경 없음 |
| 2 | 거래 내역·상세 | 기존 전체 내역·페이지·긴 메모·시각·분류 유지, 정정 도구 진입 추가 |
| 3 | 거래 수정·삭제·정정 | 원본 카드와 가상 수정 비교·삭제 확인 Preview. 실제 역회계·삭제·ID 추가 없음 |
| 4 | 목표 관리 | 기존 단일 목표 실제 만들기·수정·현재 금액·남은 금액·진행 유지 |
| 5 | 목표에 모으기 | 직접 금액/빠른 선택·최소/잔액 부족/목표 초과/도달/확인·취소. 예상 목표 금액만 표시 |
| 6 | 습관 캘린더 | 유효 거래 core+유효 timestamp만 브라우저 로컬 날짜로 읽기 투영, 날짜 상세와 제외 안내 |
| 7 | 연속 기록 | 이번 주 유효 기록일 표시만 실제 읽기. 현재/최고 연속일은 null/정책 준비, Preview만 예시 |
| 8 | 배지·활동 포인트 | 첫 기록/기록/계획/목표/꾸준함/금융 학습 분류, 획득/진행/잠김 예시. 포인트는 현금 아님 |
| 9 | 알림·알림 설정 | 빈 센터, 예제 읽음/선택/분류, 5종 임시 switch와 시간 UI. 실제 발송/OS 권한 없음 |
| 10 | 칭찬·보상 약속 | 직접 입력→검증→비교→임시 카드와 확인 답변. 자동 달성 판정/보상 지급/포인트 증가 없음 |
| 11 | 부모님과 함께 보기 | 같은 기기에서 기존 목표 읽기+AI 요약 준비+대화/공유 Preview. 거래 감시·부모 계정 없음 |
| 12 | 부모님 연결 | 미연결 안내·코드/QR/링크 자리·개발 상태·해제 확인 Preview. 실제 코드·QR·링크 생성 없음 |
| 13 | 가족·권한 | 보호자 슬롯과 습관 요약/목표/약속/보상/계획 5종 임시 권한. 실제 권한 변경 없음 |
| 14 | 정기 용돈 | 주기/요일·날짜/금액/시작 날짜/임시 상태→검증→확인. 다음 지급일 추론·자동 지급 없음 |
| 15 | 생각 보관함 | 직접 물건/가격/검토 날짜 입력·임시 목록·상세·삭제·목표화 Preview. 결제 차단·목표 생성·예약 없음 |
| 16 | 금융 연결 | 계좌/용돈 지급/카드/결제 설명 자리만. 은행·계좌·연결 결과 fixture 없음 |
| 17 | 카드·결제 | 사용 정보 null·준비 안내·직접 입력 제한/상태 UI만. 카드번호/QR/바코드·결제 없음 |
| 18 | 전체 메뉴 | 기존 4목적지 shortcut+7개 그룹→높이 기반 메뉴 페이지. 31개 카드 단순 적재 없음 |
| 19 | 프로필·설정 | 저장된 이름 읽기와 별도 임시 이름, 이용/접근성/가족/알림/앱 정보 연결 |
| 20 | 개인정보·동의 | AI/공유 미연결 안내·보호자 동의 null·정책 확정 후 표시·철회/삭제 요청 확인 UI만 |
| 21 | 저장·동기화·데이터 | 실제 loaded/empty/invalid/unavailable 읽기 상태, 읽기 전용 요약, 내보내기/삭제/초기화 설명만 |
| 22 | 운영·관리자 안내 | 일반 모드 앱 정보 안내만. 개발 Preview에서 교육/콘텐츠/알림/flags/상태/오류/정책 빈 계약 |

새 설정·약속·계획·보관함은 메모리 초안이며 새로고침하면 사라진다. 금융 데이터에 합치거나 저장하지 않는다. 거래 정정/안정적 ID·목표 적립 회계·출석/배지·가족 권한/동의/지급의 정책은 미확정이다.

## C. AI 9개 셸

| # | 셸 | 진입·데이터 슬롯 |
|---|---|---|
| 1 | 습관 분석 Score | 리포트 도구/전체 AI. 저장된 점수는 별도 표시; AI score/이전/변화/4항목/요약/날짜/기준은 nullable |
| 2 | 코칭 | 홈 Header/전체. 제목/짧은 설명/다음 행동/근거/고정 예제 다른 조언 |
| 3 | AI 습관 리포트 | 리포트 도구/전체 AI. 기간 선택 UI/요약/잘한 점/변화/살펴볼 점/인사이트 |
| 4 | 부모 요약 | 함께 보기와 동일 canonical 화면. 기간 UI/요약/잘한 점/목표/대화/다음 계획/공유 Preview |
| 5 | 다음 용돈·목표 계획 | 목표 도구/함께하기. 총액·사용·별도 모으기·목표 몫·자유 사용/추천 목표 슬롯/직접 수정/가상 확인 |
| 6 | 영수증 | 기록 도구/편의. 촬영·파일 선택·로컬 사진·오류·삭제·OCR 금액/날짜/사용처/분류/메모 슬롯 |
| 7 | 카테고리 추천 | 기록 도구/편의. suggestedCategory/confidence/reason·Chip 선택만. 메모 분석·실제 draft 적용 없음 |
| 8 | 금융 퀴즈 | 배우기/전체 AI. 개발 fixture 3문제 시작→선택→설명→다음→완료·배운 내용·재시작 |
| 9 | 소비 전 생각 도우미 | 기록 도구/편의. 사용자가 여는 sheet의 일반 교육 질문 4개→생각 보관함/수동 기록 |

기본 모드는 준비 상태다. 실제 분석 결과·비교·평가·충분한 기록 기준을 만들거나 약속하지 않는다. Empty의 no-data/insufficient-records는 구분하되 실제 기록 수로 기준을 자동 판정하지 않는다. 로딩 skeleton은 **명시적으로 선택한 개발 상태**에서만 표시하며 처리 타이머는 없다. 기간 선택도 UI만 바뀌며 저장된 자료를 기간별로 분석/재계산하지 않는다.

영수증은 10MB 이하 JPG/PNG/WebP 로컬 미리보기만 지원한다. 업로드/getUserMedia/OCR 없음. 사진과 관계없는 Mock 결과임을 표시하고 실제 기록 Draft에 연결하지 않는다. object URL은 교체/삭제/dispose에서 해제한다.

퀴즈 정답 수는 교육 UI 결과일 뿐 습관 점수·보상·포인트·현금과 연결하지 않는다. 생각 도우미는 결제를 막거나 금액/유형별로 자동 발동하지 않는다.

## D. 통합 개발 Preview

로컬 환경의 `?preview=1`, 호환 `?aiPreview=1`만 활성화한다. Header 미리보기 상태 선택과 화면 내 개발 선택은 모두 동일한 PWPreview/Provider를 사용한다. 원격 host에서는 query가 있어도 꺼진다.

```text
?preview=1&previewState=success
?preview=1&previewState=preparing
?preview=1&previewState=empty&previewCase=insufficient
?preview=1&previewState=error
?preview=1&previewState=loading
?preview=1&previewCase=long
?preview=1&previewCase=zero|max|fraction
```

실제 기능과 예제 상태를 badge/문장으로 구분한다. Mock은 별도 fixture clone이며 금융 상태와 합치지 않는다. **이 모드에서는 기존 기록·목표도 실제 저장 버튼/handler 모두 차단한다.** 기본 모드에서 기존 저장은 유지한다. 금융/카드 연결 데이터는 개발 모드에서도 null/empty로 남는다.

## E. 수정한 기존 파일

1. [index.html](<ks6s3juocjzc2.kimi.page/index.html>) — flat CSS/JS 로드, 기존 마지막 Sprite 스타일 순서 유지.
2. [app.js](<ks6s3juocjzc2.kimi.page/scripts/app.js>) — canonical registry 연결·context 도구·단일 lifecycle·abort/generation.
3. [all.js](<ks6s3juocjzc2.kimi.page/scripts/all.js>) — 기존 shortcuts+그룹별 높이 페이지 hub·기존 all 캐릭터.
4. [ui.js](<ks6s3juocjzc2.kimi.page/scripts/ui.js>) — native overlay history·summary/link/tabindex focus trap.
5. [record.js](<ks6s3juocjzc2.kimi.page/scripts/record.js>) — 상세 route/정정 진입·준비 안내·Preview guard·저장/취소 history settle.
6. [goal.js](<ks6s3juocjzc2.kimi.page/scripts/goal.js>) — Preview 저장 guard·확정 저장 history settle.
7. [report.js](<ks6s3juocjzc2.kimi.page/scripts/report.js>) — 저장 점수와 AI 준비를 구분하는 문장만; pure VM 본문 불변.
8. [README.md](<README.md>) — 새 범위/Preview/history/테스트/증거/미러 사용 안내.

동일한 앱 변경분은 로컬 미러에도 반영했다. 모든 mirror matched 파일은 [74파일 manifest](<evidence/FULL-PRODUCT-SHELL/delivery/mirror-manifest.json>), 실제 변경/신규 파일과 해시는 [전체 inventory](<evidence/FULL-PRODUCT-SHELL/file-inventory.json>)에 있다. 사용자의 기존 DS_Store 변경·untracked root 복사본은 되돌리거나 삭제하지 않았다.

## F. 새 파일

### JavaScript 18개

- [feature-contracts.js](<ks6s3juocjzc2.kimi.page/scripts/feature-contracts.js>) — JSDoc nullable/상태/Provider 계약.
- [feature-state.js](<ks6s3juocjzc2.kimi.page/scripts/feature-state.js>) — enum/registry/로컬 Preview/초안 namespace.
- [feature-models.js](<ks6s3juocjzc2.kimi.page/scripts/feature-models.js>) — empty 계약·읽기 투영.
- [feature-providers.js](<ks6s3juocjzc2.kimi.page/scripts/feature-providers.js>) — Unavailable/Mock/async 계약.
- [preview-fixtures.js](<ks6s3juocjzc2.kimi.page/scripts/preview-fixtures.js>) — AI/비AI 개발 데이터.
- [feature-ui.js](<ks6s3juocjzc2.kimi.page/scripts/feature-ui.js>) — 페이지/상태/필드/sheet/abort/정리.
- [feature-navigation.js](<ks6s3juocjzc2.kimi.page/scripts/feature-navigation.js>) — whitelist UI history/overlay/back/settle.
- [ai-views.js](<ks6s3juocjzc2.kimi.page/scripts/ai-views.js>) — Score/코칭/AI 리포트/다음 계획.
- [record-tools.js](<ks6s3juocjzc2.kimi.page/scripts/record-tools.js>) — 영수증/추천 분류/생각/적립/정정.
- [quiz.js](<ks6s3juocjzc2.kimi.page/scripts/quiz.js>) — 고정 3문제 전체 Flow.
- [habits.js](<ks6s3juocjzc2.kimi.page/scripts/habits.js>) — calendar/streak/badges.
- [thoughtbox.js](<ks6s3juocjzc2.kimi.page/scripts/thoughtbox.js>) — 임시 물건·cooldown UI.
- [notifications.js](<ks6s3juocjzc2.kimi.page/scripts/notifications.js>) — 센터/임시 설정.
- [family.js](<ks6s3juocjzc2.kimi.page/scripts/family.js>) — 부모/연결/권한.
- [rewards.js](<ks6s3juocjzc2.kimi.page/scripts/rewards.js>) — 임시 약속/답변.
- [allowance.js](<ks6s3juocjzc2.kimi.page/scripts/allowance.js>) — 임시 정기 용돈 계획.
- [settings.js](<ks6s3juocjzc2.kimi.page/scripts/settings.js>) — 프로필/설정/개인정보/데이터/정보/운영.
- [finance.js](<ks6s3juocjzc2.kimi.page/scripts/finance.js>) — 금융/카드 미연결 자리.

### CSS 6개

[features.css](<ks6s3juocjzc2.kimi.page/styles/features.css>), [ai.css](<ks6s3juocjzc2.kimi.page/styles/ai.css>), [all.css](<ks6s3juocjzc2.kimi.page/styles/all.css>), [habits.css](<ks6s3juocjzc2.kimi.page/styles/habits.css>), [family.css](<ks6s3juocjzc2.kimi.page/styles/family.css>), [settings.css](<ks6s3juocjzc2.kimi.page/styles/settings.css>).

### 테스트 7개·문서·증거

[product-test-utils.cjs](<tests/product-test-utils.cjs>), [verify-feature-contracts.cjs](<tests/verify-feature-contracts.cjs>), [verify-ai-shell.cjs](<tests/verify-ai-shell.cjs>), [verify-product-shell.cjs](<tests/verify-product-shell.cjs>), [verify-product-flows.cjs](<tests/verify-product-flows.cjs>), [verify-product-edge-cases.cjs](<tests/verify-product-edge-cases.cjs>), [verify-feature-accessibility.cjs](<tests/verify-feature-accessibility.cjs>).

[이 보고서](<docs/POCKETWON-FULL-PRODUCT-SHELL.md>), [갤러리](<evidence/FULL-PRODUCT-SHELL/index.html>), [검증 summary](<evidence/FULL-PRODUCT-SHELL/verification-summary.json>), [file inventory](<evidence/FULL-PRODUCT-SHELL/file-inventory.json>)와 새 테스트 실행별 JSON/PNG가 추가됐다. 실패한 초기 결과도 별도 폴더에 보존했다. 개별 새 증거 파일 전체 목록은 inventory에 있다. 앱 새 파일 24개는 동일 경로의 로컬 미러에도 추가됐다.

## G. 데이터 모델 변경 여부

**저장된 금융 데이터 모델 변경 없음.** 기존 키 하나와 writer 하나만 존재한다. 신규 local/session storage·schema migration·repair·seed·자동 금융 갱신·동의 기록·실제 사용자 프로필 수정 없음.

추가한 것은 별도 frontend nullable DTO/JSDoc와 메모리 Draft다. source는 stored/mock/unavailable, featureState와 aiState는 분리하고 period/emptyReason/error를 명시한다. guardianConsent, rewards.goal, allowance.weekday/monthDay도 명시적 null 슬롯이다. 안정적 거래 ID와 회계 정정 정책은 아직 만들지 않았다.

## H. 회귀·접근성 결과

최종 Chromium **153.0.8010.12**, WebKit **26.5**, 기존 Playwright 1.61.0, 격리 합성 컨텍스트에서 검증했다. 사용자 실제 브라우저 프로필은 사용하지 않았다.

| Suite | 결과 | 증거 |
|---|---|---|
| 기존 pure 금융 | 29 그룹 PASS, 함수 10개 baseline 일치 | Node 실행 로그 |
| 신규 pure 계약 | PASS: nullable/fixture 경계/frozen source/calendar/source guard | Node 실행 로그 |
| 기존 Single Screen | 392 체크 PASS | [core](<evidence/FULL-PRODUCT-SHELL/final-core/verification.json>) |
| 기존 Record Stage | 20 체크 PASS | [record](<evidence/FULL-PRODUCT-SHELL/final-record/verification.json>) |
| 기존 Record Keyboard | 20 체크 PASS | [keyboard](<evidence/FULL-PRODUCT-SHELL/final-keyboard/verification.json>) |
| 기존 Sprite | 32 체크 PASS | [sprite](<evidence/FULL-PRODUCT-SHELL/final-sprite/sprites/verification.json>) |
| AI 셸 | 22 체크 PASS | [AI](<evidence/FULL-PRODUCT-SHELL/final-ai-r2/verification.json>) |
| 전체 제품 | 14 체크 PASS | [product](<evidence/FULL-PRODUCT-SHELL/final-product-r2/verification.json>) |
| 제품 입력 Flow | 22 체크 PASS | [flows](<evidence/FULL-PRODUCT-SHELL/final-flows-r3/verification.json>) |
| 경계 데이터 | 12 체크 PASS | [edges](<evidence/FULL-PRODUCT-SHELL/final-edges/verification.json>) |
| 신규 접근성 | 22 체크 PASS | [accessibility](<evidence/FULL-PRODUCT-SHELL/final-accessibility-r2/verification.json>) |
| 로컬 미러/역사 보존 | 74 파일 일치, 이전 1,168 해시 PASS | [delivery](<evidence/FULL-PRODUCT-SHELL/delivery/delivery-integrity.json>) |

Browser suite 체크는 합계 **556개**다. 신규 기능에서 저장 **시도**·금융 변경 함수 호출·비asset/API 요청 0, 모든 원래 storage key/raw 문자열 불변을 확인했다. 정상 기존 기록/목표의 명시적 저장은 기존 테스트에서 별도로 검증했다.

320×568, 360×640, 390×844, 430×932, 844×390, 280×480, 480×360, 추가 기존 화면 규격, 200% root 텍스트, safe area, VisualViewport 260px/offset24, Tab/ESC/back/focus, 긴 한글·금액·소수·메모·zero/null/잘못된 읽기를 검증했다. 좁은 달력은 주별 날짜 리스트, 큰 글자는 reflow/scroll, 새 본문은 Frame 내부 scroll이다. 한 Sprite session·action≤1+idle≤1·reduced-motion·dialog/hidden pause·오류 poster를 유지했다. Sheet는 static 장식만 사용한다.

**검증 한계:** 실제 iPhone/Android/OS 키보드·화면 읽기 프로그램·카메라 하드웨어는 사용하지 않았다. 키보드는 합성 VisualViewport 검증이다. 법률·포인트·부모/지급 정책, 실제 외부 API의 동작·지연·인증·통신 실패는 연결하지 않아 검증 대상이 아니다.

### 필수 40 시나리오 trace

아래 40개는 위 최종 PASS suite의 하위 시나리오다. 일부 suite는 각 브라우저·폭·상태로 반복하므로 합계 체크 수와 다르다.

| # | 시나리오 | 검증 |
|---|---|---|
| 1 | 홈 잔액·원래 네 카드·3탭 | core |
| 2 | 빈 키 첫 명시적 기록만 저장 | business/core |
| 3 | 받은 돈은 용돈 분류·메모 선택 | record |
| 4 | 쓴 돈 분류·잔액 최신 검사 | record |
| 5 | 50 Unicode code points·정확한 MAXSAFE 확인 | keyboard |
| 6 | 입력/IME Enter·Tab trap·ESC | record/keyboard |
| 7 | 중복 활성화가 한 번만 저장 | record/sprite |
| 8 | quota/부족/읽기 실패가 초안 보존 | record/keyboard |
| 9 | 긴 내역·원래 index/시각·상세 페이지 | business/core |
| 10 | 상세→정정→상세 back | product |
| 11 | 가상 수정·원본 비교 불변 | product |
| 12 | 삭제 확인·취소 원본 불변 | product |
| 13 | 목표 만들기 current=0 | business/core |
| 14 | 목표 수정 current/unknown/monthly 조건 보존 | business/core |
| 15 | 목표 정확한 도달·rounding이 축하 조건 아님 | business/sprite |
| 16 | 목표 적립 유효/부족·확인/ESC 무변경 | product |
| 17 | 실제 유효 날짜만 달력·불명 날짜 제외 | contracts/product/edges |
| 18 | calendar 좁은 리스트/큰 글자 reflow | accessibility |
| 19 | streak nullable·실제 주간 표시와 fixture 분리 | product/contracts |
| 20 | 배지/포인트 fixture-only·현금 아님 | product/contracts |
| 21 | 알림 empty/예시 및 5개 임시 switch | product/flows |
| 22 | 보상 직접 입력→검증→review→임시 카드 | flows |
| 23 | 같은 기기 부모 view·공유 Preview | AI/product |
| 24 | 가족 연결/권한의 empty와 fixture 분리 | product/accessibility |
| 25 | 주간 용돈 review·월 날짜 오류·취소 | flows |
| 26 | 생각 보관함 등록→상세→목표 Preview→삭제 | flows |
| 27 | 금융 데이터는 Preview라도 empty/null | product |
| 28 | 카드 제한 입력·확인은 실제 설정 아님 | flows |
| 29 | 7개 그룹과 높이 menu 페이지 | product/core |
| 30 | 프로필 HTML 문자열은 text-only 임시 값 | flows |
| 31 | 동의 철회/내보내기/삭제/초기화 실제 무변경 | flows |
| 32 | invalid/empty/partial/zero/denied storage 구분 | product/edges |
| 33 | AI 9개 기본 준비 상태 | AI |
| 34 | AI 9개 예시·empty/error/preparing/loading | AI |
| 35 | Score 0/100/소수/긴 legacy 값 | edges/business |
| 36 | 영수증 로컬 선택/삭제·지원 안 되는 이미지 | AI/edges |
| 37 | 메모 내용과 무관한 추천 Chip 예시만 | AI |
| 38 | 퀴즈 3문제 전체 설명·완료 | AI |
| 39 | 생각 sheet/browser Back·반복 해제·async abort·history PII 제외 | AI/flows |
| 40 | 모든 새 화면 다중 폭/200%/safe/keyboard/reduced-motion | accessibility |

### 발견과 수정

초기 broad source guard가 Set 정리 이름까지 금지하여 기존 assertion을 약화하지 않고 호환 코드로 바꿨다. 가로 메뉴의 media 구문/overflow, 전체 캐릭터 누락, modal header grid와 단계 progress 배치, 큰 글자 sheet reflow, 닫힌 sheet의 Set/cleanup 누적, guardianConsent 등 nullable 계약, async adapter 연결을 수정했다. VisualViewport geometry test의 limit에 offset을 반영했다. 새 Flow test는 실제 aria-label과 modal 범위를 사용하도록 수정했다. 초기 실패 증거는 삭제하지 않았다.

## I. 후속 연결 Adapter/Interface

[feature-contracts.js](<ks6s3juocjzc2.kimi.page/scripts/feature-contracts.js>)의 9개 AI 및 비AI nullable DTO, FeatureEnvelope, FeatureProvider가 후속 계약이다. [feature-providers.js](<ks6s3juocjzc2.kimi.page/scripts/feature-providers.js>)에 **Unavailable/Mock만** 존재한다. 미래 진입점은 다음과 같다.

```js
PWFeatureProviders.getFeatureViewState(featureId, {signal, loaded})
// Promise<FeatureEnvelope|null>
// {featureId, featureState, aiState, data, source, period, emptyReason, error}
```

[feature-ui.js](<ks6s3juocjzc2.kimi.page/scripts/feature-ui.js>)의 request는 이 진입점을 실제 사용하고 aborted/늦은 결과를 억제한다. App의 generation+AbortController는 다른 화면에 이전 응답이 반영되지 않게 한다. Resolved envelope는 factory에 별도 전달하며 route/history에 넣지 않는다. 스크린의 새로운 금융 처리 없이 nullable 슬롯을 채우는 구조다.

후속 실제 Provider를 붙일 때 서버 응답 검증·허용 데이터/기간/동의/권한·부모 연결·회계·안정적 ID 등 정책을 먼저 확정해야 한다. 이번 단계의 loaded는 **이 기기에서 읽은 context**일 뿐 전송 허가나 요청 payload가 아니다. 네트워크·Real Provider·인증·백엔드 서비스를 구현하지 않았다. 영수증 mapper는 별도 Preview 필드로만 연결되며 원래 기록 draft로 사용하지 않는다.

## Checkpoint 1~5

1. **구조:** common enum/DTO/Provider/Preview/UI/history와 9 AI 진입을 구축. 금융 함수·키·Sprite 불변, 미구현 상태는 준비로 표시.
2. **AI:** 9개의 데이터 슬롯/준비/empty/error/명시적 개발 loading과 3문제 퀴즈, 기본/예제 분리를 구현·검증. 실제 AI/OCR 없음.
3. **비AI:** 22개 제품 영역을 기존 목적지+7그룹에 연결. 유효 달력 읽기 외 신규 동작은 비파괴 메모리/설명/확인 UI. 실제 지급/연결/정정/삭제 없음.
4. **통합:** 양 engine의 556 browser 체크+29 pure 금융 그룹 및 신규 계약 PASS, 새 Flow 저장 시도/금융 함수/API 0. 물리 기기·실제 외부 서비스는 범위 밖.
5. **전달:** 소스/문서/새 증거/갤러리 정리, 74파일 미러 일치와 이전 1,168 해시 보존. **로컬 미러만 동기화했고 공개 배포는 하지 않았다.**
