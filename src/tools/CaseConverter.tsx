// 대소문자/형식 변환 — 입력 텍스트를 UPPER/lower/Title/문장형/camelCase/snake_case/kebab-case 로 변환하고 글자수를 보여준다.
// 자급식: react 외 import 없음, 모든 변환은 로컬 정규식/문자열 로직으로 처리한다.
import { useState, useEffect, useRef, useMemo } from 'react'

export const meta = { id: 'case-converter', name: '대소문자 변환', icon: '🔠', group: '유틸·참고', intro: '텍스트를 UPPER·lower·Title·문장형·camel·snake·kebab 으로 변환', w: 480, h: 560 }

// 단어 단위로 분리: 공백/언더스코어/하이픈 구분 + camelCase 경계(소문자→대문자) 분리
function splitWords(s: string): string[] {
  return s
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2') // camelCase 경계
    .replace(/[_\-]+/g, ' ') // snake/kebab 구분자
    .trim()
    .split(/\s+/)
    .filter(Boolean)
}

function toUpper(s: string): string {
  return s.toUpperCase()
}

function toLower(s: string): string {
  return s.toLowerCase()
}

// 각 단어 첫 글자 대문자(영문 기준), 나머지 소문자
function toTitle(s: string): string {
  return s.replace(/\S+/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
}

// 문장형: 문장(. ! ? 또는 줄바꿈 뒤) 첫 글자만 대문자, 나머지 소문자
function toSentence(s: string): string {
  const lower = s.toLowerCase()
  return lower.replace(/(^\s*|[.!?]\s+|\n\s*)([a-z])/g, (_m, pre, ch) => pre + ch.toUpperCase())
}

function toCamel(s: string): string {
  const words = splitWords(s)
  if (words.length === 0) return ''
  return words
    .map((w, i) => {
      const lw = w.toLowerCase()
      return i === 0 ? lw : lw.charAt(0).toUpperCase() + lw.slice(1)
    })
    .join('')
}

function toPascal(s: string): string {
  return splitWords(s)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('')
}

function toSnake(s: string): string {
  return splitWords(s).map((w) => w.toLowerCase()).join('_')
}

function toKebab(s: string): string {
  return splitWords(s).map((w) => w.toLowerCase()).join('-')
}

type Row = { key: string; label: string; fn: (s: string) => string }

const ROWS: Row[] = [
  { key: 'upper', label: 'UPPER CASE', fn: toUpper },
  { key: 'lower', label: 'lower case', fn: toLower },
  { key: 'title', label: 'Title Case', fn: toTitle },
  { key: 'sentence', label: '문장형 (Sentence)', fn: toSentence },
  { key: 'camel', label: 'camelCase', fn: toCamel },
  { key: 'pascal', label: 'PascalCase', fn: toPascal },
  { key: 'snake', label: 'snake_case', fn: toSnake },
  { key: 'kebab', label: 'kebab-case', fn: toKebab },
]

export default function CaseConverter() {
  const [text, setText] = useState('')
  const [copied, setCopied] = useState<string | null>(null)
  const taRef = useRef<HTMLTextAreaElement | null>(null)
  const timerRef = useRef<number | null>(null)

  // 복사 표시 타이머 정리(언마운트 안전망)
  useEffect(() => {
    return () => {
      if (timerRef.current != null) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [])

  const results = useMemo(() => ROWS.map((r) => ({ ...r, value: r.fn(text) })), [text])

  // 글자수(전체/공백제외)·단어수
  const stats = useMemo(() => {
    const all = text.length
    const noSpace = text.replace(/\s/g, '').length
    const words = text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0
    const lines = text === '' ? 0 : text.split(/\n/).length
    return { all, noSpace, words, lines }
  }, [text])

  const copy = (key: string, value: string) => {
    if (!value) return
    const done = () => {
      setCopied(key)
      if (timerRef.current != null) clearTimeout(timerRef.current)
      timerRef.current = window.setTimeout(() => setCopied(null), 1400)
    }
    try {
      const p = navigator.clipboard?.writeText(value)
      if (p && typeof p.then === 'function') p.then(done).catch(() => {})
      else done()
    } catch {
      // 클립보드 미지원 환경 graceful
    }
  }

  const clear = () => {
    setText('')
    taRef.current?.focus()
  }

  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 12, padding: 14, boxSizing: 'border-box', color: 'var(--text)', overflow: 'hidden' }
  const bar: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }
  const statBox: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' as React.CSSProperties['fontVariantNumeric'], lineHeight: 1.5 }
  const taStyle: React.CSSProperties = {
    minHeight: 84, resize: 'none', boxSizing: 'border-box', width: '100%',
    background: 'var(--paper)', color: 'var(--text)', border: '1px solid var(--border)',
    borderRadius: 10, padding: '12px 14px', fontSize: 15, lineHeight: 1.6, outline: 'none', fontFamily: 'inherit',
  }
  const list: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }
  const card: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 5 }
  const cardHead: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }
  const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: 'var(--muted)' }
  const valStyle: React.CSSProperties = { fontSize: 14, color: 'var(--text)', wordBreak: 'break-word', whiteSpace: 'pre-wrap', lineHeight: 1.5, minHeight: 18, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }
  const placeholderVal: React.CSSProperties = { ...valStyle, color: 'var(--muted)', fontStyle: 'italic' }

  return (
    <div style={wrap}>
      <div style={bar}>
        <div style={statBox}>
          글자 <b>{stats.all}</b> · 공백제외 <b>{stats.noSpace}</b> · 단어 <b>{stats.words}</b> · 줄 <b>{stats.lines}</b>
        </div>
        <button className="minibtn" onClick={clear} disabled={text.length === 0}>↺ 비우기</button>
      </div>

      <textarea
        ref={taRef}
        style={taStyle}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="변환할 텍스트를 입력하세요. 예: hello world example"
        spellCheck={false}
        aria-label="변환할 텍스트 입력"
      />

      <div style={list}>
        {results.map((r) => (
          <div key={r.key} style={card}>
            <div style={cardHead}>
              <span style={labelStyle}>{r.label}</span>
              <button
                className="minibtn"
                onClick={() => copy(r.key, r.value)}
                disabled={!r.value}
                title="결과 복사"
              >
                {copied === r.key ? '✓ 복사됨' : '📋 복사'}
              </button>
            </div>
            <div style={r.value ? valStyle : placeholderVal}>{r.value || '입력 대기 중…'}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
