// 이름·용어 표기 통일 검사 — 등록한 고유명사(인물·장소·용어)에 대해 본문에서
// 유사·이형 표기(띄어쓰기/오타/이형/별칭)를 로컬로 찾아 불일치를 경고하고 교정을 돕는다.
//  · 용어 사전: 표준 표기 + 허용 별칭 + 금지 이형 등록(CRUD, localStorage 영속).
//  · 자동 후보: 본문에서 반복되는 고유명사 후보를 추려 한 번에 등록.
//  · 검사: 표준형 외의 변형(띄어쓰기·1글자 오타·자모 차이·등록 별칭)을 위치와 함께 표시.
//  · 연계: 공유 라이브러리 인물/장소 가져오기, 좌측 바인더 파일 드롭, 결과를 프로젝트 자료로.
// 자급식: react 와 './linkbus' 외 import 없음. 외부 네트워크·키 불필요(100% 로컬). 언마운트 정리.
import { useState, useEffect, useRef, useMemo } from 'react'
import {
  useLibraryList, addToProject, hasProjectBridge, addToStash, hasStash,
  getDragItem, isItemDrag, openToolLinked, Emoji,
  type SharedCharacter, type SharedPlace,
} from './linkbus'

export const meta = { id: 'name-consistency', name: '이름·용어 표기 통일', icon: '🔤', group: '교정·언어', intro: '등록한 고유명사의 띄어쓰기·오타·이형 표기를 본문에서 찾아 불일치를 경고하고 통일을 돕습니다', w: 600, h: 680 }

// ─────────────────────────────────────────────────────────────
// 데이터 모델
// ─────────────────────────────────────────────────────────────
type TermKind = 'person' | 'place' | 'term'
interface Term {
  id: string
  canonical: string          // 표준 표기(이것으로 통일)
  kind: TermKind
  aliases: string[]          // 허용 별칭(불일치로 보지 않음) — 그대로 두어도 됨
  forbidden: string[]        // 금지 이형(발견 시 항상 경고) — 직접 등록한 오답
  note?: string              // 메모(설정)
  updated: number
}
interface Store {
  terms: Term[]
  body: string               // 마지막 본문(편의 유지)
}

const SKEY = 'sry:tool:name-consistency'
const KIND_META: Record<TermKind, { label: string; icon: string; color: string }> = {
  person: { label: '인물', icon: '🧑', color: 'var(--accent)' },
  place: { label: '장소', icon: '🏛️', color: 'var(--ok)' },
  term: { label: '용어', icon: '📌', color: 'var(--warn)' },
}

function loadStore(): Store {
  try {
    const raw = localStorage.getItem(SKEY)
    if (raw) {
      const p = JSON.parse(raw) as Partial<Store>
      const terms = Array.isArray(p.terms) ? p.terms.map(normTerm).filter(Boolean) as Term[] : []
      return { terms, body: typeof p.body === 'string' ? p.body : '' }
    }
  } catch { /* noop */ }
  return { terms: [], body: '' }
}
function normTerm(t: unknown): Term | null {
  if (!t || typeof t !== 'object') return null
  const o = t as Record<string, unknown>
  const canonical = typeof o.canonical === 'string' ? o.canonical.trim() : ''
  if (!canonical) return null
  const kind: TermKind = o.kind === 'place' || o.kind === 'term' ? o.kind : 'person'
  return {
    id: typeof o.id === 'string' ? o.id : 'tm_' + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36),
    canonical,
    kind,
    aliases: Array.isArray(o.aliases) ? o.aliases.filter((x): x is string => typeof x === 'string') : [],
    forbidden: Array.isArray(o.forbidden) ? o.forbidden.filter((x): x is string => typeof x === 'string') : [],
    note: typeof o.note === 'string' ? o.note : undefined,
    updated: typeof o.updated === 'number' ? o.updated : Date.now(),
  }
}
function saveStore(s: Store) {
  try { localStorage.setItem(SKEY, JSON.stringify(s)) } catch { /* 용량 초과 등 무시 */ }
}
function uid() { return 'tm_' + Date.now().toString(36) + '_' + Math.floor(Math.random() * 1e6).toString(36) }

// ─────────────────────────────────────────────────────────────
// 텍스트 유틸
// ─────────────────────────────────────────────────────────────
function makeLineCol(text: string) {
  const lineStarts: number[] = [0]
  for (let i = 0; i < text.length; i++) if (text[i] === '\n') lineStarts.push(i + 1)
  return (idx: number) => {
    let lo = 0, hi = lineStarts.length - 1
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1
      if (lineStarts[mid] <= idx) lo = mid; else hi = mid - 1
    }
    return { line: lo + 1, col: idx - lineStarts[lo] + 1 }
  }
}
function esc(s: string): string { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') }
const escapeHtml = (str: string) => String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// 공백 제거(띄어쓰기 차이 비교용)
function despace(s: string): string { return s.replace(/\s+/g, '') }

// 한글 음절을 초·중·종성 자모열로 분해(자모 단위 편집거리용). 비한글은 그대로 코드포인트.
const CHO = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ']
const JUNG = ['ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ', 'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ']
const JONG = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ']
function toJamo(s: string): string[] {
  const out: string[] = []
  for (const ch of s) {
    const code = ch.codePointAt(0)!
    if (code >= 0xac00 && code <= 0xd7a3) {
      const si = code - 0xac00
      out.push(CHO[Math.floor(si / 588)])
      out.push(JUNG[Math.floor((si % 588) / 28)])
      const j = si % 28
      if (j) out.push(JONG[j])
    } else {
      out.push(ch)
    }
  }
  return out
}
// 일반 레벤슈타인(시퀀스). 짧은 토큰만 다루므로 비용 낮음.
function lev(a: string[] | string, b: string[] | string): number {
  const A = typeof a === 'string' ? [...a] : a
  const B = typeof b === 'string' ? [...b] : b
  const n = A.length, m = B.length
  if (n === 0) return m
  if (m === 0) return n
  let prev = new Array(m + 1)
  for (let j = 0; j <= m; j++) prev[j] = j
  for (let i = 1; i <= n; i++) {
    const cur = new Array(m + 1)
    cur[0] = i
    for (let j = 1; j <= m; j++) {
      const cost = A[i - 1] === B[j - 1] ? 0 : 1
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost)
    }
    prev = cur
  }
  return prev[m]
}

// ─────────────────────────────────────────────────────────────
// 후보 토큰 추출(자동 후보 + 검사 대상)
// 한글/영문 덩어리를 추출. 한글은 조사를 가볍게 떼어 어근 근사.
// ─────────────────────────────────────────────────────────────
interface Tok { surface: string; root: string; index: number; end: number }
const JOSA = ['으로써', '으로서', '에서는', '에게서', '으로', '에서', '에게', '한테', '까지', '부터', '마저', '조차', '처럼', '만큼', '보다', '이라고', '라고', '이라는', '라는', '이라', '은', '는', '이', '가', '을', '를', '의', '에', '도', '와', '과', '랑', '이랑', '님', '씨', '들']
function stripJosa(w: string): string {
  let s = w.replace(/[.,!?;:"'’”“()\[\]{}…·~\-—]+$/u, '')
  if (s.length <= 1) return s
  for (const j of JOSA) {
    if (s.length > j.length + 1 && s.endsWith(j)) return s.slice(0, s.length - j.length)
  }
  return s
}
function tokenize(text: string): Tok[] {
  const out: Tok[] = []
  // 한글 음절 덩어리 또는 라틴 단어
  const re = /[가-힣]+|[A-Za-z][A-Za-z'’\-]*/gu
  let m: RegExpExecArray | null
  let guard = 0
  while ((m = re.exec(text)) !== null) {
    if (guard++ > 300000) break
    const surface = m[0]
    const root = /[가-힣]/.test(surface) ? stripJosa(surface) : surface
    out.push({ surface, root, index: m.index, end: m.index + surface.length })
  }
  return out
}

// 자동 후보: 반복 등장하는 고유명사 후보(2자 이상 한글 어근 또는 대문자 시작 영단어), 불용어 제외.
const STOP = new Set([
  '그리고', '그러나', '그래서', '그런데', '하지만', '그러면', '또는', '또한', '그때', '이때', '지금', '오늘', '내일', '어제',
  '사람', '여자', '남자', '아이', '엄마', '아빠', '하나', '여기', '저기', '거기', '무엇', '누구', '우리', '너희', '자신',
  '생각', '마음', '얼굴', '눈물', '소리', '시간', '하루', '이야기', '말씀', '모습', '순간', '정말', '진짜', '조금',
  'The', 'And', 'But', 'For', 'You', 'She', 'His', 'Her', 'They', 'When', 'Then', 'That', 'This', 'There',
])
interface Candidate { root: string; count: number; sample: string }
function findCandidates(toks: Tok[], registered: Set<string>): Candidate[] {
  const map = new Map<string, { count: number; sample: string }>()
  for (const t of toks) {
    const r = t.root
    if (!r) continue
    const isKo = /[가-힣]/.test(r)
    const isCapEn = /^[A-Z][A-Za-z'’\-]+$/.test(r)
    if (isKo) { if (r.length < 2) continue }
    else if (isCapEn) { if (r.length < 2) continue }
    else continue
    if (STOP.has(r)) continue
    if (registered.has(r)) continue
    const g = map.get(r)
    if (g) g.count++
    else map.set(r, { count: 1, sample: t.surface })
  }
  return [...map.entries()]
    .filter(([, v]) => v.count >= 2)
    .map(([root, v]) => ({ root, count: v.count, sample: v.sample }))
    .sort((a, b) => b.count - a.count || a.root.localeCompare(b.root, 'ko'))
}

// ─────────────────────────────────────────────────────────────
// 검사: 표준형별로 본문에서 변형 표기 탐색
// ─────────────────────────────────────────────────────────────
type IssueType = 'forbidden' | 'spacing' | 'typo' | 'jamo' | 'case'
interface Occurrence { surface: string; index: number; end: number }
interface Variant {
  variant: string            // 발견된 비표준 표기(표면형 묶음 키)
  type: IssueType
  dist: number               // 표준형과의 거리(0=띄어쓰기/대소문자만)
  occ: Occurrence[]
  isAllowedAlias: boolean    // 등록 별칭이면 허용(경고 약하게)
}
interface TermReport {
  term: Term
  canonicalCount: number
  variants: Variant[]        // 비표준(불일치) 변형들
}

// 표준형과 후보(둘 다 root)의 관계를 판정. null = 무관.
function classify(canonical: string, cand: string, sens: number): { type: IssueType; dist: number } | null {
  if (cand === canonical) return null
  const isKo = /[가-힣]/.test(canonical)
  // 대소문자만 다른 경우(영문)
  if (!isKo && cand.toLowerCase() === canonical.toLowerCase()) return { type: 'case', dist: 0 }
  // 띄어쓰기만 다른 경우
  if (despace(cand) === despace(canonical) && cand !== canonical) return { type: 'spacing', dist: 0 }
  if (despace(cand).toLowerCase() === despace(canonical).toLowerCase() && !isKo) return { type: 'spacing', dist: 0 }

  // 길이 차가 너무 크면 무관(짧은 이름 보호)
  const lenC = canonical.length
  if (Math.abs(cand.length - lenC) > Math.max(2, Math.ceil(lenC * 0.5))) return null

  if (isKo) {
    // 음절 단위 편집거리(오타) — 임계는 길이 비례
    const dSyl = lev([...canonical], [...cand])
    const synLimit = lenC <= 2 ? 1 : sens
    if (dSyl > 0 && dSyl <= synLimit) return { type: 'typo', dist: dSyl }
    // 자모 단위(받침/모음 한 끗 차이 같은 이형) — 더 미세
    const dJamo = lev(toJamo(canonical), toJamo(cand))
    if (dJamo > 0 && dJamo <= 2 && dSyl <= synLimit + 1) return { type: 'jamo', dist: dJamo }
    return null
  } else {
    const d = lev(canonical.toLowerCase(), cand.toLowerCase())
    const limit = lenC <= 3 ? 1 : sens
    if (d > 0 && d <= limit) return { type: 'typo', dist: d }
    return null
  }
}

function buildReports(text: string, terms: Term[], sens: number): TermReport[] {
  if (!text || terms.length === 0) return []
  const toks = tokenize(text)

  // root → 출현들 모으기(검사 효율)
  const byRoot = new Map<string, Occurrence[]>()
  for (const t of toks) {
    const arr = byRoot.get(t.root)
    if (arr) arr.push({ surface: t.surface, index: t.index, end: t.end })
    else byRoot.set(t.root, [{ surface: t.surface, index: t.index, end: t.end }])
  }
  const allRoots = [...byRoot.keys()]

  // 별칭/금지 빠른 조회를 위한 정규화 세트(공백·대소문자 무시)
  const reports: TermReport[] = []
  for (const term of terms) {
    const can = term.canonical
    const canKey = despace(can).toLowerCase()
    const aliasKeys = new Set(term.aliases.map((a) => despace(a).toLowerCase()).filter(Boolean))
    const forbiddenKeys = new Set(term.forbidden.map((a) => despace(a).toLowerCase()).filter(Boolean))

    const canonicalCount = (byRoot.get(can) || []).length
    const variantMap = new Map<string, Variant>()

    for (const root of allRoots) {
      if (root === can) continue
      const rKey = despace(root).toLowerCase()
      // 금지 이형 우선
      let res: { type: IssueType; dist: number } | null = null
      let allowed = false
      if (forbiddenKeys.has(rKey)) {
        res = { type: 'forbidden', dist: lev([...can], [...root]) }
      } else if (aliasKeys.has(rKey)) {
        // 등록 별칭 — 허용(통계만)
        res = { type: classify(can, root, sens)?.type ?? 'spacing', dist: 0 }
        allowed = true
      } else {
        res = classify(can, root, sens)
      }
      if (!res) continue
      const occ = byRoot.get(root) || []
      const key = root
      const existing = variantMap.get(key)
      if (existing) existing.occ.push(...occ)
      else variantMap.set(key, { variant: root, type: res.type, dist: res.dist, occ: [...occ], isAllowedAlias: allowed })
    }

    const variants = [...variantMap.values()].sort((a, b) => {
      // 금지 > 미허용 > 허용, 그다음 빈도순
      const rank = (v: Variant) => (v.type === 'forbidden' ? 0 : v.isAllowedAlias ? 2 : 1)
      return rank(a) - rank(b) || b.occ.length - a.occ.length || a.variant.localeCompare(b.variant, 'ko')
    })
    reports.push({ term, canonicalCount, variants })
  }
  // 문제 있는 항목 먼저
  reports.sort((a, b) => {
    const probA = a.variants.filter((v) => !v.isAllowedAlias).length
    const probB = b.variants.filter((v) => !v.isAllowedAlias).length
    return probB - probA || b.canonicalCount - a.canonicalCount
  })
  return reports
}

const TYPE_META: Record<IssueType, { label: string; color: string }> = {
  forbidden: { label: '금지 이형', color: 'var(--warn)' },
  spacing: { label: '띄어쓰기 차이', color: 'var(--accent)' },
  typo: { label: '오타 의심', color: 'var(--warn)' },
  jamo: { label: '자모 이형', color: 'var(--accent-2)' },
  case: { label: '대소문자 차이', color: 'var(--muted)' },
}

const SAMPLE_TERMS: Array<{ canonical: string; kind: TermKind; aliases?: string[]; forbidden?: string[] }> = [
  { canonical: '이서연', kind: 'person', aliases: ['서연'], forbidden: ['이서현'] },
  { canonical: '강태우', kind: 'person', aliases: ['태우'] },
  { canonical: '백록담', kind: 'place' },
  { canonical: '검은달 길드', kind: 'term', forbidden: ['검은 달 길드'] },
]
const SAMPLE_BODY =
  '이서연은 강태우를 바라보았다. "검은달 길드가 움직였어." 이서현은 — 아니, 이서연은 입술을 깨물었다.\n' +
  '강태우와 강태후는 같은 사람일까. 백록담 정상에서 만나기로 했다. 검은 달 길드의 표식이 새겨져 있었다.\n' +
  '서연은 고개를 끄덕였다. 백룩담 쪽에서 바람이 불어왔다. 태우가 먼저 발걸음을 옮겼다.'

// ─────────────────────────────────────────────────────────────
// 컴포넌트
// ─────────────────────────────────────────────────────────────
type Tab = 'check' | 'terms'

export default function NameConsistency({ payload }: { payload?: Record<string, unknown> }) {
  const [terms, setTerms] = useState<Term[]>(() => loadStore().terms)
  const [body, setBody] = useState<string>(() => loadStore().body)
  const [tab, setTab] = useState<Tab>('check')
  const [sens, setSens] = useState(1)            // 오타 허용 편집거리(민감도)
  const [hideAlias, setHideAlias] = useState(true)
  const [toast, setToast] = useState('')
  const [copied, setCopied] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)

  // 새 용어 입력 폼
  const [fCanon, setFCanon] = useState('')
  const [fKind, setFKind] = useState<TermKind>('person')
  const [fAlias, setFAlias] = useState('')
  const [fForbid, setFForbid] = useState('')
  const [fNote, setFNote] = useState('')

  const taRef = useRef<HTMLTextAreaElement | null>(null)
  const toastTimer = useRef<number | null>(null)
  const copyTimer = useRef<number | null>(null)

  // 공유 라이브러리(인물/장소) — 가져오기 소스
  const libChars = useLibraryList('characters') as SharedCharacter[]
  const libPlaces = useLibraryList('places') as SharedPlace[]

  // payload 로 본문이 전달되면 채움(연계 진입)
  useEffect(() => {
    if (!payload) return
    const t = (payload.text ?? payload.body) as unknown
    if (typeof t === 'string' && t.trim()) setBody(t)
    const ts = payload.terms as unknown
    if (Array.isArray(ts)) {
      const incoming = ts.map((x) => typeof x === 'string' ? x : (x && typeof x === 'object' ? String((x as Record<string, unknown>).canonical ?? '') : '')).filter(Boolean)
      if (incoming.length) importTerms(incoming.map((c) => ({ canonical: c, kind: 'person' as TermKind })))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload])

  // 영속
  useEffect(() => { saveStore({ terms, body }) }, [terms, body])

  // 언마운트 정리
  useEffect(() => () => {
    if (toastTimer.current != null) clearTimeout(toastTimer.current)
    if (copyTimer.current != null) clearTimeout(copyTimer.current)
  }, [])

  const flash = (msg: string) => {
    setToast(msg)
    if (toastTimer.current != null) clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(''), 1800)
  }

  const toLineCol = useMemo(() => makeLineCol(body), [body])
  const toks = useMemo(() => { try { return tokenize(body) } catch { return [] } }, [body])
  const registeredRoots = useMemo(() => {
    const s = new Set<string>()
    for (const t of terms) {
      s.add(t.canonical)
      t.aliases.forEach((a) => s.add(a))
    }
    return s
  }, [terms])
  const candidates = useMemo(() => {
    try { return findCandidates(toks, registeredRoots) } catch { return [] }
  }, [toks, registeredRoots])
  const reports = useMemo(() => {
    try { return buildReports(body, terms, sens) } catch { return [] }
  }, [body, terms, sens])

  // 본문 강조용 세그먼트(불일치 변형 위치만 밑줄)
  const segs = useMemo(() => {
    const marks: Array<{ index: number; end: number; type: IssueType; canonical: string; variant: string; allowed: boolean }> = []
    for (const r of reports) {
      for (const v of r.variants) {
        if (hideAlias && v.isAllowedAlias) continue
        for (const o of v.occ) marks.push({ index: o.index, end: o.end, type: v.type, canonical: r.term.canonical, variant: v.variant, allowed: v.isAllowedAlias })
      }
    }
    marks.sort((a, b) => a.index - b.index || a.end - b.end)
    // 겹침 제거(앞선 마크 우선)
    const clean: typeof marks = []
    let lastEnd = -1
    for (const mk of marks) { if (mk.index >= lastEnd) { clean.push(mk); lastEnd = mk.end } }
    type Seg = { text: string; mk?: typeof clean[number] }
    const out: Seg[] = []
    let cur = 0
    for (const mk of clean) {
      if (mk.index > cur) out.push({ text: body.slice(cur, mk.index) })
      out.push({ text: body.slice(mk.index, mk.end), mk })
      cur = mk.end
    }
    if (cur < body.length) out.push({ text: body.slice(cur) })
    return out.length ? out : [{ text: body }]
  }, [reports, body, hideAlias])

  // 통계
  const stats = useMemo(() => {
    let problems = 0, allowed = 0, occCount = 0
    for (const r of reports) for (const v of r.variants) {
      if (v.isAllowedAlias) { allowed++; continue }
      problems++; occCount += v.occ.length
    }
    return { problems, allowed, occCount, termsWithIssue: reports.filter((r) => r.variants.some((v) => !v.isAllowedAlias)).length }
  }, [reports])

  // ── 용어 CRUD ──
  function addTerm() {
    const canonical = fCanon.trim()
    if (!canonical) { flash('표준 표기를 입력하세요.'); return }
    if (terms.some((t) => t.canonical === canonical && t.id !== editId)) { flash('이미 같은 표준 표기가 있습니다.'); return }
    const aliases = splitList(fAlias).filter((a) => a !== canonical)
    const forbidden = splitList(fForbid).filter((a) => a !== canonical)
    const note = fNote.trim() || undefined
    if (editId) {
      setTerms((prev) => prev.map((t) => t.id === editId ? { ...t, canonical, kind: fKind, aliases, forbidden, note, updated: Date.now() } : t))
      flash('수정했습니다.')
    } else {
      setTerms((prev) => [{ id: uid(), canonical, kind: fKind, aliases, forbidden, note, updated: Date.now() }, ...prev])
      flash('등록했습니다.')
    }
    resetForm()
  }
  function resetForm() {
    setEditId(null); setFCanon(''); setFKind('person'); setFAlias(''); setFForbid(''); setFNote('')
  }
  function startEdit(t: Term) {
    setEditId(t.id); setFCanon(t.canonical); setFKind(t.kind)
    setFAlias(t.aliases.join(', ')); setFForbid(t.forbidden.join(', ')); setFNote(t.note || '')
    setTab('terms')
  }
  function removeTerm(id: string) {
    setTerms((prev) => prev.filter((t) => t.id !== id))
    if (editId === id) resetForm()
  }
  function clearAll() {
    if (!terms.length) return
    setTerms([]); resetForm(); flash('용어를 모두 비웠습니다.')
  }
  // 후보/외부에서 일괄 등록(중복 제외)
  function importTerms(items: Array<{ canonical: string; kind: TermKind; aliases?: string[] }>) {
    setTerms((prev) => {
      const have = new Set(prev.map((t) => t.canonical))
      const add: Term[] = []
      for (const it of items) {
        const c = it.canonical.trim()
        if (!c || have.has(c)) continue
        have.add(c)
        add.push({ id: uid(), canonical: c, kind: it.kind, aliases: it.aliases || [], forbidden: [], updated: Date.now() })
      }
      return add.length ? [...add, ...prev] : prev
    })
  }
  function addCandidate(c: Candidate, kind: TermKind) {
    importTerms([{ canonical: c.root, kind }])
    flash(`"${c.root}" 등록`)
  }

  // ── 별칭으로 승격(허용) / 금지로 강등 ──
  function promoteToAlias(termId: string, variant: string) {
    setTerms((prev) => prev.map((t) => {
      if (t.id !== termId) return t
      if (t.aliases.includes(variant)) return t
      return { ...t, aliases: [...t.aliases, variant], forbidden: t.forbidden.filter((f) => f !== variant), updated: Date.now() }
    }))
    flash(`"${variant}"을(를) 허용 별칭으로`)
  }
  function markForbidden(termId: string, variant: string) {
    setTerms((prev) => prev.map((t) => {
      if (t.id !== termId) return t
      if (t.forbidden.includes(variant)) return t
      return { ...t, forbidden: [...t.forbidden, variant], aliases: t.aliases.filter((a) => a !== variant), updated: Date.now() }
    }))
    flash(`"${variant}"을(를) 금지 이형으로`)
  }

  // ── 본문에서 일괄 치환(표준형으로 통일) ──
  function unifyVariant(variant: string, canonical: string) {
    if (!variant || variant === canonical) return
    // 어근 단위 치환: 표면형이 변형 어근으로 시작하는 토큰을 표준형+나머지(조사)로
    const toksNow = tokenize(body)
    const targets = toksNow.filter((t) => t.root === variant)
    if (!targets.length) { flash('본문에 해당 표기가 없습니다.'); return }
    // 뒤에서부터 치환(인덱스 보존)
    let next = body
    let n = 0
    for (let i = targets.length - 1; i >= 0; i--) {
      const t = targets[i]
      const tail = t.surface.slice(t.root.length) // 조사 등 꼬리
      next = next.slice(0, t.index) + canonical + tail + next.slice(t.end)
      n++
    }
    setBody(next)
    flash(`"${variant}" → "${canonical}" ${n}곳 통일`)
  }

  // ── 위치 점프 ──
  function jumpTo(index: number, end: number) {
    if (tab !== 'check') setTab('check')
    const ta = taRef.current
    if (!ta) return
    ta.focus()
    try { ta.setSelectionRange(index, end) } catch { /* noop */ }
    // 선택 위치가 보이도록 스크롤(근사)
    try {
      const before = body.slice(0, index)
      const lineNo = (before.match(/\n/g) || []).length
      ta.scrollTop = Math.max(0, lineNo * 22 - ta.clientHeight / 2)
    } catch { /* noop */ }
  }

  // ── 결과 텍스트(복사/프로젝트) ──
  const resultText = useMemo(() => {
    const lines: string[] = ['[이름·용어 표기 통일 검사]']
    const problemReports = reports.filter((r) => r.variants.some((v) => !v.isAllowedAlias))
    if (!problemReports.length) {
      lines.push(stats.allowed ? '표기 불일치 없음(허용 별칭만 발견).' : '표기 불일치가 발견되지 않았습니다.')
      return lines.join('\n')
    }
    lines.push(`불일치 ${stats.problems}종 · ${stats.occCount}곳 · 대상 용어 ${stats.termsWithIssue}개`, '')
    for (const r of problemReports) {
      const km = KIND_META[r.term.kind]
      lines.push(`■ ${r.term.canonical} [${km.label}] — 표준형 ${r.canonicalCount}회`)
      for (const v of r.variants) {
        if (v.isAllowedAlias) continue
        const tm = TYPE_META[v.type]
        const where = v.occ.slice(0, 8).map((o) => { const { line } = toLineCol(o.index); return `줄${line}` }).join(', ')
        lines.push(`  · "${v.variant}" ×${v.occ.length} [${tm.label}] (${where}${v.occ.length > 8 ? '…' : ''}) → "${r.term.canonical}"(으)로 통일 검토`)
      }
    }
    return lines.join('\n')
  }, [reports, stats, toLineCol])

  async function doCopy() {
    const txt = resultText
    if (!txt) return
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(txt)
      else {
        const ta = document.createElement('textarea'); ta.value = txt; ta.style.position = 'fixed'; ta.style.opacity = '0'
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
      }
      setCopied(true)
      if (copyTimer.current != null) clearTimeout(copyTimer.current)
      copyTimer.current = window.setTimeout(() => setCopied(false), 1400)
    } catch { setCopied(false) }
  }

  function sendToProject() {
    if (!hasProjectBridge()) return
    const problemReports = reports.filter((r) => r.variants.some((v) => !v.isAllowedAlias))
    const bodyHtml =
      `<p>등록 용어 ${terms.length}개 기준 표기 통일 검사 결과입니다. (불일치 ${stats.problems}종 · ${stats.occCount}곳)</p>` +
      (problemReports.length === 0
        ? '<p>표기 불일치가 발견되지 않았습니다.</p>'
        : problemReports.map((r) => {
            const km = KIND_META[r.term.kind]
            const rows = r.variants.filter((v) => !v.isAllowedAlias).map((v) => {
              const tm = TYPE_META[v.type]
              const where = v.occ.slice(0, 10).map((o) => { const { line } = toLineCol(o.index); return `줄${line}` }).join(', ')
              return `<li>“${escapeHtml(v.variant)}” ×${v.occ.length} [${escapeHtml(tm.label)}] (${escapeHtml(where)}) → “${escapeHtml(r.term.canonical)}”(으)로 통일 검토</li>`
            }).join('')
            return `<p><b>${escapeHtml(r.term.canonical)}</b> [${escapeHtml(km.label)}] · 표준형 ${r.canonicalCount}회</p><ul>${rows}</ul>`
          }).join(''))
    const id = addToProject({ kind: 'text', root: 'research', folder: '교정', title: `표기 통일 검사 — 불일치 ${stats.problems}종`, bodyHtml })
    if (id) flash('프로젝트 자료 〈교정〉에 결과를 추가했습니다.')
  }
  function stashTerms() {
    if (!hasStash()) return
    const text = terms.map((t) => `${KIND_META[t.kind].icon} ${t.canonical}${t.aliases.length ? ` (별칭: ${t.aliases.join(', ')})` : ''}${t.forbidden.length ? ` (금지: ${t.forbidden.join(', ')})` : ''}`).join('\n')
    addToStash({ kind: 'note', label: `용어 표기 사전 ${terms.length}개`, text })
    flash('수집함에 용어 사전을 담았습니다.')
  }

  // ── 라이브러리 가져오기 ──
  function importFromLibrary() {
    const items: Array<{ canonical: string; kind: TermKind; aliases?: string[] }> = []
    for (const c of libChars) if (c.name?.trim()) items.push({ canonical: c.name.trim(), kind: 'person' })
    for (const p of libPlaces) if (p.name?.trim()) items.push({ canonical: p.name.trim(), kind: 'place' })
    if (!items.length) { flash('가져올 인물/장소가 없습니다.'); return }
    const before = terms.length
    importTerms(items)
    setTimeout(() => flash(`라이브러리에서 가져왔습니다.`), 0)
    if (before === terms.length) { /* noop, importTerms 가 중복 제외 */ }
  }
  const libCount = libChars.length + libPlaces.length

  // ── 드롭(좌측 바인더 파일 → 본문으로) ──
  function onDrop(e: React.DragEvent) {
    setDragOver(false)
    const item = getDragItem(e)
    if (item?.text) {
      e.preventDefault()
      setBody((prev) => prev ? prev + '\n\n' + item.text : item.text!)
      flash(`〈${item.title}〉 본문을 불러왔습니다.`)
    }
  }

  function loadSample() {
    importTerms(SAMPLE_TERMS.map((s) => ({ canonical: s.canonical, kind: s.kind, aliases: s.aliases })))
    // 금지 이형까지 반영(importTerms 는 forbidden 미설정)
    setTerms((prev) => prev.map((t) => {
      const s = SAMPLE_TERMS.find((x) => x.canonical === t.canonical)
      return s && s.forbidden ? { ...t, forbidden: Array.from(new Set([...t.forbidden, ...s.forbidden])) } : t
    }))
    setBody(SAMPLE_BODY)
    setTab('check')
    flash('예시 용어·본문을 불러왔습니다.')
  }

  // ─────────────────────────────────────────────────────────────
  // 스타일
  // ─────────────────────────────────────────────────────────────
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden', position: 'relative' }
  const title: React.CSSProperties = { fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5 }
  const tabRow: React.CSSProperties = { display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }
  const tabBtn = (active: boolean): React.CSSProperties => ({
    fontSize: 12.5, padding: '5px 13px', borderRadius: 999, cursor: 'pointer',
    border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
    background: active ? 'var(--accent)' : 'var(--chrome-2)',
    color: active ? 'var(--paper)' : 'var(--text)', userSelect: 'none', whiteSpace: 'nowrap', fontWeight: active ? 700 : 500,
  })
  const taStyle: React.CSSProperties = {
    minHeight: 96, maxHeight: 200, resize: 'vertical', boxSizing: 'border-box', width: '100%',
    background: dragOver ? 'color-mix(in srgb, var(--accent) 12%, var(--paper))' : 'var(--paper)',
    color: 'var(--text)', border: `1px ${dragOver ? 'dashed' : 'solid'} ${dragOver ? 'var(--accent)' : 'var(--border)'}`,
    borderRadius: 10, padding: '11px 13px', fontSize: 15, lineHeight: 1.6, outline: 'none', fontFamily: 'inherit',
  }
  const controls: React.CSSProperties = { display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', fontSize: 12, color: 'var(--muted)' }
  const sel: React.CSSProperties = { background: 'var(--paper)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, padding: '3px 6px', fontSize: 12, fontFamily: 'inherit', outline: 'none' }
  const scroll: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 2 }
  const sectionTitle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: 'var(--muted)', margin: '2px 0' }
  const preview: React.CSSProperties = { background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10, padding: '11px 13px', fontSize: 14, lineHeight: 1.85, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }
  const cardHead: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }
  const wordTxt: React.CSSProperties = { fontSize: 15.5, fontWeight: 700, color: 'var(--text)' }
  const tag = (color: string): React.CSSProperties => ({ fontSize: 11, fontWeight: 700, color, border: `1px solid ${color}`, borderRadius: 6, padding: '1px 6px', whiteSpace: 'nowrap' })
  const small: React.CSSProperties = { fontSize: 11.5, color: 'var(--muted)' }
  const hint: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', lineHeight: 1.55 }
  const empty: React.CSSProperties = { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--muted)', textAlign: 'center', fontSize: 13, lineHeight: 1.65, padding: 16 }
  const input: React.CSSProperties = { background: 'var(--paper)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px', fontSize: 13.5, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', width: '100%' }
  const label: React.CSSProperties = { fontSize: 11.5, color: 'var(--muted)', display: 'block', marginBottom: 3 }
  const chipBtn: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 6, padding: '2px 8px', cursor: 'pointer', whiteSpace: 'nowrap' }
  const occChip: React.CSSProperties = { ...chipBtn, fontVariantNumeric: 'tabular-nums' as React.CSSProperties['fontVariantNumeric'] }

  const hasBody = body.trim() !== ''

  // ─────────────────────────────────────────────────────────────
  return (
    <div style={wrap}>
      <div style={title}><Emoji e="🔤"/> 등록한 고유명사의 띄어쓰기·오타·자모 이형·금지 표기를 본문에서 찾아 표기를 통일합니다 (100% 로컬, 네트워크 불필요)</div>

      <div style={tabRow}>
        <span style={tabBtn(tab === 'check')} onClick={() => setTab('check')} role="button" tabIndex={0}><Emoji e="🔍"/> 표기 검사 {stats.problems ? `· ${stats.problems}` : ''}</span>
        <span style={tabBtn(tab === 'terms')} onClick={() => setTab('terms')} role="button" tabIndex={0}><Emoji e="📒"/> 용어 사전 {terms.length}</span>
        <span style={{ flex: 1 }} />
        <button className="minibtn" onClick={loadSample} type="button">예시</button>
      </div>

      {tab === 'check' ? (
        <>
          <textarea
            ref={taRef}
            style={taStyle}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onDragOver={(e) => { if (isItemDrag(e)) { e.preventDefault(); setDragOver(true) } }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            placeholder="검사할 글을 붙여넣으세요. 좌측 바인더 파일을 끌어다 놓아도 본문을 불러옵니다."
            spellCheck={false}
            aria-label="검사할 본문 입력"
          />

          <div style={controls}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>민감도</span>
              <select style={sel} value={sens} onChange={(e) => setSens(Number(e.target.value))} aria-label="오타 민감도">
                <option value={1}>엄격(1글자 차이)</option>
                <option value={2}>보통(2글자 차이)</option>
                <option value={3}>느슨(3글자 차이)</option>
              </select>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
              <input type="checkbox" checked={hideAlias} onChange={(e) => setHideAlias(e.target.checked)} />
              <span>허용 별칭 숨기기</span>
            </label>
            <span style={{ flex: 1 }} />
            <button className="minibtn" onClick={() => setBody('')} disabled={!body} type="button">본문 지우기</button>
            <button className="btn-primary" onClick={doCopy} disabled={!hasBody || !terms.length} type="button">{copied ? '복사됨 ✓' : '결과 복사'}</button>
          </div>

          {!hasBody ? (
            <div style={empty}>
              <div style={{ fontSize: 30 }}><Emoji e="🔤"/></div>
              <div>본문을 붙여넣고, <b>용어 사전</b> 탭에서 표준 표기를 등록하면<br />띄어쓰기·오타·자모 이형 같은 불일치를 찾아 강조합니다.</div>
              <div style={hint}>등록 용어가 없어도 본문에서 자주 나오는 고유명사 후보를 자동으로 추천합니다.</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                <button className="minibtn" onClick={loadSample} type="button">예시로 체험</button>
                <button className="minibtn" onClick={() => setTab('terms')} type="button">용어 등록하기</button>
              </div>
            </div>
          ) : terms.length === 0 ? (
            <div style={scroll}>
              <div style={{ ...card, borderColor: 'var(--accent)' }}>
                <div style={{ fontSize: 13, marginBottom: 6 }}>아직 등록한 용어가 없습니다. 본문에서 추린 고유명사 후보를 등록해 검사하세요.</div>
                {candidates.length === 0 ? (
                  <div style={hint}>반복 등장하는 후보를 찾지 못했습니다. 용어 사전 탭에서 직접 등록하세요.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {candidates.slice(0, 30).map((c) => (
                      <div key={c.root} style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ ...wordTxt, fontSize: 14 }}>{c.root}</span>
                        <span style={small}>{c.count}회</span>
                        <span style={{ flex: 1 }} />
                        <button style={chipBtn} onClick={() => addCandidate(c, 'person')} type="button"><Emoji e="🧑"/> 인물</button>
                        <button style={chipBtn} onClick={() => addCandidate(c, 'place')} type="button"><Emoji e="🏛️"/> 장소</button>
                        <button style={chipBtn} onClick={() => addCandidate(c, 'term')} type="button"><Emoji e="📌"/> 용어</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={scroll}>
              {/* 본문 강조 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <div style={sectionTitle}>본문 강조</div>
                  <span style={{ flex: 1 }} />
                  {stats.problems === 0
                    ? <span style={tag('var(--ok)')}>불일치 없음 ✓</span>
                    : <span style={tag('var(--warn)')}>불일치 {stats.problems}종 · {stats.occCount}곳</span>}
                  {stats.allowed > 0 && <span style={tag('var(--muted)')}>허용 별칭 {stats.allowed}</span>}
                </div>
                <div style={preview}>
                  {segs.map((s, i) => s.mk ? (
                    <mark
                      key={i}
                      onClick={() => jumpTo(s.mk!.index, s.mk!.end)}
                      title={`${TYPE_META[s.mk.type].label} · 표준형 "${s.mk.canonical}"(으)로 통일 검토 (클릭: 본문 선택)`}
                      style={{
                        background: 'transparent', color: TYPE_META[s.mk.type].color, fontWeight: 700, cursor: 'pointer',
                        borderBottom: `2px ${s.mk.type === 'forbidden' ? 'solid' : 'dashed'} ${TYPE_META[s.mk.type].color}`, padding: '0 1px',
                      }}
                    >{s.text}</mark>
                  ) : <span key={i}>{s.text}</span>)}
                </div>
              </div>

              {/* 불일치 목록 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={sectionTitle}>검사 결과 ({reports.length}개 용어)</div>
                <span style={{ flex: 1 }} />
                {hasProjectBridge() && <button className="minibtn" onClick={sendToProject} type="button" title="결과를 프로젝트 자료에 추가"><Emoji e="📄"/> 프로젝트에 추가</button>}
              </div>

              {reports.map((r) => {
                const km = KIND_META[r.term.kind]
                const problemVars = r.variants.filter((v) => !v.isAllowedAlias)
                const aliasVars = r.variants.filter((v) => v.isAllowedAlias)
                return (
                  <div key={r.term.id} style={{ ...card, borderColor: problemVars.length ? 'var(--warn)' : 'var(--border)' }}>
                    <div style={cardHead}>
                      <span><Emoji e={km.icon}/></span>
                      <span style={wordTxt}>{r.term.canonical}</span>
                      <span style={tag(km.color)}>{km.label}</span>
                      <span style={small}>표준형 {r.canonicalCount}회</span>
                      <span style={{ flex: 1 }} />
                      {problemVars.length === 0
                        ? <span style={tag('var(--ok)')}>통일됨 ✓</span>
                        : <span style={tag('var(--warn)')}>불일치 {problemVars.length}</span>}
                    </div>

                    {problemVars.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 8 }}>
                        {problemVars.map((v) => {
                          const tm = TYPE_META[v.type]
                          return (
                            <div key={v.variant} style={{ borderLeft: `2px solid ${tm.color}`, paddingLeft: 9 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                                <span style={{ fontSize: 14, fontWeight: 700, color: tm.color }}>{v.variant}</span>
                                <span style={{ fontSize: 12, color: 'var(--muted)' }}>→ {r.term.canonical}</span>
                                <span style={tag(tm.color)}>{tm.label}</span>
                                <span style={small}>{v.occ.length}곳</span>
                              </div>
                              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                                {v.occ.slice(0, 16).map((o, k) => {
                                  const { line, col } = toLineCol(o.index)
                                  return <span key={k} style={occChip} onClick={() => jumpTo(o.index, o.end)} title="본문에서 이 위치를 선택">{o.surface !== v.variant ? `${o.surface} ` : ''}줄{line}·{col}</span>
                                })}
                                {v.occ.length > 16 && <span style={small}>외 {v.occ.length - 16}곳</span>}
                              </div>
                              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                                <button style={{ ...chipBtn, borderColor: 'var(--accent)', color: 'var(--accent)' }} onClick={() => unifyVariant(v.variant, r.term.canonical)} type="button" title="본문에서 표준형으로 일괄 치환"><Emoji e="✏️"/> 표준형으로 통일</button>
                                <button style={chipBtn} onClick={() => promoteToAlias(r.term.id, v.variant)} type="button" title="이 표기를 허용 별칭으로(경고 제외)"><Emoji e="✅"/> 별칭 허용</button>
                                {v.type !== 'forbidden' && <button style={chipBtn} onClick={() => markForbidden(r.term.id, v.variant)} type="button" title="항상 경고할 금지 이형으로 등록"><Emoji e="🚫"/> 금지 등록</button>}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {!hideAlias && aliasVars.length > 0 && (
                      <div style={{ marginTop: 8 }}>
                        <div style={hint}>허용 별칭(경고 제외)</div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                          {aliasVars.map((v) => <span key={v.variant} style={{ ...tag('var(--muted)'), fontWeight: 500 }}>{v.variant} ×{v.occ.length}</span>)}
                        </div>
                      </div>
                    )}

                    {problemVars.length === 0 && aliasVars.length === 0 && (
                      <div style={{ ...hint, marginTop: 6 }}>{r.canonicalCount === 0 ? '본문에 등장하지 않습니다.' : '변형 표기 없이 일관되게 쓰였습니다.'}</div>
                    )}
                  </div>
                )
              })}

              {/* 미등록 후보 추천(검사 중에도) */}
              {candidates.length > 0 && (
                <div style={card}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={sectionTitle}>새 고유명사 후보 (반복 등장 · 미등록)</div>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                    {candidates.slice(0, 24).map((c) => (
                      <span key={c.root} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '3px 6px 3px 9px' }}>
                        <span style={{ fontSize: 13 }}>{c.root}</span>
                        <span style={small}>×{c.count}</span>
                        <button style={{ ...chipBtn, padding: '1px 6px' }} onClick={() => addCandidate(c, 'person')} type="button" title="인물로 등록"><Emoji e="🧑"/></button>
                        <button style={{ ...chipBtn, padding: '1px 6px' }} onClick={() => addCandidate(c, 'place')} type="button" title="장소로 등록"><Emoji e="🏛️"/></button>
                        <button style={{ ...chipBtn, padding: '1px 6px' }} onClick={() => addCandidate(c, 'term')} type="button" title="용어로 등록"><Emoji e="📌"/></button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div style={hint}>오타·자모 이형은 편집거리 기반 근사 탐지입니다(긴 이름일수록 정확). 의도한 다른 인물/표기는 〈별칭 허용〉으로 제외하고, 흔한 오답은 〈금지 등록〉해 두면 다음 검사에서 항상 잡힙니다.</div>
            </div>
          )}
        </>
      ) : (
        // ── 용어 사전 탭 ──
        <div style={scroll}>
          {/* 입력 폼 */}
          <div style={{ ...card, borderColor: editId ? 'var(--accent)' : 'var(--border)' }}>
            <div style={{ ...sectionTitle, marginBottom: 8 }}>{editId ? '용어 수정' : '새 용어 등록'}</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <div style={{ flex: '2 1 180px' }}>
                <label style={label}>표준 표기(이것으로 통일)</label>
                <input style={input} value={fCanon} onChange={(e) => setFCanon(e.target.value)} placeholder="예: 이서연, 백록담, 검은달 길드"
                  onKeyDown={(e) => { if (e.key === 'Enter') addTerm() }} />
              </div>
              <div style={{ flex: '1 1 110px' }}>
                <label style={label}>분류</label>
                <select style={{ ...input, padding: '7px 8px' }} value={fKind} onChange={(e) => setFKind(e.target.value as TermKind)}>
                  <option value="person">🧑 인물</option>
                  <option value="place">🏛️ 장소</option>
                  <option value="term">📌 용어</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
              <div style={{ flex: '1 1 180px' }}>
                <label style={label}>허용 별칭(쉼표로 구분 · 경고 제외)</label>
                <input style={input} value={fAlias} onChange={(e) => setFAlias(e.target.value)} placeholder="예: 서연, 연이" />
              </div>
              <div style={{ flex: '1 1 180px' }}>
                <label style={label}>금지 이형(쉼표로 구분 · 항상 경고)</label>
                <input style={input} value={fForbid} onChange={(e) => setFForbid(e.target.value)} placeholder="예: 이서현" />
              </div>
            </div>
            <div style={{ marginTop: 8 }}>
              <label style={label}>메모(선택)</label>
              <input style={input} value={fNote} onChange={(e) => setFNote(e.target.value)} placeholder="설정 메모(검사에는 쓰이지 않음)" />
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
              <button className="btn-primary" onClick={addTerm} type="button">{editId ? '수정 저장' : '등록'}</button>
              {editId && <button className="minibtn" onClick={resetForm} type="button">취소</button>}
              <span style={{ flex: 1 }} />
              <button className="minibtn" onClick={importFromLibrary} type="button" disabled={!libCount} title="공유 라이브러리의 인물/장소를 표준 표기로 가져옵니다"><Emoji e="📥"/> 라이브러리 가져오기{libCount ? ` (${libCount})` : ''}</button>
            </div>
          </div>

          {/* 후보 추천(본문 기반) */}
          {hasBody && candidates.length > 0 && (
            <div style={card}>
              <div style={sectionTitle}>본문 고유명사 후보 (반복 등장 · 미등록 {candidates.length})</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                {candidates.slice(0, 30).map((c) => (
                  <span key={c.root} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '3px 6px 3px 9px' }}>
                    <span style={{ fontSize: 13 }}>{c.root}</span>
                    <span style={small}>×{c.count}</span>
                    <button style={{ ...chipBtn, padding: '1px 6px' }} onClick={() => addCandidate(c, 'person')} type="button" title="인물로 등록"><Emoji e="🧑"/></button>
                    <button style={{ ...chipBtn, padding: '1px 6px' }} onClick={() => addCandidate(c, 'place')} type="button" title="장소로 등록"><Emoji e="🏛️"/></button>
                    <button style={{ ...chipBtn, padding: '1px 6px' }} onClick={() => addCandidate(c, 'term')} type="button" title="용어로 등록"><Emoji e="📌"/></button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 등록 목록 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={sectionTitle}>등록 용어 {terms.length}개</div>
            <span style={{ flex: 1 }} />
            {hasStash() && terms.length > 0 && <button className="minibtn" onClick={stashTerms} type="button"><Emoji e="📎"/> 수집함</button>}
            {terms.length > 0 && <button className="minibtn" onClick={clearAll} type="button">전체 비우기</button>}
          </div>

          {terms.length === 0 ? (
            <div style={empty}>
              <div style={{ fontSize: 30 }}><Emoji e="📒"/></div>
              <div>등록한 용어가 없습니다.<br />표준 표기를 등록하면 본문에서 그 변형을 추적합니다.</div>
              <div style={hint}>인물·장소 이름, 고유 용어, 길드/조직명 등 표기가 흔들리기 쉬운 말을 등록하세요.</div>
            </div>
          ) : (
            terms.map((t) => {
              const km = KIND_META[t.kind]
              return (
                <div key={t.id} style={card}>
                  <div style={cardHead}>
                    <span><Emoji e={km.icon}/></span>
                    <span style={wordTxt}>{t.canonical}</span>
                    <span style={tag(km.color)}>{km.label}</span>
                    <span style={{ flex: 1 }} />
                    <button style={chipBtn} onClick={() => { setBody((b) => b); setTab('check') }} type="button" title="검사 탭으로"><Emoji e="🔍"/></button>
                    <button style={chipBtn} onClick={() => startEdit(t)} type="button">수정</button>
                    <button style={{ ...chipBtn, color: 'var(--warn)', borderColor: 'var(--warn)' }} onClick={() => removeTerm(t.id)} type="button">삭제</button>
                  </div>
                  {(t.aliases.length > 0 || t.forbidden.length > 0 || t.note) && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 7 }}>
                      {t.aliases.length > 0 && <div style={small}><Emoji e="✅"/> 허용 별칭: {t.aliases.join(', ')}</div>}
                      {t.forbidden.length > 0 && <div style={{ ...small, color: 'var(--warn)' }}><Emoji e="🚫"/> 금지 이형: {t.forbidden.join(', ')}</div>}
                      {t.note && <div style={small}><Emoji e="📝"/> {t.note}</div>}
                    </div>
                  )}
                </div>
              )
            })
          )}

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
            <button className="linkbtn" onClick={() => openToolLinked('character-sheet')} type="button">인물 시트 열기</button>
            <button className="linkbtn" onClick={() => openToolLinked('world-wiki')} type="button">세계관 위키 열기</button>
          </div>
        </div>
      )}

      {toast && (
        <div style={{ position: 'absolute', left: '50%', bottom: 14, transform: 'translateX(-50%)', background: 'var(--accent)', color: 'var(--paper)', padding: '7px 14px', borderRadius: 999, fontSize: 12.5, fontWeight: 600, boxShadow: '0 4px 16px rgba(0,0,0,.2)', zIndex: 5, pointerEvents: 'none' }}>{toast}</div>
      )}
    </div>
  )
}

// 쉼표/줄바꿈으로 나눠 중복·공백 정리
function splitList(s: string): string[] {
  return Array.from(new Set(s.split(/[,\n]/).map((x) => x.trim()).filter(Boolean)))
}
