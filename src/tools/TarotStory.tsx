// 타로 이야기 씨앗 — 키 없는 공개 카드 API로 3장을 뽑아 과거·현재·미래 이야기 구조를 제시한다.
// deckofcardsapi.com (키 불필요·https·CORS:*) 에서 카드 3장을 뽑아 무늬/숫자에 상징을 부여해 글감으로 변주.
import { useEffect, useRef, useState } from 'react'
import { addToProject, hasProjectBridge, Emoji } from './linkbus'

export const meta = { id: 'tarot-story', name: '타로 이야기 씨앗', icon: '🔮', group: '영감·발상', intro: '카드 3장으로 과거·현재·미래 이야기 구조를 뽑으세요', w: 440, h: 600 }

interface Card { code: string; image: string; value: string; suit: string }
interface Slot { role: string; tag: string; card: Card; theme: string; mood: string; seed: string }

// 무늬별 상징(타로 4원소 변주)
const SUITS: Record<string, { ko: string; sym: string; theme: string; moods: string[] }> = {
  HEARTS: { ko: '하트', sym: '❤️', theme: '관계·감정·사랑', moods: ['따뜻한 그리움', '설렘과 두려움', '용서 혹은 미련'] },
  DIAMONDS: { ko: '다이아', sym: '💎', theme: '욕망·재물·야망', moods: ['차가운 야심', '결핍과 갈증', '거래와 배신'] },
  CLUBS: { ko: '클럽', sym: '🌿', theme: '성장·노력·갈등', moods: ['끈질긴 의지', '도전과 시련', '뜨거운 충돌'] },
  SPADES: { ko: '스페이드', sym: '🗡️', theme: '비밀·운명·시련', moods: ['서늘한 예감', '감춰진 진실', '돌이킬 수 없는 선택'] },
}
// 숫자/그림패별 서사 동력
const VALUES: Record<string, string> = {
  ACE: '모든 것의 시작점', '2': '둘 사이의 긴장', '3': '뜻밖의 동행', '4': '안정과 정체',
  '5': '균열과 상실', '6': '회복과 귀환', '7': '환상 혹은 유혹', '8': '돌파와 변화',
  '9': '극에 달한 마음', '10': '한 시대의 끝', JACK: '미숙한 전령', QUEEN: '깊이 아는 여인', KING: '군림하는 자',
}
const ROLES = [
  { role: '과거', tag: '발단 · 상처와 뿌리', q: '이 인물의 과거에 무슨 사건이 있었기에 지금에 이르렀을까?' },
  { role: '현재', tag: '전개 · 갈등의 한복판', q: '지금 인물이 가장 두려워하는 것은 무엇일까?' },
  { role: '미래', tag: '절정·결말 · 향하는 곳', q: '이 결말을 뒤집을 한 번의 선택이 있다면 무엇일까?' },
]

const valKo = (v: string) => ({ ACE: 'A', JACK: 'J', QUEEN: 'Q', KING: 'K' } as Record<string, string>)[v] || v

function buildSlot(card: Card, i: number): Slot {
  const s = SUITS[card.suit] || { ko: card.suit, sym: '🎴', theme: '미지', moods: ['알 수 없는 기운'] }
  const r = ROLES[i]
  const mood = s.moods[Math.floor(Math.random() * s.moods.length)]
  const drive = VALUES[card.value] || '뜻 모를 신호'
  const seed = `${r.role}에는 '${drive}'이(가) 있었다. ${s.theme}의 기운이 ${mood}으로 흐른다.`
  return { role: r.role, tag: r.tag, card, theme: s.theme, mood, seed }
}

async function drawThree(): Promise<Card[]> {
  const r = await fetch('https://deckofcardsapi.com/api/deck/new/draw/?count=3')
  if (!r.ok) throw new Error('http')
  const j = await r.json()
  const cards: Card[] = (j.cards || []).map((c: Card) => ({ code: c.code, image: c.image, value: c.value, suit: c.suit }))
  if (cards.length < 3) throw new Error('few')
  return cards
}

export default function TarotStory() {
  const [slots, setSlots] = useState<Slot[]>([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [copied, setCopied] = useState(false)
  const [toast, setToast] = useState('')
  const nonce = useRef(0)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current) }, [])
  const flashToast = (msg: string) => {
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 2200)
  }

  const draw = async () => {
    const my = ++nonce.current
    setLoading(true); setErr(''); setCopied(false)
    try {
      const cards = await drawThree()
      const next = cards.slice(0, 3).map((c, i) => buildSlot(c, i))
      if (my === nonce.current) setSlots(next)
    } catch {
      if (my === nonce.current) setErr('카드를 뽑지 못했습니다. 다시 시도해 주세요.')
    } finally {
      if (my === nonce.current) setLoading(false)
    }
  }
  useEffect(() => { draw() /* eslint-disable-next-line */ }, [])

  const storyText = () =>
    slots.map((s, i) => `【${s.role}】 ${ROLES[i].tag}\n카드: ${valKo(s.card.value)}${(SUITS[s.card.suit] || { sym: '' }).sym} (${(SUITS[s.card.suit] || { ko: s.card.suit }).ko})\n씨앗: ${s.seed}\n질문: ${ROLES[i].q}`).join('\n\n')

  const copy = () => {
    navigator.clipboard?.writeText(storyText()).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500) }).catch(() => {})
  }

  // HTML 특수문자 escape — 본문 HTML 생성 전 필수.
  const esc = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  // 현재 타로 이야기 씨앗을 프로젝트 자료 〈영감 메모〉 폴더에 메모 문서로 추가.
  const addToProjectMemo = () => {
    if (!hasProjectBridge() || !slots.length) return
    const bodyHtml = slots.map((s, i) => {
      const suit = SUITS[s.card.suit] || { ko: s.card.suit, sym: '🎴' }
      return [
        `<p><b>【${esc(s.role)}】 ${esc(s.tag)}</b></p>`,
        `<p>카드: ${esc(valKo(s.card.value))}${esc(suit.sym)} · ${esc(suit.ko)} · ${esc(s.theme)}</p>`,
        `<p>🌱 ${esc(s.seed)}</p>`,
        `<p>❓ ${esc(ROLES[i].q)}</p>`,
      ].join('')
    }).join('<hr/>')
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '영감 메모',
      title: '타로 이야기 씨앗',
      bodyHtml,
    })
    flashToast(id ? '프로젝트 자료 〈영감 메모〉에 추가했습니다.' : '프로젝트에 추가하지 못했습니다.')
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 8, color: 'var(--text)', overflow: 'hidden' }}>
      <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
        카드 세 장을 <b>과거 · 현재 · 미래</b>로 펼쳐 이야기의 뼈대를 만듭니다. 상징을 출발점으로만 쓰고 자유롭게 변주하세요.
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 2 }}>
        {loading && <div style={{ textAlign: 'center', color: 'var(--muted)', padding: 24 }}>카드를 뽑는 중…</div>}
        {err && !loading && <div style={{ textAlign: 'center', color: 'var(--muted)', padding: 24 }}>{err}</div>}
        {!loading && !err && slots.length === 0 && <div style={{ textAlign: 'center', color: 'var(--muted)', padding: 24 }}>아래 버튼으로 카드를 뽑아보세요.</div>}

        {!loading && !err && slots.map((s, i) => {
          const suit = SUITS[s.card.suit] || { ko: s.card.suit, sym: '🎴' }
          return (
            <div key={i} style={{ display: 'flex', gap: 10, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: 10 }}>
              <img
                src={s.card.image}
                alt={s.card.code}
                style={{ width: 64, height: 'auto', borderRadius: 6, background: 'var(--paper)', flexShrink: 0, alignSelf: 'flex-start' }}
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, color: 'var(--accent)' }}>{s.role}</span>
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>{s.tag}</span>
                </div>
                <div style={{ fontSize: 12, margin: '3px 0', color: 'var(--muted)' }}>
                  {valKo(s.card.value)}<Emoji e={suit.sym}/> · {suit.ko} · {s.theme}
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.5 }}><Emoji e="🌱"/> {s.seed}</div>
                <div style={{ fontSize: 12, lineHeight: 1.5, marginTop: 4, color: 'var(--muted)' }}><Emoji e="❓"/> {ROLES[i].q}</div>
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn-primary" style={{ flex: 1 }} onClick={draw} disabled={loading}><Emoji e="🔮"/> 다시 뽑기</button>
        <button className="minibtn" onClick={copy} disabled={!slots.length || loading}>{copied ? <>✓ 복사됨</> : <><Emoji e="📋"/> 글쓰기에 활용</>}</button>
      </div>

      {/* 연계: 현재 타로 이야기 씨앗을 실제 프로젝트 바인더(자료 〈영감 메모〉)에 메모로 추가 */}
      <div className="linkbar">
        <span className="linkbar-label">연계:</span>
        <button
          className="linkbtn"
          onClick={addToProjectMemo}
          disabled={!hasProjectBridge() || !slots.length || loading}
          title={!hasProjectBridge() ? '프로젝트에 연결되어 있지 않습니다' : (!slots.length ? '먼저 카드를 뽑아 씨앗을 만드세요' : '현재 타로 이야기 씨앗을 프로젝트 자료 〈영감 메모〉에 메모로 추가')}
        >
          <Emoji e="📄"/> 프로젝트에 추가
        </button>
      </div>

      {toast && (
        <div style={{ fontSize: 12, color: 'var(--accent)', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 10px' }}>{toast}</div>
      )}

      <div style={{ fontSize: 11, color: 'var(--muted)' }}>버튼을 누를 때마다 새 카드 3장이 펼쳐집니다. 복사한 뼈대를 원고에 붙여 살을 붙이세요.</div>
    </div>
  )
}
