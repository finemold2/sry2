import { useState, useEffect, useRef, useMemo } from 'react'
import {
  useLibraryList,
  addToProject,
  hasProjectBridge,
  getDragItem,
  isItemDrag,
  Emoji,
} from './linkbus'

export const meta = {
  id: 'name-sound-clash',
  name: '이름 어감 충돌 검사',
  icon: '🔔',
  group: '게임·캐릭터',
  intro: '등록한 인물 이름끼리 너무 비슷해 독자가 헷갈릴 위험을 점수로 경고',
  w: 720,
  h: 640,
}

// ───────────────────────── 저장 ─────────────────────────
const LS_KEY = 'sry:tool:name-sound-clash'

interface NameRec {
  id: string
  name: string
  role?: string // 메모(역할/소속 등) — 충돌과 무관, 식별용
}
interface Persist {
  names: NameRec[]
  threshold: number // 충돌로 볼 점수 하한(0~100)
}

const uid = () =>
  'n_' + Date.now().toString(36) + '_' + Math.floor(Math.random() * 1e6).toString(36)

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function load(): Persist {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) {
      const p = JSON.parse(raw) as Partial<Persist>
      return {
        names: Array.isArray(p.names)
          ? p.names
              .filter((x): x is NameRec => !!x && typeof x.name === 'string')
              .map((x) => ({ id: x.id || uid(), name: x.name, role: x.role || '' }))
          : [],
        threshold: typeof p.threshold === 'number' ? clamp(p.threshold, 0, 100) : 55,
      }
    }
  } catch {
    /* noop */
  }
  return { names: [], threshold: 55 }
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n))

// ───────────────────── 한글/발음 분석(라이브러리 없이 직접) ─────────────────────
// 초성/중성/종성 분해. 발음 유사도 판단에 쓴다.
const CHO = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ']
const JUNG = ['ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ', 'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ']
const JONG = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ']

// 자음의 음성학적 묶음(된소리/거센소리/예사소리 같은 계열을 비슷한 음으로 본다)
const CONS_GROUP: Record<string, string> = {
  ㄱ: 'k', ㄲ: 'k', ㅋ: 'k',
  ㄷ: 't', ㄸ: 't', ㅌ: 't',
  ㅂ: 'p', ㅃ: 'p', ㅍ: 'p',
  ㅈ: 'c', ㅉ: 'c', ㅊ: 'c',
  ㅅ: 's', ㅆ: 's',
  ㄴ: 'n', ㄹ: 'r', ㅁ: 'm', ㅇ: '0', ㅎ: 'h',
}
// 모음의 음성학적 묶음(비슷하게 들리는 모음끼리)
const VOWEL_GROUP: Record<string, string> = {
  ㅏ: 'a', ㅑ: 'a',
  ㅓ: 'eo', ㅕ: 'eo',
  ㅗ: 'o', ㅛ: 'o',
  ㅜ: 'u', ㅠ: 'u',
  ㅡ: 'eu', ㅣ: 'i',
  ㅐ: 'e', ㅔ: 'e', ㅒ: 'e', ㅖ: 'e',
  ㅘ: 'wa', ㅙ: 'we', ㅚ: 'we', ㅝ: 'wo', ㅞ: 'we', ㅟ: 'wi', ㅢ: 'ui',
}
// 종성 받침의 대표 발음(불파음 / 비음 묶음)
const JONG_REP: Record<string, string> = {
  ㄱ: 'k', ㄲ: 'k', ㅋ: 'k', ㄳ: 'k', ㄺ: 'k',
  ㄷ: 't', ㅌ: 't', ㅅ: 't', ㅆ: 't', ㅈ: 't', ㅊ: 't', ㅎ: 't',
  ㅂ: 'p', ㅍ: 'p', ㄿ: 'p', ㅄ: 'p',
  ㄴ: 'n', ㄵ: 'n', ㄶ: 'n',
  ㅁ: 'm', ㄻ: 'm',
  ㅇ: 'ng',
  ㄹ: 'l', ㄼ: 'l', ㄽ: 'l', ㄾ: 'l', ㅀ: 'l', ㄹㄱ: 'l',
}

interface Jamo {
  cho: string
  jung: string
  jong: string
  raw: string
}

// 한 음절을 자모로 분해(한글 음절만; 다른 문자는 raw 만 채움)
function syllable(ch: string): Jamo {
  const code = ch.codePointAt(0)
  if (code != null && code >= 0xac00 && code <= 0xd7a3) {
    const s = code - 0xac00
    return {
      cho: CHO[Math.floor(s / 588)],
      jung: JUNG[Math.floor((s % 588) / 28)],
      jong: JONG[s % 28],
      raw: ch,
    }
  }
  return { cho: '', jung: '', jong: '', raw: ch }
}

function syllables(name: string): Jamo[] {
  return [...name.trim().replace(/\s+/g, '')].map(syllable)
}

// 이름을 "음소 코드" 문자열로(발음 거리 측정용). 묶음 매핑을 적용해 비슷한 음을 같은 기호로.
function phoneCode(name: string): string {
  let out = ''
  for (const j of syllables(name)) {
    if (j.cho) {
      out += CONS_GROUP[j.cho] ?? j.cho
      out += VOWEL_GROUP[j.jung] ?? j.jung
      if (j.jong) out += JONG_REP[j.jong] ?? j.jong
    } else {
      // 한글이 아니면 소문자 알파벳/숫자만 흘려보냄
      const c = j.raw.toLowerCase()
      if (/[a-z0-9]/.test(c)) out += c
    }
  }
  return out
}

// 첫 음절의 발음 키(초성 묶음 + 중성 묶음). 첫 글자(소리)가 같은지 본다.
function firstSoundKey(name: string): string {
  const sy = syllables(name)
  if (!sy.length) return ''
  const j = sy[0]
  if (j.cho) return (CONS_GROUP[j.cho] ?? j.cho) + '|' + (VOWEL_GROUP[j.jung] ?? j.jung)
  return j.raw.toLowerCase()
}
// 첫 글자(표기 그대로)
function firstChar(name: string): string {
  const t = name.trim()
  return t ? [...t.replace(/\s+/g, '')][0] || '' : ''
}
// 마지막 음의 키(종성 우선, 없으면 중성). 같은 음으로 끝나는지 본다.
function lastSoundKey(name: string): string {
  const sy = syllables(name)
  if (!sy.length) return ''
  const j = sy[sy.length - 1]
  if (j.cho) {
    if (j.jong) return 'C:' + (JONG_REP[j.jong] ?? j.jong)
    return 'V:' + (VOWEL_GROUP[j.jung] ?? j.jung)
  }
  return 'R:' + j.raw.toLowerCase()
}
function syllableLen(name: string): number {
  return syllables(name).length
}

// 레벤슈타인 거리(음소 코드 기준)
function lev(a: string, b: string): number {
  const m = a.length
  const n = b.length
  if (!m) return n
  if (!n) return m
  let prev = new Array(n + 1)
  let cur = new Array(n + 1)
  for (let j = 0; j <= n; j++) prev[j] = j
  for (let i = 1; i <= m; i++) {
    cur[0] = i
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost)
    }
    ;[prev, cur] = [cur, prev]
  }
  return prev[n]
}

interface ClashReason {
  label: string
  weight: number
}
interface Clash {
  a: NameRec
  b: NameRec
  score: number // 0~100
  reasons: ClashReason[]
}

// 두 이름의 충돌 점수와 사유 계산
function compare(a: NameRec, b: NameRec): Clash {
  const reasons: ClashReason[] = []
  const an = a.name.trim()
  const bn = b.name.trim()

  // 1) 발음 유사도(음소 코드 레벤슈타인 → 정규화)
  const pa = phoneCode(an)
  const pb = phoneCode(bn)
  let phonSim = 0
  if (pa || pb) {
    const d = lev(pa, pb)
    phonSim = 1 - d / Math.max(pa.length, pb.length, 1) // 0~1
  }
  const phonW = Math.round(phonSim * 46) // 최대 46점
  if (phonW > 0) {
    let lvl = '약간'
    if (phonSim >= 0.85) lvl = '매우'
    else if (phonSim >= 0.65) lvl = '꽤'
    reasons.push({ label: `발음이 ${lvl} 비슷 (${Math.round(phonSim * 100)}%)`, weight: phonW })
  }

  // 2) 첫소리(첫 음절 발음)가 같음
  if (firstSoundKey(an) && firstSoundKey(an) === firstSoundKey(bn)) {
    reasons.push({ label: `첫소리가 같음 ('${firstChar(an)}' / '${firstChar(bn)}')`, weight: 22 })
  } else if (firstChar(an) && firstChar(an) === firstChar(bn)) {
    // 표기상 첫 글자만 같아도(소리 키가 달라진 드문 경우) 가중
    reasons.push({ label: `첫 글자가 같음 ('${firstChar(an)}')`, weight: 16 })
  }

  // 3) 같은 음으로 끝남
  if (lastSoundKey(an) && lastSoundKey(an) === lastSoundKey(bn)) {
    const lc = [...an.replace(/\s+/g, '')].pop() || ''
    const lc2 = [...bn.replace(/\s+/g, '')].pop() || ''
    reasons.push({ label: `같은 음으로 끝남 ('…${lc}' / '…${lc2}')`, weight: 16 })
  }

  // 4) 음절 길이가 같음(짧은 이름일수록 헷갈리기 쉬움)
  const la = syllableLen(an)
  const lb = syllableLen(bn)
  if (la > 0 && la === lb) {
    reasons.push({ label: `글자 수가 같음 (${la}글자)`, weight: la <= 2 ? 12 : 8 })
  }

  // 5) 첫소리+끝소리 동시 일치(샌드위치) — 가장 헷갈림
  if (
    firstSoundKey(an) &&
    firstSoundKey(an) === firstSoundKey(bn) &&
    lastSoundKey(an) === lastSoundKey(bn)
  ) {
    reasons.push({ label: '첫소리·끝소리가 모두 같음', weight: 10 })
  }

  const score = clamp(
    Math.round(reasons.reduce((s, r) => s + r.weight, 0)),
    0,
    100,
  )
  return { a, b, score, reasons }
}

// 개선 제안 생성(룰 기반, 완전 로컬)
function suggestFix(c: Clash): string[] {
  const tips: string[] = []
  const set = new Set(c.reasons.map((r) => r.label))
  const has = (kw: string) => [...set].some((l) => l.includes(kw))
  if (has('첫소리') || has('첫 글자')) {
    tips.push(`두 이름의 첫소리가 겹칩니다. 한쪽의 첫 글자를 다른 자음(예: 모음 계열을 바꾸거나 ㄱ↔ㅂ↔ㅈ 등)으로 교체해 보세요.`)
  }
  if (has('끝남')) {
    tips.push('같은 음으로 끝나 운율이 겹칩니다. 한쪽 이름의 마지막 음절(받침/모음)을 바꿔 끝소리를 다르게 하세요.')
  }
  if (has('발음이')) {
    tips.push('전체 발음이 닮았습니다. 음절 수를 다르게 하거나(2글자↔3글자), 가운데 음절을 또렷이 다른 모음으로 바꾸면 구분이 쉬워집니다.')
  }
  if (has('글자 수가 같음')) {
    tips.push('글자 수까지 같아 시각적으로도 헷갈립니다. 한쪽의 길이를 1글자 늘리거나 줄여 실루엣을 다르게 하세요.')
  }
  if (!tips.length) {
    tips.push('전반적으로 닮은 인상입니다. 한 이름의 첫소리나 글자 수를 바꿔 대비를 키워 보세요.')
  }
  return tips
}

const sevColor = (score: number) =>
  score >= 75 ? 'var(--warn)' : score >= 55 ? '#e8a33d' : 'var(--ok)'
const sevLabel = (score: number) =>
  score >= 75 ? '높음' : score >= 55 ? '주의' : '낮음'

// ───────────────────────── 컴포넌트 ─────────────────────────
export default function NameSoundClash({
  payload,
}: {
  payload?: Record<string, unknown>
}) {
  const init = useRef<Persist>(load())
  const [names, setNames] = useState<NameRec[]>(init.current.names)
  const [threshold, setThreshold] = useState<number>(init.current.threshold)
  const [draft, setDraft] = useState('')
  const [draftRole, setDraftRole] = useState('')
  const [bulk, setBulk] = useState('')
  const [showBulk, setShowBulk] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [editVal, setEditVal] = useState('')
  const [editRole, setEditRole] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [linkMsg, setLinkMsg] = useState('')
  const [copied, setCopied] = useState(false)

  const alive = useRef(true)
  const linkTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const sharedChars = useLibraryList('characters')

  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
      if (linkTimer.current) clearTimeout(linkTimer.current)
      if (copyTimer.current) clearTimeout(copyTimer.current)
    }
  }, [])

  // 영속 저장
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ names, threshold }))
    } catch {
      /* 용량초과 등 무시 */
    }
  }, [names, threshold])

  // payload 로 이름이 넘어오면(연계로 열림) 한 번 받아들임
  const payloadDone = useRef(false)
  useEffect(() => {
    if (payloadDone.current || !payload) return
    payloadDone.current = true
    const incoming: string[] = []
    if (typeof payload.name === 'string') incoming.push(payload.name)
    if (Array.isArray(payload.names)) {
      for (const n of payload.names) if (typeof n === 'string') incoming.push(n)
    }
    if (incoming.length) {
      setNames((prev) => {
        const seen = new Set(prev.map((p) => p.name.trim()))
        const add = incoming
          .map((s) => s.trim())
          .filter((s) => s && !seen.has(s))
          .map((s) => ({ id: uid(), name: s, role: '' }))
        return add.length ? [...prev, ...add] : prev
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const flash = (msg: string) => {
    setLinkMsg(msg)
    if (linkTimer.current) clearTimeout(linkTimer.current)
    linkTimer.current = setTimeout(() => {
      if (alive.current) setLinkMsg('')
    }, 1900)
  }

  // ── CRUD ──
  const addName = () => {
    const v = draft.trim()
    if (!v) return
    if (names.some((n) => n.name.trim() === v)) {
      flash('이미 있는 이름이에요.')
      setDraft('')
      return
    }
    setNames((p) => [...p, { id: uid(), name: v, role: draftRole.trim() }])
    setDraft('')
    setDraftRole('')
  }
  const removeName = (id: string) => {
    setNames((p) => p.filter((n) => n.id !== id))
    if (editId === id) setEditId(null)
  }
  const startEdit = (n: NameRec) => {
    setEditId(n.id)
    setEditVal(n.name)
    setEditRole(n.role || '')
  }
  const commitEdit = () => {
    const v = editVal.trim()
    if (!v) return
    setNames((p) =>
      p.map((n) => (n.id === editId ? { ...n, name: v, role: editRole.trim() } : n)),
    )
    setEditId(null)
  }
  const clearAll = () => {
    if (!names.length) return
    setNames([])
    setEditId(null)
  }
  const importBulk = () => {
    const parts = bulk
      .split(/[\n,;\t·、，]+/)
      .map((s) => s.trim())
      .filter(Boolean)
    if (!parts.length) {
      flash('붙여넣은 이름이 없어요.')
      return
    }
    setNames((prev) => {
      const seen = new Set(prev.map((p) => p.name.trim()))
      const add: NameRec[] = []
      for (const p of parts) {
        if (!seen.has(p)) {
          seen.add(p)
          add.push({ id: uid(), name: p, role: '' })
        }
      }
      return [...prev, ...add]
    })
    setBulk('')
    setShowBulk(false)
    flash(`${parts.length}개 처리했어요.`)
  }
  const importFromLibrary = () => {
    if (!sharedChars.length) {
      flash('공유 인물 라이브러리가 비어 있어요.')
      return
    }
    setNames((prev) => {
      const seen = new Set(prev.map((p) => p.name.trim()))
      const add: NameRec[] = []
      for (const c of sharedChars) {
        const nm = (c.name || '').trim()
        if (nm && !seen.has(nm)) {
          seen.add(nm)
          add.push({ id: uid(), name: nm, role: c.role || '' })
        }
      }
      return add.length ? [...prev, ...add] : prev
    })
    flash('인물 라이브러리에서 가져왔어요.')
  }

  // ── 좌측 바인더 파일 드롭 수용(인물 카드/문서 제목을 이름으로) ──
  const onDrop = (e: React.DragEvent) => {
    setDragOver(false)
    const item = getDragItem(e)
    if (!item) return
    e.preventDefault()
    const nm = (item.character?.name || item.title || '').trim()
    if (!nm) return
    setNames((prev) => {
      if (prev.some((p) => p.name.trim() === nm)) return prev
      return [...prev, { id: uid(), name: nm, role: item.character?.role || item.type || '' }]
    })
    flash('파일에서 이름을 가져왔어요.')
  }
  const onDragOver = (e: React.DragEvent) => {
    if (isItemDrag(e)) {
      e.preventDefault()
      setDragOver(true)
    }
  }

  // ── 분석(메모이즈) ──
  const valid = useMemo(() => names.filter((n) => n.name.trim().length > 0), [names])

  const clashes = useMemo(() => {
    const out: Clash[] = []
    for (let i = 0; i < valid.length; i++) {
      for (let j = i + 1; j < valid.length; j++) {
        const c = compare(valid[i], valid[j])
        if (c.score > 0) out.push(c)
      }
    }
    out.sort((a, b) => b.score - a.score)
    return out
  }, [valid])

  const flagged = useMemo(
    () => clashes.filter((c) => c.score >= threshold),
    [clashes, threshold],
  )

  // 이름별 최대 충돌 점수(목록 표시용)
  const riskByName = useMemo(() => {
    const m = new Map<string, number>()
    for (const c of clashes) {
      m.set(c.a.id, Math.max(m.get(c.a.id) || 0, c.score))
      m.set(c.b.id, Math.max(m.get(c.b.id) || 0, c.score))
    }
    return m
  }, [clashes])

  // 전체 건강도 점수(높을수록 안전): 최악 충돌 위주로 감점
  const overall = useMemo(() => {
    if (valid.length < 2) return 100
    const worst = clashes.length ? clashes[0].score : 0
    const avgFlag = flagged.length
      ? flagged.reduce((s, c) => s + c.score, 0) / flagged.length
      : 0
    const penalty = worst * 0.6 + avgFlag * 0.4 + flagged.length * 2
    return clamp(Math.round(100 - penalty), 0, 100)
  }, [valid.length, clashes, flagged])

  // ── 결과 텍스트(복사/프로젝트용) ──
  const reportText = useMemo(() => {
    const lines: string[] = []
    lines.push(`이름 어감 충돌 검사 결과`)
    lines.push(`인물 ${valid.length}명 · 전체 안전도 ${overall}/100 · 경고 쌍 ${flagged.length}개 (기준 ${threshold}점)`)
    lines.push('')
    if (!flagged.length) {
      lines.push('기준 이상의 충돌 쌍이 없습니다. 👍')
    } else {
      flagged.forEach((c, i) => {
        lines.push(
          `${i + 1}. "${c.a.name}" ↔ "${c.b.name}"  —  ${c.score}점 (위험 ${sevLabel(c.score)})`,
        )
        c.reasons.forEach((r) => lines.push(`   · ${r.label}`))
        suggestFix(c).forEach((t) => lines.push(`   → ${t}`))
        lines.push('')
      })
    }
    return lines.join('\n').trim()
  }, [valid.length, overall, flagged, threshold])

  const copyReport = async () => {
    try {
      await navigator.clipboard.writeText(reportText)
      if (!alive.current) return
      setCopied(true)
      if (copyTimer.current) clearTimeout(copyTimer.current)
      copyTimer.current = setTimeout(() => alive.current && setCopied(false), 1500)
    } catch {
      flash('복사에 실패했어요.')
    }
  }

  const sendToProject = () => {
    if (!valid.length) {
      flash('먼저 이름을 등록하세요.')
      return
    }
    const body =
      `<p><strong>이름 어감 충돌 검사</strong> — 인물 ${valid.length}명 · 안전도 ${overall}/100 · 경고 ${flagged.length}쌍 (기준 ${threshold}점)</p>` +
      (flagged.length
        ? flagged
            .map(
              (c) =>
                `<p><strong>${esc(c.a.name)} ↔ ${esc(c.b.name)}</strong> — ${c.score}점 (위험 ${sevLabel(c.score)})<br>` +
                c.reasons.map((r) => `· ${esc(r.label)}`).join('<br>') +
                '<br>' +
                suggestFix(c)
                  .map((t) => `→ ${esc(t)}`)
                  .join('<br>') +
                '</p>',
            )
            .join('')
        : '<p>기준 이상의 충돌 쌍이 없습니다.</p>') +
      '<p style="font-size:12px;color:#888">발음 분석은 한글 자모 분해 기반의 자동 근사 판정입니다. 작명 참고용으로만 사용하세요.</p>'
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '작명',
      title: '이름 어감 충돌 검사',
      bodyHtml: body,
      meta: { 인물수: String(valid.length), 안전도: `${overall}/100`, 경고쌍: String(flagged.length) },
    })
    flash(id ? '프로젝트에 추가했어요.' : '프로젝트가 연결되지 않았어요.')
  }

  // ── 스타일 헬퍼 ──
  const inputStyle: React.CSSProperties = {
    padding: '8px 10px',
    borderRadius: 8,
    border: '1px solid var(--border)',
    background: 'var(--panel)',
    color: 'var(--text)',
    fontSize: 13,
    outline: 'none',
  }
  const card: React.CSSProperties = {
    background: 'var(--paper)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    padding: '10px 12px',
  }

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        color: 'var(--text)',
      }}
      onDragOver={onDragOver}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
    >
      <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
        등장인물 이름을 등록하면 서로 너무 비슷해(첫소리·길이·발음·끝소리) 독자가 헷갈릴 위험을 점수로 알려줍니다.
        좌측 파일(인물 카드)을 끌어다 놓아도 추가됩니다.
      </div>

      {/* 입력 줄 */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addName()}
          placeholder="인물 이름 (예: 하준)"
          style={{ ...inputStyle, flex: '2 1 130px' }}
        />
        <input
          value={draftRole}
          onChange={(e) => setDraftRole(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addName()}
          placeholder="메모(선택: 역할 등)"
          style={{ ...inputStyle, flex: '1 1 110px' }}
        />
        <button className="btn-primary" onClick={addName}>
          ＋ 추가
        </button>
        <button className="minibtn" onClick={() => setShowBulk((s) => !s)}>
          <Emoji e="📋" /> 붙여넣기
        </button>
        <button
          className="minibtn"
          onClick={importFromLibrary}
          title="공유 인물 라이브러리의 이름들을 가져옵니다"
        >
          <Emoji e="👥" /> 라이브러리
        </button>
      </div>

      {showBulk && (
        <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>
            한 줄에 하나, 또는 쉼표·세미콜론으로 구분해 여러 이름을 붙여넣으세요.
          </div>
          <textarea
            value={bulk}
            onChange={(e) => setBulk(e.target.value)}
            placeholder={'하준\n서연, 지호\n도윤; 하윤'}
            style={{ ...inputStyle, minHeight: 78, resize: 'vertical', fontFamily: 'inherit' }}
          />
          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
            <button className="minibtn" onClick={() => setShowBulk(false)}>
              닫기
            </button>
            <button className="btn-primary" onClick={importBulk}>
              가져오기
            </button>
          </div>
        </div>
      )}

      {/* 요약 바 */}
      {valid.length >= 2 && (
        <div
          style={{
            ...card,
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span
              style={{
                fontSize: 24,
                fontWeight: 700,
                color: overall >= 70 ? 'var(--ok)' : overall >= 45 ? '#e8a33d' : 'var(--warn)',
              }}
            >
              {overall}
            </span>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>/100 안전도</span>
          </div>
          <div style={{ flex: 1, minWidth: 120 }}>
            <div
              style={{
                height: 8,
                borderRadius: 5,
                background: 'var(--chrome-2)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${overall}%`,
                  height: '100%',
                  background:
                    overall >= 70 ? 'var(--ok)' : overall >= 45 ? '#e8a33d' : 'var(--warn)',
                  borderRadius: 5,
                  transition: 'width .25s',
                }}
              />
            </div>
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>
            경고 <strong style={{ color: 'var(--text)' }}>{flagged.length}</strong>쌍
          </div>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              color: 'var(--muted)',
            }}
            title="이 점수 이상인 쌍만 경고로 표시"
          >
            기준 {threshold}점
            <input
              type="range"
              min={20}
              max={90}
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              style={{ width: 90 }}
            />
          </label>
        </div>
      )}

      {/* 본문 2단: 이름 목록 / 충돌 결과 */}
      <div style={{ flex: 1, display: 'flex', gap: 10, minHeight: 0 }}>
        {/* 이름 목록 */}
        <div
          style={{
            flex: '0 0 38%',
            display: 'flex',
            flexDirection: 'column',
            border: dragOver ? '2px dashed var(--accent)' : '1px solid var(--border)',
            borderRadius: 10,
            background: dragOver ? 'color-mix(in srgb, var(--accent) 8%, var(--panel))' : 'var(--panel)',
            overflow: 'hidden',
            minHeight: 0,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '7px 10px',
              borderBottom: '1px solid var(--border)',
              fontSize: 12,
              color: 'var(--muted)',
            }}
          >
            <span>인물 {valid.length}명</span>
            {names.length > 0 && (
              <button
                className="minibtn"
                onClick={clearAll}
                style={{ padding: '2px 8px', fontSize: 11 }}
              >
                전체 삭제
              </button>
            )}
          </div>
          <div style={{ flex: 1, overflow: 'auto', padding: 6 }}>
            {names.length === 0 ? (
              <div
                style={{
                  color: 'var(--muted)',
                  fontSize: 12,
                  padding: 14,
                  textAlign: 'center',
                  lineHeight: 1.6,
                }}
              >
                아직 등록한 이름이 없어요.
                <br />위 칸에 이름을 입력하거나
                <br /><Emoji e="📋" /> 붙여넣기 / <Emoji e="👥" /> 라이브러리로 추가하세요.
              </div>
            ) : (
              names.map((n) => {
                const risk = riskByName.get(n.id) || 0
                const editing = editId === n.id
                return (
                  <div
                    key={n.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '5px 6px',
                      borderRadius: 7,
                      marginBottom: 3,
                      background: editing ? 'var(--chrome-2)' : 'transparent',
                    }}
                  >
                    {editing ? (
                      <>
                        <input
                          value={editVal}
                          autoFocus
                          onChange={(e) => setEditVal(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') commitEdit()
                            if (e.key === 'Escape') setEditId(null)
                          }}
                          style={{ ...inputStyle, flex: 1, padding: '4px 7px' }}
                        />
                        <button
                          className="minibtn"
                          onClick={commitEdit}
                          style={{ padding: '3px 7px' }}
                        >
                          ✓
                        </button>
                        <button
                          className="minibtn"
                          onClick={() => setEditId(null)}
                          style={{ padding: '3px 7px' }}
                        >
                          ✕
                        </button>
                      </>
                    ) : (
                      <>
                        <span
                          title={`충돌 위험 ${risk}점`}
                          style={{
                            width: 9,
                            height: 9,
                            borderRadius: '50%',
                            flex: '0 0 auto',
                            background: risk ? sevColor(risk) : 'var(--border)',
                          }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: 14,
                              fontWeight: 600,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {n.name}
                          </div>
                          {n.role && (
                            <div
                              style={{
                                fontSize: 11,
                                color: 'var(--muted)',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {n.role}
                            </div>
                          )}
                        </div>
                        <button
                          className="minibtn"
                          onClick={() => startEdit(n)}
                          title="수정"
                          style={{ padding: '3px 7px', fontSize: 11 }}
                        >
                          ✎
                        </button>
                        <button
                          className="minibtn"
                          onClick={() => removeName(n.id)}
                          title="삭제"
                          style={{ padding: '3px 7px', fontSize: 11 }}
                        >
                          <Emoji e="🗑" />
                        </button>
                      </>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* 충돌 결과 */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            border: '1px solid var(--border)',
            borderRadius: 10,
            background: 'var(--panel)',
            overflow: 'hidden',
            minHeight: 0,
          }}
        >
          <div
            style={{
              padding: '7px 10px',
              borderBottom: '1px solid var(--border)',
              fontSize: 12,
              color: 'var(--muted)',
            }}
          >
            충돌 쌍 {flagged.length}개 (기준 {threshold}점 이상)
          </div>
          <div style={{ flex: 1, overflow: 'auto', padding: 8 }}>
            {valid.length < 2 ? (
              <div
                style={{
                  color: 'var(--muted)',
                  fontSize: 13,
                  padding: 16,
                  textAlign: 'center',
                  lineHeight: 1.6,
                }}
              >
                이름을 2개 이상 등록하면
                <br />서로의 어감 충돌을 검사합니다.
              </div>
            ) : flagged.length === 0 ? (
              <div
                style={{
                  color: 'var(--ok)',
                  fontSize: 13,
                  padding: 16,
                  textAlign: 'center',
                  lineHeight: 1.7,
                }}
              >
                <Emoji e="👍" /> 기준({threshold}점) 이상의 충돌 쌍이 없어요.
                <br />
                <span style={{ color: 'var(--muted)', fontSize: 12 }}>
                  {clashes.length
                    ? `가장 비슷한 쌍은 "${clashes[0].a.name}↔${clashes[0].b.name}" (${clashes[0].score}점) 입니다.`
                    : '이름들이 충분히 구별됩니다.'}
                </span>
              </div>
            ) : (
              flagged.map((c) => (
                <div
                  key={c.a.id + '|' + c.b.id}
                  style={{
                    ...card,
                    marginBottom: 8,
                    borderLeft: `4px solid ${sevColor(c.score)}`,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8,
                      marginBottom: 6,
                    }}
                  >
                    <div style={{ fontSize: 14, fontWeight: 700 }}>
                      {c.a.name} <span style={{ color: 'var(--muted)' }}>↔</span> {c.b.name}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: 12,
                        fontWeight: 700,
                        color: sevColor(c.score),
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {c.score}점
                      <span
                        style={{
                          fontSize: 11,
                          padding: '1px 6px',
                          borderRadius: 6,
                          color: '#fff',
                          background: sevColor(c.score),
                        }}
                      >
                        {sevLabel(c.score)}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 6 }}>
                    {c.reasons.map((r, i) => (
                      <div
                        key={i}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          fontSize: 12,
                        }}
                      >
                        <span
                          style={{
                            flex: '0 0 auto',
                            width: 64,
                            height: 5,
                            borderRadius: 3,
                            background: 'var(--chrome-2)',
                            overflow: 'hidden',
                          }}
                        >
                          <span
                            style={{
                              display: 'block',
                              height: '100%',
                              width: `${clamp(Math.round((r.weight / 46) * 100), 8, 100)}%`,
                              background: sevColor(c.score),
                            }}
                          />
                        </span>
                        <span>{r.label}</span>
                      </div>
                    ))}
                  </div>
                  <div
                    style={{
                      borderTop: '1px dashed var(--border)',
                      paddingTop: 6,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 3,
                    }}
                  >
                    {suggestFix(c).map((t, i) => (
                      <div
                        key={i}
                        style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}
                      >
                        <Emoji e="💡" /> {t}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 연계 + 내보내기 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div className="linkbar">
          <span className="linkbar-label">연계</span>
          <button
            className="linkbtn"
            onClick={sendToProject}
            disabled={!valid.length || !hasProjectBridge()}
            title={
              hasProjectBridge()
                ? '검사 결과를 프로젝트(자료>작명)에 문서로 추가합니다'
                : '프로젝트에 연결되어 있지 않습니다'
            }
          >
            <Emoji e="📄" /> 프로젝트에 추가
          </button>
          <button className="linkbtn" onClick={copyReport} disabled={!valid.length}>
            {copied ? '복사됨 ✓' : '결과 복사'}
          </button>
          {linkMsg && <span style={{ fontSize: 11, color: 'var(--ok)' }}>{linkMsg}</span>}
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.5 }}>
          발음 유사도는 한글 자모(초·중·종성) 분해 기반 자동 근사 판정입니다. 표준 발음과 다를 수 있으니 작명 참고용으로만 쓰세요.
        </div>
      </div>
    </div>
  )
}
