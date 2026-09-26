// 역사 속 오늘 — 키 없는 공개 위키미디어 API로 오늘 날짜의 역사 사건을 가져와 글감으로 쓴다.
// 1차: api.wikimedia.org/feed/v1/wikipedia/ko/onthisday/events/{MM}/{DD}, 실패 시 ko.wikipedia.org REST API로 폴백. 둘 다 키 불필요·https·CORS.
import { useState, useEffect, useRef } from 'react'
import { addToProject, hasProjectBridge, Emoji } from './linkbus'

export const meta = { id: 'on-this-day', name: '역사 속 오늘', icon: '📜', group: '영감·발상', intro: '오늘 일어난 역사 사건에서 이야기 소재를 캐냅니다', w: 460, h: 600 }

interface HistEvent {
  year: number
  text: string
  page?: string
}

const PROMPTS = [
  (y: number) => `${y}년 그날, 한 평범한 사람의 하루는 어땠을까? 그 시선으로 한 장면을 써보세요.`,
  (_y: number) => `이 사건이 일어나지 않았다면 세상은 어떻게 달라졌을까요? 그 가정에서 이야기를 시작해 보세요.`,
  (_y: number) => `이 사건의 한가운데 있었던 이름 없는 목격자를 주인공으로 삼아보세요. 그는 무엇을 보았을까요?`,
  (_y: number) => `이 사건을 먼 미래의 한 인물이 회상한다면, 무엇을 가장 또렷이 기억할까요?`,
  (_y: number) => `이 사건 직전, 마지막 평범한 순간을 묘사해 보세요. 누군가는 무엇을 하고 있었을까요?`,
  (_y: number) => `이 사건에 얽힌 작은 거짓말 하나를 상상해 보세요. 누가, 왜 그것을 숨겼을까요?`,
]

function pad(n: number) { return String(n).padStart(2, '0') }

// HTML 이스케이프(프로젝트 본문은 HTML 로 전달되므로 사용자/외부 텍스트를 안전하게 처리)
function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function parseEvents(arr: any[]): HistEvent[] {
  if (!Array.isArray(arr)) return []
  return arr
    .map((e) => {
      const year = typeof e?.year === 'number' ? e.year : NaN
      const text = typeof e?.text === 'string' ? e.text.trim() : ''
      const page = e?.pages?.[0]?.content_urls?.desktop?.page
      return { year, text, page }
    })
    .filter((e) => e.text)
    .sort((a, b) => (b.year || 0) - (a.year || 0))
}

const ENDPOINTS = [
  (mm: string, dd: string) => `https://api.wikimedia.org/feed/v1/wikipedia/ko/onthisday/events/${mm}/${dd}`,
  (mm: string, dd: string) => `https://ko.wikipedia.org/api/rest_v1/feed/onthisday/events/${mm}/${dd}`,
]

async function fetchEvents(mm: string, dd: string, signal: AbortSignal): Promise<HistEvent[]> {
  let lastErr: unknown = null
  for (const make of ENDPOINTS) {
    try {
      const r = await fetch(make(mm, dd), { headers: { Accept: 'application/json' }, signal })
      if (!r.ok) { lastErr = new Error('status ' + r.status); continue }
      const j = await r.json()
      const events = parseEvents(j?.events)
      if (events.length) return events
      lastErr = new Error('empty')
    } catch (e) {
      if (signal.aborted) throw e
      lastErr = e
    }
  }
  throw lastErr || new Error('failed')
}

export default function OnThisDay() {
  const [events, setEvents] = useState<HistEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [highlight, setHighlight] = useState(0)
  const [prompt, setPrompt] = useState('')
  const [copied, setCopied] = useState('')
  const [saved, setSaved] = useState('')
  const acRef = useRef<AbortController | null>(null)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const now = new Date()
  const mm = pad(now.getMonth() + 1)
  const dd = pad(now.getDate())
  const dateLabel = `${now.getMonth() + 1}월 ${now.getDate()}일`

  function pickHighlight(list: HistEvent[]) {
    if (!list.length) return
    const idx = Math.floor(Math.random() * list.length)
    setHighlight(idx)
    setPrompt(PROMPTS[Math.floor(Math.random() * PROMPTS.length)](list[idx].year))
  }

  async function load() {
    acRef.current?.abort()
    const ac = new AbortController()
    acRef.current = ac
    setLoading(true); setErr(''); setEvents([])
    try {
      const list = await fetchEvents(mm, dd, ac.signal)
      if (ac.signal.aborted) return
      setEvents(list)
      pickHighlight(list)
    } catch (e) {
      if (ac.signal.aborted) return
      setErr('역사 사건을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.')
    } finally {
      if (!ac.signal.aborted) setLoading(false)
    }
  }

  useEffect(() => {
    load()
    return () => {
      acRef.current?.abort()
      if (copyTimer.current) clearTimeout(copyTimer.current)
      if (savedTimer.current) clearTimeout(savedTimer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function reshuffle() {
    pickHighlight(events)
  }

  function shufflePrompt() {
    if (events[highlight]) setPrompt(PROMPTS[Math.floor(Math.random() * PROMPTS.length)](events[highlight].year))
  }

  function copy(text: string, tag: string) {
    navigator.clipboard?.writeText(text).catch(() => {})
    setCopied(tag)
    if (copyTimer.current) clearTimeout(copyTimer.current)
    copyTimer.current = setTimeout(() => setCopied(''), 1200)
  }

  const hl = events[highlight]
  const bridge = hasProjectBridge()

  // 강조 사건 + 소재 질문을 자료 메모(HTML)로 변환
  function hlToBodyHtml(e: HistEvent, q: string): string {
    const yr = Number.isFinite(e.year) ? `${e.year}년` : '연도 미상'
    const parts: string[] = []
    parts.push('<p>📜 역사 속 오늘 (' + escHtml(dateLabel) + ')</p>')
    parts.push('<p><b>[' + escHtml(yr) + ']</b> ' + escHtml(e.text) + '</p>')
    if (q) parts.push('<p>✍️ 이 사건을 소재로: ' + escHtml(q) + '</p>')
    if (e.page) parts.push('<p>출처: <a href="' + escHtml(e.page) + '">위키백과</a></p>')
    return parts.join('\n')
  }

  // 현재 강조 중인 역사 사건과 소재 질문을 프로젝트 자료 바인더에 추가
  function addToProjectClick() {
    if (!bridge || !hl) return
    const yr = Number.isFinite(hl.year) ? `${hl.year}년` : '연도 미상'
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '소재',
      title: `역사 속 오늘 · ${dateLabel} (${yr})`,
      bodyHtml: hlToBodyHtml(hl, prompt),
      meta: hl.page ? { 출처: hl.page } : undefined,
    })
    if (id) {
      setSaved('프로젝트 자료 "소재" 폴더에 추가했습니다.')
      if (savedTimer.current) clearTimeout(savedTimer.current)
      savedTimer.current = setTimeout(() => setSaved(''), 2000)
    }
  }

  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, color: 'var(--text)' }
  const msg: React.CSSProperties = { color: 'var(--muted)', textAlign: 'center', padding: 30 }

  return (
    <div style={wrap}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 13, color: 'var(--muted)', flex: 1 }}>
          <Emoji e="📅"/> <b style={{ color: 'var(--text)' }}>{dateLabel}</b> · 오늘 일어난 역사에서 영감을 캐 보세요.
        </span>
        <button className="btn-primary" onClick={load} disabled={loading}>
          {loading ? '불러오는 중…' : '↻ 새로고침'}
        </button>
      </div>

      {hl && !loading && !err && (
        <div
          style={{
            background: 'var(--chrome-2)',
            border: '1px solid var(--accent)',
            borderRadius: 10,
            padding: 13,
          }}
        >
          <div style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600, marginBottom: 6 }}>
            <Emoji e="✨"/> 오늘의 강조 사건 · {Number.isFinite(hl.year) ? `${hl.year}년` : '연도 미상'}
          </div>
          <div style={{ fontSize: 14, lineHeight: 1.6 }}>{hl.text}</div>
          <div
            style={{
              marginTop: 10,
              paddingTop: 10,
              borderTop: '1px solid var(--border)',
              fontSize: 13,
              lineHeight: 1.6,
            }}
          >
            <span style={{ color: 'var(--ok)', fontWeight: 600 }}><Emoji e="✍️"/> 이 사건을 소재로</span>
            <div style={{ marginTop: 4 }}>{prompt}</div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            <button className="minibtn" onClick={reshuffle}><Emoji e="🎲"/> 다른 사건 강조</button>
            <button className="minibtn" onClick={shufflePrompt}><Emoji e="🔀"/> 다른 질문</button>
            <button
              className="minibtn"
              onClick={() => copy(`[${Number.isFinite(hl.year) ? hl.year + '년' : '연도 미상'}] ${hl.text}\n\n[글감] ${prompt}`, 'hl')}
            >
              {copied === 'hl' ? <>복사됨!</> : <><Emoji e="📋"/> 소재 복사</>}
            </button>
            <button
              className="linkbtn"
              onClick={addToProjectClick}
              disabled={!bridge || !hl}
              title={bridge ? '이 사건과 소재 질문을 프로젝트 자료로 추가' : '프로젝트에 연결되어 있지 않습니다'}
            >
              <Emoji e="📄"/> 프로젝트에 추가
            </button>
          </div>
          {saved && (
            <div style={{ marginTop: 8, fontSize: 12, color: 'var(--ok)', fontWeight: 600 }}>✓ {saved}</div>
          )}
        </div>
      )}

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          border: '1px solid var(--border)',
          borderRadius: 10,
          background: 'var(--paper)',
          padding: 12,
        }}
      >
        {loading && <div style={msg}>오늘의 역사 사건을 불러오는 중…</div>}

        {!loading && err && (
          <div style={msg}>
            <div style={{ fontSize: 28, marginBottom: 8 }}><Emoji e="📡"/></div>
            <div>{err}</div>
            <button className="minibtn" style={{ marginTop: 12 }} onClick={load}>다시 시도</button>
          </div>
        )}

        {!loading && !err && events.length === 0 && (
          <div style={msg}>오늘 날짜의 역사 사건이 없습니다.</div>
        )}

        {!loading && !err && events.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>
              총 {events.length}건 · 항목을 누르면 강조 사건으로 지정됩니다.
            </div>
            {events.map((e, i) => (
              <div
                key={i}
                onClick={() => { setHighlight(i); setPrompt(PROMPTS[Math.floor(Math.random() * PROMPTS.length)](e.year)) }}
                style={{
                  display: 'flex',
                  gap: 10,
                  padding: '8px 9px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  background: i === highlight ? 'var(--chrome-2)' : 'transparent',
                  border: i === highlight ? '1px solid var(--accent)' : '1px solid transparent',
                }}
              >
                <span style={{ flexShrink: 0, width: 48, color: 'var(--accent)', fontWeight: 600, fontSize: 13, textAlign: 'right' }}>
                  {Number.isFinite(e.year) ? e.year : '—'}
                </span>
                <span style={{ flex: 1, fontSize: 13, lineHeight: 1.55 }}>
                  {e.text}
                  {e.page && (
                    <a
                      href={e.page}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(ev) => ev.stopPropagation()}
                      style={{ marginLeft: 6, fontSize: 11, color: 'var(--accent)', textDecoration: 'none', whiteSpace: 'nowrap' }}
                    >
                      자세히 →
                    </a>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {!loading && !err && events.length > 0 && (
        <button
          className="minibtn"
          onClick={() => copy(
            `📜 역사 속 오늘 (${dateLabel})\n\n` +
            events.map((e) => `· ${Number.isFinite(e.year) ? e.year + '년' : '연도 미상'}: ${e.text}`).join('\n'),
            'all'
          )}
        >
          {copied === 'all' ? <>복사됨!</> : <><Emoji e="📋"/> 전체 목록 복사</>}
        </button>
      )}
    </div>
  )
}
