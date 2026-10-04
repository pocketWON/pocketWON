# FINAL POCKETWON REFERENCE REBUILD REPORT

2026-10-04 · 실제 Vanilla HTML/CSS/JavaScript 앱에 통합한 Golden Master 홈 재구축.

[실행 앱](http://127.0.0.1:4173/ks6s3juocjzc2.kimi.page/index.html) · [비교 갤러리](../evidence/PIXEL-FIDELITY/index.html) · [최종 비교 이미지](../evidence/PIXEL-FIDELITY/passes/final-reference-comparison.webp) · [검증 요약](../evidence/PIXEL-FIDELITY/verification-summary.json)

## 후속 사용자 요청을 반영한 현재 화면

아래 1절 이후의 계측·점수·캡처는 초기 Golden Master 재구축 시점의 기록이다. 이후 사용자 요청에 따라 다음 UI를 확정했다.

- 홈의 상단 바·알림 아이콘·헤더 로고를 제거하고, 첫 카드가 위쪽 안전 영역 바로 아래에서 시작하도록 58px 헤더 공간을 없앴다. 다른 화면의 제목·도구는 유지한다.
- 캐릭터 옆 ‘너는 잘하고 있어!’ 문구와 흰색 강조선 두 개를 제거했다. 캐릭터 자산·모션은 유지한다.
- 하단 중앙 플러스 버튼을 사용자가 제공한 `pocketwon-w-ring-logo.png`로 교체했다. 기록 입력·취소·포커스 복원 동작과 접근성 이름은 그대로다.
- 하단 리포트 아이콘을 둥근 보고서·목록 형태로 바꿨다. 다른 아이콘과 동일한 색상·선택 상태를 사용한다.
- 페이지와 주요 콘텐츠의 스크롤바 및 여백을 숨겼으며, 휠·터치·키보드 스크롤은 유지한다.
- CSS·JavaScript URL에 파일 해시를 붙여 이전 브라우저 캐시와 최신 HTML이 섞이는 문제를 방지했다.

[현재 홈 화면](../evidence/REPORT-DOCUMENT-ICON/chromium-home.png) · [최종 대시보드 회귀 검사](../evidence/MAIN-PUSH/dashboard/verification.json) · [헤더 제거·화면 복귀 검사](../evidence/MAIN-PUSH/header/verification.json) · [로컬 미러·과거 파일 보존 검사](../evidence/MAIN-PUSH/delivery/delivery-integrity.json)

후속 UI 증거는 `evidence/HOME-NO-HEADER`, `CENTER-LOGO`, `HIDDEN-SCROLLBAR`, `REPORT-DOCUMENT-ICON`에 있다. 그보다 앞선 헤더 고정·스크롤 실험은 변경 이력으로만 보존한다. 현재 대시보드 위치 검사는 초기 참조 좌표에서 카드의 y값을 58px 위로 옮긴 기대값을 사용한다.

## 1. 구현 결과와 변경 파일

Header → Balance Hero/3분할 금융 상태 → 저축 챌린지·금융 습관 2열 → 전체 폭 주간 막대 차트 → 전체 폭 AI 인사이트 2패널 → Home/Report/+/Goal/All 순서로 재구축했다. 원본 이미지의 하드웨어는 제외했다. 앱은 모든 금융 정보·버튼·차트를 DOM/SVG로 렌더링한다. 참조 이미지나 그 일부를 앱 배경·카드로 사용하지 않는다.

실행 소스 변경:

- `ks6s3juocjzc2.kimi.page/scripts/home.js`: 읽기 전용 모델과 홈 렌더러 전면 교체.
- `ks6s3juocjzc2.kimi.page/styles/home.css`: 계측 기반 레이아웃·차트·타이포그래피·캐릭터 배치.
- `ks6s3juocjzc2.kimi.page/styles/tokens.css`: 샘플 색상과 의미별 별칭, 반경·그림자 교체.
- `ks6s3juocjzc2.kimi.page/styles/shell.css`: 헤더·아바타·내비게이션 및 중앙 버튼.
- `ks6s3juocjzc2.kimi.page/scripts/app.js`: 로고 텍스트 분할과 장식 알림 점. 기존 라우팅·마운트 수명주기 보존.
- `ks6s3juocjzc2.kimi.page/scripts/icons.js`: Home/Report/Goal/All의 레퍼런스형 아이콘.
- `ks6s3juocjzc2.kimi.page/index.html`: 브라우저 theme-color.
- `ks6s3juocjzc2.kimi.page/styles/features.css`: WebKit의 긴 native select option이 큰 글자 모드에서 가로 넘침을 일으키는 경우 field 경계로 제한.

새 자산은 `assets/pocketwon/graphics/savings-pig.svg`와 `savings-pig-generated.png`다. SVG를 첫 비교에 사용한 후 입체감 차이를 보완하기 위해 PNG를 제작했다. 현재 앱은 PNG를 사용하며 첫 SVG도 제작 기록으로 보존했다. 기존 포켓WON 캐릭터는 생성하거나 바꾸지 않았다.

새 검증 보조 파일은 `tests/pixel-fidelity-utils.cjs`, `scripts/capture-pixel-fidelity.cjs`, `scripts/build-pixel-fidelity-evidence.py`다. 기존 browser/data suite의 폐기된 UI 기대값을 갱신했다. 전체 변경 및 보호 파일은 [source-change-inventory.json](../evidence/PIXEL-FIDELITY/source-change-inventory.json)에 기록했다.

## 2. 교체·추가·제거한 컴포넌트

- Hero의 단색 배경과 받은/쓴/남은 돈 요약을 계측 그라데이션·잔액·pill·3분할 금융 상태 패널로 교체.
- 목표 금액 카드를 돼지 저금통·주간 3회 저축 챌린지로 교체.
- 단일 습관 점수 링을 6개 지출 분류의 도넛과 범례로 교체.
- 홈의 거래 달력과 절반 폭 주간 선 차트를 제거하고, 전체 폭 7일 막대 차트를 추가. 기존 기록 목록·달력 기능은 다른 기존 화면에서 유지.
- AI 맞춤 인사이트의 긍정/제안 두 패널을 추가.
- 제목·화살표·더보기·세로 점 메뉴를 기존 상세 화면과 실제 sheet로 연결. 중첩 버튼 없음.

## 3. 기존 로직과 인터페이스

기존 `createHomeViewModel`, `createGoalViewModel`, `createHabitScoreModel`, `PWFeatureModels.calendar`, `PWUI`, `PWNavigation`, `PWFeatureUI.sheet`, `pwFeatureRoute`, `pwSpriteEntryMotion`을 재사용한다.

`createHomeDashboardModel(loaded, now)`만 읽기 전용 표시 필드 `balance`, `statusPill`, `statuses`, `challenge`, `donut`, `week`, `insights`로 확장했다. 기존 calendar projection은 주간 집계 재사용·검증을 위해 남겼다. API·저장 키·데이터 스키마·카테고리 allowlist·financial writer를 추가하거나 바꾸지 않았다.

| UI | 데이터·동작 |
| --- | --- |
| 잔액 | 저장된 balance. 큰 금액의 축약 표시와 정확한 접근성 이름 유지. |
| 지출·저축 상태 | 기존 28일 습관 항목 점수. 날짜·금액이 불확실하거나 합산이 안전 정수 범위를 넘으면 미확인. |
| 목표 상태 | 기존 목표 진행률. 빈 목표는 ‘시작’, 전체 의미는 접근성 이름으로 제공. |
| 저축 챌린지 | 실제 주간 저축 이력이 없어 `completed:null`, `status:unavailable`, `—/3`, 중립 막대와 연동 준비 문구. income·goal.current를 저축 횟수로 환산하지 않음. |
| 도넛 | 현재 로컬 월의 유효하고 미래가 아닌 지출 거래. 동일 집합의 합계와 카테고리별 금액 사용. |
| 범례 | 간식/식비→식비, 문구/쇼핑→쇼핑, 교통→교통, 게임/문화·여가→문화·여가, 생활비→생활비, 나머지→기타. 저장값은 수정하지 않음. 반올림 잔여를 분배해 양수 합계의 표시 비율 합은100%. |
| 주간 흐름 | 월~일 실제 지출. 오늘 강조. 미래·미확인은 null, 확인된0원은0으로 구분. |
| AI | 현재 서비스가 없어 준비 상태와 일반 안내. 실제 분석 없이 감소율·주말 소비 패턴을 주장하지 않음. |

Hero는 기록 목록, 지출·저축 상태는 습관 리포트, 목표 상태는 목표, 챌린지는 기존 목표 저축 미리보기, 도넛·주간은 흐름 리포트, AI 패널은 기존 분석·코칭 화면으로 연결된다. 메뉴 Escape·닫기·뒤로 가기·중앙 입력 취소의 포커스와 복귀 경로를 검증했다.

큰 금액 테스트 중 기존 습관 모델의 합산 정밀도 한계가 홈에 드러나는 경우를 확인했다. 기존 습관 계산 코드를 변경하지 않고 홈 adapter에서 해당 점수 표시를 보류하도록 보호했다.

## 4. 레퍼런스 계측과 테마

원본852×1846px에서 x53/y171/746×1577 영역을 앱 기준으로 사용했다. 폭390px 환산 콘텐츠 높이는824.4px이고, 390×844의 남는19.6px은 하단 배경이다. 세로 늘이기나 가짜 기기 프레임을 사용하지 않았다.

| 영역 | 목표 x/y/w/h — CSS px |
| --- | --- |
| Hero | 9.41 /58.03 /372.75 /236.82 |
| 상태 패널 | 14.12 /224.28 /361.77 /62.21 |
| 저축 챌린지 | 9.93 /304.79 /183.50 /172.52 |
| 금융 습관 | 198.66 /304.79 /183.50 /172.52 |
| 주간 흐름 | 9.93 /484.10 /372.23 /118.67 |
| AI 인사이트 | 9.93 /612.18 /372.23 /129.13 |
| Nav의 내용 영역 | 0 /749.68 /390 /74.76 |

양 브라우저 최종 경계 오차는 최대0.09 CSS px다. Nav 바깥 표면은 남는 하단 배경을 포함하므로 높이94.4px이며, 아이콘이 배치되는 내용 영역은74.8px다.

| 토큰 계열 | 새 기준 |
| --- | --- |
| background / surface / surface-soft | #F7FBFE /#FEFEFE /#F2F8FE |
| primary / primary-bright / primary-cyan / primary-light | #0C8DFE /#1897FE /#48CFFD /#C2E2FB |
| navy / text-primary / text-secondary / text-muted | #102355 /#102355 /#646C88 /#A8AEBE |
| green / pink / yellow | #50D86C /#FC648C /#FCC844 |
| green-soft / pink-soft / yellow-soft | #DAF8E3 /#FCE9EF /#FDF6DA |
| 도넛 blue/pink/yellow/green/purple/gray | #1897FE /#FEAFB4 /#FEE16E /#97E497 /#B9A0FB /#CDD2DC |
| Hero 측정 샘플 | #44B6FD /#5FBFFD /#22A7FD /#7BCBFC |
| border / divider | rgba(176,217,249,.25) /rgba(135,194,246,.45) |
| 기본 shadow | 0 2px 8px rgba(64,160,220,.08) |

기존 background #FAFCFD, primary #0190F8, ink-strong #29313F, 회색 중심 그림자와 큰30px 반경을 새 레퍼런스 기준으로 교체했다. requested token 별칭을 추가했고, 버튼 대비용 진한 파랑 등 의미별 상태색도 새 파랑에서 파생했다. 그림자 alpha·반경은 합성 이미지에서 유일하게 복원할 수 없어 계측·오버레이로 조정한 추정치다.

샘플 위치와 원본 RGB: [audit.json](../evidence/PIXEL-FIDELITY/reference/audit.json). 최종 샘플 비교: [final-color-samples.json](../evidence/PIXEL-FIDELITY/reference/final-color-samples.json). 배경·카드·주요 파랑·네이비·파스텔 등14개 샘플의 중앙 RGB가 일치하며, 나머지 초기4개 Hero/표면 샘플의 채널 평균 오차는5 미만이다.

## 5. 캐릭터 보존과 모션

Hero=`balance`, 주간=`all`, 긍정 인사이트=`report`를 기존 `pwIllustrationPanel()`과 실제 Sprite 플레이어로 렌더링한다. 프로필은 기존 balance poster 방식이다.

- 11개 Sprite 시트, 캐릭터 PNG·poster, manifest·runtime·기존 Sprite CSS를 보존했다.
- 384×384 셀·원래 비율·프레임 위치·transform origin 유지.
- idle6프레임/6FPS, action8프레임/10FPS, success10프레임/10FPS 유지.
- 단일 화면 모션 세션과 action1개+idle1개 한도 유지.
- 숨김·dialog·화면 밖 pause, 이동 시 dispose, reduced-motion poster, 로딩 실패 fallback 유지.
- 전체 프레임 alpha 외곽과 행별 불투명 픽셀을 기준으로 카드 경계 및 금융 텍스트 충돌 검사 통과. 투명 셀 여백만 홈 바깥 경계에서 제한한다.

## 6. 반응형·기능 검증

Chromium·WebKit에서 모든 최종 suite가 통과했다.

| 검증 | 결과 |
| --- | ---: |
| 대시보드 geometry |148 cases |
| 최종 ≤2px 기준 캡처 |두 엔진 PASS, 최대0.09px |
| 전체 핵심 화면 |380 checks |
| Sprite |32 checks |
| 기록 화면 |20 checks |
| 제품 shell |14 checks |
| AI shell |22 checks |
| 제품 흐름 |22 checks |
| 제품 예외 |12 checks |
| 접근성 |22 checks |
| 기록 키보드 |20 checks |
| 금융 계약 |29 groups |
| 대시보드 데이터 |9 groups |
| 습관 점수 |6 groups |
| Feature 계약 |PASS |

브라우저 suite의 보고 단위 합계552개와 대시보드148개 geometry cases는 서로 다른 집계이며 합산하지 않는다. 132개 viewport 조합과16개 live-data edge cases에는360/375/390/393/402/412/430, 320×568, desktop/landscape, safe area, 긴 금액·목표, 빈/손상/접근 거부 저장소, 200% 글자 확대를 포함한다. 짧은 화면은 스크롤을 허용하고 정상390×844는 한 화면에 들어간다. 44px 터치 영역, 전체 캐릭터 프레임, 메뉴 포커스, 저장 실패·재시도·경합, 라우팅·입력 취소를 검사했다.

실제 iPhone/Android 하드웨어나 실제 모바일 키보드로는 검증하지 않았다. 브라우저 keyboard 검사는 기존 합성 VisualViewport 방식이다.

## 7. 시각 수렴과 최종 점수

6회 보정과 최종 캡처를 보존했다. 매회 나란히 비교·50% overlay·증폭 차이 영상을 생성했다.

1. 큰 배치: 원본 영역·동일 첫 행·각 카드 위치.
2. 색상·표면: 누락 토큰 별칭, 상태 아이콘 배경, 파스텔·막대 색상.
3. 컴포넌트: 돼지 자산·도넛 비율·정직한 데이터/미연동 상태.
4. 글꼴·차트: 금액·본문·범례, 도넛·막대 위치, 제목 강조.
5. 미세 간격: 패널·버튼 크기·sprite clipping·44px hit area.
6. 광학 정렬: 잔액 글자 폭, 로고 수직·글자 비율, 아바타·벨, ellipsis, 회색 chevron과 Hero 강조 선.

별도 시각 리뷰의 **주관적 구성 평가**이며 픽셀 일치율이 아니다:

| 항목 | /100 |
| --- | ---: |
| Layout |99 |
| Geometry |98 |
| Color |97 |
| Typography |95 |
| Component |95 |
| Spacing |98 |
| Overall |97 |

주요 항목95 이상에 도달했고 전체98 목표에 접근했다. 98 또는100% 동일하다고 주장하지 않는다.

재현 가능한 영상 비교 수치:

- 전체 RGB 유사 지표94.130%.
- 캐릭터 실루엣 제외 RGB 유사 지표95.475%.
- 5px blur 색상 분포 유사 지표97.325%.
- 산식은 `100 × (1 − 평균 절대 RGB 채널 오차 /255)`다. 지각 품질 점수나 정확한 픽셀 일치율이 아니다.
- 외형 mask는 원본 캐릭터 윤곽·실제 poster alpha와2px 경계 여유만 제외한다. 전체 카드/캐릭터 컨테이너를 가리지 않으며 비교 영역93.44%를 유지한다. 캐릭터 위치·크기·전체 프레임 충돌은 별도 검사한다.

남은 육안 차이는 원본의 세부 글꼴 형태·질감, 돼지 일러스트의 세부 모양, 실제 금액에 비례하는 막대 높이다. 원본9천 막대가1.2만과 거의 같은 높이인 부분은 실제 데이터 의미를 위해 그대로 복제하지 않았다. 기존 캐릭터 외형 차이는 승인된 예외다.

## 8. 스크린샷·생성 자산·납품

- [최종 레퍼런스 데이터 캡처](../evidence/PIXEL-FIDELITY/passes/final-reference.png)
- [실제 저장 데이터 집계 캡처](../evidence/PIXEL-FIDELITY/passes/final-stored-data.png)
- [빈 저장 상태](../evidence/PIXEL-FIDELITY/passes/final-empty.png)
- [최종 나란히 비교](../evidence/PIXEL-FIDELITY/passes/final-reference-comparison.webp)
- [최종 overlay](../evidence/PIXEL-FIDELITY/passes/final-reference-overlay.webp)
- [계산된 지표와 산식](../evidence/PIXEL-FIDELITY/comparison-metrics.json)

레퍼런스의32,000원·18,000원·1/3·6분류 비율·AI 문구는 격리된 Playwright 페이지에서 모델을 주입한 값이다. 별도 제품 mock 페이지나 production fixture 스위치를 만들지 않았다. 저장 데이터 화면도 격리된 합성 거래이며 사용자의 실제 localStorage를 변경하지 않았다.

돼지 PNG는 [imagegen 스킬](/Users/jeonghu/.codex/skills/.system/imagegen/SKILL.md)의 built-in `image_gen.imagegen`으로 생성했다. 최종 자산은 `ks6s3juocjzc2.kimi.page/assets/pocketwon/graphics/savings-pig-generated.png`에 저장했으며1254×1254 RGBA, 실제 alpha0~255를 확인했다. 전체 최종 프롬프트·생성 방식·원본/납품 경로는 [image-generation.json](../evidence/PIXEL-FIDELITY/image-generation.json)에 기록했다. 프롬프트는 왼쪽을 바라보는 통통한 분홍3D 돼지 저금통·금화1개·투명 배경·문자 없음·작은 화면용 선명한 외곽을 지정했다.

기존 로컬 배포 미러를 동기화하고 서비스 파일77개 SHA-256 일치, 과거 보호 파일1,168개 보존을 확인했다. [delivery-integrity.json](../evidence/PIXEL-FIDELITY/delivery/delivery-integrity.json). 공개 배포는 수행하지 않았다. 사용자의 기존 미추적 파일과 이전 증거도 보존했다.

재현:

```sh
python3 -m http.server 4173 --bind 127.0.0.1
node scripts/capture-pixel-fidelity.cjs
python3 scripts/build-pixel-fidelity-evidence.py
PW_EVIDENCE_ROOT=evidence/PIXEL-FIDELITY/new-run node tests/verify-dashboard.cjs
```
