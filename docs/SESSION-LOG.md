# 세션 작업 로그 + 남은 과제

> 세션이 갑자기 닫혀도 이어받을 수 있도록 이번 작업의 흐름과 **남은 과제**를 기록. 최신이 위.

## ▶▶ 다음 세션 이어받기 (2026-09-26, 최신) — 여기부터 읽으세요

### 2026-09-26 #35 (브랜치 `design-v2`): 디자인 2 "Aurora" 스킨 — 큼직한 내비·아이콘·카드형 작업 공간, 세 스킨 전환
- **요구**: 기존 디자인(클래식·스튜디오)은 손대지 않고, 새 브랜치에서 최근 트렌드의 완전 새 디자인을 만들되 기능은 100% 동일, 나중에 디자인1↔2 전환 가능.
- **구현 방식**: 세 번째 스킨 `aurora` (`store.uiSkin: 'classic'|'studio'|'aurora'`, `sry:uiSkin` 영속). 셸 `src/components/AuroraShell.tsx`(StudioProps 재사용 + `onSetSkin`) + 스타일 `src/aurora.css`(`.app-aurora` 범위). 뷰/바인더/인스펙터/도구/모달은 같은 컴포넌트를 그대로 렌더 → 기능 동일. 메뉴 트리거는 `.menu-wrap > button` 구조 유지(투어/매뉴얼 호환).
- **디자인**: 좌측 104px 대형 내비(26px 아이콘 + 라벨, 활성 시 그라디언트 아이콘 배지, 하단 도구 5종은 2열 아이콘), 상단 2줄 커맨드 바(알약형 메뉴 4종 · 배율 · **디자인 스위처(클래식/스튜디오/오로라)** · 큼직한 아이콘+라벨 액션 7종 · 그라디언트 저장 버튼 · 제목/경로), 카드형 3분할 작업 공간(라운드 22px·그림자·간격 12px), 공용 컨트롤 확대(.minibtn/.btn-primary/.linkbtn/.field/.binder-row/.insp-tabs/.toolwin/.modal/.dropdown …), 라이트/다크/세피아 토큰 상속, 900px 이하 아이콘 전용·오버레이 패널.
- **전환 진입점**: 클래식 툴바 `Aurora` 버튼, 스튜디오 보기 메뉴 "Aurora UI 로 전환", 명령 팔레트 `skin-aurora`, 오로라 헤더 스위처.
- **주의**: 상단 바 z-index 는 드롭다운이 열린 동안만 350(`:has(.dropdown)`), 평소 50 — 도구창(200~289)이 헤더에 가려 잘리던 문제 회피.
- **검증**: `scripts/_cdp_aurora_smoke.cjs`(셸 렌더·10뷰·메뉴 4종·헤더 액션·패널/도구창·스킨 왕복·좁은 화면) + 기존 배터리 회귀(ui_all·menus_all·keyboard·view_parity·a11y·all_tools). 스크린샷 7장(라이트/다크/메뉴/도구창/좁은 폭) 육안 확인.
- **다음**: 사용자 리뷰 후 `main` 머지 시 기본 스킨은 클래식 유지(기존 사용자 화면 불변) — 디자인 2는 스위처로 선택. 세부 톤(색·라운드·간격)은 피드백에 따라 `aurora.css` 토큰만 조정.

### 2026-09-26 #34: 전 기능 실동작 배터리(97 스크립트) 완주 + 도구 연계(payload) 전수 점검·수정 + 확정 버그 6건
- **환경**: 클라우드 세션(npm 은 `NO_PROXY= npm ci --proxy $HTTPS_PROXY --https-proxy $HTTPS_PROXY --noproxy ""` 로 프록시 경유 필요). 러너: preview(:4178) 1개 + 스크립트마다 새 헤드리스 Chromium(:9222, 새 프로필) — `chrome --headless=new --no-sandbox --remote-debugging-port=9222 --user-data-dir=<tmp>`.
- **실제 앱 버그 수정(확정, 전부 실동작 재검증)**
  1. **찾기·바꾸기: 문단 첫 글자에서 시작하는 매치가 '앞 문단 끝'에서 선택되어(selection "\n고양이") 바꾸기 1개가 실패** — `FindReplaceBar.findRanges.locate` 시작 위치를 `pos < end` 로(끝만 `<=`). `_cdp_find_replace` 38/0.
  2. **중첩 목록 저장 누락**: 브라우저 `execCommand('indent')` 가 `<ul>` 바로 아래 `<ul>` 을 만들면 `html.ts processList` 가 건너뛰어 **들여쓴 항목이 RTF 에서 통째로 사라짐** → 한 단계 깊은 목록으로 처리. `_cdp_editor_advanced` 36/0.
  3. **첫 실행 기본 프로젝트가 IDB 에 저장되지 않아**, 원고를 고치기 전 수집함/공유 라이브러리(프로젝트별 키)에 담은 내용이 새로고침 후 새 프로젝트 id 로 바뀌며 고아가 되던 문제 → 부팅 시 즉시 `idbSave`+`setLastProjectId`(App). `_cdp_stash` 9/0.
  4. **드롭다운 메뉴가 낮은 화면(600~700px)에서 뷰포트 아래로 잘려 하단 항목 클릭 불가** → `.dropdown { max-height: calc(100vh - 64px); overflow-y: auto }`.
  5. 공포 장치 → '긴장 곡선' 버튼이 존재하지 않는 도구 id(`tension-curve-editor`)를 열어 무반응 → `tension-curve`.
  6. 스토리 타로 '다시 섞기' 가 화면 변화 없음(전부 뒷면) → 피드백 토스트.
- **도구 연계(payload) 전수 정적 점검**: `openToolLinked` 586건/대상 126종을 스캔 → **payload 를 전혀 읽지 않던 대상 18종 중 실제 내용을 버리던 10종 수정**(갈등 설계기·부사/시대착오/이중피동 점검기·워밍업·상징 사전·음악 갤러리(커스텀 무드 칩)·POV 추적기·Save the Cat·플롯 피라미드) + **키 불일치 7종 수정**(관계도 `pair/focus`→노드+‘대조’ 관계선, 무드보드 `image/query`, 감각 팔레트 `placeKey/word`, 상상 갤러리 `cat`, 세력 빌더 `title/intro`, 인물 시트 평평한 `job/role/themeSong`, 세계관 위키 `q`). 관례: `export default function X({ payload }: { payload?: Record<string, unknown> } = {})` + `handledPayload` ref 로 같은 payload 1회 처리.
- **신규 E2E**: `_cdp_char_to_relmap.cjs`(인물 시트→관계도 실사용 흐름 26/0: 생성→라이브러리 저장→관계도 버튼→창 열림/이미 열린 창 payload 갱신→중복 방지→일괄 불러오기→역방향 가져오기) · `_cdp_link_payloads.cjs`(수정한 17종 payload 수신 22/0).
- **하니스 현행화(앱 버그 아님)**: 옛 키(`scrivweb:*`, `scrivener-web`)→`sry:*`, React onBlur 는 `focusout` 으로, 체크박스는 `.click()`, 클릭 직후 동기 판독→리렌더 대기, #28 집중 모드 선택 모달·#30 오토포커스(setBody 전 blur)·#24 URL 새 탭·#31 clean 전환 등 설계 변경 반영, `Page.javascriptDialogOpening` 자동 수락, 투어 말풍선 닫기, 뷰포트 명시. 외부 API 도구(deckofcardsapi 등)는 샌드박스 차단으로 `tools_ops` 2건 미판정.
- **최종 결과**: 단위 174/174 · tsc 0 · 실동작 97 스크립트 중 all_tools 555/0·ui_all 72/0·binder_deep 100/0·views 전부 0실패·datasafety 15/0·savecycle 18/0·save_open 29/3*·menus_all 142/0·modal_parity 165/0·panel_parity 56/0·action_parity 62/0·keyboard 48/0·stash/stash_deep/stash_detail 0실패·연계 3종 0실패 … (*·a11y 1·write 1·views_ab 2·views_ef 1·aux 3·inspector_deep 1 = #32 기록된 하니스/의도 아티팩트, 신규 회귀 0).
- **다음 과제**: ① 외부 API 도구는 네트워크 허용 환경에서 `tools_ops` 재확인 ② `payload` 를 받지만 `genre` 힌트만 버리는 대상(plot-twist-deck·emotion-arc·scene-list 등)은 장르 프리셋이 생기면 연결 ③ 남은 하니스 아티팩트(*)는 정리 대상.

### 2026-09-26 #33: GitHub 저장소 `finemold2/sry2` 로 이식 + GitHub Pages 자동 배포 구축
- **저장소**: 로컬 `D:\tof3\4 dev\cc_sry` 를 사용자가 `https://github.com/finemold2/sry2`(main) 로 푸시. 이후 작업의 원격 루트는 이 저장소.
- **배포 설계**(#29 "남은 과제 ①" 이행): 랜딩 `site/` = 루트, 앱 `dist/` = `/app/`. 신규 `scripts/build-pages.cjs`(site→`_site/`, dist→`_site/app/`, README/DESIGN.md 제외, `.nojekyll`) + `npm run build:pages`. `site/index.html` **`SRY_APP_READY=true`**(시작 버튼→`./app/`), `og:url`/`og:image`/`twitter:image` 를 Pages 절대 URL 로. `.gitignore` 에 `_site`.
- **CI**: `.github/workflows/deploy-pages.yml` — main 푸시/수동 실행 → `npm ci` → `typecheck` → `npm test` → `build:pages`(NODE_OPTIONS 6GB) → `configure-pages`(enablement) → `upload-pages-artifact(_site)` → `deploy-pages`. 검증 게이트 하나라도 실패하면 배포 안 함.
- **1차 실행 결과(run #1)**: npm ci·tsc 0·단위 174/174·vite build 25s(precache 566 entries/25.3MB, CreativeStudio 청크 3.9MB)·`_site` 1,459 파일 **전부 성공**. `configure-pages` 만 실패: 저장소에 Pages 사이트가 아직 없고 GITHUB_TOKEN 으론 생성 불가("Resource not accessible by integration"). → 사용자가 **Settings → Pages → Source = GitHub Actions** 를 켬.
- **배포 성공(run #2, 6c54e70)**: build·deploy 잡 전부 success. GitHub Deployments API 기준 `github-pages` 환경 상태 **success**, `environment_url = https://finemold2.github.io/sry2/`. 아티팩트 `github-pages` 10.9MB. 이후 main 푸시마다 자동 재배포(문서만 바뀐 커밋은 `paths-ignore` 로 제외).
- **로컬 검증(클라우드 세션)**: 이 세션 환경은 `registry.npmjs.org` 가 네트워크 정책으로 차단돼 로컬 빌드 불가 → 빌드/테스트는 CI 가 담당. 랜딩은 의존성 0 이라 `_site` 를 `/sry2/` 하위 경로로 띄워 Playwright 로 검사: 시작 버튼 5개 전부 `/sry2/app/`, 클릭 이동 OK, 로컬 요청 4xx 0, `og:url` 절대. (콘솔의 Pretendard CDN 실패 1건은 샌드박스 차단 아티팩트.)
- **문서**: README "배포 (GitHub Pages)" 절, CLAUDE.md(저장소·Pages 주소·`build:pages`), `site/README.md` 현재 배포 안내.
- **▶ 다음 세션 할 일(사용자 지시: "전반적인 모든 면을 테스트")**: 새 세션에서 `npm ci` 가 되는지 먼저 확인(이전 세션은 registry.npmjs.org 차단). 되면 ① `tsc`→단위 174→`vite build` ② `vite preview`(:4178)+헤드리스 Chrome(9222)으로 `scripts/_cdp_*.cjs` 배터리 전체(all_tools 555·ui_all·binder_deep·views_*·save_open·datasafety·a11y 등) ③ **도구 간 연계 집중 검증** 신규 스크립트: 인물시트→관계도/세계관 위키/캔버스, linkbus `characters/places` 공유 라이브러리 add/update/drag 흐름(사용자가 "인물시트에서 관계도로 인물 이동" 을 예로 지목) ④ 다중 에이전트 교차 베타(데이터 안전·연계·UI/UX·모바일·PWA) → 확정 버그만 수정 → 회귀 → main 푸시(자동 배포).
- **남은 과제**: ① 배포된 사이트 실브라우저 확인(https://finemold2.github.io/sry2/ · /app/) — 앱 실기동·SW 등록(scope `/sry2/app/`)·이모지 경로(`./emoji/`)·PWA 설치. (클라우드 세션은 github.io·아티팩트 저장소 접근이 차단돼 원격에서 못 봄 — 로컬 세션 또는 사용자 확인 필요.) ② (선택) actions/* 를 Node 24 대응 최신 메이저로 올려 경고 제거. ③ 로컬 세션에서 CDP 배터리(`_cdp_all_tools` 등)를 `_site/app` 기준으로도 1회 통과시키기.

### 2026-07-18 #32: 남은 UX 백로그 14건 전부 구현 + 적대 코드리뷰 13건 수정 + 전체 실동작 베타
- **병렬 구현 8(에이전트)**: #15 DB(다중선택·일괄바·헤더필터·전열 자연정렬·빈상태 원인 안내) · #16 연재(발행 요일 토글 serialDays·다음 발행일 자동 채움·회차번호 명시 고정·빈상태 CTA·플랫폼용 평문 복사) · #17 타임라인(인스펙터 메타 탭 \"장면 메타\" POV/스토리시간/플롯라인 — structure.ts 키 재사용, 빈상태 CTA→메타 탭, 크로스-장 드롭 사유 안내) · #18 보드류(코르크 폴더 단클릭=선택/더블클릭=드릴인 컨테이너 pin, ＋카드, Board 카드 위 드롭 이동, Outliner 행 키보드 순회) · #19 바인더(다중 휴지통·다중 드래그 text/scriv-ids·메뉴 클램프·가장자리 자동 스크롤) · #5 캔버스 전면 포인터화(dragPointer+touchAction) · #12 컴파일(한국어 글자수·원고지 매수, 포맷 용도 설명) · #30 참고문헌(검색·정렬·중복 안내).
- **직접 구현 8**: #21 단축키 치트시트(ShortcutSheet, F1 토글·⌘/Ctrl 자동표기·메뉴/팔레트 등록) · #4 SkinCoach(방향별 1회 3걸음) · #11 최근 프로젝트 ⌘K 명령(idbList 메타) · #25 투어 특장점 건너뛰기 · #10 허브 초성 검색(+팔레트 공백무시) · #13 md 최소 변환(#제목/**굵게**/*기울임*) · #26 가져오기 취소/실패 구분 · #22 서식바 selectionchange rAF 스로틀.
- **적대 코드리뷰(6인) 13건 발견 → 전부 수정**: (sev4) requestSwitch clean-스킵이 같은 프로젝트 .sry 되돌리기 경고까지 스킵→note 있으면 스킵 금지+복원 직전 현재본 자동 백업 / (sev4) wrapInlineStyle 다중 문단 선택이 p>span>p 오염→블록 경계 명시 차단 / (sev3×5) 투어·매뉴얼 keydown 편집영역 가드, 연재 날짜 onChange 빈값 즉시 커밋→onBlur, 참고문헌 인용 삽입 판정 .paper[contenteditable][data-doc-id] 한정(QuickRef 오탐), 코르크 freeform 선선택→드래그 판정 시점 이동(+justDragged 자동해제), 캔버스 lastDeleted 프로젝트 전환 리셋 / (sev2×5) 치트시트 uiGuard 포함+F1 토글, 매뉴얼 cleanup 이 만든 것만 삭제(키워드 id 기록·수집함 마커 라벨), 연재 번호고정 비교를 저장값 기준으로, store.select 에 anchorId 도입(Shift+화살표 연속 확장), Board 카드드롭 하이라이트 잔류 해제.
- **검증**: 신규 `_cdp_ux_batch3.cjs` 22/0. **전체 배터리**: preview 14종 전부 0실패(all_tools 555/0·ui_all 72/0·ux_new 12/0·batch2 9/0·batch3 22/0·focusmode 14/0 등) · 투어/매뉴얼 6종 0실패 · dev 감사 18종 기준선(잔여 *는 기존 규명 아티팩트/의도 동작: focus_kbd1·write1·save_open3·views_ab2·views_ef1(정렬 잠금 의도)·inspector1(SEO 표현)·aux3·a11y1) · 단위 174/174 · tsc0 · 빌드 OK. 문구 개선으로 옛 문구를 찾던 테스트 3개(views_cd 빈상태·views_ef 버튼 라벨·compile 경고) 갱신.
- **작업 규칙 추가**: 사용자 IntelliJ 열려 있음 — `rm -rf dist` 반복·불필요 빌드가 IDE 리로딩 유발 → 빌드는 필요 시 1회, dist 삭제 생략(vite build 가 덮어씀).


### 2026-07-18 #31: UX 백로그 2차 6건 구현 + 투어/매뉴얼 신기능 반영 + 전체 회귀 재실행
- **구현 6건**(`_ux_confirmed.json` 백로그에서):
  1. #11(부분) **clean 전환 확인 스킵**: `requestSwitch` 가 flush 후 dirty/uiDirty 없으면 확인 모달 없이 즉시 전환.
  2. #20(부분) **서식바 상태 반영**: 글꼴/크기 셀렉트가 캐럿 위치의 현재 값(computed→pt) 표시(목록 밖 값은 첫 옵션에 표기) + 토글 4종 aria-pressed.
  3. #10(부분) **도구 콜드스타트 해소**: `openTool` 이 `sry:tool-recents`(12개) 기록, 도구 허브 상단에 '★ 즐겨찾기'/'최근 사용' 칩 행(검색 중엔 숨김).
  4. #13(부분) **TXT·Markdown 가져오기**: `importText`(빈 줄=문단, 단일 줄바꿈=<br>) + 파일 메뉴(클래식/스튜디오)·팔레트 3곳 등록.
  5. #25(부분) **투어 이어보기**: `sry:tour:step` 저장→재진입 시 그 단계부터 + '처음부터' 버튼(마지막 '글쓰기 시작'에서만 키 제거). + ②④⑦⑧ 스텝 본문에 신규 개선(치환 자동스냅샷·.sry 복원·허브 최근/즐겨찾기·초성 검색·수집함 ⤵) 반영.
  6. #24 **매뉴얼 이어하기**: `sry:manual:step` 저장/재개+'처음부터', 범위 밖 저장값 안전 리셋. '더 깊이'에 **신규 스텝 2개**(⌘K 초성/최근·수집함→원고 ⤵) 추가(39→41단계) + 찾기·바꾸기/집중 모드 스텝 문구를 신기능(자동 스냅샷·현재/새 창 선택)에 맞게 갱신.
- **검증**: `_cdp_ux_batch2.cjs` **9/0**(허브 최근/즐겨찾기·TXT 메뉴·clean 스킵·서식바 상태·투어/매뉴얼 이어하기·41단계). 투어/매뉴얼 실행 스위트: tour 14/0 · manual 13/0 · manual_edge 6/0 · **tour_coverage 11/0**(이어보기 도입으로 스킨별 `sry:tour:step` 리셋을 테스트에 추가) · help_studio 12/0 · help_menu_both 14/0.
- **전체 회귀 재실행(30 스크립트+단위)**: all_tools 555/0 · ui_all 72/0 · ux_new 12/0 · binder 100/0 · views_cd 70/0 · aux 57/3* · views_ab 44/2* · inspector 41/1* · edge 37/0 · settings 35/0 · views_ef 34/1* · a11y 32/1* · compile 29/0 · save_open 29/3* · stash_deep 25/0 · toolwin 24/0 · toolhub 24/0 · zorder 23/0 · creative 23/0 · write 22/1* · focus_kbd 19/1* · focusmode 16/0 · 기능별 전부 0실패 · 단위 174/174 · tsc0 — *는 전부 기존 규명 아티팩트, **신규 회귀 0**.
- **남은 백로그**(다음 세션): #12 컴파일/발행 연동·한국어 분량, #15 DB 일괄편집/필터, #16 연재 자동 예약, #17 타임라인 입력 경로, #18 코르크/칸반 조작, #19 바인더 다중선택, #21 단축키 Ctrl 표기+치트시트, #22 성능, #26 오류 문구, #5 터치/키보드 드래그, #4 스킨 코치마크, #30 학술 인용(M), + #10/#11/#13/#20/#25 잔여(허브 검색 genre/초성, 최근 프로젝트 바로가기, md 서식 변환, 서식바 복수문단, 투어 과부하 축소).


### 2026-07-18 #30: UX 전문가 131명 감사 → 상위 10건 구현 + 전체 실동작 회귀(1,500+ 단언)
- **감사**: 발굴 40관점 + 종합 1 + 적대검증 90(각 클러스터 3인 렌즈) = **131 에이전트**, 원발굴 120건 → **확정 30건**(`scripts/_ux_confirmed.json` 에 전체 저장 — 남은 20건의 백로그이자 차기 작업 목록).
- **이번에 구현한 10건**(데이터 안전 우선):
  1. **자동저장 무기한 연기 수정**(App.tsx): 연속 타이핑 시 디바운스 무한 리셋 → 최초 dirty 후 max(interval×4, 8s) 넘으면 즉시 저장.
  2. **전체 찾아바꾸기 가역화**(store.projectReplace): 본문 바뀌는 문서마다 치환 전 자동 스냅샷("찾아 바꾸기 전 (A → B)") + 모달 문구를 '자동 보관됨·복원 경로' 안내로.
  3. **새 창 집중 모드 원고 덮어쓰기 방지**(Composition): Editor 의 echo-guard 외부 동기화 이식(lastSavedRtf + bodyRtf 구독, 포커스 중 스킵) + 모든 저장 경로에 echo 기록 + comp-bar 에 '● 변경됨/✓ 저장됨' 표시.
  4. **OS 파일 드롭 언로드 가드**(App): window dragover/drop preventDefault(드롭존 핸들러는 그대로).
  5. **캔버스 Delete 안전망**(StoryCanvas): 마지막 삭제(노드+엣지) 버퍼 + Ctrl+Z 복구 + 안내 플래시.
  6. **백업 모달 '파일에서 복원'**: '.sry 파일 열기…' 버튼(scriv:open-sry-picker → App 파일피커 재사용).
  7. **테마 하드코딩 수정**(styles.css): 다크 형광펜/ann-flash 어두운 잉크 강제, 아웃라이너 행 강조 hex→color-mix 변수, 세피아 --accent AA(#8a5a2c) 재고정, .tbtn nowrap.
  8. **명령 팔레트 랭킹**(CommandPalette): 점수 fuzzy(접두3>경계2>부분1>서브시퀀스0.5)+한글 초성(0.8)+즐겨찾기/최근(sry:cmd-recents, 20개) 부스트, 빈 질의=최근·즐겨찾기 상단, sel scrollIntoView, 키보드-마우스 150ms 가드.
  9. **빈 문서 오토포커스+플레이스홀더**(Editor+CSS :has) — 첫 문장 마찰 제거.
  10. **인스펙터 탭 랩**(insp-tabs flex-wrap) — 스냅샷 탭이 가로 스크롤 뒤에 숨던 문제.
- **신규 전용 검증** `scripts/_cdp_ux_new.cjs` **12/0**(치환 전 스냅샷·팔레트 랭킹/최근/스크롤·플레이스홀더·.sry 복원 경로·캔버스 Ctrl+Z·다크 잉크·드롭 가드).
- **전체 실동작 회귀(30 스크립트, ~1,550 단언)**: all_tools **555/0** · ui_all 72/0 · binder_deep 100/0 · views_cd 70/0 · aux 57/3* · views_ab 44/2* · inspector 41/1* · edge 37/0 · settings_theme 35/0 · views_ef 34/1* · a11y 32/1* · compile 29/0 · save_open 29/3* · stash_deep 25/0 · toolwin 24/0 · toolhub 24/0 · zorder 23/0 · creative 23/0 · write 22/1* · focus_kbd 19/1* · focusmode 16/0 · help 14/0 · 기능별(stash_insert/favorites/modal_ontop/stash_url/namemixer/enter/minor_verify/menu_parity) 전부 0실패 · 단위 174/174 · tsc0. (*는 전부 기존 규명된 하니스/의도 동작 — **신규 회귀 0**)
- **⚠ 테스트 하니스 규칙 추가**: 빈 문서 오토포커스(#9) 때문에 **`__scriv.setBody` 전 반드시 `document.activeElement.blur()`**(포커스된 에디터는 외부 setBody 를 무시하고 blur 시 옛 DOM 으로 되덮음 — enter/minor_verify/save_open/inspector_deep/compile/ux_new 에 반영). 집중 모드 테스트는 '현재 창에서' 선택 모달 단계를 거칠 것(zorder 반영). 지연로딩 모달은 sleep 대신 `.modal-backdrop` 출현/소멸 폴링.
- **다음 세션**: `scripts/_ux_confirmed.json` 의 남은 20건(도구 3,000종 탐색 콜드스타트, 프로젝트 전환 마찰, 컴파일/발행 연동, 가져오기 .txt/.md, DB 일괄편집, 연재 자동 예약, 타임라인 입력 경로, 바인더 다중선택, 서식바 상태, 단축키 Ctrl 표기+치트시트, 성능(서식바 리렌더/번들), 투어/매뉴얼 개선, 오류 문구, 터치/키보드 드래그 대안, 스킨 코치마크, 학술 인용(M) 등) 순차 구현.

### 2026-07-11 #29: 앱 소개(랜딩) 페이지 신규 구축 — `site/` (독립 정적, 스크롤 기반, 실제 앱 스크린샷)
> 상세·재생성법은 memory [[landing-site]]. 앱 코드(src)는 **미변경**, 별도 정적 사이트만 추가.
- **위치/구조**: 저장소 안 `site/`(index.html·styles.css·main.js·assets·README). 빌드 불필요, 어떤 정적 호스팅에도 폴더째 업로드. 외부 요청은 Pretendard CDN 하나뿐(실패 시 시스템폰트 폴백), 나머지 에셋 내장.
- **디자인(사용자 선택)**: 제품명 **sry** 유지 · **미니멀 스위스**(여백·모노톤·정밀 그리드·얇은 대형 타이포) + 다크모드·반응형. 만든이 **Parue**. 섹션: 히어로→워크플로 01·02·03→**실제 화면 쇼케이스**→특징6→창작스튜디오(2,445)→데이터안전→글쓰기유형→**계정/의견**→최종 CTA→푸터.
- **요즘 트렌드 스크롤 모션**: 네이티브 CSS `animation-timeline: scroll()/view()` — 상단 진행 바·히어로 화면 스케일 등장·01/02/03 숫자 패럴랙스·스튜디오 수치 팝 + 그리드 스태거 리빌. 전부 `@supports`+`prefers-reduced-motion` 폴백(미지원=JS IntersectionObserver 리빌 유지).
- **진짜 앱 스크린샷**: `dist` 앱을 헤드리스 Chrome(CDP)으로 구동→에디터(라이트/다크)·도구허브·코르크보드·연재·도구창·DB 캡처→`site/assets/shot-*.png`. 히어로=실제 에디터(테마 자동 전환), 쇼케이스=프레임 카드. 생성기 `scripts/_cdp_app_shots.cjs`(온보딩 닫기+문서 7개 시딩+테마 토글 포함).
- **계정(로그인/회원가입)**: `#contact` 섹션+헤더에 **disabled(준비 중)** 표시만(향후 구현 예정, 실제 미구현). **의견 폼**은 무서버 `mailto:devfinemold@gmail.com`(메일 앱 열기)+직접 링크.
- **곧 출시 모드**: `window.SRY_APP_READY=false` → 시작 버튼 클릭 시 404 대신 **"곧 출시됩니다" 토스트**. 배포 후 `SRY_APP_URL`=실제 위치+`SRY_APP_READY=true` 로 바꾸면 앱 연결(토스트 해제).
- **카피 정리(사용자 지시)**: 향후 유료/가입/키 가능성 때문에 **"무료·무가입·무열쇠" 영구 약속 제거**(→ 설치 없이·지금 바로·계정은 선택). 히어로 eyebrow **SCRIVENER-CLASS 제거**(→ BROWSER-NATIVE WRITING STUDIO). "브라우저에 저장"→**로컬(브라우저)** 명확화. og 이미지도 동기화. (`.scriv`/Scrivener **호환성 사실**은 유지.)
- **품질**: 다중에이전트 5차원 적대리뷰(41 에이전트)→**확정 30건 수정**(OG를 소셜호환 **PNG**로 래스터화, 다크버튼·라이트 muted **WCAG AA 대비**, 도구수 분해 합계 2,445 일치, 구형 Safari matchMedia 가드, color-mix 폴백, 모바일메뉴 포커스트랩, **JS-off 시 콘텐츠 표시**(.js 게이팅+noscript) 등).
- **검증 도구(신규 스크립트)**: `_cdp_site.cjs`(콘솔에러·가로오버플로·양테마 대비AA·리빌·카운터·링크 자동검사+스샷), `_cdp_shot_section.cjs <sel> <name> <theme>`(실측 뷰포트), `_cdp_test_cta.cjs`(토스트), `_rasterize_og.cjs`, `serve-site.cjs`(로컬 미리보기 http://localhost:5500). 최종: **reveal 35/35·콘솔에러0·오버플로0·대비AA(양테마)·토스트 정상**.
- **남은 과제**: ① 실제 **호스팅 배포**(site를 루트, dist를 site/app 으로 복사 후 SRY_APP_READY=true) → [[deploy-hosting-todo]]. ② (선택) 의견 폼을 메일앱 없이 자동접수하려면 Formspree 등 엔드포인트 한 줄 연결. ③ (선택) 실제 로그인/회원가입 구현. ④ 배포 도메인 확정 후 og:image 절대 URL·og:url.

### 2026-06-28 #28: 집중 모드 진입 방식 선택(현재 창 / 새 창 → 전체화면·일반)
- **양 스킨**에서 집중 모드 누르면 **선택 모달**: ① 현재 창에서(기존 in-page) ② 새 창에서 → (전체 화면 / 일반 창). (App: `requestFocusMode`/`focusStep`/`compWindow` + `.focus-chooser` 모달, 6개 호출부 라우팅.)
- **새 창**은 `PortalWindow`(같은 앱 인스턴스, 별도 OS 창)에 `<Composition/>` 렌더 → **store/자동저장 공유(단일 writer = 데이터 안전)**. 전체화면은 화면 가득 크기 + `requestFullscreen` 베스트에포트.
- **Composition 을 창/문서 무관하게 리팩터**: 전역 window/document → `ref.current.ownerDocument(.defaultView)` 기준(`winOf()/docOf()`)으로 바꿔 팝업에서도 선택·키·타자기스크롤·위키링크 동작. `onExit` prop(새 창은 팝업 닫기) + **언마운트 flush**(미저장 입력 백스톱).
- 검증: tsc0·단위 174/174·ui_all 72/0·`_cdp_focusmode` **14/0**(선택 모달·현재 창 진입+**저장** 양 스킨·새 창 2단계·팝업 생성·메인 정상). ⚠ **PortalWindow 팝업 '내용 렌더'는 헤드리스에서 안 됨**(기존 '도구 창 분리'도 동일) → 새 창 내부 편집/저장은 실브라우저 전용 검증(아키텍처상 단일 스토어라 저장 동일). [[cdp-beta-testing]].


### 2026-06-28 #27: 남은 베타 항목 마무리 — FATAL 3종 해소 + 잔여 플래그 전부 무결 확인
- **FATAL 원인 규명·수정**: save_open/a11y_parity/aux_panels 가 '편집(dirty)→Page.navigate' 시 앱의 **beforeunload(원고 안전) 다이얼로그**가 헤드리스 navigate 를 막아 timeout. → 세 스크립트에 **Page.enable + `Page.javascriptDialogOpening` 자동 수락** 추가. (menu_parity 가 멀쩡했던 이유=이미 그 처리가 있었음.) → [[cdp-beta-testing]].
- **잔여 플래그 전부 실제로는 무결(아티팩트) 확인**:
  - 코르크 자유드래그 → `op_corkboard_controls` **70/0** 정상(views_ab 플래그=드래그 표면 5px 아티팩트).
  - 스프린트 시작/중지 → 직접검증 정상(시작→`.sprint-time` 표시, 중지→사라지고 시작버튼 복귀). aux 플래그=시작버튼이 **아이콘(빈 텍스트)** 이라 테스트의 '시작' 텍스트매칭 빗나감.
  - save_open 파일메뉴(3)·a11y 도구허브(1) → 이미 menu_parity 4/0·ui_all 72/0 에서 양 스킨 도달 확인된 기능. reload 후 셀렉터/타이밍 아티팩트.
  - aux_panels z-가림 이슈는 #25 수정으로 **전부 사라짐**(58/2, 2건은 위 스프린트 아티팩트).
- **결론: 전 영역 실사용 베타에서 미해결 실제 버그 0.** 회귀: tsc0·단위 174/174(이번 턴 src 변경 없음, 스크립트만 패치).



### 2026-06-27 #26: 경미 이슈 확인·처리
- **폴더 SEO 탭 안내**(실제 개선): 폴더 선택 시 SEO(웹페이지 메타) 폼이 그대로 떠 부적절 → `SeoTab`(Inspector)에 폴더용 안내 배너 추가("SEO 메타는 개별 글에 적용…"). 검증 `_cdp_minor_verify.cjs` 3/0.
- **타임라인 정렬 중 드래그 잠금**: 이미 안내 문구 존재(TimelineView 206-209) — 의도된 동작, 수정 불필요.
- **에디터 Enter 새 문단**: 앱 정상(execCommand insertParagraph → `<p>AAA</p><p>BBB</p>`+RTF `\par` 분리, `_cdp_enter.cjs` 4/0). 감사에서 실패로 나온 건 **CDP Input Enter 가 contenteditable 기본동작 미트리거**하는 헤드리스 한계(실사용자 키보드 정상) → 테스트는 execCommand 로 검증하도록 수정. [[cdp-beta-testing]] 기록.
- 찾기 포커스복귀·스프린트 중지 등은 코드 정상(테스트 아티팩트)으로 재확인. 회귀: tsc0·단위 174/174.



### 2026-06-27 #25: 박사급 100+ 실사용 스위프 — z-순서 부류 일괄 정리 + 즐겨찾기/수집함 버그
- **레이어(z-index) 일관 정책 신설**(styles.css 끝): tool-dock150 < 도구창200~289 < 수집함300 < 수집함뷰어400 < 집중모드450 < 모달500 < 투어10000. 헤더/메뉴=350(드롭다운이 겹친 도구창 위로), 보조패널=320.
  - **모달이 도구창 뒤에 깔림**(사용자 제보) → `.modal-backdrop` z 200→500. (#24)
  - **메뉴 드롭다운이 겹친 도구창 뒤로** → `.toolbar` position:relative z350, `.st-top` z50→350.
  - **보조 패널(읽기·스크래치패드·프롬프트·스프린트·퀵레퍼런스)이 도구창에 가려 조작 불가** → z 60/150→320.
  - **집중 모드가 도구창 아래** → `.composition` z 100→450.
- **즐겨찾기 2버그**(제보): ① 항목 행이 `draggable`이라 클릭이 드래그에 먹혀 가끔 안 열림 → 드래그를 전용 핸들로 분리(행 draggable 제거). ② 즐겨찾기 패널 드롭=최소화 시 ResizeObserver가 offsetWidth 0을 box에 저장→다시 열면 0×0 작은 창 → **숨겨진(offset 0) 동안 크기 저장/반영 차단**(ToolWindow).
- **수집함**: URL 클릭=새 탭(임베드 거부 빈화면 제거, #24), 뷰어 **Esc 닫기** 추가.
- **검증**: 모든 도구 전수 스모크 `_cdp_all_tools.cjs` **555/555**(렌더+콘솔에러0). 전문가 감사 18종(`scripts/_cdp_x_*.cjs`) 실행 — zorder 23/0·stash_deep 25/0·favorites 9/0·modal_ontop 6/0·toolwin_life 24/0·binder_deep 100/0·views_cd 70/0·compile 29/0·toolhub 24/0·creative 23/0·settings_theme 35/0·edge_empty 37/0 등. 회귀: tsc0·단위 174/174·ui_all 72/0.
- 나머지 플래그는 테스트 아티팩트/의도된 동작(찾기 포커스복귀=코드정상, 타임라인 정렬중 드래그잠금=의도, 스프린트 중지=정상, Input+navigate FATAL=하니스). [[cdp-beta-testing]]: 매 테스트 9222(chrome)+4178(vite) PID 정리 + 신선도 확인 필수.



### 2026-06-27 #24: 수집함 URL 새 탭 열기 + 모달이 도구창 위로(z 정리)
- **제보1**: 수집함 URL 클릭 시 "연결 거부" 빈 화면. 원인: 앱 안 iframe 임베드 → 대부분 사이트가 X-Frame-Options/CSP 로 거부. → `StashBox.openItem` 에서 `kind==='url'` 은 **새 탭(`window.open(u,'_blank','noopener,noreferrer')`)** 으로 직접 열도록 변경(팝업 차단 시 안내). iframe 뷰어 url 분기는 더 이상 안 쓰임. 검증 `scripts/_cdp_stash_url.cjs` **4/0**.
- **제보2**: 도구창 여러 개 떠 있을 때 메뉴에서 도구 허브(모달) 열면 도구창 뒤에 깔림. 원인: `.modal-backdrop` z **200** 인데 도구창 z 는 200~289(Z_CAP)·renorm 베이스 200 이라 모달이 도구창 밴드 안. → `.modal-backdrop` z **500**(도구창 289·수집함 300·수집함뷰어 400 위, 투어 10000 아래). 검증 `scripts/_cdp_modal_ontop.cjs` **6/0**(toolhub/compile/settings/genrebox/creative 모두 중앙 최상위).
- 회귀: tsc0 · 단위 174/174 · ui_all 72/0 · stash_insert 7/0.


### 2026-06-27 #23: 수집함 '담기만 하던' 문제 → 메모를 원고에 삽입 가능하게 + 도구창 UI긁기 버튼 제거
- **제보**: 도구창 '수집함에 담기'가 쓸모없음(들어가기만 하고 원고로 못 씀). 사용자 선택: **메모를 원고에 삽입 가능하게**.
- **구현**:
  - FormatBar: 범용 `scriv:insertText` 이벤트 핸들러 — 커서 위치(없으면 마지막 문단 안쪽)로 평문 삽입, 다중 줄은 `<br>`(run \n)로 보존. ⚠ `.paper` 직속(문단 밖) 삽입은 RTF 직렬화 누락 → 반드시 블록(`<p>`) 안쪽에 정규화 삽입.
  - StashBox: 메모/노트 카드에 '⤵ 원고' 버튼(`insertToEditor`) — 에디터 뷰 전환+활성문서 확보+`.paper` 포커스/커서 후 `scriv:insertText` 디스패치. (`.stash-item-insert` CSS 추가)
  - ToolWindow: 'UI 통째로 긁는' 일반 '수집함에 담기' 버튼 제거(+`grabStashText`/미사용 import 정리). 도구별 정제 `addToStash` 호출(수십 개 도구)은 유지.
- **stale chrome(9222) 함정 또 발견**: 이전 헤드리스 chrome 이 9222 안 죽어 새 테스트가 옛 인스턴스(누적 수집함 항목·SW 캐시)에 붙어 'onClick 안 됨'으로 오판. 9222 도 PID 정리 필요 → [[cdp-beta-testing]] 기록.
- 검증: tsc0 · 단위 174/174 · CDP 실동작(깨끗한 chrome) **7/0**(메모→원고 삽입·RTF 영속·도구창 버튼 제거). `scripts/_cdp_stash_insert.cjs`.


### 2026-06-27 #22: 이름 믹서 — 한국식 이름을 현대식 3글자로(무협 호·수식어 제거)
- **제보**: 이름 믹서의 한국식이 "비검 흑월 유곤곤"처럼 무협식 문파/별호(호·수식어)가 붙어 대만/중국식처럼 보임. 요청: 한국식은 **성+이름 2글자(3글자)만**. (서구/판타지는 유지, **무협 도구는 호·수식어 유지** — 이름 믹서만 대상)
- **수정**(`src/tools/NameMixer.tsx`): `partKeys('kr')` → `['sur','g1','g2']`(문파/별호 제거), `fullName` kr → `${성}${이름①}${이름②}`, `combos` kr → 성×이름①×이름②. KR.clan/epiPre/epiSuf 풀과 genPart 분기는 dead(무해)로 남김.
- 검증: tsc0 · 단위 174/174 · CDP 실동작 **7/0**(한국식 60개 표본 전부 한글 3글자·공백/호 없음·문파/별호 칩 제거, 서구/판타지 구조 유지). `scripts/_cdp_namemixer.cjs`.


### 2026-06-27 #21: 클래식↔스튜디오 UI 전 기능 패리티(실동작, 양 스킨) + stale 서버 함정
- **제보 버그**: 스튜디오 보기 메뉴에 **도움말 메뉴 없음**. 원인: `studioMenus`(App.tsx) 보기 메뉴에 도움말 둘러보기/더 알아보기 누락. → 추가. 추가로 패리티 전수 비교로 **이전 문서/다음 문서(⌘PgUp/PgDn)**, 도구 메뉴 **AI 어시스턴트(자리표시자)** 도 스튜디오에 누락 발견 → 추가.
- **⚠ stale 서버 함정 규명(이번 세션 시간 낭비 주범)**: `--strictPort` preview 가 죽지 않고 4178 을 잡고 있으면 새 서버는 조용히 바인딩 실패, 테스트는 **옛 빌드(stale)** 에 접속 → 수정·rebuild 해도 "반영 안 됨"으로 오인. `pkill`/`taskkill //IM` 은 access-denied 가능. **PID 기반 정리**(`netstat -ano | grep :4178 | grep LISTEN` → `taskkill //F //PID`) + 새 서버 신선도 1줄 프로브 후 테스트. → [[cdp-beta-testing]] 메모리에 기록.
- **패리티 실동작 검증(양 스킨, 다중 에이전트 작성 → 전부 실행)**:
  - `_cdp_menu_parity` **4/0**(파일16·문서15·도구18·보기20 — 클래식 전 항목 스튜디오 도달) · `_cdp_help_menu_both` **14/0**
  - `_cdp_view_parity` **58/0**(10뷰 컨트롤 양 스킨) · `_cdp_modal_parity` **163/2**(전 모달 양 스킨; 2=platformPublish input-finder 테스트한계, 갭 아님) · `_cdp_action_parity` **60/2**(2=헤드리스 save-dirty 아티팩트, 갭 아님)
  - 전역 패널(수집함/스크래치/스프린트/프롬프트)도 스튜디오 실제 열림 확인. (panel 테스트는 Input+navigate 충돌로 FATAL=하니스)
- **결론**: 실제 패리티 갭 0(메뉴/뷰/모달/액션/패널 모두 양 스킨 동등). 검증 tsc0.

### 2026-06-27 #20: 앱 전부 세밀 크로스 베타(실동작, 양 스킨) + 영속성 하니스 규명
- **11개 영역 세밀 실동작 테스트 신설**(다중 에이전트 작성 → 전부 실행). 통과:
  - `_cdp_binder_ops` **64/0**(우클릭 메뉴 전 항목·복제·묶기/해제·변환·휴지통/복원·키보드 내비, 양 스킨)
  - `_cdp_op_corkboard_controls` **70/0**(카드크기·정렬·자유배치·실드래그·드릴인·라벨/상태)
  - `_cdp_board_serial_db` **50/0** · `_cdp_refs_argument` **50/0**
  - `_cdp_menus_all` **133/0**(파일/문서/도구/보기 **모든 메뉴 항목** 클릭→효과, 양 스킨)
  - `_cdp_snapshot_detail` **38/0** · (기존) ui_all 72 · stash_drag 6 · manual 13 · 단위 174.
- **영속성 계열 테스트 실패는 앱 버그 아님으로 규명**: 헤드리스 Chromium 의 IndexedDB `d.get` 트랜잭션이 신규 프로파일에서 **간헐적 hang** + 프리뷰의 **PWA 서비스워커**가 IDB 방해. 근거 ① 단위 영속성 19/0 ② **dev 서버(SW 없음) E2E 영속 정상 통과**(dirty=false@1.5s·리로드 본문 유지) ③ 실사용자 데이터 보존 ④ hang 지점이 브라우저 원시 `d.get`. → 영속 E2E 는 dev 서버로 돌릴 것.
- **데이터안전 하드닝(idb.ts)**: 1회 마이그레이션 안전 재설계 — 옛 DB **'열기'만 시간제한**(init hang 방지), 열리면 **전체 복사(중단 없음)**, `sry:idb-migrated` 플래그는 **복사 성공 시에만** 기록(부분복사+스킵 손실 방지) + openDB blocked/blocking/terminated 핸들러. ⚠ 처음 시도한 '마이그레이션 전체 시간제한'은 큰 옛 프로젝트가 잘릴 위험이라 **되돌림**.
- editor_advanced/stash_detail FATAL, find_replace '다음/단건바꾸기', ⌘S/⌘⇧A 키 실패는 **하니스/헤드리스 특성**(Input+navigate 충돌, getSelection/execCommand, d.get hang) — 기능 자체는 정상(formatbar12·replace-all·argument뷰 등 통과).
- 검증: tsc0 · 단위 174/174 · 빌드 OK.

### 2026-06-27 #19: 도움말 추가 보강 + UI 전수 실동작 베타(양 스킨)
- **매뉴얼 보강(GuidedManual)**: 글쓰기 기법('설명 말고 보여주기' 실습) + '더 깊이' 챕터(찾기·바꾸기 ⌘F · 집중 모드 · 단어수/목표/통계 · 테마/타이포) 5단계 추가. manual 13/0 유지.
- **UI 전수 검증 신설**(`scripts/_cdp_ui_all.cjs`, 테스트 훅 `window.__setModal`/`__setView` 추가): 양 스킨(classic/studio)에서 **뷰 10개 전부 렌더 + 모달 20개 전부 열림·내용·닫힘 + 테마 3종(light/dark/sepia) 렌더 + 바인더 토글 + 도구창 표본 14개** 를 실제로 열어 검증, 콘솔에러 0. → **72/0**.
- **코르크보드 DnD→바인더 동기**(`scripts/_cdp_op_corkboard2.cjs`): 뷰버튼 전환 + 카드 추가 + 실제 dataTransfer DnD 로 재정렬 [A,B]→[B,A] 검증(7/8; 바인더-제목 매칭만 rename 커밋 한계로 soft, 동기는 같은 childIds 렌더라 구조 보장).
- 검증: tsc0 · manual13 · op_board26 · op_inspector34 · stash_drag6 · tour_coverage11 · **ui_all 72/0**.

### 2026-06-27 #18: 사용자 실사용 제보 버그 수정 + 실동작 종합 베타(양 스킨)
- **수집함 자유 이동 버그(데이터/UX)**: 캔버스 뷰에서 항목을 드래그하면 손 떼는 순간 제자리로 '튕김'. 원인: `StashBox.onItemMove` 가 `setItems` 만 하고 `itemsRef` 를 안 갱신 → `onItemUp` 의 `persist(itemsRef.current)` 가 드래그 이전(stale) 위치를 저장·복원. → onItemMove 에서 itemsRef 도 함께 갱신(+ onItemDown 줌 보정 `/z`). 실제 마우스(CDP Input) 드래그로 6/0 검증(이동·영속·안튕김).
- **스튜디오 메뉴 드롭다운이 본문 뒤로 가려짐**: `.st-top`(메뉴 헤더)가 static 인데 `.st-body`(본문)는 position:relative(positioned)라 본문이 헤더 위에 그려짐 → 메뉴 항목 안 보임. → `.st-top { position: relative; z-index: 50 }`. 17개 항목 전부 본문 위 표시·클릭 가능 검증(elementFromPoint).
- **투어 특장점 10개**: 전부 가운데 설명 카드였던 것을 실제 UI 스포트라이트 단계로 전환(저장버튼·스냅샷탭·파일/도구/보기 메뉴·뷰 세그먼트/레일·수집함). `_cdp_tour_coverage.cjs`: 양 스킨 17개 실제-UI 스포트라이트, 가운데 카드는 환영·마무리 2개뿐.
- **CDP 하니스 교훈(중요)**: ①헤드리스 크롬 정리는 `taskkill /IM chrome.exe` 금지(사용자 브라우저까지 죽음) → 띄운 PID 만 `taskkill /PID $CPID /T`. ②드래그는 **실제 마우스 Input.dispatchMouseEvent**(press/move×N/release, mouseMoved 는 button:'left',buttons:1, clickCount 빼기)로. 합성 PointerEvent/DragEvent 는 React 핸들러 미발화. ③Input 쓸 땐 타깃을 `Target.createTarget({url})` 로 직접 생성(about:blank+navigate 금지=Input 타임아웃), Runtime.enable 미호출. ④테스트끼리 같은 user-data-dir 공유 시 localStorage(sry:uiSkin) 누수 → 각 테스트 격리 dir.
- **실동작 종합 베타(양 스킨)**: 칸반 DnD 26/0 · 인스펙터 전탭 34/0 · 캔버스 노드 드래그 15/16(리로드 1=테스트 타이밍, setCanvas→dirty→autosave→IDB 로 영속 코드 확인). corkboard/outliner/menus op-테스트 실패는 에이전트 테스트 하니스 버그(앱 정상 — 라이브 덤프로 .toolbar·메뉴4·뷰버튼 존재 확인). 스크립트: scripts/_cdp_op_*.cjs, _cdp_stash_drag.cjs, _cdp_tour_coverage.cjs.
- 검증: tsc0 · npm174 · manual13 · interact_beta9 · snapshots10 · tour_coverage11 · stash_drag6 · op_board26 · op_inspector34 · op_canvas15.


### 2026-06-26 #17: 온보딩 도움말 2종(가이드 투어 +특장점10, 실습형 매뉴얼) + 양 스킨 호환
- **가이드 투어 확장**(GuidedTour.tsx): 기존 단계 + **앱 특장점 10가지**(로컬·삼중안전망·RTF·도구500+·창작스튜디오·10뷰·⌘K·수집함·연재/플랫폼·참고문헌/논증) 카드 추가(총 19단계). 마무리에서 '더 알아보기' 매뉴얼 안내.
- **실습형 매뉴얼 신설**(`src/components/GuidedManual.tsx`, 보기 메뉴 ‘더 알아보기’/⌘K/`__startManual`): 따라 하며 ‘작은 작품 한 편’ 완성. 시작 방식 선택(빈/템플릿/빠르게) → 바인더(폴더·글 생성) → 집필(실제 문장 입력) → 서식(굵게) → **인스펙터 전 탭(라벨·목표·시놉시스·키워드·노트·스냅샷)** → 자료/수집함 → 5개 뷰(코르크보드/아웃라이너/캔버스/타임라인/칸반) → **도구(이름생성기→인물시트 연결/체이닝 + 결과를 본문에 적용 + “나머지는 ⌘K로 글 쓰며 스스로” 멘트)** → 저장/내보내기 → 마무리(연습 흔적 정리). 각 실습은 `do.check`(실제 효과 검증)+`auto`(대신 해줄게요)+건너뛰기.
- **데이터 안전**: 실습은 현재 원고 미접촉, ‘🎓 글쓰기 연습’ 폴더 안에서만(pre 에서 ensureFolder+select 로 수동 생성도 격리). 끝 정리는 폴더+연습 키워드+수집함 메모까지 롤백. ensure* 멱등(재실행 중복 방지). `.paper`는 `data-doc-id`로 활성 문서만 조작.
- **양 UI 스킨 호환(중요)**: 메뉴 트리거는 `.menu-wrap > button`(클래식 .tbtn / 스튜디오 .st-menu-btn 공통), 뷰 세그먼트 `.seg, .st-rail`, 타임라인/저장 `.st-center/.st-top` 폴백, 바인더/인스펙터/뷰컨테이너/.formatbar 는 양 스킨 공유 컴포넌트. 투어/매뉴얼 상호배타(한 번에 하나). aria-modal=false(코치마크, 앱 계속 사용). do-스텝은 대상 미발견 시 비차단(앱 클릭 가능), 중앙/선택만 딤(딤클릭으로 매뉴얼 안 닫힘). 말풍선 max-height+스크롤.
- 크로스 적대 베타(27에이전트) 지적(격리·bold `\b` 오탐→parseRtf 본문 런 판정·도구 check→`.toolwin[data-tool-id]`(ToolWindow 에 속성 추가)·동시표시·반응형·정리) 전부 반영.
- 검증(실사용 CDP): tsc0 · npm 174 · 매뉴얼(클래식)13/0 · **매뉴얼/투어 스튜디오 12/0** · 투어14/0 · 엣지6/0(템플릿트랙·Esc·다크·충돌없음) · 스냅샷10 · 인터랙션9. 스크립트: `_cdp_manual.cjs`/`_cdp_tour.cjs`/`_cdp_manual_edge.cjs`/`_cdp_help_studio.cjs`.

## ▶▶ 다음 세션 이어받기 (2026-06-25) — 여기부터 읽으세요

### 2026-06-25 #16: 인터랙티브 온보딩 가이드 투어(말풍선 도움말)
- 요청: 백과사전식 말고, 앱 시작 시 자동으로 시작돼 실제 UI 를 말풍선으로 짚으며 대화하듯 안내하는 모던 도움말. '그만 보기/끄기'로 즉시 사라져야 함.
- 구현: `src/components/GuidedTour.tsx`(react+store 만) — 9단계 스포트라이트 투어(환영→바인더→에디터→서식바→뷰 세그먼트→인스펙터→도구메뉴→파일메뉴→마침). 각 단계: 실제 DOM(`.binder`/`.paper`/`.formatbar`/`.seg`/`.insp-tabs`/메뉴버튼)을 box-shadow 스포트라이트로 비추고 말풍선(이모지 아바타+대화체+꼬리)으로 안내. 다음/이전/진행점 점프/N분의 N.
- 닫기: 좌하단 '그만 보기' · 우상단 × · Esc · 마지막 '글쓰기 시작' — 닫으면 `localStorage['sry:tour:done']='1'` 기록 후 다시 자동 안 뜸. 다시 열기: 상단 '?' 버튼 / 보기 메뉴 '도움말 둘러보기' / ⌘K. 스포트라이트는 pointer-events:none 라 투어 중에도 앱 사용 가능, 중앙 단계는 딤.
- 기존 정적 환영 모달(showWelcome/dismissWelcome/'sry:seen') 제거하고 투어로 대체. 스타일 styles.css `.tour-*`(테마변수). 테스트 훅 `window.__startTour`.
- 투어가 자동 시작되므로 모든 `_cdp_*.cjs` 의 디스미스를 `.tour-skip`('그만 보기')도 닫도록 갱신.
- 검증: tsc 0 · `scripts/_cdp_tour.cjs` 14/0(자동시작·다음/이전·스포트라이트 정렬·점프·그만보기 닫힘+기록·? 재열기·글쓰기시작 종료·콘솔에러0) · 전체 회귀 green(npm 174 · linespacing7 · formatbar12 · snapshots10 · savecycle18 · interact_beta9 · binder5 · sry_roundtrip8).

### 2026-06-25 #15: 실동작(실사용 클릭) 베타로 전환 → 진짜 버그 3건 수정
- 사용자 지적: "코드리뷰형 베타 말고, 줄간격 테스트처럼 실제 클릭·조작해서 '원하는 결과'가 나오는지 보고 안 나오면 고쳐라."
- **CDP 실동작 테스트 신설**(scripts/_cdp_*.cjs): 서식툴바(formatbar 12)·줄간격(linespacing 7)·뷰(core/data/knowledge)·인스펙터·스냅샷(10)·메뉴·저장순환(savecycle 18)·도구실행(tools_ops 45). 각 컨트롤을 실제 조작→효과·영속 검증.
- **진짜 버그(코드리뷰가 못 잡던 것) 3건 수정**:
  1. 줄간격: 무선택=문서기본/선택=블록, 기본 1.0·0.5~2.0 (#14).
  2. **글꼴·글자크기 미영속**: FormatBar `wrapInlineStyle` 이 DOM 만 바꾸고 input 이벤트를 안 쏴 에디터가 저장 못 함 → `editableOf(span).dispatchEvent(new Event('input'))` 추가. (RTF \fs48 영속 확인)
  3. **스냅샷 탭 무한루프 크래시(React #185)**: `useStore((s)=>s.project.snapshots?.[id] || [])` 가 매 렌더 새 `[]` 반환 → 무한 재렌더 → ErrorBoundary 가 인스펙터 통째로 언마운트. 스냅샷 없는 문서(=대부분)에서 스냅샷 탭만 열면 데이터안전 기능이 깨졌음. → 모듈 레벨 `EMPTY_SNAPSHOTS` 안정 참조 + 기본값을 셀렉터 밖에서 적용. (Inspector.tsx)
- 라이브 프로브로 정상 확인(테스트 셀렉터 아티팩트였던 것): 뷰 전환(코르크보드/아웃라이너 등)·논증 주장 추가/왕복 영속·인스펙터 메타(라벨/상태/키워드/시놉시스 적용·dirty)·story-tarot 스프레드. 테스트 셀렉터는 `.tbtn[aria-label]`(`.seg` 아님)·`#insp-tab-*`·RTF 한글은 \\u 이스케이프(리터럴 금지)·합성DnD 한계는 skip 으로 교정.
- 검증: tsc 0 · npm test 174/174 · linespacing7 · formatbar12 · snapshots10 · savecycle18 · tools_ops45 · 라이브 프로브 0 콘솔에러.
- 교훈: **"버튼이 눌리고 코드도 멀쩡한데 결과가 저장/반영 안 되는" 류는 실제 조작+효과/영속 검증으로만 잡힌다.** Zustand 셀렉터의 `|| []`/`|| {}`/`.map`/`.filter` 는 #185 무한루프 지뢰 → 반드시 안정 참조. → [[interaction-beta]]

### 2026-06-25 #14: 줄간격 제대로 구현(문서기본/블록단위, 기본 1.0·0.5~2.0)
- 문제: 줄간격이 ①FormatBar 가 '앵커 블록 1개'에만 적용(다중선택 미적용) ②빈 파일/무선택 시 문서 기본으로 안 잡혀 새 문단이 기본값(1.6)으로 떨어짐 ③기본 1.6·범위 1~3.
- 재설계(`src/components/FormatBar.tsx` setLineSpacing): **무선택(캐럿만/빈 파일) → 문서 전체 기본**(`patchSettings({editorLineHeight})`, --ed-line 으로 모든 문단·새 문단 적용) / **블록 선택(범위) → 선택된 블록들 전부**(blocksInSelection, range.intersectsNode 로 p/h/blockquote/li 수집 후 style.lineHeight) / **'문서 기본으로' 옵션 → 블록 인라인 줄간격 해제**.
- 기본값/범위: CSS `.paper p{line-height:var(--ed-line,1.0)}`(1.6→1.0), ProjectSettingsModal 줄간격 입력 기본 `?? 1.0`·min 0.5·max 2·step 0.1, '기본' 프리셋 editorLineHeight 1.0, FormatBar 옵션 0.5/0.8/1.0/1.15/1.5/1.75/2.0 + 문서기본.
- RTF 왕복은 기존대로 보존(html.ts line-height↔lineSpacing, serialize \slN\slmult1, parse). 블록 0.5 → `\sl120\slmult1` 영속 확인.
- 검증: tsc 0 · npm test 174/174 · build · **줄간격 E2E 7/7**(`scripts/_cdp_linespacing.cjs`: 기본1.0·무선택문서기본2.0·블록0.5·미선택블록보존·해제) · 블록값 RTF 영속 · 인터랙션 9/9.


### 2026-06-25 #13: 세션 변경 surface 회귀 베타 → 데이터-안전 회귀 수정
- 이번 세션 변경(.sry 자체완결·라이브러리 스코프·통계 SSOT·137수정 surface)에 회귀 집중 베타(10관점·적대검증, 46에이전트). **확정 HIGH 다수(내가 유발) + MED/LOW** 발견·전부 수정:
  - **(HIGH) 라이브러리 부팅 경합**: App `setLibraryProject([project.id])` 가 부팅 시 버려지는 임시 기본 프로젝트로 레거시를 이관+1회 플래그 소진 → 실제 프로젝트 빈 라이브러리(기존 사용자 라이브러리 소실). → linkbus 의 **1회 플래그(sry:lib-migrated) 제거**, '프로젝트별 키가 비고 레거시 있으면 복제'하는 멱등 이관으로 복귀(손실 0, 신규 항목은 projectId 태그로 격리).
  - **(HIGH) .sry 폴더 자동저장이 사이드카 생략** → 재오픈 시 옛 라이브러리/수집함이 최신을 덮음. → 자동저장을 `buildSryFileMap(project,{inlineStashMedia:false})`(사이드카 텍스트는 갱신, 무거운 수집함 미디어 인라인만 생략)로 변경 → 폴더가 항상 최신.
  - **(HIGH) 자동 zip 백업에 라이브러리/수집함 미포함** → 복원 시 소실. → backup.ts 를 `fileMapToZip(buildSryFileMap)`/`readSryFileMap` 기반으로 전환 + `loadBackupFiles()` 추가, BackupModal.restore·App 자동복구가 복원 직후 `applySryAux` 적용. 무결성 검사는 부수효과 없는 경량 파싱.
  - **(HIGH) .sry 가져오기가 IDB 미영속** → 편집 전 새로고침 시 소실. → onImportSryFile/openSryFolder proceed 에서 loadProject 직후 `idbSave`+`setLastProjectId`+baseModified 갱신. + onImportSryFile 은 readSryFileMap 을 **확정 콜백 안에서** 호출(취소 시 본문 미디어 blob 도 안 씀).
  - **(MED) 프로젝트 삭제 시 `sry:shared-library:<id>` 미정리** → idbDeleteWithCleanup 에 추가. **(MED) Studio 좁은화면 오버레이 부재** → StudioShell 에 isNarrow 오버레이/백드롭. **(MED) 바인더 Alt+←/→ 이중동작·삭제 후 포커스 유실·폴더 무확인 삭제** → Binder onKeyDown 보강. 
  - **(LOW)** StreakTracker 자정 갱신(1분 tick)·도구세션 복원 z 시드·스냅샷 좁은화면 인스펙터 규칙·WriterDashboard 단위 라벨·StashBox media 폴백 표시 등 수정.
- 검증: tsc 0 · npm test 174/174 · build · .sry 왕복 8/8 · 인터랙션 9/9 · 바인더 5/5.
- 교훈: 이번 세션 변경이 **스스로 데이터-안전 회귀**를 만들었고 회귀-집중 베타가 잡았다 → 큰 변경 뒤 '변경 surface 회귀 베타'는 필수. → [[interaction-beta]] [[data-safety]]


### 2026-06-25 #11: 보류 항목 2건 구현(수집함 .sry 동봉 · 라이브러리 프로젝트별) + 적대검증 수정
- **#1 .sry 자체완결화**: `buildSryFileMap` 가 `library.json`(프로젝트 공유 라이브러리)·`stash.json`(수집함; 로컬 미디어 blob 을 dataURL 인라인)을 동봉, 가져오기 시 복원. 이제 .sry 하나로 원고·미디어·라이브러리·수집함이 기기 이전돼도 보존. (sryfmt.ts / blobs.ts blobToDataUrl·dataUrlToBlob export / linkbus readLibraryRaw·writeLibraryRaw / StashBox `sry:stash-reload` 리스너.)
- **#2 공유 라이브러리 프로젝트별 격리**: linkbus 의 `setLibraryProject`(이미 구현·미배선)를 App `useEffect([project.id])` 로 배선 — 프로젝트별 `sry:shared-library:<pid>`, 레거시 전역은 1회 복제 이관. 수집함과 일관.
- **적대 검증(4관점) → HIGH 2·MED 2 즉시 수정**:
  - (HIGH) `.sry.zip` 가져오기가 전환 확인 '전에' 사이드카를 덮어써 취소해도 손상되던 회귀 → **readSryFileMap 을 순수 파싱으로** 되돌리고, 사이드카 복원을 `applySryAux(files, pid)` 로 분리해 **loadProject 확정 직후에만** 호출(폴더·zip 양쪽). 취소 시 무손상 보장.
  - (MED) 수집함 미디어 복원 시 saveBlob 실패해도 인라인 사본을 무조건 삭제 → 유실 → **저장 성공 시에만 media 제거**(restoreInlineMedia 와 동일 정책) + 0바이트 dataURL 가드.
  - (LOW) 자동저장(.sry 폴더 미러)은 `buildSryFileMap(project,{sidecars:false})` 로 사이드카 생략(매 저장 미디어 재인코딩/덮어쓰기 방지; 명시 저장 시 전체 동봉).
- 검증: tsc 0 · npm test 174/174 · build · **.sry 왕복 8/8(취소 안전성 포함, `scripts/_cdp_sry_roundtrip.cjs` + `window.__sryfmt` 훅)** · 인터랙션 9/9 · 바인더 5/5 · 라이브러리 의존 도구 8/8.
- 남겨둔 판단(검증서 LOW, 의도적): 같은 id .sry 가져오기 시 newer-wins/병합 미적용(취소는 안전).

### 2026-06-25 #12: 잔여 후보 3건 마무리
- **#1 같은 프로젝트 .sry 재가져오기 안내**: proj.id===현재면 전환 확인 모달에 '이 프로젝트의 .sry 백업을 불러옵니다 — 현재 원고·라이브러리·수집함이 이 백업 시점으로 되돌아갑니다'(스냅샷 복원 의미 명확화). requestSwitch(proceed, note?) 확장. (newer-wins 병합은 스냅샷 복원 일관성·취소안전 확보로 불필요 — 미적용.)
- **#2 레거시 전역 라이브러리 1회만 이관**: linkbus.setLibraryProject 가 `sry:lib-migrated` 플래그로 '처음 여는 프로젝트'에만 레거시 전역 라이브러리를 복제 → 이후 새 프로젝트는 빈 라이브러리로 시작(진짜 프로젝트별 격리). 전역 원본 키는 보존.
- **#3 집필 통계 단일 진실원천(SSOT) 수렴**: linkbus `getWritingStats()`/`registerWritingStats` 브리지 신설(App 이 project.writingHistory→computeStreak/dayWords/todayWords 파생 등록). WriterDashboard 에 **'원고 기준(자동 집계 · Footer·통계와 동일)' 읽기전용 스트립**(오늘 단어·연속/최장·총 집필일·원고 전체) 추가 — 기존 수기 목표 트래커는 '별개'로 명시. 도구가 코어와 같은 숫자를 보게 됨.
- 검증: tsc 0 · npm test 174/174 · build · .sry 왕복 8/8 · 인터랙션 9/9 · 대시보드 SSOT 스트립 렌더·예외 0.
- **SSOT 소비 확장(완료)**: StreakTracker 는 원고 집필일(getWritingStats().dayWords)을 수동 체크일과 합산해 스트릭/잔디/총계 계산(원고 쓴 날 자동 인정). DeadlineCountdown 은 '원고 기준: 전체/오늘 단어' 표시 + (단어 단위) '원고 전체로 채우기' 버튼. 이제 Footer·통계·대시보드·스트릭·마감이 전부 같은 숫자.
- 남은 후보(선택): 같은 id .sry 항목별 병합(스냅샷 복원 일관성상 미적용 권장).


### 2026-06-25 #10: 20인 실사용 전문가 베타 → 137건 자동 수정
- 페르소나 20명(장편/웹소설/시나리오/학술/세계관/초보/키보드/접근성/모바일/테마/Studio/데이터안전/멀티프로젝트/도구헤비/교정/미디어/통계/내보내기/메타/몰입집필)이 실사용 시나리오로 발굴 + 적대 검증(170 에이전트). **확정 137건(HIGH 6·MED 64·LOW 67)** → 파일별 43 에이전트로 일괄 수정.
- 주요 수정: 다른 폴더 문서 병합 경고·스냅샷 롤백 자동백업·찾기바꾸기 undo/마커 보호·집중모드 flush(원고 손실 차단); **바인더 키보드 내비(role=tree, 방향키/Enter/F2/Delete/Alt±이동)**·우클릭/더블클릭 펼치기·다중선택 메타 일괄 미지원 안내; **도구창 스위처 독(타일/모두최소화/모두닫기)·세션 복원(sry:toolSession)**; 좁은화면 패널 오버레이·리사이저 키보드/터치(PointerEvent); **'보기' 메뉴 신설**·문서 점프(⌘PgUp/Dn)·토글 단축키(집중⌘⇧↵·분할⌘⇧K·바인더⌘⇧B·인스펙터⌘⇧I·테마⌘⇧L·논증⌘⇧A)·모달 중 전역키 가드; 첫실행 환영모달; 학술(Crossref→참고문헌 추가·본문 인라인 인용 scriv:insertCitation·IEEE 번호식·각주/미주 구분); 각본(한글 장면/전환 인식·data-se 보존·FDX 정렬); 키워드/상태 색·관리, 다중선택 일괄, 미디어 다운로드 확장자, PDF 페이지나눔, 맞춤법 본문반영(linkbus activeDoc 브리지), 도구 연계(WorldWiki/RelationshipMap/WorldMapCanvas payload·왕복), 수집함(용량상한·자동정렬/리스트뷰·썸네일·z레이어·GC·로컬미디어 경고), 다크/세피아 색 하드코딩 제거, 프로젝트 삭제 정리(idbDeleteWithCleanup) 등.
- **후속 추가**: **프로젝트 목록/열기/삭제 UI**(`src/components/ProjectListModal.tsx`) 신규 — idbList/idbLoad/idbDeleteWithCleanup 연결, 파일 메뉴·Studio·팔레트에 '프로젝트 목록 / 열기…'. 열기는 requestSwitch(전환 저장확인) 경유, 현재 프로젝트는 삭제 불가. (베타 #21 idbList 死코드·#41 삭제 불가 해소, 다중 프로젝트 워크플로 완성.) CDP 3/3.
- **의도적 스킵(고위험/범위 밖)**: 수집함 미디어를 .sry 에 동봉하는 심층 리팩터(→경고로 대체), 전역 라이브러리(인물/장소) 프로젝트별 격리(→노트만).
- 검증: **tsc 0 · npm test 174/174 · build · 인터랙션 9/9 · 바인더 5/5 · 수정도구 표본 13/13 무크래시·예외 0**. (테스트 셀렉터: 환영모달 닫기 + '새 텍스트'→'새 글' 반영.) 동시편집 회귀는 0 확인.
- ⚠️ 다음 후보(대부분 완료): 수집함 .sry 동봉·라이브러리 프로젝트별 격리는 #11, streak/대시보드 SSOT 수렴은 #12 에서 완료.

### 현재 상태 한눈에 (2026-06-22 기준)
앱은 이제 **완전한 sry 네이티브**다(Scrivener 흔적 제거·코드는 `SCRIVENER_INTEROP=false`로 숨김·보존).
- **저장소**: IndexedDB `sry`/`sry-backups`/`sry-blobs`, localStorage `sry:*`, 채널 `sry-sync`. 옛 `scrivener-web`/`scrivweb:` → 부팅 시 1회 마이그레이션(손실 0, 옛 DB 보존). → [[data-safety]]
- **저장/열기**: sry 네이티브(`sry.json`+`Files/<id>.rtf` 폴더 / `.sry.zip`, `src/persistence/sryfmt.ts`). 레거시 .scriv/.scrivweb.zip 열기는 폴백 지원. 내보내기(PDF·DOCX·RTF·ePub·ODT·LaTeX·MD·Fountain·FDX·TXT·HTML)는 **파일 메뉴 → 원고 내보내기**(CompileDialog).
- **도구 555개**(기본+장르+자율 대형 50). **조합 생성기 122종은 조합수 현재+50억 이상 + 의미 정합성** 확보. → [[combo-generators]]
- **이모지**: 도구 본문 OS이모지 → SVG `<Emoji>`(linkbus 재노출, 매니페스트 게이트). UI 아이콘은 커스텀 `<Icon>`.
- **UI**: 즐겨찾기 패널·스냅샷·Studio 전환형 스킨(레일 아이콘 mono 통일)·세로휠→가로스크롤. → [[ui-favorites-snapshot-skin]]
- **수집함(StashBox) 프로젝트별**. **프로젝트 전환 시 저장 확인 모달**. **바인더 우클릭 '이름 바꾸기' + 새 항목 자동 인라인 이름입력**(store `renameId`).
- **테마 전역 영속**(`sry:theme`), 새 프로젝트가 계승.
- **검증 루틴**: `tsc --noEmit`(0) → `npm test`(174) → `vite build` → CDP: `_cdp_interact_beta.cjs`(실사용 9/9)·`_cdp_binder.cjs`(5)·`_cdp_migrate.cjs`(마이그 4)·`_cdp_favsnap.cjs`·`_cdp_skin.cjs`. **베타는 '실사용 인터랙션'으로** → [[interaction-beta]].
- **남은 후보(미요청)**: 임의 IDB 프로젝트 재오픈용 '프로젝트 목록/최근 항목' UI(현재 전환은 새/열기뿐, .sry 백업 권장). 안내문 톤 통일.

상세 연대기는 아래 #9 → #1 순(최신이 위).

### 2026-06-21: 즐겨찾기 패널 · 스냅샷 제대로 · 커스텀 SVG 아이콘 · Studio 전환형 UI (+베타 2라운드)
- **즐겨찾기(앱 전역)**: store `favorites`(localStorage `scrivweb:favorites`, id=명령 id). 우측 인스펙터 **'★ 즐겨찾기' 탭**(클릭 실행·드래그 재정렬·`text/fav` 드롭 추가). 도구창 헤더 ★(클릭/드래그) + 명령팔레트 모든 행 ★ → 507도구+모든 메뉴/뷰 즐겨찾기. App 이 `scriv:run-fav` 로 실행(commandsRef).
- **스냅샷**: snapshotEntry(=안내 끄고 텍스트 문서 활성일 때만 즉시, 아니면 모달). 모달 재설계(스냅샷이란?·쓰는 법·오류 아님·지금 찍기/목록 보기/다시 안 보기). 찍기 전 `scriv:flush-editor` 로 최신 본문 보장.
- **커스텀 SVG 아이콘**: `src/ui/icons.tsx` `<Icon>`+`iconForTool` → 이모지 대체(허브 507카드·도구창·독·관련도구·장르함). split/palette/sun/moon 포함.
- **Studio 전환형 UI**: `src/components/StudioShell.tsx`(좌측 레일+모던 헤더+3분할, Binder/Inspector/10뷰 재사용). store `uiSkin`('classic'|'studio', localStorage). App return 분기, 모달/도구창/스태시/팔레트/Footer 공유. **같은 store → 전환해도 원고 100% 보존**(CDP 양방향 검증). 전환: 클래식 툴바 'Studio' 버튼 / 팔레트 skin-studio·skin-classic. CSS=styles.css `.studio-root` 블록.
- **베타 2라운드(16명+8명, 적대 검증)** → high/med 전부 수정: 다크 레일 흰색반전(--st-rail-bg 고정)·Studio Footer 소실(flex)·스냅샷 flush·폴더 점프·헤더 아이콘 중복·인스펙터 탭 a11y(roving/tabpanel)+가로스크롤·좁은폭 헤더 잘림(flex-wrap+shrink:0)·명령 id 'split' 중복(→toggle-split)·run-fav flash. 검증: `scripts/_cdp_skin.cjs`(15)·`_cdp_favsnap.cjs`(6)·tsc 0·빌드. → [[ui-favorites-snapshot-skin]] 메모리.
- **저순위 미관도 마무리(2026-06-21)**: 인스펙터 MetaTab 아이콘 피커·QUICK_TOOLS·북마크·라이브러리 Row·즐겨찾기 행을 전부 커스텀 `<Icon>` 으로 교체(이모지 0 검증: 메타 피커·연계 탭 SVG only). 즐겨찾기 행에 항목별 아이콘(favIconName)+라벨 이모지 제거(stripLeadingEmoji). icons.tsx 에 heart/flag/link 추가. 남은 이모지는 안내 산문('💬 버튼으로')·체크마크(✓/○)뿐(UI 아이콘 아님).
- **추가(2026-06-21 #2)**: ①도구창 헤더를 끌어 즐겨찾기 패널에 놓으면 추가+최소화(elementsFromPoint 드롭존 탐지, `_cdp_windrag` 6). ②Studio 메뉴바(파일/문서/도구/보기) 추가 — 클래식 메뉴 누락분 보강. ③아이콘 컬러 시스템(ICON_COLOR + Icon color/mono) + 명령 팔레트·인스펙터·헤더·메뉴 이모지 제거. ④이모지→컬러 아이콘 스윕(워크플로, components 22파일 79개; 도구 내부 콘텐츠 이모지·기호는 보존). ⑤세로 휠→가로 스크롤(App 전역 wheel 핸들러: 가로로만 스크롤되는 영역에 deltaY→scrollLeft). 전부 tsc 0·빌드·CDP 검증.
- **남은 저순위(다음 후보)**: 안내문 존댓말 톤 통일, 도구 내부(src/tools ~555파일) 헤더/버튼 이모지의 선택적 추가 정리(콘텐츠 이모지는 유지), CreativeStudio 잔존 콘텐츠 이모지 검토.

### 2026-06-22 #9: 내보내기 발견성·수집함 프로젝트별·전환 저장확인·바인더 이름변경
- **내보내기 메뉴 이동**: "컴파일/내보내기"(PDF·DOCX·RTF·ePub·ODT·LaTeX·MD·Fountain·FDX·TXT·HTML, `CompileDialog`)를 도구 메뉴 → **파일 메뉴**로 이동(클래식·Studio·팔레트 3곳). 발견성 개선. 엔진/포맷은 기존대로 전부 동작.
- **수집함(StashBox) 프로젝트별**: 키를 전역 `sry:stash:items` → `sry:stash:items:<projectId>`. 프로젝트 전환 시 해당 프로젝트 수집함 로드(useStore project.id 구독). 구 전역 수집함은 현재 프로젝트로 1회 마이그레이션. 위치/창은 전역 UI 선호 유지.
- **프로젝트 전환 저장 확인**: 새/빈 프로젝트·sry 폴더/파일 열기 전 확인 모달(현재 작업 `.sry로 내보내고 전환` / `그냥 전환` / `취소`). flush+IDB 영속 후 전환(편집 손실 방지). App `requestSwitch/doProceedSwitch`, NewProjectModal `onCreate` 위임. (IDB엔 자동저장되나 임의 프로젝트 재오픈 목록 UI는 아직 없어 .sry 백업 권장 안내.)
- **바인더 이름변경/추가**: 우클릭 컨텍스트메뉴에 `이름 바꾸기`(비루트) 추가 → 인라인 편집. store `renameId`+`setRenameId` 신호: `addItem`이 제목 미지정(=UI '새 텍스트/새 폴더') 시 renameId 설정 → 새 항목이 **즉시 인라인 이름 입력 상태**(Row useEffect 감지). import 등 제목 있는 추가는 제외.
- 검증: tsc 0 · build · 인터랙션 베타 9/9(전환 모달 포함) · 바인더 `_cdp_binder.cjs` 5/5 · 수집함 프로젝트별 키 확인.

### 2026-06-22 #8: 전 조합 생성기 조합수 +50억 (의미 정합성 보장)
- 사용자 요청: 랜덤 조합 도구의 조합 가짓수를 현재+50억 이상으로, 단 결과는 누가 봐도 말이 되게.
- 스캔(`Math.random`+풀): 254종 중 **진짜 조합 생성기(A) 122종** 식별(나머지 132는 단일픽 참고도구로 곱집합 없음 → 제외; CharacterSheet·GMCChart 는 CRUD 폼이라 스캔 오분류로 제외).
- 방식: 도구별 슬롯 풀을 확장(또는 자연스러운 슬롯 추가)해 **곱 ≥ 옛+5e9**. 파일럿 10 → 배치 5개(25·25·25·25·12)로 롤아웃. 각 도구를 boost→adversarial verify(BigInt 곱 재계산 + 무작위 샘플 6개 의미 정합성 검수) 2단계.
- **조합수: 122종 전부 +50억 달성**(중복 부풀림 0, 검증기 곱 재계산 일치). 예: WuxiaCharForge 8.0e29, RomanceSynopsis 245조, HorrorSettingForge 113조, RomfanWorldBuilder 7.2e16, LitrpgOutline 23조.
- **의미 정합성**: 검증이 잡은 결함 누적 21건(+파일럿 4)을 일괄 수정 → 통과. 결함 유형/교훈: ①받침 인식 조사 헬퍼 필수(을/를·이/가·으로/로), 결과에 "을(를)"·"○○"·"A/B 슬래시" 플레이스홀더 노출 금지 ②슬롯 문법역할 일치(종결문을 명사 자리에 금지, 연결어미 항목을 문장종결에 금지) ③교차 슬롯 모순 제약(범인↔무공, 증강없음↔강화갈등, 한밤중↔햇빛, 장르 교차혼합 금지; 상호배타는 게이트/일반화) ④인접 중복·필수 슬롯 누락 방지.
- 검증: tsc 0 · build · 인터랙션 회귀 8/8 · 생성기 표본 25/25 무크래시·예외 0. 임시 스크립트 정리. (도구 총 555 변동 없음.)

### 2026-06-22 #7: sry 네이티브 저장/열기 + 저장소 식별자 sry 마이그레이션 (Scrivener 제거)
- 저작권 안전: 저장/열기·저장소·확장자에서 Scrivener 흔적 제거, **우리 앱 sry 네이티브**로 통일. 벤치마킹한 도구/기능은 유지, RTF/DOCX/TXT/PDF/Fountain/FDX 공개 포맷도 유지.
- **sry 포맷**(`src/persistence/sryfmt.ts`): 폴더 패키지 `<제목>.sry` = `sry.json`(프로젝트 인덱스, 미디어 dataURL 인라인) + `Files/<id>.rtf`(본문). 휴대 파일 `.sry.zip`(동일 FileMap). `buildSryFileMap`/`readSryFileMap`. 자체완결.
- **App**: `const SCRIVENER_INTEROP = false`. 자동/수동 저장·폴더/파일 저장·열기 모두 sry. `.scriv` 폴더/zip 저장·열기 메뉴는 플래그로 숨김(팔레트/Studio/클래식 3곳). scrivx.ts·`saveScrivFolder`/`openScrivFolder`/`saveScrivZip`/`onImportScrivZip`·`buildScrivPackageAsync` 코드는 보존(플래그 true 시 재노출). **레거시 열기**: `readSryFileMap` 가 sry.json/project.json 없으면 `readScrivPackageAsync` 폴백 → 기존 `.scriv`/`.scrivweb.zip` 사용자 데이터 그대로 열림. 파일입력 accept `.sry,.zip`.
- **저장소 식별자 마이그레이션(손실 0)**: IndexedDB `scrivener-web`→`sry`(idb.ts), `-backups`→`sry-backups`(backup.ts), `-blobs`→`sry-blobs`(blobs.ts, 아웃오브라인 키 보존); localStorage `scrivweb:`→`sry:`(src 482파일 일괄 치환 + index.ts 부팅 마이그레이션이 옛키 복사, `scrivener-web:lastProjectId`→`sry:lastProjectId`); sync 채널 `sry-sync`. 부팅 1회 복사(새 DB 빌 때만, 플래그 가드), **옛 DB 는 삭제하지 않고 보존**(복구 안전). pack.ts 기본 파일명 `sry-project`.
- 사용자 노출 ".scriv"/"Scrivener" 문구 정리(App 저장공간 경고·저장버튼 툴팁, Footer, BackupModal 다운로드명 `.sry.zip`, FormatBar 리비전 툴팁).
- 검증: tsc 0 · build · 단위 174(rtf88+export12+creative55+persistence19) · 인터랙션 베타 8/8 · **마이그레이션 데이터-안전 4/4**(`scripts/_cdp_migrate.cjs`: localStorage·lastProjectId·IDB 프로젝트 이전 + 옛 DB 보존). → [[data-safety]] 메모리 갱신.

### 2026-06-22 #6: 코어 '실사용' 인터랙션 베타 — 데이터-안전 버그 다수 수정
- 계기: 사용자 지적 "다크/세피아에서 새 프로젝트 시 테마가 라이트로 리셋" — 기존 베타(코드리뷰/도구 위주)가 못 잡은 **실제 인터랙션 버그**. → CDP 실클릭/드래그 베타(`scripts/_cdp_interact_beta.cjs`) + 코어 다관점 인터랙션 베타(10관점·적대검증) 도입.
- 확정 36건(HIGH 8·MED 9·LOW 19) 전부 수정. 주요 HIGH(원고 안전):
  1. **타임라인 카드 재정렬 → 다른 章으로 조용한 reparent**(TimelineView.handleDrop same-parent 가드).
  2. **.scriv 핸들 잔존 → 새 프로젝트가 이전 폴더 덮어써 원고 소실**(App: scrivHandle 을 {handle,id} 로, 현재 프로젝트 일치 시만 기록 — `scrivHandleFor`).
  3. **'휴지통에서 복원'이 정상 문서에도 작동**(store.restoreFromTrash isInTrash 가드 + 메뉴/팔레트 disabled).
  4. **normalizeProject 가 에디터 타이포 등 미지정 필드 폐기 → 새로고침 유실**(`{...s, 기본값}` 보존).
  5. **도구창 최소화=언마운트 → 작업 소실**(App 렌더 유지, ToolWindow `minimized`→display:none).
  6. **분할 편집기 같은 문서 양쪽 → 동시저장 충돌**(Editor splitId===activeId 차단).
  7. **템플릿 새 프로젝트 테마 리셋**(NewProjectModal 계승) + store.newProject 테마/타이포 계승·뷰상태 리셋.
- 테마 전역 영속 localStorage `sry:theme`(setTheme), 새 프로젝트 계승. Studio 레일 아이콘 통일 회색(mono).
- 검증: tsc 0 · build · 영속성 19/19 · 인터랙션 베타 8/8.
- ⚠️ 남은 대기열: ① **sry 네이티브 저장/열기 신규 구현**(Scrivener `.scriv`/`.scrivx` 경로 제거·플래그로 숨김·코드 보존, txt/pdf/docx/rtf 유지) + IDB/localStorage 식별자 `sry` 마이그레이션 ② **전 조합 도구 조합수 +50억**(슬롯 풀 확장, 단 결과는 누가봐도 말 되게 — 슬롯 독립성·장르 부합·자연한국어, 샘플 적대검수).

### 2026-06-21 #5: 이모지 전수 스윕 완료(도구 본문 → <Emoji>)
- `<Emoji>`/`emojify` 를 **linkbus 에서 재노출**(`export {Emoji,emojify} from '../ui/Emoji'`) → 도구가 컨벤션(react+linkbus) 안에서 사용.
- **도구 본문 OS 이모지 → SVG `<Emoji>` 전수 치환**: src/tools 416개 후보를 7배치(12+30+90×4+56) 워크플로로 처리, 약 **5,000+ 렌더 지점** 치환. 매 배치 tsc·빌드·CDP 검증.
- 보존 원칙: `meta.icon`(레지스트리 렌더), 데이터 배열 원본 문자열, 클립보드/내보내기/저장 문자열(buildText/bodyHtml/addToProject 등), `<option>` 자식, 속성값(placeholder/title), 단순 기호(★✓→ 등)는 보존 — '화면 렌더 지점'만 치환. 보유분만 SVG·미보유 원문(정보 손실 0).
- 배치 중 발견한 JSX 회귀(에이전트가 `</button>` 누락) 2건(QueryLetter·ReadabilityMeter) 즉시 수정. 최종 tsc 0·빌드·표본 25/25 무크래시·SVG 다수 렌더·즐겨찾기 회귀 6/6.

### 2026-06-21 #4: 이모지 안전 전환 · 혁신 도구 50개 · 베타 4라운드 수렴
- **이모지 시스템 안전 전환**: 런타임 DOM 치환 파서(전역)는 베타에서 **React removeChild 크래시 + 미보유 이모지 무한루프** 확인 → 폐기. `src/ui/Emoji.tsx`(매니페스트 게이트·BASE_URL·FE0E·로드실패 텍스트 폴백) + `src/ui/emoji-manifest.ts`(생성: `node scripts/_copy_emoji.cjs`, public/emoji 878개) 안전 컴포넌트로 대체. App 전역 파서 호출 제거. ⚠️ **남은 작업**: 도구 본문(src/tools)의 콘텐츠 이모지를 `<Emoji>`로 치환하는 소스 스윕은 미완(파서 폐기로 현재 OS 이모지로 표시). chrome/인스펙터/런처는 커스텀 Icon 으로 이미 무이모지.
- **혁신 대형 도구 50개**(워크플로): 인물 중력장·서사 심전도·복선 장부·대사 지문·세계 물리 샌드박스·플롯 풍동·관계 열역학·가상언어 대장간·재난 시뮬·스토리 별자리 통합대시보드 등. 전부 linkbus 연동(useLibraryList/addToProject/addToStash/openToolLinked, 정규 CHARACTER/PLACE_FIELDS). 레지스트리 **555개**. 결정론·로컬·키없음.
- **전문 베타 4라운드 + 도구별 수정 워크플로**(연 250+ 에이전트, 적대 검증): R1 34건(high0)·R2 35건(high0)·R3 24건(**high2** 기존 잠복: plot-hole-radar 한글 `\b` 정규식·theme-debate-chamber 손상복원 크래시)·R4 **high0/med0** LOW18 → 전부 수정. 수정 유형: React 순수성(업데이터 내부 setState 제거), payload 재수신 ref 가드, 죽은 연동 링크/payload 형태 정합(EventTimeline events/text 흡수·WordFrequency/SceneBeatCards payload 수용 확장), 스키마 키, 타이머/리스너 cleanup, 죽은 코드. **크래시·원고 손실 0**.
- 검증 루틴: `_cdp_newtools.cjs`(50/50 렌더·예외0)·`_cdp_favsnap.cjs`(6)·tsc0·빌드. PovswapSimulator 파일명 casing 은 _gentools 재생성으로 정합.

### 이전: 2026-06-16 — 여기부터 읽으세요(과거)

### 후속(2026-06-16 #3): 항목 일치 전수 + 사용자 정의 항목/기타 + 베타 2라운드
- **정규 fields 전수 정렬**: 생산 도구 82개를 정규 `fields`(CHARACTER_FIELDS/PLACE_FIELDS)로 보내도록 일괄 수정(워크플로). 받는 허브(CharacterSheet/SettingBible)는 모르는 키도 '추가 항목(extra)'으로 흡수 → **어느 도구→허브 전송도 손실 0**.
- **사용자 정의 항목 추가 + 고정 '기타'(etc)**: linkbus CHARACTER_FIELDS/PLACE_FIELDS 에 `etc` 추가. CharacterForge·CharacterSheet·SettingBible(레퍼런스) + 엔티티 생성기 52개(워크플로)에 "＋ 항목 추가"(사용자가 항목명 입력→빈칸, 무작위 생성 안 함, 재생성 시 값만 비움) + 기타 입력칸. custom 키=라벨, etc 키로 payload `fields` 병합 → 다른 도구에 그대로 전파. 런타임 검증(생성기 항목추가→시트 전달) 통과.
- **다관점 베타 2회**(14명+10명) → 발견 high/med 수정: StashBox 로컬파일(blobId/mime)·연재 글자수(공백포함)·폴더삭제 confirm·전체 찾아바꾸기 confirm·WeakVerbChecker 계사/보다(띄어쓴 보조용언)/듣다 오탐·GMCChart fields 소비+왕복 보존(srcFields)·SettingBible payload.place 수신(SettingForge→설정집 장소 유실 수정)·오감 왕복·type 드롭다운·**characterToHtml/CharacterEditor 가 스키마 외 항목 흡수**(addToProject 카드 본문/컴파일/검색 손실 수정)·RelationshipMap fields 폴백·도구창 최대화 툴바 안가림·명령팔레트에 507도구·월드맵 연계.
- **남은 베타 권고(미구현, 다음 후보)**: 전역 Undo/Redo, 공유 라이브러리·도구 localStorage 를 .scriv/zip 백업에 포함, 바인더 키보드 접근성, 모바일 뷰전환/드로어, 코르크보드 다크테마 토큰화, CSS 레이어 통합, 연재 publishedAt 입력칸, FindReplace 한국어 whole-word 경고.
- ⚠️ 데이터안전 E2E 가 머신 과부하 시 reload-retention 1건 타임아웃 플레이크(직접 reload 테스트는 통과 확인). 신선 크롬·머신 한산할 때 재확인 권장.



**현재 상태(전부 검증됨)**: 도구 **507개**(novel-A~K) · tsc 0 · NUL 0 · 단위테스트 174 · 빌드 정상 · CDP 종합(데이터안전 15/15·반응형 13/13·연계 9/9·수집함 9/9·다크대비 0안보임 10/10) 통과. 앱 제목 "sry"(임시).

**2026-06-16 후속 작업(검증됨)**:
- **도구창 최대화 버튼** 추가(ToolWindow: 분리·최대화·최소화·닫기). 최대화=뷰포트 채움/복원, 토글 검증(560→740).
- **도구 항목(스키마) 일치 — 손실 없는 연동**: linkbus 에 정규 스키마 `CHARACTER_FIELDS`(33개)·`PLACE_FIELDS`(15개) + `SharedCharacter.fields`/`SharedPlace.fields` 추가. **허브가 받으면 다 보존하는 구조**가 핵심: `CharacterSheet`/`SettingBible` 가 어떤 도구에서 받든(openToolLinked/라이브러리/바인더드롭) 기본 칸에 없는 항목을 "🧩 추가 항목"으로 흡수·표시·편집·재전송(extra). `CharacterForge` 는 24개 항목을 뭉치지 않고 정규 키로 1:1 전달(이전엔 appearance/personality/conflict 로 뭉쳐 MBTI·약점·말투 등이 유실). 즉 **생산 도구 120개를 일일이 안 고쳐도 허브 흡수로 손실 0**. (선택 후속: 생산 도구들이 정규 `fields` 로 보내면 기본 칸 배치까지 더 깔끔 — 워크플로로 일괄 가능.)
- **CharacterForge 아바타 성별 일치**: 우리가 생성하므로 분석 대신 성별로 제어 — avataaars 의 머리길이(top: 여=long/남=short)·수염확률로 얼굴을 성별에 맞춤. cartoon=fun-emoji. 검증: src 에 avataaars+top= 확인.
- 검증: tsc 0·빌드·생성기→시트 전 항목 전달(추가항목·MBTI)·캐릭터/장소 7도구 렌더·다크 10/10.

**이번 세션(6/15~16)에 한 일 요약**
1. 경쟁앱 6종(펜시브·스크리브너·노벨라·뮤블·Reedsy·율리시스) 조사 → 없던 기능 코어 통합: **웹소설 플랫폼 모바일 독자뷰 미리보기**(`PlatformReaderPreview.tsx`)·**회차 성과 추적**(SerialDashboard '성과' 탭, EpisodeMeta views/likes/comments/bookmarks/earnings)·**에디터 타이포그래피**(ProjectSettings editorWidth/ParaGap/LineHeight + `patchSettings`)·**검색 UI**(label/status scope·wholeWord·invert)·**컬렉션 rename/delete**·조아라/리디 export 프리셋. → [[webserial-competitor-features]] 메모리.
2. 버그 4건 수정: 스냅샷 ErrorBoundary(SnapshotsTab `?.` 가드)·다크 버튼 안보임(`.minibtn{color:var(--text)}`+전역 `button` 안전망)·CharacterModel 풍경사진(→Wikidata P31=Q5+P18)·앱제목 "sry"(데이터 식별자 'scrivener-web' 은 불변).
3. **UI 4.0**(styles.css 끝): 모던 폰트·슬림 스크롤바·블러 모달·라운드/그림자 정련.
4. **도구 연결성**: ToolWindow 자동 "관련 도구" 스트립 + App `relatedToolsFor`(명시+그룹+장르+키워드, 캐시). 에디터 `[[` 위키링크 자동완성(DocEditable).
5. 자율 도구 novel-D~K(각 14) → 507개. 목표 500 초과.

**도구 창 분리(다중 모니터) — 2026-06-16 추가·구현 완료**: ToolWindow 헤더 "분리"(ExternalLink) 버튼 → `src/components/PortalWindow.tsx`(window.open 별도 OS 창 + 그 문서에 **별도 createRoot** 로 렌더; createPortal 은 타 창 이벤트 미전달 문제로 미사용). 같은 출처라 zustand/linkbus/localStorage 자동 공유. 앱 스타일/폰트 복제 + data-theme 동기화(MutationObserver) + 그레이스 1.5초(초기 false 닫힘 무시). 팝업 차단 시 토스트+앱창 복귀(graceful). **헤드리스 Chrome 은 window.open 을 null 로 차단**해 분리 렌더 자동검증 불가(실제 데스크톱 브라우저에서 작동); 차단 graceful·무크래시·다크 버튼 가시성·일반창 회귀는 검증됨. `.popout-shell/head/body` CSS.

**다음 세션 바로 할 수 있는 것(택1, 사용자 지시 대기 중)**
- (A) **도구 캠페인 계속**: novel-L 부터. 절차 = 기존 파일명 목록(`ls src/tools/*.tsx`)과 대조해 중복 0인 신규 14개 PascalName 선정 → `scripts/_genre_suite.js` 가 아닌 인라인 Workflow(novel-K 스크립트 복제·수정: `workflows/scripts/novel-tools-k-*.js` 참고) → `node scripts/_gentools.cjs` → `npx tsc --noEmit` → `npx vite build` → `node scripts/_cdp_tools.cjs "<ids>"`/`_cdp_interact.cjs`. **워크플로는 한 번에 하나만.**
- (B) **UI 과감한 재설계**: 사용자가 화면 1개 지정(툴바/사이드바/에디터/도구창) 대기. 현재는 구조 유지+표면 정련까지만 됨(사용자가 "구조가 확 안 바뀜" 지적). 구조까지 바꾸려면 해당 컴포넌트 + styles.css 직접 개편.
- (C) **[[ 위키링크 자동완성** 다중문서 추천 자동테스트는 헤드리스 바인더 구동 한계로 미완(기능 자체는 코드·안전성 검증됨). 실브라우저 수동 확인 권장.

**검증 루틴/도구**: `scripts/_cdp_serial.cjs`(웹연재)·`_cdp_darkfix.cjs`(다크 버튼대비+스냅샷+캐릭터모델)·`_cdp_wikilink.cjs`(위키링크) 신규 추가됨. 데이터안전 E2E 는 **신선 크롬 단독** 실행해야 정확(같은 크롬 연속이면 경합 플레이크). NUL 가드는 `_gentools.cjs` 내장. 절대 IndexedDB/localStorage 'scrivener-web' 식별자 변경 금지(원고 유실).

---

## 진행 상태 요약 (현재 시점)

- ✅ **버그 수정·UI 4.0·연결성 강화(2026-06-15 추가)**:
  - **앱 제목 → "sry"**(임시): index.html·vite manifest·README·package(.json/lock). **단 IndexedDB/localStorage 식별자 'scrivener-web' 은 절대 변경 안 함**(기존 저장 원고 유실 방지).
  - **다크테마 버튼 안 보임 수정**: `.minibtn` 이 `color` 미지정 → `<button>` UA 기본색(검정) → 다크 배경서 안 보이고 hover 시만 보임. `.minibtn { color: var(--text) }` + 전역 안전망 `button { color: var(--text) }`. CDP 대비 감사로 "안 보이는 버튼 0개" 확인.
  - **스냅샷 클릭 시 ErrorBoundary** 대비: 옛 프로젝트에 `snapshots` 필드 없을 때 `project.snapshots[id]` throw → Inspector SnapshotsTab `?.` 가드(+normalizeProject 가 이미 백필). CDP 재현 시 전 경로 무크래시.
  - **CharacterModel 인물사진 수정**: Commons '검색'은 풍경/사물 혼입 → **Wikidata(P31=사람 Q5 + P18=그 인물 사진)** 로 교체해 인물 보장 + Commons 라이선스·작가 검증. CDP로 실제 인물 사진+라이선스 표기 확인.
  - **UI 4.0**: 모던 폰트 스택(Pretendard 폴백)·슬림 스크롤바·블러 모달 백드롭·라운드/그림자 정련·버튼 정련.
  - **도구 연결성 강화**: ToolWindow 하단에 **자동 "관련 도구" 스트립**(App `relatedToolsFor`: 명시적 관계+동일 그룹+동일 장르+이름/소개 키워드 겹침, 상위 8, 캐시) → 451개 전 도구가 별도 설정 없이 폭넓은 관련 도구 노출. scene-forge → 8개 관련 칩 확인.
  - **[[ ]] 위키 링크 자동완성**(Editor): 타이핑 비간섭(읽기만)+선택 시에만 Range 삽입(try/catch). 코드/안전성 검증(헤드리스 바인더 구동 한계로 다중문서 추천 자동테스트는 환경 제약).
  - 검증: tsc 0·단위 174·빌드·NUL 0·CDP 다크종합 10/10. 신규 `scripts/_cdp_darkfix.cjs`·`_cdp_wikilink.cjs`.
  - ✅ 자율 신규 도구 **novel-A~K** 누적 → **507개**(사용자 "신규 500개" 달성·초과). novel-H~K 는 전 분야 레퍼런스+craft(호칭·방언·어원·시대상·부상·직업·복식·식문화·약초·동물·색채·예법·건축·무기·의성어·말단계·속어·바디랭귀지·군사·작위·의례·이동·역병·화폐·법·천문·협상·플롯구멍·과거사·결말·페이싱·첩보·항해·도시·수감·미용 등) 전부 강한 linkbus 연계. 각 배치 tsc 0·NUL 0·CDP 클린. 최종 종합 크로스체크(데이터안전 15·반응형 13·연계 9·수집함 9·다크대비 0안보임 10/10) 통과.
- ✅ **경쟁 앱 6종 기능 조사·구현(2026-06-15)** — 펜시브(Pensiv)·스크리브너·노벨라(Novela)·뮤블(Muvel)·Reedsy Studio·율리시스 조사 → **우리에게 없던 기능만** 코어에 정식 통합(샌드박스 도구 아님; 실제 프로젝트/회차에 연결).
  - **웹소설 플랫폼 모바일 독자뷰 미리보기**(`PlatformReaderPreview.tsx`) — 문피아·네이버시리즈·카카오페이지·노벨피아·리디·조아라의 폭/글꼴/줄간격/문단간격 리더 프리셋으로 실제 회차를 폰 프레임에 렌더 + 플랫폼별 권장 분량 적합도. 명령팔레트/메뉴/연재대시보드(📱)에서 열림. 펜시브·뮤블 시그니처.
  - **회차 성과 추적**(SerialDashboard '성과' 탭) — 조회수/연독률(1화 대비)/추천/댓글/선호작/정산 수기 입력·합계·이탈 경고. EpisodeMeta 확장(views/likes/comments/bookmarks/earnings).
  - **에디터 타이포그래피**(ProjectSettings) — 편집창 폭·문단 간격·줄간격 + 프리셋(기본/웹소설/집중/넓게). 뮤블 스타일 커스터마이징. `.paper` CSS변수로 비파괴 적용(미설정 시 기존 760/0.7em/1.6 동일).
  - **검색 UI 패리티**(Binder) — 라벨/상태 scope + 온전한단어 + 반전 토글(백엔드는 이미 지원하던 것 노출). **컬렉션 관리**(더블클릭 이름변경·× 삭제, renameCollection 추가). 스크리브너/율리시스.
  - **export 프리셋** 조아라·리디 추가(platforms.ts). 검증: tsc 0·단위 174·빌드·CDP(웹연재 스모크 9/9·데이터안전 15/15·반응형 13·연계 9·수집함 9). 신규 `scripts/_cdp_serial.cjs`.
  - **의도적 미구현**(이유 명시): [[ ]] 라이브 자동완성(원고 contentEditable 변형 위험 vs 데이터안전 최우선·기존 링크삽입+백링크로 수요 충족) / HWP 바이너리 내보내기(포맷 복잡·위험; DOCX·RTF가 한글에서 열림) / 실시간 협업·클라우드백업(서버 필요·브라우저전용 범위 밖) / AI 감정피드백(토큰/키 필요 기능 금지 지시). ※ 이미 보유해 제외: 코르크보드·아웃라이너·문서별 스냅샷+diff·내부링크+백링크·분할편집·집중/타자기모드·키워드/라벨/상태/커스텀메타/검색컬렉션·플랫폼 발행 변환 등.
- ✅ **도구 허브 423종**(2026-06-15). 기본 100 + **장르별 168**(12장르×14) + **자율 대형 도구 novel-A~E**(각 14, 일부 개선 재작성) + 수집함/핀보드 등. 전 배치 tsc 0·CDP 렌더/상호작용 클린.
  - novel-D 14(투고추적·쿼리레터·뒤표지·시리즈설정집·용어집·유사작·챕터제목·이름표기통일·연속성·발음가이드·시놉시스길이별·피치·퇴고패스·읽기순서).
  - novel-E 14(월드맵캔버스·원고버전비교·찾기바꾸기스튜디오·What-if증폭·인물말투실험실·긴장도그래프·주제직조·대사워크벤치·장면비트카드·위기사다리·집필히트맵·이름믹서·나이타임라인·독자페르소나). 4개(draft-compare/theme-weaver/name-mixer/reader-persona)는 기존 동명 도구의 **개선 재작성**(NameMixer는 외부 API 제거→자작 음절, 저작권/네트워크 안전 향상).
  - ⚠ **NUL 바이트 함정**(중요): 에이전트가 `'\x00'` 구분자를 실제 NUL로 기록 → binary 판정·CDP NOMOUNT 오보(tsc/빌드는 통과). 전 src 스캔으로 3개(GlossaryBuilder/LoreConsistency/WritingDictionary) 교정, `_gentools.cjs`에 **NUL 자동 교정 가드** 내장. heredoc/Edit로 `\x00` 다루면 재변질하니 `String.fromCharCode(0)`/명시 바이트값 사용.
  - 종합 크로스체크 베타: 데이터안전 15/15·반응형 13/13·연계 9/9·수집함 9/9 통과.
- ✅ **도구 허브 100종** 완성·검증(렌더 예외 0·상호작용 에러 0). 8그룹.
- ✅ **데이터 안전성 보강** 완료·검증(단위 19 + E2E 15). → [DATA-SAFETY.md](DATA-SAFETY.md)
- ✅ **창 최소화/독** + **도구 연계(linkbus)** 인프라 구축. → [TOOL-LINKAGE.md](TOOL-LINKAGE.md)
- ✅ **저작권 안전화 + 연계 리트로핏** 기존 12종(갤러리·메트·무드보드·캐릭터모델/시트·관계도·배경설정집·감각팔레트·이름믹서/분석·표지목업·포켓몬). → [LICENSING.md](LICENSING.md)
- ✅ **음악 갤러리**(music-gallery, Openverse CC0/PD 오디오, 재생, 연계) + **장면 생성기**(scene-forge, ~1.3억 조합, 슬롯 잠금, 연계) 추가·검증(렌더/상호작용/연계 E2E 통과). 도구 102종.
- ✅ **연계 E2E**(scripts/_cdp_linkage.cjs, 9통과): 라이브러리 저장·관련 도구 열기 동작 확인.
- ✅ **UX 교차 검토**(13 전문가, 126건) → 우선순위 도출. 인프라 수정 직접 적용: ToolWindow(clampPos 강화·앞으로가져오기 z-index·리사이즈 영속/축소버그·터치) · 독 칩(진짜 버튼·푸터 위·가로스크롤) · ToolHub(검색 고정·카테고리 검색·이중스크롤·지우기) · BackupModal(실패 catch). 합성기 ×144 확장 적용.
- 🔄 **도구별 UX 수정 워크플로 실행 중**(13종: 한글맞춤법 죽은 규칙·포모도로 입력/정확도·칸반/마인드맵 삭제확인·갤러리 payload·가독성/부사 오탐·메트 깨진이미지·음악 전환·개요트리·라이브러리 중복·클립보드 폴백).
- ⏳ **남은 과제**(아래) — 신규 100종, 연계 확대, 메뉴 세분화.

## 남은 과제 (다음에 이어서)

0. **(신규 요청) 음악 갤러리/플레이어 도구** — 갤러리처럼 무작위/그날그날 바뀌는 음악을 가져와 재생. **반드시 저작권 안전**(CC0/PD/CC-BY + 출처표기): Openverse audio(api.openverse.org/v1/audio, license=cc0,pdm) 우선, Internet Archive(PD/넷레이블) 보조. 가사 등 저작권 텍스트 표시 금지. **연계**: 배경설정/캐릭터 도구와 결합(곡 분위기→글감/테마곡), 라이브러리 snippet 저장.
0b. **(신규 요청) 씬/장면 무작위 생성 도구** — **1억(100,000,000)+ 조합**. 창작 스튜디오에 procgen-scene(≥1천만)이 있으나, 도구 허브에 1억+ 전용 SceneForge 추가 + **연계**(생성 장면→scene-list/setting-bible/캐릭터). 조합수 ≥1e8 검증.
0c. **(신규 요청) 전체 UX 교차 베타** — 지금까지 만든 **모든 부분**을 실제 유저 관점으로 점검: 버그뿐 아니라 "불편/개선점"까지 다수 에이전트가 교차 발견→개선. 데이터안전·연계·도구·뷰 전부.


1. **신규 대형 도구 100개 추가**(사용자 강력 요구). 조건:
   - 최신 책·작법서(예: The Writing Book, Steering the Craft, Story, Save the Cat, Bird by Bird, On Writing, Wired for Story, Emotional Craft of Fiction, Self-Editing, Anatomy of Story, Techniques of the Selling Writer, Story Genius, Poetics 등)에서 **구체적·상호작용형** 도구/연습 추출.
   - 글쓰기 앱에 국한 말고 **다양한 앱/웹앱/사이트** 조사해 차용.
   - **키 없는 무료 공개 API**(GitHub public-apis 류 포함) 발굴해 활용. 후보: gutendex.com(구텐베르크 PD 소설), Wikisource, Chronicling America(loc.gov, PD 신문), Hacker News API, dev.to API, ConceptNet(api.conceptnet.io, 단어 연상), Cleveland Museum(openaccess CC0), Wikimedia Commons, images-api.nasa.gov(PD), bible-api.com, MusicBrainz, TVmaze, opentdb 등. 모두 **키 없음+https+CORS** 확인 필요.
   - 사용자 예시: (a) 한국어/영어 단어·문장으로 글감/묘사/인물 상상 생성 도구, (b) 공개·무료가 된 소설/블로그/기사에서 영감받는 도구.
   - **연계 내장**(linkbus): 관련 도구·무작위 생성기와 데이터 주고받기. → [TOOL-LINKAGE.md](TOOL-LINKAGE.md)
   - 배치 ~14개씩, **워크플로 하나씩**(레이트리밋). 배치마다 `_gentools.cjs`→tsc→build→CDP 렌더+상호작용 베타.
2. **연계 확대**: 창작 스튜디오의 무작위 인물/장소 생성기 → "라이브러리/시트로 보내기" 추가. 다른 도구 클러스터(플롯/장면/감정/세계관)도 상호 연계.
3. **메뉴 세분화**: 100→200개가 되면 ToolHub 그룹 taxonomy 재정비(필요시 상위 섹션 도입). 그룹은 meta.group 기반 자동.
4. **종합 다중 QA 교차 베타**: 같은 부분을 여러 에이전트가 교차 점검(find→adversarial verify). 데이터 안전·연계·신규 도구 전부.
5. **README/문서 카운트 갱신**, 임시 스크립트 정리(_gentools/_cdp_* 는 재사용으로 유지).

## 추가 요청 (대기)

- **무작위 생성기 조합수 ×100 확장(전부)**: 창작 스튜디오 합성기(1,534, 슬롯곱)·생성기(151, 단일픽)와 도구 허브 무작위 도구 전부. 합성기는 프레임워크에서 보편 "변주" 슬롯 2개(각 ~12) 추가 → ×~144 일괄. 생성기는 결과에 무작위 변주 접미 추가로 다양성↑. 도구별 옵션 배열 확장. 구현 후 조합수 검증 + 베타.
- **창작 스튜디오 무작위 생성기 카테고리 정리**: 합성기 102그룹/생성기들을 카테고리로 묶어 탐색성↑(이미 group 기반 나브 있음 — 무작위류만 별도 섹션/필터 검토).
- **도구 허브 다양성↑**: StoryDice/PlotTwistDeck/SymbolismDict 등 옵션 배열 확장.

## 완료 (추가분, 검증됨)

- ✅ **만능 단어·표현 사전**(writing-dictionary): 카테고리 펼침 탐색+검색+무작위+복사+스니펫. 데이터 src/tools/data/worddict.ts(확장 가능).
- ✅ **캐릭터 생성기**(character-forge): 얼굴(DiceBear)+키/몸무게/혈액형/MBTI 등 수십 특성 무작위(슬롯 잠금), 인물 시트/라이브러리/**프로젝트 인물 카드** 연동.
- ✅ **합성기 ×144 확장**(전 1,534개, 최소 조합 1천만→14.4억): procgen.ts expandComposer + procgen-registry.
- ✅ **프로젝트 브리지**: 도구 산출물 → 실제 바인더·DB·캔버스 실시간. store.addProjectEntry + linkbus.addToProject. **59개 도구**에 "📄 프로젝트에 추가". (검증 _cdp_project.cjs)
- ✅ **전역 UI 스케일(반응형)**: zoom 0.8~1.6, 툴바/Ctrl±/팔레트. ToolWindow zoom 보정. (검증 _cdp_responsive.cjs 13통과)
- ✅ **UX 교차 검토 126건 → 인프라/도구 수정** 적용·검증(렌더 104/104·상호작용·데이터안전 15·연계 9).
- ✅ **만능 단어·표현 사전 데이터 확장**: 워크플로 2회(28분야) → scripts/_mergedict.cjs 로 worddict.ts 병합 = **28개 분야 · 6,687개 표현**(성격은 특성→언행식). 도구 표시·동작 CDP 확인. 더 확장하려면 같은 워크플로 추가→_mergedict 로 병합.

## 진행 중 — 대규모 자율 도구 확장 + 장르 도구함 (최신)

- 도구 수: 신규 배치 A~F(83개) + 사전데이터 + 캐릭터생성기 등으로 **189 → 미스터리12 → SF12 …** 진행. 현재 ~201+.
- **장르별 도구함**: `src/components/GenreToolbox.tsx` (메뉴 '🎭 장르별 도구함' + 명령). 도구 meta 에 `genre` 필드(registry 생성기에 타입 추가됨). 장르 선택 → (전용 도구 meta.genre===장르) + (공통 도구 전체)를 함께 표시, 열 때 payload.genre 전달로 특화. 장르 목록은 GenreToolbox 의 GENRE_INFO + 도구 genre 합집합.
- 장르 전용 도구 저작: 장르당 12개+ (지식사전·대형 조합 생성기[≥100만~1억]·캐릭터·배경·세계관·플롯·시놉시스). 워크플로 1개=1장르. 완료: 미스터리·추리(12). 진행: SF. 예정: 무협·판타지·로맨스·호러·역사·스릴러·로판·게임판타지·현대판타지/회귀 등.
- 사용자 지시: "내가 안 시켜도 알아서 굉장한 대규모·독창적 도구 500개 자율 생성"(연계+프로젝트연동 필수, 베타 수십 회 반복, UI/UX·글자크기 반응 베타 포함). → 배치마다 _gentools→tsc→build→_cdp_tools(렌더)+_cdp_interact(상호작용), 주기적으로 _cdp_responsive/_cdp_linkage/_cdp_datasafety.
- **AI 어시스턴트 비활성화**: 메뉴/명령 보이되 클릭 불가(App: command disabled:true + mi disabled, CommandPalette 에 disabled 지원 추가, 모달 렌더 `false &&` 가드). 재활성화 시 가드 제거. AiModal/ai.ts 코드는 보존.

## ✅ 마일스톤(2026-06-15): 도구 371개 · 12장르 전 14종 완성

- 도구 **371개** 전수 검증: 렌더 371/371·상호작용 클린·반응형 13/13·수집함 9/9·연계 9/9·데이터안전 15/15·단위 174·tsc 0·빌드 클린.
- **장르별 도구함 12장르 × 14종(168개)** 완성: 미스터리·SF·판타지·무협·로맨스·로판·호러·역사·스릴러·게임판타지·현판·액션. 각 장르 지식/어휘/장치/생성기(1억~1조)/캐릭/배경/세계관/플롯/시놉/개요.
- 장르 워크플로 충돌 교훈: `_genre_suite.js` 의 PREFIX/IDP 가 장르마다 유일해야 함. 에이전트가 접두를 틀리면 기존 파일 덮어씀(로맨스 CharForge 사고→RomanceCharGen 으로 복원) 또는 누락(History SettingForge 소켓오류→직접 작성). 매 배치 후 파일수·genre수 점검 필수.

## 진행 2 (최신) — 장르 도구함·수집함·UI3·저작권

- 도구 **269+개**. 장르 전용(genre 메타+장르 도구함 GenreToolbox): 미스터리·SF·판타지·무협·로맨스 완료(각 12~14), 호러 진행, 역사·스릴러·로판·게임판타지·현판·액션 예정. 재사용 워크플로 `scripts/_genre_suite.js`(상수 GENRE/PREFIX/IDP/SIGNATURE 만 바꿔 scriptPath 호출; args 전달은 불안정해 하드코딩).
- 자율 대형 도구 novel-A(14, 사운드믹서·핀보드·집필RPG·집중정원·레퍼런스보드·종합대시보드·스와이프·음성메모 등) 완료. 추가 배치 예정(목표 100+).
- **수집함(StashBox)** 완성: 전 유형(문서링크/URL/로컬 이미지·오디오·비디오 blob/메모) 드롭·추가·제거(원본 무관), 클릭 상세(앱 창/뷰어), 전역 영속. linkbus addToStash.
- **UI 3.0**: 인디고 토큰 전면 교체. **에러 바운더리**(흰화면 방지). **AI 비활성**. **스냅샷 도움말/실행/취소**. **CreativeStudio 트리 메뉴**. **인스펙터 연계 탭**. **파일→도구 드롭 + 타임라인 순서변경**. **장르 플롯 구조 68종(모달 트리)**.
- **저작권/초상권 감사+수정**: CharacterModel→전세계 자유라이선스 실사진(위키미디어, 비자유 필터·작가표기·아바타 폴백). 위험 6건 수정(갤러리 인물=PD 명화/조각, 표지 인물경고, 핀보드 URL경고, FoodScene CC필터+출처, 도서표지 미리보기전용+경고, 포켓몬 IP 스프라이트 제거+익명화). 모든 미디어 PD/CC0/CC(표기)·키없음.
- **치명 버그 수정**: zustand 셀렉터가 새 함수/객체 반환 시 React #185 무한루프 → items 맵 선택으로. (StashBox)

## 추가 요청 2 (대기)

- **캐릭터 생성기 ↔ 인물 시트 완전 통합**: 새 도구 character-forge — 얼굴(DiceBear: 인물/만화/판타지 스타일, 저작권 안전) + 키/몸무게/혈액형/MBTI/나이/성격/외모/말투/직업/약점/비밀/욕망/두려움 등 수많은 특성을 무작위(슬롯 잠금/재생성). "인물 시트로 보내기"로 CharacterSheet 에 풀 매핑 → 하나의 완성 캐릭터. CharacterSheet 가 rich payload.character 전체 필드 수신하도록 확장 필요. 라이브러리 저장.
- **글쓰기 단어·표현 사전 대폭 확장**: 감정/성격/상황/묘사/행동/대화/범죄/풍경 등 카테고리별 단어·표현(예시일 뿐, 더 다양하게). 기존 WordBanks(94) 보완 + 도구 허브에 큰 단어사전 도구. 클릭 복사 + 스니펫 연계.

## 이번 세션 연대기 (요약)

1. 도구 허브 배치1~7로 **100종** 저작(영감·발상 20·집중·생산성 18·구상·정리 16·교정·언어 13·유틸·참고 9·리서치·자료 8·분위기·시각 7·언어·어휘 5·게임·캐릭터 4). 각 배치 후 레지스트리 재생성·tsc·CDP 베타.
2. PWA 빌드 실패(9.7MB 단일 번들 > workbox 한도) → **lazy 코드스플리팅**(도구·CreativeStudio 분리) + workbox 한도 14MB + react manualChunks 로 해결.
3. CDP 전수 베타: 100종 렌더 예외 0, 상호작용 에러 0. API/Web Speech 실데이터 확인.
4. **데이터 안전성** 감사(Explore 에이전트) → 10대 위험 도출 → 보강(idbSave 검증·backup 무결성·repairStructure·beforeunload/visibilitychange·백업 자동복구·저장실패 가시화·할당량 경고). 단위 19 + E2E 15 통과.
5. **창 최소화/독** + **linkbus 연계 인프라**. registry Component 타입 `ComponentType<{payload?}>`.
6. **저작권 + 연계 리트로핏** 12종(워크플로). tsc 0, CDP 렌더/상호작용 12/12 클린.
7. (현재) **문서화**: CLAUDE.md + docs/*.

## 핵심 사용자 지시(고정)

- 묻지 말고 자동으로 끝까지. 구현마다 베타테스트(여러 명 교차). 데이터 안전 최우선.
- 도구는 "거의 앱 1개" 규모로 크게. 저작권 문제 없는(무료/PD/CC0) 자원만.
- 도구끼리 연계(관련 도구 + 무작위 생성기). 창 최소화 버튼 필수.
