import { useState, useMemo } from 'react'

export const meta = { id: 'manuscript-calc', name: '원고 분량 계산기', icon: '📝', group: '유틸·참고', intro: '글자수·원고지 매수·예상 페이지·읽기시간을 실시간 계산', w: 560, h: 620 }

export default function ManuscriptCalc() {
  const [text, setText] = useState('')
  const [copied, setCopied] = useState('')

  const stats = useMemo(() => {
    const withSpace = [...text].length
    const noSpace = [...text.replace(/\s/g, '')].length
    const words = text.trim() === '' ? 0 : text.trim().split(/\s+/).length
    const sheets = withSpace / 200
    const pages = noSpace / 1000
    const readMin = noSpace === 0 ? 0 : noSpace / 500
    return { withSpace, noSpace, words, sheets, pages, readMin }
  }, [text])

  const fmt = (n: number, d = 0) =>
    new Intl.NumberFormat('ko-KR', { minimumFractionDigits: d, maximumFractionDigits: d }).format(n)

  const readLabel = useMemo(() => {
    const m = stats.readMin
    if (m === 0) return '0분'
    if (m < 1) return '1분 미만'
    const total = Math.round(m)
    if (total < 60) return `약 ${total}분`
    const h = Math.floor(total / 60)
    const mm = total % 60
    return mm === 0 ? `약 ${h}시간` : `약 ${h}시간 ${mm}분`
  }, [stats.readMin])

  const rows: { key: string; label: string; value: string; hint?: string }[] = [
    { key: 'withSpace', label: '글자수 (공백 포함)', value: `${fmt(stats.withSpace)}자` },
    { key: 'noSpace', label: '글자수 (공백 제외)', value: `${fmt(stats.noSpace)}자` },
    { key: 'words', label: '단어 (어절) 수', value: `${fmt(stats.words)}개` },
    { key: 'sheets', label: '200자 원고지', value: `${fmt(stats.sheets, 1)}매`, hint: '공백 포함 ÷ 200' },
    { key: 'pages', label: '예상 책 페이지', value: `${fmt(stats.pages, 1)}쪽`, hint: '공백 제외 1,000자/쪽 환산' },
    { key: 'read', label: '예상 읽기시간', value: readLabel, hint: '분당 500자 기준' },
  ]

  const copy = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(key)
      setTimeout(() => setCopied(c => (c === key ? '' : c)), 1200)
    } catch {
      setCopied('')
    }
  }

  const copyAll = async () => {
    const summary = rows.map(r => `${r.label}: ${r.value}`).join('\n')
    try {
      await navigator.clipboard.writeText(summary)
      setCopied('all')
      setTimeout(() => setCopied(c => (c === 'all' ? '' : c)), 1200)
    } catch {
      setCopied('')
    }
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 12, color: 'var(--text)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label style={{ fontSize: 13, color: 'var(--muted)' }}>원고 텍스트를 붙여넣으세요</label>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="여기에 텍스트를 입력하거나 붙여넣으면 실시간으로 분량이 계산됩니다."
          spellCheck={false}
          style={{
            width: '100%',
            minHeight: 160,
            resize: 'vertical',
            boxSizing: 'border-box',
            padding: 12,
            fontSize: 14,
            lineHeight: 1.6,
            color: 'var(--text)',
            background: 'var(--paper)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            outline: 'none',
            fontFamily: 'inherit',
          }}
        />
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="minibtn" onClick={() => setText('')} disabled={text === ''}>
          지우기
        </button>
        <button className="btn-primary" onClick={copyAll} disabled={stats.withSpace === 0}>
          {copied === 'all' ? '복사됨 ✓' : '결과 전체 복사'}
        </button>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          background: 'var(--panel)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: 12,
        }}
      >
        {rows.map(r => (
          <div
            key={r.key}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              padding: '10px 12px',
              background: 'var(--chrome-2)',
              borderRadius: 8,
              border: '1px solid var(--border)',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>{r.label}</span>
              {r.hint && <span style={{ fontSize: 11, color: 'var(--muted)', opacity: 0.75 }}>{r.hint}</span>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent)', whiteSpace: 'nowrap' }}>
                {r.value}
              </span>
              <button
                className="minibtn"
                onClick={() => copy(r.key, r.value)}
                disabled={stats.withSpace === 0}
                title="이 값 복사"
              >
                {copied === r.key ? '✓' : '복사'}
              </button>
            </div>
          </div>
        ))}
      </div>

      <p style={{ margin: 0, fontSize: 11, color: 'var(--muted)', textAlign: 'center' }}>
        모든 계산은 브라우저에서 실시간으로 처리됩니다. (외부 전송 없음)
      </p>
    </div>
  )
}
