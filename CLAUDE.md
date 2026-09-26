# CLAUDE.md — 프로젝트 작업 가이드 (세션 간 영속 메모)

> 이 파일은 매 세션 로드되는 **진입점**입니다. 핵심만 두고, 상세는 `docs/` 로 링크합니다.
> 용량 관리를 위해 자세한 내용은 반드시 `docs/*.md` 에 기록하고 여기서는 한 줄 요약 + 링크만 둡니다.

## 프로젝트 한눈에

**브라우저 전용(서버 없음) 한국어 글쓰기 앱 — Scrivener 클론.**
React 18 + TypeScript + Vite + Zustand. 본문은 **실제 RTF**. 저장은 IndexedDB + File System Access(`.scriv`) + zip 백업. PWA 오프라인. 전부 클라이언트에서 동작.

- 작업 디렉터리: `D:\tof3\4 dev\cc_sry` · GitHub: `finemold2/sry2`(main) · **GitHub Pages**: https://finemold2.github.io/sry2/ (랜딩) · https://finemold2.github.io/sry2/app/ (앱) — main 푸시 시 `.github/workflows/deploy-pages.yml` 이 자동 배포.
- 플랫폼: Windows / PowerShell. (Bash 도구도 사용 가능)
- 사용자 선호: **묻지 말고 끝까지 자동 구현·검증**. 구현하면 **반드시 여러 명(에이전트)로 교차 베타테스트**. **데이터(원고) 안전이 최우선.**

## 빠른 명령

```bash
npm run dev          # 개발 서버 (5173)
npm run build        # 프로덕션 빌드(PWA). 빌드 전 vite preview 종료+dist 삭제 권장
npm run build:pages  # 빌드 + GitHub Pages 조립(_site/ = site/ + dist→app/). CI 와 동일
npm test             # 단위 테스트 174개 (rtf 88 + export 12 + creative 55 + persistence 19)
npx tsc --noEmit     # 타입체크
node scripts/_gentools.cjs        # 도구 레지스트리 재생성(도구 추가 후 필수)
node scripts/_cdp_tools.cjs "<ids>"      # CDP 렌더 전수검증
node scripts/_cdp_interact.cjs "<ids>"   # CDP 상호작용(클릭/입력) 베타
node scripts/_cdp_datasafety.cjs         # 데이터 안전 E2E 베타
node scripts/_cdp_char_to_relmap.cjs     # 도구 연계 실사용 흐름(인물 시트→관계도) E2E
node scripts/_cdp_link_payloads.cjs      # 도구 연계 payload 수신 E2E(17종)
```
- 클라우드 세션(네트워크 정책) 에서 npm 이 403 이면: `NO_PROXY= npm ci --proxy "$HTTPS_PROXY" --https-proxy "$HTTPS_PROXY" --noproxy ""`.
- CDP 배터리는 preview(:4178) + 스크립트마다 새 헤드리스 Chromium(:9222, 새 프로필) 로 돌린다(세션 #34). 하니스 규칙: React onBlur 는 `focusout`, 체크박스는 `.click()`, 클릭 직후 판정은 리렌더 대기, `setBody` 전 `activeElement.blur()`.
도구 ids 추출: `grep -oE "id: '[^']+'" src/tools/registry.tsx | sed "s/id: //;s/'//g" | tr '\n' ','`

## 구조 요약 (상세는 docs/)

- `src/store/store.ts` — Zustand 스토어(프로젝트 상태·뷰·dirty). `src/model/types.ts` — 타입.
- `src/persistence/` — idb/backup/pack/fsaccess/zip/scrivx/blobs/sync. **데이터 안전 보강 적용됨** → [docs/DATA-SAFETY.md](docs/DATA-SAFETY.md)
- `src/components/` — 10개 뷰(에디터/코르크보드/아웃라이너/보드/캔버스/연재/타임라인/참고문헌/논증/DB)·인스펙터·CreativeStudio 등.
- `src/creative/` — 합성기 1,534(procgen)·분석기 47·가이드 565·단어은행 등(창작 스튜디오, 약 2,445 도구).
- `src/tools/` — **도구 허브 507종**(기본 100 + 장르별 168 + 자율 대형 도구 novel-A~K) + `linkbus.ts`(연계) + `ToolWindow`/`ToolHub`/`registry.tsx`. 모든 도구는 ToolWindow 하단 자동 "관련 도구" 스트립으로 연결(App `relatedToolsFor`). → [docs/TOOL-HUB.md](docs/TOOL-HUB.md)
- `src/export/`, `src/compile/`, `src/rtf/` — 컴파일/내보내기(DOCX/EPUB/ODT/LaTeX/MD/Fountain/FDX)·RTF 엔진.
- `site/` — **앱 소개(랜딩) 페이지**(앱과 분리된 독립 정적: 미니멀 스위스+스크롤 모션+실제 앱 스크린샷, 곧-출시 토스트·의견 폼). 로컬 미리보기 `node scripts/serve-site.cjs`(→ :5500). 배포/재생성·SRY_APP_READY 플래그는 `site/README.md`·SESSION-LOG #29. **GitHub Pages 배포 완료(#33)**: `SRY_APP_READY=true`, 랜딩=루트·앱=`/app/`.

## 상세 문서 (docs/)

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — 전체 아키텍처·데이터 모델·뷰·영속성 흐름
- [docs/DATA-SAFETY.md](docs/DATA-SAFETY.md) — 원고 소실 방지 보강(저장 검증·백업 무결성·구조 복구·복구 경로)·테스트
- [docs/TOOL-HUB.md](docs/TOOL-HUB.md) — 도구 100종·추가법·레지스트리 생성기·lazy 코드스플리팅·CDP 검증
- [docs/TOOL-LINKAGE.md](docs/TOOL-LINKAGE.md) — 도구 연계(linkbus 공유 라이브러리)·창 최소화/독
- [docs/LICENSING.md](docs/LICENSING.md) — 이미지/미디어 저작권 정책(PD/CC0/DiceBear)·키 없는 API 목록
- [docs/SESSION-LOG.md](docs/SESSION-LOG.md) — **⚠️ 다음 세션은 이 파일 최상단 "▶▶ 다음 세션 이어받기" 블록부터 읽고 이어가세요.** 작업 연대기 + 남은 과제 + 검증 루틴.

## 컨벤션

- 도구 파일: `src/tools/<Pascal>.tsx`, `export const meta = {id,name,icon,group,intro?,w?,h?}` + `export default FC`. import 은 **react 와 `./linkbus` 만**. 외부 API 는 **키 불필요+https+CORS** 또는 완전 로컬. 추가 후 `node scripts/_gentools.cjs`.
- 검증 루틴: `tsc` 0 → `npm test` → `vite build` → CDP 렌더/상호작용 베타. 구현마다 반복.
- 워크플로(다중 에이전트)는 **한 번에 하나만**(동시 실행 시 서버 레이트리밋 대량 실패). 내부 동시성 ~16.
