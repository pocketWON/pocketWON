# PW-WOORI-01 — 구현·검수 보고서

새 Light 디자인 시스템과 App Shell을 구현했습니다. 홈·기록·목표·리포트·전체는 각각 화면 이름만 표시합니다. 개별 기능 화면은 이번 슬라이스에서 제공하지 않습니다.

## 실행 및 검수

워크스페이스 루트에서 다음 명령을 실행합니다. 기존 진입 경로를 유지합니다.

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

- 앱: [PocketWON](http://127.0.0.1:4173/ks6s3juocjzc2.kimi.page/index.html)
- 검수 갤러리: [3개 폭 × 5개 탭](http://127.0.0.1:4173/evidence/PW-WOORI-01/index.html)
- 검증 fixture: [기본 컴포넌트](http://127.0.0.1:4173/tests/fixtures/design-system.html) — 앱에서는 연결하지 않습니다.
- [기계 판독 검증 결과](../evidence/PW-WOORI-01/verification.json)
- [전체 소스 diff](../evidence/PW-WOORI-01/source.patch)
- [변경 파일 목록](../evidence/PW-WOORI-01/changed-files.md)

## 구현 전 분석

| 항목 | 확인 결과 |
|---|---|
| 프레임워크·진입점 | 프레임워크 없는 정적 HTML. `ks6s3juocjzc2.kimi.page/index.html`에 CSS·상태·화면·이벤트 통합 |
| 프로젝트 ZIP | Downloads의 `ks6s3juocjzc2.kimi.page.zip`과 진입 HTML SHA-256 일치 |
| 라우팅 | `renderScreen`으로 DOM 교체. URL 라우터 없음. 더보기는 sheet |
| 기존 화면 | 홈·기록·목표·AI Score·습관 캘린더·부모 공유 리포트 |
| 공통 UI | 카드·버튼·헤더·하단 nav·sheet/dialog·toast |
| 시각 토큰 | mint/yellow/coral/blue 기반 평면 변수, 16/22px radius, 다수 그림자·gradient |
| 아이콘·서체 | 직접 작성한 SVG, 이모지, CDN Pretendard Variable |
| 데이터 | 사용자, 잔액, 습관 점수, 월별 소비/저축/목표, 거래, 목표, 미션, 출석, 포인트·달력 상태 |
| 영속 상태 | `pocketwon_demo_v1`, `pocketwon_intro_done`, `pocketwon_theme` |
| 모바일 | viewport-fit=cover, 100dvh, 520px 이상에서 장식용 390px 휴대폰 프레임 |
| 다크 모드 | data-theme, 시스템 감지 및 change listener, 빠른 전환·테마 선택창 |
| 외부 스크립트 | Kimi 게시 SDK 로더; 화면 주입과 외부 호출 포함 |
| 서버·인증·DB | 이 프로젝트에 자체 구현 없음 |

1회차 작성본은 디자인의 배경 자료로만 검토했습니다. 수치나 리서치 주장을 새로 검증한 것으로 보고하지 않습니다. 2회차 워크북은 미작성 양식입니다. 기능 범위와 10~13세 핵심 UX 기준은 이번 사용자 지시를 따랐습니다.

## 토큰 구조

`styles/tokens.css`가 단일 토큰 원본입니다.

```text
Primitive: --pw-ci-* / --pw-palette-* / --pw-space-* / --pw-radius-*
    ↓
Semantic: --pw-color-* / --pw-type-*
    ↓
Component: --pw-button-* / --pw-surface-* / --pw-header-* / --pw-nav-*
```

공식 CI 값은 Deep Blue #0067AC, Blue #0083CA, Light Blue #20C4F4, White #FFFFFF입니다. 출처: [우리은행 CI](https://spot.wooribank.com/pot/Dream?withyou=BPBKI0056). **아래 앱 토큰은 PocketWON 적용값이며 공식 우리WON 내부 토큰을 주장하지 않습니다.** 제공 팩의 `OBSERVED_APPROX` 역시 공식값으로 승격하지 않았습니다. 우리다움체 바이너리는 팩에 없으므로 추가하지 않았습니다.

| Semantic | 값 |
|---|---|
| background / surface | #F5F8FC / #FFFFFF |
| surface-subtle / surface-blue | #F7F9FC / #F1F7FC |
| primary / primary-soft | #0075C8 / #E8F3FF |
| primary-hover / primary-pressed | #0067AC / #005B98 |
| text-primary / secondary / tertiary | #20252B / #526170 / #637180 |
| border / divider | #DDE5EE / #E7EDF2 |
| success / warning / danger | #157F61 / #946000 / #C73744 |
| finance-positive / finance-negative | #157F61 / #C73744 |
| on-primary | #FFFFFF |

- Spacing: 0/4/8/12/16/20/24/32/40/48/64px 상당 rem.
- Radius: control 8px, button 12px, card 20px, hero 24px 상당 rem.
- Shadow: none. 기능 surface는 border·배경·여백으로 구분.
- Pretendard Variable → Pretendard → Apple SD Gothic Neo → Noto Sans KR → system-ui/sans-serif. 기존 CDN 사용 방식을 유지하며 로딩 실패 시 시스템 폰트로 표시합니다.
- 숫자 스타일은 heading과 분리하며 `font-variant-numeric: tabular-nums`를 사용.

| Typography | 크기/행간(px 상당 rem) | Weight |
|---|---|---|
| Display | 36/44 | 700 |
| H1 | 28/36 | 700 |
| H2 | 24/32 | 700 |
| H3 | 20/28 | 600 |
| Body | 16/24 | 400 |
| Body Small | 14/20 | 400 |
| Caption | 12/18 | 500 |
| Number Large | 40/48 | 700 |
| Number Medium | 28/36 | 700 |
| Button | 16/24 | 600 |

기본 Button, IconButton, Surface, Typography만 준비했습니다. 버튼은 hover/pressed/disabled/focus-visible 상태를 갖습니다. 앱 안에는 검증용 카드·예시 금액·가짜 CTA가 없습니다.

## Shell 코드 구조

```text
index.html
├─ styles/tokens.css   primitive → semantic → component
├─ styles/base.css     기본 컴포넌트·타이포·포커스
├─ styles/shell.css    Shell·safe area·header·content·nav
├─ scripts/icons.js    24×24, 1.8 stroke, currentColor 라인 SVG
├─ scripts/tabs.js     home / record / goal / report / all
└─ scripts/app.js      메모리 기반 전환, DOM·제목·aria-current 동기화

AppShell
├─ SafeAreaTop
├─ GlobalHeader: 브랜드/화면 문맥 + 전체 메뉴
├─ ScreenContent: 해당 탭 이름만 표시
└─ BottomNavigation: 5열 아이콘·라벨 + SafeAreaBottom
```

- 높이는 100dvh, fallback 100vh. 폭 100%, 최대 430px, 데스크톱 가운데 정렬.
- 헤더 기본 56px, 좌우 20px. 메뉴는 48×48px 터치 영역.
- 본문은 독립 스크롤. `min-height: 0`으로 nav 겹침 방지.
- Nav 항목 영역 72px + 상단 1px divider + 실제 하단 safe area. 선택 배경 장식·그림자 없음.
- Safe area는 상/하 각각 한 번만 적용. 가로 inset은 좌우 padding에 반영.
- 탭 이동은 URL을 변경하지 않음. 새로고침하면 홈. 메뉴 버튼은 전체로 이동.
- 버튼 DOM을 전환 때 재생성하지 않아 키보드 포커스 유지. Enter/Space 사용 가능.
- 선택 항목에만 `aria-current="page"`. 주요 메뉴·전체 메뉴에 접근성 이름, SVG는 aria-hidden.
- 외부 API·인증·DB schema·서버 설정·핵심 데이터 모델 변경 없음. 새 런타임 의존성 없음.

## 보존 및 기능 비활성화

원본 전체는 `preservation/PW-WOORI-01/original-index.html.txt`에 바이트 그대로 저장했습니다. `.txt`이며 실행 앱에서 import/link하지 않습니다. 기준 해시는 다음과 같습니다.

```text
24405c1c583da11d362f82b067add7fb7c62e152cba55f44d331f161b62314ba
```

`baseline.json`에는 원래 17개 파일의 해시가 있습니다. 진입 HTML을 제외한 기존 16개 파일은 변경하지 않았습니다. 원본 ZIP도 변경하지 않았습니다.

| 기존 기능/자료 | 이번 처리 |
|---|---|
| defaultState와 기존 거래·목표·출석·포인트 데이터 | 원본 스냅샷 안에 원형 보존; 값·구조 변경 없음 |
| 기록 저장·잔액/월별 합계 갱신·미션 보상·목표 변경·카테고리 집계 | 비실행 참조로 보존; 다음 기능 슬라이스에서 추출 |
| 부모 리포트·공유·캘린더·배지 UI | 비실행 참조로 보존; 이번 앱에서는 진입 불가 |
| 기존 사용자 localStorage | 읽기·쓰기·삭제·초기화·키 이름 변경 없음 |
| 테마 저장값 | 그대로 두고 무시 |
| 원래 SDK·폰트 관련 저장 파일 | 원형 유지. SDK는 새 앱에서 로딩하지 않음 |

**기존 기능을 새 Shell에서 사용할 수 있다는 의미의 회귀 PASS가 아닙니다.** 이번에는 기능 화면을 의도적으로 비활성화하고 소스·데이터를 보존했습니다. 다음 슬라이스에서 실제 기능을 연결할 때 해당 동작의 회귀 검증이 필요합니다.

## 디자인·다크 모드 잔존 점검

| 위치 | 결과 |
|---|---|
| 활성 HTML/CSS/JS | 옛 palette/gradient/glass/그림자/캐릭터/렌더러 참조 없음 |
| 활성 테마 코드 | dark selector, matchMedia, 테마 listener/toggle/dialog/storage 참조 없음 |
| 화면 | 5개 placeholder와 새 Shell만 표시. 시간·배터리·OS 가짜 표시 없음 |
| 원본 스냅샷·원본 대비 patch | 과거 디자인과 dark 코드가 보존·삭제 증거로 남음. 실행되지 않음 |
| 기존 다운로드 SDK 파일 | 보존되어 있지만 새 앱에서 요청/실행하지 않음 |
| 사용자 저장소 | 옛 theme 값이 남을 수 있으나 새 화면에 영향 없음 |

## 검증 결과

Chromium 151.0.7922.34 / WebKit 26.5에서 **46개 검증 묶음 PASS**, 앱 스크린샷 15개와 별도 fixture 캡처 1개를 생성했습니다.

- 양 브라우저에서 360/390/430×844의 다섯 탭, 선택 표시·제목·placeholder·URL 유지·터치 영역·겹침 검사.
- 반복 탭 선택, 헤더 메뉴, 새로고침 시 홈, 빈 저장소 유지.
- Chromium 격리 context에서 사용자 지정 기존 데이터와 소개/테마/무관 키를 넣고 탐색·reload 전후 문자열 동일 확인. 세 테마 값 각각 저장소 메서드 호출 0회.
- OS dark 및 실행 중 OS light↔dark 변경에도 Light 유지. 저장소 메서드가 예외를 던지는 환경에서도 탐색 성공.
- 키보드 순서, Enter/Space, 2px focus-visible 확인.
- 47px 상단·34px 하단·24px 가로 safe area를 fixture에서 주입: 적용 중복 없음, 본문 독립 스크롤, 탭 변경 시 scrollTop=0.
- 360×640, 루트 글자 크기 200%, 데스크톱 1024×900도 레이아웃 검사 통과.
- 10개 타이포 역할, 숫자 tabular 스타일, 버튼 상태, 모든 사용 CSS 변수 정의 확인.
- Primary/white 대비 4.80:1, inactive nav/white 4.99:1. 텍스트·상태·금융 foreground는 white 위에서 모두 4.5:1 이상.
- 콘솔/page error 0, 실패한 리소스 요청 0.

초기 WebKit 검사에서는 1/64px 수준의 flex/dvh 반올림 차이가 발생했습니다. 기하 검사 허용 오차를 0.05px로 명시하고 전체 검증을 다시 통과했습니다. 제품 CSS를 이 차이에 맞추어 왜곡하지 않았습니다.

실물 iPhone/Android나 스크린리더 실기기 검증은 수행하지 않았습니다. safe area는 브라우저의 CSS 환경 변수 처리와 수치 주입으로 검증한 결과입니다. 폰트 CDN의 오프라인 제공을 새로 구현하지 않았습니다.

## 재현 명령

정적 서버를 실행한 뒤 워크스페이스 루트에서:

```sh
node --check ks6s3juocjzc2.kimi.page/scripts/icons.js
node --check ks6s3juocjzc2.kimi.page/scripts/tabs.js
node --check ks6s3juocjzc2.kimi.page/scripts/app.js
node --check tests/verify-shell.cjs
node tests/verify-shell.cjs
```

검증에는 개발 환경의 Playwright가 필요합니다(이번 환경 1.61.0). 앱 런타임 의존성으로 추가하지 않았습니다. 검증 스크립트는 Playwright 기본 브라우저가 없으면 macOS 캐시의 기존 브라우저를 사용하며 실제 경로·버전은 verification.json에 기록합니다. 다른 환경에서는 `PW_PLAYWRIGHT_MODULE`, `PW_CHROMIUM_EXECUTABLE`, `PW_WEBKIT_EXECUTABLE`로 설치 위치를 지정할 수 있습니다. 로컬 서버 주소는 `PW_BASE_URL`로 지정하며 localhost/127.0.0.1만 허용합니다.

프레임워크 build/lint 명령이 없는 정적 프로젝트이므로 JS 구문 검사와 실제 브라우저 검증을 수행했습니다. 검증은 임시 browser context에서만 데이터를 생성하고 종료 시 context를 폐기합니다.

다음 기능 화면 개발·배포·외부 게시를 진행하지 않았습니다. PW-WOORI-01은 검수 대기 상태입니다.
