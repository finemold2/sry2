// 단어 연상망 — Datamuse(api.datamuse.com)에서 입력 단어의 관련어를 관계(rel)별로 끌어와 묶어 보여준다.
// API: https://api.datamuse.com/words?{rel}={word}&max=10 (관계별 병렬 호출). 키 불필요·https·CORS 허용.
// Datamuse 는 영어 중심이므로 영어 단어를 권장한다. 응답은 [{word, score}] 형태.
// 관련어를 누르면 그 단어로 재탐색(파고들기). "이 연상으로 글감" 질문으로 브레인스토밍.
// 연계: 스니펫 라이브러리 저장 · 프로젝트 메모(자료) 추가.
import { useState, useEffect, useRef } from 'react'
import { addToLibrary, addToProject, hasProjectBridge, Emoji } from './linkbus'

export const meta = { id: 'idea-web-concept', name: '단어 연상망', icon: '🕸️', group: '영감·발상', intro: '한 단어에서 뻗어나가는 관련 개념을 관계별로 펼쳐 글감을 캡니다', w: 480, h: 620 }

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// Datamuse 관계 파라미터(rel) → 한국어 그룹 라벨/순서. 각 관계를 한 그룹으로 매핑한다.
type Group = { key: string; rel: string; label: string; icon: string }
const GROUPS: Group[] = [
  { key: 'trg', rel: 'rel_trg', label: '연관', icon: '✨' },
  { key: 'syn', rel: 'rel_syn', label: '유의어', icon: '🔖' },
  { key: 'ant', rel: 'rel_ant', label: '반의어', icon: '↔️' },
  { key: 'spc', rel: 'rel_spc', label: '구체적', icon: '🔍' },
  { key: 'gen', rel: 'rel_gen', label: '일반적', icon: '🗂️' },
  { key: 'par', rel: 'rel_par', label: '부분', icon: '🧩' },
  { key: 'com', rel: 'rel_com', label: '구성', icon: '🏗️' },
  { key: 'jja', rel: 'rel_jja', label: '형용사', icon: '🎨' },
  { key: 'jjb', rel: 'rel_jjb', label: '명사', icon: '📦' },
]

const SEEDS = ['ocean', 'mirror', 'letter', 'rain', 'door', 'clock', 'fire', 'bone', 'garden', 'mask', 'train', 'shadow']

interface RelWord { word: string; score?: number }
type Grouped = Record<string, RelWord[]>

// Datamuse 응답 항목(필요한 부분만)
interface DatamuseItem {
  word?: string
  score?: number
}

export default function IdeaWebConcept({ payload }: { payload?: Record<string, unknown> }) {
  const seedWord = typeof payload?.word === 'string' ? (payload.word as string) : ''
  const [q, setQ] = useState(seedWord)
  const [term, setTerm] = useState('')          // 현재 표시 중인 단어
  const [grouped, setGrouped] = useState<Grouped>({})
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [searched, setSearched] = useState(false)
  const [trail, setTrail] = useState<string[]>([])   // 파고든 경로(빵부스러기)
  const [prompt, setPrompt] = useState('')
  const [toast, setToast] = useState('')
  const nonce = useRef(0)

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(''), 1600) }

  const makePrompt = (w: string, g: Grouped) => {
    const pool: string[] = []
    Object.values(g).forEach((arr) => arr.forEach((x) => { if (x.word && x.word !== w) pool.push(x.word) }))
    const pick = () => pool.length ? pool[Math.floor(Math.random() * pool.length)] : ''
    const a = pick(); const b = pick()
    const QS = [
      a ? `'${w}'와(과) '${a}'를 한 장면에 함께 놓으면 어떤 이야기가 시작될까?` : `'${w}'로 시작하는 첫 문장을 한 줄 써 본다면?`,
      a && b && a !== b ? `'${a}'에서 출발해 '${w}'를 거쳐 '${b}'로 끝나는 짧은 이야기를 상상해 보자.` : `'${w}'을(를) 처음 본 인물의 표정을 묘사해 보자.`,
      a ? `'${w}'이(가) 사실은 '${a}'였다면, 무엇이 달라질까?` : `'${w}'에 얽힌 비밀이 하나 있다면 무엇일까?`,
      `'${w}'을(를) 은유로 쓴다면 무엇을 빗댈 수 있을까?`,
    ]
    return QS[Math.floor(Math.random() * QS.length)]
  }

  // 한 관계(rel)에 대한 관련어 목록을 가져온다. 실패 시 빈 배열(부분 실패 허용).
  const fetchRel = async (word: string, rel: string): Promise<RelWord[]> => {
    const url = `https://api.datamuse.com/words?${rel}=${encodeURIComponent(word)}&max=10`
    try {
      const r = await fetch(url, { headers: { Accept: 'application/json' } })
      if (!r.ok) return []
      const j = await r.json() as DatamuseItem[]
      if (!Array.isArray(j)) return []
      return j
        .map((it) => ({ word: (it.word || '').trim(), score: it.score }))
        .filter((it) => it.word)
    } catch {
      return []
    }
  }

  const buildGroups = (results: RelWord[][], word: string): { grouped: Grouped; count: number } => {
    const g: Grouped = {}
    const self = word.trim().toLowerCase()
    GROUPS.forEach((grp, gi) => {
      const arr = results[gi] || []
      const seen = new Set<string>()
      const out: RelWord[] = []
      for (const it of arr) {
        const key = it.word.toLowerCase()
        if (key === self || seen.has(key)) continue
        seen.add(key)
        out.push(it)
      }
      if (out.length) g[grp.key] = out
    })
    const count = Object.values(g).reduce((n, a) => n + a.length, 0)
    return { grouped: g, count }
  }

  const search = async (raw: string, opts?: { push?: boolean }) => {
    const word = raw.trim()
    if (!word) { setErr('연상망을 펼칠 단어를 입력하세요.'); return }
    const my = ++nonce.current
    setLoading(true); setErr(''); setSearched(true)
    try {
      // 관계별 병렬 fetch(부분 실패는 빈 배열로 흡수)
      const results = await Promise.all(GROUPS.map((grp) => fetchRel(word, grp.rel)))
      if (my !== nonce.current) return
      const { grouped: g, count: c } = buildGroups(results, word)
      if (my !== nonce.current) return
      setGrouped(g); setCount(c); setTerm(word)
      setPrompt(makePrompt(word, g))
      if (opts?.push) setTrail((t) => (t[t.length - 1] === word ? t : [...t, word]))
      else setTrail([word])
    } catch {
      if (my === nonce.current) { setErr('연상망을 불러오지 못했습니다. 다른 단어로 시도하거나 잠시 후 다시 시도하세요.'); setGrouped({}); setCount(0) }
    } finally {
      if (my === nonce.current) setLoading(false)
    }
  }

  // 최초 payload 단어가 있으면 자동 탐색
  useEffect(() => {
    if (seedWord.trim()) search(seedWord)
    return () => { nonce.current++ }   // 언마운트 시 진행 중 응답 무시
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const drill = (w: string) => { setQ(w); search(w, { push: true }) }
  const goTo = (i: number) => { const w = trail[i]; if (!w) return; setTrail((t) => t.slice(0, i + 1)); setQ(w); search(w) }
  const randomSeed = () => { const s = SEEDS[Math.floor(Math.random() * SEEDS.length)]; setQ(s); search(s) }
  const reroll = () => { if (term) setPrompt(makePrompt(term, grouped)) }
  const copy = (t: string) => { navigator.clipboard?.writeText(t).catch(() => {}) }

  const allWords = () => {
    const out: string[] = []
    GROUPS.forEach((g) => (grouped[g.key] || []).forEach((x) => out.push(x.word)))
    return out
  }

  const summaryText = () => {
    const lines: string[] = [`【단어 연상망】 ${term}`]
    GROUPS.forEach((g) => {
      const arr = grouped[g.key] || []
      if (arr.length) lines.push(`${g.icon} ${g.label}: ${arr.map((x) => x.word).join(', ')}`)
    })
    if (prompt) lines.push(`\n✍️ 이 연상으로 글감: ${prompt}`)
    lines.push('\n출처: Datamuse API')
    return lines.join('\n')
  }

  const saveSnippet = () => {
    if (!term) return
    addToLibrary('snippets', { text: summaryText(), source: '단어 연상망', tags: ['연상', term] })
    flash('스니펫으로 저장했습니다')
  }

  const saveToProject = () => {
    if (!term) return
    const parts: string[] = [`<p><strong>중심 단어:</strong> ${esc(term)}</p>`]
    GROUPS.forEach((g) => {
      const arr = grouped[g.key] || []
      if (arr.length) parts.push(`<p><strong>${esc(g.icon + ' ' + g.label)}:</strong> ${esc(arr.map((x) => x.word).join(', '))}</p>`)
    })
    if (prompt) parts.push(`<p><strong>✍️ 이 연상으로 글감:</strong> ${esc(prompt)}</p>`)
    parts.push(`<p style="font-size:12px;color:#888">출처: Datamuse API</p>`)
    const id = addToProject({
      kind: 'text', root: 'research', folder: '연상 메모', title: `연상망 · ${term}`,
      bodyHtml: parts.join('\n'), meta: { 출처: 'Datamuse API' },
    })
    if (id) flash('프로젝트에 추가됨!')
  }

  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, color: 'var(--text)', boxSizing: 'border-box' }
  const card: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: 12 }

  return (
    <div style={wrap}>
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') search(q) }}
          placeholder="영어 단어 하나 (예: ocean, mirror, letter)"
          style={{ flex: 1, minWidth: 0, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 14 }}
        />
        <button className="btn-primary" onClick={() => search(q)} disabled={loading}>{loading ? '펼치는 중…' : '연상'}</button>
      </div>

      <div style={{ fontSize: 11, color: 'var(--muted)' }}><Emoji e="💡"/> Datamuse 는 영어 중심이라 <strong>영어 단어</strong>를 권장합니다.</div>

      {/* 빵부스러기(파고든 경로) */}
      {trail.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 4, fontSize: 12 }}>
          {trail.map((w, i) => (
            <span key={w + i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              {i > 0 && <span style={{ color: 'var(--muted)' }}>›</span>}
              <button className="linkbtn" onClick={() => goTo(i)}
                style={i === trail.length - 1 ? { color: 'var(--accent)', fontWeight: 600 } : { color: 'var(--muted)' }}>
                {w}
              </button>
            </span>
          ))}
        </div>
      )}

      <div style={card}>
        {loading && <div style={{ color: 'var(--muted)', textAlign: 'center', padding: '28px 0' }}>연상망을 펼치는 중…</div>}

        {!loading && err && (
          <div style={{ color: 'var(--muted)', textAlign: 'center', padding: '28px 0' }}>
            <div style={{ fontSize: 26, marginBottom: 8 }}><Emoji e="🕸️"/></div>
            <div>{err}</div>
            <button className="minibtn" style={{ marginTop: 12 }} onClick={() => search(q || term)}>다시 시도</button>
          </div>
        )}

        {!loading && !err && !searched && (
          <div style={{ color: 'var(--muted)', textAlign: 'center', padding: '24px 0', lineHeight: 1.7 }}>
            영어 단어 하나를 입력하면 그것에서 뻗어나가는<br />관련 개념을 관계별로 펼쳐 드립니다.<br />
            <span style={{ fontSize: 12 }}>관련어를 누르면 그 단어로 더 깊이 파고들 수 있어요.</span>
          </div>
        )}

        {!loading && !err && searched && count === 0 && (
          <div style={{ color: 'var(--muted)', textAlign: 'center', padding: '24px 0' }}>이 단어로는 연상 데이터를 찾지 못했어요. 더 일반적인 <strong>영어 단어</strong>로 시도해 보세요.</div>
        )}

        {!loading && !err && count > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>‘{term}’에서 뻗어나간 관련 개념 {count}개 · 단어를 누르면 그 단어로 파고듭니다.</div>
            {GROUPS.map((g) => {
              const arr = grouped[g.key] || []
              if (!arr.length) return null
              return (
                <div key={g.key}>
                  <div style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600, marginBottom: 6 }}><Emoji e={g.icon}/> {g.label} <span style={{ color: 'var(--muted)', fontWeight: 400 }}>({arr.length})</span></div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {arr.map((x, i) => (
                      <button key={g.key + x.word + i} className="minibtn" title={`'${x.word}'(으)로 파고들기`} onClick={() => drill(x.word)}
                        style={{ background: 'var(--chrome-2)', borderColor: 'var(--border)' }}>
                        {x.word}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}

            {/* 이 연상으로 글감 */}
            <div style={{ background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 8, padding: 12 }}>
              <div style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600, marginBottom: 6 }}><Emoji e="✍️"/> 이 연상으로 글감</div>
              <div style={{ fontSize: 14, lineHeight: 1.6 }}>{prompt}</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                <button className="minibtn" onClick={reroll}><Emoji e="🔀"/> 다른 질문</button>
                <button className="minibtn" onClick={() => copy(prompt)}>질문 복사</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 하단 액션 */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="btn-primary" onClick={randomSeed} disabled={loading}><Emoji e="🎲"/> 랜덤 단어</button>
        <button className="minibtn" onClick={() => copy(allWords().join(', '))} disabled={!count}><Emoji e="📋"/> 관련어 복사</button>
        <button className="minibtn" onClick={() => copy(summaryText())} disabled={!count}>전체 복사</button>
      </div>
      <div className="linkbar" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="linkbtn" onClick={saveSnippet} disabled={!count} title="이 연상망을 스니펫 라이브러리에 저장"><Emoji e="✂️"/> 스니펫 저장</button>
        <button className="linkbtn" onClick={saveToProject} disabled={!count || !hasProjectBridge()}
          title={hasProjectBridge() ? '이 연상망을 자료(연상 메모)로 저장' : '프로젝트가 연결되지 않았습니다'}>
          <Emoji e="📄"/> 프로젝트에 추가
        </button>
        {toast && <span style={{ fontSize: 12, color: 'var(--accent)' }}>{toast}</span>}
      </div>

      <div className="license-note" style={{ fontSize: 11, color: 'var(--muted)' }}>
        데이터 출처: <a href="https://www.datamuse.com/api/" target="_blank" rel="noreferrer" style={{ color: 'var(--muted)' }}>Datamuse API</a> · 키 불필요·무료
      </div>
    </div>
  )
}
