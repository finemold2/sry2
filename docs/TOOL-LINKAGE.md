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
