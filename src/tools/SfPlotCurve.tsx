// SF 플롯/진행곡선 — SF·과학소설 전용 비트 시트.
//  발견(Discovery) → 경이(Wonder) → 갈등: 기술의 대가 → 위기 → 선택 → 여파 의 6비트(+센스 오브 원더 배치 가이드).
//  각 비트에 ① 진행곡선상의 역할 ② 이 비트에서 할 일 ③ "노붐(novum)/외삽" 설계 가이드.
//  각 비트마다 세부 카드(노붐·세계규칙·경이장면·대가·복선) CRUD/순서/완료 체크.
//  '센스 오브 원더 배치' 자가 점검 — 경이의 순간을 어디에·어떻게 심었는가.
//  진행률(작성/완료) 바, 권장 위치 환산(총 분량 입력 시), 전체 텍스트 복사/내보내기.
//  연계(linkbus): 6비트 전체를 자료(research)/'구조' 폴더에 한 편의 문서로 추가, 글감 저장, 관련 도구 열기.
//  자급식 — react 와 './linkbus' 외 import 없음. 외부 API 없음. 모든 상태 localStorage 자동 저장/복원.
import { useEffect, useRef, useState } from 'react'
import { addToProject, hasProjectBridge, addToLibrary, openToolLinked, Emoji } from './linkbus'

export const meta = { id: 'sf-plot-curve', name: 'SF 플롯/진행곡선', icon: '🚀', group: '플롯', genre: 'SF·과학소설', intro: '발견→경이→갈등(기술의 대가)→위기→선택→여파 비트 시트로 센스 오브 원더를 배치하세요', w: 660, h: 660 }

const LS_KEY = 'sry:tool:sf-plot-curve'

// ── 6비트 정의(고정): 라벨 / 진행곡선 역할 / 할 일 / 노붐(외삽) 설계 가이드 / 권장 분량 구간(전체 %) ──
interface BeatDef {
  key: string
  title: string
  curve: string       // 진행곡선상의 역할(경이·긴장 흐름)
  desc: string        // 이 비트에서 해야 할 일
  novum: string       // 노붐(novum)/외삽 설계 가이드(핵심)
  range: [number, number]
}

const BEATS: BeatDef[] = [
  {
    key: 'discovery',
    title: '1. 발견 (Discovery)',
    curve: '호기심 점화 — 평범한 세계에 "이상한 신호"가 들어온다.',
    desc: '낯선 기술·현상·존재·장소가 처음 모습을 드러낸다. 외계 신호, 미지의 유물, 새 발명, 깨어난 AI… 주인공의 일상에 균열을 내는 첫 단서를 명료한 한 장면으로 보여 준다. "이게 뭐지?"라는 질문을 세운다.',
    novum: '이야기의 중심 노붐(novum, 새로운 것 하나)을 정하고 그 첫 등장을 설계한다. 한꺼번에 다 설명하지 말 것 — 빙산의 일각만 보이고 규칙은 뒤로 미룬다(정보 공개의 인색함).',
    range: [0, 12],
  },
  {
    key: 'wonder',
    title: '2. 경이 (Sense of Wonder)',
    curve: '경이 급상승 — 스케일·가능성이 열리며 독자가 숨을 멈춘다.',
    desc: '발견의 정체와 규모가 드러나며 세계가 확장된다. 거대 구조물, 시간·공간의 도약, 외계 생태, 신기술의 첫 작동. 감각적 묘사와 스케일 대비로 "광활함/낯섦"을 체험시킨다. SF의 약속(premise)을 펼치는 구간.',
    novum: '노붐의 규칙·논리를 "보여 주며" 정립한다(설명문 X, 작동 장면 O). 외삽(extrapolation): 이 기술이 사회·신체·관계를 어떻게 바꾸는지 한두 가지 구체적 파급을 깐다. 경이의 정점 장면을 의도적으로 배치.',
    range: [12, 32],
  },
  {
    key: 'cost',
    title: '3. 갈등 — 기술의 대가 (The Price)',
    curve: '긴장 점증 — 경이의 이면, 숨은 비용이 드러난다.',
    desc: '신기술·신질서가 공짜가 아님이 밝혀진다. 부작용, 윤리적 함정, 권력의 독점, 인간성의 침식, 생태·사회의 균열. 경이에 매혹됐던 인물·독자가 "대가"를 마주한다. 외부 적대(세력)와 내부 딜레마가 함께 조여 온다.',
    novum: '노붐의 대가는 자의적이지 않고 그 규칙에서 논리적으로 따라 나와야 한다(설정의 일관성). "공짜 점심은 없다" — 1~2비트에서 누렸던 경이의 정확히 그 능력이 위협으로 되돌아오게 설계한다.',
    range: [32, 52],
  },
  {
    key: 'crisis',
    title: '4. 위기 (Crisis)',
    curve: '긴장 급등 — 대가가 폭발하고 통제가 무너진다.',
    desc: '갈등이 임계점을 넘는다. 기술의 폭주, 사회 붕괴, 시한, 추격, 돌이킬 수 없는 사고. 주인공의 기존 방법·가설이 한계에 부딪히고, 무엇을 잃을지가 선명해진다. 판돈(stakes)이 개인→집단→세계로 확장될 수 있다.',
    novum: '위기는 새 설정의 난입이 아니라 이미 깔린 노붐 규칙의 필연적 귀결이어야 한다. "갑툭튀 기계장치(데우스 엑스 마키나)"로 위기를 만들지 말 것 — 복선 위에서 터뜨린다.',
    range: [52, 72],
  },
  {
    key: 'choice',
    title: '5. 선택 (The Choice)',
    curve: '긴장 정점 — 가치가 충돌하는 결정의 순간.',
    desc: '주인공이 기술·인간성·세계를 두고 핵심 결정을 내린다. 쉬운 답이 없는 트레이드오프 — 무엇을 포기하고 무엇을 지킬 것인가. 외삽된 미래에 대한 작가의 "주장"이 인물의 선택으로 구현되는 자리(SF는 사고실험이다).',
    novum: '클라이맥스의 해법은 앞서 정립한 노붐 규칙 안에서, 단서로 뒷받침되어야 한다. 우연·외부 구원이 아니라 인물의 이해·의지·희생으로 푼다. 주제(이 기술이 인간에게 무엇인가)가 선택에 응축되게.',
    range: [72, 88],
  },
  {
    key: 'aftermath',
    title: '6. 여파 (Aftermath)',
    curve: '긴장 이완 — 바뀐 세계와 인물의 정산, 여운.',
    desc: '선택이 남긴 결과를 보여 준다. 세계는 어떻게 달라졌나, 인물은 무엇을 얻고 잃었나. 완전한 원상복구가 아니라 "변형된 새 균형". 마지막 이미지로 발견의 첫 장면과 대비를 만들어 변화를 증명한다.',
    novum: '외삽의 결론을 독자에게 남긴다 — 경고든 희망이든, 노붐이 세계에 남긴 흔적과 풀리지 않은 질문(다음 사건의 씨앗·주제적 여운)을 의도적으로 배치한다.',
    range: [88, 100],
  },
]

// ── 센스 오브 원더 배치 자가 점검(고정) ───────────────────────────────────────
const WONDER_RULES: { key: string; text: string }[] = [
  { key: 'w1', text: '중심 노붐(novum)이 하나로 또렷하다 — 여러 신설정이 초점을 흐리지 않는다.' },
  { key: 'w2', text: '경이의 정점 장면을 의도적으로 배치했다(2~3비트에 최소 하나).' },
  { key: 'w3', text: '경이를 설명문이 아니라 인물의 감각·반응으로 체험시킨다(showing).' },
  { key: 'w4', text: '스케일 대비(거대 vs 인간)나 낯섦으로 "광활함"을 만들어 냈다.' },
  { key: 'w5', text: '신기술·신질서에 분명한 대가/한계가 있어 공짜가 아니다.' },
  { key: 'w6', text: '노붐의 규칙이 일관되고, 위기·해법이 그 규칙에서 논리적으로 따라 나온다.' },
  { key: 'w7', text: '외삽이 있다 — 이 변화가 사회·신체·관계를 어떻게 바꾸는지 보여 준다.' },
  { key: 'w8', text: '정보를 조금씩 인색하게 풀어, 끝까지 미지의 매혹을 남긴다.' },
  { key: 'w9', text: '데우스 엑스 마키나 없이, 위기와 해결이 복선 위에서 정당하게 나온다.' },
  { key: 'w10', text: '주제(이 기술이 인간에게 무엇인가)가 선택의 순간에 응축된다.' },
]

// ── 데이터 타입 ──────────────────────────────────────────────────────────────
type CardKind = 'novum' | 'rule' | 'wonder' | 'price' | 'foreshadow' | 'note'
interface Card { id: string; kind: CardKind; text: string }
interface BeatState { text: string; done: boolean; cards: Card[] }
interface Store {
  title: string
  unit: 'page' | 'won' | 'chapter'
  total: string
  beats: Record<string, BeatState>
  wonder: Record<string, boolean>
}

const UNIT_LABEL: Record<Store['unit'], string> = { page: '페이지', won: '원고지(매)', chapter: '챕터' }
const UNIT_SHORT: Record<Store['unit'], string> = { page: 'p', won: '매', chapter: '장' }

const CARD_KINDS: { key: CardKind; label: string; icon: string; color: string }[] = [
  { key: 'novum', label: '노붐', icon: '🛸', color: 'var(--accent)' },
  { key: 'rule', label: '세계규칙', icon: '⚙️', color: '#6ab0e0' },
  { key: 'wonder', label: '경이장면', icon: '✨', color: '#e0a96a' },
  { key: 'price', label: '대가', icon: '⚠️', color: '#e06c9f' },
  { key: 'foreshadow', label: '복선', icon: '🔮', color: '#9b8cff' },
  { key: 'note', label: '메모', icon: '📝', color: 'var(--muted)' },
]
const CARD_KEYS = CARD_KINDS.map((c) => c.key)
const kindMeta = (k: CardKind) => CARD_KINDS.find((c) => c.key === k) || CARD_KINDS[5]

function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch { /* noop */ }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function emptyBeat(): BeatState { return { text: '', done: false, cards: [] } }

function defaultStore(): Store {
  const beats: Record<string, BeatState> = {}
  for (const b of BEATS) beats[b.key] = emptyBeat()
  const wonder: Record<string, boolean> = {}
  for (const r of WONDER_RULES) wonder[r.key] = false
  return { title: '', unit: 'page', total: '', beats, wonder }
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
      wonder: base.wonder,
    }
    const pb = p.beats && typeof p.beats === 'object' ? p.beats : {}
    for (const b of BEATS) {
      const v = pb[b.key]
      if (v && typeof v === 'object') {
        const cards: Card[] = Array.isArray(v.cards)
          ? v.cards.filter((c: any) => c && typeof c.text === 'string').map((c: any) => ({
              id: String(c.id || newId()),
              kind: CARD_KEYS.includes(c.kind) ? c.kind : 'note',
              text: String(c.text),
            }))
          : []
        s.beats[b.key] = { text: typeof v.text === 'string' ? v.text : '', done: !!v.done, cards }
      }
    }
    const pw = p.wonder && typeof p.wonder === 'object' ? p.wonder : {}
    for (const r of WONDER_RULES) s.wonder[r.key] = !!pw[r.key]
    return s
  } catch {
    return base
  }
}

const escHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export default function SfPlotCurve({ payload }: { payload?: Record<string, unknown> }) {
  const [store, setStore] = useState<Store>(() => loadStore())
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const [showWonder, setShowWonder] = useState(true)
  const [cardDraft, setCardDraft] = useState<Record<string, string>>({})
  const [cardKindDraft, setCardKindDraft] = useState<Record<string, CardKind>>({})
  const [editCard, setEditCard] = useState<{ beat: string; id: string } | null>(null)
  const [editText, setEditText] = useState('')
  const [note, setNote] = useState('')
  const [copied, setCopied] = useState('')
  const mounted = useRef(true)

  // 연계로 전달된 장르(payload.genre)를 제목 placeholder 등 맥락에 활용 가능
  const linkedGenre = (payload && typeof payload.genre === 'string' && payload.genre) || 'SF·과학소설'

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
  const toggleWonder = (k: string) => setStore((s) => ({ ...s, wonder: { ...s.wonder, [k]: !s.wonder[k] } }))

  // ── 카드 CRUD ───────────────────────────────────────────────────────────────
  const addCard = (key: string) => {
    const t = (cardDraft[key] || '').trim()
    if (!t) return
    const kind = cardKindDraft[key] || 'novum'
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
  const wonderDone = WONDER_RULES.filter((r) => store.wonder[r.key]).length
  const wonderPct = Math.round((wonderDone / WONDER_RULES.length) * 100)

  // 노붐/경이/대가 집계(설계 한눈에)
  const counts = (() => {
    let novum = 0, wonder = 0, price = 0
    for (const b of BEATS) for (const c of store.beats[b.key].cards) {
      if (c.kind === 'novum') novum++
      else if (c.kind === 'wonder') wonder++
      else if (c.kind === 'price') price++
    }
    return { novum, wonder, price }
  })()

  // ── 복사/내보내기 ──────────────────────────────────────────────────────────
  const buildText = (): string => {
    const lines: string[] = []
    lines.push(`# SF 플롯/진행곡선${store.title ? ` — ${store.title}` : ''}`)
    if (totalNum > 0) lines.push(`총 분량: ${store.total} ${UNIT_LABEL[store.unit]}`)
    lines.push(`진행률: ${doneCount}/${BEATS.length} 완료 (${pct}%) · 노붐 ${counts.novum} · 경이장면 ${counts.wonder} · 대가 ${counts.price}`)
    lines.push('')
    for (const b of BEATS) {
      const st = store.beats[b.key]
      lines.push(`${st.done ? '[v]' : '[ ]'} ${b.title}  〈권장: ${fmtRange(b.range)}〉`)
      lines.push(`  · 곡선: ${b.curve}`)
      lines.push(`  · 노붐 설계: ${b.novum}`)
      if (st.text.trim()) lines.push(st.text.trim().split('\n').map((l) => '  ' + l).join('\n'))
      st.cards.forEach((c) => lines.push(`  - [${kindMeta(c.kind).label}] ${c.text}`))
      lines.push('')
    }
    lines.push(`## 센스 오브 원더 배치 자가 점검 (${wonderDone}/${WONDER_RULES.length}, ${wonderPct}%)`)
    WONDER_RULES.forEach((r) => lines.push(`${store.wonder[r.key] ? '[v]' : '[ ]'} ${r.text}`))
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
      a.download = (store.title ? store.title.replace(/[\\/:*?"<>|]/g, '_') : 'sf-plot') + '-curve.txt'
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      flash('파일로 내보냈어요')
    } catch { setNote('내보내기가 지원되지 않는 환경이에요.') }
  }

  // ── 프로젝트 연동: 6비트 + 센스 오브 원더 점검을 한 문서로 ─────────────────────
  const toBodyHtml = (): string => {
    const parts: string[] = []
    parts.push(`<p><em>진행률 ${doneCount}/${BEATS.length} (${pct}%) · 노붐 ${counts.novum} · 경이장면 ${counts.wonder} · 대가 ${counts.price}</em></p>`)
    for (const b of BEATS) {
      const st = store.beats[b.key]
      parts.push(`<h3>${escHtml(b.title)}</h3>`)
      parts.push(`<p><em>권장: ${escHtml(fmtRange(b.range))} · 곡선: ${escHtml(b.curve)}</em></p>`)
      parts.push(`<p><strong>노붐 설계:</strong> ${escHtml(b.novum)}</p>`)
      const txt = st.text.trim()
      if (txt) for (const ln of txt.split('\n')) parts.push(`<p>${escHtml(ln) || '&nbsp;'}</p>`)
      else parts.push('<p>&nbsp;</p>')
      st.cards.forEach((c) => parts.push(`<p>- [${escHtml(kindMeta(c.kind).label)}] ${escHtml(c.text)}</p>`))
    }
    parts.push(`<h3>센스 오브 원더 배치 자가 점검 (${wonderDone}/${WONDER_RULES.length}, ${wonderPct}%)</h3>`)
    WONDER_RULES.forEach((r) => parts.push(`<p>${store.wonder[r.key] ? '☑' : '☐'} ${escHtml(r.text)}</p>`))
    return parts.join('')
  }
  const toProject = () => {
    if (!hasProjectBridge()) { flash('project:unlinked'); return }
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '구조',
      title: `SF 플롯/진행곡선${store.title ? ` — ${store.title}` : ''}`,
      bodyHtml: toBodyHtml(),
      synopsis: '발견→경이→갈등(기술의 대가)→위기→선택→여파 (센스 오브 원더 배치)',
      meta: {
        작품: store.title || '(제목 없음)',
        장르: 'SF·과학소설',
        진행률: `${doneCount}/${BEATS.length} (${pct}%)`,
        원더점검: `${wonderDone}/${WONDER_RULES.length} (${wonderPct}%)`,
        노붐: String(counts.novum),
        경이장면: String(counts.wonder),
        대가: String(counts.price),
        ...(totalNum > 0 ? { 총분량: `${store.total} ${UNIT_LABEL[store.unit]}` } : {}),
      },
    })
    flash(id ? '프로젝트 자료(구조)에 SF 플롯 곡선 문서를 추가했어요' : 'project:fail')
  }

  // 노붐·세계규칙·경이장면 카드를 글감(스니펫)으로 라이브러리에 저장
  const saveToLibrary = () => {
    let n = 0
    for (const b of BEATS) for (const c of store.beats[b.key].cards) {
      if (c.kind === 'novum' || c.kind === 'rule' || c.kind === 'wonder' || c.kind === 'price') {
        addToLibrary('snippets', { text: `[${kindMeta(c.kind).label}] ${c.text}`, source: 'SF 플롯/진행곡선', tags: ['SF', kindMeta(c.kind).label] })
        n++
      }
    }
    flash(n ? `노붐·경이·대가 ${n}개를 글감으로 저장했어요` : '저장할 설계 카드가 없어요')
  }

  // 전체 초기화(확인 후)
  const resetAll = () => {
    if (!window.confirm('모든 비트 내용·카드·원더 점검을 지웁니다. 정말 초기화할까요?')) return
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
  const novumS: React.CSSProperties = { fontSize: 12.5, lineHeight: 1.6, padding: '8px 10px', margin: '0 12px 8px', background: 'var(--paper)', border: '1px dashed var(--accent)', borderRadius: 9, color: 'var(--muted)' }
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
  const wonderBox: React.CSSProperties = { border: '1px solid var(--border)', borderRadius: 12, background: 'var(--panel)', borderLeft: '4px solid #e0a96a', overflow: 'hidden' }
  const wonderRow: React.CSSProperties = { display: 'flex', alignItems: 'flex-start', gap: 8, padding: '6px 12px', fontSize: 12.8, lineHeight: 1.5, cursor: 'pointer' }

  return (
    <div style={wrap}>
      <div style={head}>
        <div style={metaRow}>
          <input
            style={{ ...input, flex: '2 1 180px' }}
            value={store.title}
            onChange={(e) => setMeta({ title: e.target.value })}
            placeholder={`작품/세계 제목 (선택) · ${linkedGenre}`}
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
          <span><Emoji e="🛸"/> {counts.novum} · <Emoji e="✨"/> {counts.wonder} · <Emoji e="⚠️"/> {counts.price}</span>
        </div>
        <div style={statRow}>
          {totalNum > 0
            ? <span>총 {store.total} {UNIT_LABEL[store.unit]} 기준으로 권장 위치를 환산했어요</span>
            : <span>총 분량을 넣으면 각 비트의 권장 위치를 실제 분량으로 환산해요</span>}
          <span>원더 점검 <strong style={{ color: wonderPct === 100 ? 'var(--ok)' : '#e0a96a' }}>{wonderDone}/{WONDER_RULES.length}</strong></span>
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
                  <div style={novumS}><strong style={{ color: 'var(--accent)' }}><Emoji e="🛸"/> 노붐·외삽 설계 — </strong>{b.novum}</div>
                  <div style={section}>
                    <div style={subLabel}>이 비트에 무슨 일이 일어나나요?</div>
                    <textarea
                      style={ta}
                      value={st.text}
                      onChange={(e) => setBeatText(b.key, e.target.value)}
                      placeholder="장면·기술의 작동·세계의 변화·인물의 심리를 자유롭게 적어 보세요…"
                    />

                    <div style={subLabel}>노붐·세계규칙·경이·대가·복선 카드 (유형 배지를 눌러 종류 변경)</div>
                    {st.cards.length === 0 ? (
                      <div style={emptyS}>아직 카드가 없어요. 아래에 한 줄씩 노붐/경이/대가를 추가해 보세요.</div>
                    ) : (
                      st.cards.map((c, i) => {
                        const editing = editCard && editCard.beat === b.key && editCard.id === c.id
                        return (
                          <div key={c.id} style={cardRow}>
                            <button
                              style={kindPill(c.kind)}
                              onClick={() => cycleKind(b.key, c.id)}
                              title="클릭하여 유형 변경(노붐→세계규칙→경이장면→대가→복선→메모)"
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
                        value={cardKindDraft[b.key] || 'novum'}
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
                        placeholder="노붐/경이/대가 추가… (Enter)"
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

        {/* 센스 오브 원더 배치 자가 점검 */}
        <div style={wonderBox}>
          <div style={cHead}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={cTitle}><Emoji e="✨"/> 센스 오브 원더(sense of wonder) 배치 점검</div>
              <div style={{ ...rangeS, color: '#e0a96a' }}>{wonderDone}/{WONDER_RULES.length} 충족 · {wonderPct}%</div>
            </div>
            <button className="minibtn" style={{ flexShrink: 0 }} onClick={() => setShowWonder((v) => !v)} aria-expanded={showWonder}>
              {showWonder ? '접기 ▲' : '펼치기 ▼'}
            </button>
          </div>
          {showWonder && (
            <div style={{ padding: '0 12px 12px' }}>
              <div style={{ ...barWrap, marginBottom: 8 }}><div style={barFill(wonderPct, '#e0a96a')} /></div>
              {WONDER_RULES.map((r) => (
                <label key={r.key} style={wonderRow}>
                  <input type="checkbox" style={chk} checked={!!store.wonder[r.key]} onChange={() => toggleWonder(r.key)} />
                  <span style={{ color: store.wonder[r.key] ? 'var(--muted)' : 'var(--text)', textDecoration: store.wonder[r.key] ? 'line-through' : 'none' }}>{r.text}</span>
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
          title={hasProjectBridge() ? '6비트 곡선 + 센스 오브 원더 점검을 프로젝트 자료(구조 폴더)에 문서로 추가' : '프로젝트에 연결되어 있지 않습니다'}
        >
          <Emoji e="📄"/> 프로젝트에 추가
        </button>
        <button className="linkbtn" onClick={saveToLibrary} title="노붐·세계규칙·경이·대가 카드를 글감(스니펫)으로 저장"><Emoji e="⭐"/> 설계를 글감으로 저장</button>
        <button className="linkbtn" onClick={() => openToolLinked('scene-list', { genre: 'SF·과학소설' })} title="장면 목록 열기"><Emoji e="🎬"/> 장면 목록</button>
        <button className="linkbtn" onClick={() => openToolLinked('plot-twist-deck', { genre: 'SF·과학소설' })} title="반전 카드덱 열기"><Emoji e="🃏"/> 반전 카드덱</button>
        <button className="linkbtn" onClick={() => openToolLinked('genre-conventions', { genre: 'SF·과학소설' })} title="장르 관습 체크리스트 열기"><Emoji e="📐"/> 장르 관습</button>
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
