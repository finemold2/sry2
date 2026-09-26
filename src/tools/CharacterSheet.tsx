// 인물 시트 — 여러 캐릭터 프로필을 관리하는 큰 도구. 좌측 인물 목록(추가/삭제/순서이동/선택),
// 우측 편집 폼(이름/역할/나이/외모/성격/목표/약점/비밀/말투/배경/관계). localStorage 자동 저장·복원.
// 한 인물 텍스트 복사, 빈 상태 안내, 검색·필터, 삭제 2단계 확인.
// [연계] 공유 라이브러리(characters)에서 가져오기/저장·업데이트, payload.character 로 새 인물 추가,
//        관계도/시점/이름 도구로 데이터와 함께 이동. import 는 react 와 './linkbus' 만 사용.
// 저작권 안전: 외부 이미지(공유 사진)는 출처(크레딧)와 함께만 표기하며 그대로 베끼지 말라고 안내.
import { useEffect, useRef, useState } from 'react'
import {
  useLibraryList,
  addToLibrary,
  updateInLibrary,
  openToolLinked,
  addToProject,
  hasProjectBridge,
  getDragItem,
  isItemDrag,
  CHARACTER_FIELD_LABEL,
  Emoji,
  emojify,
  type SharedCharacter,
} from './linkbus'

export const meta = { id: 'character-sheet', name: '인물 시트', icon: '🧑‍🎤', group: '구상·정리', intro: '여러 캐릭터의 프로필을 한곳에서 만들고 관리하세요', w: 680, h: 600 }

const LS_KEY = 'sry:tool:character-sheet'

// 인물 한 명의 데이터 구조. 모든 텍스트 필드는 자유 입력.
interface Character {
  id: string
  name: string
  role: string
  age: string
  appearance: string
  personality: string
  goal: string
  weakness: string
  secret: string
  speech: string
  background: string
  relations: string
  etc: string
  // [연계] 공유 라이브러리에 저장한 경우의 원본 id·사진(저작권 안전 이미지)·크레딧. 기존 동작에는 영향 없음.
  libId?: string
  photo?: string
  photoCredit?: string
  // [연계] 기본 칸에 없는 정규 항목(예: 성별·MBTI·키·혈액형·체형·머리·눈·직업·가치관·두려움·습관·출신·취미 등)을
  //        손실 없이 보존(다른 도구에서 받은 모든 항목 유지). 키는 linkbus 정규 키.
  extra?: Record<string, string>
}

// 시트 기본 칸 키 ↔ 정규(linkbus) 키 매핑. weakness 는 정규 'flaw' 에 대응.
const PRIMARY_CANON: Record<string, string> = { name: 'name', role: 'role', age: 'age', appearance: 'appearance', personality: 'personality', goal: 'goal', weakness: 'flaw', secret: 'secret', speech: 'speech', background: 'background', relations: 'relations', etc: 'etc' }
const CANON_TO_PRIMARY: Record<string, string> = Object.fromEntries(Object.entries(PRIMARY_CANON).map(([p, c]) => [c, p]))

// 편집 폼에 그릴 필드 정의(순서대로 렌더). single=한 줄 / multi=여러 줄.
type FieldKey = Extract<keyof Character, 'name' | 'role' | 'age' | 'appearance' | 'personality' | 'goal' | 'weakness' | 'secret' | 'speech' | 'background' | 'relations' | 'etc'>
interface FieldDef { key: FieldKey; label: string; icon: string; multi: boolean; placeholder: string }
const FIELDS: FieldDef[] = [
  { key: 'name', label: '이름', icon: '🪪', multi: false, placeholder: '예: 한도윤' },
  { key: 'role', label: '역할', icon: '🎬', multi: false, placeholder: '주인공 / 조력자 / 적대자 …' },
  { key: 'age', label: '나이', icon: '🎂', multi: false, placeholder: '예: 27세, 겉보기 20대 초반' },
  { key: 'appearance', label: '외모', icon: '👁️', multi: true, placeholder: '키·체형·얼굴·옷차림·특징적인 인상…' },
  { key: 'personality', label: '성격', icon: '🧠', multi: true, placeholder: '기질·강점·버릇·모순되는 면…' },
  { key: 'goal', label: '목표', icon: '🎯', multi: true, placeholder: '겉으로 원하는 것 / 진짜 바라는 것…' },
  { key: 'weakness', label: '약점', icon: '💔', multi: true, placeholder: '두려움·결핍·치명적 단점…' },
  { key: 'secret', label: '비밀', icon: '🤫', multi: true, placeholder: '감추고 있는 것, 드러나면 위험한 것…' },
  { key: 'speech', label: '말투', icon: '💬', multi: true, placeholder: '어조·입버릇·존댓말/반말·즐겨 쓰는 표현…' },
  { key: 'background', label: '배경', icon: '📜', multi: true, placeholder: '출신·성장·중요한 과거 사건…' },
  { key: 'relations', label: '관계', icon: '🔗', multi: true, placeholder: '가족·친구·연인·라이벌과의 관계…' },
  { key: 'etc', label: '기타', icon: '🧷', multi: true, placeholder: '그 밖에 적어둘 모든 것 — 자유롭게…' },
]

// 고유 id 생성 — crypto 우선, 미지원 시 시간+난수.
function newId(): string {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  } catch {}
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

// 빈 인물 생성.
function emptyChar(): Character {
  return {
    id: newId(), name: '', role: '', age: '', appearance: '', personality: '',
    goal: '', weakness: '', secret: '', speech: '', background: '', relations: '', etc: '', extra: {},
  }
}

// 정규 필드 맵(키→값)을 시트 형태로 분해: 기본 칸에 해당하는 건 칸으로, 나머지는 extra 로 보존(손실 0).
function splitCanonical(fields: Record<string, unknown> | undefined): { primary: Partial<Character>; extra: Record<string, string> } {
  const primary: Partial<Character> = {}
  const extra: Record<string, string> = {}
  if (!fields || typeof fields !== 'object') return { primary, extra }
  for (const [k, raw] of Object.entries(fields)) {
    const v = typeof raw === 'string' ? raw.trim() : ''
    if (!v) continue
    const pk = CANON_TO_PRIMARY[k]
    if (pk) (primary as Record<string, string>)[pk] = v
    else extra[k] = v
  }
  return { primary, extra }
}

// 안전한 문자열 변환(임의 입력 정규화).
const str = (v: unknown) => (typeof v === 'string' ? v : '')

// localStorage 읽기 — 미지원/차단/손상 시 빈 배열로 graceful.
function loadChars(): Character[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((x) => x && typeof x === 'object')
      .map((x: Record<string, unknown>) => ({
        id: String(x.id || newId()),
        name: str(x.name), role: str(x.role), age: str(x.age),
        appearance: str(x.appearance), personality: str(x.personality), goal: str(x.goal),
        weakness: str(x.weakness), secret: str(x.secret), speech: str(x.speech),
        background: str(x.background), relations: str(x.relations), etc: str(x.etc),
        libId: typeof x.libId === 'string' ? x.libId : undefined,
        photo: typeof x.photo === 'string' ? x.photo : undefined,
        photoCredit: typeof x.photoCredit === 'string' ? x.photoCredit : undefined,
        extra: x.extra && typeof x.extra === 'object' && !Array.isArray(x.extra)
          ? Object.fromEntries(Object.entries(x.extra as Record<string, unknown>).filter(([, v]) => typeof v === 'string').map(([k, v]) => [k, str(v)]))
          : {},
      }))
  } catch {
    return []
  }
}

// 한 인물을 사람이 읽기 좋은 텍스트로 직렬화(복사·내보내기용).
function charToText(c: Character): string {
  const lines: string[] = []
  const title = c.name.trim() || '(이름 없는 인물)'
  lines.push(`■ ${title}`)
  for (const f of FIELDS) {
    if (f.key === 'name') continue
    const v = c[f.key].trim()
    if (!v) continue
    if (f.multi && v.includes('\n')) {
      lines.push(`${f.label}:`)
      v.split('\n').forEach((ln) => lines.push(`  ${ln}`))
    } else {
      lines.push(`${f.label}: ${v}`)
    }
  }
  // 추가 항목(기본 칸에 없는 정규 항목)도 함께 출력.
  for (const [k, v] of Object.entries(c.extra || {})) {
    const t = (v || '').trim()
    if (t) lines.push(`${CHARACTER_FIELD_LABEL[k] || k}: ${t}`)
  }
  if (c.photo && c.photoCredit) lines.push(`사진 출처: ${c.photoCredit}`)
  return lines.join('\n')
}

// [연계] 공유 라이브러리의 인물(SharedCharacter)을 로컬 인물 폼으로 매핑.
// 이름/사진/역할/성격/목표/비밀/메모(+외모) 매핑. traits 는 보조로 외모·나이 추정에 활용.
function fromShared(s: SharedCharacter): Character {
  const traits = Array.isArray(s.traits) ? s.traits : []
  const traitVal = (...keys: string[]) => {
    const hit = traits.find((t) => t && keys.some((k) => str(t.k).includes(k)))
    return hit ? str(hit.v) : ''
  }
  const traitLines = traits
    .filter((t) => t && (str(t.k).trim() || str(t.v).trim()))
    .map((t) => `${str(t.k).trim()}: ${str(t.v).trim()}`)
  // 정규 fields 가 있으면 그것을 우선(손실 0). 없으면 레거시(explicit/traits) 매핑.
  const { primary, extra } = splitCanonical(s.fields)
  const base: Character = {
    id: newId(),
    name: str(s.name),
    role: str(s.role),
    age: traitVal('나이', 'age'),
    appearance: str(s.appearance),
    personality: str(s.personality),
    goal: str(s.goal),
    weakness: '',
    secret: str(s.secret),
    speech: '',
    background: str(s.notes) || (s.fields ? '' : traitLines.join('\n')),
    relations: '',
    etc: '',
    extra: {},
    libId: s.id,
    photo: str(s.photo) || undefined,
    photoCredit: str(s.photoCredit) || undefined,
  }
  // 정규 fields 의 기본 칸 값으로 덮어쓰기(비어있지 않을 때만) + 나머지는 extra.
  for (const [k, v] of Object.entries(primary)) if (v) (base as unknown as Record<string, string>)[k] = v as string
  base.extra = extra
  return base
}

// [연계] payload.character(임의 형태)를 로컬 인물로 안전 변환 → 새 인물 추가용.
function charFromPayload(raw: unknown): Character {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const base = fromShared({
    id: typeof o.id === 'string' ? o.id : '',
    name: str(o.name),
    photo: str(o.photo),
    photoCredit: str(o.photoCredit),
    role: str(o.role),
    traits: Array.isArray(o.traits) ? (o.traits as SharedCharacter['traits']) : undefined,
    appearance: str(o.appearance),
    personality: str(o.personality),
    goal: str(o.goal),
    secret: str(o.secret),
    notes: str(o.notes),
    fields: o.fields && typeof o.fields === 'object' ? (o.fields as Record<string, string>) : undefined,
    source: str(o.source),
    updated: 0,
  })
  // payload 로 들어온 인물은 라이브러리 원본과 자동 연결하지 않는다(붙여넣기 성격).
  base.libId = undefined
  // 로컬 전용 필드도 직접 전달된 경우 보존(정규 fields 가 없을 때의 폴백/보완).
  if (typeof o.age === 'string' && o.age) base.age = o.age
  if (typeof o.weakness === 'string' && o.weakness) base.weakness = o.weakness
  if (typeof o.speech === 'string' && o.speech) base.speech = o.speech
  if (typeof o.relations === 'string' && o.relations) base.relations = o.relations
  if (typeof o.background === 'string' && o.background) base.background = o.background
  // 손실 0: 어떤 도구에서 보내든, 위에서 소비하지 않은 character 키를 추가 항목으로 흡수.
  const consumed = new Set(['id', 'name', 'photo', 'photoCredit', 'role', 'traits', 'fields', 'appearance', 'personality', 'goal', 'secret', 'notes', 'source', 'age', 'weakness', 'speech', 'relations', 'background', 'etc'])
  const absorbed = { ...(base.extra || {}) }
  for (const [k, v] of Object.entries(o)) {
    if (consumed.has(k)) continue
    const val = str(v).trim()
    if (val && !absorbed[k]) absorbed[k] = val
  }
  base.extra = absorbed
  return base
}

// [바인더 드롭] 끌어다 놓은 바인더 파일(ResolvedItem)을 로컬 인물로 변환.
// character 가 있으면 인물 카드 키(name/role/age/occupation/appearance/personality/habits/
// background/goal/conflict/arc/notes)를 시트 필드로 매핑. 없으면 title=이름, text 일부=메모(배경).
function charFromDrop(it: { title?: string; type?: string; character?: Record<string, string>; text?: string }): Character {
  const c = emptyChar()
  const ch = it.character
  if (ch && typeof ch === 'object') {
    // 정규 키(name/role/age/appearance/personality/goal/flaw/secret/speech/background/relations + 그 외)는
    // 기본 칸/추가 항목으로 손실 없이 분해.
    const { primary, extra } = splitCanonical(ch)
    for (const [k, v] of Object.entries(primary)) if (v) (c as unknown as Record<string, string>)[k] = v as string
    c.extra = { ...extra }
    const pick = (...keys: string[]) => { for (const k of keys) { const v = str(ch[k]).trim(); if (v) return v } return '' }
    if (!c.name) c.name = pick('name') || str(it.title)
    // 레거시/장소 카드 키 보완(이미 정규로 채워졌으면 건너뜀).
    if (!c.role) c.role = pick('role', 'type')                 // 장소: type → 역할
    if (!c.appearance) c.appearance = pick('atmosphere')        // 장소: 분위기 → 외모(인상)
    if (!c.weakness) c.weakness = pick('conflict')              // 레거시 conflict → 약점
    if (!c.speech) c.speech = pick('habits')                    // 레거시 habits → 말투
    if (!c.background) {
      c.background = pick('description') ||
        [str(ch.location).trim() && `위치: ${str(ch.location).trim()}`, str(ch.history).trim() && `역사: ${str(ch.history).trim()}`].filter(Boolean).join('\n')
    }
    // 정규에 없는 레거시 보조 키(occupation 은 정규에 있으니 제외)는 extra 로 보존.
    for (const lk of ['arc']) { const v = str(ch[lk]).trim(); if (v && !c.extra[lk]) c.extra[lk] = v }
  } else {
    // 일반 문서 — title=이름, 본문 일부를 배경(메모)으로.
    c.name = str(it.title)
    c.background = str(it.text).slice(0, 4000)
  }
  return c
}

// [연계] 로컬 인물 → 공유 라이브러리 저장용 SharedCharacter 부분 객체.
function toSharedPatch(c: Character): Partial<SharedCharacter> {
  // 정규 fields(기본 칸 + 추가 항목) — 손실 없는 표준 전달의 핵심.
  const fields: Record<string, string> = {}
  for (const [pk, canon] of Object.entries(PRIMARY_CANON)) {
    const v = str((c as unknown as Record<string, unknown>)[pk]).trim()
    if (v) fields[canon] = v
  }
  for (const [k, v] of Object.entries(c.extra || {})) { const t = str(v).trim(); if (t) fields[k] = t }
  // 레거시 호환용 traits(이전 버전 도구가 fields 를 모를 때).
  const traits = Object.entries(fields).map(([k, v]) => ({ k: CHARACTER_FIELD_LABEL[k] || k, v }))
  return {
    name: c.name.trim() || '(이름 없는 인물)',
    role: c.role.trim() || undefined,
    appearance: c.appearance.trim() || undefined,
    personality: c.personality.trim() || undefined,
    goal: c.goal.trim() || undefined,
    secret: c.secret.trim() || undefined,
    notes: c.background.trim() || undefined,
    fields: Object.keys(fields).length ? fields : undefined,
    traits: traits.length ? traits : undefined,
    photo: c.photo || undefined,
    photoCredit: c.photoCredit || undefined,
    source: '인물 시트',
  }
}

export default function CharacterSheet({ payload }: { payload?: Record<string, unknown> }) {
  const [chars, setChars] = useState<Character[]>(() => loadChars())
  const [selId, setSelId] = useState<string | null>(() => {
    const init = loadChars()
    return init.length ? init[0].id : null
  })
  const [query, setQuery] = useState('')
  const [confirmDel, setConfirmDel] = useState<string | null>(null) // 삭제 2단계 확인 대상 id
  const [note, setNote] = useState('')        // 저장 차단 등 경고
  const [flash, setFlash] = useState('')       // 복사 완료 등 일시 안내
  const [showImport, setShowImport] = useState(false) // [연계] 라이브러리 가져오기 패널 열림
  const [dragOver, setDragOver] = useState(false)     // [바인더 드롭] 드래그 진입 시각 피드백
  const dragDepth = useRef(0)                          // enter/leave 중첩 카운트(자식 위 이동 깜빡임 방지)
  const mounted = useRef(true)
  const flashTimer = useRef<number | null>(null)

  // [연계] 공유 라이브러리 인물 목록(자동 구독·리렌더).
  const library = useLibraryList('characters')

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (flashTimer.current !== null) clearTimeout(flashTimer.current)
    }
  }, [])

  // 변경 시 자동 저장 — 차단/용량초과 시 안내만, 동작은 유지.
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(chars))
    } catch {
      if (mounted.current) setNote('이 브라우저에서 저장이 막혀 있어 새로고침하면 내용이 사라질 수 있어요.')
    }
  }, [chars])

  // 선택된 인물이 목록에서 사라지면(삭제 등) 선택 보정.
  useEffect(() => {
    if (selId && !chars.some((c) => c.id === selId)) {
      setSelId(chars.length ? chars[0].id : null)
    }
  }, [chars, selId])

  // [연계] payload.character 가 들어오면 새 인물로 추가(중복 추가 방지를 위해 1회만 처리).
  const consumedPayload = useRef<unknown>(undefined)
  useEffect(() => {
    const raw = payload?.character
    if (!raw) return
    if (consumedPayload.current === raw) return
    consumedPayload.current = raw
    const c = charFromPayload(raw)
    setChars((prev) => [...prev, c])
    setSelId(c.id)
    setQuery('')
    setConfirmDel(null)
    showFlash('전달받은 인물을 새로 추가했어요.')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload])
  // [연계] 직업 참고(job/profession)·음악 갤러리(themeSong) 처럼 인물 객체 없이 평평한 값으로 오는 경우:
  // 선택된 인물이 있으면 그 인물에 반영(빈 칸만 채움/메모 추가), 없으면 새 인물로 추가.
  const consumedFlat = useRef<unknown>(undefined)
  useEffect(() => {
    if (!payload || payload.character || consumedFlat.current === payload) return
    const str = (k: string) => (typeof payload[k] === 'string' ? (payload[k] as string).trim() : '')
    const song = payload.themeSong && typeof payload.themeSong === 'object' ? (payload.themeSong as Record<string, unknown>) : null
    const songLine = song ? `테마곡: ${String(song.title || '')} — ${String(song.creator || '')}${song.license ? ` (${String(song.license)})` : ''}${song.mood ? ` · ${String(song.mood)}` : ''}` : ''
    const role = str('role') || str('job') || str('profession')
    const name = str('name')
    if (!role && !name && !songLine) return
    consumedFlat.current = payload
    setChars((prev) => {
      const cur = prev.find((c) => c.id === selId)
      if (cur && !name) {
        return prev.map((c) => (c.id === cur.id ? { ...c, role: c.role || role, etc: songLine ? (c.etc ? c.etc + '\n' : '') + songLine : c.etc } : c))
      }
      const c = { ...emptyChar(), name, role, etc: songLine }
      setSelId(c.id)
      return [...prev, c]
    })
    setQuery('')
    showFlash(songLine ? '테마곡을 인물 메모에 적었어요.' : role ? `직업 ‘${role}’ 을(를) 인물에 반영했어요.` : '전달받은 인물을 추가했어요.')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload])

  const showFlash = (msg: string) => {
    setFlash(msg)
    if (flashTimer.current !== null) clearTimeout(flashTimer.current)
    flashTimer.current = window.setTimeout(() => {
      if (mounted.current) setFlash('')
    }, 1800)
  }

  const selected = chars.find((c) => c.id === selId) || null

  // 새 인물 추가 → 즉시 선택, 검색어 초기화.
  const addChar = () => {
    const c = emptyChar()
    setChars((prev) => [...prev, c])
    setSelId(c.id)
    setQuery('')
    setConfirmDel(null)
  }

  // [바인더 드롭] 도구창에 끌어다 놓은 바인더 파일을 새 인물로 추가.
  const handleItemDrop = (e: React.DragEvent) => {
    dragDepth.current = 0
    setDragOver(false)
    const it = getDragItem(e)
    if (!it) return
    e.preventDefault()
    const c = charFromDrop(it)
    setChars((prev) => [...prev, c])
    setSelId(c.id)
    setQuery('')
    setConfirmDel(null)
    showFlash(`‘${c.name.trim() || it.title || '바인더 파일'}’을(를) 새 인물로 추가했어요.`)
  }

  // 선택 인물의 한 필드 수정(인라인 폼).
  const updateField = (key: FieldKey, value: string) => {
    if (!selId) return
    setChars((prev) => prev.map((c) => (c.id === selId ? { ...c, [key]: value } : c)))
  }
  // 추가 항목(extra) 수정/삭제.
  const updateExtra = (key: string, value: string) => {
    if (!selId) return
    setChars((prev) => prev.map((c) => (c.id === selId ? { ...c, extra: { ...(c.extra || {}), [key]: value } } : c)))
  }
  const removeExtra = (key: string) => {
    if (!selId) return
    setChars((prev) => prev.map((c) => { if (c.id !== selId) return c; const e = { ...(c.extra || {}) }; delete e[key]; return { ...c, extra: e } }))
  }
  // 사용자 정의 항목 추가(빈 값으로 생성 → 입력) — 다른 도구(시트/갤러리/생성기)와 연동되는 정규 fields 로 전파됨.
  const addExtraField = () => {
    if (!selId) return
    const label = window.prompt('추가할 항목 이름 (예: 최종목표, 1번째 목표):')
    const key = (label || '').trim()
    if (!key) return
    setChars((prev) => prev.map((c) => (c.id === selId ? { ...c, extra: { ...(c.extra || {}), [key]: (c.extra && c.extra[key]) || '' } } : c)))
  }

  // 삭제(2단계 확인) — 첫 클릭은 확인 모드, 둘째 클릭에서 실제 삭제.
  const requestDelete = (id: string) => setConfirmDel(id)
  const cancelDelete = () => setConfirmDel(null)
  const confirmDelete = (id: string) => {
    setChars((prev) => prev.filter((c) => c.id !== id))
    setConfirmDel(null)
  }

  // 순서 이동(위/아래).
  const move = (id: string, dir: -1 | 1) => {
    setChars((prev) => {
      const i = prev.findIndex((c) => c.id === id)
      if (i < 0) return prev
      const j = i + dir
      if (j < 0 || j >= prev.length) return prev
      const next = prev.slice()
      const tmp = next[i]; next[i] = next[j]; next[j] = tmp
      return next
    })
  }

  // 인물 복제.
  const duplicate = (id: string) => {
    setChars((prev) => {
      const src = prev.find((c) => c.id === id)
      if (!src) return prev
      // 복제본은 라이브러리 원본과의 연결을 끊는다(중복 업데이트 방지).
      const copy: Character = { ...src, id: newId(), name: (src.name.trim() || '인물') + ' (복사)', libId: undefined }
      const i = prev.findIndex((c) => c.id === id)
      const next = prev.slice()
      next.splice(i + 1, 0, copy)
      setSelId(copy.id)
      return next
    })
  }

  // 클립보드 복사 — navigator.clipboard 우선, 실패 시 execCommand 폴백, 최종 실패 시 안내.
  const copyText = async (text: string, okMsg: string) => {
    // 1차: 표준 클립보드 API.
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text)
        showFlash(okMsg)
        return
      }
    } catch {
      // 2차 폴백으로 진행.
    }
    // 2차: 임시 textarea + execCommand("copy") 폴백(구형/비보안 컨텍스트 대응).
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.setAttribute('readonly', '')
      ta.style.position = 'fixed'
      ta.style.top = '-1000px'
      ta.style.left = '-1000px'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.focus()
      ta.select()
      ta.setSelectionRange(0, text.length)
      const ok = document.execCommand('copy')
      document.body.removeChild(ta)
      if (ok) {
        showFlash(okMsg)
        return
      }
    } catch {
      // 최종 실패 안내로 진행.
    }
    // 최종 실패: 직접 선택 복사 안내.
    showFlash('복사에 실패했어요. 텍스트를 직접 선택해 복사하세요.')
  }
  const copyOne = (c: Character) => copyText(charToText(c), '한 인물을 복사했어요.')
  const copyAll = () => {
    if (!chars.length) return
    const text = chars.map(charToText).join('\n\n────────\n\n')
    copyText(text, `전체 ${chars.length}명을 복사했어요.`)
  }

  // [연계] 라이브러리 인물을 현재 시트에 새 인물로 가져오기.
  const importFromLibrary = (s: SharedCharacter) => {
    const c = fromShared(s)
    setChars((prev) => [...prev, c])
    setSelId(c.id)
    setQuery('')
    setConfirmDel(null)
    setShowImport(false)
    showFlash(`‘${c.name.trim() || '이름 없는 인물'}’을(를) 라이브러리에서 가져왔어요.`)
  }

  // [연계] 인물을 공유 라이브러리에 저장(처음) 또는 업데이트(이미 연결된 경우).
  const saveToLibrary = (c: Character) => {
    const patch = toSharedPatch(c)
    if (c.libId && library.some((x) => x.id === c.libId)) {
      updateInLibrary('characters', c.libId, patch)
      showFlash('라이브러리의 인물을 업데이트했어요.')
    } else {
      const rec = addToLibrary('characters', patch)
      setChars((prev) => prev.map((x) => (x.id === c.id ? { ...x, libId: rec.id } : x)))
      showFlash('라이브러리에 인물을 저장했어요.')
    }
  }

  // [연계] 관련 도구를 현재 인물 데이터와 함께 연다.
  const openWithChar = (toolId: string, c: Character | null) => {
    openToolLinked(toolId, c ? { character: { ...toSharedPatch(c), id: c.libId } } : undefined)
  }

  // [프로젝트] 현재 인물을 프로젝트 바인더에 인물 카드로 추가.
  // 시트의 필드를 브리지 character 필드키(name/role/age/appearance/personality/goal/conflict/background/habits/notes)로 매핑.
  // weakness·secret 은 conflict(갈등/약점)로 합치고, speech 는 habits(말투/습관)로, relations 는 notes 에 함께 담아 손실 없이 전달.
  const bridgeOn = hasProjectBridge()
  const addCharToProject = (c: Character) => {
    if (!hasProjectBridge()) {
      showFlash('프로젝트에 연결되어 있지 않아요.')
      return
    }
    const name = c.name.trim() || '이름 없는 인물'
    // conflict: 약점 + 비밀을 한 칸에 (둘 다 있으면 줄바꿈으로 구분).
    const conflict = [c.weakness.trim() && `약점: ${c.weakness.trim()}`, c.secret.trim() && `비밀: ${c.secret.trim()}`]
      .filter(Boolean).join('\n')
    // notes: 관계 + (있으면) 사진 출처를 보존.
    const notes = [
      c.relations.trim() && `관계:\n${c.relations.trim()}`,
      c.photo && c.photoCredit ? `사진 출처: ${c.photoCredit}` : '',
    ].filter(Boolean).join('\n\n')

    const character: Record<string, string> = {}
    const put = (k: string, v: string) => { const t = v.trim(); if (t) character[k] = t }
    put('name', name)
    put('role', c.role)
    put('age', c.age)
    put('appearance', c.appearance)
    put('personality', c.personality)
    put('goal', c.goal)
    if (conflict) character.conflict = conflict
    put('background', c.background)
    put('habits', c.speech) // 말투/습관
    put('etc', c.etc) // 기타
    // 추가 항목(성별·MBTI·키·혈액형·체형·머리·눈·직업·가치관·두려움·습관·출신·취미 등)도 항목별로 보존.
    for (const [k, v] of Object.entries(c.extra || {})) put(k, v)
    if (notes) character.notes = notes

    const meta: Record<string, string> = {}
    if (c.role.trim()) meta['역할'] = c.role.trim()
    if (c.age.trim()) meta['나이'] = c.age.trim()
    if (c.goal.trim()) meta['목표'] = c.goal.trim().split('\n')[0].slice(0, 60)

    const id = addToProject({
      kind: 'character',
      folder: '인물',
      title: name,
      character,
      meta: Object.keys(meta).length ? meta : undefined,
    })
    showFlash(id ? `‘${name}’을(를) 프로젝트 인물 카드로 추가했어요.` : '프로젝트 추가에 실패했어요.')
  }

  // 검색 필터(이름·역할·성격·배경 등 전체 텍스트 대상).
  const q = query.trim().toLowerCase()
  const visible = q
    ? chars.filter((c) =>
        FIELDS.some((f) => c[f.key].toLowerCase().includes(q)),
      )
    : chars

  // 인물의 채워진 필드 수(목록 부제용).
  const filledCount = (c: Character) => FIELDS.filter((f) => f.key !== 'name' && c[f.key].trim()).length

  /* ───────── 스타일 ───────── */
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box' }
  const topbar: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0, background: 'var(--chrome-2)', flexWrap: 'wrap' }
  const titleStyle: React.CSSProperties = { fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, marginRight: 'auto' }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, display: 'flex' }

  const sidebar: React.CSSProperties = { width: 232, flexShrink: 0, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', minHeight: 0, background: 'var(--panel)' }
  const sideHead: React.CSSProperties = { padding: '10px 10px 8px', display: 'flex', flexDirection: 'column', gap: 8, borderBottom: '1px solid var(--border)', flexShrink: 0 }
  const search: React.CSSProperties = { width: '100%', padding: '7px 9px', fontSize: 13, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }
  const listStyle: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }

  const editor: React.CSSProperties = { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: 0 }
  const editScroll: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }
  const editBar: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0, background: 'var(--chrome-2)', flexWrap: 'wrap' }

  const fieldWrap: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 5 }
  const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 5 }
  const inputBase: React.CSSProperties = { width: '100%', padding: '9px 11px', fontSize: 14, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: 1.5 }
  const areaStyle: React.CSSProperties = { ...inputBase, minHeight: 64, resize: 'vertical' }

  const emptyBox: React.CSSProperties = { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--muted)', fontSize: 14, lineHeight: 1.7, padding: 24, gap: 14 }
  const sideEmpty: React.CSSProperties = { padding: '24px 14px', textAlign: 'center', color: 'var(--muted)', fontSize: 13, lineHeight: 1.6 }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }

  // [연계] 라이브러리 가져오기 드롭다운 패널 스타일.
  const importPanel: React.CSSProperties = { position: 'absolute', top: 48, left: 14, zIndex: 20, width: 300, maxHeight: 320, overflowY: 'auto', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.25)', padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }
  const importRow: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, padding: '7px 9px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', cursor: 'pointer', textAlign: 'left' }

  return (
    <div
      style={{
        ...wrap,
        position: 'relative',
        outline: dragOver ? '2px dashed var(--accent)' : 'none',
        outlineOffset: dragOver ? -6 : 0,
      }}
      onDragEnter={(e) => {
        if (!isItemDrag(e)) return
        e.preventDefault()
        dragDepth.current += 1
        setDragOver(true)
      }}
      onDragOver={(e) => { if (isItemDrag(e)) { e.preventDefault() } }}
      onDragLeave={(e) => {
        if (!isItemDrag(e)) return
        dragDepth.current = Math.max(0, dragDepth.current - 1)
        if (dragDepth.current === 0) setDragOver(false)
      }}
      onDrop={handleItemDrop}
    >
      {dragOver && (
        <div
          style={{
            position: 'absolute', inset: 6, zIndex: 50, pointerEvents: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 12, background: 'color-mix(in srgb, var(--accent) 12%, transparent)',
            color: 'var(--accent)', fontSize: 15, fontWeight: 700,
          }}
        >
          <Emoji e="📥" /> 바인더 파일을 놓으면 새 인물로 추가돼요
        </div>
      )}
      <div style={topbar}>
        <div style={titleStyle}><span><Emoji e={meta.icon} /></span><span>인물 시트</span></div>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>인물 {chars.length}명</span>
        <button className="minibtn" onClick={() => setShowImport((v) => !v)} title="공유 라이브러리에서 인물 가져오기"><Emoji e="📥" /> 라이브러리에서 가져오기</button>
        <button className="minibtn" onClick={copyAll} disabled={!chars.length} title="모든 인물을 텍스트로 복사"><Emoji e="📋" /> 전체 복사</button>
        <button className="btn-primary" onClick={addChar}>＋ 인물 추가</button>
      </div>

      {/* [연계] 라이브러리 가져오기 패널 */}
      {showImport && (
        <div style={{ position: 'relative' }}>
          <div style={importPanel}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '2px 4px' }}>
              <span style={{ fontSize: 12, fontWeight: 700 }}><Emoji e="📥" /> 공유 라이브러리 인물</span>
              <span style={{ flex: 1 }} />
              <button className="minibtn" onClick={() => setShowImport(false)} style={{ padding: '2px 7px' }}>닫기</button>
            </div>
            {library.length === 0 ? (
              <div style={{ ...hint, padding: '10px 6px' }}>아직 공유 라이브러리에 저장된 인물이 없어요. 다른 도구(캐릭터 모델 등)에서 저장하거나, 이 시트에서 “라이브러리에 저장”을 눌러 채워보세요.</div>
            ) : (
              library.map((s) => (
                <button key={s.id} style={importRow} onClick={() => importFromLibrary(s)} title="이 인물을 현재 시트로 가져오기">
                  {s.photo && <img src={s.photo} alt="" style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />}
                  <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0, gap: 2 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{(s.name || '(이름 없음)').trim()}</span>
                    <span style={{ fontSize: 11, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {[s.role, s.source].filter(Boolean).join(' · ') || '인물'}
                      {s.photoCredit ? <span className="license-note"> · 사진 {s.photoCredit}</span> : null}
                    </span>
                  </span>
                </button>
              ))
            )}
            <div className="license-note" style={{ padding: '2px 6px' }}>가져온 인물·사진은 영감·출발점으로만 쓰고, 출처가 있으면 함께 표기하세요.</div>
          </div>
        </div>
      )}

      {(note || flash) && (
        <div style={{ padding: '6px 14px', fontSize: 12, color: note ? 'var(--warn)' : 'var(--ok)', background: 'var(--chrome-2)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          {note || flash}
        </div>
      )}

      <div style={body}>
        {/* 좌측: 인물 목록 */}
        <div style={sidebar}>
          <div style={sideHead}>
            <input
              style={search}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="🔍 인물 검색…"
              aria-label="인물 검색"
            />
          </div>

          {chars.length === 0 ? (
            <div style={sideEmpty}>아직 인물이 없어요.<br />위의 <b>＋ 인물 추가</b>를 눌러<br />첫 캐릭터를 만들어 보세요.</div>
          ) : visible.length === 0 ? (
            <div style={sideEmpty}>‘{query}’에 맞는 인물이 없어요.</div>
          ) : (
            <div style={listStyle}>
              {visible.map((c) => {
                const active = c.id === selId
                const idx = chars.findIndex((x) => x.id === c.id)
                const confirming = confirmDel === c.id
                return (
                  <div
                    key={c.id}
                    onClick={() => { setSelId(c.id); setConfirmDel(null) }}
                    style={{
                      border: '1px solid ' + (active ? 'var(--accent)' : 'var(--border)'),
                      background: active ? 'var(--chrome-2)' : 'var(--paper)',
                      borderRadius: 10, padding: '8px 10px', cursor: 'pointer',
                      display: 'flex', flexDirection: 'column', gap: 6,
                      boxShadow: active ? '0 0 0 1px var(--accent) inset' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: c.name.trim() ? 'var(--text)' : 'var(--muted)' }}>
                        {c.name.trim() || '(이름 없음)'}
                      </span>
                      {c.libId && <span className="license-badge" title="공유 라이브러리에 연결됨" style={{ flexShrink: 0 }}><Emoji e="📚" /></span>}
                      {c.role.trim() && <span style={{ fontSize: 11, color: 'var(--muted)', whiteSpace: 'nowrap', maxWidth: 70, overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.role.trim()}</span>}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{filledCount(c)}개 항목 작성됨</div>

                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
                      <button className="minibtn" onClick={() => move(c.id, -1)} disabled={idx <= 0} title="위로" style={{ padding: '3px 7px' }}>▲</button>
                      <button className="minibtn" onClick={() => move(c.id, 1)} disabled={idx >= chars.length - 1} title="아래로" style={{ padding: '3px 7px' }}>▼</button>
                      <button className="minibtn" onClick={() => duplicate(c.id)} title="복제" style={{ padding: '3px 7px' }}>⎘</button>
                      <span style={{ flex: 1 }} />
                      {confirming ? (
                        <>
                          <button className="minibtn" onClick={() => confirmDelete(c.id)} title="정말 삭제" style={{ padding: '3px 7px', color: 'var(--warn)', borderColor: 'var(--warn)' }}>삭제 확정</button>
                          <button className="minibtn" onClick={cancelDelete} title="취소" style={{ padding: '3px 7px' }}>취소</button>
                        </>
                      ) : (
                        <button className="minibtn" onClick={() => requestDelete(c.id)} title="삭제" style={{ padding: '3px 7px' }}><Emoji e="🗑️" /></button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* 우측: 편집 폼 */}
        <div style={editor}>
          {!selected ? (
            <div style={emptyBox}>
              <div style={{ fontSize: 40 }}><Emoji e="🧑‍🎤" /></div>
              <div>
                {chars.length === 0
                  ? <>등록된 인물이 없습니다.<br /><b>＋ 인물 추가</b>로 첫 캐릭터를 시작하세요.</>
                  : <>왼쪽 목록에서 인물을 선택하면<br />여기서 자세히 편집할 수 있어요.</>}
              </div>
              {chars.length === 0 && <button className="btn-primary" onClick={addChar}>＋ 첫 인물 만들기</button>}
            </div>
          ) : (
            <>
              <div style={editBar}>
                <span style={{ fontSize: 13, fontWeight: 600, marginRight: 'auto', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {selected.name.trim() || '(이름 없는 인물)'}
                </span>
                <button className="minibtn" onClick={() => saveToLibrary(selected)} title="이 인물을 공유 라이브러리에 저장하거나, 연결된 경우 업데이트합니다">
                  {selected.libId && library.some((x) => x.id === selected.libId) ? <><Emoji e="📚" /> 라이브러리 업데이트</> : <><Emoji e="📚" /> 라이브러리에 저장</>}
                </button>
                <button className="minibtn" onClick={() => copyOne(selected)} title="이 인물을 텍스트로 복사"><Emoji e="📋" /> 복사</button>
                <button className="minibtn" onClick={() => duplicate(selected.id)} title="이 인물 복제">⎘ 복제</button>
                {confirmDel === selected.id ? (
                  <>
                    <button className="minibtn" onClick={() => confirmDelete(selected.id)} style={{ color: 'var(--warn)', borderColor: 'var(--warn)' }}>삭제 확정</button>
                    <button className="minibtn" onClick={cancelDelete}>취소</button>
                  </>
                ) : (
                  <button className="minibtn" onClick={() => requestDelete(selected.id)} title="이 인물 삭제"><Emoji e="🗑️" /> 삭제</button>
                )}
              </div>

              <div style={editScroll}>
                {/* [연계] 저작권 안전 이미지(공유 라이브러리에서 가져온 사진)는 출처와 함께만 표기 */}
                {selected.photo && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <img src={selected.photo} alt={selected.name.trim() || '인물 사진'} style={{ width: 64, height: 64, borderRadius: 10, objectFit: 'cover', border: '1px solid var(--border)', flexShrink: 0 }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                      <span style={{ fontSize: 12, color: 'var(--muted)' }}>라이브러리 사진(참고용)</span>
                      {selected.photoCredit
                        ? <span className="license-note">출처: {selected.photoCredit}</span>
                        : <span className="license-note">출처 미상 — 그대로 베끼지 말고 영감으로만 쓰세요.</span>}
                    </div>
                  </div>
                )}
                {FIELDS.map((f) => (
                  <div key={f.key} style={fieldWrap}>
                    <label style={labelStyle}><span><Emoji e={f.icon} /></span><span>{f.label}</span></label>
                    {f.multi ? (
                      <textarea
                        style={areaStyle}
                        value={selected[f.key]}
                        onChange={(e) => updateField(f.key, e.target.value)}
                        placeholder={f.placeholder}
                        rows={3}
                      />
                    ) : (
                      <input
                        style={inputBase}
                        value={selected[f.key]}
                        onChange={(e) => updateField(f.key, e.target.value)}
                        placeholder={f.placeholder}
                        maxLength={120}
                      />
                    )}
                  </div>
                ))}

                {/* [연계] 사용자 정의/다른 도구에서 받은 항목 — 손실 없이 보존·편집. 직접 항목 추가도 가능. */}
                <div style={fieldWrap}>
                  <label style={labelStyle}><span><Emoji e="🧩" /></span><span>추가 항목{selected.extra && Object.keys(selected.extra).length ? ` (${Object.keys(selected.extra).length})` : ''}</span></label>
                  {selected.extra && Object.keys(selected.extra).length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 9, padding: 10, marginBottom: 6 }}>
                      {Object.entries(selected.extra).map(([k, v]) => (
                        <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ flex: '0 0 96px', fontSize: 12, color: 'var(--accent)', fontWeight: 600 }} title={k}>{emojify(CHARACTER_FIELD_LABEL[k] || k)}</span>
                          <input style={{ ...inputBase, padding: '6px 9px', fontSize: 13 }} value={v} onChange={(e) => updateExtra(k, e.target.value)} placeholder="내용 입력…" />
                          <button className="minibtn" title="이 항목 삭제" onClick={() => removeExtra(k)} style={{ flexShrink: 0 }}>✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                  <button className="minibtn" onClick={addExtraField} style={{ alignSelf: 'flex-start' }}>＋ 항목 추가</button>
                </div>

                {/* [프로젝트] 현재 인물을 프로젝트 바인더에 인물 카드로 추가 */}
                <div className="linkbar" style={{ marginTop: 4 }}>
                  <span className="linkbar-label">프로젝트:</span>
                  <button
                    className="linkbtn"
                    onClick={() => addCharToProject(selected)}
                    disabled={!bridgeOn}
                    title={bridgeOn ? '이 인물을 프로젝트의 “인물” 폴더에 인물 카드로 추가' : '프로젝트에 연결되어 있지 않습니다'}
                  ><Emoji e="📄" /> 프로젝트에 인물 카드 추가</button>
                </div>

                {/* [연계] 관련 도구로 이동(현재 인물 데이터와 함께) */}
                <div className="linkbar" style={{ marginTop: 4 }}>
                  <span className="linkbar-label">연계:</span>
                  <button className="linkbtn" onClick={() => openWithChar('relationship-map', selected)} title="이 인물로 관계도 열기"><Emoji e="🕸️" /> 관계도</button>
                  <button className="linkbtn" onClick={() => openWithChar('pov-tracker', selected)} title="이 인물로 시점 추적기 열기"><Emoji e="🎯" /> 시점 추적기</button>
                  <button className="linkbtn" onClick={() => openWithChar('name-mixer', selected)} title="이름 믹서 열기"><Emoji e="🎲" /> 이름 믹서</button>
                  <button className="linkbtn" onClick={() => openWithChar('name-analyzer', selected)} title="이름 분석 열기"><Emoji e="🪪" /> 이름 분석</button>
                </div>

                <div style={hint}>입력하는 즉시 이 브라우저에 자동 저장됩니다. <Emoji e="📚" /> 라이브러리에 저장하면 다른 도구(관계도·캐릭터 모델 등)와 인물을 공유할 수 있어요.</div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
