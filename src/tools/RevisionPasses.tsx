// 단계별 퇴고 패스 — 거시(구조·플롯) → 중간(장면·인물) → 미시(문장·맞춤법) 순서로 '한 번에 한 층씩' 원고를 다듬는 가이드형 워크플로.
//  · 패스마다 점검 항목 체크리스트 + 진행률, 현재 패스의 집중 가이드(왜·어떻게·흔한 함정)와 메모.
//  · 패스 '완료' 체크로 다음 층으로 진행(거시→중간→미시 흐름을 강제하지 않되 추천 순서를 안내).
//  · 기본 항목 수정·삭제, 내 항목 추가·순서이동(CRUD). 패스/원고를 여러 개 두고 전환.
//  · 자급식: react 와 './linkbus' 외 import 없음. 전부 로컬(외부 미디어/키 불필요).
//  · 모든 상태는 localStorage 'sry:tool:revision-passes' 에 자동 저장/복원(미지원·차단·손상 시 graceful).
//  · 연계: 좌측 바인더 파일을 드롭하면 그 문서를 대상 원고로 잡고, '📄 프로젝트에 추가'로 퇴고 리포트를 문서화.
import { useEffect, useRef, useState } from 'react'
import { addToProject, hasProjectBridge, getDragItem, isItemDrag, openToolLinked, Emoji } from './linkbus'

export const meta = { id: 'revision-passes', name: '단계별 퇴고 패스', icon: '🪜', group: '교정·언어', intro: '거시(구조)→중간(장면·인물)→미시(문장·맞춤법) 순서로 한 층씩 원고를 다듬는 가이드형 퇴고', w: 720, h: 680 }

const LS_KEY = 'sry:tool:revision-passes'

// ── 데이터 모델 ──────────────────────────────────────────────
type LayerId = 'macro' | 'meso' | 'micro'

interface PassDef {
  id: string            // 안정적 패스 식별자(기본 항목 id 파생에 사용)
  layer: LayerId
  name: string
  icon: string
  tagline: string       // 한 줄 요약
  why: string           // 이 패스를 왜 지금 하는가
  how: string[]         // 진행 방법(절차)
  pitfalls: string[]    // 흔한 함정 / 주의
  items: string[]       // 기본 점검 항목
}

interface Layer { id: LayerId; name: string; icon: string; color: string; blurb: string }

const LAYERS: Layer[] = [
  { id: 'macro', name: '거시 패스', icon: '🗺️', color: 'var(--accent)', blurb: '큰 그림부터. 구조·플롯·전체 흐름을 먼저 손봅니다. 여기서 장면을 통째로 옮기거나 들어낼 수 있으니 문장은 아직 다듬지 마세요.' },
  { id: 'meso', name: '중간 패스', icon: '🎬', color: '#7c83ff', blurb: '장면 단위로 내려옵니다. 각 장면의 목적·갈등·인물 일관성·시점·페이스를 점검합니다.' },
  { id: 'micro', name: '미시 패스', icon: '🔬', color: 'var(--ok)', blurb: '맨 마지막. 문장 리듬·표현·맞춤법·표기 일관성을 다듬습니다. 구조가 흔들리는데 여기부터 손대면 헛수고가 됩니다.' },
]

// 패스 정의(거시 2 + 중간 2 + 미시 2). id 는 절대 바꾸지 말 것(저장된 체크 상태가 파생됨).
const PASSES: PassDef[] = [
  {
    id: 'structure', layer: 'macro', name: '구조·뼈대', icon: '🏗️',
    tagline: '전체 골격과 균형, 막 전환을 점검',
    why: '문장을 다듬기 전에 이야기의 뼈대가 튼튼한지부터 확인합니다. 이 층에서는 장면을 옮기거나 통째로 삭제하는 큰 수술이 일어나므로, 미리 문장을 매만지면 그 노력이 버려집니다.',
    how: [
      '원고를 빠르게 통독하며 장/막 단위로만 본다(문장은 읽지 말 것).',
      '각 장면을 한 줄로 요약해 카드/목록으로 펼쳐 본다.',
      '도입–전개–위기–결말의 비중과 전환점 위치를 표시한다.',
      '늘어지거나 빠져도 되는 장면을 골라낸다.',
    ],
    pitfalls: [
      '문장이 예뻐 보여서 차마 못 자르는 장면 — 기능이 없으면 과감히 들어낸다.',
      '오탈자·표현이 거슬려 미시 작업으로 새는 것 — 지금은 메모만 남기고 넘어간다.',
    ],
    items: [
      '도입부 첫 장이 독자를 끌어들이는 후크가 있는가',
      '이야기의 중심 질문(드라마틱 퀘스천)이 분명한가',
      '선택한 구조(3막 등)의 전환점이 제 위치에 있는가',
      '중간부가 늘어지지 않고 긴장이 유지되는가',
      '결말이 도입에서 던진 질문에 응답하는가',
      '각 장이 끝날 때 다음 장을 읽게 만드는 동력이 있는가',
      '분량 배분이 한쪽으로 치우치지 않는가',
      '서브플롯이 본 줄거리와 엮이고 회수되는가',
      '들어내도 무너지지 않는 장면·챕터를 식별했는가',
      '시간 순서·플래시백이 혼란 없이 이해되는가',
    ],
  },
  {
    id: 'plot', layer: 'macro', name: '플롯·인과', icon: '🎢',
    tagline: '사건의 인과·갈등 상승·복선 회수',
    why: '구조라는 그릇이 잡혔다면, 그 안에 담긴 사건들이 인과로 단단히 묶이는지 봅니다. 우연·갑툭튀 해결·미회수 복선은 큰 그림 단계에서 잡아야 고치기 쉽습니다.',
    how: [
      '사건을 "그래서 / 그러나"로 이어 읽어 본다(나열식이면 위험).',
      '복선과 회수 지점을 짝지어 표시한다.',
      '클라이맥스가 주인공의 선택으로 도달하는지 확인한다.',
    ],
    pitfalls: [
      '"그리고 나서"로만 이어지는 평면적 나열 — 인과의 끈을 다시 묶는다.',
      '작가만 아는 복선 — 독자에게 단서가 공정하게 제시됐는지 확인한다.',
    ],
    items: [
      '주요 사건이 인과로 연결되는가(우연 남발 금지)',
      '주인공의 목표와 그것을 막는 장애물이 분명한가',
      '갈등이 장면마다 존재하고 점점 고조되는가',
      '클라이맥스가 충분히 뜨겁고 필연적인가',
      '복선이 심어지고 적절히 회수되는가',
      '데우스 엑스 마키나(갑툭튀 해결)가 없는가',
      '반전이 있다면 단서가 미리 깔려 공정한가',
      '느슨한 실(미회수 떡밥)이 남아 있지 않은가',
      '주인공의 선택이 결말을 이끄는가(수동적이지 않은가)',
      '판돈(스테이크)이 독자에게 분명히 와닿는가',
    ],
  },
  {
    id: 'scene', layer: 'meso', name: '장면·페이스', icon: '🎬',
    tagline: '장면마다 목적·갈등·전환·완급',
    why: '구조와 플롯이 안정됐으니 이제 장면 단위로 내려옵니다. 각 장면이 제 몫을 하는지, 무언가가 바뀌며 끝나는지를 봅니다.',
    how: [
      '장면을 하나씩 열고 "이 장면이 끝나면 무엇이 달라지는가?"를 답해 본다.',
      '목적이 없는 장면은 합치거나 자른다.',
      '장면의 시작·끝을 다른 장면과 비교해 진입/퇴장 각을 다듬는다.',
    ],
    pitfalls: [
      '분위기만 있고 변화가 없는 장면 — 갈등이나 정보 변화를 넣는다.',
      '인포덤프가 한 장면에 몰리는 것 — 흩뿌려 흘린다.',
    ],
    items: [
      '각 장면의 목적(무엇이 바뀌는가)이 분명한가',
      '장면이 갈등 또는 변화로 끝나는가',
      '말하기(telling) 대신 보여주기(showing)가 적절히 쓰였는가',
      '장면 전환이 매끄럽고 독자가 길을 잃지 않는가',
      '배경 설명(인포덤프)이 한 곳에 몰리지 않는가',
      '페이스가 장면 성격에 맞는가(액션은 빠르게, 정서는 느리게)',
      '오감 묘사로 공간·분위기가 그려지는가',
      '장면의 시점 인물이 일관되는가',
    ],
  },
  {
    id: 'character', layer: 'meso', name: '인물·시점', icon: '🧑‍🎤',
    tagline: '동기·변화·말투 일관성·시점 규칙',
    why: '장면을 점검하며 자연스럽게 인물로 시선이 갑니다. 인물의 동기·아크·말투가 처음부터 끝까지 어긋나지 않는지, 시점 규칙을 지키는지 확인합니다.',
    how: [
      '주요 인물별로 처음·중간·끝의 상태를 적어 변화를 확인한다.',
      '대사만 따로 읽어 인물별 말투가 구분되는지 본다.',
      '시점 인물이 모를 정보를 서술하지 않았는지 검사한다.',
    ],
    pitfalls: [
      '작가의 목소리로 모든 인물이 똑같이 말하는 것 — 말투를 차별화한다.',
      '머리색·나이·설정이 앞뒤로 바뀌는 연속성 오류 — 설정집과 대조한다.',
    ],
    items: [
      '주인공의 욕망과 결핍이 분명한가',
      '인물의 행동에 납득 가능한 동기가 있는가',
      '주인공이 이야기를 거치며 변화(아크)하는가',
      '인물의 말투·성격이 처음부터 끝까지 일관되는가',
      '조연도 자기 욕구가 있는 입체적 인물인가',
      '시점(POV)이 일관되거나 의도대로 전환되는가',
      '시점 인물이 모를 정보를 서술하지 않는가',
      '인물 이름이 헷갈리지 않게 충분히 구별되는가',
      '인물의 외형·나이·설정이 앞뒤로 모순되지 않는가',
    ],
  },
  {
    id: 'sentence', layer: 'micro', name: '문장·리듬', icon: '✍️',
    tagline: '간결·리듬·표현·번역투 제거',
    why: '구조·장면·인물이 자리 잡은 뒤에야 문장을 다듬습니다. 지금 손본 문장은 더 이상 통째로 옮기거나 버려질 일이 적으니 공들일 가치가 있습니다.',
    how: [
      '소리 내어(또는 TTS로) 읽으며 걸리는 곳을 표시한다.',
      '긴 문장을 나누고, 같은 어미·단어의 근접 반복을 흩는다.',
      '불필요한 부사·군더더기 말을 덜어낸다.',
    ],
    pitfalls: [
      '한 번에 의미·리듬·맞춤법을 동시에 보려다 놓치는 것 — 미시 안에서도 한 번에 한 가지만.',
      '멋부린 비유 과잉 — 가장 약한 한두 개를 덜어낸다.',
    ],
    items: [
      '한 문장이 지나치게 길거나 꼬여 있지 않은가',
      '문장 길이에 리듬·변화가 있는가',
      '불필요한 부사·형용사를 덜어냈는가',
      '같은 단어·어미가 가까이서 반복되지 않는가',
      '피동·이중피동을 능동으로 바꿀 수 있는가',
      '번역투(~에 의해, ~을 갖다 등)를 다듬었는가',
      '상투적 표현·클리셰를 신선하게 바꿨는가',
      '군더더기 말(사실, 정말, 그냥 등)을 줄였는가',
      '능동적이고 구체적인 동사를 썼는가',
      '소리 내어 읽었을 때 걸리는 부분이 없는가',
    ],
  },
  {
    id: 'proofread', layer: 'micro', name: '맞춤법·표기', icon: '🔤',
    tagline: '오탈자·띄어쓰기·표기 일관성',
    why: '마지막 층. 의미가 더 바뀌지 않을 때 오탈자와 표기를 잡습니다. 너무 일찍 하면 이후 수정으로 다시 깨집니다.',
    how: [
      '처음부터 끝까지 천천히 정독한다(이번엔 내용이 아니라 표기만).',
      '고유명사·외래어 표기를 목록으로 만들어 통일성을 대조한다.',
      '맞춤법 검사 도구를 보조로 쓰되 맹신하지 않는다.',
    ],
    pitfalls: [
      '읽다 보면 내용 수정 욕구가 생기는 것 — 별도 메모만, 표기 패스는 유지한다.',
      '검사기가 못 잡는 동음이의·문맥 오류 — 사람 눈으로 한 번 더.',
    ],
    items: [
      '오탈자가 없는가(처음부터 끝까지 정독)',
      '띄어쓰기가 규칙에 맞는가',
      '맞춤법(되/돼, 안/않, 든/던 등)이 정확한가',
      '문장부호(마침표·쉼표·따옴표)가 일관되게 쓰였는가',
      '대화 따옴표 형식이 통일되어 있는가',
      '고유명사·인명·지명 표기가 처음부터 끝까지 같은가',
      '숫자·단위 표기 방식이 일관되는가',
      '외래어 표기가 표기법에 맞고 통일되어 있는가',
      '말줄임표(……)·줄표(—) 사용이 통일되어 있는가',
      '높임말·반말이 인물·상황에 맞게 일관되는가',
    ],
  },
]

const LAYER_OF: Record<string, Layer> = Object.fromEntries(LAYERS.map((l) => [l.id, l]))

// ── 상태 모델 ──────────────────────────────────────────────
interface UserItem { id: string; text: string }
interface Project {
  id: string
  title: string                                  // 대상 원고 이름
  checked: Record<string, boolean>               // 항목 id -> 체크
  removedDefaults: string[]                       // 삭제한 기본 항목 id
  userItems: Record<string, UserItem[]>           // passId -> 사용자 항목
  passDone: Record<string, boolean>               // passId -> 패스 완료
  notes: Record<string, string>                   // passId -> 메모
  created: number
}
interface Persisted {
  projects: Project[]
  activeId: string
  currentPass: string                            // 현재 펼친 패스 id
}

// ── 유틸 ───────────────────────────────────────────────────
function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch {}
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}
const defaultItemId = (passId: string, idx: number) => `d:${passId}:${idx}`

function emptyProject(title = '내 원고'): Project {
  return { id: newId(), title, checked: {}, removedDefaults: [], userItems: {}, passDone: {}, notes: {}, created: Date.now() }
}
function emptyState(): Persisted {
  const p = emptyProject()
  return { projects: [p], activeId: p.id, currentPass: PASSES[0].id }
}

function sanitizeProject(raw: any): Project {
  const base = emptyProject()
  if (!raw || typeof raw !== 'object') return base
  const checked: Record<string, boolean> = {}
  if (raw.checked && typeof raw.checked === 'object') for (const k of Object.keys(raw.checked)) checked[k] = !!raw.checked[k]
  const passDone: Record<string, boolean> = {}
  if (raw.passDone && typeof raw.passDone === 'object') for (const k of Object.keys(raw.passDone)) passDone[k] = !!raw.passDone[k]
  const notes: Record<string, string> = {}
  if (raw.notes && typeof raw.notes === 'object') for (const k of Object.keys(raw.notes)) if (typeof raw.notes[k] === 'string') notes[k] = raw.notes[k]
  const userItems: Record<string, UserItem[]> = {}
  if (raw.userItems && typeof raw.userItems === 'object') {
    for (const k of Object.keys(raw.userItems)) {
      const arr = raw.userItems[k]
      if (Array.isArray(arr)) userItems[k] = arr.filter((x: any) => x && typeof x.text === 'string').map((x: any) => ({ id: String(x.id || newId()), text: String(x.text) }))
    }
  }
  return {
    id: String(raw.id || newId()),
    title: typeof raw.title === 'string' && raw.title.trim() ? raw.title : '내 원고',
    checked, removedDefaults: Array.isArray(raw.removedDefaults) ? raw.removedDefaults.filter((x: any) => typeof x === 'string') : [],
    userItems, passDone, notes,
    created: typeof raw.created === 'number' ? raw.created : Date.now(),
  }
}

// localStorage 복원 — 미지원/차단/손상 시 빈 상태. 누락 필드 보강.
function loadState(): Persisted {
  try {
    const rawStr = localStorage.getItem(LS_KEY)
    if (!rawStr) return emptyState()
    const p = JSON.parse(rawStr)
    if (!p || typeof p !== 'object') return emptyState()
    const projects: Project[] = Array.isArray(p.projects) && p.projects.length ? p.projects.map(sanitizeProject) : [emptyProject()]
    const activeId = projects.some((x) => x.id === p.activeId) ? p.activeId : projects[0].id
    const currentPass = PASSES.some((x) => x.id === p.currentPass) ? p.currentPass : PASSES[0].id
    return { projects, activeId, currentPass }
  } catch { return emptyState() }
}

// 패스별 전체 항목(기본 - 삭제 + 사용자)
interface MergedItem { id: string; text: string; user: boolean }
function passItems(pass: PassDef, proj: Project): MergedItem[] {
  const out: MergedItem[] = []
  pass.items.forEach((text, idx) => {
    const id = defaultItemId(pass.id, idx)
    if (proj.removedDefaults.includes(id)) return
    out.push({ id, text, user: false })
  })
  const ui = proj.userItems[pass.id] || []
  ui.forEach((u) => out.push({ id: u.id, text: u.text, user: true }))
  return out
}

const escHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// ── 컴포넌트 ───────────────────────────────────────────────
export default function RevisionPasses({ payload }: { payload?: Record<string, unknown> }) {
  const [state, setState] = useState<Persisted>(() => loadState())
  const [drafts, setDrafts] = useState<Record<string, string>>({})       // passId -> 입력 중
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null)
  const [renaming, setRenaming] = useState(false)
  const [renameText, setRenameText] = useState('')
  const [note, setNote] = useState('')
  const [flashMsg, setFlashMsg] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const mounted = useRef(true)
  const flashTimer = useRef<number | null>(null)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (flashTimer.current) { clearTimeout(flashTimer.current); flashTimer.current = null }
    }
  }, [])

  // payload 로 대상 원고 제목/시작 패스 받기(연계 열기)
  useEffect(() => {
    if (!payload) return
    const t = typeof payload.title === 'string' ? payload.title.trim() : ''
    const startPass = typeof payload.pass === 'string' && PASSES.some((p) => p.id === payload.pass) ? (payload.pass as string) : ''
    if (!t && !startPass) return
    setState((s) => {
      let next = s
      if (t) {
        const existing = s.projects.find((p) => p.title === t)
        if (existing) next = { ...next, activeId: existing.id }
        else { const np = emptyProject(t); next = { ...next, projects: [np, ...s.projects], activeId: np.id } }
      }
      if (startPass) next = { ...next, currentPass: startPass }
      return next
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload])

  // 자동 저장 — 차단/용량초과 시 안내만.
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(state)) }
    catch { if (mounted.current) setNote('이 브라우저에서 저장이 막혀 있어 새로고침하면 진행 상황이 사라질 수 있어요.') }
  }, [state])

  const flash = (msg: string) => {
    setFlashMsg(msg)
    if (flashTimer.current) clearTimeout(flashTimer.current)
    flashTimer.current = window.setTimeout(() => { if (mounted.current) setFlashMsg('') }, 1900)
  }

  const proj = state.projects.find((p) => p.id === state.activeId) || state.projects[0]
  const pass = PASSES.find((p) => p.id === state.currentPass) || PASSES[0]

  // 현재 프로젝트를 patch 함수로 갱신
  const patchProj = (fn: (p: Project) => Project) => {
    setState((s) => ({ ...s, projects: s.projects.map((p) => (p.id === s.activeId ? fn(p) : p)) }))
  }

  // ── 항목 조작 ──
  const toggle = (itemId: string) => patchProj((p) => ({ ...p, checked: { ...p.checked, [itemId]: !p.checked[itemId] } }))
  const addUserItem = (passId: string) => {
    const text = (drafts[passId] || '').trim()
    if (!text) return
    const item: UserItem = { id: newId(), text }
    patchProj((p) => ({ ...p, userItems: { ...p.userItems, [passId]: [...(p.userItems[passId] || []), item] } }))
    setDrafts((d) => ({ ...d, [passId]: '' }))
  }
  const removeItem = (passId: string, itemId: string, isUser: boolean) => {
    patchProj((p) => {
      const checked = { ...p.checked }; delete checked[itemId]
      if (isUser) {
        const arr = (p.userItems[passId] || []).filter((u) => u.id !== itemId)
        return { ...p, checked, userItems: { ...p.userItems, [passId]: arr } }
      }
      return { ...p, checked, removedDefaults: [...p.removedDefaults, itemId] }
    })
  }
  const moveUserItem = (passId: string, itemId: string, dir: -1 | 1) => {
    patchProj((p) => {
      const arr = (p.userItems[passId] || []).slice()
      const i = arr.findIndex((u) => u.id === itemId); if (i < 0) return p
      const j = i + dir; if (j < 0 || j >= arr.length) return p
      const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp
      return { ...p, userItems: { ...p.userItems, [passId]: arr } }
    })
  }
  const saveEdit = () => {
    if (!editing) return
    const text = editing.text.trim(); const target = editing; setEditing(null)
    if (!text) return
    patchProj((p) => {
      for (const passId of Object.keys(p.userItems)) {
        const arr = p.userItems[passId] || []
        if (arr.some((u) => u.id === target.id)) {
          return { ...p, userItems: { ...p.userItems, [passId]: arr.map((u) => (u.id === target.id ? { ...u, text } : u)) } }
        }
      }
      const m = /^d:([^:]+):/.exec(target.id)
      if (m) {
        const passId = m[1]; const repl: UserItem = { id: newId(), text }
        const wasChecked = !!p.checked[target.id]; const checked = { ...p.checked }; delete checked[target.id]
        if (wasChecked) checked[repl.id] = true
        return {
          ...p, checked,
          removedDefaults: p.removedDefaults.includes(target.id) ? p.removedDefaults : [...p.removedDefaults, target.id],
          userItems: { ...p.userItems, [passId]: [...(p.userItems[passId] || []), repl] },
        }
      }
      return p
    })
  }

  // ── 패스 완료 / 메모 / 선택 ──
  const togglePassDone = (passId: string) => patchProj((p) => ({ ...p, passDone: { ...p.passDone, [passId]: !p.passDone[passId] } }))
  const setPassNote = (passId: string, v: string) => patchProj((p) => ({ ...p, notes: { ...p.notes, [passId]: v } }))
  const selectPass = (passId: string) => setState((s) => ({ ...s, currentPass: passId }))
  const resetPass = (passId: string) => patchProj((p) => {
    const checked = { ...p.checked }
    const def = PASSES.find((x) => x.id === passId)
    if (def) def.items.forEach((_, idx) => { delete checked[defaultItemId(passId, idx)] })
    ;(p.userItems[passId] || []).forEach((u) => { delete checked[u.id] })
    return { ...p, checked, passDone: { ...p.passDone, [passId]: false } }
  })

  // ── 프로젝트(원고) 관리 ──
  const addProject = () => {
    const np = emptyProject(`원고 ${state.projects.length + 1}`)
    setState((s) => ({ ...s, projects: [np, ...s.projects], activeId: np.id, currentPass: PASSES[0].id }))
    setRenaming(true); setRenameText(np.title)
  }
  const switchProject = (id: string) => setState((s) => ({ ...s, activeId: id }))
  const deleteProject = () => {
    if (state.projects.length <= 1) { flash('마지막 원고는 삭제할 수 없어요.'); return }
    setState((s) => {
      const rest = s.projects.filter((p) => p.id !== s.activeId)
      return { ...s, projects: rest, activeId: rest[0].id }
    })
    flash('원고를 삭제했어요.')
  }
  const commitRename = () => {
    const t = renameText.trim()
    if (t) patchProj((p) => ({ ...p, title: t }))
    setRenaming(false)
  }

  // ── 진행률 ──
  const perPass = PASSES.map((pd) => {
    const items = passItems(pd, proj)
    const done = items.filter((it) => proj.checked[it.id]).length
    return { def: pd, items, total: items.length, done, complete: !!proj.passDone[pd.id] }
  })
  const byLayer: Record<LayerId, typeof perPass> = { macro: [], meso: [], micro: [] }
  perPass.forEach((pp) => byLayer[pp.def.layer].push(pp))
  const totalItems = perPass.reduce((a, p) => a + p.total, 0)
  const totalDone = perPass.reduce((a, p) => a + p.done, 0)
  const totalPct = totalItems ? Math.round((totalDone / totalItems) * 100) : 0
  const passesDone = perPass.filter((p) => p.complete).length

  // 추천 다음 패스: 완료 안 된 첫 패스(거시→중간→미시 순)
  const recommended = perPass.find((p) => !p.complete)?.def.id || null
  const cur = perPass.find((p) => p.def.id === pass.id)!

  // ── 드롭(좌측 바인더 파일 → 대상 원고로) ──
  const onDrop = (e: React.DragEvent) => {
    setDragOver(false)
    if (!isItemDrag(e)) return
    e.preventDefault()
    const item = getDragItem(e)
    if (!item) return
    const title = item.title || '가져온 원고'
    setState((s) => {
      const existing = s.projects.find((p) => p.title === title)
      if (existing) return { ...s, activeId: existing.id }
      const np = emptyProject(title)
      return { ...s, projects: [np, ...s.projects], activeId: np.id, currentPass: PASSES[0].id }
    })
    flash(`'${title}'을(를) 퇴고 대상으로 잡았어요.`)
  }

  // ── 내보내기 / 프로젝트 추가 ──
  const buildLines = (): string[] => {
    const lines: string[] = [`# 퇴고 패스 — ${proj.title}`, `전체 진행: ${totalDone}/${totalItems} (${totalPct}%) · 완료 패스 ${passesDone}/${PASSES.length}`, '']
    LAYERS.forEach((ly) => {
      lines.push(`## ${ly.icon} ${ly.name}`)
      byLayer[ly.id].forEach((pp) => {
        lines.push(`### ${pp.def.icon} ${pp.def.name} ${pp.complete ? '✔ 완료' : ''} [${pp.done}/${pp.total}]`)
        pp.items.forEach((it) => lines.push(`- [${proj.checked[it.id] ? 'x' : ' '}] ${it.text}`))
        const n = (proj.notes[pp.def.id] || '').trim()
        if (n) lines.push(`  메모: ${n}`)
        lines.push('')
      })
    })
    return lines
  }
  const copyText = async (text: string, okMsg: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) await navigator.clipboard.writeText(text)
      else {
        const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
      }
      flash(okMsg)
    } catch { flash('복사에 실패했어요. 직접 선택해 복사하세요.') }
  }
  const exportText = () => copyText(buildLines().join('\n').trim(), `퇴고 리포트를 복사했어요 (${totalDone}/${totalItems})`)

  const toProject = () => {
    if (!hasProjectBridge()) { setNote('프로젝트에 연결되어 있지 않아 문서를 추가할 수 없어요.'); return }
    const parts: string[] = []
    parts.push(`<p><strong>전체 진행: ${totalDone}/${totalItems} (${totalPct}%) · 완료 패스 ${passesDone}/${PASSES.length}</strong></p>`)
    LAYERS.forEach((ly) => {
      parts.push(`<h2>${escHtml(ly.icon + ' ' + ly.name)}</h2>`)
      byLayer[ly.id].forEach((pp) => {
        parts.push(`<h3>${escHtml(pp.def.icon + ' ' + pp.def.name)} ${pp.complete ? '✔ 완료' : ''} [${pp.done}/${pp.total}]</h3>`)
        if (pp.items.length === 0) parts.push('<p>(항목 없음)</p>')
        else pp.items.forEach((it) => parts.push(`<p>${proj.checked[it.id] ? '☑' : '☐'} ${escHtml(it.text)}</p>`))
        const n = (proj.notes[pp.def.id] || '').trim()
        if (n) parts.push(`<p style="color:#888"><em>메모: ${escHtml(n)}</em></p>`)
      })
    })
    const id = addToProject({
      kind: 'text', root: 'research', folder: '퇴고',
      title: `퇴고 패스 — ${proj.title} (${totalDone}/${totalItems})`,
      bodyHtml: parts.join(''),
      meta: {
        원고: proj.title,
        전체진행: `${totalDone}/${totalItems} (${totalPct}%)`,
        완료패스: `${passesDone}/${PASSES.length}`,
        ...Object.fromEntries(perPass.map((p) => [p.def.name, `${p.done}/${p.total}${p.complete ? ' ✔' : ''}`])),
      },
    })
    flash(id ? `프로젝트 '퇴고' 폴더에 리포트를 추가했어요` : '프로젝트에 연결되지 않았습니다')
  }

  // ── 스타일 ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', fontSize: 14, position: 'relative' }
  const head: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0, flexWrap: 'wrap' }
  const headTitle: React.CSSProperties = { fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 7 }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, display: 'flex', minWidth: 0 }
  const sidebar: React.CSSProperties = { width: 232, flexShrink: 0, borderRight: '1px solid var(--border)', overflowY: 'auto', padding: '10px 10px 16px', display: 'flex', flexDirection: 'column', gap: 6, background: 'var(--chrome-2)' }
  const main: React.CSSProperties = { flex: 1, minWidth: 0, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 14 }
  const bar = (h = 7): React.CSSProperties => ({ height: h, borderRadius: 99, background: 'var(--chrome-2)', border: '1px solid var(--border)', overflow: 'hidden', flex: 1, minWidth: 0 })
  const fill = (pct: number, c?: string): React.CSSProperties => ({ height: '100%', width: `${pct}%`, background: c || (pct >= 100 ? 'var(--ok)' : 'var(--accent)'), transition: 'width .25s ease' })
  const input: React.CSSProperties = { width: '100%', padding: '7px 9px', fontSize: 13, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }
  const tinyBtn: React.CSSProperties = { border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--muted)', cursor: 'pointer', fontSize: 12, lineHeight: 1, padding: '3px 6px', borderRadius: 6, flexShrink: 0 }
  const select: React.CSSProperties = { ...input, width: 'auto', flex: 1, minWidth: 0, cursor: 'pointer' }
  const guideCard: React.CSSProperties = { border: `1px solid var(--border)`, borderLeft: `4px solid ${LAYER_OF[pass.layer].color}`, borderRadius: 12, padding: 14, background: 'var(--panel)', display: 'flex', flexDirection: 'column', gap: 10 }

  return (
    <div
      style={wrap}
      onDragOver={(e) => { if (isItemDrag(e)) { e.preventDefault(); setDragOver(true) } }}
      onDragLeave={(e) => { if (e.currentTarget === e.target) setDragOver(false) }}
      onDrop={onDrop}
    >
      {/* 헤더 */}
      <div style={head}>
        <span style={headTitle}><Emoji e="🪜" /> 단계별 퇴고 패스</span>
        <span style={{ flex: 1 }} />
        {flashMsg && <span style={{ fontSize: 12, color: 'var(--ok)' }}>{flashMsg}</span>}
        <button className="linkbtn" onClick={toProject} disabled={!hasProjectBridge() || totalItems === 0}
          title={hasProjectBridge() ? "퇴고 리포트를 프로젝트 '퇴고' 폴더 문서로 추가" : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄" /> 프로젝트에 추가</button>
        <button className="minibtn" onClick={exportText} disabled={totalItems === 0} title="퇴고 리포트를 텍스트로 복사"><Emoji e="📋" /> 내보내기</button>
      </div>

      {/* 원고 선택 줄 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, color: 'var(--muted)', flexShrink: 0 }}>대상 원고</span>
        {renaming ? (
          <>
            <input style={{ ...input, flex: 1, minWidth: 120 }} value={renameText} autoFocus maxLength={80}
              onChange={(e) => setRenameText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commitRename() } if (e.key === 'Escape') { e.preventDefault(); setRenaming(false) } }} />
            <button style={tinyBtn} onClick={commitRename}>저장</button>
            <button style={tinyBtn} onClick={() => setRenaming(false)}>취소</button>
          </>
        ) : (
          <>
            <select style={select} value={proj.id} onChange={(e) => switchProject(e.target.value)} aria-label="대상 원고 선택">
              {state.projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
            <button style={tinyBtn} title="원고 이름 바꾸기" onClick={() => { setRenaming(true); setRenameText(proj.title) }}>✎</button>
            <button style={tinyBtn} title="새 원고 추가" onClick={addProject}>＋</button>
            <button style={{ ...tinyBtn, color: 'var(--warn)' }} title="현재 원고 삭제" onClick={deleteProject} disabled={state.projects.length <= 1}><Emoji e="🗑" /></button>
          </>
        )}
      </div>

      {/* 전체 진행 */}
      <div style={{ padding: '9px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <span style={{ fontSize: 12.5, color: 'var(--muted)', flexShrink: 0 }}>전체</span>
        <div style={bar()}><div style={fill(totalPct)} /></div>
        <span style={{ fontSize: 12.5, fontWeight: 700, flexShrink: 0, color: totalPct >= 100 ? 'var(--ok)' : 'var(--text)' }}>{totalDone}/{totalItems} · {totalPct}%</span>
        <span style={{ fontSize: 11.5, color: 'var(--muted)', flexShrink: 0, borderLeft: '1px solid var(--border)', paddingLeft: 10 }}>패스 {passesDone}/{PASSES.length}</span>
      </div>

      {note && <div style={{ padding: '8px 14px', fontSize: 12, color: 'var(--warn)', borderBottom: '1px solid var(--border)' }}>{note}</div>}

      <div style={body}>
        {/* 좌측: 층/패스 내비게이션 */}
        <div style={sidebar}>
          {LAYERS.map((ly) => {
            const passes = byLayer[ly.id]
            const lyTotal = passes.reduce((a, p) => a + p.total, 0)
            const lyDone = passes.reduce((a, p) => a + p.done, 0)
            const lyPct = lyTotal ? Math.round((lyDone / lyTotal) * 100) : 0
            return (
              <div key={ly.id} style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--muted)', fontWeight: 700, textTransform: 'none' }}>
                  <span><Emoji e={ly.icon} /></span><span>{ly.name}</span>
                  <span style={{ flex: 1 }} />
                  <span style={{ fontSize: 10.5 }}>{lyPct}%</span>
                </div>
                {passes.map((pp) => {
                  const active = pp.def.id === pass.id
                  const isRec = pp.def.id === recommended
                  const pct = pp.total ? Math.round((pp.done / pp.total) * 100) : 0
                  return (
                    <button key={pp.def.id} onClick={() => selectPass(pp.def.id)} style={{
                      textAlign: 'left', border: `1px solid ${active ? ly.color : 'var(--border)'}`, background: active ? 'var(--panel)' : 'var(--paper)',
                      color: 'var(--text)', borderRadius: 9, padding: '7px 9px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 5,
                      boxShadow: active ? `0 0 0 1px ${ly.color} inset` : 'none',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 14, flexShrink: 0 }}><Emoji e={pp.def.icon} /></span>
                        <span style={{ fontWeight: 600, fontSize: 12.5, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pp.def.name}</span>
                        {pp.complete
                          ? <span style={{ fontSize: 11, color: 'var(--ok)', flexShrink: 0 }}>✔</span>
                          : isRec ? <span style={{ fontSize: 9.5, color: ly.color, border: `1px solid ${ly.color}`, borderRadius: 5, padding: '0 4px', flexShrink: 0 }}>다음</span> : null}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={bar(5)}><div style={fill(pct, pp.complete ? 'var(--ok)' : ly.color)} /></div>
                        <span style={{ fontSize: 10.5, color: 'var(--muted)', flexShrink: 0 }}>{pp.done}/{pp.total}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            )
          })}
          <div style={{ fontSize: 10.5, color: 'var(--muted)', lineHeight: 1.6, marginTop: 4, borderTop: '1px solid var(--border)', paddingTop: 8 }}>
            추천 순서는 위에서 아래(거시→미시)예요. ‘다음’ 표시를 따라가면 헛수고 없이 다듬을 수 있어요.
          </div>
        </div>

        {/* 우측: 현재 패스 가이드 + 체크리스트 */}
        <div style={main}>
          {/* 층 안내 띠 */}
          <div style={{ fontSize: 11.5, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 8, lineHeight: 1.5 }}>
            <span style={{ flexShrink: 0, fontWeight: 700, color: LAYER_OF[pass.layer].color }}><Emoji e={LAYER_OF[pass.layer].icon} /> {LAYER_OF[pass.layer].name}</span>
            <span>{LAYER_OF[pass.layer].blurb}</span>
          </div>

          {/* 현재 패스 가이드 */}
          <div style={guideCard}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 22 }}><Emoji e={pass.icon} /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{pass.name}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>{pass.tagline}</div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, cursor: 'pointer', border: `1px solid ${cur.complete ? 'var(--ok)' : 'var(--border)'}`, borderRadius: 8, padding: '5px 9px', color: cur.complete ? 'var(--ok)' : 'var(--text)' }}>
                <input type="checkbox" checked={cur.complete} onChange={() => togglePassDone(pass.id)} style={{ width: 15, height: 15, accentColor: 'var(--ok)', cursor: 'pointer' }} />
                이 패스 완료
              </label>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <div style={bar(8)}><div style={fill(cur.total ? Math.round((cur.done / cur.total) * 100) : 0, cur.complete ? 'var(--ok)' : LAYER_OF[pass.layer].color)} /></div>
              <span style={{ fontSize: 12.5, fontWeight: 700, flexShrink: 0 }}>{cur.done}/{cur.total}</span>
              <button style={tinyBtn} title="이 패스 체크·완료 해제" disabled={cur.done === 0 && !cur.complete} onClick={() => resetPass(pass.id)}>↺ 해제</button>
            </div>

            <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text)' }}>
              <span style={{ fontWeight: 700 }}>왜 지금? </span>{pass.why}
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, color: LAYER_OF[pass.layer].color }}>진행 방법</div>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, lineHeight: 1.7, color: 'var(--text)' }}>
                  {pass.how.map((h, i) => <li key={i}>{h}</li>)}
                </ul>
              </div>
              <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, color: 'var(--warn)' }}>흔한 함정</div>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, lineHeight: 1.7, color: 'var(--muted)' }}>
                  {pass.pitfalls.map((h, i) => <li key={i}>{h}</li>)}
                </ul>
              </div>
            </div>
          </div>

          {/* 체크리스트 */}
          <div style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', background: 'var(--panel)' }}>
            <div style={{ padding: '9px 12px', fontSize: 12.5, fontWeight: 700, background: 'var(--chrome-2)', borderBottom: '1px solid var(--border)' }}>
              점검 항목 ({cur.done}/{cur.total})
            </div>
            {cur.items.length === 0 ? (
              <div style={{ padding: '16px 12px', fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.6 }}>
                이 패스에 항목이 없어요. 아래에서 점검 항목을 추가하세요.
              </div>
            ) : cur.items.map((it) => {
              const isEditing = editing && editing.id === it.id
              const checked = !!proj.checked[it.id]
              const userArr = proj.userItems[pass.id] || []
              const uIdx = it.user ? userArr.findIndex((u) => u.id === it.id) : -1
              return (
                <div key={it.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, padding: '8px 12px', borderTop: '1px solid var(--border)' }}>
                  {isEditing ? (
                    <>
                      <input style={{ ...input, flex: 1 }} value={editing!.text} autoFocus
                        onChange={(e) => setEditing({ id: it.id, text: e.target.value })}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); saveEdit() } if (e.key === 'Escape') { e.preventDefault(); setEditing(null) } }}
                        aria-label="항목 수정" />
                      <button style={tinyBtn} onClick={saveEdit}>저장</button>
                      <button style={tinyBtn} onClick={() => setEditing(null)}>취소</button>
                    </>
                  ) : (
                    <>
                      <input type="checkbox" checked={checked} onChange={() => toggle(it.id)}
                        style={{ width: 16, height: 16, marginTop: 2, flexShrink: 0, cursor: 'pointer', accentColor: LAYER_OF[pass.layer].color }} aria-label={it.text} />
                      <span onClick={() => toggle(it.id)} style={{ flex: 1, minWidth: 0, fontSize: 13.5, lineHeight: 1.5, cursor: 'pointer', wordBreak: 'break-word', color: checked ? 'var(--muted)' : 'var(--text)', textDecoration: checked ? 'line-through' : 'none' }}>
                        {it.text}
                        {it.user && <span style={{ marginLeft: 6, fontSize: 10.5, color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 5, padding: '0 4px', verticalAlign: 'middle' }}>내 항목</span>}
                      </span>
                      {it.user && (
                        <>
                          <button style={tinyBtn} title="위로" disabled={uIdx <= 0} onClick={() => moveUserItem(pass.id, it.id, -1)}>↑</button>
                          <button style={tinyBtn} title="아래로" disabled={uIdx < 0 || uIdx >= userArr.length - 1} onClick={() => moveUserItem(pass.id, it.id, 1)}>↓</button>
                        </>
                      )}
                      <button style={tinyBtn} title="수정" onClick={() => setEditing({ id: it.id, text: it.text })}>✎</button>
                      <button style={{ ...tinyBtn, color: 'var(--warn)' }} title="삭제" onClick={() => removeItem(pass.id, it.id, it.user)}>✕</button>
                    </>
                  )}
                </div>
              )
            })}
            {/* 항목 추가 */}
            <div style={{ display: 'flex', gap: 8, padding: '10px 12px', borderTop: '1px solid var(--border)' }}>
              <input style={{ ...input, flex: 1 }} value={drafts[pass.id] || ''} maxLength={160}
                onChange={(e) => setDrafts((d) => ({ ...d, [pass.id]: e.target.value }))}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addUserItem(pass.id) } }}
                placeholder={`${pass.name} 패스에 점검 항목 추가…`} aria-label={`${pass.name} 항목 추가`} />
              <button className="minibtn" onClick={() => addUserItem(pass.id)} disabled={!(drafts[pass.id] || '').trim()}>＋ 추가</button>
            </div>
          </div>

          {/* 패스 메모 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>이 패스 메모 (다른 층에서 발견한 것을 적어두세요)</div>
            <textarea
              value={proj.notes[pass.id] || ''}
              onChange={(e) => setPassNote(pass.id, e.target.value)}
              placeholder={pass.layer === 'micro' ? '맞춤법·표현을 손보다 내용이 거슬리면 여기 적어두고 진행하세요.' : '문장·오탈자가 거슬리면 미시 패스용으로 여기 메모만 남기고 넘어가세요.'}
              style={{ ...input, minHeight: 64, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }}
            />
          </div>

          {/* 연계 도구 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', borderTop: '1px solid var(--border)', paddingTop: 10 }}>
            <span style={{ fontSize: 11.5, color: 'var(--muted)', flexShrink: 0 }}>도움 도구</span>
            <button className="linkbtn" onClick={() => openToolLinked('revision-checklist')} title="단계별 퇴고 체크리스트 열기"><Emoji e="🧾" /> 퇴고 체크리스트</button>
            {(pass.layer === 'micro') && <>
              <button className="linkbtn" onClick={() => openToolLinked('korean-spell-helper')} title="맞춤법 도우미 열기"><Emoji e="🔤" /> 맞춤법 도우미</button>
              <button className="linkbtn" onClick={() => openToolLinked('read-aloud-tts')} title="소리 내어 읽기 열기"><Emoji e="🔊" /> 소리 내어 읽기</button>
            </>}
            {(pass.layer === 'macro') && <button className="linkbtn" onClick={() => openToolLinked('plot-pyramid')} title="플롯 피라미드 열기"><Emoji e="🎢" /> 플롯 피라미드</button>}
            {(pass.layer === 'meso') && <button className="linkbtn" onClick={() => openToolLinked('scene-list')} title="장면 목록 열기"><Emoji e="🎬" /> 장면 목록</button>}
          </div>

          <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.6, paddingBottom: 6 }}>
            한 번에 한 층씩 다듬으세요. 항목을 눌러 체크하고, 패스를 다 보면 ‘이 패스 완료’로 표시해 다음 층으로 넘어가세요. 좌측 바인더의 원고 파일을 이 창으로 끌어다 놓으면 대상으로 잡힙니다. 모든 진행은 이 브라우저에 자동 저장됩니다.
          </div>
        </div>
      </div>

      {/* 드롭 오버레이 */}
      {dragOver && (
        <div style={{ position: 'absolute', inset: 0, background: 'color-mix(in srgb, var(--accent) 14%, transparent)', border: '2px dashed var(--accent)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 5 }}>
          <div style={{ background: 'var(--panel)', border: '1px solid var(--accent)', borderRadius: 10, padding: '10px 16px', fontSize: 13, fontWeight: 700 }}>이 원고를 퇴고 대상으로 잡기</div>
        </div>
      )}
    </div>
  )
}
