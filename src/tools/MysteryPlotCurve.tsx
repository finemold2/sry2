// 미스터리 플롯 곡선 — 추리·미스터리 전용 진행곡선 비트 시트.
//  사건발생 → 수사착수 → 단서/용의자 → 막다른 골목 → 반전 단서 → 진상 → 해결 의 7비트(+공정한 단서 배치 가이드).
//  각 비트에 ① 내용 메모 ② 세부 카드(단서·용의자·복선) CRUD/순서/완료 체크.
//  '공정한 단서(fair-play)' 자가 점검 체크리스트 — 독자가 탐정과 같은 정보를 가졌는가.
//  진행률(작성/완료) 바, 권장 위치 환산(총 분량 입력 시), 전체 텍스트 복사/내보내기.
//  연계(linkbus): 7비트 전체를 자료(research)/'구조' 폴더에 한 편의 문서로 추가, 관련 도구 열기.
//  자급식 — react 와 './linkbus' 외 import 없음. 외부 API 없음. 모든 상태 localStorage 자동 저장/복원.
import { useEffect, useRef, useState } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji } from './linkbus'

export const meta = { id: 'mystery-plot-curve', name: '미스터리 플롯 곡선', icon: '🕵️', group: '플롯', genre: '미스터리·추리', intro: '사건발생→수사→단서→막다른 골목→반전→진상→해결의 비트 시트로 공정한 단서 배치를 설계하세요', w: 660, h: 660 }

const LS_KEY = 'sry:tool:mystery-plot-curve'

// ── 7비트 정의(고정): 라벨 / 진행곡선 설명 / 공정 단서 배치 가이드 / 권장 분량 구간(전체 %) ──
interface BeatDef {
  key: string
  title: string
  curve: string       // 진행곡선상의 역할(긴장도 흐름)
  desc: string        // 이 비트에서 해야 할 일
  fair: string        // 공정한 단서 배치 가이드(핵심)
  range: [number, number]
}

const BEATS: BeatDef[] = [
  {
    key: 'incident',
    title: '1. 사건 발생 (훅)',
    curve: '긴장 급상승 — 평온을 깨는 충격으로 독자를 붙든다.',
    desc: '시신·실종·도난·협박 등 중심 미스터리가 터진다. "무엇이/왜" 라는 질문을 명확히 세우고, 사건 현장의 인상적인 한 장면으로 독자를 끌어들인다.',
    fair: '진범과 진상에 필요한 핵심 단서 하나를 이 장면에 "보이지만 의미는 숨긴 채" 슬쩍 심어둔다(나중에 회수). 결정적 정보를 사후 날조하지 않기 위한 첫 약속.',
    range: [0, 8],
  },
  {
    key: 'investigation',
    title: '2. 수사 착수',
    curve: '긴장 안정·축적 — 탐정이 무대에 오르고 규칙이 선다.',
    desc: '탐정(주인공)이 사건에 발을 들인다. 동기·관할·이해관계를 세우고 수사의 방법·제약(시간·권한·신뢰)을 정한다. 독자와 탐정이 "같은 출발선"에 선다.',
    fair: '탐정이 접근 가능한 정보 = 독자가 보는 정보. 탐정만 아는 비밀 지식이나 독자에게 숨긴 전문 트릭이 없도록 무대를 투명하게 깐다.',
    range: [8, 20],
  },
  {
    key: 'clues',
    title: '3. 단서 / 용의자',
    curve: '긴장 점증 — 가능성이 늘며 미궁이 깊어진다.',
    desc: '용의자들이 소개되고 알리바이·동기·기회가 펼쳐진다. 진짜 단서와 레드 헤링(붉은 청어)을 섞어 배치한다. 각 용의자에게 "그럴듯한 이유"를 준다.',
    fair: '레드 헤링은 거짓이 아니라 "오해된 진실"이어야 한다. 모든 단서는 독자 눈앞에 제시하되, 진짜의 무게를 가짜와 같게 위장한다(공정한 오도).',
    range: [20, 45],
  },
  {
    key: 'deadend',
    title: '4. 막다른 골목 (중간 위기)',
    curve: '긴장 급락 후 재상승 — 유력 가설이 무너진다.',
    desc: '가장 유력했던 용의자·가설이 깨진다(완벽한 알리바이, 제2의 사건, 탐정의 오판). 사건이 더 복잡해지고 탐정·독자 모두 길을 잃는다. 위기·압박이 인다.',
    fair: '가설을 무너뜨리는 근거 역시 앞서 제시된 단서에서 나와야 한다. "갑자기 등장한 새 사실"로 뒤엎지 말 것 — 좌절도 복선 위에서.',
    range: [45, 62],
  },
  {
    key: 'twist',
    title: '5. 반전 단서 (재구성)',
    curve: '긴장 재점화 — 흩어진 조각이 한 방향을 가리킨다.',
    desc: '간과했던 사소한 단서·증언의 어긋남·시점의 재해석이 결정적 열쇠가 된다. 탐정이 사건을 다시 짜맞추기 시작한다. "아하!"의 직전 — 독자도 함께 추리하도록.',
    fair: '여기서 쓰는 모든 결정적 단서는 1~4비트에 이미 등장했어야 한다. 새 정보 0개 원칙. 독자가 뒤늦게 "거기 있었네!" 하고 무릎을 칠 수 있게.',
    range: [62, 78],
  },
  {
    key: 'reveal',
    title: '6. 진상 (해결의 장)',
    curve: '긴장 정점 — 진범·수법·동기가 드러난다.',
    desc: '범인이 누구인지, 어떻게(수법), 왜(동기) 했는지 논리적으로 공개한다. 탐정의 추리 사슬을 단계별로 보여 주고, 흩어진 단서가 한 그림으로 수렴함을 증명한다.',
    fair: '진범은 이미 등장한 인물 중에서, 동기·기회·수단이 단서로 뒷받침되어야 한다. 초자연·우연·미공개 쌍둥이 같은 "반칙"으로 풀지 않는다(녹스의 십계/공정의 원칙).',
    range: [78, 92],
  },
  {
    key: 'resolution',
    title: '7. 해결 (여운)',
    curve: '긴장 이완 — 질서 회복과 감정의 정산.',
    desc: '사건의 후일담, 관계 변화, 탐정·인물의 내적 변화를 마무리한다. 남은 의문을 정리하되, 여운(주제·다음 사건의 씨앗)을 남길 수 있다.',
    fair: '풀리지 않은 단서가 남았다면 의도된 떡밥인지 점검한다. 독자에게 "속았지만 공정했다"는 만족(되짚으면 다 보였다)을 주는 것이 마지막 약속.',
    range: [92, 100],
  },
]

// ── 공정한 단서(fair-play) 자가 점검 체크리스트(고정) ─────────────────────────
const FAIR_RULES: { key: string; text: string }[] = [
  { key: 'f1', text: '진범은 이야기 초·중반에 이미 등장한 인물이다(막판 난입 금지).' },
  { key: 'f2', text: '진상에 필요한 모든 핵심 단서가 폭로 이전에 독자에게 제시되었다.' },
  { key: 'f3', text: '탐정이 아는 정보와 독자가 보는 정보가 일치한다(숨긴 비밀 지식 없음).' },
  { key: 'f4', text: '범행 수법이 초자연·미지의 독·미공개 기계 같은 반칙에 기대지 않는다.' },
  { key: 'f5', text: '레드 헤링은 거짓이 아니라 "오해할 만한 진실"로 정당하게 오도한다.' },
  { key: 'f6', text: '범인의 동기·기회·수단이 단서로 각각 뒷받침된다.' },
  { key: 'f7', text: '우연·자백·외부 개입이 아니라 추리로 사건이 풀린다.' },
  { key: 'f8', text: '되짚어 읽으면 모든 결정적 복선이 보인다(사후 날조 없음).' },
]

// ── 데이터 타입 ──────────────────────────────────────────────────────────────
type CardKind = 'clue' | 'suspect' | 'redherring' | 'note'
interface Card { id: string; kind: CardKind; text: string }
interface BeatState { text: string; done: boolean; cards: Card[] }
interface Store {
  title: string
  unit: 'page' | 'won' | 'chapter'
  total: string
  beats: Record<string, BeatState>
  fair: Record<string, boolean>
}

const UNIT_LABEL: Record<Store['unit'], string> = { page: '페이지', won: '원고지(매)', chapter: '챕터' }
const UNIT_SHORT: Record<Store['unit'], string> = { page: 'p', won: '매', chapter: '장' }

const CARD_KINDS: { key: CardKind; label: string; icon: string; color: string }[] = [
  { key: 'clue', label: '단서', icon: '🔍', color: 'var(--accent)' },
  { key: 'suspect', label: '용의자', icon: '🕴️', color: '#e0a96a' },
  { key: 'redherring', label: '붉은 청어', icon: '🐟', color: '#e06c9f' },
  { key: 'note', label: '메모', icon: '📝', color: 'var(--muted)' },
]
const kindMeta = (k: CardKind) => CARD_KINDS.find((c) => c.key === k) || CARD_KINDS[3]

function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch { /* noop */ }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function emptyBeat(): BeatState { return { text: '', done: false, cards: [] } }

function defaultStore(): Store {
  const beats: Record<string, BeatState> = {}
  for (const b of BEATS) beats[b.key] = emptyBeat()
  const fair: Record<string, boolean> = {}
  for (const r of FAIR_RULES) fair[r.key] = false
  return { title: '', unit: 'page', total: '', beats, fair }
}

// localStorage 로드 — 미지원/손상/구버전 시 기본값으로 graceful 처리.
function loadStore(): Store {
  const base = defaultStore()
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return base
    const p = JSON.parse(raw)
    if (!p || typeof p !== 'object') return base
    const s: Store = {
      title: typeof p.title === 'string' ? p.title : '',
      unit: p.unit === 'won' || p.unit === 'chapter' ? p.unit : 'page',
      total: typeof p.total === 'string' ? p.total : (typeof p.total === 'number' ? String(p.total) : ''),
      beats: base.beats,
      fair: base.fair,
    }
    const pb = p.beats && typeof p.beats === 'object' ? p.beats : {}
    for (const b of BEATS) {
      const v = pb[b.key]
      if (v && typeof v === 'object') {
        const cards: Card[] = Array.isArray(v.cards)
          ? v.cards.filter((c: any) => c && typeof c.text === 'string').map((c: any) => ({
              id: String(c.id || newId()),
              kind: (['clue', 'suspect', 'redherring', 'note'] as CardKind[]).includes(c.kind) ? c.kind : 'note',
              text: String(c.text),
            }))
          : []
        s.beats[b.key] = { text: typeof v.text === 'string' ? v.text : '', done: !!v.done, cards }
      }
    }
    const pf = p.fair && typeof p.fair === 'object' ? p.fair : {}
    for (const r of FAIR_RULES) s.fair[r.key] = !!pf[r.key]
    return s
  } catch {
    return base
  }
}

const escHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export default function MysteryPlotCurve() {
  const [store, setStore] = useState<Store>(() => loadStore())
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const [showFair, setShowFair] = useState(true)
  const [cardDraft, setCardDraft] = useState<Record<string, string>>({})
  const [cardKindDraft, setCardKindDraft] = useState<Record<string, CardKind>>({})
  const [editCard, setEditCard] = useState<{ beat: string; id: string } | null>(null)
  const [editText, setEditText] = useState('')
  const [note, setNote] = useState('')
  const [copied, setCopied] = useState('')
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  // 변경 시 자동 저장 — 차단/용량초과 시 안내만.
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(store))
    } catch {
      if (mounted.current) setNote('이 브라우저에서 저장이 막혀 있어 새로고침하면 내용이 사라질 수 있어요.')
    }
  }, [store])

  // 복사 피드백 타이머 정리(언마운트/재설정)
  useEffect(() => {
    if (!copied) return
    const t = window.setTimeout(() => { if (mounted.current) setCopied('') }, 1600)
    return () => window.clearTimeout(t)
  }, [copied])

  // ── 비트 수정 헬퍼 ──────────────────────────────────────────────────────────
  const patchBeat = (key: string, patch: Partial<BeatState>) =>
    setStore((s) => ({ ...s, beats: { ...s.beats, [key]: { ...s.beats[key], ...patch } } }))

  const setBeatText = (key: string, text: string) => patchBeat(key, { text })
  const toggleDone = (key: string) => setStore((s) => ({ ...s, beats: { ...s.beats, [key]: { ...s.beats[key], done: !s.beats[key].done } } }))
  const toggleOpen = (key: string) => setOpen((o) => ({ ...o, [key]: !o[key] }))
  const toggleFair = (k: string) => setStore((s) => ({ ...s, fair: { ...s.fair, [k]: !s.fair[k] } }))

  // ── 카드 CRUD ───────────────────────────────────────────────────────────────
  const addCard = (key: string) => {
    const t = (cardDraft[key] || '').trim()
    if (!t) return
    const kind = cardKindDraft[key] || 'clue'
    patchBeat(key, { cards: [...store.beats[key].cards, { id: newId(), kind, text: t }] })
    setCardDraft((d) => ({ ...d, [key]: '' }))
  }
  const removeCard = (key: string, id: string) =>
    patchBeat(key, { cards: store.beats[key].cards.filter((c) => c.id !== id) })
  const cycleKind = (key: string, id: string) => {
    const arr = store.beats[key].cards.map((c) => {
      if (c.id !== id) return c
      const idx = CARD_KINDS.findIndex((k) => k.key === c.kind)
      return { ...c, kind: CARD_KINDS[(idx + 1) % CARD_KINDS.length].key }
    })
    patchBeat(key, { cards: arr })
  }
  const moveCard = (key: string, id: string, dir: -1 | 1) => {
    const arr = [...store.beats[key].cards]
    const i = arr.findIndex((c) => c.id === id)
    const j = i + dir
    if (i < 0 || j < 0 || j >= arr.length) return
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
    patchBeat(key, { cards: arr })
  }
  const startEdit = (key: string, c: Card) => { setEditCard({ beat: key, id: c.id }); setEditText(c.text) }
  const saveEdit = () => {
    if (!editCard) return
    const t = editText.trim()
    const { beat, id } = editCard
    if (!t) { removeCard(beat, id); setEditCard(null); return }
    patchBeat(beat, { cards: store.beats[beat].cards.map((c) => (c.id === id ? { ...c, text: t } : c)) })
    setEditCard(null)
  }
  const cancelEdit = () => setEditCard(null)

  // ── 메타 입력 ──────────────────────────────────────────────────────────────
  const setMeta = (patch: Partial<Pick<Store, 'title' | 'unit' | 'total'>>) =>
    setStore((s) => ({ ...s, ...patch }))

  // ── 권장 위치 환산 ──────────────────────────────────────────────────────────
  const totalNum = (() => { const n = parseFloat(store.total); return isFinite(n) && n > 0 ? n : 0 })()
  const fmtRange = (r: [number, number]): string => {
    if (totalNum > 0) {
      const a = Math.max(1, Math.round((r[0] / 100) * totalNum)) || 1
      const b = Math.max(a, Math.round((r[1] / 100) * totalNum)) || a
      const u = UNIT_SHORT[store.unit]
      return `${a}~${b}${u} (${r[0]}~${r[1]}%)`
    }
    return `전체의 ${r[0]}~${r[1]}% 구간`
  }

  // ── 진행률 ──────────────────────────────────────────────────────────────────
  const doneCount = BEATS.filter((b) => store.beats[b.key].done).length
  const filledCount = BEATS.filter((b) => store.beats[b.key].text.trim() || store.beats[b.key].cards.length).length
  const pct = Math.round((doneCount / BEATS.length) * 100)
  const fairDone = FAIR_RULES.filter((r) => store.fair[r.key]).length
  const fairPct = Math.round((fairDone / FAIR_RULES.length) * 100)

  // 단서/용의자 집계(공정성 한눈에)
  const counts = (() => {
    let clue = 0, suspect = 0, herring = 0
    for (const b of BEATS) for (const c of store.beats[b.key].cards) {
      if (c.kind === 'clue') clue++
      else if (c.kind === 'suspect') suspect++
      else if (c.kind === 'redherring') herring++
    }
    return { clue, suspect, herring }
  })()

  // ── 복사/내보내기 ──────────────────────────────────────────────────────────
  const buildText = (): string => {
    const lines: string[] = []
    lines.push(`# 미스터리 플롯 곡선${store.title ? ` — ${store.title}` : ''}`)
    if (totalNum > 0) lines.push(`총 분량: ${store.total} ${UNIT_LABEL[store.unit]}`)
    lines.push(`진행률: ${doneCount}/${BEATS.length} 완료 (${pct}%) · 단서 ${counts.clue} · 용의자 ${counts.suspect} · 붉은 청어 ${counts.herring}`)
    lines.push('')
    for (const b of BEATS) {
      const st = store.beats[b.key]
      lines.push(`${st.done ? '[v]' : '[ ]'} ${b.title}  〈권장: ${fmtRange(b.range)}〉`)
      lines.push(`  · 곡선: ${b.curve}`)
      lines.push(`  · 공정한 단서: ${b.fair}`)
      if (st.text.trim()) lines.push(st.text.trim().split('\n').map((l) => '  ' + l).join('\n'))
      st.cards.forEach((c) => lines.push(`  - [${kindMeta(c.kind).label}] ${c.text}`))
      lines.push('')
    }
    lines.push(`## 공정한 단서 자가 점검 (${fairDone}/${FAIR_RULES.length}, ${fairPct}%)`)
    FAIR_RULES.forEach((r) => lines.push(`${store.fair[r.key] ? '[v]' : '[ ]'} ${r.text}`))
    return lines.join('\n').trimEnd() + '\n'
  }

  const flash = (msg: string) => setCopied(msg)

  const copyAll = async () => {
    const text = buildText()
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(text); flash('전체 시트를 복사했어요'); return }
      throw new Error('no clipboard')
    } catch {
      try {
        const ta = document.createElement('textarea')
        ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
        document.body.appendChild(ta); ta.focus(); ta.select()
        document.execCommand('copy'); document.body.removeChild(ta)
        flash('전체 시트를 복사했어요')
      } catch { setNote('복사가 지원되지 않는 환경이에요. 텍스트를 직접 선택해 복사해 주세요.') }
    }
  }

  const exportFile = () => {
    try {
      const blob = new Blob([buildText()], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = (store.title ? store.title.replace(/[\\/:*?"<>|]/g, '_') : 'mystery-plot') + '-curve.txt'
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      flash('파일로 내보냈어요')
    } catch { setNote('내보내기가 지원되지 않는 환경이에요.') }
  }

  // ── 프로젝트 연동: 7비트 + 공정 점검을 한 문서로 ──────────────────────────────
  const toBodyHtml = (): string => {
    const parts: string[] = []
    parts.push(`<p><em>진행률 ${doneCount}/${BEATS.length} (${pct}%) · 단서 ${counts.clue} · 용의자 ${counts.suspect} · 붉은 청어 ${counts.herring}</em></p>`)
    for (const b of BEATS) {
      const st = store.beats[b.key]
      parts.push(`<h3>${escHtml(b.title)}</h3>`)
      parts.push(`<p><em>권장: ${escHtml(fmtRange(b.range))} · 곡선: ${escHtml(b.curve)}</em></p>`)
      parts.push(`<p><strong>공정한 단서:</strong> ${escHtml(b.fair)}</p>`)
      const txt = st.text.trim()
      if (txt) for (const ln of txt.split('\n')) parts.push(`<p>${escHtml(ln) || '&nbsp;'}</p>`)
      else parts.push('<p>&nbsp;</p>')
      st.cards.forEach((c) => parts.push(`<p>- [${escHtml(kindMeta(c.kind).label)}] ${escHtml(c.text)}</p>`))
    }
    parts.push(`<h3>공정한 단서 자가 점검 (${fairDone}/${FAIR_RULES.length}, ${fairPct}%)</h3>`)
    FAIR_RULES.forEach((r) => parts.push(`<p>${store.fair[r.key] ? '☑' : '☐'} ${escHtml(r.text)}</p>`))
    return parts.join('')
  }
  const toProject = () => {
    if (!hasProjectBridge()) { flash('project:unlinked'); return }
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '구조',
      title: `미스터리 플롯 곡선${store.title ? ` — ${store.title}` : ''}`,
      bodyHtml: toBodyHtml(),
      synopsis: '사건발생→수사→단서→막다른 골목→반전→진상→해결 (공정한 단서 배치)',
      meta: {
        작품: store.title || '(제목 없음)',
        진행률: `${doneCount}/${BEATS.length} (${pct}%)`,
        공정점검: `${fairDone}/${FAIR_RULES.length} (${fairPct}%)`,
        단서: String(counts.clue),
        용의자: String(counts.suspect),
        붉은청어: String(counts.herring),
        ...(totalNum > 0 ? { 총분량: `${store.total} ${UNIT_LABEL[store.unit]}` } : {}),
      },
    })
    flash(id ? '프로젝트 자료(구조)에 플롯 곡선 문서를 추가했어요' : 'project:fail')
  }

  // 단서/용의자 카드를 글감(스니펫)으로 라이브러리에 저장
  const saveCluesToLibrary = () => {
    let n = 0
    for (const b of BEATS) for (const c of store.beats[b.key].cards) {
      if (c.kind === 'clue' || c.kind === 'suspect' || c.kind === 'redherring') {
        addToLibrary('snippets', { text: `[${kindMeta(c.kind).label}] ${c.text}`, source: '미스터리 플롯 곡선', tags: ['미스터리', kindMeta(c.kind).label] })
        n++
      }
    }
    flash(n ? `단서·용의자 ${n}개를 글감으로 저장했어요` : '저장할 단서·용의자 카드가 없어요')
  }

  // 전체 초기화(확인 후)
  const resetAll = () => {
    if (!window.confirm('모든 비트 내용·카드·공정 점검을 지웁니다. 정말 초기화할까요?')) return
    setStore(defaultStore())
    setOpen({}); setCardDraft({}); setCardKindDraft({}); setEditCard(null)
    flash('모두 초기화했어요')
  }

  // ── 스타일 ──────────────────────────────────────────────────────────────────
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', minHeight: 0 }
  const head: React.CSSProperties = { padding: '12px 14px 10px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 10, background: 'var(--chrome-2)' }
  const metaRow: React.CSSProperties = { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }
  const input: React.CSSProperties = { padding: '8px 10px', fontSize: 14, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box', minWidth: 0 }
  const select: React.CSSProperties = { ...input, padding: '8px 8px', cursor: 'pointer' }
  const barWrap: React.CSSProperties = { height: 10, borderRadius: 6, background: 'var(--paper)', border: '1px solid var(--border)', overflow: 'hidden' }
  const barFill = (p: number, col: string): React.CSSProperties => ({ height: '100%', width: `${p}%`, background: col, transition: 'width .25s ease' })
  const statRow: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, fontSize: 12.5, color: 'var(--muted)', flexWrap: 'wrap' }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }
  const card = (done: boolean): React.CSSProperties => ({ border: '1px solid var(--border)', borderRadius: 12, background: 'var(--panel)', borderLeft: `4px solid ${done ? 'var(--ok)' : 'var(--accent)'}`, overflow: 'hidden' })
  const cHead: React.CSSProperties = { display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px' }
  const cTitle: React.CSSProperties = { fontSize: 14.5, fontWeight: 700, lineHeight: 1.35 }
  const rangeS: React.CSSProperties = { fontSize: 11.5, color: 'var(--accent)', marginTop: 3, fontWeight: 600 }
  const curveS: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.55, padding: '0 12px 4px', fontStyle: 'italic' }
  const descS: React.CSSProperties = { fontSize: 12.5, color: 'var(--text)', lineHeight: 1.6, padding: '0 12px 6px', whiteSpace: 'pre-wrap' }
  const fairS: React.CSSProperties = { fontSize: 12.5, lineHeight: 1.6, padding: '8px 10px', margin: '0 12px 8px', background: 'var(--paper)', border: '1px dashed var(--accent)', borderRadius: 9, color: 'var(--muted)' }
  const ta: React.CSSProperties = { width: '100%', minHeight: 60, resize: 'vertical', padding: '8px 10px', fontSize: 13.5, lineHeight: 1.5, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box', fontFamily: 'inherit' }
  const section: React.CSSProperties = { padding: '0 12px 12px', display: 'flex', flexDirection: 'column', gap: 8 }
  const subLabel: React.CSSProperties = { fontSize: 11.5, color: 'var(--muted)', fontWeight: 600 }
  const cardRow: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 8px' }
  const cardTxt: React.CSSProperties = { flex: 1, minWidth: 0, fontSize: 13, lineHeight: 1.45, wordBreak: 'break-word' }
  const iconBtn: React.CSSProperties = { flexShrink: 0, border: 'none', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', fontSize: 13, lineHeight: 1, padding: 3 }
  const addRow: React.CSSProperties = { display: 'flex', gap: 6, flexWrap: 'wrap' }
  const foot: React.CSSProperties = { borderTop: '1px solid var(--border)', padding: '10px 14px', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', background: 'var(--chrome-2)' }
  const chk: React.CSSProperties = { flexShrink: 0, width: 18, height: 18, marginTop: 1, cursor: 'pointer', accentColor: 'var(--ok)' }
  const emptyS: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', fontStyle: 'italic', padding: '2px 0' }
  const kindPill = (k: CardKind): React.CSSProperties => ({ flexShrink: 0, fontSize: 10.5, fontWeight: 700, color: kindMeta(k).color, border: `1px solid ${kindMeta(k).color}`, borderRadius: 999, padding: '1px 7px', cursor: 'pointer', background: 'transparent', whiteSpace: 'nowrap' })
  const fairBox: React.CSSProperties = { border: '1px solid var(--border)', borderRadius: 12, background: 'var(--panel)', borderLeft: '4px solid #6ab0e0', overflow: 'hidden' }
  const fairRow: React.CSSProperties = { display: 'flex', alignItems: 'flex-start', gap: 8, padding: '6px 12px', fontSize: 12.8, lineHeight: 1.5, cursor: 'pointer' }

  return (
    <div style={wrap}>
      <div style={head}>
        <div style={metaRow}>
          <input
            style={{ ...input, flex: '2 1 180px' }}
            value={store.title}
            onChange={(e) => setMeta({ title: e.target.value })}
            placeholder="작품/사건 제목 (선택)"
            maxLength={120}
            aria-label="작품 제목"
          />
          <input
            style={{ ...input, flex: '1 1 84px', width: 84 }}
            value={store.total}
            onChange={(e) => setMeta({ total: e.target.value.replace(/[^\d.]/g, '') })}
            placeholder="총 분량"
            inputMode="decimal"
            aria-label="총 분량"
          />
          <select style={select} value={store.unit} onChange={(e) => setMeta({ unit: e.target.value as Store['unit'] })} aria-label="분량 단위">
            <option value="page">페이지</option>
            <option value="won">원고지(매)</option>
            <option value="chapter">챕터</option>
          </select>
        </div>
        <div style={barWrap}><div style={barFill(pct, 'var(--ok)')} /></div>
        <div style={statRow}>
          <span>완료 <strong style={{ color: 'var(--ok)' }}>{doneCount}</strong> / {BEATS.length} · 작성된 비트 <strong style={{ color: 'var(--text)' }}>{filledCount}</strong> · <strong style={{ color: 'var(--accent)' }}>{pct}%</strong></span>
          <span><Emoji e="🔍"/> {counts.clue} · <Emoji e="🕴️"/> {counts.suspect} · <Emoji e="🐟"/> {counts.herring}</span>
        </div>
        <div style={statRow}>
          {totalNum > 0
            ? <span>총 {store.total} {UNIT_LABEL[store.unit]} 기준으로 권장 위치를 환산했어요</span>
            : <span>총 분량을 넣으면 각 비트의 권장 위치를 실제 분량으로 환산해요</span>}
          <span>공정 점검 <strong style={{ color: fairPct === 100 ? 'var(--ok)' : '#6ab0e0' }}>{fairDone}/{FAIR_RULES.length}</strong></span>
        </div>
        {note && <div style={{ fontSize: 12, color: 'var(--warn)', lineHeight: 1.5 }}>{note}</div>}
      </div>

      <div style={body}>
        {BEATS.map((b) => {
          const st = store.beats[b.key]
          const isOpen = !!open[b.key]
          const hasContent = !!(st.text.trim() || st.cards.length)
          return (
            <div key={b.key} style={card(st.done)}>
              <div style={cHead}>
                <input type="checkbox" style={chk} checked={st.done} onChange={() => toggleDone(b.key)} aria-label={`${b.title} 완료`} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={cTitle}>{b.title}{hasContent && !isOpen ? <span style={{ color: 'var(--muted)', fontWeight: 400 }}> · 작성됨({st.cards.length}장)</span> : ''}</div>
                  <div style={rangeS}>권장: {fmtRange(b.range)}</div>
                </div>
                <button className="minibtn" style={{ flexShrink: 0 }} onClick={() => toggleOpen(b.key)} aria-expanded={isOpen}>
                  {isOpen ? '접기 ▲' : '펼치기 ▼'}
                </button>
              </div>

              {isOpen && (
                <>
                  <div style={curveS}><Emoji e="📈"/> {b.curve}</div>
                  <div style={descS}>{b.desc}</div>
                  <div style={fairS}><strong style={{ color: 'var(--accent)' }}><Emoji e="⚖️"/> 공정한 단서 가이드 — </strong>{b.fair}</div>
                  <div style={section}>
                    <div style={subLabel}>이 비트에 무슨 일이 일어나나요?</div>
                    <textarea
                      style={ta}
                      value={st.text}
                      onChange={(e) => setBeatText(b.key, e.target.value)}
                      placeholder="장면·수사 진행·인물의 심리를 자유롭게 적어 보세요…"
                    />

                    <div style={subLabel}>단서·용의자·복선 카드 (유형 배지를 눌러 종류 변경)</div>
                    {st.cards.length === 0 ? (
                      <div style={emptyS}>아직 카드가 없어요. 아래에 한 줄씩 단서/용의자를 추가해 보세요.</div>
                    ) : (
                      st.cards.map((c, i) => {
                        const editing = editCard && editCard.beat === b.key && editCard.id === c.id
                        return (
                          <div key={c.id} style={cardRow}>
                            <button
                              style={kindPill(c.kind)}
                              onClick={() => cycleKind(b.key, c.id)}
                              title="클릭하여 유형 변경(단서→용의자→붉은 청어→메모)"
                            >
                              <Emoji e={kindMeta(c.kind).icon}/> {kindMeta(c.kind).label}
                            </button>
                            {editing ? (
                              <>
                                <input
                                  style={{ ...input, flex: 1, padding: '5px 8px', fontSize: 13 }}
                                  value={editText}
                                  autoFocus
                                  onChange={(e) => setEditText(e.target.value)}
                                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); saveEdit() } else if (e.key === 'Escape') cancelEdit() }}
                                  aria-label="카드 수정"
                                />
                                <button className="minibtn" style={{ flexShrink: 0 }} onClick={saveEdit}>저장</button>
                                <button className="minibtn" style={{ flexShrink: 0 }} onClick={cancelEdit}>취소</button>
                              </>
                            ) : (
                              <>
                                <span style={cardTxt} onDoubleClick={() => startEdit(b.key, c)} title="더블클릭하여 수정">{c.text}</span>
                                <button style={iconBtn} onClick={() => moveCard(b.key, c.id, -1)} disabled={i === 0} title="위로" aria-label="위로">▲</button>
                                <button style={iconBtn} onClick={() => moveCard(b.key, c.id, 1)} disabled={i === st.cards.length - 1} title="아래로" aria-label="아래로">▼</button>
                                <button style={iconBtn} onClick={() => startEdit(b.key, c)} title="수정" aria-label="수정"><Emoji e="✏️"/></button>
                                <button style={iconBtn} onClick={() => removeCard(b.key, c.id)} title="삭제" aria-label="삭제"><Emoji e="🗑️"/></button>
                              </>
                            )}
                          </div>
                        )
                      })
                    )}
                    <div style={addRow}>
                      <select
                        style={{ ...select, flex: '0 0 auto', padding: '6px 8px', fontSize: 13 }}
                        value={cardKindDraft[b.key] || 'clue'}
                        onChange={(e) => setCardKindDraft((d) => ({ ...d, [b.key]: e.target.value as CardKind }))}
                        aria-label="카드 유형"
                      >
                        {CARD_KINDS.map((k) => <option key={k.key} value={k.key}>{k.icon} {k.label}</option>)}
                      </select>
                      <input
                        style={{ ...input, flex: 1, minWidth: 120, padding: '6px 9px', fontSize: 13 }}
                        value={cardDraft[b.key] || ''}
                        onChange={(e) => setCardDraft((d) => ({ ...d, [b.key]: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCard(b.key) } }}
                        placeholder="단서/용의자 추가… (Enter)"
                        maxLength={300}
                        aria-label="카드 추가"
                      />
                      <button className="minibtn" onClick={() => addCard(b.key)} disabled={!(cardDraft[b.key] || '').trim()}>추가</button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )
        })}

        {/* 공정한 단서 자가 점검 */}
        <div style={fairBox}>
          <div style={cHead}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={cTitle}><Emoji e="⚖️"/> 공정한 단서(fair-play) 자가 점검</div>
              <div style={{ ...rangeS, color: '#6ab0e0' }}>{fairDone}/{FAIR_RULES.length} 충족 · {fairPct}%</div>
            </div>
            <button className="minibtn" style={{ flexShrink: 0 }} onClick={() => setShowFair((v) => !v)} aria-expanded={showFair}>
              {showFair ? '접기 ▲' : '펼치기 ▼'}
            </button>
          </div>
          {showFair && (
            <div style={{ padding: '0 12px 12px' }}>
              <div style={{ ...barWrap, marginBottom: 8 }}><div style={barFill(fairPct, '#6ab0e0')} /></div>
              {FAIR_RULES.map((r) => (
                <label key={r.key} style={fairRow}>
                  <input type="checkbox" style={chk} checked={!!store.fair[r.key]} onChange={() => toggleFair(r.key)} />
                  <span style={{ color: store.fair[r.key] ? 'var(--muted)' : 'var(--text)', textDecoration: store.fair[r.key] ? 'line-through' : 'none' }}>{r.text}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 연계 바 */}
      <div style={{ ...foot, paddingBottom: 0 }} className="linkbar">
        <span className="linkbar-label">연계:</span>
        <button
          className="linkbtn"
          onClick={toProject}
          disabled={!hasProjectBridge()}
          title={hasProjectBridge() ? '7비트 곡선 + 공정 점검을 프로젝트 자료(구조 폴더)에 문서로 추가' : '프로젝트에 연결되어 있지 않습니다'}
        >
          <Emoji e="📄"/> 프로젝트에 추가
        </button>
        <button className="linkbtn" onClick={saveCluesToLibrary} title="단서·용의자·붉은 청어 카드를 글감(스니펫)으로 저장"><Emoji e="⭐"/> 단서를 글감으로 저장</button>
        <button className="linkbtn" onClick={() => openToolLinked('plot-twist-deck', { genre: '미스터리·추리' })} title="반전 카드덱 열기"><Emoji e="🃏"/> 반전 카드덱</button>
        <button className="linkbtn" onClick={() => openToolLinked('scene-list', { genre: '미스터리·추리' })} title="장면 목록 열기"><Emoji e="🎬"/> 장면 목록</button>
        <button className="linkbtn" onClick={() => openToolLinked('genre-conventions', { genre: '미스터리·추리' })} title="장르 관습 체크리스트 열기"><Emoji e="📐"/> 장르 관습</button>
      </div>

      <div style={foot}>
        <button className="btn-primary" onClick={copyAll}><Emoji e="📋"/> 전체 복사</button>
        <button className="minibtn" onClick={exportFile}>⬇️ .txt 내보내기</button>
        <button className="minibtn" onClick={() => setOpen(Object.fromEntries(BEATS.map((b) => [b.key, true])))}>모두 펼치기</button>
        <button className="minibtn" onClick={() => setOpen({})}>모두 접기</button>
        <span style={{ flex: 1 }} />
        {copied && !copied.startsWith('project:') && <span style={{ fontSize: 12.5, color: 'var(--ok)', fontWeight: 600 }}>{copied}</span>}
        {copied === 'project:unlinked' && <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>프로젝트에 연결되어 있지 않습니다</span>}
        {copied === 'project:fail' && <span style={{ fontSize: 12.5, color: 'var(--warn)' }}>프로젝트 추가에 실패했어요</span>}
        <button className="minibtn" onClick={resetAll} style={{ color: 'var(--warn)' }}>전체 초기화</button>
      </div>
    </div>
  )
}
