# 도구 허브 (막혔을 때 돕는 대형 도구)

도구 메뉴/명령 팔레트에서 ToolHub 런처를 열어 검색·카테고리로 찾고, 여러 개를 플로팅 창으로 동시에 배치. 현재 **100종**, 목표는 계속 확장(+100 진행 예정).

## 그룹 (현재 100종)
영감·발상 20 · 집중·생산성 18 · 구상·정리 16 · 교정·언어 13 · 유틸·참고 9 · 리서치·자료 8 · 분위기·시각 7 · 언어·어휘 5 · 게임·캐릭터 4.

## 도구 추가법 (확장 규약)
1. `src/tools/<Pascal>.tsx` 작성:
   - `export const meta = { id:'<kebab>', name, icon, group, intro?, w?, h? }`
   - `export default function <Pascal>({ payload }: { payload?: Record<string,unknown> }) { ... }`
   - import 은 **react 와 `./linkbus` 만**. 외부 API 는 **키 불필요+https+CORS** 또는 완전 로컬.
   - 로딩/실패/빈입력 graceful, nonce ref 경쟁상태, 언마운트 정리. CRUD 도구는 localStorage `scrivweb:tool:<id>`.
2. `node scripts/_gentools.cjs` 로 `registry.tsx` 재생성(meta 인라인 + Component **lazy 청크 분리**).
3. `npx tsc --noEmit` → `npx vite build` → CDP 베타.

## 레지스트리/코드스플리팅
- `scripts/_gentools.cjs` 가 `src/tools/*.tsx` 의 `export const meta` 를 중괄호 균형으로 추출해 registry 에 인라인, Component 는 `lazy(()=>import('./X'))`. (ToolWindow/ToolHub/registry/linkbus 는 스킵 — linkbus 는 .ts).
- App 은 `UTILITY_TOOLS` 로 ToolHub + ToolWindow 렌더, `<Suspense>` 로 감쌈.
- **PWA 함정**: 모놀리식 번들(9.7MB) > workbox 2MB 한도 → 빌드 실패. 해결: lazy 분리 + `vite.config` workbox `maximumFileSizeToCacheInBytes` 14MB + react manualChunks. 재빌드 전 `vite preview` 종료 + `rm -rf dist`(preview 가 dist 잠그면 옛 청크 누적).

## CDP 베타 스크립트
- `scripts/_cdp_tools.cjs "<ids>"` — 각 도구 `__openTool` 로 열어 mount/예외/console.error/언마운트 점검.
- `scripts/_cdp_interact.cjs "<ids>"` — 입력 타이핑 + 안전 버튼 클릭으로 **핸들러 런타임 예외**까지 점검.
- 헤드리스 크롬: `--headless=new --disable-gpu --remote-debugging-port=9222 --user-data-dir=<새 프로필>`. 종료는 `taskkill /F /IM chrome.exe /T`.

## 연계·최소화
도구는 서로 연계됨 → [TOOL-LINKAGE.md](TOOL-LINKAGE.md). 창 최소화 → 하단 독.

## 저작권
이미지/미디어 도구는 PD/CC0/오픈소스만 → [LICENSING.md](LICENSING.md).
