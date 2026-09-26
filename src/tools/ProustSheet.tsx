// 프루스트 인물 질문지 — 인물을 30+개의 심층 질문(가장 두려운 것/가장 행복한 순간/가장 후회하는 일/
// 좌우명 등)에 답하며 입체화하는 큰 도구. 좌측 인물 목록(추가/삭제/순서이동/선택), 우측 질문지 폼.
// 질문은 주제별 묶음(자아·감정·관계·가치·일상 등)으로 그룹화. 진행률 표시. localStorage 인물별 자동 저장.
// [연계] 공유 라이브러리(characters)에서 가져오기/저장, payload.character 로 새 인물 추가,
//        인물 시트/관계도 등 관련 도구로 이동, 프로젝트 바인더에 인물 카드(요약 매핑)·자료 문서로 추가.
// 저작권: 질문 문항은 본 도구 자작(공개 도메인 성격의 프루스트 설문 양식을 한국어로 재구성), 사용자 답변은 사용자 소유.
//         외부 이미지(공유 사진)는 출처·라이선스와 함께만 참고용으로 표기. import 는 react 와 './linkbus' 만.
import { useEffect, useRef, useState } from 'react'
import {
  useLibraryList,
  addToLibrary,
  updateInLibrary,
  openToolLinked,
  addToProject,
  hasProjectBridge,
  Emoji,
  type SharedCharacter,
} from './linkbus'

export const meta = { id: 'proust-sheet', name: '프루스트 질문지', icon: '🪞', group: '구상·정리', intro: '30여 개의 심층 질문에 답하며 인물을 입체적으로 빚어보세요', w: 720, h: 620 }

const LS_KEY = 'sry:tool:proust-sheet'

// 질문 정의 — id 는 저장 키이므로 절대 바꾸지 말 것(저장된 답과 매칭). label 은 화면 문구.
interface Question { id: string; label: string; hint?: string }
interface QGroup { title: string; icon: string; questions: Question[] }

// 프루스트식 설문을 주제별로 재구성한 한국어 질문 모음(30+개). 문항 자체는 본 도구 자작.
const GROUPS: QGroup[] = [
  {
    title: '자아와 정체성', icon: '🪪', questions: [
      { id: 'self_define', label: '이 인물은 자기 자신을 한 문장으로 어떻게 설명할까?' },
      { id: 'others_see', label: '남들은 이 인물을 어떻게 본다고 스스로 생각하는가? (그 둘은 일치하는가)' },
      { id: 'proud', label: '자기 자신에게서 가장 자랑스러워하는 점은?' },
      { id: 'change_self', label: '자신에 대해 단 하나를 바꿀 수 있다면 무엇을 바꿀까?' },
      { id: 'mask', label: '남에게 절대 들키고 싶지 않은, 가장 숨기는 면은?' },
    ],
  },
  {
    title: '두려움과 욕망', icon: '💢', questions: [
      { id: 'fear', label: '가장 두려워하는 것은? (그 두려움의 뿌리는 어디인가)' },
      { id: 'desire', label: '입 밖에 내지 못할 만큼 간절히 바라는 것은?' },
      { id: 'misery', label: '이 인물에게 가장 큰 불행·비참함이란 어떤 상태인가?' },
      { id: 'temptation', label: '가장 쉽게 흔들리는 유혹은 무엇인가?' },
      { id: 'overcome', label: '극복하고 싶지만 아직 못 한 것은?' },
    ],
  },
  {
    title: '행복과 기쁨', icon: '🌤️', questions: [
      { id: 'happiest', label: '인생에서 가장 행복했던 순간은?' },
      { id: 'happiness', label: '이 인물에게 완벽한 행복이란 어떤 모습인가?' },
      { id: 'joy_small', label: '사소하지만 매번 마음을 환하게 하는 것은?' },
      { id: 'relax', label: '온전히 쉬고 회복하는 자기만의 방식은?' },
      { id: 'laugh', label: '무엇에 진심으로 크게 웃는가?' },
    ],
  },
  {
    title: '후회와 상처', icon: '🩹', questions: [
      { id: 'regret', label: '가장 후회하는 일은? (돌이킬 수 있다면 무엇을 다르게 할까)' },
      { id: 'wound', label: '아직도 아물지 않은 마음의 상처는?' },
      { id: 'guilt', label: '남몰래 죄책감을 느끼는 일은?' },
      { id: 'lost', label: '잃어버린 것 중 가장 그리운 것(사람·시절·물건)은?' },
      { id: 'forgive', label: '아직 용서하지 못한 사람 또는 자기 자신은?' },
    ],
  },
  {
    title: '관계와 사랑', icon: '🤝', questions: [
      { id: 'love_most', label: '세상에서 가장 사랑하는 사람(또는 존재)은?' },
      { id: 'trait_love', label: '타인에게서 가장 높이 사는 자질은?' },
      { id: 'trait_hate', label: '타인에게서 가장 견디기 힘든 점은?' },
      { id: 'friendship', label: '이 인물에게 ‘진짜 친구’란 어떤 의미인가?' },
      { id: 'lonely', label: '언제 가장 외로움을 느끼는가?' },
    ],
  },
  {
    title: '가치와 신념', icon: '⚖️', questions: [
      { id: 'motto', label: '삶의 좌우명(또는 자주 되뇌는 말)은?' },
      { id: 'virtue', label: '가장 중요하게 여기는 덕목·가치는?' },
      { id: 'unforgivable', label: '절대 용납할 수 없는 행동·태도는?' },
      { id: 'die_for', label: '목숨을 걸어도 좋다고 여기는 것이 있는가?' },
      { id: 'hero', label: '존경하거나 닮고 싶은 인물(실제든 가상이든)은?' },
    ],
  },
  {
    title: '일상과 취향', icon: '🎨', questions: [
      { id: 'occupation', label: '하는 일(직업·역할)과 그것에 대한 진짜 속마음은?' },
      { id: 'talent', label: '가지고 싶지만 없는 재능이 있다면?' },
      { id: 'habit', label: '남들이 모르는 버릇·습관은?' },
      { id: 'comfort', label: '힘들 때 위안을 주는 음식·장소·물건은?' },
      { id: 'word', label: '입버릇처럼 즐겨 쓰는 말 또는 싫어하는 말은?' },
    ],
  },
  {
    title: '죽음과 마지막', icon: '🕯️', questions: [
      { id: 'death', label: '죽음을 어떻게 생각하는가? (두려움인가 평온인가)' },
      { id: 'last_words', label: '마지막으로 남기고 싶은 말이 있다면?' },
      { id: 'remembered', label: '사람들에게 어떤 인물로 기억되고 싶은가?' },
    ],
  },
]

// 빠른 조회용 평탄화 목록.
const ALL_Q: Question[] = GROUPS.flatMap((g) => g.questions)
const TOTAL = ALL_Q.length

// 인물 한 명의 질문지 데이터. answers: 질문 id → 답변 텍스트.
interface Subject {
  id: string
  name: string
  role: string
  answers: Record<string, string>
  // [연계] 공유 라이브러리 원본 id·사진(참고용)·크레딧. 기본 동작에는 영향 없음.
  libId?: string
  photo?: string
  photoCredit?: string
}

// 고유 id — crypto 우선, 미지원 시 시간+난수.
function newId(): string {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  } catch {}
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

const str = (v: unknown) => (typeof v === 'string' ? v : '')

function emptySubject(): Subject {
  return { id: newId(), name: '', role: '', answers: {} }
}

// localStorage 읽기 — 미지원/차단/손상 시 빈 배열로 graceful.
function loadSubjects(): Subject[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((x) => x && typeof x === 'object')
      .map((x: Record<string, unknown>) => {
        const ansRaw = x.answers && typeof x.answers === 'object' ? (x.answers as Record<string, unknown>) : {}
        const answers: Record<string, string> = {}
        // 알 수 없는 키도 보존하되 문자열만 받는다(추후 질문 변경 대비).
        for (const k of Object.keys(ansRaw)) {
          const v = ansRaw[k]
          if (typeof v === 'string') answers[k] = v
        }
        return {
          id: String(x.id || newId()),
          name: str(x.name),
          role: str(x.role),
          answers,
          libId: typeof x.libId === 'string' ? x.libId : undefined,
          photo: typeof x.photo === 'string' ? x.photo : undefined,
          photoCredit: typeof x.photoCredit === 'string' ? x.photoCredit : undefined,
        }
      })
  } catch {
    return []
  }
}

// 답한 질문 수(빈 문자열 제외).
function answeredCount(s: Subject): number {
  return ALL_Q.reduce((n, q) => (s.answers[q.id] && s.answers[q.id].trim() ? n + 1 : n), 0)
}

// 한 인물을 읽기 좋은 텍스트로 직렬화(복사·내보내기·프로젝트 본문용).
function subjectToText(s: Subject): string {
  const lines: string[] = []
  const title = s.name.trim() || '(이름 없는 인물)'
  lines.push(`■ 프루스트 질문지 — ${title}${s.role.trim() ? ` (${s.role.trim()})` : ''}`)
  for (const g of GROUPS) {
    const filled = g.questions.filter((q) => s.answers[q.id] && s.answers[q.id].trim())
    if (!filled.length) continue
    lines.push('')
    lines.push(`【${g.title}】`)
    for (const q of filled) {
      const a = s.answers[q.id].trim()
      lines.push(`Q. ${q.label}`)
      a.split('\n').forEach((ln) => lines.push(`A. ${ln}`))
    }
  }
  if (s.photo && s.photoCredit) { lines.push(''); lines.push(`사진 출처: ${s.photoCredit}`) }
  return lines.join('\n')
}

// HTML 이스케이프(프로젝트 bodyHtml 안전 삽입).
function esc(t: string): string {
  return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// 한 인물 → 프로젝트 본문 HTML(주제별 Q/A).
function subjectToHtml(s: Subject): string {
  const parts: string[] = []
  const title = s.name.trim() || '이름 없는 인물'
  parts.push(`<h2>프루스트 질문지 — ${esc(title)}${s.role.trim() ? ` (${esc(s.role.trim())})` : ''}</h2>`)
  for (const g of GROUPS) {
    const filled = g.questions.filter((q) => s.answers[q.id] && s.answers[q.id].trim())
    if (!filled.length) continue
    parts.push(`<h3>${esc(g.title)}</h3>`)
    for (const q of filled) {
      const a = s.answers[q.id].trim().split('\n').map((ln) => esc(ln)).join('<br/>')
      parts.push(`<p><b>Q. ${esc(q.label)}</b><br/>${a}</p>`)
    }
  }
  if (s.photo && s.photoCredit) parts.push(`<p><i>사진 출처: ${esc(s.photoCredit)}</i></p>`)
  return parts.join('\n')
}

// [연계] 공유 라이브러리 인물(SharedCharacter) → 새 질문지 인물로 매핑.
// 라이브러리의 성격/목표/비밀/메모 등을 가능한 질문 칸에 살짝 채워 출발점을 제공.
function fromShared(s: SharedCharacter): Subject {
  const answers: Record<string, string> = {}
  const set = (id: string, v?: string) => { const t = (v || '').trim(); if (t) answers[id] = t }
  set('self_define', str(s.personality))
  set('desire', str(s.goal))
  set('mask', str(s.secret))
  set('occupation', str(s.role))
  // notes(일반 메모)는 자유로운 '버릇·습관' 칸에 출발점으로 보존.
  set('habit', str(s.notes))
  return {
    id: newId(),
    name: str(s.name),
    role: str(s.role),
    answers,
    libId: s.id,
    photo: str(s.photo) || undefined,
    photoCredit: str(s.photoCredit) || undefined,
  }
}

// [연계] payload.character(임의 형태) → 질문지 인물(붙여넣기 성격: 라이브러리 자동연결 안 함).
function subjectFromPayload(raw: unknown): Subject {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const base = fromShared({
    id: typeof o.id === 'string' ? o.id : '',
    name: str(o.name),
    photo: str(o.photo),
    photoCredit: str(o.photoCredit),
    role: str(o.role),
    personality: str(o.personality),
    goal: str(o.goal),
    secret: str(o.secret),
    notes: str(o.notes),
    updated: 0,
  })
  base.libId = undefined
  return base
}

// [연계] 질문지 답변 → 받는 허브(인물 시트 등)가 기본 칸에 바로 꽂을 수 있는 정규 키 fields.
// 기존 키는 그대로 두고, 추가로만 표준화한 fields 를 함께 보낸다(additive). 문자열 값만.
function normalizedCharFields(s: Subject): Record<string, string> {
  const a = (id: string) => (s.answers[id] || '').trim()
  const f: Record<string, string> = {}
  const put = (k: string, v: string) => { const t = v.trim(); if (t && !f[k]) f[k] = t }
  put('name', s.name)
  put('role', s.role)
  // 정체성·성격 자유서술.
  put('personality', a('self_define'))
  // 욕망/간절히 바라는 것 → 목표.
  put('goal', a('desire'))
  // 두려움 → fear, 그 동기·욕망의 뿌리.
  put('fear', a('fear'))
  put('motivation', a('desire'))
  // 가장 숨기는 면·비밀 → secret.
  put('secret', a('mask'))
  // 좌우명·핵심 가치 → value.
  put('value', a('motto') || a('virtue'))
  // 직업·역할에 대한 속마음 → occupation.
  put('occupation', a('occupation'))
  // 남들이 모르는 버릇·습관 → habit.
  put('habit', a('habit'))
  // 입버릇처럼 쓰는 말 → speech(말투/어조).
  put('speech', a('word'))
  // 위안을 주는 음식·장소·물건 → hobby(일상·취향 출발점).
  put('hobby', a('comfort'))
  return f
}

// [연계] 질문지 인물 → 공유 라이브러리 저장용 SharedCharacter 부분 객체.
// 핵심 답변을 라이브러리 표준 필드로 매핑(요약). 전체 Q/A 는 notes 에 텍스트로 보존.
function toSharedPatch(s: Subject): Partial<SharedCharacter> {
  const a = (id: string) => (s.answers[id] || '').trim()
  const traits: { k: string; v: string }[] = []
  if (a('motto')) traits.push({ k: '좌우명', v: a('motto') })
  if (a('fear')) traits.push({ k: '가장 두려운 것', v: a('fear') })
  if (a('regret')) traits.push({ k: '가장 후회하는 일', v: a('regret') })
  const fields = normalizedCharFields(s)
  return {
    name: s.name.trim() || '(이름 없는 인물)',
    role: s.role.trim() || undefined,
    personality: a('self_define') || undefined,
    goal: a('desire') || undefined,
    secret: a('mask') || undefined,
    notes: subjectToText(s),
    traits: traits.length ? traits : undefined,
    // [표준화] 받는 허브가 정규 키로 항목을 제자리에 넣을 수 있도록 fields 동봉(추가만).
    fields: Object.keys(fields).length ? fields : undefined,
    photo: s.photo || undefined,
    photoCredit: s.photoCredit || undefined,
    source: '프루스트 질문지',
  }
}

export default function ProustSheet({ payload }: { payload?: Record<string, unknown> }) {
  const [subjects, setSubjects] = useState<Subject[]>(() => loadSubjects())
  const [selId, setSelId] = useState<string | null>(() => {
    const init = loadSubjects()
    return init.length ? init[0].id : null
  })
  const [query, setQuery] = useState('')
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const [note, setNote] = useState('')   // 저장 차단 등 경고
  const [flash, setFlash] = useState('') // 일시 안내
  const [showImport, setShowImport] = useState(false)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({}) // 그룹 접기
  // [사용자 자율] 사용자 정의 항목(이름/값 직접 입력) + 고정 '기타' 자유 입력. 무작위 생성 안 함.
  const [custom, setCustom] = useState<{ id: string; label: string; value: string }[]>([])
  const [etc, setEtc] = useState('')
  const mounted = useRef(true)
  const flashTimer = useRef<number | null>(null)

  // [연계] 공유 라이브러리 인물(자동 구독).
  const library = useLibraryList('characters')

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (flashTimer.current !== null) clearTimeout(flashTimer.current)
    }
  }, [])

  // 자동 저장.
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(subjects))
    } catch {
      if (mounted.current) setNote('이 브라우저에서 저장이 막혀 있어 새로고침하면 내용이 사라질 수 있어요.')
    }
  }, [subjects])

  // 선택 보정.
  useEffect(() => {
    if (selId && !subjects.some((s) => s.id === selId)) {
      setSelId(subjects.length ? subjects[0].id : null)
    }
  }, [subjects, selId])

  // [연계] payload.character → 새 인물 1회 추가.
  const consumedPayload = useRef<unknown>(undefined)
  useEffect(() => {
    const raw = payload?.character
    if (!raw) return
    if (consumedPayload.current === raw) return
    consumedPayload.current = raw
    const s = subjectFromPayload(raw)
    setSubjects((prev) => [...prev, s])
    setSelId(s.id)
    setQuery('')
    setConfirmDel(null)
    setCustom((prev) => prev.map((c) => ({ ...c, value: '' })))
    setEtc('')
    showFlash('전달받은 인물로 새 질문지를 시작했어요.')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload])

  const showFlash = (msg: string) => {
    setFlash(msg)
    if (flashTimer.current !== null) clearTimeout(flashTimer.current)
    flashTimer.current = window.setTimeout(() => {
      if (mounted.current) setFlash('')
    }, 1800)
  }

  const selected = subjects.find((s) => s.id === selId) || null
  const bridgeOn = hasProjectBridge()

  // [사용자 자율] 새 인물/재생성 시 사용자 정의 항목의 '값'만 비우고 '항목(이름)'은 유지, 기타도 비운다.
  const resetCustomForNew = () => {
    setCustom((prev) => prev.map((c) => ({ ...c, value: '' })))
    setEtc('')
  }

  // 새 인물.
  const addSubject = () => {
    const s = emptySubject()
    setSubjects((prev) => [...prev, s])
    setSelId(s.id)
    setQuery('')
    setConfirmDel(null)
    resetCustomForNew()
  }

  // 메타(이름/역할) 수정.
  const updateMeta = (key: 'name' | 'role', value: string) => {
    if (!selId) return
    setSubjects((prev) => prev.map((s) => (s.id === selId ? { ...s, [key]: value } : s)))
  }

  // 한 질문 답변 수정.
  const updateAnswer = (qid: string, value: string) => {
    if (!selId) return
    setSubjects((prev) => prev.map((s) => (s.id === selId ? { ...s, answers: { ...s.answers, [qid]: value } } : s)))
  }

  // [사용자 자율] 사용자 정의 항목 추가/수정/삭제. 값은 사용자가 직접 적는다(무작위 생성 안 함).
  const addCustomField = () => {
    const label = (window.prompt('추가할 항목 이름을 입력하세요 (예: 별명, 출신, 좌우명 …)') || '').trim()
    if (!label) return
    setCustom((prev) => [...prev, { id: newId(), label, value: '' }])
  }
  const updateCustomValue = (id: string, value: string) => {
    setCustom((prev) => prev.map((c) => (c.id === id ? { ...c, value } : c)))
  }
  const removeCustomField = (id: string) => {
    setCustom((prev) => prev.filter((c) => c.id !== id))
  }

  // 삭제(2단계).
  const requestDelete = (id: string) => setConfirmDel(id)
  const cancelDelete = () => setConfirmDel(null)
  const confirmDelete = (id: string) => {
    setSubjects((prev) => prev.filter((s) => s.id !== id))
    setConfirmDel(null)
  }

  // 순서 이동.
  const move = (id: string, dir: -1 | 1) => {
    setSubjects((prev) => {
      const i = prev.findIndex((s) => s.id === id)
      if (i < 0) return prev
      const j = i + dir
      if (j < 0 || j >= prev.length) return prev
      const next = prev.slice()
      const tmp = next[i]; next[i] = next[j]; next[j] = tmp
      return next
    })
  }

  // 복제(라이브러리 연결 끊음).
  const duplicate = (id: string) => {
    setSubjects((prev) => {
      const src = prev.find((s) => s.id === id)
      if (!src) return prev
      const copy: Subject = { ...src, id: newId(), name: (src.name.trim() || '인물') + ' (복사)', answers: { ...src.answers }, libId: undefined }
      const i = prev.findIndex((s) => s.id === id)
      const next = prev.slice()
      next.splice(i + 1, 0, copy)
      setSelId(copy.id)
      return next
    })
  }

  // 클립보드 복사 — 표준 API → execCommand 폴백 → 안내.
  const copyText = async (text: string, okMsg: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text)
        showFlash(okMsg)
        return
      }
    } catch { /* 폴백 */ }
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
      if (ok) { showFlash(okMsg); return }
    } catch { /* 최종 안내 */ }
    showFlash('복사에 실패했어요. 텍스트를 직접 선택해 복사하세요.')
  }
  const copyOne = (s: Subject) => copyText(subjectToText(s) + customText(), '질문지를 텍스트로 복사했어요.')

  // [사용자 자율] 사용자 정의 항목·기타를 fields 맵에 합친다(값이 비어있지 않을 때만, 키=라벨 그대로).
  const mergeCustomFields = (base?: Record<string, string>): Record<string, string> | undefined => {
    const f: Record<string, string> = { ...(base || {}) }
    for (const c of custom) {
      const label = c.label.trim()
      const v = c.value.trim()
      if (label && v && !f[label]) f[label] = v
    }
    const e = etc.trim()
    if (e && !f.etc) f.etc = e
    return Object.keys(f).length ? f : undefined
  }
  // [사용자 자율] 복사/요약 텍스트에 붙일 사용자 정의 항목·기타 블록(없으면 빈 문자열).
  const customText = (): string => {
    const lines: string[] = []
    const filled = custom.filter((c) => c.label.trim() && c.value.trim())
    if (filled.length) {
      lines.push('')
      lines.push('【추가 항목】')
      for (const c of filled) {
        lines.push(`${c.label.trim()}: ${c.value.trim()}`)
      }
    }
    if (etc.trim()) {
      lines.push('')
      lines.push('【기타】')
      lines.push(etc.trim())
    }
    return lines.join('\n')
  }

  // [연계] 라이브러리 인물을 새 질문지로 가져오기.
  const importFromLibrary = (s: SharedCharacter) => {
    const sub = fromShared(s)
    setSubjects((prev) => [...prev, sub])
    setSelId(sub.id)
    setQuery('')
    setConfirmDel(null)
    setShowImport(false)
    resetCustomForNew()
    showFlash(`‘${sub.name.trim() || '이름 없는 인물'}’의 질문지를 시작했어요.`)
  }

  // [연계] 질문지를 공유 라이브러리에 저장/업데이트.
  const saveToLibrary = (s: Subject) => {
    const patch = toSharedPatch(s)
    // [사용자 자율] 사용자 정의 항목·기타를 fields 와 notes 에 합친다(추가만).
    patch.fields = mergeCustomFields(patch.fields)
    const extra = customText()
    if (extra) patch.notes = (patch.notes || '') + extra
    if (s.libId && library.some((x) => x.id === s.libId)) {
      updateInLibrary('characters', s.libId, patch)
      showFlash('라이브러리의 인물을 업데이트했어요.')
    } else {
      const rec = addToLibrary('characters', patch)
      setSubjects((prev) => prev.map((x) => (x.id === s.id ? { ...x, libId: rec.id } : x)))
      showFlash('라이브러리에 인물을 저장했어요.')
    }
  }

  // [연계] 관련 도구를 현재 인물 데이터와 함께 열기.
  const openWith = (toolId: string, s: Subject | null) => {
    if (!s) { openToolLinked(toolId, undefined); return }
    // [사용자 자율] 사용자 정의 항목·기타를 fields·notes 에 합쳐 받는 도구에 그대로 나타나게 한다(추가만).
    const patch = toSharedPatch(s)
    patch.fields = mergeCustomFields(patch.fields)
    const extra = customText()
    if (extra) patch.notes = (patch.notes || '') + extra
    openToolLinked(toolId, { character: { ...patch, id: s.libId } })
  }

  // [프로젝트] 현재 인물을 프로젝트 바인더에 인물 카드로 추가(핵심 답변 요약 매핑).
  const addCharCardToProject = (s: Subject) => {
    if (!hasProjectBridge()) { showFlash('프로젝트에 연결되어 있지 않아요.'); return }
    const a = (id: string) => (s.answers[id] || '').trim()
    const name = s.name.trim() || '이름 없는 인물'
    const character: Record<string, string> = {}
    const put = (k: string, v: string) => { const t = v.trim(); if (t) character[k] = t }
    put('name', name)
    put('role', s.role)
    put('personality', a('self_define'))
    put('goal', a('desire'))
    // conflict: 두려움 + 후회 + 숨기는 면을 한 칸에 묶어 손실 없이.
    const conflict = [
      a('fear') && `가장 두려운 것: ${a('fear')}`,
      a('regret') && `가장 후회하는 일: ${a('regret')}`,
      a('mask') && `숨기는 면: ${a('mask')}`,
    ].filter(Boolean).join('\n')
    if (conflict) character.conflict = conflict
    put('habits', a('habit'))
    // notes: 좌우명 + 가장 행복했던 순간 + 사진 출처를 보존.
    const notes = [
      a('motto') && `좌우명: ${a('motto')}`,
      a('happiest') && `가장 행복했던 순간: ${a('happiest')}`,
      s.photo && s.photoCredit ? `사진 출처: ${s.photoCredit}` : '',
    ].filter(Boolean).join('\n\n')
    if (notes) character.notes = notes
    // [표준화] 정규 캐릭터 키를 추가로 채워 받는 카드의 기본 칸에 제자리로 들어가게 한다(기존 키는 유지).
    const norm = normalizedCharFields(s)
    for (const k of Object.keys(norm)) { if (!character[k]) character[k] = norm[k] }
    // [사용자 자율] 사용자 정의 항목(키=라벨 그대로)·기타(키 'etc')를 추가(값이 있을 때만, 기존 키 유지).
    for (const c of custom) {
      const label = c.label.trim()
      const v = c.value.trim()
      if (label && v && !character[label]) character[label] = v
    }
    if (etc.trim() && !character.etc) character.etc = etc.trim()

    const meta: Record<string, string> = {}
    if (s.role.trim()) meta['역할'] = s.role.trim()
    if (a('motto')) meta['좌우명'] = a('motto').split('\n')[0].slice(0, 60)
    meta['답변'] = `${answeredCount(s)}/${TOTAL}`

    const id = addToProject({
      kind: 'character',
      folder: '인물',
      title: name,
      character,
      synopsis: a('self_define') || undefined,
      meta,
    })
    showFlash(id ? `‘${name}’을(를) 프로젝트 인물 카드로 추가했어요.` : '프로젝트 추가에 실패했어요.')
  }

  // [사용자 자율] 사용자 정의 항목·기타를 HTML 블록으로(없으면 빈 문자열). esc 로 안전 삽입.
  const customHtml = (): string => {
    const parts: string[] = []
    const filled = custom.filter((c) => c.label.trim() && c.value.trim())
    if (filled.length) {
      parts.push('<h3>추가 항목</h3>')
      for (const c of filled) {
        const v = c.value.trim().split('\n').map((ln) => esc(ln)).join('<br/>')
        parts.push(`<p><b>${esc(c.label.trim())}</b><br/>${v}</p>`)
      }
    }
    if (etc.trim()) {
      const v = etc.trim().split('\n').map((ln) => esc(ln)).join('<br/>')
      parts.push('<h3>기타</h3>')
      parts.push(`<p>${v}</p>`)
    }
    return parts.join('\n')
  }

  // [프로젝트] 전체 질문지(Q/A)를 자료 문서로 추가.
  const addDocToProject = (s: Subject) => {
    if (!hasProjectBridge()) { showFlash('프로젝트에 연결되어 있지 않아요.'); return }
    const name = s.name.trim() || '이름 없는 인물'
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '인물',
      title: `프루스트 질문지 — ${name}`,
      bodyHtml: subjectToHtml(s) + customHtml(),
      icon: '🪞',
    })
    showFlash(id ? '프로젝트에 질문지 문서를 추가했어요.' : '프로젝트 추가에 실패했어요.')
  }

  const toggleGroup = (title: string) => setCollapsed((c) => ({ ...c, [title]: !c[title] }))

  // 검색 필터(이름·역할·답변 전체 대상).
  const q = query.trim().toLowerCase()
  const visible = q
    ? subjects.filter((s) =>
        s.name.toLowerCase().includes(q) ||
        s.role.toLowerCase().includes(q) ||
        Object.values(s.answers).some((v) => v.toLowerCase().includes(q)),
      )
    : subjects

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

  const metaRow: React.CSSProperties = { display: 'flex', gap: 10, flexWrap: 'wrap' }
  const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }
  const inputBase: React.CSSProperties = { width: '100%', padding: '9px 11px', fontSize: 14, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: 1.5 }
  const areaStyle: React.CSSProperties = { ...inputBase, minHeight: 56, resize: 'vertical' }

  const groupCard: React.CSSProperties = { border: '1px solid var(--border)', borderRadius: 12, background: 'var(--panel)', overflow: 'hidden' }
  const groupHead: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', cursor: 'pointer', background: 'var(--chrome-2)', borderBottom: '1px solid var(--border)', userSelect: 'none' }
  const groupBody: React.CSSProperties = { padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }
  const qLabel: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 6, lineHeight: 1.5, display: 'flex', alignItems: 'baseline', gap: 6 }

  const emptyBox: React.CSSProperties = { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--muted)', fontSize: 14, lineHeight: 1.7, padding: 24, gap: 14 }
  const sideEmpty: React.CSSProperties = { padding: '24px 14px', textAlign: 'center', color: 'var(--muted)', fontSize: 13, lineHeight: 1.6 }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }

  const importPanel: React.CSSProperties = { position: 'absolute', top: 48, left: 14, zIndex: 20, width: 300, maxHeight: 320, overflowY: 'auto', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.25)', padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }
  const importRow: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, padding: '7px 9px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', cursor: 'pointer', textAlign: 'left' }

  // 진행률 막대.
  const progressBar = (done: number, total: number, small?: boolean) => {
    const pct = total ? Math.round((done / total) * 100) : 0
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
        <div style={{ flex: 1, height: small ? 5 : 8, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{ width: pct + '%', height: '100%', background: 'var(--accent)', transition: 'width .2s' }} />
        </div>
        <span style={{ fontSize: small ? 11 : 12, color: 'var(--muted)', flexShrink: 0 }}>{done}/{total}</span>
      </div>
    )
  }

  return (
    <div style={wrap}>
      <div style={topbar}>
        <div style={titleStyle}><span>{meta.icon}</span><span>프루스트 질문지</span></div>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>인물 {subjects.length}명</span>
        <button className="minibtn" onClick={() => setShowImport((v) => !v)} title="공유 라이브러리에서 인물 가져오기"><Emoji e="📥"/> 라이브러리에서 가져오기</button>
        <button className="btn-primary" onClick={addSubject}>＋ 인물 추가</button>
      </div>

      {/* [연계] 라이브러리 가져오기 패널 */}
      {showImport && (
        <div style={{ position: 'relative' }}>
          <div style={importPanel}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '2px 4px' }}>
              <span style={{ fontSize: 12, fontWeight: 700 }}><Emoji e="📥"/> 공유 라이브러리 인물</span>
              <span style={{ flex: 1 }} />
              <button className="minibtn" onClick={() => setShowImport(false)} style={{ padding: '2px 7px' }}>닫기</button>
            </div>
            {library.length === 0 ? (
              <div style={{ ...hint, padding: '10px 6px' }}>아직 공유 라이브러리에 저장된 인물이 없어요. 다른 도구(인물 시트·캐릭터 모델 등)에서 저장하면 여기로 가져올 수 있어요.</div>
            ) : (
              library.map((s) => (
                <button key={s.id} style={importRow} onClick={() => importFromLibrary(s)} title="이 인물로 질문지 시작">
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
              placeholder="🔍 인물·답변 검색…"
              aria-label="인물 검색"
            />
          </div>

          {subjects.length === 0 ? (
            <div style={sideEmpty}>아직 인물이 없어요.<br />위의 <b>＋ 인물 추가</b>를 눌러<br />질문지를 시작해 보세요.</div>
          ) : visible.length === 0 ? (
            <div style={sideEmpty}>‘{query}’에 맞는 인물이 없어요.</div>
          ) : (
            <div style={listStyle}>
              {visible.map((s) => {
                const active = s.id === selId
                const idx = subjects.findIndex((x) => x.id === s.id)
                const confirming = confirmDel === s.id
                const done = answeredCount(s)
                return (
                  <div
                    key={s.id}
                    onClick={() => { setSelId(s.id); setConfirmDel(null) }}
                    style={{
                      border: '1px solid ' + (active ? 'var(--accent)' : 'var(--border)'),
                      background: active ? 'var(--chrome-2)' : 'var(--paper)',
                      borderRadius: 10, padding: '8px 10px', cursor: 'pointer',
                      display: 'flex', flexDirection: 'column', gap: 6,
                      boxShadow: active ? '0 0 0 1px var(--accent) inset' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: s.name.trim() ? 'var(--text)' : 'var(--muted)' }}>
                        {s.name.trim() || '(이름 없음)'}
                      </span>
                      {s.libId && <span className="license-badge" title="공유 라이브러리에 연결됨" style={{ flexShrink: 0 }}><Emoji e="📚"/></span>}
                      {s.role.trim() && <span style={{ fontSize: 11, color: 'var(--muted)', whiteSpace: 'nowrap', maxWidth: 70, overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.role.trim()}</span>}
                    </div>
                    {progressBar(done, TOTAL, true)}

                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
                      <button className="minibtn" onClick={() => move(s.id, -1)} disabled={idx <= 0} title="위로" style={{ padding: '3px 7px' }}>▲</button>
                      <button className="minibtn" onClick={() => move(s.id, 1)} disabled={idx >= subjects.length - 1} title="아래로" style={{ padding: '3px 7px' }}>▼</button>
                      <button className="minibtn" onClick={() => duplicate(s.id)} title="복제" style={{ padding: '3px 7px' }}>⎘</button>
                      <span style={{ flex: 1 }} />
                      {confirming ? (
                        <>
                          <button className="minibtn" onClick={() => confirmDelete(s.id)} title="정말 삭제" style={{ padding: '3px 7px', color: 'var(--warn)', borderColor: 'var(--warn)' }}>삭제 확정</button>
                          <button className="minibtn" onClick={cancelDelete} title="취소" style={{ padding: '3px 7px' }}>취소</button>
                        </>
                      ) : (
                        <button className="minibtn" onClick={() => requestDelete(s.id)} title="삭제" style={{ padding: '3px 7px' }}><Emoji e="🗑️"/></button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* 우측: 질문지 폼 */}
        <div style={editor}>
          {!selected ? (
            <div style={emptyBox}>
              <div style={{ fontSize: 40 }}><Emoji e="🪞"/></div>
              <div>
                {subjects.length === 0
                  ? <>등록된 인물이 없습니다.<br /><b>＋ 인물 추가</b>로 첫 질문지를 시작하세요.</>
                  : <>왼쪽 목록에서 인물을 선택하면<br />여기서 질문에 답할 수 있어요.</>}
              </div>
              {subjects.length === 0 && <button className="btn-primary" onClick={addSubject}>＋ 첫 인물 만들기</button>}
            </div>
          ) : (
            <>
              <div style={editBar}>
                <span style={{ fontSize: 13, fontWeight: 600, marginRight: 'auto', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {selected.name.trim() || '(이름 없는 인물)'}
                </span>
                <button className="minibtn" onClick={() => saveToLibrary(selected)} title="이 인물을 공유 라이브러리에 저장하거나, 연결된 경우 업데이트합니다">
                  {selected.libId && library.some((x) => x.id === selected.libId) ? <><Emoji e="📚"/> 라이브러리 업데이트</> : <><Emoji e="📚"/> 라이브러리에 저장</>}
                </button>
                <button className="minibtn" onClick={() => copyOne(selected)} title="이 질문지를 텍스트로 복사"><Emoji e="📋"/> 복사</button>
                <button className="minibtn" onClick={() => duplicate(selected.id)} title="이 인물 복제">⎘ 복제</button>
                {confirmDel === selected.id ? (
                  <>
                    <button className="minibtn" onClick={() => confirmDelete(selected.id)} style={{ color: 'var(--warn)', borderColor: 'var(--warn)' }}>삭제 확정</button>
                    <button className="minibtn" onClick={cancelDelete}>취소</button>
                  </>
                ) : (
                  <button className="minibtn" onClick={() => requestDelete(selected.id)} title="이 인물 삭제"><Emoji e="🗑️"/> 삭제</button>
                )}
              </div>

              <div style={editScroll}>
                {/* 진행률 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {progressBar(answeredCount(selected), TOTAL)}
                  <span style={hint}>질문에 답할수록 인물이 또렷해집니다. 모든 칸을 채울 필요는 없어요.</span>
                </div>

                {/* [연계] 참고용 사진(출처 표기 필수) */}
                {selected.photo && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <img src={selected.photo} alt={selected.name.trim() || '인물 사진'} style={{ width: 56, height: 56, borderRadius: 10, objectFit: 'cover', border: '1px solid var(--border)', flexShrink: 0 }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                      <span style={{ fontSize: 12, color: 'var(--muted)' }}>라이브러리 사진(참고용)</span>
                      {selected.photoCredit
                        ? <span className="license-note">출처: {selected.photoCredit}</span>
                        : <span className="license-note">출처 미상 — 그대로 베끼지 말고 영감으로만 쓰세요.</span>}
                    </div>
                  </div>
                )}

                {/* 이름·역할 */}
                <div style={metaRow}>
                  <div style={{ flex: '1 1 200px', minWidth: 160 }}>
                    <div style={labelStyle}><span><Emoji e="🪪"/></span><span>이름</span></div>
                    <input style={inputBase} value={selected.name} onChange={(e) => updateMeta('name', e.target.value)} placeholder="예: 한도윤" maxLength={120} />
                  </div>
                  <div style={{ flex: '1 1 200px', minWidth: 160 }}>
                    <div style={labelStyle}><span><Emoji e="🎬"/></span><span>역할</span></div>
                    <input style={inputBase} value={selected.role} onChange={(e) => updateMeta('role', e.target.value)} placeholder="주인공 / 조력자 / 적대자 …" maxLength={120} />
                  </div>
                </div>

                {/* 질문 그룹들 */}
                {GROUPS.map((g) => {
                  const open = !collapsed[g.title]
                  const gDone = g.questions.filter((q) => selected.answers[q.id] && selected.answers[q.id].trim()).length
                  return (
                    <div key={g.title} style={groupCard}>
                      <div style={groupHead} onClick={() => toggleGroup(g.title)}>
                        <span style={{ fontSize: 15 }}><Emoji e={g.icon}/></span>
                        <span style={{ fontSize: 13, fontWeight: 700, flex: 1 }}>{g.title}</span>
                        <span style={{ fontSize: 11, color: 'var(--muted)' }}>{gDone}/{g.questions.length}</span>
                        <span style={{ fontSize: 12, color: 'var(--muted)' }}>{open ? '▾' : '▸'}</span>
                      </div>
                      {open && (
                        <div style={groupBody}>
                          {g.questions.map((qst, i) => (
                            <div key={qst.id}>
                              <div style={qLabel}>
                                <span style={{ color: 'var(--accent)', fontWeight: 700, flexShrink: 0 }}>Q{i + 1}.</span>
                                <span>{qst.label}</span>
                              </div>
                              <textarea
                                style={areaStyle}
                                value={selected.answers[qst.id] || ''}
                                onChange={(e) => updateAnswer(qst.id, e.target.value)}
                                placeholder={qst.hint || '여기에 답을 적어보세요…'}
                                rows={2}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* [사용자 자율] 사용자 정의 항목 + 고정 '기타' 자유 입력 */}
                <div style={groupCard}>
                  <div style={{ ...groupHead, cursor: 'default' }}>
                    <span style={{ fontSize: 15 }}><Emoji e="📝"/></span>
                    <span style={{ fontSize: 13, fontWeight: 700, flex: 1 }}>나만의 항목 · 기타</span>
                    <button className="minibtn" onClick={addCustomField} title="이름을 정해 빈 입력칸을 추가합니다(직접 작성)" style={{ padding: '3px 9px' }}>＋ 항목 추가</button>
                  </div>
                  <div style={groupBody}>
                    {custom.length === 0 ? (
                      <div style={hint}>필요한 항목이 더 있다면 <b>＋ 항목 추가</b>로 직접 만들어 적을 수 있어요. (자동 생성하지 않습니다)</div>
                    ) : (
                      custom.map((c) => (
                        <div key={c.id}>
                          <div style={qLabel}>
                            <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.label}</span>
                            <button className="minibtn" onClick={() => removeCustomField(c.id)} title="이 항목 삭제" style={{ padding: '2px 7px', flexShrink: 0 }}>✕</button>
                          </div>
                          <textarea
                            style={areaStyle}
                            value={c.value}
                            onChange={(e) => updateCustomValue(c.id, e.target.value)}
                            placeholder="여기에 직접 적어보세요…"
                            rows={2}
                          />
                        </div>
                      ))
                    )}
                    <div>
                      <div style={qLabel}><span><Emoji e="🗒️"/></span><span>기타</span></div>
                      <textarea
                        style={{ ...areaStyle, minHeight: 96 }}
                        value={etc}
                        onChange={(e) => setEtc(e.target.value)}
                        placeholder="질문에 담기지 않은 내용을 자유롭게 적어보세요…"
                        rows={4}
                      />
                    </div>
                  </div>
                </div>

                {/* [프로젝트] 추가 */}
                <div className="linkbar" style={{ marginTop: 4 }}>
                  <span className="linkbar-label">프로젝트:</span>
                  <button
                    className="linkbtn"
                    onClick={() => addCharCardToProject(selected)}
                    disabled={!bridgeOn}
                    title={bridgeOn ? '핵심 답변을 정리해 “인물” 폴더에 인물 카드로 추가' : '프로젝트에 연결되어 있지 않습니다'}
                  ><Emoji e="📄"/> 프로젝트에 인물 카드 추가</button>
                  <button
                    className="linkbtn"
                    onClick={() => addDocToProject(selected)}
                    disabled={!bridgeOn}
                    title={bridgeOn ? '전체 질문·답변을 자료 문서로 추가' : '프로젝트에 연결되어 있지 않습니다'}
                  ><Emoji e="📄"/> 질문지 문서로 추가</button>
                </div>

                {/* [연계] 관련 도구 */}
                <div className="linkbar" style={{ marginTop: 4 }}>
                  <span className="linkbar-label">연계:</span>
                  <button className="linkbtn" onClick={() => openWith('character-sheet', selected)} title="이 인물로 인물 시트 열기"><Emoji e="🧑‍🎤"/> 인물 시트</button>
                  <button className="linkbtn" onClick={() => openWith('relationship-map', selected)} title="이 인물로 관계도 열기"><Emoji e="🕸️"/> 관계도</button>
                  <button className="linkbtn" onClick={() => openWith('character-model', selected)} title="이 인물로 캐릭터 모델 열기"><Emoji e="🧩"/> 캐릭터 모델</button>
                </div>

                {/* 저작권/저장 안내 */}
                <div className="license-note">질문 문항은 본 도구가 프루스트식 설문 형식을 한국어로 재구성한 것이며, 작성하신 답변은 모두 작성자(여러분)의 것입니다.</div>
                <div style={hint}>입력하는 즉시 이 브라우저에 자동 저장됩니다. <Emoji e="📚"/> 라이브러리에 저장하면 다른 인물 도구와 공유할 수 있어요.</div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
