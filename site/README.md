# sry — 소개(랜딩) 페이지

앱과 **완전히 분리된 독립 정적 사이트**입니다. 빌드 도구·번들러가 필요 없습니다.
`index.html`을 그대로 열면 동작하며, 어떤 정적 호스팅에도 폴더째 올리면 됩니다.

```
site/
├─ index.html        # 페이지 마크업 + 설정(SRY_APP_URL)
├─ styles.css        # 미니멀 스위스 디자인 시스템 (라이트/다크·반응형)
├─ main.js           # 테마 토글·스크롤 리빌·카운터·모바일 메뉴 (외부 의존성 0)
├─ assets/
│  ├─ icon.svg              # 파비콘 / 로고 마크
│  ├─ og.svg / og.png       # 소셜 미리보기 (PNG 를 og:image 로 사용)
│  ├─ shot-editor-light.png # 히어로: 실제 에디터 화면(라이트)
│  ├─ shot-editor-dark.png  # 히어로: 실제 에디터 화면(다크)
│  └─ shot-*.png            # 쇼케이스: 도구허브·코르크보드·연재·도구창·DB
└─ README.md         # 이 문서
```

### 스크린샷은 진짜 앱 화면입니다

`assets/shot-*.png` 는 실제 sry 앱(`dist`)을 헤드리스 Chrome 으로 구동해 캡처한 실화면입니다.
앱 UI 가 바뀌면 아래로 다시 생성할 수 있습니다(Chrome 을 `--remote-debugging-port=9222` 로 띄운 상태에서):

```bash
npm run build                         # dist 갱신
node scripts/_cdp_app_shots.cjs       # preview_app/*.png 재생성 → site/assets 로 복사
node scripts/_rasterize_og.cjs        # og.svg → og.png 재생성
```

- 외부 요청은 **Pretendard 웹폰트(jsdelivr CDN)** 하나뿐이며, 실패해도 시스템 폰트로 안전하게 폴백합니다.
- 그 외 이미지·아이콘·소셜 프리뷰는 전부 파일 내부에 포함되어 오프라인/폐쇄망에서도 깨지지 않습니다.

## "시작하기" 버튼을 앱에 연결하기

`index.html` 상단의 **이 한 줄**만 바꾸면 페이지의 모든 시작 버튼이 갱신됩니다.

```html
<script>window.SRY_APP_URL = './app/';</script>
```

- 기본값 `./app/` — 랜딩을 루트에 두고, 앱을 그 아래 `/app/` 경로에 배치할 때.
- 절대 URL 예: `window.SRY_APP_URL = 'https://app.example.com/';`

## 배포 방법

### A. 소개 페이지만 올리기 (가장 간단)

`site/` 폴더를 정적 호스팅에 올리면 끝입니다.

- **Netlify / Cloudflare Pages / Vercel**: 이 폴더를 드래그&드롭하거나 배포 디렉터리로 `site` 지정.
- **GitHub Pages**: `site/`를 리포지토리 루트나 `/docs`로 두고 Pages 활성화.

### B. 소개 페이지 + 앱을 한 번에 올리기

앱(SPA)은 `base: './'`(상대경로)로 빌드되므로 어떤 하위 경로에도 놓을 수 있습니다.

1. 프로젝트 루트에서 앱을 빌드합니다.
   ```bash
   npm run build          # → dist/ 생성
   ```
2. 빌드 결과를 랜딩 하위 `app/`으로 복사합니다.
   ```bash
   # PowerShell
   Copy-Item -Recurse -Force dist site\app
   # bash
   cp -r dist site/app
   ```
3. `site/` 폴더를 통째로 호스팅에 올립니다. → `/`는 소개 페이지, `/app/`은 실제 앱.
4. `SRY_APP_URL`은 기본값 `./app/` 그대로면 됩니다.

> 앱을 별도 도메인/서브도메인에 두고 싶다면 B-2를 건너뛰고, `SRY_APP_URL`을 그 절대 URL로 지정한 뒤 A 방식으로 소개 페이지만 올리면 됩니다.

## 커스터마이즈 포인트

- 브랜드 색: `styles.css` 상단 `:root`의 `--accent` (기본 `#3f6fd6`, 앱 아이콘 블루 계열).
- 로고/아이콘: `assets/icon.svg`.
- 만든이 표기: 푸터의 `Made by Parue`.
- 지표 숫자(도구 개수 등): `index.html`의 `data-count` 속성.
