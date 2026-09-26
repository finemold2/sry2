// 반의어·대조 표현 — 영어 단어를 입력하면 Datamuse 공개 API(키 불필요·https·CORS 허용)로 반의어를 찾는다.
//  - rel_ant 로 반의어 목록을 받아 클릭 복사·스니펫 저장 지원.
//  - 고른 반의어 쌍으로 대조(antithesis)·아이러니·대구(parallelism) 문장 틀을 만들어 글에 활용하도록 돕는다(영어 중심 안내).
// 규칙: react 와 './linkbus' 외 import 금지. 외부 API 는 키없음+https+CORS(Datamuse)만 사용.
import { useState, useEffect, useRef } from 'react'
import { addToLibrary, addToProject, hasProjectBridge, Emoji } from './linkbus'

export const meta = { id: 'antonym-contrast', name: '반의어·대조 표현', icon: '⚖️', group: '교정·언어', intro: '영어 단어의 반의어를 찾아 대조·아이러니·대구 문장을 빚어내세요', w: 460, h: 620 }

interface DMWord { word: string; score?: number }

// 대조 문장 틀 — 고른 반의어 쌍(A↔B)으로 채울 수 있는 영어 수사 패턴.
interface Pattern { key: string; label: string; desc: string; build: (a: string, b: string) => string }
const PATTERNS: Pattern[] = [
  { key: 'antithesis', label: '대조 (Antithesis)', desc: '상반된 개념을 나란히 놓아 긴장감을 준다.', build: (a, b) => `It was not ${a}, but ${b}.` },
  { key: 'parallel', label: '대구 (Parallelism)', desc: '같은 구조에 반대말을 배치해 균형을 만든다.', build: (a, b) => `To be ${a} is human; to be ${b} is rare.` },
  { key: 'chiasmus', label: '교차 대구 (Chiasmus)', desc: 'A-B-B-A 로 어순을 뒤집어 여운을 남긴다.', build: (a, b) => `The ${a} grew ${b}, and the ${b} grew ${a}.` },
  { key: 'irony', label: '아이러니 (Irony)', desc: '겉과 속, 기대와 결과가 반대로 어긋난다.', build: (a, b) => `She called it ${a}, though everyone could see it was ${b}.` },
  { key: 'oxymoron', label: '모순어법 (Oxymoron)', desc: '반대말을 한데 붙여 역설적 인상을 준다.', build: (a, b) => `a ${a} ${b}` },
  { key: 'paradox', label: '역설 (Paradox)', desc: '모순처럼 보이나 진실을 품은 한 문장.', build: (a, b) => `The more ${a} he became, the more ${b} he felt.` },
]

const EXAMPLES = ['light', 'love', 'rise', 'open', 'strong', 'true', 'begin', 'rich', 'win', 'remember', 'wild', 'silent']
const LS = 'sry:tool:antonym-contrast'

interface Persisted { word: string; antonyms: string[]; pairA: string; pairB: string; pattern: string }

const esc = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export default function AntonymContrast({ payload }: { payload?: Record<string, unknown> }) {
  const [input, setInput] = useState('')
  const [word, setWord] = useState('')          // 마지막으로 조회 성공/시도한 단어
  const [antonyms, setAntonyms] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [copied, setCopied] = useState('')      // 복사 피드백(단어/문장)
  const [toast, setToast] = useState('')
  // 대조 문장용으로 고른 한 쌍 (A: 입력어/선택어, B: 반의어)
  const [pairA, setPairA] = useState('')
  const [pairB, setPairB] = useState('')
  const [pattern, setPattern] = useState<string>(PATTERNS[0].key)

  const nonce = useRef(0)
  const restored = useRef(false)

  // ---- 복원 (localStorage → payload.word 우선) ----
  useEffect(() => {
    if (restored.current) return
    restored.current = true
    try {
      const raw = localStorage.getItem(LS)
      if (raw) {
        const p = JSON.parse(raw) as Partial<Persisted>
        if (p && typeof p === 'object') {
          if (typeof p.word === 'string') { setWord(p.word); setInput(p.word) }
          if (Array.isArray(p.antonyms)) setAntonyms(p.antonyms.filter((x) => typeof x === 'string'))
          if (typeof p.pairA === 'string') setPairA(p.pairA)
          if (typeof p.pairB === 'string') setPairB(p.pairB)
          if (typeof p.pattern === 'string' && PATTERNS.some((x) => x.key === p.pattern)) setPattern(p.pattern)
        }
      }
    } catch { /* 손상된 저장값 무시 */ }
    // 연계로 전달된 단어가 있으면 그것으로 즉시 조회
    const pw = payload && typeof payload.word === 'string' ? (payload.word as string).trim() : ''
    if (pw) { setInput(pw); search(pw) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---- 영속 저장 ----
  useEffect(() => {
    if (!restored.current) return
    try {
      const data: Persisted = { word, antonyms, pairA, pairB, pattern }
      localStorage.setItem(LS, JSON.stringify(data))
    } catch { /* 용량 초과 등 무시 */ }
  }, [word, antonyms, pairA, pairB, pattern])

  // 언마운트 시 진행 중 요청 무효화
  useEffect(() => () => { nonce.current++ }, [])

  const flash = (msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast((t) => (t === msg ? '' : t)), 1800)
  }

  const search = async (raw: string) => {
    const w = raw.trim().toLowerCase()
    if (!w) return
    const my = ++nonce.current
    setWord(w); setLoading(true); setErr(''); setCopied('')
    setAntonyms([])
    setPairA(w); setPairB('')
    try {
      const r = await fetch(`https://api.datamuse.com/words?rel_ant=${encodeURIComponent(w)}&max=20`)
      if (!r.ok) throw new Error('bad response')
      const j: DMWord[] = await r.json()
      if (my !== nonce.current) return
      const list = (Array.isArray(j) ? j : []).map((x) => x.word).filter(Boolean)
      setAntonyms(list)
    } catch {
      if (my === nonce.current) setErr('반의어를 불러오지 못했습니다. 네트워크를 확인하고 다시 시도하세요.')
    } finally {
      if (my === nonce.current) setLoading(false)
    }
  }

  const onSubmit = (e: React.FormEvent) => { e.preventDefault(); search(input) }
  const randomExample = () => {
    const ex = EXAMPLES[Math.floor(Math.random() * EXAMPLES.length)]
    setInput(ex); search(ex)
  }

  const copy = (text: string, id?: string) => {
    if (!text) return
    navigator.clipboard?.writeText(text).then(() => {
      const key = id ?? text
      setCopied(key)
      window.setTimeout(() => setCopied((c) => (c === key ? '' : c)), 1200)
    }).catch(() => { /* 클립보드 미지원/거부 graceful */ })
  }

  const copyAll = () => { if (antonyms.length) copy(antonyms.join(', '), '__all__') }

  // 반의어 칩 클릭 → 복사 + 대조 쌍 B 로 채움
  const pickAntonym = (w: string) => {
    copy(w)
    if (!pairA) setPairA(word)
    setPairB(w)
  }

  const activePattern = PATTERNS.find((p) => p.key === pattern) ?? PATTERNS[0]
  const pairReady = !!(pairA.trim() && pairB.trim())
  const sentence = pairReady ? activePattern.build(pairA.trim(), pairB.trim()) : ''

  const saveAntonymsSnippet = () => {
    if (!antonyms.length) return
    addToLibrary('snippets', {
      text: `[반의어] ${word} ↔ ${antonyms.join(', ')}`,
      source: '반의어·대조 표현 (Datamuse)',
      tags: ['반의어', '영어', word],
    })
    flash('반의어 목록을 스니펫에 저장했습니다.')
  }

  const saveSentenceSnippet = () => {
    if (!sentence) return
    addToLibrary('snippets', {
      text: `[${activePattern.label}] ${sentence}\n(${pairA.trim()} ↔ ${pairB.trim()})`,
      source: '반의어·대조 표현',
      tags: ['대조', '수사', activePattern.key],
    })
    flash('대조 문장을 스니펫에 저장했습니다.')
  }

  const addSentenceToProject = () => {
    if (!sentence || !hasProjectBridge()) return
    const bodyHtml = [
      `<p><b>${esc(activePattern.label)}</b> · ${esc(pairA.trim())} ↔ ${esc(pairB.trim())}</p>`,
      `<p>${esc(sentence)}</p>`,
      `<p style="color:#888">${esc(activePattern.desc)}</p>`,
    ].join('')
    const id = addToProject({
      kind: 'text',
      root: 'research',
      folder: '소재',
      title: `대조 문장 — ${pairA.trim()} ↔ ${pairB.trim()}`,
      bodyHtml,
    })
    if (id) flash('프로젝트 자료 〈소재〉에 대조 문장을 추가했습니다.')
  }

  // ---- 스타일 ----
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, color: 'var(--text)', boxSizing: 'border-box', padding: 2, overflow: 'hidden' }
  const hint: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }
  const box: React.CSSProperties = { borderRadius: 10, border: '1px solid var(--border)', background: 'var(--panel)', padding: 10 }
  const inputStyle: React.CSSProperties = { padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 14, outline: 'none', minWidth: 0 }

  return (
    <div style={wrap}>
      {/* 검색 */}
      <form onSubmit={onSubmit} style={{ display: 'flex', gap: 6 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="영어 단어 입력 (예: light)"
          style={{ ...inputStyle, flex: 1 }}
        />
        <button type="submit" className="btn-primary">반의어</button>
        <button type="button" className="minibtn" onClick={randomExample} title="예시 단어로 검색"><Emoji e="🎲"/></button>
      </form>

      <div style={{ ...hint, paddingLeft: 2 }}>
        영어 단어의 <b>반의어</b>를 찾아 클릭하면 복사됩니다. 반의어를 골라 아래에서 <b>대조·아이러니·대구</b> 문장을 빚어 보세요.
      </div>

      {/* 본문 스크롤 영역 */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0, paddingRight: 2 }}>
        {/* 반의어 목록 */}
        <div style={box}>
          {!word && !loading && (
            <div style={hint}>
              위에 영어 단어를 입력해 보세요. 예: <b>light</b> → dark, darkness …<br />
              떠오르는 말이 없으면 <Emoji e="🎲"/> 버튼으로 예시 단어를 받아보세요.
            </div>
          )}
          {loading && <div style={hint}>불러오는 중…</div>}
          {err && !loading && <div style={hint}>{err}</div>}
          {word && !loading && !err && (
            <>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                  <b style={{ color: 'var(--accent)' }}>{word}</b> 의 반의어
                </span>
                <span style={{ ...hint, marginLeft: 'auto' }}>{antonyms.length}개</span>
              </div>
              {antonyms.length === 0 ? (
                <div style={hint}>
                  반의어를 찾지 못했습니다. Datamuse 사전에 명확한 반대말이 없는 단어일 수 있어요.
                  형용사·동사 원형(예: <b>happy</b>, <b>rise</b>)이 잘 나옵니다.
                </div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {antonyms.map((w, i) => {
                    const on = pairB === w
                    return (
                      <button
                        key={w + i}
                        onClick={() => pickAntonym(w)}
                        title="클릭하면 복사 + 대조 쌍에 넣기"
                        style={{
                          padding: '5px 10px', borderRadius: 999, cursor: 'pointer', fontSize: 13,
                          border: '1px solid ' + (on ? 'var(--accent)' : 'var(--border)'),
                          background: copied === w ? 'var(--accent)' : on ? 'var(--chrome-2)' : 'var(--chrome-2)',
                          color: copied === w ? '#fff' : 'var(--text)', transition: 'background .15s',
                        }}
                      >
                        {copied === w ? '✓ 복사됨' : w}
                      </button>
                    )
                  })}
                </div>
              )}
              {antonyms.length > 0 && (
                <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                  <button className="minibtn" onClick={copyAll}>
                    {copied === '__all__' ? <>✓ 복사됨</> : <><Emoji e="📋"/> 전체 복사</>}
                  </button>
                  <button className="minibtn" onClick={saveAntonymsSnippet}><Emoji e="💾"/> 스니펫 저장</button>
                </div>
              )}
            </>
          )}
        </div>

        {/* 대조 문장 빌더 */}
        <div style={box}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}><Emoji e="✍️"/> 대조 문장 만들기</div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8 }}>
            <input
              value={pairA}
              onChange={(e) => setPairA(e.target.value)}
              placeholder="A (예: light)"
              style={{ ...inputStyle, flex: 1, fontSize: 13 }}
            />
            <span style={{ fontSize: 16, color: 'var(--muted)' }}>↔</span>
            <input
              value={pairB}
              onChange={(e) => setPairB(e.target.value)}
              placeholder="B (반의어 클릭)"
              style={{ ...inputStyle, flex: 1, fontSize: 13 }}
            />
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
            {PATTERNS.map((p) => {
              const on = pattern === p.key
              return (
                <button
                  key={p.key}
                  className="minibtn"
                  onClick={() => setPattern(p.key)}
                  aria-pressed={on}
                  style={{ borderColor: on ? 'var(--accent)' : 'var(--border)', color: on ? 'var(--text)' : 'var(--muted)' }}
                >
                  {p.label}
                </button>
              )
            })}
          </div>

          <div style={{ ...hint, marginBottom: 8 }}>{activePattern.desc}</div>

          {pairReady ? (
            <div style={{ background: 'var(--paper)', border: '1px solid var(--accent)', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontSize: 14.5, lineHeight: 1.55, fontStyle: 'italic' }}>{sentence}</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                <button className="minibtn" onClick={() => copy(sentence, '__sentence__')}>
                  {copied === '__sentence__' ? <>✓ 복사됨</> : <><Emoji e="📋"/> 문장 복사</>}
                </button>
                <button className="minibtn" onClick={saveSentenceSnippet}><Emoji e="💾"/> 스니펫 저장</button>
              </div>
              <div className="linkbar" style={{ marginTop: 8 }}>
                <span className="linkbar-label">연계:</span>
                <button
                  className="linkbtn"
                  onClick={addSentenceToProject}
                  disabled={!hasProjectBridge()}
                  title={hasProjectBridge() ? '대조 문장을 프로젝트 자료 〈소재〉 폴더에 추가' : '프로젝트에 연결되어 있지 않습니다'}
                >
                  <Emoji e="📄"/> 프로젝트에 추가
                </button>
              </div>
            </div>
          ) : (
            <div style={hint}>
              A·B 두 칸을 채우면 문장 틀이 완성됩니다. 위 반의어를 클릭하면 B 칸이 자동으로 채워져요.
            </div>
          )}

          <div style={{ ...hint, marginTop: 10, fontSize: 11.5 }}>
            ※ 문장 틀은 <b>영어 수사법</b> 기준입니다. 한국어로는 “A가 아니라 B였다”, “A할수록 B해졌다”처럼 뜻을 옮겨 활용하세요. 어형(품사·시제)은 문맥에 맞게 다듬으세요.
          </div>
        </div>
      </div>

      {/* 토스트 */}
      {toast && (
        <div style={{ ...box, border: '1px solid var(--accent)', background: 'var(--paper)', fontSize: 12.5, lineHeight: 1.5 }}>
          ✓ {toast}
        </div>
      )}

      <div className="license-note" style={{ textAlign: 'center' }}>
        반의어 데이터: Datamuse API (키 불필요·CORS) · 단어/문장 클릭 시 복사됩니다
      </div>
    </div>
  )
}
