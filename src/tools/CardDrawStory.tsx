// 카드 뽑기 서사 — 키 없는 공개 카드 API로 3장을 뽑아, 무늬=주제·숫자=강도/단계로 매핑해 글감을 만든다.
// deckofcardsapi.com (키 불필요·https·CORS:*) 에서 카드 3장을 뽑는다. 무늬별 주제 / 숫자별 강도·서사 단계 매핑표를 함께 보여준다.
// 다시 뽑기 / 매핑 표 토글 / 스니펫·프로젝트 저장. react 와 './linkbus' 외 import 없음.
import { useState, useEffect, useRef, useCallback } from 'react'
import { addToLibrary, addToProject, hasProjectBridge, Emoji } from './linkbus'

export const meta = { id: 'card-draw-story', name: '카드 뽑기 서사', icon: '🃏', group: '영감·발상', intro: '카드 3장의 무늬와 숫자를 이야기 요소로 매핑해 글감을 만드세요', w: 460, h: 640 }

interface Card { code: string; image: string; value: string; suit: string }
interface Slot { stage: string; tag: string; card: Card; theme: string; intensity: string; level: number; seed: string }

// ---------- 무늬 = 주제 ----------
const SUITS: Record<string, { ko: string; sym: string; theme: string; desc: string }> = {
  HEARTS: { ko: '하트', sym: '♥', theme: '관계·사랑·연대', desc: '인물 사이의 마음, 끌림과 상처, 유대와 배신' },
  DIAMONDS: { ko: '다이아', sym: '♦', theme: '욕망·재물·야망', desc: '손에 넣고 싶은 것, 거래와 손익, 차오르는 야심' },
  CLUBS: { ko: '클럽', sym: '♣', theme: '성장·노력·모험', desc: '도전과 단련, 길 위의 시련, 한 걸음씩의 변화' },
  SPADES: { ko: '스페이드', sym: '♠', theme: '갈등·비밀·운명', desc: '감춰진 진실, 피할 수 없는 충돌, 어두운 선택' },
}
const SUIT_ORDER = ['HEARTS', 'DIAMONDS', 'CLUBS', 'SPADES']

// ---------- 숫자 = 강도(1~13) ----------
// value(API) → 수치. A=1, 그림패 J/Q/K=11/12/13.
const VALUE_NUM: Record<string, number> = {
  ACE: 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, JACK: 11, QUEEN: 12, KING: 13,
}
const valLabel = (v: string) => ({ ACE: 'A', JACK: 'J', QUEEN: 'Q', KING: 'K' } as Record<string, string>)[v] || v

// 강도 구간 → 서사적 세기/뉘앙스
function intensityOf(n: number): { word: string; note: string; level: number } {
  if (n <= 3) return { word: '미약 · 씨앗', note: '작은 조짐, 사소한 균열', level: 1 }
  if (n <= 6) return { word: '잔잔 · 고조', note: '서서히 차오르는 긴장', level: 2 }
  if (n <= 9) return { word: '격렬 · 충돌', note: '터져 나오는 갈등의 정점', level: 3 }
  return { word: '극단 · 운명', note: '돌이킬 수 없는 거대한 힘', level: 4 }
}

// ---------- 서사 단계(3장 = 발단·전개·결말) ----------
const STAGES = [
  { stage: '발단', tag: '시작 · 인물과 결핍', q: '이 주제가 인물의 일상에 어떻게 끼어드는가?' },
  { stage: '전개', tag: '갈등 · 한복판', q: '강도가 이만큼일 때, 인물은 무엇을 견디는가?' },
  { stage: '결말', tag: '절정·해소 · 향하는 곳', q: '이 세기의 힘은 인물을 어디로 데려가는가?' },
]

function buildSlot(card: Card, i: number): Slot {
  const s = SUITS[card.suit] || { ko: card.suit, sym: '🎴', theme: '미지', desc: '알 수 없는 결' }
  const st = STAGES[i] || STAGES[STAGES.length - 1]
  const n = VALUE_NUM[card.value] ?? 0
  const it = intensityOf(n)
  const seed = `${st.stage}: 「${s.theme}」의 주제가 '${it.word}'(${it.note})의 세기로 흐른다.`
  return { stage: st.stage, tag: st.tag, card, theme: s.theme, intensity: it.word, level: it.level, seed }
}

const LS = 'sry:tool:card-draw-story'
const escapeHtml = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

async function drawThree(signal?: AbortSignal): Promise<Card[]> {
  const r = await fetch('https://deckofcardsapi.com/api/deck/new/draw/?count=3', { signal })
  if (!r.ok) throw new Error('http ' + r.status)
  const j = await r.json()
  const cards: Card[] = (j.cards || []).map((c: Card) => ({ code: c.code, image: c.image, value: c.value, suit: c.suit }))
  if (cards.length < 3) throw new Error('few')
  return cards
}

export default function CardDrawStory({ payload }: { payload?: Record<string, unknown> }) {
  const [slots, setSlots] = useState<Slot[]>([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [showMap, setShowMap] = useState(false)
  const nonce = useRef(0)
  const abortRef = useRef<AbortController | null>(null)
  const restored = useRef(false)

  const [toast, setToast] = useState('')
  const toastTimer = useRef<number | null>(null)
  const flash = useCallback((m: string) => {
    setToast(m)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(''), 1900)
  }, [])

  // 마지막 뽑기 결과 자동 저장/복원(워크시트 규약)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS)
      if (raw) {
        const s = JSON.parse(raw) as Partial<{ slots: Slot[]; showMap: boolean }>
        if (Array.isArray(s.slots) && s.slots.length) setSlots(s.slots)
        if (typeof s.showMap === 'boolean') setShowMap(s.showMap)
      }
    } catch { /* ignore */ }
    restored.current = true
    if (payload && payload['showMap'] === true) setShowMap(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!restored.current) return
    try { localStorage.setItem(LS, JSON.stringify({ slots, showMap })) } catch { /* 용량 초과 등 무시 */ }
  }, [slots, showMap])

  const draw = useCallback(async () => {
    const my = ++nonce.current
    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac
    setLoading(true); setErr('')
    try {
      const cards = await drawThree(ac.signal)
      const next = cards.slice(0, 3).map((c, i) => buildSlot(c, i))
      if (my === nonce.current) setSlots(next)
    } catch (e) {
      if ((e as { name?: string })?.name === 'AbortError') return
      if (my === nonce.current) setErr('카드를 뽑지 못했습니다. 네트워크를 확인하고 다시 시도해 주세요.')
    } finally {
      if (my === nonce.current) setLoading(false)
    }
  }, [])

  // 첫 진입 시(복원된 결과가 없을 때만) 자동 한 벌
  useEffect(() => {
    if (!restored.current) return
    if (slots.length === 0) draw()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restored.current])

  // 언마운트 정리: 진행 중 요청 취소 + 토스트 타이머 해제
  useEffect(() => () => {
    abortRef.current?.abort()
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
  }, [])

  const ready = slots.length === 3

  // ---------- 출력(복사/스니펫/프로젝트) ----------
  const plainText = () =>
    slots.map((s, i) => {
      const suit = SUITS[s.card.suit] || { ko: s.card.suit, sym: '🎴' }
      return `【${s.stage}】 ${s.tag}\n카드: ${valLabel(s.card.value)}${suit.sym} (${suit.ko})\n주제: ${s.theme}  |  강도: ${s.intensity}\n씨앗: ${s.seed}\n질문: ${STAGES[i]?.q || ''}`
    }).join('\n\n')

  const copy = () => {
    if (!ready) return
    navigator.clipboard?.writeText(plainText()).then(() => flash('클립보드에 복사했습니다.')).catch(() => { /* graceful */ })
  }

  const saveSnippet = () => {
    if (!ready) return
    const cardTags = slots.map((s) => `${valLabel(s.card.value)}${(SUITS[s.card.suit] || { sym: '' }).sym}`)
    addToLibrary('snippets', { text: plainText(), source: '카드 뽑기 서사', tags: ['글감', '발상', '카드', ...cardTags] })
    flash('스니펫 라이브러리에 저장했습니다.')
  }

  const toProject = () => {
    if (!ready) return
    if (!hasProjectBridge()) { flash('프로젝트에 연결되어 있지 않습니다.'); return }
    const bodyHtml = slots.map((s, i) => {
      const suit = SUITS[s.card.suit] || { ko: s.card.suit, sym: '🎴' }
      return [
        `<p><b>【${escapeHtml(s.stage)}】 ${escapeHtml(s.tag)}</b></p>`,
        `<p>카드: ${escapeHtml(valLabel(s.card.value))}${escapeHtml(suit.sym)} · ${escapeHtml(suit.ko)}</p>`,
        `<p>주제: ${escapeHtml(s.theme)} &nbsp;|&nbsp; 강도: ${escapeHtml(s.intensity)}</p>`,
        `<p>🌱 ${escapeHtml(s.seed)}</p>`,
        `<p>❓ ${escapeHtml(STAGES[i]?.q || '')}</p>`,
      ].join('')
    }).join('<hr/>')
    const title = '🃏 카드 서사 · ' + slots.map((s) => `${valLabel(s.card.value)}${(SUITS[s.card.suit] || { sym: '' }).sym}`).join(' ')
    const id = addToProject({ kind: 'text', root: 'research', folder: '영감 메모', title, bodyHtml })
    flash(id ? '프로젝트 자료 〈영감 메모〉 폴더에 추가했습니다.' : '프로젝트에 추가하지 못했습니다.')
  }

  // ---------- 스타일 ----------
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 8, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'auto' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }
  const cardBox: React.CSSProperties = { display: 'flex', gap: 10, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: 10 }
  const dot = (active: boolean): React.CSSProperties => ({ width: 8, height: 8, borderRadius: '50%', background: active ? 'var(--accent)' : 'var(--border)' })

  return (
    <div style={wrap}>
      <div style={hint}>
        카드 3장을 <b>발단 · 전개 · 결말</b>로 펼칩니다. <b>무늬 = 주제</b>, <b>숫자 = 강도/단계</b>로 읽어 글감을 만드세요. 상징은 출발점일 뿐, 자유롭게 변주하세요.
      </div>

      {/* 매핑 표 토글 */}
      <button className="linkbtn" onClick={() => setShowMap((v) => !v)} style={{ alignSelf: 'flex-start' }}>
        {showMap ? '▾ 매핑 표 닫기' : '▸ 매핑 표 보기(무늬=주제 · 숫자=강도)'}
      </button>
      {showMap && (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', fontSize: 12, lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <div style={{ fontWeight: 700, color: 'var(--accent)', marginBottom: 4 }}>무늬 = 주제</div>
            {SUIT_ORDER.map((k) => {
              const s = SUITS[k]
              return (
                <div key={k} style={{ display: 'flex', gap: 8, padding: '2px 0' }}>
                  <span style={{ width: 70, flexShrink: 0 }}>{s.sym} {s.ko}</span>
                  <span style={{ color: 'var(--muted)' }}><b style={{ color: 'var(--text)' }}>{s.theme}</b> — {s.desc}</span>
                </div>
              )
            })}
          </div>
          <div>
            <div style={{ fontWeight: 700, color: 'var(--accent)', marginBottom: 4 }}>숫자 = 강도 (A=1 … K=13)</div>
            <div style={{ display: 'flex', gap: 8, padding: '2px 0' }}><span style={{ width: 70, flexShrink: 0 }}>A · 2 · 3</span><span style={{ color: 'var(--muted)' }}>미약 · 씨앗 — 작은 조짐, 사소한 균열</span></div>
            <div style={{ display: 'flex', gap: 8, padding: '2px 0' }}><span style={{ width: 70, flexShrink: 0 }}>4 · 5 · 6</span><span style={{ color: 'var(--muted)' }}>잔잔 · 고조 — 서서히 차오르는 긴장</span></div>
            <div style={{ display: 'flex', gap: 8, padding: '2px 0' }}><span style={{ width: 70, flexShrink: 0 }}>7 · 8 · 9</span><span style={{ color: 'var(--muted)' }}>격렬 · 충돌 — 터져 나오는 갈등의 정점</span></div>
            <div style={{ display: 'flex', gap: 8, padding: '2px 0' }}><span style={{ width: 70, flexShrink: 0 }}>10 · J · Q · K</span><span style={{ color: 'var(--muted)' }}>극단 · 운명 — 돌이킬 수 없는 거대한 힘</span></div>
          </div>
        </div>
      )}

      {/* 결과 */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {loading && <div style={{ textAlign: 'center', color: 'var(--muted)', padding: 24 }}>카드를 뽑는 중…</div>}
        {err && !loading && <div style={{ textAlign: 'center', color: 'var(--muted)', padding: 24 }}>{err}</div>}
        {!loading && !err && !ready && <div style={{ textAlign: 'center', color: 'var(--muted)', padding: 24 }}>아래 〈다시 뽑기〉로 카드 3장을 펼쳐보세요.</div>}

        {!loading && !err && ready && slots.map((s, i) => {
          const suit = SUITS[s.card.suit] || { ko: s.card.suit, sym: '🎴' }
          return (
            <div key={s.card.code + i} style={cardBox}>
              <img
                src={s.card.image}
                alt={s.card.code}
                style={{ width: 60, height: 'auto', borderRadius: 6, background: 'var(--paper)', flexShrink: 0, alignSelf: 'flex-start' }}
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, color: 'var(--accent)' }}>{s.stage}</span>
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>{s.tag}</span>
                </div>
                <div style={{ fontSize: 12, margin: '3px 0', color: 'var(--muted)' }}>
                  {valLabel(s.card.value)}<Emoji e={suit.sym}/> · <b style={{ color: 'var(--text)' }}>{s.theme}</b> · 강도 {s.intensity}
                </div>
                <div style={{ display: 'flex', gap: 4, margin: '4px 0' }}>
                  {[1, 2, 3, 4].map((lv) => <span key={lv} style={dot(lv <= s.level)} title={`강도 ${s.level}/4`} />)}
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.5 }}><Emoji e="🌱"/> {s.seed}</div>
                <div style={{ fontSize: 12, lineHeight: 1.5, marginTop: 4, color: 'var(--muted)' }}><Emoji e="❓"/> {STAGES[i]?.q}</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* 버튼 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn-primary" style={{ flex: 1 }} onClick={draw} disabled={loading}><Emoji e="🃏"/> 다시 뽑기</button>
        <button className="minibtn" onClick={copy} disabled={!ready || loading}><Emoji e="📋"/> 복사</button>
        <button className="minibtn" onClick={saveSnippet} disabled={!ready || loading} title="공유 스니펫 라이브러리에 저장"><Emoji e="💾"/> 스니펫</button>
        <button
          className="linkbtn"
          onClick={toProject}
          disabled={!ready || loading || !hasProjectBridge()}
          title={!hasProjectBridge() ? '프로젝트에 연결되어 있지 않습니다' : '카드 서사를 프로젝트 자료 〈영감 메모〉 폴더에 메모로 추가'}
        >
          <Emoji e="📄"/> 프로젝트에 추가
        </button>
      </div>

      {toast && <div style={{ fontSize: 12, color: 'var(--accent)', textAlign: 'center' }}>{toast}</div>}

      <div className="license-note">
        카드 이미지·뽑기: Deck of Cards API(deckofcardsapi.com, 키 불필요·CC0 카드 이미지). 매핑 해석은 자체 제작(자유 사용).
      </div>
    </div>
  )
}
