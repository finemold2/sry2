// Save the Cat! 15비트 시트 — 블레이크 스나이더의 비트 시트로 이야기 뼈대를 잡는 도구.
// 15개 고정 비트(설명·권장 분량%)에 각자 내용을 적고, 완료 체크/진행률/세부 카드(CRUD·순서)를 관리한다.
// 작품 제목·총 분량(페이지/원고지)을 입력하면 각 비트의 권장 위치를 실제 분량으로 환산해 보여준다.
// 전체를 텍스트로 복사/내보내기. 모든 데이터는 localStorage에 자동 저장/복원.
// 프로젝트 연동(linkbus): 15비트를 한 편의 문서로 프로젝트 자료에 추가. react/linkbus 외 import 없음.
import { useEffect, useRef, useState } from 'react'
import { addToProject, hasProjectBridge } from './linkbus'

export const meta = { id: 'save-the-cat-beats', name: 'Save the Cat 비트 시트', icon: '🐱', group: '구상·정리', intro: '15비트로 이야기 뼈대를 잡고 권장 분량·진행률을 관리하세요', w: 640, h: 620 }

const LS_KEY = 'sry:tool:save-the-cat-beats'

// ── 15비트 정의(고정): 라벨/설명/권장 분량(전체 대비 %, [시작, 끝]) ─────────────
interface BeatDef {
  key: string
  title: string
  desc: string
  range: [number, number] // 전체 분량 대비 위치 백분율 구간
}

const BEATS: BeatDef[] = [
  { key: 'opening', title: '1. 오프닝 이미지', desc: '이야기의 첫 인상. 주인공의 “변하기 전” 세계와 분위기를 한 장면으로 보여줍니다. 마지막 이미지와 짝을 이루며 변화의 출발점이 됩니다.', range: [0, 1] },
  { key: 'theme', title: '2. 주제 제시', desc: '작품이 던지는 질문·교훈을 (대개 다른 인물의 대사로) 슬쩍 흘립니다. 주인공은 아직 이를 깨닫지 못합니다.', range: [5, 5] },
  { key: 'setup', title: '3. 셋업', desc: '주인공의 일상·결핍·인간관계·고쳐야 할 점을 소개합니다. 앞으로 변할 모든 요소의 “수정 전” 상태를 깝니다.', range: [1, 10] },
  { key: 'catalyst', title: '4. 기폭제', desc: '일상을 뒤흔드는 사건(전보·해고·만남·발견). 더 이상 예전으로 돌아갈 수 없게 만드는 방아쇠입니다.', range: [10, 10] },
  { key: 'debate', title: '5. 망설임', desc: '“정말 할 수 있을까?” 주인공이 주저하고 두려워하는 구간. 위험과 대가를 저울질합니다.', range: [10, 20] },
  { key: 'break2', title: '6. 2막 진입', desc: '주인공이 마침내 결단하고 새로운 세계(반대 세계)로 발을 내딛습니다. 1막과 결별하는 분기점.', range: [20, 20] },
  { key: 'bstory', title: '7. B스토리', desc: '대개 사랑·우정 등 보조 플롯이 시작됩니다. 주제를 다른 각도에서 비추고 주인공의 변화를 돕는 인물이 등장합니다.', range: [22, 22] },
  { key: 'funandgames', title: '8. 재미와 놀이', desc: '“약속한 재미(premise)”를 펼치는 구간. 예고편에 들어갈 만한 장면들, 새로운 세계의 매력과 시련을 보여줍니다.', range: [20, 50] },
  { key: 'midpoint', title: '9. 중간점', desc: '거짓 승리 또는 거짓 패배로 판이 뒤집힙니다. 위기가 올라가고 A스토리와 B스토리가 교차합니다.', range: [50, 50] },
  { key: 'badguys', title: '10. 적의 역습', desc: '외부의 적·내부의 균열이 다시 조여옵니다. 동료의 분열, 의심, 압박이 점점 거세집니다.', range: [50, 75] },
  { key: 'allislost', title: '11. 절망의 순간', desc: '가장 밑바닥. 무언가(혹은 누군가)를 잃는 “죽음의 냄새”가 풍기는 최악의 지점입니다.', range: [75, 75] },
  { key: 'darknight', title: '12. 영혼의 어두운 밤', desc: '모든 것을 잃은 주인공의 절망·애도·반성. 바닥에서 깨달음의 씨앗이 움트는 구간입니다.', range: [75, 80] },
  { key: 'break3', title: '13. 3막 진입', desc: 'B스토리(혹은 깨달음)에서 해법을 얻어 다시 일어섭니다. A·B 스토리가 합쳐지며 최종 결전으로 향합니다.', range: [80, 80] },
  { key: 'finale', title: '14. 피날레', desc: '배운 것을 실행해 적을 무찌르고 세계를 바로잡습니다. 주인공이 진짜로 변했음이 증명됩니다.', range: [80, 99] },
  { key: 'finalimage', title: '15. 마지막 이미지', desc: '오프닝 이미지의 거울상. 얼마나 멀리 변해왔는지를 한 장면으로 마무리합니다.', range: [99, 100] },
]

// ── 데이터 타입 ──────────────────────────────────────────────────────────────
interface Card { id: string; text: string }
interface BeatState { text: string; done: boolean; cards: Card[] }
interface Store {
  title: string
  unit: 'page' | 'won고' | 'minute'
  total: string // 총 분량(문자열로 보관, 비워둘 수 있음)
  beats: Record<string, BeatState>
}

const UNIT_LABEL: Record<Store['unit'], string> = { page: '페이지', 'won고': '원고지(매)', minute: '분(상영시간)' }

function newId(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch {}
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function emptyBeat(): BeatState { return { text: '', done: false, cards: [] } }

function defaultStore(): Store {
  const beats: Record<string, BeatState> = {}
  for (const b of BEATS) beats[b.key] = emptyBeat()
  return { title: '', unit: 'page', total: '', beats }
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
      unit: p.unit === 'won고' || p.unit === 'minute' ? p.unit : 'page',
      total: typeof p.total === 'string' ? p.total : (typeof p.total === 'number' ? String(p.total) : ''),
      beats: base.beats,
    }
    const pb = p.beats && typeof p.beats === 'object' ? p.beats : {}
    for (const b of BEATS) {
      const v = pb[b.key]
      if (v && typeof v === 'object') {
        const cards: Card[] = Array.isArray(v.cards)
          ? v.cards.filter((c: any) => c && typeof c.text === 'string').map((c: any) => ({ id: String(c.id || newId()), text: String(c.text) }))
          : []
        s.beats[b.key] = { text: typeof v.text === 'string' ? v.text : '', done: !!v.done, cards }
      }
    }
    return s
  } catch {
    return base
  }
}

export default function SaveTheCatBeats() {
  const [store, setStore] = useState<Store>(() => loadStore())
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const [cardDraft, setCardDraft] = useState<Record<string, string>>({})
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

  // ── 비트 수정 헬퍼 ──────────────────────────────────────────────────────────
  const patchBeat = (key: string, patch: Partial<BeatState>) =>
    setStore((s) => ({ ...s, beats: { ...s.beats, [key]: { ...s.beats[key], ...patch } } }))

  const setBeatText = (key: string, text: string) => patchBeat(key, { text })
  const toggleDone = (key: string) => patchBeat(key, { done: !store.beats[key].done })
  const toggleOpen = (key: string) => setOpen((o) => ({ ...o, [key]: !o[key] }))

  // ── 카드 CRUD ───────────────────────────────────────────────────────────────
  const addCard = (key: string) => {
    const t = (cardDraft[key] || '').trim()
    if (!t) return
    patchBeat(key, { cards: [...store.beats[key].cards, { id: newId(), text: t }] })
    setCardDraft((d) => ({ ...d, [key]: '' }))
  }
  const removeCard = (key: string, id: string) =>
    patchBeat(key, { cards: store.beats[key].cards.filter((c) => c.id !== id) })
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
      const u = UNIT_LABEL[store.unit]
      return r[0] === r[1] ? `${a}${unitShort()}쯤 (${r[0]}%) · ${u} 기준` : `${a}~${b}${unitShort()} (${r[0]}~${r[1]}%) · ${u} 기준`
    }
    return r[0] === r[1] ? `전체의 약 ${r[0]}% 지점` : `전체의 ${r[0]}~${r[1]}% 구간`
  }
  const unitShort = () => (store.unit === 'page' ? 'p' : store.unit === 'minute' ? '분' : '매')

  // ── 진행률 ──────────────────────────────────────────────────────────────────
  const doneCount = BEATS.filter((b) => store.beats[b.key].done).length
  const filledCount = BEATS.filter((b) => store.beats[b.key].text.trim() || store.beats[b.key].cards.length).length
  const pct = Math.round((doneCount / BEATS.length) * 100)

  // ── 복사/내보내기 ──────────────────────────────────────────────────────────
  const buildText = (): string => {
    const lines: string[] = []
    lines.push(`# Save the Cat! 비트 시트${store.title ? ` — ${store.title}` : ''}`)
    if (totalNum > 0) lines.push(`총 분량: ${store.total} ${UNIT_LABEL[store.unit]}`)
    lines.push(`진행률: ${doneCount}/${BEATS.length} 완료 (${pct}%)`)
    lines.push('')
    for (const b of BEATS) {
      const st = store.beats[b.key]
      lines.push(`${st.done ? '[v]' : '[ ]'} ${b.title}  〈권장: ${fmtRange(b.range)}〉`)
      if (st.text.trim()) lines.push(st.text.trim().split('\n').map((l) => '  ' + l).join('\n'))
      st.cards.forEach((c) => lines.push(`  - ${c.text}`))
      lines.push('')
    }
    return lines.join('\n').trimEnd() + '\n'
  }

  const flashCopied = (msg: string) => { setCopied(msg); window.setTimeout(() => { if (mounted.current) setCopied('') }, 1600) }

  const copyAll = async () => {
    const text = buildText()
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(text); flashCopied('전체 시트를 복사했어요') ; return }
      throw new Error('no clipboard')
    } catch {
      try {
        const ta = document.createElement('textarea')
        ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
        document.body.appendChild(ta); ta.focus(); ta.select()
        document.execCommand('copy'); document.body.removeChild(ta)
        flashCopied('전체 시트를 복사했어요')
      } catch { setNote('복사가 지원되지 않는 환경이에요. 텍스트를 직접 선택해 복사해 주세요.') }
    }
  }

  const exportFile = () => {
    try {
      const blob = new Blob([buildText()], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = (store.title ? store.title.replace(/[\\/:*?"<>|]/g, '_') : 'save-the-cat') + '-beats.txt'
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      flashCopied('파일로 내보냈어요')
    } catch { setNote('내보내기가 지원되지 않는 환경이에요.') }
  }

  // ── 프로젝트 연동: 15비트 문서로 추가 ────────────────────────────────────────
  const escHtml = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const toBodyHtml = (): string => {
    const parts: string[] = []
    for (const b of BEATS) {
      const st = store.beats[b.key]
      parts.push(`<h3>${escHtml(b.title)}</h3>`)
      parts.push(`<p><em>권장: ${escHtml(fmtRange(b.range))}</em></p>`)
      const txt = st.text.trim()
      if (txt) {
        for (const ln of txt.split('\n')) parts.push(`<p>${escHtml(ln) || '&nbsp;'}</p>`)
      } else {
        parts.push('<p>&nbsp;</p>')
      }
      st.cards.forEach((c) => parts.push(`<p>- ${escHtml(c.text)}</p>`))
    }
    return parts.join('')
  }
  const toProject = () => {
    if (!hasProjectBridge()) { setNote('프로젝트에 연결되어 있지 않아 문서를 추가할 수 없어요.'); return }
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '구조',
      title: 'Save the Cat 비트',
      bodyHtml: toBodyHtml(),
      meta: {
        작품: store.title || '(제목 없음)',
        진행률: `${doneCount}/${BEATS.length} (${pct}%)`,
        ...(totalNum > 0 ? { 총분량: `${totalDigits} ${UNIT_LABEL[store.unit]}` } : {}),
      },
    })
    flashCopied(id ? '프로젝트 자료에 비트시트 문서를 추가했어요' : '프로젝트에 연결되지 않았습니다')
  }

  // 전체 초기화(확인 후) — 파괴적이므로 confirm 게이트.
  const resetAll = () => {
    if (!window.confirm('모든 비트 내용·세부 카드·진행 상태를 지웁니다. 정말 초기화할까요?')) return
    setStore(defaultStore())
    setOpen({}); setCardDraft({}); setEditCard(null)
    flashCopied('모두 초기화했어요')
  }

  // ── 스타일 ──────────────────────────────────────────────────────────────────
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', minHeight: 0 }
  const head: React.CSSProperties = { padding: '12px 14px 10px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 10, background: 'var(--chrome-2)' }
  const metaRow: React.CSSProperties = { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }
  const input: React.CSSProperties = { padding: '8px 10px', fontSize: 14, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box', minWidth: 0 }
  const select: React.CSSProperties = { ...input, padding: '8px 8px', cursor: 'pointer' }
  const barWrap: React.CSSProperties = { height: 10, borderRadius: 6, background: 'var(--paper)', border: '1px solid var(--border)', overflow: 'hidden' }
  const barFill: React.CSSProperties = { height: '100%', width: `${pct}%`, background: 'var(--ok)', transition: 'width .25s ease' }
  const statRow: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, fontSize: 12.5, color: 'var(--muted)' }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }
  const card = (done: boolean): React.CSSProperties => ({ border: '1px solid var(--border)', borderRadius: 12, background: 'var(--panel)', borderLeft: `4px solid ${done ? 'var(--ok)' : 'var(--accent)'}`, overflow: 'hidden' })
  const cHead: React.CSSProperties = { display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px' }
  const cTitle: React.CSSProperties = { fontSize: 14.5, fontWeight: 700, lineHeight: 1.35 }
  const range: React.CSSProperties = { fontSize: 11.5, color: 'var(--accent)', marginTop: 3, fontWeight: 600 }
  const desc: React.CSSProperties = { fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.6, padding: '0 12px 6px', whiteSpace: 'pre-wrap' }
  const ta: React.CSSProperties = { width: '100%', minHeight: 64, resize: 'vertical', padding: '8px 10px', fontSize: 13.5, lineHeight: 1.5, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box', fontFamily: 'inherit' }
  const section: React.CSSProperties = { padding: '0 12px 12px', display: 'flex', flexDirection: 'column', gap: 8 }
  const subLabel: React.CSSProperties = { fontSize: 11.5, color: 'var(--muted)', fontWeight: 600 }
  const cardRow: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 8px' }
  const cardTxt: React.CSSProperties = { flex: 1, minWidth: 0, fontSize: 13, lineHeight: 1.45, wordBreak: 'break-word' }
  const iconBtn: React.CSSProperties = { flexShrink: 0, border: 'none', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', fontSize: 13, lineHeight: 1, padding: 3 }
  const addRow: React.CSSProperties = { display: 'flex', gap: 6 }
  const foot: React.CSSProperties = { borderTop: '1px solid var(--border)', padding: '10px 14px', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', background: 'var(--chrome-2)' }
  const chk: React.CSSProperties = { flexShrink: 0, width: 18, height: 18, marginTop: 1, cursor: 'pointer', accentColor: 'var(--ok)' }
  const empty: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', fontStyle: 'italic', padding: '2px 0' }

  const totalDigits = store.total.replace(/[^\d.]/g, '')

  return (
    <div style={wrap}>
      <div style={head}>
        <div style={metaRow}>
          <input
            style={{ ...input, flex: '2 1 180px' }}
            value={store.title}
            onChange={(e) => setMeta({ title: e.target.value })}
            placeholder="작품 제목 (선택)"
            maxLength={120}
            aria-label="작품 제목"
          />
          <input
            style={{ ...input, flex: '1 1 90px', width: 90 }}
            value={store.total}
            onChange={(e) => setMeta({ total: e.target.value.replace(/[^\d.]/g, '') })}
            placeholder="총 분량"
            inputMode="decimal"
            aria-label="총 분량"
          />
          <select style={select} value={store.unit} onChange={(e) => setMeta({ unit: e.target.value as Store['unit'] })} aria-label="분량 단위">
            <option value="page">페이지</option>
            <option value="won고">원고지(매)</option>
            <option value="minute">분(상영시간)</option>
          </select>
        </div>
        <div style={barWrap}><div style={barFill} /></div>
        <div style={statRow}>
          <span>완료 <strong style={{ color: 'var(--ok)' }}>{doneCount}</strong> / 15 · 작성된 비트 <strong style={{ color: 'var(--text)' }}>{filledCount}</strong> · <strong style={{ color: 'var(--accent)' }}>{pct}%</strong></span>
          {totalNum > 0 ? <span>총 {totalDigits} {UNIT_LABEL[store.unit]} 기준 환산</span> : <span>총 분량을 넣으면 권장 위치를 환산해요</span>}
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
                  <div style={cTitle}>{b.title}{hasContent && !isOpen ? <span style={{ color: 'var(--muted)', fontWeight: 400 }}> · 작성됨</span> : ''}</div>
                  <div style={range}>권장: {fmtRange(b.range)}</div>
                </div>
                <button className="minibtn" style={{ flexShrink: 0 }} onClick={() => toggleOpen(b.key)} aria-expanded={isOpen}>
                  {isOpen ? '접기 ▲' : '펼치기 ▼'}
                </button>
              </div>

              {isOpen && (
                <>
                  <div style={desc}>{b.desc}</div>
                  <div style={section}>
                    <div style={subLabel}>이 비트에 무슨 일이 일어나나요?</div>
                    <textarea
                      style={ta}
                      value={st.text}
                      onChange={(e) => setBeatText(b.key, e.target.value)}
                      placeholder="장면·사건·감정을 자유롭게 적어 보세요…"
                    />

                    <div style={subLabel}>세부 카드 (장면·아이디어 쪼개기)</div>
                    {st.cards.length === 0 ? (
                      <div style={empty}>세부 카드가 없어요. 아래에 한 줄씩 추가해 보세요.</div>
                    ) : (
                      st.cards.map((c, i) => {
                        const editing = editCard && editCard.beat === b.key && editCard.id === c.id
                        return (
                          <div key={c.id} style={cardRow}>
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
                                <button style={iconBtn} onClick={() => startEdit(b.key, c)} title="수정" aria-label="수정">✏️</button>
                                <button style={iconBtn} onClick={() => removeCard(b.key, c.id)} title="삭제" aria-label="삭제">🗑️</button>
                              </>
                            )}
                          </div>
                        )
                      })
                    )}
                    <div style={addRow}>
                      <input
                        style={{ ...input, flex: 1, padding: '6px 9px', fontSize: 13 }}
                        value={cardDraft[b.key] || ''}
                        onChange={(e) => setCardDraft((d) => ({ ...d, [b.key]: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCard(b.key) } }}
                        placeholder="세부 카드 추가… (Enter)"
                        maxLength={300}
                        aria-label="세부 카드 추가"
                      />
                      <button className="minibtn" onClick={() => addCard(b.key)} disabled={!(cardDraft[b.key] || '').trim()}>추가</button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>

      <div style={{ ...foot, paddingBottom: 0, borderTop: '1px solid var(--border)' }} className="linkbar">
        <span className="linkbar-label">연계:</span>
        <button
          className="linkbtn"
          onClick={toProject}
          disabled={!hasProjectBridge()}
          title={hasProjectBridge() ? '15비트 전체를 프로젝트 자료에 문서로 추가' : '프로젝트에 연결되어 있지 않습니다'}
        >
          📄 프로젝트에 비트시트 문서 추가
        </button>
      </div>

      <div style={foot}>
        <button className="btn-primary" onClick={copyAll}>📋 전체 복사</button>
        <button className="minibtn" onClick={exportFile}>⬇️ .txt 내보내기</button>
        <button className="minibtn" onClick={() => setOpen(Object.fromEntries(BEATS.map((b) => [b.key, true])))}>모두 펼치기</button>
        <button className="minibtn" onClick={() => setOpen({})}>모두 접기</button>
        <span style={{ flex: 1 }} />
        {copied && <span style={{ fontSize: 12.5, color: 'var(--ok)', fontWeight: 600 }}>{copied}</span>}
        <button className="minibtn" onClick={resetAll} style={{ color: 'var(--warn)' }}>전체 초기화</button>
      </div>
    </div>
  )
}
