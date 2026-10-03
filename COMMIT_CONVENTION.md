# 커밋 컨벤션

[Conventional Commits 1.0.0](https://www.conventionalcommits.org/ko/v1.0.0/)을 따릅니다.

## 형식

```
<type>(<scope>): <subject>

<body>

<footer>
```

- **type**: 필수. 아래 표 중 하나
- **scope**: 선택. 변경 영역 (예: `home`, `record`, `goal`, `report`, `all`, `shell`, `state`, `sprites`, `tests`, `deploy`)
- **subject**: 필수. 50자 이내, 마침표 없이, 명령형으로 작성 (`Add`, `Fix` / `추가`, `수정`)
- **body**: 선택. 제목과 한 줄 띄우고 *무엇을, 왜* 바꿨는지 작성 (72자 줄바꿈 권장)
- **footer**: 선택. `BREAKING CHANGE: ...`, `Closes #12` 등

## type

| type | 용도 |
|---|---|
| `feat` | 새 기능 |
| `fix` | 버그 수정 |
| `docs` | 문서만 변경 (README, docs/) |
| `style` | 코드 의미 변화 없는 포맷·세미콜론 등 (CSS 디자인 변경은 `feat`/`fix`) |
| `refactor` | 기능 변화 없는 구조 개선 |
| `perf` | 성능 개선 |
| `test` | 테스트 추가·수정 (tests/) |
| `build` | 빌드·배포 산출물, 의존성 (deployments/) |
| `ci` | CI 설정 |
| `chore` | 기타 잡무 (설정 파일, 에셋 정리 등) |
| `revert` | 이전 커밋 되돌리기 |

호환되지 않는 변경은 type 뒤에 `!`를 붙이거나(`feat(state)!: ...`) footer에 `BREAKING CHANGE:`를 적습니다.

## 예시

```
feat(goal): 목표 적립 버튼 추가
fix(record): 금액 0원 입력 시 저장되는 문제 수정
docs: README를 PW-WOORI-05 기준으로 갱신
test(report): habitScore 경계값 검증 추가
chore(sprites): 마스코트 스프라이트 webp 재압축
refactor(state)!: localStorage 키를 pocketwon_v2로 변경

BREAKING CHANGE: 기존 pocketwon_demo_v1 데이터는 읽지 않습니다.
```

## 적용 (클론 후 1회)

```sh
git config core.hooksPath .githooks
git config commit.template .gitmessage
```

- `.githooks/commit-msg`가 형식에 맞지 않는 커밋을 거부합니다. Merge/Revert/fixup 커밋은 통과합니다.
- `.gitmessage`는 `git commit`(메시지 없이) 실행 시 편집기에 템플릿으로 표시됩니다.
