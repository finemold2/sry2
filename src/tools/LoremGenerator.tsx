// 더미 텍스트 생성기 — 라틴(lorem ipsum)·한국어 더미 문장을 문단 수·문단당 문장 수에 맞춰 생성한다.
// 자급식: react 외 import 없음, 모든 생성은 로컬 단어 풀 + 의사난수로 처리한다. (외부 전송 없음)
import { useState, useEffect, useRef, useMemo } from 'react'

export const meta = { id: 'lorem-generator', name: '더미 텍스트 생성', icon: '📋', group: '유틸·참고', intro: '라틴·한국어 더미 문장을 문단·문장 수에 맞춰 생성', w: 560, h: 520 }

const STORE_KEY = 'sry:tool:lorem-generator'

// 라틴 단어 풀(고전 lorem ipsum 기반)
const LATIN_WORDS = (
  'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor ' +
  'incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud ' +
  'exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis aute irure ' +
  'in reprehenderit voluptate velit esse cillum eu fugiat nulla pariatur excepteur sint ' +
  'occaecat cupidatat non proident sunt culpa qui officia deserunt mollit anim id est ' +
  'laborum perspiciatis unde omnis iste natus error voluptatem accusantium doloremque ' +
  'laudantium totam rem aperiam eaque ipsa quae ab illo inventore veritatis quasi ' +
  'architecto beatae vitae dicta explicabo nemo ipsam quia voluptas aspernatur aut odit ' +
  'fugit sequi nesciunt neque porro quisquam dolorem adipisci numquam eius modi tempora'
).split(/\s+/)

// 한국어 더미 문장 조각 — 주어/서술/연결 등을 조합해 자연스러운 길이의 문장을 만든다.
const KO_SUBJECTS = ['이 문장은', '본 단락에서는', '여기 표시된 글은', '예시로 사용된 텍스트는', '레이아웃 확인용 문구는', '임시로 채워 넣은 내용은', '디자인 검토를 위한 글은', '실제 원고가 들어갈 자리에는']
const KO_MIDDLES = ['실제 의미보다는', '내용보다는', '글자의 흐름과', '문단의 균형과', '행간과 자간의', '시각적인 밀도와', '여백의 조화와', '가독성의 측면에서']
const KO_OBJECTS = ['배치와 분량을', '전체적인 인상을', '줄바꿈과 흐름을', '글자 크기의 적절함을', '디자인의 완성도를', '시선의 이동 경로를', '화면의 안정감을', '본문의 리듬을']
const KO_TAILS = ['확인하기 위해 채워 넣은 더미 텍스트입니다.', '미리 살펴보려는 목적의 임시 문장입니다.', '점검하려고 준비한 예시 문구입니다.', '가늠해 보기 위한 자리 채움 글입니다.', '검토하기 위해 작성된 견본 내용입니다.', '테스트하기 위한 임시 텍스트일 뿐입니다.', '확인하는 데 쓰이는 견본 문장입니다.', '살펴보기 위해 임의로 생성된 글입니다.']

type Lang = 'latin' | 'ko'

// 라틴 한 문장: 5~12 단어, 첫 글자 대문자 + 마침표
function latinSentence(rnd: () => number): string {
  const n = 5 + Math.floor(rnd() * 8)
  const words: string[] = []
  for (let i = 0; i < n; i++) {
    words.push(LATIN_WORDS[Math.floor(rnd() * LATIN_WORDS.length)])
  }
  // 가끔 쉼표 한두 개 삽입
  if (n > 7 && rnd() < 0.6) {
    const at = 2 + Math.floor(rnd() * (n - 4))
    words[at] = words[at] + ','
  }
  let s = words.join(' ')
  s = s.charAt(0).toUpperCase() + s.slice(1)
  return s + '.'
}

// 한국어 한 문장: 조각 조합
function koSentence(rnd: () => number): string {
  const pick = (arr: string[]) => arr[Math.floor(rnd() * arr.length)]
  return `${pick(KO_SUBJECTS)} ${pick(KO_MIDDLES)} ${pick(KO_OBJECTS)} ${pick(KO_TAILS)}`
}

function makeParagraph(lang: Lang, sentenceCount: number, rnd: () => number): string {
  const out: string[] = []
  for (let i = 0; i < sentenceCount; i++) {
    out.push(lang === 'latin' ? latinSentence(rnd) : koSentence(rnd))
  }
  return out.join(' ')
}

// 시드 없이도 매번 다르게: Math.random 래핑(테스트 가능하도록 함수 주입형)
function generate(lang: Lang, paragraphs: number, sentences: number, startLorem: boolean): string {
  const rnd = Math.random
  const ps: string[] = []
  for (let p = 0; p < paragraphs; p++) {
    let para = makeParagraph(lang, sentences, rnd)
    // 라틴 첫 문단 첫머리는 관례적으로 'Lorem ipsum dolor sit amet'으로 시작
    if (p === 0 && lang === 'latin' && startLorem) {
      para = 'Lorem ipsum dolor sit amet, ' + para.charAt(0).toLowerCase() + para.slice(1)
    }
    ps.push(para)
  }
  return ps.join('\n\n')
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n))

type Persisted = { lang: Lang; paragraphs: number; sentences: number; startLorem: boolean }

function loadState(): Persisted {
  const fallback: Persisted = { lang: 'latin', paragraphs: 3, sentences: 4, startLorem: true }
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (!raw) return fallback
    const o = JSON.parse(raw)
    return {
      lang: o?.lang === 'ko' ? 'ko' : 'latin',
      paragraphs: clamp(Number(o?.paragraphs) || 3, 1, 30),
      sentences: clamp(Number(o?.sentences) || 4, 1, 20),
      startLorem: o?.startLorem !== false,
    }
  } catch {
    return fallback
  }
}

export default function LoremGenerator() {
  const init = useMemo(loadState, [])
  const [lang, setLang] = useState<Lang>(init.lang)
  const [paragraphs, setParagraphs] = useState<number>(init.paragraphs)
  const [sentences, setSentences] = useState<number>(init.sentences)
  const [startLorem, setStartLorem] = useState<boolean>(init.startLorem)
  const [output, setOutput] = useState('')
  const [copied, setCopied] = useState(false)
  const timerRef = useRef<number | null>(null)

  // 설정 영속 저장
  useEffect(() => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({ lang, paragraphs, sentences, startLorem }))
    } catch {
      // 스토리지 미지원/쿼터 초과 graceful
    }
  }, [lang, paragraphs, sentences, startLorem])

  // 복사 표시 타이머 정리(언마운트 안전망)
  useEffect(() => {
    return () => {
      if (timerRef.current != null) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [])

  const stats = useMemo(() => {
    const chars = [...output].length
    const charsNoSpace = [...output.replace(/\s/g, '')].length
    const words = output.trim() ? output.trim().split(/\s+/).length : 0
    const paras = output === '' ? 0 : output.split(/\n{2,}/).filter(Boolean).length
    return { chars, charsNoSpace, words, paras }
  }, [output])

  const run = () => {
    try {
      const p = clamp(Math.round(paragraphs) || 1, 1, 30)
      const s = clamp(Math.round(sentences) || 1, 1, 20)
      setOutput(generate(lang, p, s, startLorem))
    } catch {
      // 어떤 이유로든 생성 실패 시 graceful (throw 금지)
      setOutput('')
    }
  }

  const copy = () => {
    if (!output) return
    const done = () => {
      setCopied(true)
      if (timerRef.current != null) clearTimeout(timerRef.current)
      timerRef.current = window.setTimeout(() => setCopied(false), 1400)
    }
    try {
      const r = navigator.clipboard?.writeText(output)
      if (r && typeof r.then === 'function') r.then(done).catch(() => {})
      else done()
    } catch {
      // 클립보드 미지원 환경 graceful
    }
  }

  const clear = () => setOutput('')

  // ── styles ──
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 12, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const panel: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 12, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: 12 }
  const row: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }
  const label: React.CSSProperties = { fontSize: 13, color: 'var(--muted)', minWidth: 92 }
  const seg: React.CSSProperties = { display: 'inline-flex', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }
  const segBtn = (active: boolean): React.CSSProperties => ({
    padding: '6px 14px', fontSize: 13, cursor: 'pointer', border: 'none',
    background: active ? 'var(--accent)' : 'var(--chrome-2)',
    color: active ? '#fff' : 'var(--text)', fontWeight: active ? 700 : 500, fontFamily: 'inherit',
  })
  const numInput: React.CSSProperties = {
    width: 64, boxSizing: 'border-box', padding: '6px 8px', fontSize: 14, textAlign: 'center',
    color: 'var(--text)', background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 8, outline: 'none', fontFamily: 'inherit',
  }
  const statBox: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' as React.CSSProperties['fontVariantNumeric'] }
  const outArea: React.CSSProperties = {
    flex: 1, minHeight: 0, resize: 'none', boxSizing: 'border-box', width: '100%',
    background: 'var(--paper)', color: 'var(--text)', border: '1px solid var(--border)',
    borderRadius: 10, padding: '12px 14px', fontSize: 14, lineHeight: 1.7, outline: 'none', fontFamily: 'inherit', overflowY: 'auto',
  }
  const numWrap: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8 }

  return (
    <div style={wrap}>
      <div style={panel}>
        <div style={row}>
          <span style={label}>언어</span>
          <div style={seg} role="tablist" aria-label="더미 텍스트 언어">
            <button style={segBtn(lang === 'latin')} onClick={() => setLang('latin')} role="tab" aria-selected={lang === 'latin'}>라틴 (Lorem)</button>
            <button style={segBtn(lang === 'ko')} onClick={() => setLang('ko')} role="tab" aria-selected={lang === 'ko'}>한국어</button>
          </div>
        </div>

        <div style={row}>
          <span style={label}>문단 수</span>
          <div style={numWrap}>
            <button className="minibtn" onClick={() => setParagraphs(v => clamp(v - 1, 1, 30))} aria-label="문단 수 감소">−</button>
            <input
              style={numInput} type="number" min={1} max={30} value={paragraphs}
              onChange={e => setParagraphs(clamp(parseInt(e.target.value, 10) || 1, 1, 30))}
              aria-label="문단 수"
            />
            <button className="minibtn" onClick={() => setParagraphs(v => clamp(v + 1, 1, 30))} aria-label="문단 수 증가">+</button>
          </div>
        </div>

        <div style={row}>
          <span style={label}>문단당 문장</span>
          <div style={numWrap}>
            <button className="minibtn" onClick={() => setSentences(v => clamp(v - 1, 1, 20))} aria-label="문장 수 감소">−</button>
            <input
              style={numInput} type="number" min={1} max={20} value={sentences}
              onChange={e => setSentences(clamp(parseInt(e.target.value, 10) || 1, 1, 20))}
              aria-label="문단당 문장 수"
            />
            <button className="minibtn" onClick={() => setSentences(v => clamp(v + 1, 1, 20))} aria-label="문장 수 증가">+</button>
          </div>
        </div>

        {lang === 'latin' && (
          <label style={{ ...row, fontSize: 13, color: 'var(--muted)', cursor: 'pointer', gap: 8 }}>
            <input type="checkbox" checked={startLorem} onChange={e => setStartLorem(e.target.checked)} />
            첫 문단을 “Lorem ipsum dolor sit amet…”으로 시작
          </label>
        )}

        <div style={{ ...row, justifyContent: 'space-between' }}>
          <button className="btn-primary" onClick={run}>✨ 생성</button>
          <div style={row}>
            <button className="minibtn" onClick={copy} disabled={!output} title="결과 복사">
              {copied ? '✓ 복사됨' : '📋 복사'}
            </button>
            <button className="minibtn" onClick={clear} disabled={!output}>↺ 비우기</button>
          </div>
        </div>
      </div>

      <div style={{ ...row, justifyContent: 'space-between' }}>
        <span style={statBox}>
          {output
            ? <>문단 <b>{stats.paras}</b> · 단어 <b>{stats.words}</b> · 글자 <b>{stats.chars}</b> (공백제외 {stats.charsNoSpace})</>
            : '아래 “생성” 버튼을 눌러 더미 텍스트를 만드세요.'}
        </span>
      </div>

      <textarea
        style={outArea}
        value={output}
        onChange={e => setOutput(e.target.value)}
        placeholder="여기에 생성된 더미 텍스트가 표시됩니다. 옵션을 설정한 뒤 “생성”을 누르세요. 결과는 직접 편집할 수도 있습니다."
        spellCheck={false}
        aria-label="생성된 더미 텍스트"
      />
    </div>
  )
}
