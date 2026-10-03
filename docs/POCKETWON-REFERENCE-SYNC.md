# PocketWON Reference-Synchronized UI Rebuild

구현 소스는 `ks6s3juocjzc2.kimi.page/`, 동기화된 배포 미러는 `deployments/PW-WOORI-05/site/out/`입니다. Vanilla HTML/CSS/JavaScript의 실제 UI를 재구축했습니다.

## 구현 결과

- Home: 중앙 워드마크, 금융 요약 surface, 2열 stagger 카드 4개, 일러스트 패널, 실제 화면으로 연결되는 pill CTA.
- Record: 흰 거래 리스트, 연한 파란 category surface, 부호가 있는 금액, empty illustration, rounded form sheet.
- Goal: 목표/완료 일러스트, progressbar, 정확한 금액, 생성/수정 sheet와 유효성/저장 오류 상태.
- Report: 저장된 점수·돈 흐름·목표·기록 수를 공통 surface로 표시. 계산 근거나 기간을 새로 만들어내지 않습니다.
- All: 기존 Home/Record/Goal/Report만 연결하는 카드 메뉴.

## 디자인 시스템

`styles/tokens.css`에서 palette, geometry, shadow, spacing, type, touch target, safe area를 중앙 관리합니다.

| 역할 | 값 |
| --- | --- |
| Canvas / Surface | `#FAFCFD` / `#FFFFFF` |
| Graphic panel | `#D9EEFB` / `#C9E8FA` |
| Bright accent | `#0190F8` |
| 읽을 수 있는 blue text / CTA | `#0069B7` / `#0077D8` |
| Ink | `#343B49`, `#29313F`, `#5C6876` |
| App / Card / Panel / Control | 36 / 30 / 22 / 18px |
| Pill | 999px |
| Ambient shadow | `0 10px 30px rgba(48,67,86,.09)` |
| Desktop canvas | 최대 520px |
| Mobile dock | 좌우 16px, 바닥 12px 여백 |

밝은 blue를 accent와 progress fill에 사용하고, 흰 글자가 있는 CTA에는 최소 4.5:1 대비를 충족하는 blue를 사용합니다. Pretendard Variable을 라이선스와 함께 로컬에 저장해 외부 font 요청을 제거했습니다. Reduced motion에서는 transition이 비활성화됩니다.

## 주요 파일과 공통 컴포넌트

- `index.html`, `scripts/app.js`: shell/centered brand, 스크립트 연결, All route.
- `styles/base.css`, `styles/shell.css`: button, icon button, surface, focus, shell, dock, All 카드.
- `scripts/home.js`, `styles/home.css`: 금융 요약과 stagger feature grid.
- `scripts/record.js`, `scripts/goal.js`, `scripts/report.js` 및 대응 CSS: 각 화면과 상태 presentation.
- `scripts/all.js`: 기존 화면 메뉴.
- `scripts/illustrations.js`: `PW_ILLUSTRATIONS`, `pwIllustration`, `pwIllustrationPanel`.

그림은 decorative image이며 `aria-hidden`, 빈 alt, `pointer-events: none`을 사용합니다. 실제 텍스트·금액·차트·입력·버튼은 DOM에 남습니다. 그림을 eager-load해 전체 캡처나 첫 화면 진입에서 빈 패널이 생기지 않게 했습니다.

## 생성한 illustration family

위치는 `assets/pocketwon/characters/`입니다. Character Master를 먼저 만들고 이를 후속 생성의 스타일 기준으로 사용했습니다. 공통 DNA는 compact wallet/bean body, 흰 fill, 청회색 outline, 큰 눈, 작은 팔다리, 비대칭 행동, 거의 없는 shading입니다. Progress 캐릭터와 로고는 사용하지 않았습니다.

| 파일 | 사용 위치 |
| --- | --- |
| `pocketwon-mascot-master.png` | 스타일 master / manifest fallback |
| `pocketwon-mascot-balance.png` | Home summary |
| `pocketwon-mascot-record.png` | Home 돈 흐름 / Record |
| `pocketwon-mascot-goal.png` | Home 목표 / Goal |
| `pocketwon-mascot-report.png` | Home 돈 습관 / Report |
| `pocketwon-mascot-all.png` | Home 미션 / All |
| `pocketwon-mascot-empty.png` | Record/Report empty 상태 |
| `pocketwon-mascot-success.png` | Goal 완료 상태 |

각 PNG는 투명 배경이고 1MiB 미만입니다. 런타임 에셋은 최대 768px로 최적화했으며 master는 1024px입니다. 패널은 CSS layer로 분리하고 이미지의 크기·위치를 화면에 맞춰 조정했습니다.

## 기능 보존

`state.js`, `tabs.js`, `icons.js`는 기존 baseline SHA-256과 일치합니다. `pocketwon_demo_v1`의 key/schema, 실제 금융 계산, 읽기/쓰기 경계, invalid/empty/unavailable 구분, latest-state 재조회, 명시적 submit, retry, focus trap, Escape, heading focus, progress ARIA를 보존했습니다. 새 서버/API/인증 또는 존재하지 않는 금융 기능을 추가하지 않았습니다.

## 검증

| Suite | 결과 | 검사 수 |
| --- | --- | ---: |
| Home | PASS | 44 |
| Record | PASS | 64 |
| Goal | PASS | 65 |
| Report | PASS | 110 |
| Shell | PASS | 46 |
| Reference sync | PASS | 67 |
| 합계 | PASS | 396 |

Chromium과 WebKit에서 검증했습니다. Reference suite는 320/360/375/390/412/430px의 모든 5개 화면, 1024px desktop, 전체 Home을 캡처합니다. 64개의 기본 캡처 외에 empty/validation/save-error 캡처도 보존했습니다. 수평 overflow, 48px target, 실제 loaded PNG, transparent alpha, stagger, radii, token colors, dock clearance, storage 무변경을 검사합니다. 기존 suite에서는 200% 글자 크기, safe area, dialog와 재시도/최신 상태를 검증합니다. 새 console/page/resource 오류는 없습니다.

모든 앱 script의 `node --check`와 `git diff --check`를 통과했습니다. 프로젝트에 build/typecheck/lint 설정이 없어 해당 명령은 없습니다. 실제 기기 키보드와 screen reader, 실서버 검증은 수행하지 않았습니다. 이 프로젝트에는 backend/API가 없습니다. 공개 사이트 배포를 수행하지 않았고, 요청된 로컬 배포 미러를 동기화했습니다.

## 시각 비교와 최종 보정

`evidence/PW-WOORI-05/reference-sync/comparison.html`에서 제공 레퍼런스와 실제 Home 캡처를 나란히 확인할 수 있습니다. Reference에 맞춰 white canvas, pale-blue panels, roundness, soft shadows, typography weight, CTA geometry, header divider, graphic overlap을 확인했습니다.

실행 캡처에서 발견한 돈 흐름 숫자 겹침을 한 열의 metric layout으로 해결했습니다. 작은 카드에서 불필요한 금액 축약을 줄였고 큰 금액의 정확한 accessible amount는 유지했습니다. Summary mascot을 확대하고 목표/리포트/미션의 pose와 panel overlap을 보정했습니다. Mobile dock의 하단 여백, safe area, transformed card 이후 scroll 여백을 조정했습니다. 모든 Home feature card에 기존 화면으로 연결되는 CTA를 적용했습니다.

레퍼런스에는 금융 숫자와 navigation이 없으므로 실제 금융 정보와 필수 dock 때문에 Home의 길이는 더 깁니다. 한국어 타이틀은 heavy weight와 tight spacing으로 대응하며, 인위적인 전면 italic을 사용하지 않습니다.
