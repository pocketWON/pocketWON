# Vercel 루트 404 복구

2026-10-04에 `https://pocketwon.vercel.app/`의 `404 NOT_FOUND`를 복구했습니다.

- 원인: 저장소 루트에 `index.html`이 없는데 Vercel의 Output Directory가 기본값(`.`)이었습니다. `/`는 404, `/ks6s3juocjzc2.kimi.page/index.html`은 200으로 응답했습니다.
- 저장소 수정: `vercel.json`에서 정적 앱 폴더 `ks6s3juocjzc2.kimi.page`를 Output Directory로 지정했습니다. 커밋 `8066e59`를 `pocketWON/pocketWON`의 `main`에 푸시했습니다.
- 운영 수정: `clcocloud/pocketwon` 프로젝트의 Output Directory도 같은 값으로 수정하고 기존 운영 소스를 재배포했습니다.
- 결과: 배포 `dpl_AFsshQZEHbL7ZzRy7DoDQm7JMtXc`는 `READY`, 운영 도메인의 `/`는 `200 OK`입니다. 배포 주소는 `https://pocketwon-2pwmi7y2v-clcocloud.vercel.app`입니다.
- 검증: Chromium·WebKit에서 기본 주소, CSS·JavaScript·이미지 로딩, 리포트 이동, 홈 복귀, 기록 열기·취소가 통과했습니다. HTTP 오류와 JavaScript 오류는 없었습니다. 응답 HTML은 현재 앱 HTML과 일치했습니다.

운영 프로젝트의 Git 연결은 `rowqqq3625-dot/pocketwon`의 `main`이며, 이번 운영 배포 소스 커밋은 `e0105bcd91003fe83d73d4cb68ec1ef2af539950`입니다. 따라서 `pocketWON/pocketWON`에 대한 푸시가 이 프로젝트를 자동 배포하지는 않습니다. 이번에는 기존 연결을 유지하고 배포 경로만 복구했습니다.

[운영 검증 결과](../evidence/VERCEL-ROOT-404/production-verification.json) · [Chromium 화면](../evidence/VERCEL-ROOT-404/chromium-production.png) · [WebKit 화면](../evidence/VERCEL-ROOT-404/webkit-production.png)
