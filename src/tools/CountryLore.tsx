// 국가·문화 배경 자료 — 무료·키 없는 공개 API(restcountries.com)로 나라의 수도/지역/언어/통화/인구를 가져와 배경 설정 자료로 쓴다.
// restcountries.com/v3.1 : 키 불필요·https·CORS 허용. 검색 또는 무작위로 한 나라를 뽑아 글의 무대 설정에 활용.
import { useEffect, useRef, useState } from 'react'
import { addToProject, hasProjectBridge, Emoji } from './linkbus'

export const meta = { id: 'country-lore', name: '국가·문화 배경 자료', icon: '🌍', group: '리서치·자료', intro: '나라의 수도·언어·통화로 무대 배경을 설정하세요', w: 420, h: 560 }

interface Country {
  name: string
  official: string
  capital: string
  region: string
  subregion: string
  languages: string[]
  currencies: string[]
  population: string
  flag: string
}

const SEEDS = ['france', 'japan', 'brazil', 'egypt', 'iceland', 'morocco', 'peru', 'india', 'norway', 'kenya', 'mexico', 'vietnam', 'turkey', 'greece', 'mongolia', 'chile', 'finland', 'nepal', 'cuba', 'tunisia']

const PROMPTS = [
  '이 나라의 수도를 무대로 한 이야기의 첫 장면을 상상해 보세요.',
  '주인공이 이 나라의 언어를 처음 듣는 순간을 묘사해 보세요.',
  '이 통화로 물건을 사는 장면 하나를 써보세요. 무엇을, 왜?',
  '이 지역의 날씨·풍경·냄새를 한 문단으로 그려보세요.',
  '이 나라에서 온 인물의 말투·습관을 한 가지 정해보세요.',
  '여행자가 이 나라에서 길을 잃었습니다. 무슨 일이 벌어질까요?',
  '이 나라의 역사 한 조각을 상상해 작품 배경으로 깔아보세요.',
  '이 나라를 떠나야만 했던 인물의 사연을 한 줄로 써보세요.',
]

function parseCountry(c: Record<string, any>): Country {
  const langs = c.languages ? Object.values(c.languages) as string[] : []
  const curr = c.currencies
    ? Object.values(c.currencies).map((x: any) => `${x?.name || '?'}${x?.symbol ? ` (${x.symbol})` : ''}`)
    : []
  return {
    name: c.name?.common || '이름 미상',
    official: c.name?.official || '',
    capital: Array.isArray(c.capital) && c.capital.length ? c.capital.join(', ') : '—',
    region: c.region || '—',
    subregion: c.subregion || '',
    languages: langs,
    currencies: curr,
    population: typeof c.population === 'number' ? c.population.toLocaleString('ko-KR') : '—',
    flag: c.flag || '🏳️',
  }
}

const FIELDS = 'name,capital,region,subregion,languages,currencies,population,flag'

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

async function fetchByName(q: string): Promise<Country> {
  const r = await fetch(`https://restcountries.com/v3.1/name/${encodeURIComponent(q)}?fields=${FIELDS}`)
  if (!r.ok) throw new Error('not found')
  const j = await r.json()
  if (!Array.isArray(j) || !j.length) throw new Error('empty')
  return parseCountry(j[0])
}

async function fetchRandom(): Promise<Country> {
  const seed = SEEDS[Math.floor(Math.random() * SEEDS.length)]
  const r = await fetch(`https://restcountries.com/v3.1/name/${seed}?fields=${FIELDS}`)
  if (!r.ok) throw new Error('not found')
  const j = await r.json()
  if (!Array.isArray(j) || !j.length) throw new Error('empty')
  return parseCountry(j[Math.floor(Math.random() * j.length)])
}

export default function CountryLore() {
  const [country, setCountry] = useState<Country | null>(null)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [prompt, setPrompt] = useState(PROMPTS[0])
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState('')
  const nonce = useRef(0)
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => { if (savedTimer.current) clearTimeout(savedTimer.current) }, [])

  const bridge = hasProjectBridge()

  const run = async (fn: () => Promise<Country>, notFoundMsg: string) => {
    const my = ++nonce.current
    setLoading(true); setErr(''); setCopied(false)
    try {
      const c = await fn()
      if (my === nonce.current) { setCountry(c); setPrompt(PROMPTS[Math.floor(Math.random() * PROMPTS.length)]) }
    } catch {
      if (my === nonce.current) setErr(notFoundMsg)
    } finally {
      if (my === nonce.current) setLoading(false)
    }
  }

  const search = () => {
    const q = query.trim()
    if (!q) { setErr('나라 이름을 입력하세요. (예: japan, 또는 한국→korea)'); return }
    run(() => fetchByName(q), `'${q}'에 해당하는 나라를 찾지 못했습니다. 영어 이름으로 시도해 보세요.`)
  }
  const random = () => run(fetchRandom, '불러오지 못했습니다. 다시 시도하세요.')

  useEffect(() => { random() /* eslint-disable-next-line */ }, [])

  const buildText = (c: Country) =>
    `🌍 ${c.name}${c.official ? ` (${c.official})` : ''}\n` +
    `· 수도: ${c.capital}\n` +
    `· 지역: ${c.region}${c.subregion ? ` / ${c.subregion}` : ''}\n` +
    `· 언어: ${c.languages.length ? c.languages.join(', ') : '—'}\n` +
    `· 통화: ${c.currencies.length ? c.currencies.join(', ') : '—'}\n` +
    `· 인구: ${c.population}`

  const copy = () => {
    if (!country) return
    navigator.clipboard?.writeText(buildText(country) + `\n\n[글감] ${prompt}`).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 1500)
    }).catch(() => {})
  }

  // 현재 국가 자료를 자료 메모(HTML)로 변환 — &,<,> escape 필수
  const buildBodyHtml = (c: Country, q: string): string => {
    const parts: string[] = []
    parts.push('<p>🌍 <b>' + escHtml(c.name) + '</b>' + (c.official ? ' (' + escHtml(c.official) + ')' : '') + '</p>')
    parts.push('<p>· 수도: ' + escHtml(c.capital) + '</p>')
    parts.push('<p>· 지역: ' + escHtml(c.region) + (c.subregion ? ' / ' + escHtml(c.subregion) : '') + '</p>')
    parts.push('<p>· 언어: ' + escHtml(c.languages.length ? c.languages.join(', ') : '—') + '</p>')
    parts.push('<p>· 통화: ' + escHtml(c.currencies.length ? c.currencies.join(', ') : '—') + '</p>')
    parts.push('<p>· 인구: ' + escHtml(c.population) + '</p>')
    if (q) parts.push('<p>✏️ 글감: ' + escHtml(q) + '</p>')
    return parts.join('\n')
  }

  // 현재 국가 자료를 프로젝트 자료 바인더("자료조사" 폴더)에 추가
  const addToProjectClick = () => {
    if (!bridge || !country) return
    const meta: Record<string, string> = {
      수도: country.capital,
      지역: country.region + (country.subregion ? ` / ${country.subregion}` : ''),
      언어: country.languages.length ? country.languages.join(', ') : '—',
      통화: country.currencies.length ? country.currencies.join(', ') : '—',
      인구: country.population,
    }
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '자료조사',
      title: `국가 자료 · ${country.name}`,
      bodyHtml: buildBodyHtml(country, prompt),
      meta,
    })
    if (id) {
      setSaved('프로젝트 자료 "자료조사" 폴더에 추가했습니다.')
      if (savedTimer.current) clearTimeout(savedTimer.current)
      savedTimer.current = setTimeout(() => setSaved(''), 2000)
    }
  }

  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 12, boxSizing: 'border-box', color: 'var(--text)' }
  const card: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 10, padding: 14 }
  const msg: React.CSSProperties = { color: 'var(--muted)', textAlign: 'center', padding: '24px 8px', fontSize: 13 }
  const rowS: React.CSSProperties = { display: 'flex', gap: 8 }
  const inputS: React.CSSProperties = { flex: 1, padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--chrome-2)', color: 'var(--text)', fontSize: 13 }
  const factRow: React.CSSProperties = { display: 'flex', gap: 8, padding: '7px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }
  const factKey: React.CSSProperties = { width: 64, flexShrink: 0, color: 'var(--muted)' }
  const factVal: React.CSSProperties = { flex: 1, color: 'var(--text)' }

  return (
    <div style={wrap}>
      <div style={rowS}>
        <input
          style={inputS}
          placeholder="나라 이름 검색 (예: japan, brazil)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') search() }}
        />
        <button className="minibtn" onClick={search}><Emoji e="🔍"/> 검색</button>
      </div>

      <div style={card}>
        {loading && <div style={msg}>불러오는 중…</div>}
        {err && !loading && <div style={msg}>{err}</div>}
        {country && !loading && !err && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span style={{ fontSize: 36, lineHeight: 1 }}><Emoji e={country.flag}/></span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{country.name}</div>
                {country.official && <div style={{ fontSize: 11, color: 'var(--muted)' }}>{country.official}</div>}
              </div>
            </div>
            <div style={factRow}><span style={factKey}>수도</span><span style={factVal}>{country.capital}</span></div>
            <div style={factRow}><span style={factKey}>지역</span><span style={factVal}>{country.region}{country.subregion ? ` / ${country.subregion}` : ''}</span></div>
            <div style={factRow}><span style={factKey}>언어</span><span style={factVal}>{country.languages.length ? country.languages.join(', ') : '—'}</span></div>
            <div style={factRow}><span style={factKey}>통화</span><span style={factVal}>{country.currencies.length ? country.currencies.join(', ') : '—'}</span></div>
            <div style={{ ...factRow, borderBottom: 'none' }}><span style={factKey}>인구</span><span style={factVal}>{country.population}</span></div>
          </>
        )}
        {!country && !loading && !err && <div style={msg}>나라를 검색하거나 무작위로 가져오세요.</div>}
      </div>

      <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 11px', fontSize: 13, color: 'var(--text)' }}>
        <Emoji e="✏️"/> <b style={{ color: 'var(--accent)' }}>글감</b> · {prompt}
      </div>

      <div style={{ ...rowS, flexWrap: 'wrap' }}>
        <button className="btn-primary" style={{ flex: 1 }} onClick={random}><Emoji e="🔀"/> 무작위 나라</button>
        <button className="minibtn" onClick={() => setPrompt(PROMPTS[Math.floor(Math.random() * PROMPTS.length)])}><Emoji e="✏️"/> 다른 글감</button>
        <button className="minibtn" onClick={copy} disabled={!country}>{copied ? <>✓ 복사됨</> : <><Emoji e="📋"/> 글쓰기에 활용</>}</button>
        <button
          className="linkbtn"
          onClick={addToProjectClick}
          disabled={!bridge || !country}
          title={bridge ? '이 국가 자료를 프로젝트 자료로 추가' : '프로젝트에 연결되어 있지 않습니다'}
        >
          <Emoji e="📄"/> 프로젝트에 추가
        </button>
      </div>

      {saved && (
        <div style={{ fontSize: 12, color: 'var(--ok)', fontWeight: 600, textAlign: 'center' }}>✓ {saved}</div>
      )}
    </div>
  )
}
