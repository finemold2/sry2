// 오늘의 명언 일력 — 날짜로 고정되는(=매일 바뀌지만 그날 안에서는 변하지 않는) 명언 한 장.
//  · 날짜를 시드로 한 결정적 선택: 같은 날엔 누가 언제 열어도 같은 명언(일력처럼). 자정이 지나면 다음 장.
//  · 온라인(키없음·CORS) quotable.io 에서 그날의 풀을 풍성하게 보강하되, 실패하면 내장 공용·CC0 명언 풀로 폴백(절대 안 깨짐).
//  · 제사(에피그래프)용 복사: 따옴표/저자 표기/대시 스타일을 골라 원고 첫머리에 붙이기 좋은 형태로.
//  · 글감 스니펫 저장(addToLibrary 'snippets'), 프로젝트 자료〈인용〉 추가(addToProject), 수집함 담기(addToStash), 즐겨찾기.
//  · 앞/뒤 날짜로 넘기는 일력, 최근 7장 미리보기 스트립, 즐겨찾기 보관함, 자정 자동 넘김.
// react 와 './linkbus' 외 import 금지. 영속 localStorage 'sry:tool:quote-of-day'.
import { useState, useEffect, useRef } from 'react'
import { addToLibrary, addToProject, hasProjectBridge, addToStash, hasStash, Emoji } from './linkbus'

export const meta = { id: 'quote-of-day', name: '오늘의 명언 일력', icon: '📅', group: '영감·발상', intro: '날짜로 고정되는 오늘의 명언 한 장 — 제사·글감으로', w: 460, h: 600 }

interface Quote { text: string; author: string; src?: string }
type Lang = 'ko' | 'en'

// ───────────────────── 내장 공용 명언 풀 ─────────────────────
// 모두 공유저작물(PD) 또는 출처가 분명한 짧은 인용. 온라인이 막혀도 일력이 매일 다른 장을 보여주도록 넉넉히.
const POOL_KO: Quote[] = [
  { text: '시작이 반이다.', author: '아리스토텔레스' },
  { text: '천 리 길도 한 걸음부터.', author: '노자' },
  { text: '아는 것이 힘이다.', author: '프랜시스 베이컨' },
  { text: '나는 생각한다, 고로 존재한다.', author: '르네 데카르트' },
  { text: '인생은 가까이서 보면 비극이지만 멀리서 보면 희극이다.', author: '찰리 채플린' },
  { text: '오늘 할 수 있는 일에 전력을 다하라. 그러면 내일은 한 걸음 더 진보한다.', author: '아이작 뉴턴' },
  { text: '미래를 예측하는 가장 좋은 방법은 미래를 창조하는 것이다.', author: '피터 드러커' },
  { text: '행복은 습관이다. 그것을 몸에 지녀라.', author: '엘버트 허버드' },
  { text: '실패는 성공의 어머니다.', author: '토머스 에디슨' },
  { text: '가장 어두운 밤도 끝나고 해는 떠오른다.', author: '빅토르 위고' },
  { text: '펜은 칼보다 강하다.', author: '에드워드 불워리턴' },
  { text: '책은 가장 조용하고 변함없는 친구다.', author: '찰스 W. 엘리엇' },
  { text: '말은 행동의 그림자다.', author: '데모크리토스' },
  { text: '한 권의 책을 읽음으로써 자신의 삶에서 새 시대를 본 사람이 많다.', author: '헨리 데이비드 소로' },
  { text: '글을 잘 쓰려면 먼저 잘 살아야 한다.', author: '괴테' },
  { text: '쉽게 쓴 글은 대개 어렵게 읽힌다.', author: '새뮤얼 존슨' },
  { text: '진실은 시보다 낯설다.', author: '바이런' },
  { text: '용기란 두려움이 없는 것이 아니라 두려움보다 더 중요한 것이 있다는 판단이다.', author: '앰브로즈 레드문' },
  { text: '습관은 처음엔 거미줄 같지만 나중엔 쇠줄이 된다.', author: '스페인 속담' },
  { text: '인내는 쓰지만 그 열매는 달다.', author: '장자크 루소' },
  { text: '위대한 일은 작은 일들이 모여 이루어진다.', author: '빈센트 반 고흐' },
  { text: '의심은 불쾌하지만 확신은 어리석다.', author: '볼테르' },
  { text: '자연을 깊이 들여다보라. 그러면 모든 것을 더 잘 이해하게 될 것이다.', author: '알베르트 아인슈타인' },
  { text: '아름다움은 보는 이의 눈에 있다.', author: '마거릿 울프 헝거포드' },
  { text: '시간은 가장 현명한 조언자다.', author: '페리클레스' },
  { text: '말하기 전에 들어라. 그것이 지혜의 시작이다.', author: '솔로몬' },
  { text: '자기 자신을 아는 것이 모든 지혜의 시작이다.', author: '아리스토텔레스' },
  { text: '하루하루를 마지막 날처럼 살라. 언젠가는 정말 그렇게 될 것이다.', author: '마르쿠스 아우렐리우스' },
  { text: '운명은 용기 있는 자를 돕는다.', author: '베르길리우스' },
  { text: '작은 친절, 작은 사랑의 행동들이 이 땅을 천국으로 만든다.', author: '윌리엄 워즈워스' },
  { text: '강물은 바위와 다투지 않고 길을 낸다.', author: '노자' },
  { text: '생각하는 대로 살지 않으면 사는 대로 생각하게 된다.', author: '폴 부르제' },
]

const POOL_EN: Quote[] = [
  { text: 'The only way to do great work is to love what you do.', author: 'Steve Jobs' },
  { text: 'Whatever you can do, or dream you can, begin it.', author: 'Goethe' },
  { text: 'A word after a word after a word is power.', author: 'Margaret Atwood' },
  { text: 'There is no friend as loyal as a book.', author: 'Ernest Hemingway' },
  { text: 'The first draft of anything is garbage.', author: 'Ernest Hemingway' },
  { text: 'You can make anything by writing.', author: 'C. S. Lewis' },
  { text: 'We write to taste life twice, in the moment and in retrospect.', author: 'Anaïs Nin' },
  { text: 'Either write something worth reading or do something worth writing.', author: 'Benjamin Franklin' },
  { text: 'The scariest moment is always just before you start.', author: 'Stephen King' },
  { text: 'Fill your paper with the breathings of your heart.', author: 'William Wordsworth' },
  { text: 'Tears are words that need to be written.', author: 'Paulo Coelho' },
  { text: 'A reader lives a thousand lives before he dies.', author: 'George R. R. Martin' },
  { text: 'The art of writing is the art of discovering what you believe.', author: 'Gustave Flaubert' },
  { text: 'If a story is in you, it has to come out.', author: 'William Faulkner' },
  { text: 'Start writing, no matter what. The water does not flow until the faucet is turned on.', author: 'Louis L’Amour' },
]

// ───────────────────── 날짜 유틸 ─────────────────────
function dateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
function parseKey(k: string): Date {
  const [y, m, d] = k.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}
function addDays(k: string, n: number): string {
  const d = parseKey(k); d.setDate(d.getDate() + n); return dateKey(d)
}
function isToday(k: string): boolean { return k === dateKey(new Date()) }
function isFutureDay(k: string): boolean { return parseKey(k).getTime() > parseKey(dateKey(new Date())).getTime() }
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']
function prettyDate(k: string): { big: string; sub: string; wd: string } {
  const d = parseKey(k)
  return { big: String(d.getDate()), sub: `${d.getFullYear()}년 ${d.getMonth() + 1}월`, wd: WEEKDAYS[d.getDay()] + '요일' }
}

// 날짜 문자열 → 안정적 해시(시드). 같은 날짜면 항상 같은 값 → 일력처럼 결정적 선택.
function hashKey(k: string): number {
  let h = 2166136261
  for (let i = 0; i < k.length; i++) {
    h ^= k.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}
// 시드에서 풀의 한 항목을 결정적으로 뽑는다(언어별로 서로 다른 회전값을 주어 ko/en 이 같은 자리만 보지 않게).
function pickFromPool(pool: Quote[], k: string, salt: number): Quote {
  if (pool.length === 0) return { text: '오늘도 한 문장을 써 보세요.', author: '오늘의 일력' }
  const h = (hashKey(k) ^ Math.imul(salt, 2654435761)) >>> 0
  return pool[h % pool.length]
}

// ───────────────────── 온라인 보강(키없음·CORS) ─────────────────────
// quotable.io 에서 그날의 시드로 결정적 인덱스를 골라 한 문장만 가져온다(매일 다른 장, 같은 날엔 같은 장).
async function fetchOnline(k: string, signal: AbortSignal): Promise<Quote> {
  // 1) 전체 개수 파악 → 시드로 페이지/항목을 골라 결정적으로 한 개만.
  const head = await fetch('https://api.quotable.io/quotes?limit=1&maxLength=160', { signal })
  if (!head.ok) throw new Error('quotable head ' + head.status)
  const hj = await head.json()
  const total = Math.max(1, Math.min(2000, Number(hj?.totalCount) || 0))
  if (!total) throw new Error('quotable empty total')
  const idx = hashKey(k) % total
  const page = Math.floor(idx / 20) + 1
  const r = await fetch(`https://api.quotable.io/quotes?limit=20&page=${page}&maxLength=160`, { signal })
  if (!r.ok) throw new Error('quotable page ' + r.status)
  const j = await r.json()
  const results: { content?: string; author?: string }[] = Array.isArray(j?.results) ? j.results : []
  if (results.length === 0) throw new Error('quotable no results')
  const pick = results[hashKey(k + '#') % results.length]
  if (!pick?.content) throw new Error('quotable bad item')
  return { text: String(pick.content), author: String(pick.author || '미상'), src: 'quotable.io' }
}

// ───────────────────── 영속 ─────────────────────
const STORE_KEY = 'sry:tool:quote-of-day'
interface Persist {
  lang: Lang
  online: boolean
  quoteStyle: '“”' | '"' | '〈〉' | ''
  showAuthor: boolean
  favorites: { id: string; date: string; text: string; author: string }[]
  cache: Record<string, Quote> // 날짜키 → 온라인으로 확정된 명언(다시 열 때 같은 장 유지)
}
function loadPersist(): Persist {
  const base: Persist = { lang: 'ko', online: true, quoteStyle: '“”', showAuthor: true, favorites: [], cache: {} }
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (raw) {
      const p = JSON.parse(raw)
      return {
        lang: p.lang === 'en' ? 'en' : 'ko',
        online: p.online !== false,
        quoteStyle: ['“”', '"', '〈〉', ''].includes(p.quoteStyle) ? p.quoteStyle : '“”',
        showAuthor: p.showAuthor !== false,
        favorites: Array.isArray(p.favorites) ? p.favorites.slice(0, 200) : [],
        cache: p.cache && typeof p.cache === 'object' ? p.cache : {},
      }
    }
  } catch { /* 무시 */ }
  return base
}

function escapeHtml(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
function wrapQuote(text: string, style: Persist['quoteStyle']): string {
  if (style === '“”') return `“${text}”`
  if (style === '"') return `"${text}"`
  if (style === '〈〉') return `〈${text}〉`
  return text
}
function epigraph(q: Quote, style: Persist['quoteStyle'], showAuthor: boolean): string {
  const body = wrapQuote(q.text, style)
  return showAuthor ? `${body}\n— ${q.author}` : body
}

export default function QuoteOfDay({ payload }: { payload?: Record<string, unknown> }) {
  const [persist, setPersist] = useState<Persist>(loadPersist)
  const [cur, setCur] = useState<string>(() => dateKey(new Date()))
  const [quote, setQuote] = useState<Quote | null>(null)
  const [loading, setLoading] = useState(false)
  const [usedFallback, setUsedFallback] = useState(false)
  const [toast, setToast] = useState('')
  const [copied, setCopied] = useState('')
  const [showFav, setShowFav] = useState(false)
  const [flip, setFlip] = useState(0) // 일력 넘김 애니메이션 트리거

  const nonceRef = useRef(0)
  const mountedRef = useRef(true)
  const abortRef = useRef<AbortController | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const midnightTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { lang, online, quoteStyle, showAuthor, favorites, cache } = persist

  // 영속 저장(파생 상태인 cur/quote 는 저장하지 않음 — 매일 결정적으로 다시 계산)
  useEffect(() => {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(persist)) } catch { /* 무시 */ }
  }, [persist])

  // payload.date 가 오면 그 날짜로 점프(연계 진입)
  useEffect(() => {
    const pd = payload?.date
    if (typeof pd === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(pd)) setCur(pd)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload])

  // 자정이 지나면 '오늘' 보고 있을 때 자동으로 다음 장으로.
  useEffect(() => {
    function scheduleMidnight() {
      if (midnightTimer.current) clearTimeout(midnightTimer.current)
      const now = new Date()
      const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 2)
      const ms = Math.max(1000, next.getTime() - now.getTime())
      midnightTimer.current = setTimeout(() => {
        if (!mountedRef.current) return
        setCur((c) => (isToday(c) || c === dateKey(new Date(Date.now() - 86400000)) ? dateKey(new Date()) : c))
        scheduleMidnight()
      }, ms)
    }
    scheduleMidnight()
    return () => { if (midnightTimer.current) clearTimeout(midnightTimer.current) }
  }, [])

  // 날짜/언어/온라인 토글이 바뀌면 그 날의 명언을 결정적으로 확정.
  useEffect(() => {
    mountedRef.current = true
    const my = ++nonceRef.current
    setUsedFallback(false)

    // 로컬 결정적 선택을 먼저 즉시 표시(깜빡임 없는 일력)
    const localPick = lang === 'en'
      ? pickFromPool(POOL_EN, cur, 11)
      : pickFromPool(POOL_KO, cur, 7)

    // 이미 온라인으로 확정해 둔 캐시가 있으면 그걸 우선(같은 날 다시 열어도 같은 장).
    const cacheKey = `${lang}:${cur}`
    if (online && cache[cacheKey]) {
      setQuote(cache[cacheKey]); setLoading(false); return
    }
    setQuote(localPick)

    // 한국어 풀은 자체 충실하므로 온라인 보강은 영어(quotable 은 영문)일 때만 시도.
    if (!online || lang !== 'en') { setLoading(false); return }

    setLoading(true)
    const ac = new AbortController()
    abortRef.current?.abort()
    abortRef.current = ac
    fetchOnline(cur, ac.signal)
      .then((q) => {
        if (my !== nonceRef.current || !mountedRef.current) return
        setQuote(q)
        setPersist((p) => ({ ...p, cache: { ...p.cache, [cacheKey]: q } }))
      })
      .catch(() => {
        if (my !== nonceRef.current || !mountedRef.current) return
        setUsedFallback(true) // 내장 풀(이미 표시 중)로 유지
      })
      .finally(() => {
        if (my === nonceRef.current && mountedRef.current) setLoading(false)
      })
    return () => { ac.abort() }
  }, [cur, lang, online]) // eslint-disable-line react-hooks/exhaustive-deps

  // 언마운트 정리(타이머·요청·리스너)
  useEffect(() => {
    return () => {
      mountedRef.current = false
      nonceRef.current++
      abortRef.current?.abort()
      if (toastTimer.current) clearTimeout(toastTimer.current)
      if (copyTimer.current) clearTimeout(copyTimer.current)
      if (midnightTimer.current) clearTimeout(midnightTimer.current)
    }
  }, [])

  function flash(msg: string) {
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => { if (mountedRef.current) setToast('') }, 2000)
  }
  function flagCopied(key: string) {
    setCopied(key)
    if (copyTimer.current) clearTimeout(copyTimer.current)
    copyTimer.current = setTimeout(() => { if (mountedRef.current) setCopied('') }, 1500)
  }

  function go(n: number) {
    if (n > 0 && isToday(cur)) { flash('미래의 장은 아직 펼칠 수 없어요.'); return }
    setFlip((f) => f + (n > 0 ? 1 : -1))
    setCur((c) => addDays(c, n))
  }
  function goToday() { setFlip((f) => f + 1); setCur(dateKey(new Date())) }

  async function copyText(text: string, key: string) {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        const ta = document.createElement('textarea')
        ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
      }
      flagCopied(key)
    } catch { flash('복사에 실패했어요. 직접 선택해 복사해 주세요.') }
  }

  function copyEpigraph() {
    if (!quote) return
    copyText(epigraph(quote, quoteStyle, showAuthor), 'epi')
  }

  // 글감 스니펫 라이브러리에 저장(여러 도구가 공유).
  function saveSnippet() {
    if (!quote) return
    addToLibrary('snippets', {
      text: epigraph(quote, quoteStyle, showAuthor),
      source: `오늘의 명언 일력 · ${cur}`,
      tags: ['명언', '인용', '제사', quote.author].filter(Boolean) as string[],
    })
    flash('글감 스니펫 라이브러리에 저장했어요.')
  }

  // 프로젝트 바인더 자료〈인용〉에 추가.
  function toProject() {
    if (!quote || !hasProjectBridge()) return
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '인용',
      title: `${wrapQuote(quote.text, quoteStyle)} — ${quote.author}`,
      bodyHtml: `<blockquote style="margin:0 0 12px;line-height:1.7;font-style:italic;">${escapeHtml(wrapQuote(quote.text, quoteStyle))}</blockquote><p style="color:#888;">— ${escapeHtml(quote.author)}</p>`,
      meta: { 저자: quote.author, 날짜: cur, 출처: quote.src || '내장 명언 풀' },
    })
    flash(id ? '프로젝트 자료〈인용〉에 추가했어요.' : '프로젝트에 추가하지 못했어요.')
  }

  // 수집함에 담기.
  function toStash() {
    if (!quote || !hasStash()) { flash('수집함에 연결되어 있지 않아요.'); return }
    addToStash({ kind: 'note', label: `명언 · ${quote.author}`, text: epigraph(quote, quoteStyle, showAuthor) })
    flash('수집함에 담았어요.')
  }

  // 즐겨찾기 토글.
  const favId = quote ? `${cur}::${quote.text}` : ''
  const isFav = !!quote && favorites.some((f) => f.id === favId)
  function toggleFav() {
    if (!quote) return
    setPersist((p) => {
      const exists = p.favorites.some((f) => f.id === favId)
      if (exists) return { ...p, favorites: p.favorites.filter((f) => f.id !== favId) }
      return { ...p, favorites: [{ id: favId, date: cur, text: quote.text, author: quote.author }, ...p.favorites].slice(0, 200) }
    })
  }
  function removeFav(id: string) {
    setPersist((p) => ({ ...p, favorites: p.favorites.filter((f) => f.id !== id) }))
  }

  // 최근 7일 미리보기(오늘 포함, 과거로). 각 날짜의 로컬 결정적 명언을 보여줌.
  const recent: { key: string; q: Quote }[] = []
  {
    let k = dateKey(new Date())
    for (let i = 0; i < 7; i++) {
      const q = lang === 'en' ? pickFromPool(POOL_EN, k, 11) : pickFromPool(POOL_KO, k, 7)
      recent.push({ key: k, q })
      k = addDays(k, -1)
    }
  }

  const pretty = prettyDate(cur)

  // ───────────────────── 스타일 ─────────────────────
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', fontFamily: 'inherit', boxSizing: 'border-box', overflow: 'hidden' }
  const head: React.CSSProperties = { flex: '0 0 auto', padding: '10px 12px', borderBottom: '1px solid var(--border)', background: 'var(--chrome-2)', display: 'flex', alignItems: 'center', gap: 8 }
  const body: React.CSSProperties = { flex: '1 1 auto', overflow: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }
  const pill = (active: boolean): React.CSSProperties => ({ cursor: 'pointer', borderRadius: 999, padding: '4px 10px', fontSize: 12, border: active ? '1px solid var(--accent)' : '1px solid var(--border)', background: active ? 'var(--accent)' : 'var(--panel)', color: active ? '#fff' : 'var(--text)' })

  // 일력 카드 — 윗부분에 날짜(찢는 종이 느낌), 아래 명언.
  const cal: React.CSSProperties = { background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.10)', display: 'flex', flexDirection: 'column' }
  const calTop: React.CSSProperties = { background: 'linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 70%, #000 30%))', color: '#fff', padding: '12px 16px 14px', position: 'relative' }
  const calDay: React.CSSProperties = { fontSize: 46, fontWeight: 800, lineHeight: 1, letterSpacing: -1 }
  const calSub: React.CSSProperties = { fontSize: 12.5, opacity: 0.92, marginTop: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }
  const calBody: React.CSSProperties = { padding: '20px 18px 18px', display: 'flex', flexDirection: 'column', gap: 14, minHeight: 168, justifyContent: 'center' }
  const qStyle: React.CSSProperties = { fontSize: 20, lineHeight: 1.6, fontWeight: 600, wordBreak: 'keep-all', fontStyle: 'normal' }
  const aStyle: React.CSSProperties = { color: 'var(--muted)', fontSize: 14, textAlign: 'right' }
  const navBtn: React.CSSProperties = { cursor: 'pointer', borderRadius: 8, padding: '4px 10px', fontSize: 13 }
  const hint: React.CSSProperties = { color: 'var(--muted)', fontSize: 12, lineHeight: 1.6 }

  return (
    <div style={wrap}>
      {/* 헤더: 언어/온라인 토글 + 즐겨찾기 */}
      <div style={head}>
        <button className="minibtn" style={pill(lang === 'ko')} onClick={() => setPersist((p) => ({ ...p, lang: 'ko' }))}>한국어</button>
        <button className="minibtn" style={pill(lang === 'en')} onClick={() => setPersist((p) => ({ ...p, lang: 'en' }))}>English</button>
        <button
          className="minibtn"
          style={pill(online)}
          onClick={() => setPersist((p) => ({ ...p, online: !p.online }))}
          title={lang === 'en' ? '영어 명언을 quotable.io(키없음)에서 보강' : '온라인 보강(영어 명언일 때 적용)'}
        >
          {online ? <><Emoji e="🌐"/> 온라인 보강 켜짐</> : <><Emoji e="📴"/> 내장 풀만</>}
        </button>
        <div style={{ flex: 1 }} />
        <button className="minibtn" style={{ ...navBtn, color: showFav ? 'var(--accent)' : undefined }} onClick={() => setShowFav((s) => !s)} title="즐겨찾기 보관함">
          <Emoji e="⭐"/> {favorites.length}
        </button>
      </div>

      <div style={body}>
        {/* 일력 카드 */}
        <div key={flip} style={cal} className="qod-flip">
          <div style={calTop}>
            <div style={calDay}>{pretty.big}</div>
            <div style={calSub}>
              <span>{pretty.sub} · {pretty.wd}</span>
              <span>{isToday(cur) ? '오늘' : ''}</span>
            </div>
          </div>
          <div style={calBody}>
            {loading && !quote && <div style={{ textAlign: 'center', color: 'var(--muted)' }}>명언을 펼치는 중…</div>}
            {quote && (
              <>
                <div style={qStyle}>{wrapQuote(quote.text, quoteStyle)}</div>
                {showAuthor && <div style={aStyle}>— {quote.author}</div>}
              </>
            )}
            {!quote && !loading && <div style={{ textAlign: 'center', color: 'var(--muted)' }}>명언이 없습니다.</div>}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                {quote?.src ? `출처: ${quote.src}` : '내장 명언 풀'}
                {loading && quote ? ' · 보강 중…' : ''}
              </span>
              <button className="minibtn" onClick={toggleFav} disabled={!quote} title="즐겨찾기" style={{ cursor: 'pointer', border: 'none', background: 'transparent', fontSize: 18, padding: 0, color: isFav ? 'var(--accent)' : 'var(--muted)' }}>
                {isFav ? '★' : '☆'}
              </button>
            </div>
          </div>
        </div>

        {usedFallback && (
          <div style={{ ...hint, color: 'var(--accent)' }}>온라인 명언을 불러오지 못해 내장 명언 풀로 보여드려요.</div>
        )}

        {/* 일력 넘김 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="minibtn" style={navBtn} onClick={() => go(-1)}>◀ 어제</button>
          <button className="minibtn" style={navBtn} onClick={goToday} disabled={isToday(cur)}>오늘로</button>
          <button className="minibtn" style={navBtn} onClick={() => go(1)} disabled={isToday(cur) || isFutureDay(cur)}>내일 ▶</button>
        </div>

        {/* 제사(에피그래프) 스타일 옵션 + 미리보기 */}
        <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 12, background: 'var(--panel)', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>제사(에피그래프) 형식</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            {([['“”', '“ ”'], ['"', '" "'], ['〈〉', '〈 〉'], ['', '따옴표 없음']] as [Persist['quoteStyle'], string][]).map(([v, lbl]) => (
              <button key={lbl} className="minibtn" style={pill(quoteStyle === v)} onClick={() => setPersist((p) => ({ ...p, quoteStyle: v }))}>{lbl}</button>
            ))}
            <span style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 2px' }} />
            <button className="minibtn" style={pill(showAuthor)} onClick={() => setPersist((p) => ({ ...p, showAuthor: !p.showAuthor }))}>{showAuthor ? '저자 표기 ✓' : '저자 숨김'}</button>
          </div>
          {quote && (
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: 13.5, lineHeight: 1.7, color: 'var(--text)', background: 'var(--paper)', border: '1px dashed var(--border)', borderRadius: 8, padding: '10px 12px', fontStyle: 'italic' }}>
              {epigraph(quote, quoteStyle, showAuthor)}
            </pre>
          )}
        </div>

        {/* 액션 */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <button className="btn-primary" onClick={copyEpigraph} disabled={!quote}>{copied === 'epi' ? <><Emoji e="✅"/> 복사됨</> : <><Emoji e="📋"/> 제사로 복사</>}</button>
          <button className="minibtn" onClick={saveSnippet} disabled={!quote}><Emoji e="✍️"/> 글감 저장</button>
          <button className="linkbtn" onClick={toProject} disabled={!quote || !hasProjectBridge()} title={hasProjectBridge() ? '프로젝트 자료〈인용〉에 추가' : '프로젝트에 연결되어 있지 않습니다'}><Emoji e="📄"/> 프로젝트에 추가</button>
          {hasStash() && <button className="linkbtn" onClick={toStash} disabled={!quote}><Emoji e="📥"/> 수집함</button>}
        </div>

        {toast && (
          <div style={{ fontSize: 12.5, color: 'var(--accent)', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px', textAlign: 'center' }}>{toast}</div>
        )}

        {/* 즐겨찾기 보관함 */}
        {showFav && (
          <div style={{ border: '1px solid var(--border)', borderRadius: 10, background: 'var(--panel)' }}>
            <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', fontSize: 13, fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span><Emoji e="⭐"/> 즐겨찾기 ({favorites.length})</span>
              {favorites.length > 0 && (
                <button className="minibtn" onClick={() => copyText(favorites.map((f) => epigraph({ text: f.text, author: f.author }, quoteStyle, showAuthor)).join('\n\n'), 'favall')} style={{ fontSize: 11, padding: '3px 8px' }}>
                  {copied === 'favall' ? '✓ 전체 복사됨' : '전체 복사'}
                </button>
              )}
            </div>
            {favorites.length === 0 ? (
              <div style={{ padding: '16px 12px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>★ 를 눌러 마음에 드는 명언을 모아 보세요.</div>
            ) : (
              <div style={{ maxHeight: 220, overflow: 'auto', padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {favorites.map((f) => (
                  <div key={f.id} style={{ padding: 10, borderRadius: 8, background: 'var(--paper)', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 13.5, lineHeight: 1.55 }}>{wrapQuote(f.text, quoteStyle)}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, gap: 8 }}>
                      <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>— {f.author} · {f.date}</span>
                      <span style={{ display: 'flex', gap: 4, flex: '0 0 auto' }}>
                        <button className="minibtn" style={{ fontSize: 11, padding: '2px 7px' }} onClick={() => setCur(f.date)} title="이 날짜로 이동"><Emoji e="📅"/></button>
                        <button className="minibtn" style={{ fontSize: 11, padding: '2px 7px' }} onClick={() => copyText(epigraph({ text: f.text, author: f.author }, quoteStyle, showAuthor), 'f' + f.id)}>{copied === 'f' + f.id ? '✓' : '복사'}</button>
                        <button className="minibtn" style={{ fontSize: 11, padding: '2px 7px' }} onClick={() => removeFav(f.id)} title="삭제"><Emoji e="🗑"/></button>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 최근 7장 미리보기 스트립 */}
        <div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>최근 7장</div>
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
            {recent.map(({ key, q }) => {
              const p = prettyDate(key)
              const active = key === cur
              return (
                <button
                  key={key}
                  className="minibtn"
                  onClick={() => setCur(key)}
                  title={`${wrapQuote(q.text, quoteStyle)} — ${q.author}`}
                  style={{ flex: '0 0 auto', width: 84, textAlign: 'left', borderRadius: 8, padding: 8, border: active ? '1px solid var(--accent)' : '1px solid var(--border)', background: active ? 'color-mix(in srgb, var(--accent) 14%, var(--panel))' : 'var(--panel)', color: 'var(--text)', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 4 }}
                >
                  <span style={{ fontSize: 16, fontWeight: 700, lineHeight: 1 }}>{p.big}<span style={{ fontSize: 10, fontWeight: 400, color: 'var(--muted)' }}> {p.wd[0]}</span></span>
                  <span style={{ fontSize: 10.5, lineHeight: 1.35, color: 'var(--muted)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>{q.text}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div style={hint}>
          일력은 날짜로 고정됩니다 — 같은 날엔 언제 열어도 같은 명언이고, 자정이 지나면 다음 장으로 넘어가요.
          마음에 든 문장은 ★로 모으고, 제사(에피그래프) 형식을 골라 원고 첫머리에 복사해 보세요.
        </div>
      </div>

      {/* 일력 넘김 애니메이션(미지원 환경에서도 무해) */}
      <style>{`
        .qod-flip { animation: qodFlip .28s ease; transform-origin: top center; }
        @keyframes qodFlip { from { opacity: .35; transform: perspective(700px) rotateX(-12deg) translateY(-6px); } to { opacity: 1; transform: none; } }
        @media (prefers-reduced-motion: reduce) { .qod-flip { animation: none; } }
      `}</style>
    </div>
  )
}
