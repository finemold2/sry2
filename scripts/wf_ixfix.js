export const meta = { name: 'fix-interaction-bugs', description: '코어 인터랙션 베타 확정 결함 파일별 수정', phases: [{ title: 'Fix' }] }

const BYFILE = {
  'src/persistence/pack.ts': [
    '[HIGH] normalizeProject 가 settings 를 재구성하면서 알 수 없는 필드(editorWidth/editorParaGap/editorLineHeight 등 에디터 타이포그래피)를 통째로 버려 새로고침/재오픈 시 사라진다. 수정: project.settings 재구성을 기존 s 를 먼저 전개(...s)한 뒤 기존 명시 기본값들을 채우는 형태로 바꿔 알 수 없는 사용자 설정을 보존하라.',
  ],
  'src/store/store.ts': [
    '[HIGH] restoreFromTrash(약 959행): 휴지통에 없는 정상 문서에도 작동해 폴더 밖(root-draft)으로 끌어냄. 액션 시작부에 isInTrash(s.project, id) 가 거짓이면 early return 가드 추가(헬퍼 isInTrash 존재).',
    '[MED] newProject(약 377행) set 객체에 loadProject 와 동일하게 splitId=null, activeCollectionId=null, search=빈문자열, inspectorTab=notes 를 추가(이전 프로젝트의 죽은 뷰/네비 상태 제거).',
    '[MED] newProject 의 prev 설정 계승 블록에 editorWidth/editorParaGap/editorLineHeight/autosaveInterval/autoCompleteList 도 포함(편집 환경 선호 계승).',
    '[LOW] toggleExpanded(약 757행): 펼침 상태 변경이 dirty 를 안 세워 새로고침 시 유실. 반환을 project + dirty:true 로 통일.',
    '[LOW] applyRemoteProject: 동기화 후 activeCollectionId 가 새 collections 에 없으면 null 로 보정(activeId 보정과 동일 패턴).',
  ],
  'src/components/TimelineView.tsx': [
    '[HIGH] handleDrop(약 138-158행): POV/플롯라인 레인에서 드롭 시 dst.parentId 로 moveItem 해 장면이 다른 章 폴더로 조용히 이동(원고 구조 변경). Outliner.tsx:290 패턴처럼, 드래그 항목의 parentId 와 드롭 대상의 parentId 가 다르면 early return 하여 같은 부모 안에서 순서변경만 허용하라.',
  ],
  'src/components/NewProjectModal.tsx': [
    '[HIGH] 템플릿 기반 새 프로젝트가 다크/세피아 테마를 라이트로 리셋. create()에서 build()로 만든 프로젝트 p 를 loadProject 하기 직전에, p.settings.theme 을 localStorage 의 sry:theme 값(없으면 현재 useStore.getState().project.settings.theme)으로 계승시켜라. 가능하면 editorWidth/editorParaGap/editorLineHeight 도 현재 프로젝트에서 계승.',
  ],
  'src/components/Editor.tsx': [
    '[HIGH] 분할 편집기에서 보조 패널이 activeId 와 같은 문서를 띄우면 두 contenteditable 이 같은 문서에 동시 저장되어 충돌/본문 손상. 보조 패널의 문서 선택에서 activeId 와 동일한 문서 선택을 막고(같은 id 면 무시), splitId 가 activeId 와 같으면 보조 패널을 읽기전용/안내로 표시하라.',
    '[LOW] 보조 패널 문서 선택 목록을 텍스트/폴더 + 비휴지통(isInTrash 제외)만 보이도록 필터링하고 바인더 순서대로 정렬.',
  ],
  'src/components/Board.tsx': [
    '[LOW] 칸반 카드 클릭이 range 선택 미지원: BoardCard 가 같은 컬럼 카드 id 배열을 order 로 받아 select(item.id, additive=ctrl/meta, range=shift, order) 형태로 호출.',
    '[LOW] 칸반 카드 드래그가 컬럼 내 순서(바인더 순서) 변경 불가: BoardCard 에 onDragOver/onDrop 추가해 같은 컬럼 내 드롭 시 moveItem 으로 형제 재정렬(컬럼 간 이동은 기존 setStatus 유지).',
  ],
  'src/components/DatabaseView.tsx': [
    '[LOW] 회차/발행 상태 컬럼 인라인 편집 추가: 회차는 number input 으로 setEpisodeMeta(id, number 변경), 발행 상태는 select 로 setEpisodeMeta(id, state 변경) (스토어 setEpisodeMeta 존재).',
  ],
  'src/components/StoryCanvas.tsx': [
    '[MED] 다른 탭의 캔버스(노드/엣지) 편집이 현재 탭에 반영 안 됨: 외부 project.canvas 참조가 바뀌고 로컬 편집중(dirty)이 아닐 때만 setCanvasState 로 흡수하도록 분기. 편집 중에는 흡수 금지(무한루프/입력 충돌 방지).',
  ],
  'src/components/Corkboard.tsx': [
    '[LOW] 빈 폴더(카드 0개)로 드롭 이동 불가: 코르크보드 컨테이너와 빈 상태 영역에 onDragOver(preventDefault)+onDrop 추가해 moveItem(dragId, containerId, childrenOf(containerId).length) 로 현재 컨테이너 끝에 편입.',
    '[LOW] 프로젝트 전환 시 자유배치 좌표 메모리 미초기화: project.id 변경 시 positions 를 비우는 useEffect 추가. (선택) 삭제 항목의 cork.pos 고아 키 정리.',
  ],
  'src/components/StudioShell.tsx': [
    '[LOW] Studio 테마 버튼이 세피아 상태에서 태양 아이콘 표시: 테마 아이콘을 dark=moon / sepia=book / 그외=sun 3분기로(클래식과 일관).',
  ],
  'src/components/Inspector.tsx': [
    '[LOW] 스냅샷 비교/되돌리기가 에디터 flush 없이 동작(디바운스 미저장 본문 기준): 되돌리기(doRollback)와 비교 진입(setCompareId) 직전에 window.dispatchEvent(new Event(scriv:flush-editor)) 를 추가(지금 찍기와 동일하게 현재 본문 먼저 커밋).',
  ],
}

const entries = Object.entries(BYFILE)
phase('Fix')
const results = await parallel(entries.map(([file, finds]) => () => {
  const list = finds.map((f, i) => `  ${i + 1}. ${f}`).join('\n')
  const prompt = `너는 한국어 글쓰기 앱(React+TS, zustand)의 유지보수자다. 아래 파일을 Read 한 뒤 Edit 으로 '명시된 결함만' 정확히 수정하라. 데이터(원고) 안전이 최우선이다.
파일: ${file}

[수정할 확정 결함]
${list}

[원칙]
- 명시된 결함만 고친다. 다른 동작/UI 변경 금지(회귀 금지). 기존 import 패턴 유지.
- React 순수성: 상태 업데이터(setX(prev=>...)) 내부에서 다른 setState 호출 금지. 무한 렌더 주의.
- 반드시 컴파일 가능한 유효 TSX/TS 유지. 확신 없으면 보수적으로(동작 보존). 데이터 손실 경로는 반드시 막아라.

수정 후 무엇을 어떻게 고쳤는지 보고하라.`
  return agent(prompt, { label: file.split('/').pop(), phase: 'Fix', schema: { type: 'object', properties: { ok: { type: 'boolean' }, fixed: { type: 'number' }, notes: { type: 'string' } }, required: ['ok'] } })
    .then((r) => ({ file, ...(r || {}) })).catch((e) => ({ file, ok: false, notes: String(e && e.message || e) }))
}))
log(`인터랙션 수정: ${results.filter((r) => r.ok).length}/${entries.length} 파일`)
return { results }
