// 글꼴 미리보기 — 입력한 샘플 문장을 serif/sans-serif/monospace/cursive 및 한글 글꼴군(Nanum/Malgun 등)으로
// 동시에 표시하고, 슬라이더로 글자 크기를 조절한다. 본문 분위기 잡기용. 외부 네트워크/라이브러리 없이 로컬 CSS만 사용한다.
import { useState, useEffect, useRef, useMemo } from 'react'

export const meta = { id: 'font-preview', name: '글꼴 미리보기', icon: '🅰️', group: '분위기·시각', intro: '샘플 문장을 여러 서체로 동시에 보며 본문 분위기를 잡으세요', w: 520, h: 620 }

// CSS font-family 후보들. 시스템에 글꼴이 없으면 뒤의 일반 키워드로 자연스럽게 폴백된다(외부 로드 없음).
interface FontDef { key: string; label: string; note: string; family: string }

const FONTS: FontDef[] = [
  { key: 'system', label: '시스템 기본', note: 'OS 기본 UI 서체', family: 'system-ui, -apple-system, "Segoe UI", sans-serif' },
  { key: 'sans', label: '고딕 (sans-serif)', note: '깔끔·현대적', family: 'sans-serif' },
  { key: 'serif', label: '명조 (serif)', note: '차분·고전적', family: 'serif' },
  { key: 'malgun', label: '맑은 고딕', note: 'Windows 한글 고딕', family: '"Malgun Gothic", "맑은 고딕", sans-serif' },
  { key: 'applegothic', label: '애플 SD 산돌고딕', note: 'macOS 한글 고딕', family: '"Apple SD Gothic Neo", "AppleGothic", sans-serif' },
  { key: 'nanumgothic', label: '나눔고딕', note: '대중적 한글 고딕', family: '"NanumGothic", "Nanum Gothic", sans-serif' },
  { key: 'nanummyeongjo', label: '나눔명조', note: '서정적 한글 명조', family: '"NanumMyeongjo", "Nanum Myeongjo", serif' },
  { key: 'batang', label: '바탕 / 궁서 계열', note: '전통·문어체', family: '"Batang", "바탕", "Gungsuh", serif' },
  { key: 'mono', label: '고정폭 (monospace)', note: '타자기·코드 느낌', family: 'ui-monospace, "D2Coding", "Consolas", monospace' },
  { key: 'cursive', label: '필기체 (cursive)', note: '손글씨·감성', family: '"Gaegu", "Nanum Pen Script", cursive' },
]

const DEFAULT_SAMPLE = '봄밤의 강가에서 그는 오래도록 말이 없었다.\nThe quick brown fox jumps over the lazy dog. 0123456789'

const SAMPLE_PRESETS: { label: string; text: string }[] = [
  { label: '서정', text: '봄밤의 강가에서 그는 오래도록 말이 없었다.\nThe quick brown fox jumps over the lazy dog. 0123456789' },
  { label: '대사', text: '"정말 괜찮은 거야?" 그녀가 조용히 물었다.\n그는 고개를 끄덕였지만, 눈은 다른 곳을 보고 있었다.' },
  { label: '서술', text: '도시는 비에 젖어 번들거렸고, 가로등 불빛이 길게 늘어졌다.\n그 사이로 한 사람이 우산도 없이 걸어왔다.' },
  { label: '제목', text: '끝나지 않은 여름\n— 가나다라마바사 아자차카타파하 —' },
]

export default function FontPreview() {
  const [text, setText] = useState(DEFAULT_SAMPLE)
  const [size, setSize] = useState(20)
  const [copied, setCopied] = useState<string | null>(null)
  const timerRef = useRef<number | null>(null)

  // 복사 표시 타이머 정리(언마운트/재호출 안전)
  useEffect(() => {
    return () => {
      if (timerRef.current != null) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [])

  const display = useMemo(() => (text.trim() ? text : DEFAULT_SAMPLE), [text])

  const copyFamily = (key: string, family: string) => {
    const done = () => {
      setCopied(key)
      if (timerRef.current != null) clearTimeout(timerRef.current)
      timerRef.current = window.setTimeout(() => setCopied(null), 1400)
    }
    try {
      const p = navigator.clipboard?.writeText(`font-family: ${family};`)
      if (p && typeof p.then === 'function') p.then(done).catch(() => {})
      else done()
    } catch {
      // 클립보드 미지원·권한 거부 graceful
    }
  }

  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 12, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const taStyle: React.CSSProperties = {
    minHeight: 64, resize: 'none', boxSizing: 'border-box', width: '100%',
    background: 'var(--paper)', color: 'var(--text)', border: '1px solid var(--border)',
    borderRadius: 10, padding: '10px 12px', fontSize: 14, lineHeight: 1.6, outline: 'none', fontFamily: 'inherit',
  }
  const controls: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }
  const list: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 2 }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }
  const cardHead: React.CSSProperties = { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }

  return (
    <div style={wrap}>
      <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
        샘플 문장을 <b>여러 서체로 동시에</b> 보며 본문 분위기를 골라보세요. 글꼴이 시스템에 없으면 같은 계열로 자연스럽게 대체됩니다.
      </div>

      <textarea
        style={taStyle}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="미리볼 문장을 입력하세요"
        spellCheck={false}
        aria-label="미리볼 샘플 문장 입력"
      />

      <div style={controls}>
        <label style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 180 }}>
          <span style={{ flexShrink: 0 }}>크기 <b style={{ color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{size}px</b></span>
          <input
            type="range" min={12} max={48} step={1} value={size}
            onChange={(e) => setSize(Number(e.target.value))}
            style={{ flex: 1, accentColor: 'var(--accent)', cursor: 'pointer' }}
            aria-label="글자 크기 조절"
          />
        </label>
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {SAMPLE_PRESETS.map((p) => (
          <button key={p.label} className="minibtn" onClick={() => setText(p.text)} title="예시 문장 넣기">{p.label}</button>
        ))}
        <button className="minibtn" onClick={() => setText('')} disabled={!text} title="입력 비우기">↺ 비우기</button>
      </div>

      <div style={list}>
        {FONTS.map((f) => (
          <div key={f.key} style={card}>
            <div style={cardHead}>
              <span style={{ display: 'flex', alignItems: 'baseline', gap: 8, minWidth: 0 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{f.label}</span>
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>{f.note}</span>
              </span>
              <button
                className="minibtn"
                onClick={() => copyFamily(f.key, f.family)}
                title="font-family 복사"
              >
                {copied === f.key ? '✓ 복사됨' : '📋 family'}
              </button>
            </div>
            <div
              style={{
                fontFamily: f.family,
                fontSize: size,
                lineHeight: 1.5,
                color: 'var(--text)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {display}
            </div>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 11, color: 'var(--muted)' }}>
        같은 문장도 서체에 따라 분위기가 달라집니다. 명조는 차분하게, 고딕은 또렷하게, 필기체는 감성적으로 읽힙니다.
      </div>
    </div>
  )
}
