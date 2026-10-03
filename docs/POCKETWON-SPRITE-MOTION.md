# PocketWON Sprite Motion

현재 정적 앱에 실제 그림이 바뀌는 Sprite 시스템을 추가했습니다. 캐릭터 프레임은 내장 `image_gen`으로 개별 생성했고, Pillow가 일정한 셀에 패킹합니다. 앱은 CSS `steps(1, end)`로 재생하며 프레임마다 JavaScript를 실행하지 않습니다. 공개 배포는 하지 않았습니다.

## 에셋과 동작

512×512 원본, 중립 발 기준점 (256, 420), 384×384 서비스 셀을 사용합니다. 원본 전체 캔버스만 같은 비율로 축소하며 프레임별 외곽 자르기·재배치·크기 보정은 하지 않습니다. 기준점이나 소품이 틀어진 그림은 AI로 재생성했습니다. 점프 프레임은 의도적으로 발이 지면에서 떨어집니다.

| 프로필 / 위치 | 실제 그림의 액션 | Idle 6프레임·6FPS | Action 8프레임·10FPS |
| --- | --- | ---: | ---: |
| balance / 내 용돈 | 지갑을 열어 동전 확인 | 169,720 B | 307,170 B |
| record / 저장된 돈 흐름 | 영수증 펼침과 종이 잔동작 | 167,224 B | 304,920 B |
| report / 나의 돈 습관 | 돋보기를 눈으로 가져옴 | 165,556 B | 297,610 B |
| goal / 지금 모으는 목표 | 깃발 세우기와 작은 점프 | 173,230 B | 302,190 B |
| all / 오늘의 미션 | 옆을 바라보며 손 흔듦 | 162,778 B | 294,054 B |
| success / 확인된 저장·달성 | 움츠림 → 만세 → 착지 → 안정 | — | 10프레임·10FPS, 379,368 B |

59개 개별 생성 포즈에서 시작·종료·눈 복귀 프레임을 재사용해 80개 셀, 11개 시트를 만들었습니다. 총 시트 크기는 2,723,820 B이며, 미리보기 6개까지 포함하면 2,955,714 B입니다. 각 시트가 512KiB 이하입니다. 모든 시트에서 PNG와 lossless WebP를 비교했고, 더 작은 WebP의 가시 픽셀과 alpha가 원본 패킹 결과와 정확히 일치했습니다.

- Idle: 2304×384, 1초 시퀀스 뒤 1.5~4초 휴식. 전체 주기 2.5~5초.
- Action: 3072×384, 800ms, 한 번 재생 후 중립 미리보기로 복귀.
- Success: 3840×384, 1000ms, 실제 저장·달성 상태 확인 후 한 번 재생.
- 프레임별 동작·원본 해시·참조·프롬프트·재생성 검수 기록은 `sprite-source/`에 보존합니다. 런타임에는 최종 시트와 미리보기, 메타데이터만 새로 포함합니다.

액션에는 준비 동작, 주요 포즈, 소품의 후속 움직임과 복귀가 있습니다. Idle은 소품을 유지한 시선 이동·반쯤 감긴 눈·깜빡임으로 별도 구성했습니다. 영수증과 동전 등 소품에 금융 숫자·텍스트·실제 차트를 넣지 않았습니다.

## 플레이어와 화면 연결

`scripts/sprite-manifest.js`는 `src`, `poster`, 셀 크기, 프레임 수, FPS, loop, anchor, bytes를 관리합니다. `scripts/sprites.js`의 `createPocketWONSprite(profile, options)`는 `element`, `play`, `pause`, `resume`, `stop`, `prepare`, `inspect`, `dispose`를 제공합니다. 옵션에는 autoplay, paused, loop, onComplete, className이 있습니다.

CSS keyframe은 프레임 i를 i/N 시점에 배치하고 마지막 셀을 100%까지 유지합니다. 정상 종료에서만 완료 콜백이 한 번 실행되며 취소·화면 교체·지연된 로딩의 오래된 완료는 무효화합니다. 고정 정사각 영역과 첫 프레임 미리보기를 먼저 표시하고, 미리보기 오류 시 기존 정적 PNG로 복귀합니다.

`PocketWONMotion.mount(viewRoot, {entryMotion})`가 화면 세션을 만들고 플레이어·observer·이벤트·타이머를 함께 정리합니다. 기존 illustration API의 정적 이미지 기능은 유지하고 핵심 캐릭터 배치에만 Sprite를 사용합니다. 카드의 기존 수직 stagger는 별도 entrance wrapper로 보존합니다.

- 최초 노출·CTA click·키보드 활성화에 대응합니다. hover는 마우스 환경에서만 보조로 사용합니다.
- 이동은 즉시 실행하며 일회성 진입 의도를 목적 화면으로 전달합니다. 빠른 입력을 액션 대기열로 쌓지 않습니다.
- 강한 액션 최대 1개와 subtle idle 최대 1개를 허용합니다. 우선순위는 성공 → 사용자 동작 → 최초 노출 → idle입니다.
- 실제 스크롤 영역 `#pw-content`를 observer root로 사용합니다. 180px 근접 로딩과 실제 재생 가시성 15%를 분리합니다.
- 화면 밖·숨겨진 탭·열린 dialog에서는 현재 프레임과 휴식 예약을 멈춥니다. 복귀 때 놓친 loop를 몰아서 실행하지 않습니다.
- Home 요약 미리보기는 eager, 다른 미리보기는 lazy이며 시트는 근접 시 준비합니다. 성공 시트는 입력 dialog가 열릴 때 준비합니다.
- `prefers-reduced-motion`에서는 자동·상호작용·entrance 재생을 취소하고 중립 정적 프레임을 표시합니다. dialog와 동시에 설정이 변경되어도 적용됩니다.
- Sprite는 `aria-hidden="true"`, `pointer-events:none`입니다. 금액·저장 결과·오류·차트 의미·CTA는 기존 DOM으로 제공됩니다.

기록·목표 저장에서 `persistPocketWONState(...).status === 'saved'` 확인, 화면 갱신, dialog 닫기 이후에만 성공을 요청합니다. 자동 목표 축하는 실제 `current >= target`으로 판단하며 완료 snapshot을 세션 메모리에 기록합니다. 동일한 완료 목표를 다시 저장한 명시적 저장 성공은 한 번 축하하고, 그 뒤 화면 재방문에서는 자동 축하를 반복하지 않습니다. 저장 실패·유효성 오류·불러오기 오류에서는 축하하지 않습니다. 새로운 저장 키는 없습니다.

## 시각 보정과 증거

실제 Home 재생을 보며 자동 entrance 액션 사이에 240ms 정적 간격을 넣었습니다. 요약 캐릭터의 전용 정사각 영역은 145%에서 165%로 조정하고 위치를 재설정해 약 108px 크기의 몸체가 blue panel 경계에 닿도록 했습니다. 다른 캐릭터의 프레임은 소품·발 기준점을 AI 재생성으로 보정했습니다.

- `evidence/SPRITE-MOTION/index.html`: 수동 재생·정지·개별 프레임 슬라이더. 금융 데이터를 읽거나 저장하지 않습니다.
- `evidence/SPRITE-MOTION/assets.json`: 각 인코딩 비교·셀 검증·원본 순서·해시.
- `evidence/SPRITE-MOTION/contact-*.png`: 작은 표시 크기의 연속 프레임 검수.
- `evidence/SPRITE-MOTION/checkpoint01/verification.json`: 첫 idle의 Chromium·WebKit 실제 CSS 재생.
- `evidence/SPRITE-MOTION/checkpoint02/verification.json`: Home 요약과 카드 4개 실제 액션 재생.
- `evidence/SPRITE-MOTION/polish/`: 실제 화면의 크기·타이밍 보정 전후.
- `evidence/SPRITE-MOTION/regression/`: 기존 6개 suite의 새 실행 결과.
- `evidence/SPRITE-MOTION/final/sprites/verification.json`: 최종 Sprite 전용 검사 결과.
- `evidence/SPRITE-MOTION/mirror-manifest.json`: 로컬 배포 미러의 파일별 일치 검증.

## 검증 결과

Chromium 153·WebKit 26.5에서 기존 6개 suite 396개 검사와 신규 Sprite suite 40개 검사, 총 436개를 통과했습니다. 신규 suite의 page error는 0개이며, 기존 회귀 suite의 console/page/resource error도 0개입니다.

모든 11개 시트의 실제 CSS 타임라인에서 각 셀 구간의 5%·95% 위치를 검사해 처음·마지막 셀과 빈 프레임 없는 경계를 확인했습니다. 일반·모션 감소 상태에서 320/360/390/430/1024px의 5개 화면을 확인했습니다. 완료 콜백·취소·반복·pause/resume·화면 교체·빠른 입력·키보드 이동·성공/오류·미리보기 fallback·동시 재생 수·CLS와 geometry를 검증했습니다. 기록·목표 저장 실패에서 성공 재생이 없으며 999/1000 목표는 미달성으로 남습니다.

테스트는 독립적인 합성 fixture를 사용하며 실제 사용자 저장소는 변경하지 않습니다. 숨겨진 탭 계약은 visibilitychange를 시뮬레이션해 확인합니다. WebKit은 Layout Shift API 대신 geometry 안정성을 확인합니다. 물리 기기의 배터리·GPU·키보드·스크린리더 검증은 수행하지 않았습니다.

## 재생성과 로컬 미러

```sh
python3 scripts/build-sprites.py
PW_EVIDENCE_ROOT=evidence/SPRITE-MOTION/new-run node tests/verify-sprites.cjs
python3 scripts/sync-sprite-mirror.py
```

시트 생성은 원본·provenance 해시·캔버스·alpha·패킹 후 모든 셀을 검증합니다. 미러 스크립트는 앱 파일을 `deployments/PW-WOORI-05/site/out/`으로 복사하고 SHA-256을 대조합니다. `sprite-source/`·개발 원본은 포함하지 않습니다. 이전 `deployment.json`, `source-manifest.json`, `site.tar.gz`는 과거 공개 배포 증거로 보존하며 이번 로컬 미러의 증거는 새 manifest에 남깁니다.
