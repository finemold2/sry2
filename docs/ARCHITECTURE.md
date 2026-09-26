# 아키텍처

브라우저 전용 SPA. 서버/백엔드 없음. React 18 + TS + Vite + Zustand. PWA.

## 상태/모델
- `src/store/store.ts` — Zustand 단일 스토어: `project`, `dirty`, `lastSaved`, `activeId`, `selectedIds`, `viewMode`(10종), `inspectorTab`, split/composition 등. 모든 프로젝트 변이 액션(setBodyRtf, moveItem, group/merge, convertType, addReference, setEpisodeMeta, applyRemoteProject 등). `markSaved()`→dirty=false.
- `src/model/types.ts` — Project/BinderItem/Settings/WritingType/EpisodeMeta/SeoMeta/CslItem/ArgumentModel 등.
- 본문은 `BinderItem.bodyRtf`(실제 RTF 문자열).

## 영속성 (`src/persistence/`)
- `idb.ts`(IndexedDB CRUD + 검증), `backup.ts`(zip 롤링 백업 + 무결성), `pack.ts`(pack/unpack + normalizeProject + repairStructure), `fsaccess.ts`(File System Access `.scriv`), `zip.ts`, `scrivx.ts`(Scrivener 3 패키지), `blobs.ts`(미디어), `sync.ts`(BroadcastChannel 다탭), `index.ts`(배럴 + lastProjectId). 안전 보강 → [DATA-SAFETY.md](DATA-SAFETY.md).

## 뷰 (`src/components/`)
10개 뷰: 에디터/코르크보드/아웃라이너/보드(상태칸반)/캔버스(자유배치)/연재 대시보드(⌘6)/타임라인(⌘7)/참고문헌(⌘8)/논증/데이터베이스(⌘9). 인스펙터 7탭(+SEO). CommandPalette(⌘K). Composition(집중모드).

## 창작 스튜디오 (`src/creative/`)
약 2,445 도구의 데이터 기반 허브(별도, 도구 허브와 다름):
- 절차적 합성기 1,534(`procgen.ts` + `data/procgen-*.ts`, 각 ≥1천만 조합, 슬롯 잠금/재생성), 분석기 47(`analyzers.ts`), 가이드 565, 단어은행 94, 생성기 151. 자동 생성 레지스트리(`*-registry.ts`). `CreativeStudio.tsx` 는 lazy 로딩.
- 인용(`cite.ts`), 분석 엔진(`prose.ts`/`structure.ts`/`checks*.ts`).

## 도구 허브 (`src/tools/`)
100종 플로팅 대형 도구 + `linkbus.ts`(연계) + ToolWindow/ToolHub/registry. → [TOOL-HUB.md](TOOL-HUB.md), [TOOL-LINKAGE.md](TOOL-LINKAGE.md).

## 컴파일/내보내기
- `src/rtf/`(RTF 엔진, 라운드트립), `src/compile/compile.ts`(원고 조립), `src/export/`(DOCX/EPUB/ODT/LaTeX/Markdown/Fountain/FDX + platforms BBCode/HTML), 이미지/페이지나눔 지원.

## 빌드/PWA
- `vite.config.ts`: VitePWA(autoUpdate, workbox 한도 14MB), react manualChunks, base './'. 도구·스튜디오 lazy 청크.
- 템플릿 12종(`templates/templates.ts`), 구조 91종(`structures.ts`+`structures-craft.ts`).

## 테스트
`npm test` = rtf 88 + export 12 + creative 55 + persistence 19 = **174**. CDP E2E 스크립트(`scripts/_cdp_*.cjs`).
