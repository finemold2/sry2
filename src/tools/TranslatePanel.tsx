import { useState, useEffect, useRef } from 'react'

export const meta = {
  id: 'translate-panel',
  name: '번역기',
  icon: '🌐',
  group: '리서치·자료',
  intro: '여러 언어 간 자동 번역 (키 불필요)',
  w: 460,
  h: 540,
}

type Lang = { code: string; label: string }

const LANGS: Lang[] = [
  { code: 'ko', label: '한국어' },
  { code: 'en', label: '영어' },
  { code: 'ja', label: '일본어' },
  { code: 'zh-CN', label: '중국어(간체)' },
  { code: 'es', label: '스페인어' },
  { code: 'fr', label: '프랑스어' },
  { code: 'de', label: '독일어' },
  { code: 'ru', label: '러시아어' },
  { code: 'vi', label: '베트남어' },
  { code: 'th', label: '태국어' },
]

export default function TranslatePanel() {
  const [text, setText] = useState('')
  const [from, setFrom] = useState('ko')
  const [to, setTo] = useState('en')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort()
      if (copyTimer.current) clearTimeout(copyTimer.current)
    }
  }, [])

  const swap = () => {
    setFrom(to)
    setTo(from)
    if (result) {
      setText(result)
      setResult('')
    }
  }

  const translate = async () => {
    const q = text.trim()
    if (!q) {
      setError('번역할 원문을 입력하세요.')
      setResult('')
      return
    }
    if (from === to) {
      setError('서로 다른 언어를 선택하세요.')
      return
    }
    setError('')
    setResult('')
    setLoading(true)

    if (abortRef.current) abortRef.current.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    try {
      const url =
        'https://api.mymemory.translated.net/get?q=' +
        encodeURIComponent(q) +
        '&langpair=' +
        encodeURIComponent(from + '|' + to)
      const res = await fetch(url, { signal: ctrl.signal })
      if (!res.ok) throw new Error('요청 실패 (' + res.status + ')')
      const data = await res.json()
      const translated: string =
        data && data.responseData && data.responseData.translatedText
          ? data.responseData.translatedText
          : ''
      if (data && data.responseStatus && data.responseStatus !== 200) {
        throw new Error(
          (data.responseDetails && String(data.responseDetails)) ||
            '번역에 실패했습니다.'
        )
      }
      if (!translated) {
        setError('번역 결과가 없습니다.')
        setResult('')
      } else {
        setResult(translated)
      }
    } catch (e: unknown) {
      if (e instanceof DOMException && e.name === 'AbortError') return
      setError(e instanceof Error ? e.message : '번역 중 오류가 발생했습니다.')
    } finally {
      if (abortRef.current === ctrl) {
        setLoading(false)
        abortRef.current = null
      }
    }
  }

  const copy = async () => {
    if (!result) return
    try {
      await navigator.clipboard.writeText(result)
      setCopied(true)
      if (copyTimer.current) clearTimeout(copyTimer.current)
      copyTimer.current = setTimeout(() => setCopied(false), 1500)
    } catch {
      setError('복사에 실패했습니다.')
    }
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      translate()
    }
  }

  const selectStyle: React.CSSProperties = {
    flex: 1,
    padding: '6px 8px',
    borderRadius: 6,
    border: '1px solid var(--border)',
    background: 'var(--paper)',
    color: 'var(--text)',
    fontSize: 13,
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    color: 'var(--muted)',
    marginBottom: 4,
  }

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        padding: 12,
        boxSizing: 'border-box',
        background: 'var(--panel)',
        color: 'var(--text)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <span style={labelStyle}>원문 언어</span>
          <select
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            style={selectStyle}
          >
            {LANGS.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
        </div>
        <button
          className="minibtn"
          onClick={swap}
          title="언어 방향 바꾸기"
          style={{ marginBottom: 1, whiteSpace: 'nowrap' }}
        >
          ⇄
        </button>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <span style={labelStyle}>번역 언어</span>
          <select
            value={to}
            onChange={(e) => setTo(e.target.value)}
            style={selectStyle}
          >
            {LANGS.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={labelStyle}>원문</span>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="번역할 문장을 입력하세요. (Ctrl+Enter 로 번역)"
          rows={5}
          style={{
            resize: 'vertical',
            padding: 8,
            borderRadius: 6,
            border: '1px solid var(--border)',
            background: 'var(--paper)',
            color: 'var(--text)',
            fontSize: 13,
            lineHeight: 1.5,
            fontFamily: 'inherit',
            boxSizing: 'border-box',
          }}
        />
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          className="btn-primary"
          onClick={translate}
          disabled={loading}
          style={{ flex: 1 }}
        >
          {loading ? '번역 중…' : '번역'}
        </button>
        <button
          className="minibtn"
          onClick={() => {
            setText('')
            setResult('')
            setError('')
          }}
          disabled={loading}
        >
          지우기
        </button>
      </div>

      {error && (
        <div
          style={{
            fontSize: 12,
            color: 'var(--warn)',
            padding: '6px 8px',
            borderRadius: 6,
            border: '1px solid var(--border)',
            background: 'var(--paper)',
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 4,
          }}
        >
          <span style={labelStyle}>번역 결과</span>
          <button
            className="minibtn"
            onClick={copy}
            disabled={!result}
            style={{ color: copied ? 'var(--ok)' : undefined }}
          >
            {copied ? '복사됨 ✓' : '복사'}
          </button>
        </div>
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            padding: 8,
            borderRadius: 6,
            border: '1px solid var(--border)',
            background: 'var(--chrome-2)',
            color: result ? 'var(--text)' : 'var(--muted)',
            fontSize: 13,
            lineHeight: 1.5,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            minHeight: 60,
          }}
        >
          {loading ? '번역 중…' : result || '결과가 여기에 표시됩니다.'}
        </div>
      </div>
    </div>
  )
}
