// 인물 인터뷰 — 인물에게 던지는 심층 질문(어린 시절·가장 큰 거짓말·사랑·후회·비밀 등 40+)을
// 하나씩 띄우고 1인칭("나는…")으로 답을 적어 인물을 발견하는 도구.
// 인물별로 답안을 저장(여러 인물 관리), 공유 라이브러리(characters)와 연동, 프로젝트 인물 카드 추가.
// localStorage 자동 저장·복원, 빈 상태 안내, 언마운트 정리. import 는 react 와 './linkbus' 만 사용.
import { useEffect, useRef, useState } from 'react'
import {
  useLibraryList,
  addToLibrary,
  updateInLibrary,
  addToProject,
  hasProjectBridge,
  openToolLinked,
  Emoji,
  type SharedCharacter,
} from './linkbus'

export const meta = { id: 'character-interview', name: '인물 인터뷰', icon: '🎤', group: '구상·정리', intro: '인물에게 던지는 40+개 심층 질문에 1인칭으로 답하며 캐릭터를 발견하세요', w: 720, h: 620 }

const LS_KEY = 'sry:tool:character-interview'

// ───────── 질문 은행(주제별) ─────────
// 각 질문은 고유 id(저장 키)·주제·질문문. 1인칭 답을 유도하도록 인물에게 직접 묻는 어조.
interface Question { id: string; topic: string; q: string }
const QUESTIONS: Question[] = [
  // 어린 시절·뿌리
  { id: 'childhood_home', topic: '뿌리', q: '당신이 자란 곳을 떠올려 보세요. 그곳의 냄새, 소리, 가장 또렷한 한 장면은?' },
  { id: 'first_memory', topic: '뿌리', q: '당신의 가장 오래된 기억은 무엇인가요? 왜 하필 그 장면이 남았을까요?' },
  { id: 'parents', topic: '뿌리', q: '부모(또는 당신을 키운 사람)는 어떤 사람이었나요? 그들에게서 무엇을 물려받았나요?' },
  { id: 'childhood_fear', topic: '뿌리', q: '어릴 적 가장 무서워했던 것은 무엇인가요? 지금도 그 두려움이 남아 있나요?' },
  { id: 'lost_innocence', topic: '뿌리', q: '세상이 생각만큼 안전하지 않다는 걸 처음 깨달은 순간은 언제였나요?' },
  { id: 'role_model', topic: '뿌리', q: '어릴 때 닮고 싶었던 사람은 누구였나요? 지금은 어떻게 생각하나요?' },
  // 정체성·내면
  { id: 'describe_self', topic: '정체성', q: '낯선 사람에게 자신을 딱 세 단어로 소개한다면? 그리고 그게 진짜 당신인가요?' },
  { id: 'mask', topic: '정체성', q: '남들에게 보이는 당신과 진짜 당신의 가장 큰 차이는 무엇인가요?' },
  { id: 'proud', topic: '정체성', q: '스스로 가장 자랑스러운 점은 무엇인가요?' },
  { id: 'ashamed', topic: '정체성', q: '아무에게도 말하지 못한, 스스로 부끄러운 점이 있나요?' },
  { id: 'change_self', topic: '정체성', q: '당신을 단 하나 바꿀 수 있다면 무엇을 바꾸겠어요? 왜죠?' },
  { id: 'others_wrong', topic: '정체성', q: '사람들이 당신에 대해 가장 크게 오해하는 점은 무엇인가요?' },
  { id: 'body', topic: '정체성', q: '거울 속 자신을 볼 때 가장 먼저 보이는 건 무엇인가요?' },
  // 욕망·목표
  { id: 'want_most', topic: '욕망', q: '지금 이 순간 세상에서 가장 갖고 싶은 것은 무엇인가요?' },
  { id: 'true_want', topic: '욕망', q: '겉으로 원한다고 말하는 것과, 정말로 바라는 것이 다른가요?' },
  { id: 'dream', topic: '욕망', q: '아무런 제약이 없다면, 당신은 어떤 삶을 살고 싶나요?' },
  { id: 'sacrifice', topic: '욕망', q: '원하는 것을 얻기 위해 절대 포기할 수 없는 것은 무엇인가요?' },
  { id: 'success', topic: '욕망', q: '당신에게 "성공한 삶"이란 어떤 모습인가요?' },
  { id: 'price', topic: '욕망', q: '지금 원하는 것을 얻는다면, 그 대가로 무엇을 치러야 할까요?' },
  // 두려움·약점
  { id: 'biggest_fear', topic: '두려움', q: '한밤중에 당신을 깨우는 가장 큰 두려움은 무엇인가요?' },
  { id: 'avoid', topic: '두려움', q: '당신이 무슨 수를 써서라도 피하려는 상황은 무엇인가요?' },
  { id: 'weakness', topic: '두려움', q: '스스로 인정하는 가장 치명적인 약점은 무엇인가요?' },
  { id: 'breaking_point', topic: '두려움', q: '당신을 완전히 무너뜨릴 수 있는 단 한 가지는 무엇인가요?' },
  { id: 'helpless', topic: '두려움', q: '가장 무력하다고 느꼈던 순간은 언제였나요?' },
  // 사랑·관계
  { id: 'love', topic: '관계', q: '누군가를(혹은 무언가를) 진심으로 사랑한 적이 있나요? 그것은 어떤 느낌이었나요?' },
  { id: 'trust', topic: '관계', q: '세상에서 가장 믿는 사람은 누구인가요? 왜 그 사람인가요?' },
  { id: 'betrayal', topic: '관계', q: '누군가에게 배신당한 적이 있나요? 그 일은 당신을 어떻게 바꿨나요?' },
  { id: 'enemy', topic: '관계', q: '당신이 가장 미워하는 사람은 누구인가요? 그 미움의 뿌리는 어디에 있나요?' },
  { id: 'loneliness', topic: '관계', q: '언제 가장 외롭다고 느끼나요?' },
  { id: 'who_misses', topic: '관계', q: '당신이 사라진다면, 가장 그리워할 사람은 누구일까요?' },
  { id: 'unsaid', topic: '관계', q: '누군가에게 끝내 하지 못한 말이 있나요? 그게 무엇인가요?' },
  // 과거·상처
  { id: 'biggest_lie', topic: '과거', q: '당신이 살면서 한 가장 큰 거짓말은 무엇인가요? 누구를 위한 거짓말이었나요?' },
  { id: 'regret', topic: '과거', q: '돌이킬 수 있다면 되돌리고 싶은 일이 있나요?' },
  { id: 'wound', topic: '과거', q: '아직도 아물지 않은 마음의 상처가 있나요? 누가, 어떻게 남긴 상처인가요?' },
  { id: 'turning_point', topic: '과거', q: '당신의 인생을 바꿔 놓은 결정적 사건 하나를 꼽는다면?' },
  { id: 'guilt', topic: '과거', q: '아직도 죄책감을 느끼는 일이 있나요?' },
  { id: 'forgive', topic: '과거', q: '용서하지 못한 사람이 있나요? 혹은 스스로를 용서하지 못했나요?' },
  // 비밀·도덕
  { id: 'secret', topic: '비밀', q: '드러나면 모든 것이 무너질, 당신만 아는 비밀이 있나요?' },
  { id: 'crossed_line', topic: '비밀', q: '평소의 당신이라면 절대 하지 않을 일을 한 적이 있나요?' },
  { id: 'moral_limit', topic: '비밀', q: '소중한 것을 지키기 위해서라면, 어디까지 할 수 있나요?' },
  { id: 'never_do', topic: '비밀', q: '아무리 궁지에 몰려도 절대 하지 않을 일은 무엇인가요?' },
  // 일상·디테일
  { id: 'morning', topic: '일상', q: '평범한 하루의 아침은 어떻게 시작되나요?' },
  { id: 'comfort', topic: '일상', q: '지치고 무너졌을 때, 당신을 위로하는 것은 무엇인가요?' },
  { id: 'habit_tell', topic: '일상', q: '긴장하거나 거짓말할 때 자기도 모르게 나오는 버릇이 있나요?' },
  { id: 'possession', topic: '일상', q: '잃어버리면 가장 가슴 아플 물건은 무엇인가요? 왜죠?' },
  { id: 'joy', topic: '일상', q: '아주 사소하지만 당신을 진심으로 기쁘게 하는 것은?' },
  // 세계관·미래
  { id: 'believe', topic: '믿음', q: '당신이 목숨을 걸 만큼 굳게 믿는 한 가지가 있나요?' },
  { id: 'god', topic: '믿음', q: '죽음 이후에 무언가 있다고 믿나요? 그 믿음이 당신을 어떻게 움직이나요?' },
  { id: 'epitaph', topic: '미래', q: '당신의 묘비에 단 한 문장을 새긴다면 무엇이라 적고 싶나요?' },
  { id: 'future_self', topic: '미래', q: '10년 뒤의 당신에게 한마디 한다면?' },
  { id: 'last_words', topic: '미래', q: '오늘이 마지막 날이라면, 무엇을 하고 누구를 찾아가겠어요?' },
]

const TOPICS = [...new Set(QUESTIONS.map((q) => q.topic))]
const TOPIC_ICON: Record<string, string> = {
  뿌리: '🌱', 정체성: '🪞', 욕망: '🔥', 두려움: '😨', 관계: '🤝', 과거: '⏳', 비밀: '🤫', 일상: '☕', 믿음: '🙏', 미래: '🕯️',
}

// ───────── 데이터 구조 ─────────
// 한 인물: 이름 + 질문 id → 1인칭 답.
interface Interviewee {
  id: string
  name: string
  role: string
  answers: Record<string, string>
  libId?: string       // 공유 라이브러리에 연결된 경우 원본 id
  photo?: string
  photoCredit?: string
}

function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch {}
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}
const str = (v: unknown) => (typeof v === 'string' ? v : '')

function emptyPerson(): Interviewee {
  return { id: newId(), name: '', role: '', answers: {} }
}

// localStorage 읽기 — 미지원/손상 시 빈 배열.
function loadPeople(): Interviewee[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((x) => x && typeof x === 'object')
      .map((x: Record<string, unknown>) => {
        const ansRaw = (x.answers && typeof x.answers === 'object') ? x.answers as Record<string, unknown> : {}
        const answers: Record<string, string> = {}
        for (const [k, v] of Object.entries(ansRaw)) if (typeof v === 'string') answers[k] = v
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
  } catch { return [] }
}

// 답한 질문 수.
const answeredCount = (p: Interviewee) => QUESTIONS.filter((q) => str(p.answers[q.id]).trim()).length

// 인터뷰를 읽기 좋은 텍스트로(복사·내보내기).
function toText(p: Interviewee): string {
  const lines: string[] = []
  lines.push(`■ 인물 인터뷰 — ${p.name.trim() || '(이름 없는 인물)'}`)
  if (p.role.trim()) lines.push(`역할: ${p.role.trim()}`)
  lines.push('')
  for (const t of TOPICS) {
    const qs = QUESTIONS.filter((q) => q.topic === t && str(p.answers[q.id]).trim())
    if (!qs.length) continue
    lines.push(`【${t}】`)
    for (const q of qs) {
      lines.push(`Q. ${q.q}`)
      lines.push(`A. ${p.answers[q.id].trim()}`)
      lines.push('')
    }
  }
  return lines.join('\n').trimEnd()
}

// HTML escape(프로젝트 본문용).
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// 인터뷰 → 프로젝트 인물 카드 본문 HTML(전체 Q&A를 주제별로).
function toBodyHtml(p: Interviewee): string {
  const parts: string[] = []
  parts.push(`<h2>인물 인터뷰 — ${esc(p.name.trim() || '이름 없는 인물')}</h2>`)
  if (p.role.trim()) parts.push(`<p><b>역할:</b> ${esc(p.role.trim())}</p>`)
  for (const t of TOPICS) {
    const qs = QUESTIONS.filter((q) => q.topic === t && str(p.answers[q.id]).trim())
    if (!qs.length) continue
    parts.push(`<h3>${esc(t)}</h3>`)
    for (const q of qs) {
      parts.push(`<p><b>Q. ${esc(q.q)}</b></p>`)
      parts.push(`<p>${esc(p.answers[q.id].trim()).replace(/\n/g, '<br>')}</p>`)
    }
  }
  if (parts.length <= 1) parts.push('<p>(아직 답한 질문이 없습니다.)</p>')
  return parts.join('')
}

// 인터뷰 답을 정규 캐릭터 필드(키→값)로 매핑. 받는 허브(인물 시트 등)에서 제자리 칸으로 들어가게 한다.
// 뭉친 답은 의미가 맞는 정규 키에 줄바꿈으로 합치고, 매핑이 모호하면 notes 로.
function toCharacterFields(p: Interviewee): Record<string, string> {
  const a = (id: string) => str(p.answers[id]).trim()
  const f: Record<string, string> = {}
  const put = (k: string, ...vals: string[]) => { const v = vals.filter(Boolean).join('\n').trim(); if (v) f[k] = v }
  put('name', p.name.trim() || '(이름 없는 인물)')
  put('role', p.role.trim())
  put('personality', a('describe_self'), a('mask'), a('proud'), a('ashamed'))
  put('value', a('believe'), a('god'))
  put('goal', a('want_most'), a('true_want'), a('dream'), a('success'))
  put('motivation', a('sacrifice'), a('price'))
  put('fear', a('biggest_fear'), a('childhood_fear'), a('avoid'))
  put('flaw', a('weakness'), a('breaking_point'))
  put('secret', a('secret'), a('biggest_lie'), a('crossed_line'))
  put('habit', a('habit_tell'))
  put('relations', a('trust'), a('betrayal'), a('enemy'), a('love'), a('unsaid'))
  put('background', a('childhood_home'), a('parents'), a('turning_point'), a('wound'))
  put('arc', a('change_self'), a('future_self'), a('regret'), a('forgive'))
  put('notes', a('guilt'), a('possession'), a('epitaph'), a('last_words'))
  return f
}

// 공유 라이브러리 저장용 patch — 인터뷰 핵심 답을 알맞은 필드로 추렴.
function toSharedPatch(p: Interviewee): Partial<SharedCharacter> {
  const a = (id: string) => str(p.answers[id]).trim()
  const traits: { k: string; v: string }[] = []
  const answered = QUESTIONS.filter((q) => a(q.id))
  for (const q of answered.slice(0, 12)) traits.push({ k: q.q.slice(0, 22) + (q.q.length > 22 ? '…' : ''), v: p.answers[q.id].trim() })
  const fields = toCharacterFields(p)
  return {
    name: p.name.trim() || '(이름 없는 인물)',
    role: p.role.trim() || undefined,
    personality: [a('describe_self'), a('mask')].filter(Boolean).join('\n') || undefined,
    goal: [a('want_most'), a('true_want'), a('dream')].filter(Boolean).join('\n') || undefined,
    secret: [a('secret'), a('biggest_lie')].filter(Boolean).join('\n') || undefined,
    notes: a('wound') || a('regret') || undefined,
    traits: traits.length ? traits : undefined,
    fields: Object.keys(fields).length ? fields : undefined,
    photo: p.photo || undefined,
    photoCredit: p.photoCredit || undefined,
    source: '인물 인터뷰',
  }
}

export default function CharacterInterview({ payload }: { payload?: Record<string, unknown> }) {
  const [people, setPeople] = useState<Interviewee[]>(() => loadPeople())
  const [selId, setSelId] = useState<string | null>(() => { const i = loadPeople(); return i.length ? i[0].id : null })
  const [qIndex, setQIndex] = useState(0)               // 현재 질문 인덱스
  const [filter, setFilter] = useState<string>('all')   // 주제 필터('all' 또는 주제명)
  const [onlyUnanswered, setOnlyUnanswered] = useState(false)
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const [custom, setCustom] = useState<{ id: string; label: string; value: string }[]>([])  // 사용자 정의 항목(이름은 유지, 값은 직접 입력)
  const [etc, setEtc] = useState('')                    // 고정 '기타' 자유 입력
  const [note, setNote] = useState('')                  // 저장 차단 경고
  const [flash, setFlash] = useState('')                // 일시 안내
  const mounted = useRef(true)
  const flashTimer = useRef<number | null>(null)
  const taRef = useRef<HTMLTextAreaElement | null>(null)

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
    try { localStorage.setItem(LS_KEY, JSON.stringify(people)) }
    catch { if (mounted.current) setNote('이 브라우저에서 저장이 막혀 있어 새로고침하면 답안이 사라질 수 있어요.') }
  }, [people])

  // 선택 인물이 사라지면 보정.
  useEffect(() => {
    if (selId && !people.some((p) => p.id === selId)) setSelId(people.length ? people[0].id : null)
  }, [people, selId])

  const showFlash = (msg: string) => {
    setFlash(msg)
    if (flashTimer.current !== null) clearTimeout(flashTimer.current)
    flashTimer.current = window.setTimeout(() => { if (mounted.current) setFlash('') }, 1800)
  }

  // payload.character / payload.name 으로 인물을 받아 새 인터뷰 대상 추가(1회).
  const consumed = useRef<unknown>(undefined)
  useEffect(() => {
    const raw = payload?.character ?? (payload?.name ? { name: payload.name } : undefined)
    if (!raw) return
    if (consumed.current === raw) return
    consumed.current = raw
    const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
    const p = emptyPerson()
    p.name = str(o.name)
    p.role = str(o.role)
    p.photo = typeof o.photo === 'string' ? o.photo : undefined
    p.photoCredit = typeof o.photoCredit === 'string' ? o.photoCredit : undefined
    setPeople((prev) => [...prev, p])
    setSelId(p.id)
    setQIndex(0)
    // 전달받은 새 인물: 사용자 정의 항목 값·기타는 비우되, 항목(이름)은 유지.
    setCustom((prev) => prev.map((c) => ({ ...c, value: '' })))
    setEtc('')
    showFlash('전달받은 인물로 인터뷰를 시작합니다.')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload])

  const selected = people.find((p) => p.id === selId) || null

  // 현재 필터에 해당하는 질문 목록(주제·미답 필터 적용).
  const visibleQs = QUESTIONS.filter((q) => {
    if (filter !== 'all' && q.topic !== filter) return false
    if (onlyUnanswered && selected && str(selected.answers[q.id]).trim()) return false
    return true
  })
  // qIndex 보정(필터 변경 등으로 범위를 벗어나면).
  const safeIndex = visibleQs.length === 0 ? 0 : Math.min(qIndex, visibleQs.length - 1)
  const currentQ: Question | null = visibleQs[safeIndex] || null

  // 필터/대상 변경 시 인덱스 리셋.
  useEffect(() => { setQIndex(0) }, [filter, onlyUnanswered, selId])

  const addPerson = () => {
    const p = emptyPerson()
    setPeople((prev) => [...prev, p])
    setSelId(p.id); setQIndex(0); setConfirmDel(null)
    // 새 인물: 사용자 정의 항목의 '값'과 '기타'는 비우되, 항목(이름)은 유지.
    setCustom((prev) => prev.map((c) => ({ ...c, value: '' })))
    setEtc('')
  }

  // 사용자 정의 항목: 추가(이름은 prompt) / 값 변경 / 삭제.
  const addCustomField = () => {
    let label = ''
    try { label = window.prompt('추가할 항목의 이름을 입력하세요 (예: 말버릇, 좋아하는 음식)', '') || '' } catch {}
    label = label.trim()
    if (!label) return
    setCustom((prev) => [...prev, { id: newId(), label, value: '' }])
  }
  const updateCustom = (id: string, v: string) => setCustom((prev) => prev.map((c) => c.id === id ? { ...c, value: v } : c))
  const removeCustom = (id: string) => setCustom((prev) => prev.filter((c) => c.id !== id))

  // 사용자 정의 항목·기타를 fields 맵에 병합(값이 비어있지 않을 때만). 받는 도구에 그대로 나타나게.
  const mergeExtraFields = (fields: Record<string, string>): Record<string, string> => {
    const out = { ...fields }
    for (const c of custom) { const v = c.value.trim(); if (c.label.trim() && v) out[c.label.trim()] = v }
    const e = etc.trim(); if (e) out.etc = e
    return out
  }

  // 복사 텍스트 끝에 사용자 정의 항목·기타를 덧붙임(값이 있을 때만).
  const withExtraText = (base: string): string => {
    const lines: string[] = []
    const filled = custom.filter((c) => c.label.trim() && c.value.trim())
    if (filled.length) { lines.push('', '【추가 항목】'); for (const c of filled) lines.push(`${c.label.trim()}: ${c.value.trim()}`) }
    const e = etc.trim(); if (e) { lines.push('', '【기타】', e) }
    return lines.length ? (base + '\n' + lines.join('\n')).trimEnd() : base
  }

  const updateName = (v: string) => { if (selId) setPeople((prev) => prev.map((p) => p.id === selId ? { ...p, name: v } : p)) }
  const updateRole = (v: string) => { if (selId) setPeople((prev) => prev.map((p) => p.id === selId ? { ...p, role: v } : p)) }
  const updateAnswer = (qid: string, v: string) => {
    if (!selId) return
    setPeople((prev) => prev.map((p) => p.id === selId ? { ...p, answers: { ...p.answers, [qid]: v } } : p))
  }

  const goPrev = () => setQIndex((i) => Math.max(0, Math.min(i, visibleQs.length - 1) - 1))
  const goNext = () => setQIndex((i) => Math.min(visibleQs.length - 1, Math.min(i, visibleQs.length - 1) + 1))
  // 무작위 질문(아직 답하지 않은 것 우선).
  const goRandom = () => {
    if (!visibleQs.length) return
    const sel = selected
    const pool = sel ? visibleQs.filter((q) => !str(sel.answers[q.id]).trim()) : visibleQs
    const arr = pool.length ? pool : visibleQs
    const target = arr[Math.floor(Math.random() * arr.length)]
    const idx = visibleQs.findIndex((q) => q.id === target.id)
    if (idx >= 0) setQIndex(idx)
    setTimeout(() => { try { taRef.current?.focus() } catch {} }, 0)
  }

  const requestDelete = (id: string) => setConfirmDel(id)
  const cancelDelete = () => setConfirmDel(null)
  const confirmDelete = (id: string) => { setPeople((prev) => prev.filter((p) => p.id !== id)); setConfirmDel(null) }

  // 클립보드 복사(폴백 포함).
  const copyText = async (text: string, okMsg: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(text); showFlash(okMsg); return }
    } catch {}
    try {
      const ta = document.createElement('textarea')
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.top = '-1000px'; ta.style.opacity = '0'
      document.body.appendChild(ta); ta.focus(); ta.select()
      const ok = document.execCommand('copy'); document.body.removeChild(ta)
      if (ok) { showFlash(okMsg); return }
    } catch {}
    showFlash('복사에 실패했어요. 텍스트를 직접 선택해 복사하세요.')
  }

  // 공유 라이브러리 저장/업데이트.
  const saveToLibrary = (p: Interviewee) => {
    const patch = toSharedPatch(p)
    const merged = mergeExtraFields(patch.fields || {})
    if (Object.keys(merged).length) patch.fields = merged
    if (p.libId && library.some((x) => x.id === p.libId)) {
      updateInLibrary('characters', p.libId, patch)
      showFlash('라이브러리의 인물을 업데이트했어요.')
    } else {
      const rec = addToLibrary('characters', patch)
      setPeople((prev) => prev.map((x) => x.id === p.id ? { ...x, libId: rec.id } : x))
      showFlash('라이브러리에 인물을 저장했어요.')
    }
  }

  // 프로젝트 인물 카드 추가(자료 › 인물). 전체 Q&A를 본문으로, 핵심 답을 카드 필드로.
  const bridgeOn = hasProjectBridge()
  const addToProjectCard = (p: Interviewee) => {
    if (!hasProjectBridge()) { showFlash('프로젝트에 연결되어 있지 않아요.'); return }
    if (answeredCount(p) === 0) { showFlash('아직 답한 질문이 없어요. 한 가지라도 답한 뒤 추가하세요.'); return }
    const name = p.name.trim() || '이름 없는 인물'
    const a = (id: string) => str(p.answers[id]).trim()
    const character: Record<string, string> = {}
    const put = (k: string, v: string) => { const t = v.trim(); if (t) character[k] = t }
    // 정규 키로 매핑(뭉친 값은 의미가 맞는 정규 키로 분리). 받는 인물 시트에서 제자리 칸으로 들어감.
    put('name', name)
    put('role', p.role)
    put('personality', [a('describe_self'), a('mask'), a('proud')].filter(Boolean).join('\n'))
    put('goal', [a('want_most'), a('true_want'), a('dream')].filter(Boolean).join('\n'))
    put('fear', a('biggest_fear'))
    put('flaw', a('weakness'))
    put('secret', a('secret'))
    put('background', [a('childhood_home'), a('turning_point'), a('wound')].filter(Boolean).join('\n'))
    put('habit', a('habit_tell'))
    // 정규 키 전체를 character 카드 필드(Record<string,string>)에 합쳐 받는 인물 카드가 빠짐없이 채워지게.
    // 위에서 이미 채운 키는 보존하고, 아직 없는 정규 키만 추가(추가만, 덮어쓰기 없음).
    const fields = toCharacterFields(p)
    for (const [k, v] of Object.entries(fields)) if (!character[k]) put(k, v)
    // 사용자 정의 항목·기타도 카드 필드로(값이 있을 때만). 받는 인물 카드에 그대로 나타나게.
    for (const c of custom) { const k = c.label.trim(); const v = c.value.trim(); if (k && v && !character[k]) put(k, v) }
    { const e = etc.trim(); if (e && !character.etc) put('etc', e) }
    const id = addToProject({
      kind: 'character', root: 'research', folder: '인물', title: name,
      character,
      bodyHtml: toBodyHtml(p),
      synopsis: a('describe_self').slice(0, 80) || `${answeredCount(p)}개 질문에 답한 인터뷰`,
      meta: { 인터뷰: `${answeredCount(p)}/${QUESTIONS.length} 답변`, ...(p.role.trim() ? { 역할: p.role.trim() } : {}) },
    })
    showFlash(id ? `‘${name}’을(를) 프로젝트 인물 카드로 추가했어요.` : '프로젝트 추가에 실패했어요.')
  }

  /* ───────── 스타일 ───────── */
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box' }
  const topbar: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0, background: 'var(--chrome-2)', flexWrap: 'wrap' }
  const titleStyle: React.CSSProperties = { fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, marginRight: 'auto' }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, display: 'flex' }
  const sidebar: React.CSSProperties = { width: 210, flexShrink: 0, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', minHeight: 0, background: 'var(--panel)' }
  const sideHead: React.CSSProperties = { padding: '10px', borderBottom: '1px solid var(--border)', flexShrink: 0 }
  const listStyle: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }
  const sideEmpty: React.CSSProperties = { padding: '24px 14px', textAlign: 'center', color: 'var(--muted)', fontSize: 13, lineHeight: 1.6 }
  const main: React.CSSProperties = { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: 0 }
  const mainScroll: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }
  const emptyBox: React.CSSProperties = { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--muted)', fontSize: 14, lineHeight: 1.7, padding: 24, gap: 14 }
  const input: React.CSSProperties = { width: '100%', padding: '8px 10px', fontSize: 13.5, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box', fontFamily: 'inherit' }
  const area: React.CSSProperties = { width: '100%', padding: '12px 14px', fontSize: 15, lineHeight: 1.65, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box', fontFamily: 'inherit', minHeight: 150, resize: 'vertical' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const qCard: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 8 }

  const progress = selected ? answeredCount(selected) : 0
  const pct = Math.round((progress / QUESTIONS.length) * 100)

  return (
    <div style={wrap}>
      <div style={topbar}>
        <div style={titleStyle}><span><Emoji e={meta.icon} /></span><span>인물 인터뷰</span></div>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>인물 {people.length}명 · 질문 {QUESTIONS.length}개</span>
        <button className="btn-primary" onClick={addPerson}>＋ 인물 추가</button>
      </div>

      {(note || flash) && (
        <div style={{ padding: '6px 14px', fontSize: 12, color: note ? 'var(--warn)' : 'var(--ok)', background: 'var(--chrome-2)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          {note || flash}
        </div>
      )}

      <div style={body}>
        {/* 좌측: 인터뷰 대상 목록 */}
        <div style={sidebar}>
          <div style={sideHead}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>인터뷰 대상</span>
          </div>
          {people.length === 0 ? (
            <div style={sideEmpty}>아직 인터뷰할 인물이<br />없어요.<br /><b>＋ 인물 추가</b>로<br />첫 인물을 만들어 보세요.</div>
          ) : (
            <div style={listStyle}>
              {people.map((p) => {
                const active = p.id === selId
                const cnt = answeredCount(p)
                const confirming = confirmDel === p.id
                return (
                  <div key={p.id} onClick={() => { setSelId(p.id); setConfirmDel(null) }}
                    style={{ border: '1px solid ' + (active ? 'var(--accent)' : 'var(--border)'), background: active ? 'var(--chrome-2)' : 'var(--paper)', borderRadius: 10, padding: '8px 10px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 5, boxShadow: active ? '0 0 0 1px var(--accent) inset' : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {p.photo && <img src={p.photo} alt="" style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />}
                      <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: p.name.trim() ? 'var(--text)' : 'var(--muted)' }}>{p.name.trim() || '(이름 없음)'}</span>
                      {p.libId && <span className="license-badge" title="공유 라이브러리에 연결됨" style={{ flexShrink: 0 }}><Emoji e="📚" /></span>}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{cnt}/{QUESTIONS.length} 답변{p.role.trim() ? ` · ${p.role.trim()}` : ''}</div>
                    <div onClick={(e) => e.stopPropagation()} style={{ display: 'flex', gap: 4 }}>
                      {confirming ? (
                        <>
                          <button className="minibtn" onClick={() => confirmDelete(p.id)} style={{ padding: '2px 7px', color: 'var(--warn)', borderColor: 'var(--warn)' }}>삭제 확정</button>
                          <button className="minibtn" onClick={cancelDelete} style={{ padding: '2px 7px' }}>취소</button>
                        </>
                      ) : (
                        <button className="minibtn" onClick={() => requestDelete(p.id)} title="삭제" style={{ padding: '2px 7px' }}><Emoji e="🗑️" /></button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* 우측: 인터뷰 진행 */}
        <div style={main}>
          {!selected ? (
            <div style={emptyBox}>
              <div style={{ fontSize: 40 }}><Emoji e="🎤" /></div>
              <div>{people.length === 0
                ? <>인터뷰할 인물이 없습니다.<br /><b>＋ 인물 추가</b>로 첫 인물을 만들고<br />질문에 <b>1인칭("나는…")</b>으로 답해 보세요.</>
                : <>왼쪽에서 인물을 선택하면<br />여기서 인터뷰를 진행할 수 있어요.</>}</div>
              {people.length === 0 && <button className="btn-primary" onClick={addPerson}>＋ 첫 인물 만들기</button>}
            </div>
          ) : (
            <div style={mainScroll}>
              {/* 인물 헤더(이름·역할·진행률) */}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div style={{ flex: 1, minWidth: 160, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 11, color: 'var(--muted)' }}>인물 이름</label>
                  <input style={input} value={selected.name} onChange={(e) => updateName(e.target.value)} placeholder="예: 한도윤" maxLength={60} />
                </div>
                <div style={{ width: 150, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 11, color: 'var(--muted)' }}>역할(선택)</label>
                  <input style={input} value={selected.role} onChange={(e) => updateRole(e.target.value)} placeholder="주인공 / 적대자…" maxLength={40} />
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>
                  <span>답변 진행</span><span>{progress}/{QUESTIONS.length} ({pct}%)</span>
                </div>
                <div style={{ height: 6, borderRadius: 999, background: 'var(--border)', overflow: 'hidden' }}>
                  <div style={{ width: pct + '%', height: '100%', background: 'var(--accent)', transition: 'width .2s' }} />
                </div>
              </div>

              {/* 필터 */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                <button className={'minibtn' + (filter === 'all' ? ' active' : '')} onClick={() => setFilter('all')}>전체</button>
                {TOPICS.map((t) => (
                  <button key={t} className={'minibtn' + (filter === t ? ' active' : '')} onClick={() => setFilter(t)}><Emoji e={TOPIC_ICON[t] || '•'} /> {t}</button>
                ))}
                <button className={'minibtn' + (onlyUnanswered ? ' active' : '')} onClick={() => setOnlyUnanswered((v) => !v)} style={{ marginLeft: 'auto' }} title="아직 답하지 않은 질문만 보기">미답만</button>
              </div>

              {/* 질문 카드 */}
              {!currentQ ? (
                <div style={{ ...qCard, alignItems: 'center', textAlign: 'center', color: 'var(--muted)' }}>
                  {onlyUnanswered ? '이 조건에 해당하는 미답 질문이 없어요. 모두 답했거나, 다른 주제를 골라 보세요.' : '표시할 질문이 없어요.'}
                </div>
              ) : (
                <div style={qCard}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="license-badge" style={{ background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' }}><Emoji e={TOPIC_ICON[currentQ.topic] || '•'} /> {currentQ.topic}</span>
                    <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 'auto' }}>{safeIndex + 1} / {visibleQs.length}</span>
                  </div>
                  <div style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.45 }}>{currentQ.q}</div>
                  <textarea
                    ref={taRef}
                    style={area}
                    value={selected.answers[currentQ.id] || ''}
                    onChange={(e) => updateAnswer(currentQ.id, e.target.value)}
                    placeholder='인물의 입을 빌려 1인칭으로 답해 보세요. "나는…"'
                  />
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <button className="minibtn" onClick={goPrev} disabled={safeIndex <= 0}>← 이전</button>
                    <button className="minibtn" onClick={goNext} disabled={safeIndex >= visibleQs.length - 1}>다음 →</button>
                    <button className="minibtn" onClick={goRandom} title="무작위 질문(미답 우선)"><Emoji e="🎲" /> 무작위 질문</button>
                    <span style={{ flex: 1 }} />
                    {str(selected.answers[currentQ.id]).trim()
                      ? <span style={{ fontSize: 11, color: 'var(--ok)' }}>답변됨 ✓</span>
                      : <span style={{ fontSize: 11, color: 'var(--muted)' }}>아직 답하지 않음</span>}
                  </div>
                </div>
              )}

              {/* 작업 버튼 */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className="minibtn" onClick={() => copyText(withExtraText(toText(selected)), '인터뷰를 텍스트로 복사했어요.')} disabled={progress === 0 && !custom.some((c) => c.value.trim()) && !etc.trim()}><Emoji e="📋" /> 인터뷰 복사</button>
              </div>

              {/* 사용자 정의 항목 + 고정 '기타' */}
              <div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10, background: 'var(--panel)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>추가 항목</span>
                  <button className="minibtn" onClick={addCustomField} title="원하는 항목을 직접 추가하고 내용을 적으세요" style={{ marginLeft: 'auto' }}>＋ 항목 추가</button>
                </div>
                {custom.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {custom.map((c) => (
                      <div key={c.id} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <label style={{ fontSize: 11, color: 'var(--muted)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.label}</label>
                          <button className="minibtn" onClick={() => removeCustom(c.id)} title="이 항목 삭제" style={{ padding: '2px 7px', flexShrink: 0 }}>✕</button>
                        </div>
                        <textarea style={{ ...area, minHeight: 56, fontSize: 13.5, padding: '8px 10px' }} value={c.value} onChange={(e) => updateCustom(c.id, e.target.value)} placeholder="내용을 직접 적으세요" />
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 11, color: 'var(--muted)' }}>기타</label>
                  <textarea style={{ ...area, minHeight: 90 }} value={etc} onChange={(e) => setEtc(e.target.value)} placeholder="여기에 자유롭게 더 적을 수 있어요." />
                </div>
              </div>

              {/* 프로젝트 연동 */}
              <div className="linkbar">
                <span className="linkbar-label">프로젝트:</span>
                <button className="linkbtn" onClick={() => addToProjectCard(selected)} disabled={!bridgeOn}
                  title={bridgeOn ? '인터뷰 내용을 “자료 › 인물” 폴더에 인물 카드로 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄" /> 프로젝트에 인물 카드 추가</button>
              </div>

              {/* 라이브러리·연계 */}
              <div className="linkbar">
                <span className="linkbar-label">연계:</span>
                <button className="linkbtn" onClick={() => saveToLibrary(selected)} title="공유 라이브러리에 저장(또는 업데이트)">
                  {selected.libId && library.some((x) => x.id === selected.libId) ? <><Emoji e="📚" /> 라이브러리 업데이트</> : <><Emoji e="📚" /> 라이브러리에 저장</>}
                </button>
                <button className="linkbtn" onClick={() => { const patch = toSharedPatch(selected); const m = mergeExtraFields(patch.fields || {}); openToolLinked('character-sheet', { character: { ...patch, fields: Object.keys(m).length ? m : patch.fields, id: selected.libId } }) }} title="이 인물로 인물 시트 열기"><Emoji e="🧑‍🎤" /> 인물 시트</button>
                <button className="linkbtn" onClick={() => { const patch = toSharedPatch(selected); const m = mergeExtraFields(patch.fields || {}); openToolLinked('relationship-map', { character: { ...patch, fields: Object.keys(m).length ? m : patch.fields, id: selected.libId } }) }} title="관계도 열기"><Emoji e="🕸️" /> 관계도</button>
              </div>

              <div style={hint}>답은 인물의 입을 빌려 <b>1인칭</b>으로 적을수록 캐릭터가 살아납니다. 입력 즉시 이 브라우저에 자동 저장돼요. 라이브러리에 저장하면 인물 시트·관계도 등 다른 도구와 공유됩니다.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
