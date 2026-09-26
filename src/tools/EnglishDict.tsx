// 영어 사전 — 뜻·예문·발음. 무료·키 없는 공개 API(dictionaryapi.dev, https·CORS 허용)로 단어를 조회한다.
// 품사별 뜻/예문/동의어, 발음 기호와 오디오, 결과를 글쓰기에 활용(복사)하고 무작위 단어로 영감 얻기.
import { useState, useRef } from 'react'
import { Emoji } from './linkbus'

export const meta = { id: 'english-dict', name: '영어 사전', icon: '📖', group: '언어·어휘', intro: '영어 단어의 뜻·예문·발음을 찾아 글쓰기에 활용', w: 440, h: 580 }

interface Def { definition: string; example?: string; synonyms: string[] }
interface Sense { partOfSpeech: string; defs: Def[] }
interface Entry { word: string; phonetic: string; audio: string; senses: Sense[] }

const POS_KO: Record<string, string> = {
  noun: '명사', verb: '동사', adjective: '형용사', adverb: '부사',
  pronoun: '대명사', preposition: '전치사', conjunction: '접속사',
  interjection: '감탄사', determiner: '한정사', article: '관사', numeral: '수사',
}

// 글감/영감용 무작위 단어 풀 (네트워크 없이도 동작, 조회하면 풍부한 자료 제공)
const RANDOM_WORDS = [
  'serendipity', 'ephemeral', 'solitude', 'wander', 'luminous', 'whisper',
  'nostalgia', 'resilience', 'fragile', 'horizon', 'echo', 'velvet',
  'meander', 'ember', 'tranquil', 'fleeting', 'gossamer', 'reverie',
  'twilight', 'kindle', 'mellow', 'sublime', 'yearn', 'vivid',
  'eloquent', 'mirth', 'somber', 'cascade', 'wistful', 'radiant',
  'flicker', 'serene', 'languid', 'bittersweet', 'aurora', 'drift',
]

function pickRandom<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)] }

async function lookup(word: string): Promise<Entry> {
  const w = word.trim().toLowerCase()
  const r = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(w)}`)
  if (!r.ok) throw new Error('not found')
  const j = await r.json()
  if (!Array.isArray(j) || !j.length) throw new Error('not found')

  // 발음/오디오: 여러 항목을 합쳐 첫 유효값 사용
  let phonetic = ''
  let audio = ''
  const senseMap: Record<string, Def[]> = {}

  for (const item of j) {
    if (!phonetic && item.phonetic) phonetic = item.phonetic
    for (const p of (item.phonetics || [])) {
      if (!phonetic && p.text) phonetic = p.text
      if (!audio && p.audio) audio = p.audio
    }
    for (const m of (item.meanings || [])) {
      const pos = m.partOfSpeech || 'etc'
      if (!senseMap[pos]) senseMap[pos] = []
      for (const d of (m.definitions || [])) {
        if (!d.definition) continue
        senseMap[pos].push({
          definition: d.definition,
          example: d.example,
          synonyms: Array.isArray(d.synonyms) ? d.synonyms.slice(0, 6) : [],
        })
      }
    }
  }

  const senses: Sense[] = Object.keys(senseMap).map((pos) => ({
    partOfSpeech: pos,
    defs: senseMap[pos].slice(0, 6),
  })).filter((s) => s.defs.length)

  if (!senses.length) throw new Error('not found')
  return { word: j[0].word || w, phonetic, audio, senses }
}

export default function EnglishDict() {
  const [q, setQ] = useState('')
  const [entry, setEntry] = useState<Entry | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [copied, setCopied] = useState('')
  const nonce = useRef(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const run = async (word: string) => {
    const w = word.trim()
    if (!w) { setErr('검색할 영어 단어를 입력하세요.'); return }
    const my = ++nonce.current
    setLoading(true); setErr(''); setCopied('')
    try {
      const e = await lookup(w)
      if (my === nonce.current) setEntry(e)
    } catch {
      if (my === nonce.current) { setEntry(null); setErr(`'${w}'의 뜻을 찾지 못했습니다. 철자를 확인하거나 다른 단어로 시도하세요.`) }
    } finally {
      if (my === nonce.current) setLoading(false)
    }
  }

  const randomLookup = () => {
    const w = pickRandom(RANDOM_WORDS)
    setQ(w)
    run(w)
  }

  const playAudio = () => {
    if (!entry?.audio) return
    try {
      if (!audioRef.current) audioRef.current = new Audio()
      audioRef.current.src = entry.audio
      audioRef.current.play().catch(() => {})
    } catch { /* ignore */ }
  }

  const copy = (text: string, label: string) => {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(label); setTimeout(() => setCopied(''), 1500)
    }).catch(() => {})
  }

  const copyAll = () => {
    if (!entry) return
    const lines: string[] = []
    lines.push(`${entry.word}${entry.phonetic ? ` ${entry.phonetic}` : ''}`)
    for (const s of entry.senses) {
      lines.push(`\n[${POS_KO[s.partOfSpeech] || s.partOfSpeech}]`)
      s.defs.forEach((d, i) => {
        lines.push(`${i + 1}. ${d.definition}`)
        if (d.example) lines.push(`   예: ${d.example}`)
        if (d.synonyms.length) lines.push(`   유의어: ${d.synonyms.join(', ')}`)
      })
    }
    copy(lines.join('\n'), '전체')
  }

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') run(q) }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 10, color: 'var(--text)', background: 'var(--panel)' }}>
      {/* 검색 바 */}
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKey}
          placeholder="영어 단어 입력 (예: serendipity)"
          spellCheck={false}
          style={{
            flex: 1, padding: '8px 10px', borderRadius: 8, fontSize: 14,
            border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', outline: 'none',
          }}
        />
        <button className="btn-primary" onClick={() => run(q)}><Emoji e="🔍"/> 검색</button>
      </div>

      {/* 빠른 액션 */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <button className="minibtn" onClick={randomLookup}><Emoji e="🎲"/> 무작위 단어</button>
        {entry && <button className="minibtn" onClick={copyAll}><Emoji e="📋"/> 글쓰기에 활용{copied === '전체' ? ' ✓' : ''}</button>}
      </div>

      {/* 본문 */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: 12, borderRadius: 10,
        border: '1px solid var(--border)', background: 'var(--paper)',
      }}>
        {loading && <div style={{ color: 'var(--muted)', textAlign: 'center', padding: 24 }}>찾는 중…</div>}

        {!loading && err && <div style={{ color: 'var(--muted)', textAlign: 'center', padding: 24, lineHeight: 1.6 }}>{err}</div>}

        {!loading && !err && !entry && (
          <div style={{ color: 'var(--muted)', textAlign: 'center', padding: 24, lineHeight: 1.7 }}>
            영어 단어를 검색하면 품사별 뜻·예문·발음을 보여줍니다.<br />
            막혔다면 <b><Emoji e="🎲"/> 무작위 단어</b>로 새 어휘에서 영감을 얻어보세요.
          </div>
        )}

        {!loading && !err && entry && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* 표제어 */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 26, fontWeight: 700 }}>{entry.word}</span>
              {entry.phonetic && <span style={{ color: 'var(--accent)', fontSize: 16 }}>{entry.phonetic}</span>}
              {entry.audio && (
                <button className="minibtn" onClick={playAudio} title="발음 듣기"><Emoji e="🔊"/> 발음</button>
              )}
            </div>

            {/* 품사별 뜻 */}
            {entry.senses.map((s, si) => (
              <div key={si} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{
                  alignSelf: 'flex-start', fontSize: 12, fontWeight: 700, padding: '2px 10px',
                  borderRadius: 999, background: 'var(--chrome-2)', color: 'var(--accent)',
                  border: '1px solid var(--border)',
                }}>
                  {POS_KO[s.partOfSpeech] || s.partOfSpeech}
                </div>
                {s.defs.map((d, di) => (
                  <div key={di} style={{
                    padding: '8px 10px', borderRadius: 8, background: 'var(--panel)',
                    border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 4,
                  }}>
                    <div style={{ lineHeight: 1.55 }}>
                      <span style={{ color: 'var(--muted)', marginRight: 6 }}>{di + 1}.</span>{d.definition}
                    </div>
                    {d.example && (
                      <div style={{ fontSize: 13, color: 'var(--muted)', fontStyle: 'italic', lineHeight: 1.5 }}>
                        “{d.example}”
                      </div>
                    )}
                    {d.synonyms.length > 0 && (
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                        유의어: {d.synonyms.join(', ')}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
                      <button
                        className="minibtn"
                        onClick={() => copy(d.example ? `${d.definition}\n예: ${d.example}` : d.definition, `${si}-${di}`)}
                      >
                        <Emoji e="📋"/> 복사{copied === `${si}-${di}` ? ' ✓' : ''}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center' }}>
        새 단어 하나가 막힌 문장을 풀어주기도 합니다. 마음에 드는 표현은 바로 원고에 옮겨보세요.
      </div>
    </div>
  )
}
