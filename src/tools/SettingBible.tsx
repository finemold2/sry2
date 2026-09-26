// 배경 설정집 — 작품 세계의 장소를 카드로 정리하는 설정 바이블.
// 좌측: 장소 목록(선택·검색·순서 이동·추가·삭제). 우측: 선택 장소 편집(이름/유형/분위기/역사/규칙·관습/오감 묘사/주요 사건).
// 모든 데이터는 localStorage('sry:tool:setting-bible')에 JSON으로 자동 저장/복원.
// 연계: 장소마다 저작권 안전한 이미지(갤러리 픽 / 이미지 라이브러리)를 첨부하고,
//   장소를 공유 라이브러리에 저장/가져오기, 감각 묘사 팔레트 열기 등으로 다른 도구와 이어진다.
// import 는 react 와 './linkbus' 만 사용한다(다른 모듈 금지).
import { useEffect, useRef, useState } from 'react'
import {
  openToolLinked,
  requestImagePick,
  useLibraryList,
  addToLibrary,
  updateInLibrary,
  addToProject,
  hasProjectBridge,
  TOOL_RELATIONS,
  getDragItem,
  isItemDrag,
  PLACE_FIELD_LABEL,
  Emoji,
  emojify,
  type SharedImage,
  type SharedPlace,
} from './linkbus'

export const meta = { id: 'setting-bible', name: '배경 설정집', icon: '🗺️', group: '구상·정리', intro: '작품 세계의 장소를 카드로 정리하는 설정 바이블', w: 680, h: 600 }

const LS_KEY = 'sry:tool:setting-bible'

const TYPES = ['도시', '마을', '건물', '자연', '지하·던전', '왕국·국가', '이세계·차원', '바다·하늘', '기타'] as const

// 관련 도구 이름표(연계 버튼 라벨용) — 알 수 없는 id 는 그대로 표시.
const RELATION_LABELS: Record<string, string> = {
  'imagination-gallery': '🖼 상상력 갤러리',
  'met-museum-art': '🖼️ 메트 명작',
  'moodboard-grid': '🧩 무드보드',
  'sensory-palette': '🌫 감각 팔레트',
  'scene-list': '🎬 장면 플래너',
  'world-wiki': '📚 세계관 위키',
}

interface Sense {
  sight: string
  sound: string
  smell: string
  taste: string
  touch: string
}

interface Place {
  id: string
  name: string
  type: string
  mood: string
  history: string
  rules: string
  senses: Sense
  events: string[]
  image: string        // 첨부 이미지 URL (저작권 안전: 생성형/PD/CC0/라이선스 명시)
  imageCredit: string  // 출처·작가·라이선스 표기
  updatedAt: number
  libId?: string       // [연계] 공유 라이브러리에 저장한 경우의 원본 id(중복 저장 대신 갱신용)
  // [연계] 기본 칸에 없는 정규 항목(지형/기후/문화/거주민/위험/랜드마크/비밀 등)을 손실 없이 보존.
  extra?: Record<string, string>
}

// 설정집 기본 칸 키 ↔ 정규(linkbus PLACE_FIELDS) 키. type↔kind, mood↔atmosphere.
const PLACE_PRIMARY_CANON: Record<string, string> = { name: 'name', type: 'kind', mood: 'atmosphere', history: 'history', rules: 'rules' }
const PLACE_CANON_TO_PRIMARY: Record<string, string> = Object.fromEntries(Object.entries(PLACE_PRIMARY_CANON).map(([p, c]) => [c, p]))
const PLACE_CONSUMED = new Set(['id', 'name', 'kind', 'type', 'mood', 'atmosphere', 'image', 'imageCredit', 'history', 'rules', 'sensory', 'notes', 'fields', 'source', 'description', 'location'])
// 정규/임의 필드맵에서 기본 칸에 없는 항목만 골라 extra 로(손실 0).
function placeExtraFrom(obj: Record<string, unknown> | undefined, fields?: Record<string, unknown>): Record<string, string> {
  const extra: Record<string, string> = {}
  const add = (k: string, raw: unknown) => { const v = typeof raw === 'string' ? raw.trim() : ''; if (v && !PLACE_CONSUMED.has(k) && !PLACE_CANON_TO_PRIMARY[k] && !extra[k]) extra[k] = v }
  if (fields) for (const [k, v] of Object.entries(fields)) add(k, v)
  if (obj) for (const [k, v] of Object.entries(obj)) add(k, v)
  return extra
}

function newId(): string {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  } catch {}
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function emptySenses(): Sense {
  return { sight: '', sound: '', smell: '', taste: '', touch: '' }
}

function makePlace(name = ''): Place {
  return {
    id: newId(),
    name,
    type: TYPES[0],
    mood: '',
    history: '',
    rules: '',
    senses: emptySenses(),
    events: [],
    image: '',
    imageCredit: '',
    updatedAt: Date.now(),
    extra: {},
  }
}

// 라이선스 표기 문자열 구성 — credit + license 를 사람이 읽기 쉽게 합친다.
function buildCredit(credit?: string, license?: string): string {
  const c = (credit || '').trim()
  const l = (license || '').trim()
  if (c && l) {
    // license 가 credit 에 이미 포함돼 있으면 중복 표기 방지
    return c.toLowerCase().includes(l.toLowerCase()) ? c : `${c} · ${l}`
  }
  return c || l || ''
}

// localStorage 복원 — 미지원/차단/손상 시 빈 배열로 graceful 처리. 누락 필드는 기본값 보강.
function loadPlaces(): Place[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((x) => x && typeof x === 'object')
      .map((x: any) => {
        const s = x.senses && typeof x.senses === 'object' ? x.senses : {}
        return {
          id: String(x.id || newId()),
          name: typeof x.name === 'string' ? x.name : '',
          type: typeof x.type === 'string' ? x.type : TYPES[0],
          mood: typeof x.mood === 'string' ? x.mood : '',
          history: typeof x.history === 'string' ? x.history : '',
          rules: typeof x.rules === 'string' ? x.rules : '',
          senses: {
            sight: typeof s.sight === 'string' ? s.sight : '',
            sound: typeof s.sound === 'string' ? s.sound : '',
            smell: typeof s.smell === 'string' ? s.smell : '',
            taste: typeof s.taste === 'string' ? s.taste : '',
            touch: typeof s.touch === 'string' ? s.touch : '',
          },
          events: Array.isArray(x.events) ? x.events.filter((e: any) => typeof e === 'string') : [],
          image: typeof x.image === 'string' ? x.image : '',
          imageCredit: typeof x.imageCredit === 'string' ? x.imageCredit : '',
          updatedAt: typeof x.updatedAt === 'number' ? x.updatedAt : Date.now(),
          libId: typeof x.libId === 'string' ? x.libId : undefined,
          extra: x.extra && typeof x.extra === 'object' && !Array.isArray(x.extra)
            ? Object.fromEntries(Object.entries(x.extra as Record<string, unknown>).filter(([, v]) => typeof v === 'string').map(([k, v]) => [k, String(v)]))
            : {},
        } as Place
      })
  } catch {
    return []
  }
}

const SENSE_FIELDS: { key: keyof Sense; label: string; icon: string; ph: string }[] = [
  { key: 'sight', label: '시각', icon: '👁️', ph: '눈에 들어오는 색·빛·풍경…' },
  { key: 'sound', label: '청각', icon: '👂', ph: '들리는 소리·울림·정적…' },
  { key: 'smell', label: '후각', icon: '👃', ph: '코를 스치는 냄새·향…' },
  { key: 'taste', label: '미각', icon: '👅', ph: '입안에 도는 맛·공기의 맛…' },
  { key: 'touch', label: '촉각', icon: '🤚', ph: '피부에 닿는 온도·질감·바람…' },
]

// 'sensory'(시각: …/청각: …/…) 문자열을 오감 5칸으로 역파싱(라이브러리 왕복 시 손실 0).
const SENSE_LABEL_KEY: Record<string, keyof Sense> = { '시각': 'sight', '청각': 'sound', '후각': 'smell', '미각': 'taste', '촉각': 'touch' }
function parseSensory(s: string): Partial<Sense> {
  const out: Partial<Sense> = {}
  for (const part of (s || '').split(/\s*\/\s*/)) {
    const m = part.match(/\s*(시각|청각|후각|미각|촉각)\s*[:：]\s*(.+)/)
    if (m) out[SENSE_LABEL_KEY[m[1]]] = m[2].trim()
  }
  return out
}

function placeToText(p: Place): string {
  const L: string[] = []
  L.push(`# ${p.name || '(이름 없음)'}`)
  L.push(`유형: ${p.type}`)
  if (p.image.trim()) {
    L.push(`\n[이미지]\n${p.image.trim()}${p.imageCredit.trim() ? `\n출처: ${p.imageCredit.trim()}` : ''}`)
  }
  if (p.mood.trim()) L.push(`\n[분위기]\n${p.mood.trim()}`)
  if (p.history.trim()) L.push(`\n[역사]\n${p.history.trim()}`)
  if (p.rules.trim()) L.push(`\n[규칙·관습]\n${p.rules.trim()}`)
  const senseLines = SENSE_FIELDS.filter((f) => p.senses[f.key].trim()).map((f) => `- ${f.label}: ${p.senses[f.key].trim()}`)
  if (senseLines.length) L.push(`\n[오감 묘사]\n${senseLines.join('\n')}`)
  const evs = p.events.filter((e) => e.trim())
  if (evs.length) L.push(`\n[주요 사건]\n${evs.map((e, i) => `${i + 1}. ${e.trim()}`).join('\n')}`)
  for (const [k, v] of Object.entries(p.extra || {})) { const t = (v || '').trim(); if (t) L.push(`\n[${PLACE_FIELD_LABEL[k] || k}]\n${t}`) }
  return L.join('\n')
}

// Place → SharedPlace 변환(라이브러리 공유 저장용)
function toSharedPlace(p: Place): Omit<SharedPlace, 'updated'> {
  const senseLines = SENSE_FIELDS.filter((f) => p.senses[f.key].trim()).map((f) => `${f.label}: ${p.senses[f.key].trim()}`)
  // 정규 fields(기본 칸 + 추가 항목) — 손실 없는 표준 전달.
  const fields: Record<string, string> = {}
  const putF = (canon: string, v: string) => { const t = (v || '').trim(); if (t) fields[canon] = t }
  putF('name', p.name); putF('kind', p.type); putF('atmosphere', p.mood); putF('history', p.history); putF('rules', p.rules)
  if (senseLines.length) putF('sensory', senseLines.join(' / '))
  for (const [k, v] of Object.entries(p.extra || {})) putF(k, v)
  return {
    id: p.id,
    name: p.name || '(이름 없는 장소)',
    kind: p.type,
    mood: p.mood,
    image: p.image || undefined,
    imageCredit: p.imageCredit || undefined,
    history: p.history,
    rules: p.rules,
    sensory: senseLines.join(' / '),
    notes: p.events.filter((e) => e.trim()).join('\n'),
    fields: Object.keys(fields).length ? fields : undefined,
    source: '배경 설정집',
  }
}

export default function SettingBible({ payload }: { payload?: Record<string, unknown> }) {
  const [places, setPlaces] = useState<Place[]>(() => loadPlaces())
  const [selectedId, setSelectedId] = useState<string>(() => {
    const init = loadPlaces()
    return init.length ? init[0].id : ''
  })
  const [query, setQuery] = useState('')
  const [confirmDel, setConfirmDel] = useState<string>('') // 삭제 확인 대기 중인 장소 id
  const [eventDraft, setEventDraft] = useState('')
  const [note, setNote] = useState('')
  const [copied, setCopied] = useState('')
  const [showLibImages, setShowLibImages] = useState(false) // 이미지 라이브러리 썸네일 picker 열림
  const [showLibPlaces, setShowLibPlaces] = useState(false) // 장소 라이브러리 가져오기 picker 열림
  const [dropActive, setDropActive] = useState(false)       // 바인더 파일 드래그 진입 시 시각 피드백
  const dragDepth = useRef(0)                                // 자식 요소 경유 시 onDragEnter/Leave 중복 보정
  const mounted = useRef(true)
  const copyTimer = useRef<number | null>(null)
  const pickNonce = useRef(0)        // 이미지 픽 경쟁상태 방지(가장 마지막 요청만 반영)
  const payloadDone = useRef(false)  // payload.image 1회만 소비
  const placeDone = useRef(false)    // payload.place 1회만 소비

  // 공유 라이브러리 구독(자동 리렌더)
  const libImages = useLibraryList('images')
  const libPlaces = useLibraryList('places')

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      pickNonce.current++ // 진행 중인 픽 콜백 무효화
      if (copyTimer.current) { clearTimeout(copyTimer.current); copyTimer.current = null }
    }
  }, [])

  // 변경 시 자동 저장 — 차단/용량초과 시 안내만 하고 동작은 유지.
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(places))
    } catch {
      if (mounted.current) setNote('이 브라우저에서 저장이 막혀 있어 새로고침하면 내용이 사라질 수 있어요.')
    }
  }, [places])

  const selected = places.find((p) => p.id === selectedId) || null

  // 선택 장소가 사라지면(삭제 등) 안전하게 첫 장소로 보정.
  useEffect(() => {
    if (selectedId && !places.some((p) => p.id === selectedId)) {
      setSelectedId(places.length ? places[0].id : '')
    }
    setConfirmDel('')
    setEventDraft('')
  }, [selectedId, places])

  // payload.image 들어오면(다른 도구가 이미지와 함께 열어준 경우) — 현재 장소 또는 새 장소에 1회 첨부.
  useEffect(() => {
    if (payloadDone.current) return
    const img = payload && typeof payload.image === 'string' ? (payload.image as string) : ''
    if (!img) return
    payloadDone.current = true
    const credit = buildCredit(
      typeof payload?.imageCredit === 'string' ? (payload!.imageCredit as string) : (typeof payload?.credit === 'string' ? (payload!.credit as string) : ''),
      typeof payload?.license === 'string' ? (payload!.license as string) : '',
    )
    setPlaces((prev) => {
      if (selectedId && prev.some((p) => p.id === selectedId)) {
        return prev.map((p) => (p.id === selectedId ? { ...p, image: img, imageCredit: credit, updatedAt: Date.now() } : p))
      }
      // 선택 장소가 없으면 이미지가 첨부된 새 장소 생성
      const np = makePlace()
      np.image = img
      np.imageCredit = credit
      if (mounted.current) setSelectedId(np.id)
      return [...prev, np]
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload])

  // payload.place 로 들어온 장소(다른 도구가 장소 데이터와 함께 열어준 경우) — 새 장소로 1회 추가(손실 없이 extra/오감 복원).
  useEffect(() => {
    if (placeDone.current) return
    const pl = payload && typeof payload.place === 'object' && payload.place ? (payload.place as SharedPlace) : null
    if (!pl) return
    placeDone.current = true
    importPlace({ ...pl, id: pl.id || newId() })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload])

  const flashCopied = (msg: string) => {
    setCopied(msg)
    if (copyTimer.current) clearTimeout(copyTimer.current)
    copyTimer.current = window.setTimeout(() => { if (mounted.current) setCopied('') }, 1600)
  }

  const copyText = async (text: string, okMsg: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        const ta = document.createElement('textarea')
        ta.value = text
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
      flashCopied(okMsg)
    } catch {
      flashCopied('복사에 실패했어요. 직접 선택해 복사하세요.')
    }
  }

  const addPlace = () => {
    const p = makePlace()
    setPlaces((prev) => [...prev, p])
    setSelectedId(p.id)
    setQuery('')
  }

  const patch = (id: string, fields: Partial<Place>) => {
    setPlaces((prev) => prev.map((p) => (p.id === id ? { ...p, ...fields, updatedAt: Date.now() } : p)))
  }

  const patchSense = (id: string, key: keyof Sense, value: string) => {
    setPlaces((prev) => prev.map((p) => (p.id === id ? { ...p, senses: { ...p.senses, [key]: value }, updatedAt: Date.now() } : p)))
  }

  const removePlace = (id: string) => {
    setPlaces((prev) => prev.filter((p) => p.id !== id))
  }

  const move = (id: string, dir: -1 | 1) => {
    setPlaces((prev) => {
      const i = prev.findIndex((p) => p.id === id)
      if (i < 0) return prev
      const j = i + dir
      if (j < 0 || j >= prev.length) return prev
      const next = prev.slice()
      const tmp = next[i]
      next[i] = next[j]
      next[j] = tmp
      return next
    })
  }

  const addEvent = () => {
    if (!selected) return
    const t = eventDraft.trim()
    if (!t) return
    patch(selected.id, { events: [...selected.events, t] })
    setEventDraft('')
  }

  const editEvent = (idx: number, value: string) => {
    if (!selected) return
    const next = selected.events.slice()
    next[idx] = value
    patch(selected.id, { events: next })
  }

  const removeEvent = (idx: number) => {
    if (!selected) return
    patch(selected.id, { events: selected.events.filter((_, i) => i !== idx) })
  }

  const moveEvent = (idx: number, dir: -1 | 1) => {
    if (!selected) return
    const j = idx + dir
    if (j < 0 || j >= selected.events.length) return
    const next = selected.events.slice()
    const tmp = next[idx]
    next[idx] = next[j]
    next[j] = tmp
    patch(selected.id, { events: next })
  }

  const exportAll = () => {
    if (!places.length) return
    const text = places.map(placeToText).join('\n\n' + '─'.repeat(28) + '\n\n')
    copyText(text, `전체 ${places.length}개 장소를 복사했어요`)
  }

  // ── 연계: 이미지 첨부 ──
  // 갤러리 도구를 열어 사진을 고르게 한 뒤, 고른 이미지를 현재 장소에 첨부(라이선스 표기 포함).
  const pickFromGallery = () => {
    if (!selected) return
    const targetId = selected.id
    const my = ++pickNonce.current
    requestImagePick({
      requesterId: 'setting-bible',
      onPick: (img: SharedImage) => {
        // 언마운트/다른 요청으로 무효화된 콜백은 무시(경쟁상태 방지)
        if (!mounted.current || my !== pickNonce.current) return
        const credit = buildCredit(img.credit, img.license)
        patch(targetId, { image: img.url, imageCredit: credit })
        flashCopied('갤러리 이미지를 첨부했어요')
      },
    })
  }

  // 이미지 라이브러리 썸네일에서 선택 → 현재 장소에 첨부
  const attachLibImage = (img: SharedImage) => {
    if (!selected) return
    patch(selected.id, { image: img.url, imageCredit: buildCredit(img.credit, img.license) })
    setShowLibImages(false)
    flashCopied('라이브러리 이미지를 첨부했어요')
  }

  const clearImage = () => {
    if (!selected) return
    patch(selected.id, { image: '', imageCredit: '' })
  }

  // ── 연계: 장소 공유 라이브러리 ──
  // 현재 장소를 공유 라이브러리에 저장(처음) 또는 갱신(이미 연결된 경우) — 중복 저장 방지.
  const shareToLibrary = () => {
    if (!selected) return
    const sp = toSharedPlace(selected)
    if (selected.libId && libPlaces.some((x) => x.id === selected.libId)) {
      updateInLibrary('places', selected.libId, sp)
      flashCopied('라이브러리의 장소를 갱신했어요')
    } else {
      const rec = addToLibrary('places', sp)
      patch(selected.id, { libId: rec.id })
      flashCopied('장소를 라이브러리에 저장했어요')
    }
  }

  // ── 연계: 프로젝트 바인더에 장소 카드 추가 ──
  // 현재 선택된 장소를 setting 카드로 프로젝트(좌측 파일구조/DB/캔버스)에 추가.
  const addPlaceToProject = () => {
    if (!selected || !hasProjectBridge()) return
    const name = (selected.name || '').trim() || '(이름 없는 장소)'

    // 오감 묘사 요약(있으면 description 보강용)
    const senseLines = SENSE_FIELDS.filter((f) => selected.senses[f.key].trim()).map((f) => `${f.label}: ${selected.senses[f.key].trim()}`)

    // description: 분위기/오감 묘사 + 첨부 이미지가 있으면 출처와 함께 언급
    const descParts: string[] = []
    if (selected.mood.trim()) descParts.push(selected.mood.trim())
    if (senseLines.length) descParts.push(`오감 묘사 — ${senseLines.join(' / ')}`)
    if (selected.image.trim()) {
      const credit = selected.imageCredit.trim()
      descParts.push(`첨부 이미지: ${selected.image.trim()}${credit ? ` (출처: ${credit})` : ' (출처 미상)'}`)
    }
    const description = descParts.join('\n\n')

    // 규칙·관습 + 주요 사건을 notes 로 묶음
    const eventLines = selected.events.filter((e) => e.trim()).map((e, i) => `${i + 1}. ${e.trim()}`)
    const noteParts: string[] = []
    if (selected.rules.trim()) noteParts.push(`규칙·관습\n${selected.rules.trim()}`)
    if (eventLines.length) noteParts.push(`주요 사건\n${eventLines.join('\n')}`)
    const notes = noteParts.join('\n\n')

    // setting 필드맵: name, type, location, atmosphere, description, history, role, notes
    const character: Record<string, string> = { name }
    if (selected.type) character.type = selected.type
    if (selected.mood.trim()) character.atmosphere = selected.mood.trim()
    if (description) character.description = description
    if (selected.history.trim()) character.history = selected.history.trim()
    // 추가 항목(지형·기후·문화·거주민·위험·랜드마크·비밀 등)도 항목별로 보존.
    for (const [k, v] of Object.entries(selected.extra || {})) { const t = (v || '').trim(); if (t && !character[k]) character[k] = t }
    if (notes) character.notes = notes

    // DB 뷰 커스텀 열
    const meta: Record<string, string> = {}
    if (selected.type) meta['유형'] = selected.type
    if (selected.mood.trim()) meta['분위기'] = selected.mood.trim().replace(/\s+/g, ' ').slice(0, 80)
    if (selected.events.filter((e) => e.trim()).length) meta['주요 사건'] = String(selected.events.filter((e) => e.trim()).length)
    if (selected.image.trim()) meta['이미지'] = '있음'

    const id = addToProject({
      kind: 'setting',
      folder: '장소',
      title: name,
      character,
      meta: Object.keys(meta).length ? meta : undefined,
    })
    if (id) {
      flashCopied('프로젝트에 장소 카드를 추가했어요')
    } else {
      flashCopied('프로젝트 연동이 되어 있지 않아요')
    }
  }

  // 공유 라이브러리의 장소를 이 설정집으로 가져오기(SharedPlace → Place).
  const importPlace = (sp: SharedPlace) => {
    const np = makePlace(sp.name || '')
    np.type = TYPES.includes(sp.kind as typeof TYPES[number]) ? (sp.kind as string) : (sp.kind || TYPES[0])
    np.mood = sp.mood || ''
    np.history = sp.history || ''
    np.rules = sp.rules || ''
    np.image = sp.image || ''
    np.imageCredit = sp.imageCredit || ''
    np.libId = sp.id // 가져온 장소는 라이브러리 원본과 연결 → 다시 저장 시 갱신
    if (sp.notes) np.events = sp.notes.split('\n').map((e) => e.trim()).filter(Boolean)
    // 오감 복원(저장 시 합쳐졌던 sensory 를 5칸으로 역파싱). 라벨 패턴이 아니면 손실 없이 보존.
    const sensoryStr = sp.sensory || (sp.fields && typeof sp.fields.sensory === 'string' ? sp.fields.sensory : '')
    if (sensoryStr) {
      const parsed = parseSensory(sensoryStr)
      if (Object.keys(parsed).length) np.senses = { ...np.senses, ...parsed }
      else if (!np.senses.sight) np.senses = { ...np.senses, sight: sensoryStr } // 라벨 없는 자유 감각문은 시각 칸에 보존
    }
    // 정규 fields 로 기본 칸 보강(비어있을 때만) + 나머지는 손실 없이 extra 로.
    const f = sp.fields
    if (f) {
      if (!np.mood && typeof f.atmosphere === 'string') np.mood = f.atmosphere
      if (!np.history && typeof f.history === 'string') np.history = f.history
      if (!np.rules && typeof f.rules === 'string') np.rules = f.rules
      if ((!np.type || np.type === TYPES[0]) && typeof f.kind === 'string') np.type = f.kind
    }
    np.extra = placeExtraFrom(sp as unknown as Record<string, unknown>, sp.fields)
    setPlaces((prev) => [...prev, np])
    setSelectedId(np.id)
    setShowLibPlaces(false)
    setQuery('')
    flashCopied('라이브러리에서 장소를 가져왔어요')
  }

  // ── 연계: 바인더 파일을 도구창에 드롭 → 새 장소로 추가 ──
  // 장소/문서 카드를 끌어다 놓으면 name/설명을 채운 새 장소를 만든다(이미지 필드는 건드리지 않음).
  const handleDropItem = (it: ReturnType<typeof getDragItem>) => {
    if (!it) return
    const ch = it.character
    // 이름: 장소/인물 카드면 character.name, 없으면 문서 제목
    const name = ((ch && typeof ch.name === 'string' ? ch.name : '') || it.title || '').trim()
    // 설명: 장소 카드면 character.description, 일반 문서면 본문 앞부분
    const descSrc = (ch && typeof ch.description === 'string' ? ch.description : '') || it.text || ''
    const np = makePlace(name)
    np.history = (descSrc || '').slice(0, 4000).trim()
    // 카드의 정규/임의 키도 손실 없이 보존.
    if (ch && typeof ch === 'object') {
      const g = (k: string) => (typeof ch[k] === 'string' ? (ch[k] as string).trim() : '')
      if (!np.mood) np.mood = g('atmosphere') || g('mood')
      if (!np.type || np.type === TYPES[0]) { const t = g('kind') || g('type'); if (t) np.type = t }
      if (!np.rules) np.rules = g('rules')
      np.extra = placeExtraFrom(ch as Record<string, unknown>)
    }
    setPlaces((prev) => [...prev, np])
    setSelectedId(np.id)
    setQuery('')
    setShowLibPlaces(false)
    flashCopied(`"${name || '문서'}"을(를) 새 장소로 추가했어요`)
  }

  // 감각 묘사 팔레트 열기(연계)
  const openSensory = () => openToolLinked('sensory-palette')

  // 관련 도구 열기(연계 버튼) — 장소를 페이로드로 함께 전달.
  const openRelated = (toolId: string) => {
    const p: Record<string, unknown> = {}
    if (selected) {
      p.place = toSharedPlace(selected)
      if (selected.name) p.query = selected.name
    }
    openToolLinked(toolId, p)
  }

  const relations = TOOL_RELATIONS['setting-bible'] || []

  const filtered = query.trim()
    ? places.filter((p) => {
        const q = query.trim().toLowerCase()
        return (p.name || '').toLowerCase().includes(q) || (p.type || '').toLowerCase().includes(q) || (p.mood || '').toLowerCase().includes(q)
      })
    : places

  // ── 스타일 ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', fontSize: 14 }
  const head: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0 }
  const headTitle: React.CSSProperties = { fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 7 }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, display: 'flex' }
  const leftCol: React.CSSProperties = { width: 232, flexShrink: 0, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', minHeight: 0, background: 'var(--chrome-2)' }
  const leftHead: React.CSSProperties = { padding: 10, display: 'flex', flexDirection: 'column', gap: 8, borderBottom: '1px solid var(--border)', flexShrink: 0 }
  const search: React.CSSProperties = { width: '100%', padding: '7px 9px', fontSize: 13, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }
  const listWrap: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }
  const rightCol: React.CSSProperties = { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: 0 }
  const editScroll: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }
  const label: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 5, display: 'flex', alignItems: 'center', gap: 5 }
  const input: React.CSSProperties = { width: '100%', padding: '9px 11px', fontSize: 14, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }
  const area: React.CSSProperties = { ...input, resize: 'vertical', minHeight: 64, lineHeight: 1.55, fontFamily: 'inherit' }
  const empty: React.CSSProperties = { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--muted)', lineHeight: 1.7, padding: 24, gap: 12 }
  const sectionTitle: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6, paddingBottom: 2 }
  const panel: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }
  const tinyBtn: React.CSSProperties = { border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--muted)', cursor: 'pointer', fontSize: 12, lineHeight: 1, padding: '4px 6px', borderRadius: 6 }
  const linkbar: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }
  const linkbtn: React.CSSProperties = { border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', cursor: 'pointer', fontSize: 12, lineHeight: 1.2, padding: '6px 9px', borderRadius: 8 }
  const licenseNote: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', lineHeight: 1.5, wordBreak: 'break-word' }
  const thumb: React.CSSProperties = { width: 64, height: 48, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border)', cursor: 'pointer', display: 'block' }

  return (
    <div
      style={dropActive ? { ...wrap, outline: '2px dashed var(--accent)', outlineOffset: -4 } : wrap}
      onDragEnter={(e) => {
        if (!isItemDrag(e)) return
        e.preventDefault()
        dragDepth.current++
        setDropActive(true)
      }}
      onDragOver={(e) => { if (isItemDrag(e)) { e.preventDefault() } }}
      onDragLeave={(e) => {
        if (!isItemDrag(e)) return
        dragDepth.current = Math.max(0, dragDepth.current - 1)
        if (dragDepth.current === 0) setDropActive(false)
      }}
      onDrop={(e) => {
        dragDepth.current = 0
        setDropActive(false)
        const it = getDragItem(e)
        if (it) { e.preventDefault(); handleDropItem(it) }
      }}
    >
      <div style={head}>
        <span style={headTitle}><Emoji e="🗺️" /> 배경 설정집</span>
        <span style={{ color: 'var(--muted)', fontSize: 12 }}>장소 {places.length}곳</span>
        <span style={{ flex: 1 }} />
        {copied && <span style={{ fontSize: 12, color: 'var(--ok)' }}>{copied}</span>}
        <button className="minibtn" onClick={exportAll} disabled={!places.length} title="모든 장소를 텍스트로 복사"><Emoji e="📋" /> 전체 내보내기</button>
      </div>

      {note && <div style={{ padding: '8px 14px', fontSize: 12, color: 'var(--warn)', borderBottom: '1px solid var(--border)' }}>{note}</div>}

      <div style={body}>
        {/* 좌측 목록 */}
        <div style={leftCol}>
          <div style={leftHead}>
            <button className="btn-primary" onClick={addPlace} style={{ width: '100%' }}>＋ 새 장소</button>
            <button className="minibtn" onClick={() => setShowLibPlaces((v) => !v)} style={{ width: '100%' }} title="공유 라이브러리에서 장소 가져오기">
              <Emoji e="📥" /> 라이브러리에서 가져오기{libPlaces.length ? ` (${libPlaces.length})` : ''}
            </button>
            <input
              style={search}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="🔍 이름·유형·분위기 검색"
              aria-label="장소 검색"
            />
          </div>

          {/* 라이브러리 장소 가져오기 패널 */}
          {showLibPlaces && (
            <div style={{ padding: 10, borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 220, overflowY: 'auto', background: 'var(--paper)' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>공유 라이브러리의 장소</div>
              {libPlaces.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>아직 공유된 장소가 없어요. 편집 화면의 <b><Emoji e="🔗" /> 라이브러리에 저장</b>으로 먼저 공유하세요.</div>
              ) : (
                libPlaces.map((sp) => {
                  const already = places.some((p) => p.libId === sp.id)
                  return (
                    <button
                      key={sp.id}
                      className="minibtn"
                      style={{ textAlign: 'left', justifyContent: 'flex-start', opacity: already ? 0.55 : 1, cursor: already ? 'default' : 'pointer' }}
                      onClick={() => { if (!already) importPlace(sp) }}
                      disabled={already}
                      title={already ? '이미 이 설정집에 추가된 장소예요' : '이 장소를 가져오기'}
                    >
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><Emoji e="📍" /> {sp.name || '(이름 없음)'}{sp.kind ? ` · ${sp.kind}` : ''}</span>
                      {already && <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}>✓ 이미 추가됨</span>}
                    </button>
                  )
                })
              )}
              <button style={tinyBtn} onClick={() => setShowLibPlaces(false)}>닫기</button>
            </div>
          )}

          {places.length === 0 ? (
            <div style={{ ...empty, padding: 16, fontSize: 13 }}>
              아직 장소가 없어요.<br />위 <b>＋ 새 장소</b>로<br />첫 무대를 만들어 보세요.
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ ...empty, padding: 16, fontSize: 13 }}>검색 결과가 없어요.</div>
          ) : (
            <div style={listWrap}>
              {filtered.map((p) => {
                const realIdx = places.findIndex((x) => x.id === p.id)
                const active = p.id === selectedId
                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedId(p.id)}
                    style={{
                      border: '1px solid ' + (active ? 'var(--accent)' : 'var(--border)'),
                      background: active ? 'var(--paper)' : 'var(--panel)',
                      borderRadius: 10,
                      padding: '9px 10px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                      boxShadow: active ? '0 0 0 1px var(--accent)' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {p.image && (
                        <img src={p.image} alt="" style={{ width: 26, height: 26, objectFit: 'cover', borderRadius: 5, border: '1px solid var(--border)', flexShrink: 0 }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
                      )}
                      <span style={{ flex: 1, minWidth: 0, fontWeight: 600, fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: p.name ? 'var(--text)' : 'var(--muted)' }}>
                        {p.name || '(이름 없는 장소)'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 11, color: 'var(--muted)', background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 5, padding: '1px 6px' }}>{p.type}</span>
                      <span style={{ flex: 1 }} />
                      <button style={tinyBtn} title="위로" disabled={!!query.trim() || realIdx <= 0} onClick={(e) => { e.stopPropagation(); move(p.id, -1) }}>↑</button>
                      <button style={tinyBtn} title="아래로" disabled={!!query.trim() || realIdx >= places.length - 1} onClick={(e) => { e.stopPropagation(); move(p.id, 1) }}>↓</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          {!!query.trim() && filtered.length > 0 && (
            <div style={{ padding: '6px 10px', fontSize: 11, color: 'var(--muted)', borderTop: '1px solid var(--border)' }}>검색 중에는 순서 이동이 잠깁니다.</div>
          )}
        </div>

        {/* 우측 편집 */}
        <div style={rightCol}>
          {!selected ? (
            <div style={empty}>
              <div style={{ fontSize: 34 }}><Emoji e="🗺️" /></div>
              <div>왼쪽에서 장소를 고르거나<br /><b>새 장소</b>를 추가해 편집하세요.</div>
              <div style={{ fontSize: 12 }}>이름·유형·분위기·역사·규칙·오감·주요 사건을 채워<br />작품 세계의 무대를 또렷하게 만들어 보세요.</div>
            </div>
          ) : (
            <div style={editScroll}>
              {/* 헤더: 이름/유형/액션 */}
              <div style={panel}>
                <div style={{ display: 'flex', gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={label}>장소 이름</div>
                    <input style={input} value={selected.name} onChange={(e) => patch(selected.id, { name: e.target.value })} placeholder="예: 안개의 항구도시 벨라트" maxLength={80} aria-label="장소 이름" />
                  </div>
                  <div style={{ width: 150, flexShrink: 0 }}>
                    <div style={label}>유형</div>
                    <select style={{ ...input, cursor: 'pointer' }} value={selected.type} onChange={(e) => patch(selected.id, { type: e.target.value })} aria-label="장소 유형">
                      {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      {selected.type && !TYPES.includes(selected.type as typeof TYPES[number]) && <option value={selected.type}>{selected.type}</option>}
                    </select>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button className="minibtn" onClick={() => copyText(placeToText(selected), '이 장소를 복사했어요')}><Emoji e="📋" /> 이 장소 복사</button>
                  <button className="minibtn" onClick={shareToLibrary} title="이 장소를 공유 라이브러리에 저장하거나, 연결된 경우 갱신합니다">
                    {selected.libId && libPlaces.some((x) => x.id === selected.libId) ? <><Emoji e="🔗" /> 라이브러리 갱신</> : <><Emoji e="🔗" /> 라이브러리에 저장</>}
                  </button>
                  <button
                    className="linkbtn"
                    style={linkbtn}
                    onClick={addPlaceToProject}
                    disabled={!hasProjectBridge()}
                    title={hasProjectBridge() ? '이 장소를 프로젝트 바인더(자료 › 장소)에 setting 카드로 추가' : '프로젝트에 연결되어 있지 않아요'}
                  >
                    <Emoji e="📄" /> 프로젝트에 장소 카드 추가
                  </button>
                  <button
                    className="linkbtn"
                    style={linkbtn}
                    onClick={() => {
                      const list = places.filter((p) => p.name.trim()).map((p) => ({ name: p.name.trim(), note: [p.type, p.mood.trim()].filter(Boolean).join(' · '), kind: p.type }))
                      if (!list.length) { flashCopied('월드맵에 보낼 장소가 없어요'); return }
                      openToolLinked('world-map-canvas', { places: list })
                      flashCopied(`${list.length}곳을 월드맵 캔버스로 보냈어요`)
                    }}
                    title="설정집의 모든 장소를 월드맵 캔버스에 노드로 배치"
                  >
                    <Emoji e="🗺️" /> 월드맵에 배치
                  </button>
                  <span style={{ flex: 1 }} />
                  {confirmDel === selected.id ? (
                    <>
                      <span style={{ fontSize: 12, color: 'var(--warn)' }}>정말 삭제할까요?</span>
                      <button className="minibtn" onClick={() => setConfirmDel('')}>취소</button>
                      <button className="minibtn" style={{ color: 'var(--warn)', borderColor: 'var(--warn)' }} onClick={() => removePlace(selected.id)}>삭제 확정</button>
                    </>
                  ) : (
                    <button className="minibtn" style={{ color: 'var(--warn)' }} onClick={() => setConfirmDel(selected.id)} title="이 장소 삭제"><Emoji e="🗑️" /> 삭제</button>
                  )}
                </div>
              </div>

              {/* 장소 이미지 (연계) */}
              <div style={panel}>
                <div style={sectionTitle}><Emoji e="🖼" /> 장소 이미지</div>
                {selected.image ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <img
                      src={selected.image}
                      alt={selected.name || '장소 이미지'}
                      style={{ width: '100%', maxHeight: 260, objectFit: 'cover', borderRadius: 10, border: '1px solid var(--border)' }}
                      onError={() => { if (mounted.current) flashCopied('이미지를 불러오지 못했어요. 다른 이미지를 골라보세요.') }}
                    />
                    {selected.imageCredit ? (
                      <div className="license-note" style={licenseNote}>
                        <span className="license-badge" style={{ display: 'inline-block', fontSize: 10.5, padding: '1px 6px', borderRadius: 5, border: '1px solid var(--border)', background: 'var(--chrome-2)', marginRight: 6 }}>출처·라이선스</span>
                        {selected.imageCredit}
                      </div>
                    ) : (
                      <div className="license-note" style={licenseNote}>출처·라이선스 표기가 없어요. 저작권 안전한 이미지(생성형/PD/CC0 등)만 사용하고 출처를 함께 기록하세요.</div>
                    )}
                    <div style={linkbar}>
                      <button style={linkbtn} onClick={pickFromGallery} title="갤러리에서 새 사진으로 교체"><Emoji e="🖼" /> 다른 사진 고르기</button>
                      <button style={linkbtn} onClick={() => setShowLibImages((v) => !v)} title="이미지 라이브러리에서 교체"><Emoji e="🗂" /> 이미지 라이브러리에서</button>
                      <button style={{ ...linkbtn, color: 'var(--warn)' }} onClick={clearImage} title="첨부 이미지 제거">✕ 이미지 제거</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.6 }}>이 장소를 떠올리게 하는 사진을 첨부할 수 있어요. 저작권 안전한 이미지만 사용됩니다.</div>
                    <div style={linkbar}>
                      <button style={linkbtn} onClick={pickFromGallery} title="갤러리 도구를 열어 사진 고르기"><Emoji e="🖼" /> 갤러리에서 사진 고르기</button>
                      <button style={linkbtn} onClick={() => setShowLibImages((v) => !v)} title="이미지 라이브러리에서 고르기"><Emoji e="🗂" /> 이미지 라이브러리에서{libImages.length ? ` (${libImages.length})` : ''}</button>
                    </div>
                  </div>
                )}

                {/* 이미지 라이브러리 썸네일 picker */}
                {showLibImages && (
                  <div style={{ marginTop: 4, padding: 10, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--paper)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>공유 이미지 라이브러리</div>
                    {libImages.length === 0 ? (
                      <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>아직 저장된 이미지가 없어요. 상상력 갤러리 등에서 이미지를 라이브러리에 담아보세요.</div>
                    ) : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {libImages.map((img) => (
                          <div key={img.id} style={{ display: 'flex', flexDirection: 'column', gap: 3, width: 64 }}>
                            <img
                              src={img.url}
                              alt={img.title || '라이브러리 이미지'}
                              style={thumb}
                              title={buildCredit(img.credit, img.license) || img.title || '이 이미지 사용'}
                              onClick={() => attachLibImage(img)}
                              onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = '0.3' }}
                            />
                            {(img.license || img.credit) && (
                              <span className="license-note" style={{ ...licenseNote, fontSize: 9.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={buildCredit(img.credit, img.license)}>
                                {img.license || img.credit}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    <button style={tinyBtn} onClick={() => setShowLibImages(false)}>닫기</button>
                  </div>
                )}
              </div>

              {/* 분위기 */}
              <div>
                <div style={label}><Emoji e="🌫️" /> 분위기</div>
                <textarea style={area} value={selected.mood} onChange={(e) => patch(selected.id, { mood: e.target.value })} placeholder="이 장소가 풍기는 전체적인 인상·정서·톤…" />
              </div>

              {/* 역사 */}
              <div>
                <div style={label}><Emoji e="📜" /> 역사</div>
                <textarea style={{ ...area, minHeight: 80 }} value={selected.history} onChange={(e) => patch(selected.id, { history: e.target.value })} placeholder="이 장소가 어떻게 생겨났고 무슨 일을 겪어 왔는지…" />
              </div>

              {/* 규칙·관습 */}
              <div>
                <div style={label}><Emoji e="⚖️" /> 규칙·관습</div>
                <textarea style={area} value={selected.rules} onChange={(e) => patch(selected.id, { rules: e.target.value })} placeholder="이곳의 법·금기·풍습·계급·통화·언어 등…" />
              </div>

              {/* 오감 묘사 */}
              <div style={panel}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={sectionTitle}><Emoji e="🖐️" /> 오감 묘사</div>
                  <span style={{ flex: 1 }} />
                  <button style={linkbtn} onClick={openSensory} title="감각 묘사 팔레트 도구 열기"><Emoji e="🌫" /> 감각 묘사 추가</button>
                </div>
                {SENSE_FIELDS.map((f) => (
                  <div key={f.key}>
                    <div style={label}><Emoji e={f.icon} /> {f.label}</div>
                    <input style={input} value={selected.senses[f.key]} onChange={(e) => patchSense(selected.id, f.key, e.target.value)} placeholder={f.ph} />
                  </div>
                ))}
              </div>

              {/* 주요 사건 */}
              <div style={panel}>
                <div style={sectionTitle}><Emoji e="⭐" /> 주요 사건 <span style={{ fontWeight: 400, color: 'var(--muted)', fontSize: 12 }}>({selected.events.length})</span></div>
                {selected.events.length === 0 ? (
                  <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.6 }}>아직 사건이 없어요. 이 장소에서 벌어진(혹은 벌어질) 일을 아래에 추가하세요.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {selected.events.map((ev, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                        <span style={{ flexShrink: 0, width: 22, height: 22, borderRadius: '50%', background: 'var(--accent)', color: '#fff', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 4 }}>{idx + 1}</span>
                        <textarea
                          style={{ ...area, minHeight: 40, flex: 1 }}
                          value={ev}
                          onChange={(e) => editEvent(idx, e.target.value)}
                          placeholder="사건 내용…"
                          aria-label={`사건 ${idx + 1}`}
                        />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
                          <button style={tinyBtn} title="위로" disabled={idx === 0} onClick={() => moveEvent(idx, -1)}>↑</button>
                          <button style={tinyBtn} title="아래로" disabled={idx === selected.events.length - 1} onClick={() => moveEvent(idx, 1)}>↓</button>
                          <button style={{ ...tinyBtn, color: 'var(--warn)' }} title="사건 삭제" onClick={() => removeEvent(idx)}>✕</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    style={{ ...input, flex: 1 }}
                    value={eventDraft}
                    onChange={(e) => setEventDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addEvent() } }}
                    placeholder="새 사건을 적고 Enter…"
                    aria-label="새 사건 입력"
                  />
                  <button className="minibtn" onClick={addEvent} disabled={!eventDraft.trim()}>＋ 추가</button>
                </div>
              </div>

              {/* 기타 + 사용자 정의 추가 항목 (손실 없이 보존·전파, 직접 항목 추가 가능) */}
              <div style={panel}>
                <div style={label}><Emoji e="🧷" /> 기타</div>
                <textarea style={area} value={(selected.extra && selected.extra.etc) || ''} onChange={(e) => patch(selected.id, { extra: { ...(selected.extra || {}), etc: e.target.value } })} placeholder="이 장소에 대한 기타 사항을 자유롭게 적으세요…" />
                {selected.extra && Object.keys(selected.extra).filter((k) => k !== 'etc').length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                    {Object.entries(selected.extra).filter(([k]) => k !== 'etc').map(([k, v]) => (
                      <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ flex: '0 0 96px', fontSize: 12, color: 'var(--accent)', fontWeight: 600 }} title={k}>{emojify(PLACE_FIELD_LABEL[k] || k)}</span>
                        <input style={{ ...input, flex: 1 }} value={v} onChange={(e) => patch(selected.id, { extra: { ...(selected.extra || {}), [k]: e.target.value } })} placeholder="내용 입력…" />
                        <button style={{ ...tinyBtn, color: 'var(--warn)' }} title="이 항목 삭제" onClick={() => { const ex = { ...(selected.extra || {}) }; delete ex[k]; patch(selected.id, { extra: ex }) }}>✕</button>
                      </div>
                    ))}
                  </div>
                )}
                <button className="minibtn" style={{ marginTop: 8, alignSelf: 'flex-start' }} onClick={() => { const lb = window.prompt('추가할 항목 이름 (예: 전설, 특산물):'); const key = (lb || '').trim(); if (key) patch(selected.id, { extra: { ...(selected.extra || {}), [key]: (selected.extra && selected.extra[key]) || '' } }) }}>＋ 항목 추가</button>
              </div>

              {/* 연계 도구 바 */}
              {relations.length > 0 && (
                <div style={panel}>
                  <div style={sectionTitle}><Emoji e="🔗" /> 함께 쓰면 좋은 도구</div>
                  <div className="linkbar" style={linkbar}>
                    {relations.map((rid) => (
                      <button key={rid} className="linkbtn" style={linkbtn} onClick={() => openRelated(rid)} title={`${RELATION_LABELS[rid] || rid} 열기`}>
                        {emojify(RELATION_LABELS[rid] || rid)}
                      </button>
                    ))}
                  </div>
                  <div style={licenseNote}>이미지는 저작권 안전한 출처(생성형·퍼블릭 도메인·CC0·라이선스 명시)만 사용하고, 첨부 시 출처·라이선스를 함께 보관합니다.</div>
                </div>
              )}

              <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.6, paddingBottom: 4 }}>
                모든 변경은 이 브라우저에 자동 저장됩니다. 마지막 수정: {new Date(selected.updatedAt).toLocaleString('ko-KR')}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
