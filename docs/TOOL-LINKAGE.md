# 도구 연계(linkbus) + 창 최소화/독

목표: 도구들이 제각각이 아니라 **관련 도구·무작위 생성기끼리 연계**되어 데이터가 합쳐짐(예: 배경설정집에 갤러리 사진 첨부, 캐릭터 모델↔시트↔관계도). 각 창에 최소화 버튼.

## linkbus API (`src/tools/linkbus.ts`)
도구는 react 와 이 모듈만 import 가능.

**공유 라이브러리**(localStorage `scrivweb:shared-library`, 종류: characters/places/images/snippets) — 같은 종류를 다루는 도구가 자동 연계:
- `useLibraryList(kind)` — React 훅(useSyncExternalStore, 자동 구독/리렌더)
- `addToLibrary(kind, item)`→rec / `updateInLibrary(kind,id,patch)` / `removeFromLibrary(kind,id)` / `getList(kind)`

**도구 열기(데이터 전달)**:
- `openToolLinked(toolId, payload?)` — App 이 `registerOpener` 로 등록. 컴포넌트는 `props.payload` 수신.

**이미지 픽 채널**:
- `requestImagePick({requesterId, onPick:(img)=>void}, galleryToolId?)` → 갤러리 열림(payload.pickMode=true)
- 제공 도구가 `fulfillImagePick(img)` → onPick 호출. `hasPendingPick()`/`cancelImagePick()`.

**관련 도구 메타**: `TOOL_RELATIONS[toolId]: string[]`. UI: `.linkbar`/`.linkbtn`, 라이선스 `.license-note`/`.license-badge`.

**타입**: SharedCharacter{id,name,photo?,photoCredit?,role?,traits?:{k,v}[],appearance?,personality?,goal?,secret?,notes?,source?}; SharedPlace{id,name,kind?,mood?,image?,imageCredit?,history?,rules?,sensory?,notes?}; SharedImage{id,url,title?,credit?,license?,source?}; SharedSnippet{id,text,source?,tags?}.

## 창 최소화/독
- `ToolWindow.tsx`: `onMinimize` prop + 최소화 버튼(닫기 옆).
- `App.tsx`: `minimizedToolIds` 관리, 하단 `.tool-dock` 칩(클릭 복원, ×로 닫기). `toolPayloads` 맵으로 payload 전달. registry Component 타입 `ComponentType<{payload?}>`.

## 적용 현황
- 리트로핏 완료(12): imagination-gallery, met-museum-art, moodboard-grid, character-model, character-sheet, relationship-map, setting-bible, sensory-palette, name-mixer, name-analyzer, cover-mockup, poke-creature.
- 신규 도구는 같은 연계 규약으로 저작. 창작 스튜디오 무작위 생성기 → 라이브러리 연계는 남은 과제.

## payload 수신 규약 (#34 전수 점검 후 확정)
- 링크 대상 도구는 **반드시** `export default function X({ payload }: { payload?: Record<string, unknown> } = {})` 로 payload 를 받고, 보낸 키를 실제로 화면에 반영한다(입력칸 프리필·노드 추가·검색 실행 등). 받기만 하고 버리면 "연계가 안 된다"로 보인다.
- 같은 payload 객체가 부모 리렌더로 다시 들어와도 1회만 처리: `const handledPayload = useRef<unknown>(null)` + `if (!payload || handledPayload.current === payload) return`.
- 제목처럼 덮어쓰면 안 되는 값은 **비어 있을 때만** 채운다(플롯 피라미드·Save the Cat). 인물/장소는 선택 항목이 있으면 그 항목에 반영, 없으면 새로 추가(인물 시트 `job/themeSong`).
- 정적 점검 스크립트(세션 #34): `src/tools` 에서 `openToolLinked('id', {…})` 를 모두 추출해 (a) 존재하지 않는 id, (b) 대상 파일에 `payload` 가 없음, (c) 보낸 키를 대상이 읽지 않음 을 표로 뽑았다. 새 링크를 추가하면 같은 방식으로 확인.
- 실동작 검증: `node scripts/_cdp_link_payloads.cjs`(수신 17종) · `node scripts/_cdp_char_to_relmap.cjs`(인물 시트→관계도 실사용 흐름) · `node scripts/_cdp_linkage.cjs`.
