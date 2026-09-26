// 투고서·쿼리레터 작성기 — 출판사/에이전트에 보내는 한 통의 투고 편지를 단계별로 조립한다.
//  단계: 받는 사람(인사) → 후킹 한 줄 → 로그라인 → 메타데이터(제목/장르/분량/카테고리) → 비교작(comp titles)
//        → 짧은 시놉시스(본문) → 작가 소개 → 맺음말, 을 채우면 실제 투고서 한 통으로 종합한다.
//  각 항목마다 작성 가이드·예시·길이 점검을 제공하고, 빠진 핵심 요소를 경고한다.
//  자급식: react 외 import 없음(외부 네트워크/키 불필요). 전부 로컬.
//  CRUD: 작성한 투고서를 localStorage('sry:tool:query-letter')에 자동 저장/복원(여러 통 보관·수정·삭제·순서).
//  연계: 완성 투고서를 프로젝트 자료 〈투고〉 폴더에 문서로 추가 / 수집함에 담기 / 스니펫 라이브러리에 저장.
import { useEffect, useRef, useState } from 'react'
import {
  addToProject, hasProjectBridge,
  addToLibrary,
  addToStash, hasStash,
  Emoji,
} from './linkbus'

export const meta = { id: 'query-letter', name: '투고서·쿼리레터 작성기', icon: '✉️', group: '구상·정리', intro: '후킹 한 줄·로그라인·시놉·작가 소개를 채우면 투고 편지 한 통으로 종합합니다', w: 720, h: 760 }

const LS_KEY = 'sry:tool:query-letter'

// ---------- 데이터 모델 ----------
type CategoryKey = 'picture' | 'chapter' | 'mg' | 'ya' | 'na' | 'adult-novel' | 'novella' | 'short' | 'nonfiction' | 'memoir' | 'webnovel'

interface Draft {
  // 받는 사람 / 인사
  agentName: string       // 받는 사람(에이전트/편집자) 이름
  agency: string          // 소속(에이전시/출판사)
  personalize: string     // 개인화 한 줄(왜 이분께 보내는가)
  // 후킹·로그라인
  hook: string            // 후킹 한 줄(편지의 첫 문장)
  logline: string         // 로그라인(한두 문장)
  // 메타데이터
  title: string           // 작품 제목
  category: CategoryKey   // 카테고리(독자층/형식)
  genre: string           // 장르
  wordCount: string       // 분량(원고지/단어/만자 등 자유 입력)
  comps: string           // 비교작(comp titles) — 줄바꿈/쉼표 구분
  // 본문
  synopsis: string        // 짧은 시놉시스(2~3문단)
  // 작가 소개
  bio: string             // 작가 소개
  credits: string         // 발표 이력·수상·관련 경력(선택)
  // 맺음말
  closing: string         // 맺음말(전문 동봉 안내 등)
  signature: string       // 보내는 사람(서명)
  contact: string         // 연락처(선택)
}

interface Saved extends Draft {
  id: string
  name: string            // 보관 제목
  createdAt: number
  updatedAt: number
}

const CATEGORIES: { key: CategoryKey; label: string; note: string; wordHint: string }[] = [
  { key: 'picture', label: '그림책', note: '글작가/글그림작가 — 본문은 짧고 운율·반복이 핵심', wordHint: '대개 500~1,000단어(국문 1,000~2,500자)' },
  { key: 'chapter', label: '저학년 동화(챕터북)', note: '초등 저학년 독자, 삽화 동반', wordHint: '대개 5,000~10,000단어' },
  { key: 'mg', label: '아동(미들그레이드)', note: '초등 고학년~중학 초, 8~12세', wordHint: '대개 30,000~55,000단어' },
  { key: 'ya', label: '청소년(YA)', note: '10대 주인공·정체성·성장', wordHint: '대개 50,000~90,000단어' },
  { key: 'na', label: '뉴어덜트(NA)', note: '20대 초반·대학/사회 진입기', wordHint: '대개 60,000~90,000단어' },
  { key: 'adult-novel', label: '성인 장편소설', note: '일반/장르 성인 독자', wordHint: '장르별 70,000~120,000단어' },
  { key: 'novella', label: '경장편(노벨라)', note: '단편과 장편 사이', wordHint: '대개 17,500~40,000단어' },
  { key: 'short', label: '단편소설', note: '문예지/공모전·앤솔러지', wordHint: '대개 1,000~7,500단어(공모 규정 우선)' },
  { key: 'nonfiction', label: '논픽션/실용', note: '제안서(프로포절) 중심, 시장·저자 권위 강조', wordHint: '제안서 + 표본 원고' },
  { key: 'memoir', label: '회고록/에세이', note: '실화이되 서사·주제가 필요', wordHint: '대개 70,000~100,000단어' },
  { key: 'webnovel', label: '웹소설/연재', note: '플랫폼 투고·연재 — 회차·키워드·완결 여부 강조', wordHint: '회차당 분량·총 회차·연재 주기 명시' },
]

const GENRE_PRESETS = [
  '판타지', '로맨스', '로맨스판타지', '무협', '미스터리·스릴러', 'SF', '호러', '역사',
  '문학·순문학', '성장소설', '코지 미스터리', '디스토피아', '어반 판타지', '범죄·느와르',
  '청춘·드라마', '가족·일상', '논픽션', '에세이', '아동·동화',
]

// ---------- 단계 정의 ----------
interface Step {
  key: string
  icon: string
  label: string
  required: boolean
  guide: string           // 이 항목 작성 가이드
  examples: string[]      // 한두 개의 예시(자체 창작)
  // 길이 점검: [warnUnderChars, idealMaxChars] — 글자 수 기준 부드러운 안내(강제 아님)
  length?: { soft: number; hard: number }
}

const STEPS: Step[] = [
  {
    key: 'greeting', icon: '🤝', label: '받는 사람 · 인사',
    required: false,
    guide: '받는 분의 이름과 소속을 정확히 적고, “왜 이분(이 출판사)께 보내는가”를 한 줄로 밝히세요. 무작위 대량 발송이 아니라는 인상을 줍니다. 이름을 모르면 비워 두면 “담당자님”으로 처리됩니다.',
    examples: [
      '○○님께서 펴내신 《어느 책》을 인상 깊게 읽고, 제 원고도 같은 결을 지녔다고 생각해 보내드립니다.',
      '인터뷰에서 “느린 호흡의 가족 서사”를 찾으신다는 말씀을 보고 이 작품이 떠올랐습니다.',
    ],
  },
  {
    key: 'hook', icon: '🪝', label: '후킹 한 줄',
    required: true,
    guide: '편지의 첫 문장이자 미끼입니다. 가장 흥미로운 갈등·역설·질문을 한 문장으로. 설명하지 말고 “읽고 싶게” 만드세요. 로그라인과 겹치면 더 날카로운 쪽을 후킹으로 두세요.',
    examples: [
      '죽은 사람만 볼 수 있는 소녀가, 자신의 장례식에서 낯선 조문객을 발견한다.',
      '거짓말을 하면 하루씩 수명이 줄어드는 세상에서, 그는 사랑한다는 말을 아낀다.',
    ],
    length: { soft: 120, hard: 200 },
  },
  {
    key: 'logline', icon: '🎯', label: '로그라인',
    required: true,
    guide: '“[상황]의 [주인공]이 [목표]하지만 [장애물]; 실패하면 [위험]” 골격으로 한두 문장. 주인공·욕망·갈등·판돈이 모두 드러나야 합니다.',
    examples: [
      '국경이 봉쇄된 도시에서 누명을 쓴 우편배달부가 진실을 밝히려 하지만, 유일한 증인이 입을 닫고 시간은 줄어든다 — 실패하면 무고한 이가 대신 처형된다.',
      '기억을 파는 상인이 잃어버린 딸을 찾으려 자신의 기억까지 내다 팔지만, 마지막 한 조각을 팔면 딸을 알아볼 수조차 없게 된다.',
    ],
    length: { soft: 300, hard: 500 },
  },
  {
    key: 'meta', icon: '🏷️', label: '메타데이터(제목·장르·분량)',
    required: true,
    guide: '작품 제목, 카테고리(독자층/형식), 장르, 분량을 명시합니다. 보통 후킹/로그라인 직후 또는 본문 끝에 한 문장으로 넣습니다. 카테고리를 고르면 권장 분량 가이드가 표시됩니다.',
    examples: [
      '《잊혀진 이름》은 70,000단어 분량의 성인 판타지 장편입니다.',
      '《빗속의 우체통》은 12회 완결(회차당 5,000자)의 로맨스 웹소설입니다.',
    ],
  },
  {
    key: 'comps', icon: '📚', label: '비교작(comp titles)',
    required: false,
    guide: '“○○ × △△”처럼 분위기·독자층이 비슷한 최근 작품 1~2개를 들면 편집자가 시장 위치를 단번에 잡습니다. 너무 유명한 베스트셀러보다, 결이 닮은 동시대 작품이 설득력 있습니다.',
    examples: [
      '《달빛 조각사》의 성장 쾌감에 《미스트본》의 마법 체계를 더한 결입니다.',
      '잔잔한 가족 드라마를 좋아하는 《아몬드》 독자에게 가닿을 작품입니다.',
    ],
  },
  {
    key: 'synopsis', icon: '📝', label: '짧은 시놉시스(본문)',
    required: true,
    guide: '편지 본문의 심장. 2~3문단으로 주인공의 욕망 → 갈등 고조 → 중대한 선택/판돈까지. 결말 전체를 다 밝히지 말고, “계속 읽고 싶게” 1막~2막 위주로. 인물 이름은 1~2명만, 능동적인 동사로.',
    examples: [
      '〔주인공〕은 〔평범한 일상〕을 살던 중 〔사건〕에 휘말린다. 〔욕망〕을 좇을수록 〔장애물〕이 거세지고, 믿었던 〔인물〕마저 등을 돌린다.\n\n진실에 다가갈수록 〔대가〕가 분명해진다. 〔주인공〕은 〔딜레마〕 앞에서, 지키려던 것을 잃을지 모른다는 사실과 마주한다.',
    ],
    length: { soft: 900, hard: 1500 },
  },
  {
    key: 'bio', icon: '🪪', label: '작가 소개',
    required: true,
    guide: '3인칭 또는 1인칭으로 짧게. 발표 이력·수상·관련 경력·집필 동기를 사실 위주로. 이력이 없다면 “이 이야기를 쓸 자격(체험·전문성)”이나 진솔한 한두 문장으로 대신하세요. 겸손하되 자신감 있게.',
    examples: [
      '〔이름〕은 ○○ 신인문학상으로 등단해 단편 「△△」를 발표했습니다. 이번 작품은 첫 장편입니다.',
      '간호사로 10년간 일하며 보고 들은 임종의 순간들이 이 소설의 바탕이 되었습니다.',
    ],
    length: { soft: 400, hard: 700 },
  },
  {
    key: 'closing', icon: '📮', label: '맺음말 · 서명',
    required: false,
    guide: '전문(또는 표본 원고) 동봉 여부, 동시 투고 여부, 검토 감사 인사를 간결하게. 마지막에 이름과 연락처(선택)를 남깁니다.',
    examples: [
      '요청하시면 전문을 바로 보내드리겠습니다. 귀한 시간 내어 읽어 주셔서 감사합니다.',
      '본 작품은 여러 곳에 동시 투고 중임을 알려드립니다. 검토해 주셔서 감사합니다.',
    ],
  },
]

// ---------- 유틸 ----------
function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch { /* noop */ }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

const blankDraft = (): Draft => ({
  agentName: '', agency: '', personalize: '',
  hook: '', logline: '',
  title: '', category: 'adult-novel', genre: '', wordCount: '', comps: '',
  synopsis: '',
  bio: '', credits: '',
  closing: '', signature: '', contact: '',
})

function coerceDraft(p: unknown): Draft {
  const b = blankDraft()
  if (!p || typeof p !== 'object') return b
  const o = p as Record<string, unknown>
  const s = (k: keyof Draft): string => (typeof o[k] === 'string' ? (o[k] as string) : '')
  const cat = CATEGORIES.some((c) => c.key === o.category) ? (o.category as CategoryKey) : 'adult-novel'
  return {
    agentName: s('agentName'), agency: s('agency'), personalize: s('personalize'),
    hook: s('hook'), logline: s('logline'),
    title: s('title'), category: cat, genre: s('genre'), wordCount: s('wordCount'), comps: s('comps'),
    synopsis: s('synopsis'),
    bio: s('bio'), credits: s('credits'),
    closing: s('closing'), signature: s('signature'), contact: s('contact'),
  }
}

function loadState(): { cur: Draft; saved: Saved[] } {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return { cur: blankDraft(), saved: [] }
    const p = JSON.parse(raw)
    const cur = coerceDraft(p?.cur)
    const saved: Saved[] = Array.isArray(p?.saved)
      ? p.saved.filter((x: unknown) => x && typeof x === 'object').map((x: Record<string, unknown>) => ({
          ...coerceDraft(x),
          id: String(x.id || newId()),
          name: String(x.name || ''),
          createdAt: Number.isFinite(x.createdAt) ? (x.createdAt as number) : Date.now(),
          updatedAt: Number.isFinite(x.updatedAt) ? (x.updatedAt as number) : Date.now(),
        }))
      : []
    return { cur, saved }
  } catch {
    return { cur: blankDraft(), saved: [] }
  }
}

const escapeHtml = (s: string) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// 콤마/줄바꿈으로 나뉜 비교작을 정리
function compList(raw: string): string[] {
  return raw.split(/[\n,]/).map((s) => s.trim()).filter(Boolean)
}

const catLabel = (k: CategoryKey) => CATEGORIES.find((c) => c.key === k)?.label || ''

// ---------- 투고서 종합(평문) ----------
function buildLetterLines(d: Draft): string[] {
  const lines: string[] = []
  // 인사
  const who = d.agentName.trim()
  const agency = d.agency.trim()
  if (who || agency) {
    const honorific = who ? `${who} 님께` : '담당자님께'
    lines.push(agency ? `${agency} ${honorific}` : honorific)
  } else {
    lines.push('담당자님께')
  }
  lines.push('')
  if (d.personalize.trim()) { lines.push(d.personalize.trim()); lines.push('') }

  // 후킹
  if (d.hook.trim()) { lines.push(d.hook.trim()); lines.push('') }

  // 메타 + 로그라인 (제목·장르·분량을 한 문장으로 엮음)
  const metaSentence = composeMetaSentence(d)
  if (metaSentence) lines.push(metaSentence)
  if (d.logline.trim()) lines.push(d.logline.trim())
  if (metaSentence || d.logline.trim()) lines.push('')

  // 비교작
  const comps = compList(d.comps)
  if (comps.length) {
    lines.push(`이 작품은 ${comps.join(' · ')}의 결을 좋아하는 독자에게 가닿을 것입니다.`)
    lines.push('')
  }

  // 시놉시스 본문
  if (d.synopsis.trim()) {
    d.synopsis.split(/\n{2,}/).forEach((para) => {
      const t = para.replace(/\n/g, ' ').trim()
      if (t) lines.push(t)
    })
    lines.push('')
  }

  // 작가 소개
  const bioParts: string[] = []
  if (d.bio.trim()) bioParts.push(d.bio.trim())
  if (d.credits.trim()) bioParts.push(d.credits.trim())
  if (bioParts.length) { lines.push(bioParts.join(' ')); lines.push('') }

  // 맺음말
  lines.push(d.closing.trim() || '요청하시면 전문을 바로 보내드리겠습니다. 귀한 시간 내어 읽어 주셔서 감사합니다.')
  lines.push('')

  // 서명
  const sig = d.signature.trim()
  lines.push(sig ? `${sig} 드림` : '〔보내는 사람〕 드림')
  if (d.contact.trim()) lines.push(d.contact.trim())

  return lines
}

// 제목/카테고리/장르/분량을 자연스러운 한 문장으로
function composeMetaSentence(d: Draft): string {
  const title = d.title.trim()
  const genre = d.genre.trim()
  const cat = catLabel(d.category)
  const wc = d.wordCount.trim()
  if (!title && !genre && !cat && !wc) return ''
  const titlePart = title ? `《${title}》은(는) ` : '본 작품은 '
  const descBits: string[] = []
  if (wc) descBits.push(wc)
  if (genre) descBits.push(genre)
  // 카테고리는 형식 설명으로 뒤에
  let desc = descBits.join(' ')
  if (cat) desc = desc ? `${desc} ${cat}` : cat
  if (!desc) return ''
  return `${titlePart}${desc}입니다.`
}

function buildLetterText(d: Draft): string {
  return buildLetterLines(d).join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

function buildLetterHtml(d: Draft): string {
  // 빈 줄을 문단 구분으로
  const text = buildLetterText(d)
  return text
    .split(/\n{2,}/)
    .map((para) => `<p>${escapeHtml(para).replace(/\n/g, '<br/>')}</p>`)
    .join('')
}

// 글자 수(공백 제외 안 함, 단순 길이)
const len = (s: string) => s.trim().length

export default function QueryLetter({ payload }: { payload?: Record<string, unknown> }) {
  const init = useRef(loadState())
  const [cur, setCur] = useState<Draft>(init.current.cur)
  const [saved, setSaved] = useState<Saved[]>(init.current.saved)
  const [name, setName] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [openStep, setOpenStep] = useState<string>('hook') // 펼친 단계
  const [showGuide, setShowGuide] = useState<Record<string, boolean>>({})
  const [note, setNote] = useState('')
  const [copied, setCopied] = useState<string>('')
  const [preview, setPreview] = useState(true)
  const mounted = useRef(true)
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // payload 로 로그라인/제목 등 힌트가 오면 비어 있는 칸에만 채운다(다른 도구 연계용).
  const seeded = useRef(false)
  useEffect(() => {
    if (seeded.current) return
    seeded.current = true
    if (!payload) return
    const patch: Partial<Draft> = {}
    const grab = (k: string): string | undefined => {
      const v = payload[k]
      return typeof v === 'string' && v.trim() ? v.trim() : undefined
    }
    const logline = grab('logline') || grab('text')
    const title = grab('title')
    const genre = grab('genre')
    const synopsis = grab('synopsis')
    setCur((p) => {
      const n = { ...p }
      if (logline && !n.logline) n.logline = logline
      if (title && !n.title) n.title = title
      if (genre && !n.genre) n.genre = genre
      if (synopsis && !n.synopsis) n.synopsis = synopsis
      return n
    })
    void patch
    if (logline || title) { setOpenStep('logline'); flashNote('연결된 도구에서 받은 내용을 채웠습니다.') }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (noteTimer.current) clearTimeout(noteTimer.current)
      if (copyTimer.current) clearTimeout(copyTimer.current)
    }
  }, [])

  // 자동 저장
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ cur, saved }))
    } catch {
      if (mounted.current) flashNote('이 브라우저에서 저장이 막혀 새로고침 시 내용이 사라질 수 있어요.')
    }
  }, [cur, saved])

  const flashNote = (msg: string) => {
    setNote(msg)
    if (noteTimer.current) clearTimeout(noteTimer.current)
    noteTimer.current = setTimeout(() => { if (mounted.current) setNote('') }, 2800)
  }

  const setField = (k: keyof Draft, v: string) => setCur((p) => ({ ...p, [k]: v }))

  const letterText = buildLetterText(cur)

  // ---- 핵심 요소 점검 ----
  const requiredMissing = STEPS.filter((s) => {
    if (!s.required) return false
    switch (s.key) {
      case 'hook': return !cur.hook.trim()
      case 'logline': return !cur.logline.trim()
      case 'meta': return !(cur.title.trim() || cur.genre.trim() || cur.wordCount.trim())
      case 'synopsis': return !cur.synopsis.trim()
      case 'bio': return !cur.bio.trim()
      default: return false
    }
  })
  const readiness = Math.round(((STEPS.filter((s) => s.required).length - requiredMissing.length) / STEPS.filter((s) => s.required).length) * 100)

  // 길이 점검(부드러운 안내)
  const lengthWarnings: string[] = []
  STEPS.forEach((s) => {
    if (!s.length) return
    let v = ''
    if (s.key === 'hook') v = cur.hook
    else if (s.key === 'logline') v = cur.logline
    else if (s.key === 'synopsis') v = cur.synopsis
    else if (s.key === 'bio') v = (cur.bio + ' ' + cur.credits)
    const L = len(v)
    if (L === 0) return
    if (L > s.length.hard) lengthWarnings.push(`${s.label}이(가) 다소 깁니다(${L}자). ${s.length.soft}자 안팎으로 줄이면 한눈에 읽힙니다.`)
  })
  // 전체 분량 가이드(보통 한 화면, 250~400단어 ≈ 한 페이지)
  const totalChars = len(letterText)

  const copy = async (text: string, tag: string) => {
    try {
      if (navigator?.clipboard?.writeText) await navigator.clipboard.writeText(text)
      else throw new Error('no clipboard')
      setCopied(tag)
      if (copyTimer.current) clearTimeout(copyTimer.current)
      copyTimer.current = setTimeout(() => { if (mounted.current) setCopied('') }, 1500)
    } catch {
      flashNote('복사에 실패했습니다. 미리보기에서 직접 선택해 복사하세요.')
    }
  }

  // CRUD
  const saveCurrent = () => {
    const now = Date.now()
    const autoName = name.trim() || cur.title.trim() || (cur.hook.trim().slice(0, 24)) || '제목 없는 투고서'
    if (editId) {
      setSaved((p) => p.map((x) => (x.id === editId ? { ...cur, id: editId, name: autoName, createdAt: x.createdAt, updatedAt: now } : x)))
      flashNote('수정 저장했습니다.')
    } else {
      const rec: Saved = { ...cur, id: newId(), name: autoName, createdAt: now, updatedAt: now }
      setSaved((p) => [rec, ...p])
      setEditId(rec.id)
      flashNote('투고서를 보관함에 저장했습니다.')
    }
    if (!name.trim()) setName(autoName)
  }

  const loadSaved = (s: Saved) => {
    setCur(coerceDraft(s))
    setName(s.name)
    setEditId(s.id)
    setOpenStep('hook')
    flashNote('불러왔습니다. 수정 후 저장하면 갱신됩니다.')
  }

  const removeSaved = (id: string) => {
    setSaved((p) => p.filter((x) => x.id !== id))
    if (editId === id) { setEditId(null); setName('') }
  }

  const duplicate = (s: Saved) => {
    const now = Date.now()
    const rec: Saved = { ...coerceDraft(s), id: newId(), name: (s.name || '투고서') + ' 사본', createdAt: now, updatedAt: now }
    setSaved((p) => [rec, ...p])
    flashNote('사본을 만들었습니다.')
  }

  const move = (id: string, dir: -1 | 1) => {
    setSaved((p) => {
      const i = p.findIndex((x) => x.id === id)
      if (i < 0) return p
      const j = i + dir
      if (j < 0 || j >= p.length) return p
      const n = p.slice()
      ;[n[i], n[j]] = [n[j], n[i]]
      return n
    })
  }

  const newLetter = () => {
    setCur(blankDraft())
    setName('')
    setEditId(null)
    setOpenStep('hook')
    flashNote('새 투고서를 시작합니다.')
  }

  const fillExample = (stepKey: string, ex: string) => {
    // 예시를 해당 칸에 채운다(빈 칸이면 바로, 내용 있으면 덮어쓰기 확인 없이 — 가이드 예시는 출발점)
    switch (stepKey) {
      case 'greeting': setField('personalize', ex); break
      case 'hook': setField('hook', ex); break
      case 'logline': setField('logline', ex); break
      case 'comps': setField('comps', ex); break
      case 'synopsis': setField('synopsis', ex); break
      case 'bio': setField('bio', ex); break
      case 'closing': setField('closing', ex); break
      default: break
    }
    flashNote('예시를 칸에 채웠습니다. 자유롭게 고쳐 쓰세요.')
  }

  // 연계
  const toProject = () => {
    if (!hasProjectBridge()) { flashNote('프로젝트에 연결되어 있지 않습니다.'); return }
    if (requiredMissing.length) { flashNote(`핵심 항목(${requiredMissing.map((s) => s.label).join(', ')})을 먼저 채우는 걸 권합니다 — 그래도 현재 상태로 추가합니다.`) }
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '투고',
      title: `✉️ 투고서 — ${cur.title.trim() || cur.agency.trim() || cur.signature.trim() || '제목 없음'}`,
      bodyHtml: buildLetterHtml(cur),
      meta: {
        장르: cur.genre.trim() || '-',
        분량: cur.wordCount.trim() || '-',
        카테고리: catLabel(cur.category),
        받는곳: [cur.agency.trim(), cur.agentName.trim()].filter(Boolean).join(' / ') || '-',
      },
    })
    flashNote(id ? '프로젝트 자료 〈투고〉 폴더에 투고서를 추가했습니다.' : '프로젝트에 추가하지 못했습니다.')
  }

  const toStash = () => {
    if (!hasStash()) { flashNote('수집함을 사용할 수 없습니다.'); return }
    addToStash({ kind: 'doc', label: `투고서 — ${cur.title.trim() || cur.signature.trim() || '제목 없음'}`, text: letterText })
    flashNote('수집함에 담았습니다.')
  }

  const toSnippet = () => {
    if (!cur.logline.trim() && !cur.hook.trim()) { flashNote('스니펫으로 저장할 후킹/로그라인이 없습니다.'); return }
    addToLibrary('snippets', {
      text: [cur.hook.trim(), cur.logline.trim()].filter(Boolean).join('\n'),
      source: '투고서 작성기',
      tags: ['투고', '로그라인'],
    })
    flashNote('후킹·로그라인을 스니펫 라이브러리에 저장했습니다.')
  }

  // ---------- 스타일 ----------
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box' }
  const head: React.CSSProperties = { padding: '11px 16px 9px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }
  const cols: React.CSSProperties = { flex: 1, minHeight: 0, display: 'flex', gap: 0 }
  const leftCol: React.CSSProperties = { flex: '1 1 56%', minWidth: 280, overflow: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 12, boxSizing: 'border-box' }
  const rightCol: React.CSSProperties = { flex: '1 1 44%', minWidth: 260, overflow: 'auto', padding: 14, borderLeft: '1px solid var(--border)', background: 'var(--chrome-2)', display: 'flex', flexDirection: 'column', gap: 10, boxSizing: 'border-box' }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 12 }
  const input: React.CSSProperties = { width: '100%', padding: '8px 10px', fontSize: 13.5, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }
  const ta: React.CSSProperties = { ...input, resize: 'vertical', lineHeight: 1.6, fontFamily: 'inherit' }
  const fieldLabel: React.CSSProperties = { fontSize: 11.5, color: 'var(--muted)', marginBottom: 4, display: 'block' }
  const stepHeadBtn = (open: boolean, done: boolean): React.CSSProperties => ({
    width: '100%', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
    background: 'none', border: 'none', textAlign: 'left', padding: 0, color: 'var(--text)',
    fontSize: 13.5, fontWeight: 700,
  })
  const guideBox: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.65, background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', marginTop: 8 }
  const exBtn: React.CSSProperties = { textAlign: 'left', fontSize: 12, lineHeight: 1.55, padding: '7px 9px', borderRadius: 8, border: '1px dashed var(--border)', background: 'var(--paper)', color: 'var(--text)', cursor: 'pointer', whiteSpace: 'pre-wrap', wordBreak: 'keep-all' }
  const iconBtn: React.CSSProperties = { border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--muted)', cursor: 'pointer', fontSize: 12, lineHeight: 1, padding: '4px 7px', borderRadius: 7 }
  const chip = (active: boolean): React.CSSProperties => ({
    padding: '5px 10px', fontSize: 12, borderRadius: 999, cursor: 'pointer',
    border: '1px solid ' + (active ? 'var(--accent)' : 'var(--border)'),
    background: active ? 'var(--accent)' : 'var(--chrome-2)',
    color: active ? '#fff' : 'var(--text)', whiteSpace: 'nowrap',
  })
  const savedRow: React.CSSProperties = { background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '9px 11px', display: 'flex', flexDirection: 'column', gap: 6 }
  const empty: React.CSSProperties = { textAlign: 'center', color: 'var(--muted)', fontSize: 12.5, lineHeight: 1.7, padding: '16px 10px', border: '1px dashed var(--border)', borderRadius: 10 }
  const hint: React.CSSProperties = { color: 'var(--muted)', fontSize: 11.5, lineHeight: 1.6 }
  const sectionTitle: React.CSSProperties = { fontSize: 12.5, fontWeight: 700, margin: '0 0 8px' }

  const selectedCat = CATEGORIES.find((c) => c.key === cur.category)

  // 단계별 입력 렌더
  function renderStepFields(key: string) {
    switch (key) {
      case 'greeting':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 130 }}>
                <label style={fieldLabel}>받는 사람(에이전트/편집자)</label>
                <input style={input} value={cur.agentName} onChange={(e) => setField('agentName', e.target.value)} placeholder="예: 김편집" maxLength={40} />
              </div>
              <div style={{ flex: 1, minWidth: 130 }}>
                <label style={fieldLabel}>소속(에이전시/출판사)</label>
                <input style={input} value={cur.agency} onChange={(e) => setField('agency', e.target.value)} placeholder="예: ○○출판" maxLength={60} />
              </div>
            </div>
            <div>
              <label style={fieldLabel}>개인화 한 줄 — 왜 이분(이곳)께 보내는가</label>
              <textarea style={{ ...ta, minHeight: 52 }} value={cur.personalize} onChange={(e) => setField('personalize', e.target.value)} placeholder="이 출판사의 어떤 책·취향을 보고 보내는지 한 줄" maxLength={300} />
            </div>
          </div>
        )
      case 'hook':
        return (
          <textarea style={{ ...ta, minHeight: 60 }} value={cur.hook} onChange={(e) => setField('hook', e.target.value)} placeholder="편지의 첫 문장이 될 가장 흥미로운 한 줄" maxLength={300} />
        )
      case 'logline':
        return (
          <textarea style={{ ...ta, minHeight: 78 }} value={cur.logline} onChange={(e) => setField('logline', e.target.value)} placeholder="주인공·목표·갈등·판돈이 드러나는 한두 문장" maxLength={600} />
        )
      case 'meta':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <label style={fieldLabel}>작품 제목</label>
              <input style={input} value={cur.title} onChange={(e) => setField('title', e.target.value)} placeholder="예: 잊혀진 이름" maxLength={80} />
            </div>
            <div>
              <label style={fieldLabel}>카테고리(독자층 · 형식)</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {CATEGORIES.map((c) => (
                  <button key={c.key} onClick={() => setField('category', c.key)} style={chip(cur.category === c.key)} title={c.note}>{c.label}</button>
                ))}
              </div>
              {selectedCat && (
                <div style={{ ...hint, marginTop: 6 }}>· {selectedCat.note}<br />· 권장 분량: <b>{selectedCat.wordHint}</b></div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 150 }}>
                <label style={fieldLabel}>장르</label>
                <input style={input} value={cur.genre} onChange={(e) => setField('genre', e.target.value)} placeholder="예: 판타지" maxLength={40} list="ql-genre" />
                <datalist id="ql-genre">
                  {GENRE_PRESETS.map((g) => <option key={g} value={g} />)}
                </datalist>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 6 }}>
                  {GENRE_PRESETS.slice(0, 8).map((g) => (
                    <button key={g} style={{ ...iconBtn, fontSize: 11 }} onClick={() => setField('genre', g)}>{g}</button>
                  ))}
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 150 }}>
                <label style={fieldLabel}>분량</label>
                <input style={input} value={cur.wordCount} onChange={(e) => setField('wordCount', e.target.value)} placeholder="예: 70,000단어 / 원고지 800매 / 12회 완결" maxLength={60} />
              </div>
            </div>
            <div style={{ ...guideBox, marginTop: 0 }}>
              한 문장 미리보기: <b style={{ color: 'var(--text)' }}>{composeMetaSentence(cur) || '제목·장르·분량을 채우면 한 문장으로 묶입니다.'}</b>
            </div>
          </div>
        )
      case 'comps':
        return (
          <textarea style={{ ...ta, minHeight: 56 }} value={cur.comps} onChange={(e) => setField('comps', e.target.value)} placeholder="비교작을 쉼표 또는 줄바꿈으로 (예: 《미스트본》, 《달빛 조각사》)" maxLength={300} />
        )
      case 'synopsis':
        return (
          <textarea style={{ ...ta, minHeight: 150 }} value={cur.synopsis} onChange={(e) => setField('synopsis', e.target.value)} placeholder={'2~3문단으로. 빈 줄로 문단을 나누세요.\n\n주인공의 욕망 → 갈등 고조 → 중대한 선택/판돈'} maxLength={2000} />
        )
      case 'bio':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div>
              <label style={fieldLabel}>작가 소개</label>
              <textarea style={{ ...ta, minHeight: 70 }} value={cur.bio} onChange={(e) => setField('bio', e.target.value)} placeholder="등단·집필 동기·이 이야기를 쓸 자격 등" maxLength={800} />
            </div>
            <div>
              <label style={fieldLabel}>발표 이력 · 수상 · 관련 경력 (선택)</label>
              <textarea style={{ ...ta, minHeight: 48 }} value={cur.credits} onChange={(e) => setField('credits', e.target.value)} placeholder="예: ○○문학상 수상, 단편 「△△」 발표" maxLength={500} />
            </div>
          </div>
        )
      case 'closing':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div>
              <label style={fieldLabel}>맺음말</label>
              <textarea style={{ ...ta, minHeight: 52 }} value={cur.closing} onChange={(e) => setField('closing', e.target.value)} placeholder="전문 동봉 안내·검토 감사 인사 (비우면 기본 문구가 들어갑니다)" maxLength={400} />
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 130 }}>
                <label style={fieldLabel}>보내는 사람(서명)</label>
                <input style={input} value={cur.signature} onChange={(e) => setField('signature', e.target.value)} placeholder="예: 홍길동" maxLength={40} />
              </div>
              <div style={{ flex: 1, minWidth: 130 }}>
                <label style={fieldLabel}>연락처 (선택)</label>
                <input style={input} value={cur.contact} onChange={(e) => setField('contact', e.target.value)} placeholder="이메일 / 전화" maxLength={80} />
              </div>
            </div>
          </div>
        )
      default:
        return null
    }
  }

  // 단계 완료 여부(작성됨 표시)
  function stepDone(key: string): boolean {
    switch (key) {
      case 'greeting': return !!(cur.agentName.trim() || cur.agency.trim() || cur.personalize.trim())
      case 'hook': return !!cur.hook.trim()
      case 'logline': return !!cur.logline.trim()
      case 'meta': return !!(cur.title.trim() || cur.genre.trim() || cur.wordCount.trim())
      case 'comps': return compList(cur.comps).length > 0
      case 'synopsis': return !!cur.synopsis.trim()
      case 'bio': return !!cur.bio.trim()
      case 'closing': return !!(cur.closing.trim() || cur.signature.trim())
      default: return false
    }
  }

  return (
    <div style={wrap}>
      <div style={head}>
        <span style={{ fontSize: 14, fontWeight: 700 }}><Emoji e="✉️" /> 투고서·쿼리레터</span>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>단계를 채우면 한 통으로 종합</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: requiredMissing.length ? 'var(--warn)' : 'var(--accent)' }}>
            완성도 {Number.isFinite(readiness) ? readiness : 0}%
          </span>
          <button className="minibtn" onClick={() => setPreview((v) => !v)}>{preview ? '미리보기 숨김' : '미리보기'}</button>
          <button className="minibtn" onClick={newLetter}>＋ 새 투고서</button>
        </div>
      </div>

      <div style={cols}>
        {/* 왼쪽: 단계 입력 */}
        <div style={leftCol}>
          {note && (
            <div style={{ ...hint, color: 'var(--warn)', background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px' }}>{note}</div>
          )}

          {requiredMissing.length > 0 && (
            <div style={{ ...guideBox, marginTop: 0, borderColor: 'var(--warn)' }}>
              아직 비어 있는 핵심 항목: <b style={{ color: 'var(--warn)' }}>{requiredMissing.map((s) => s.label).join(' · ')}</b>
            </div>
          )}

          {STEPS.map((s) => {
            const open = openStep === s.key
            const done = stepDone(s.key)
            return (
              <div key={s.key} style={{ ...card, borderColor: open ? 'var(--accent)' : 'var(--border)' }}>
                <button style={stepHeadBtn(open, done)} onClick={() => setOpenStep(open ? '' : s.key)}>
                  <span style={{ fontSize: 16 }}><Emoji e={s.icon} /></span>
                  <span>{s.label}</span>
                  {s.required && <span style={{ fontSize: 10.5, color: 'var(--warn)', border: '1px solid var(--border)', borderRadius: 5, padding: '0 4px' }}>필수</span>}
                  <span style={{ marginLeft: 'auto', fontSize: 12, color: done ? 'var(--accent)' : 'var(--muted)' }}>{done ? '✓ 작성됨' : '미작성'}</span>
                  <span style={{ fontSize: 11, color: 'var(--muted)', width: 14, textAlign: 'center' }}>{open ? '▾' : '▸'}</span>
                </button>

                {open && (
                  <div style={{ marginTop: 10 }}>
                    {renderStepFields(s.key)}

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                      <button className="linkbtn" style={{ fontSize: 11.5 }} onClick={() => setShowGuide((p) => ({ ...p, [s.key]: !p[s.key] }))}>
                        {showGuide[s.key] ? '가이드 닫기' : <><Emoji e="💡" /> 작성 가이드 · 예시</>}
                      </button>
                    </div>

                    {showGuide[s.key] && (
                      <div style={guideBox}>
                        <div style={{ marginBottom: s.examples.length ? 8 : 0 }}>{s.guide}</div>
                        {s.examples.length > 0 && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <div style={{ fontSize: 11, color: 'var(--muted)' }}>예시 — 눌러 칸에 채우기(자체 창작 샘플)</div>
                            {s.examples.map((ex, i) => (
                              <button key={i} style={exBtn} onClick={() => fillExample(s.key, ex)}>{ex}</button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}

          {/* 보관함 (CRUD) */}
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <h4 style={{ ...sectionTitle, margin: 0 }}><Emoji e="📁" /> 보관한 투고서 · {saved.length}통</h4>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
              <input style={{ ...input, flex: 1, minWidth: 150 }} value={name} onChange={(e) => setName(e.target.value)} placeholder="보관 제목 (비우면 작품 제목으로)" maxLength={60} />
              <button className="btn-primary" onClick={saveCurrent}>{editId ? '수정 저장' : <><Emoji e="💾" /> 보관</>}</button>
              {editId && <button className="minibtn" onClick={() => { setEditId(null); setName('') }}>새 항목으로</button>}
            </div>
            {saved.length === 0 ? (
              <div style={empty}>
                아직 보관한 투고서가 없습니다.<br />
                위 단계를 채우고 <b>보관</b>을 누르면 여러 통을 따로 관리할 수 있어요.<br />
                <span style={{ fontSize: 11.5 }}>출판사별로 비교작·인사말만 바꿔 사본으로 보내기 좋습니다.</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {saved.map((s, i) => (
                  <div key={s.id} style={{ ...savedRow, border: '1px solid ' + (editId === s.id ? 'var(--accent)' : 'var(--border)') }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <b style={{ fontSize: 12.5 }}>{s.name || '(제목 없음)'}</b>
                      {s.genre.trim() && <span style={{ fontSize: 10.5, color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 5, padding: '0 5px' }}>{s.genre.trim()}</span>}
                      {s.agency.trim() && <span style={{ fontSize: 10.5, color: 'var(--muted)' }}>→ {s.agency.trim()}</span>}
                      <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                        <button style={iconBtn} title="위로" onClick={() => move(s.id, -1)} disabled={i === 0}>▲</button>
                        <button style={iconBtn} title="아래로" onClick={() => move(s.id, 1)} disabled={i === saved.length - 1}>▼</button>
                        <button style={iconBtn} title="불러와 수정" onClick={() => loadSaved(s)}><Emoji e="✏️" /></button>
                        <button style={iconBtn} title="사본 만들기" onClick={() => duplicate(s)}>⧉</button>
                        <button style={iconBtn} title="투고서 복사" onClick={() => copy(buildLetterText(coerceDraft(s)), 's' + s.id)}>{copied === 's' + s.id ? '✓' : <Emoji e="📋" />}</button>
                        <button style={{ ...iconBtn, color: 'var(--warn)' }} title="삭제" onClick={() => removeSaved(s.id)}><Emoji e="🗑️" /></button>
                      </div>
                    </div>
                    {(s.hook.trim() || s.logline.trim()) && (
                      <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.5, wordBreak: 'keep-all' }}>
                        {(s.hook.trim() || s.logline.trim()).slice(0, 90)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={hint}>
            투고서는 “읽고 싶게 만드는 한 통의 편지”입니다. 후킹 → 로그라인 → 메타데이터 → 짧은 시놉 → 작가 소개 순서가 가장 무난합니다.
            모든 입력과 보관함은 이 브라우저에 자동 저장됩니다.
          </div>
        </div>

        {/* 오른쪽: 미리보기 + 점검 + 연계 */}
        {preview && (
          <div style={rightCol}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h4 style={{ ...sectionTitle, margin: 0 }}><Emoji e="📄" /> 완성 투고서 미리보기</h4>
              <span style={{ ...hint, marginLeft: 'auto' }}>약 {totalChars.toLocaleString('ko-KR')}자</span>
            </div>

            <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', fontSize: 13, lineHeight: 1.8, color: 'var(--text)', whiteSpace: 'pre-wrap', wordBreak: 'keep-all', minHeight: 120 }}>
              {letterText || '단계를 채우면 여기에서 투고서 한 통이 실시간으로 조립됩니다.'}
            </div>

            {/* 점검 */}
            {(requiredMissing.length > 0 || lengthWarnings.length > 0) && (
              <div style={{ ...card, padding: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}><Emoji e="🔎" /> 점검</div>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 11.5, lineHeight: 1.7, color: 'var(--muted)' }}>
                  {requiredMissing.map((s) => (
                    <li key={s.key} style={{ color: 'var(--warn)' }}>핵심 항목 <b>{s.label}</b>이(가) 비어 있습니다.</li>
                  ))}
                  {lengthWarnings.map((w, i) => <li key={'lw' + i}>{w}</li>)}
                </ul>
              </div>
            )}
            {requiredMissing.length === 0 && lengthWarnings.length === 0 && totalChars > 0 && (
              <div style={{ ...hint, color: 'var(--accent)' }}>✓ 핵심 항목이 모두 채워졌고 길이도 적절합니다. 받는 곳에 맞춰 인사말·비교작만 손보면 보낼 준비가 됩니다.</div>
            )}

            {/* 액션 */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button className="btn-primary" style={{ flex: 1, minWidth: 120 }} onClick={() => copy(letterText, 'main')} disabled={!totalChars}>
                {copied === 'main' ? '✓ 복사됨' : <><Emoji e="📋" /> 투고서 전체 복사</>}
              </button>
            </div>

            {/* 연계 */}
            <div className="linkbar" style={{ flexWrap: 'wrap', gap: 6 }}>
              <span className="linkbar-label">연계:</span>
              <button className="linkbtn" onClick={toProject} disabled={!hasProjectBridge()} title={hasProjectBridge() ? '완성 투고서를 프로젝트 자료 〈투고〉 폴더에 문서로 추가' : '프로젝트에 연결되어 있지 않습니다'}>
                <Emoji e="📄" /> 프로젝트에 추가
              </button>
              <button className="linkbtn" onClick={toStash} disabled={!hasStash() || !totalChars} title={hasStash() ? '투고서를 수집함에 담기' : '수집함을 사용할 수 없습니다'}>
                <Emoji e="📥" /> 수집함에 담기
              </button>
              <button className="linkbtn" onClick={toSnippet} disabled={!cur.hook.trim() && !cur.logline.trim()} title="후킹·로그라인을 스니펫 라이브러리에 저장">
                <Emoji e="💾" /> 후킹·로그라인 스니펫
              </button>
            </div>

            <div className="license-note" style={{ fontSize: 10.5, color: 'var(--muted)', lineHeight: 1.4 }}>
              <span className="license-badge">자체 창작</span> 가이드·예시 문구는 모두 이 도구가 자체 작성한 오리지널이며, 외부 저작물을 사용하지 않습니다. 실제 투고 시에는 각 출판사·공모전의 투고 규정(분량·형식)을 우선 확인하세요.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
