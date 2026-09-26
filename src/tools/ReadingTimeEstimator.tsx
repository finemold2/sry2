import { useState, useEffect, useMemo, useRef } from 'react'
import {
  addToProject,
  hasProjectBridge,
  addToStash,
  hasStash,
  getDragItem,
  isItemDrag,
  Emoji,
} from './linkbus'

export const meta = {
  id: 'reading-time-estimator',
  name: '독서 시간·연재 분량 계산기',
  icon: '⏱️',
  group: '유틸·참고',
  intro: '본문/글자수로 예상 독서 시간, 연재 회차 분할, 단행본 권수를 한 번에 계산',
  w: 640,
  h: 720,
}

// ---------- 영속 ----------
const LS = 'sry:tool:reading-time-estimator'

interface Settings {
  wpm: number            // 분당 독서 속도(글자/분)
  countBasis: 'noSpace' | 'withSpace' // 속도/환산 기준
  perEpisode: number     // 회당 목표 글자수
  perVolume: number      // 권당 글자수(단행본 환산)
  charsPerPage: number   // 페이지당 글자수
  inputMode: 'text' | 'manual' // 본문 붙여넣기 / 글자수 직접 입력
  manualChars: number    // 직접 입력 글자수
}

const PRESETS: { label: string; wpm: number; hint: string }[] = [
  { label: '느긋하게', wpm: 350, hint: '정독·집중 독서' },
  { label: '보통', wpm: 500, hint: '일반 성인 한국어 독서' },
  { label: '빠르게', wpm: 700, hint: '익숙한 장르·가벼운 글' },
  { label: '훑어보기', wpm: 1000, hint: '발췌독·속독' },
]

const DEFAULTS: Settings = {
  wpm: 500,
  countBasis: 'noSpace',
  perEpisode: 5500,
  perVolume: 110000,
  charsPerPage: 1000,
  inputMode: 'text',
  manualChars: 0,
}

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(LS)
    if (raw) {
      const p = JSON.parse(raw) as Partial<Settings>
      return { ...DEFAULTS, ...p }
    }
  } catch {
    /* noop */
  }
  return { ...DEFAULTS }
}

// ---------- 포맷 ----------
const nf = new Intl.NumberFormat('ko-KR')
const fmt = (n: number, d = 0) =>
  new Intl.NumberFormat('ko-KR', {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  }).format(Number.isFinite(n) ? n : 0)

function fmtDuration(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return '0분'
  if (minutes < 1) return '1분 미만'
  const totalSec = Math.round(minutes * 60)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  const parts: string[] = []
  if (h > 0) parts.push(`${h}시간`)
  if (m > 0) parts.push(`${m}분`)
  if (h === 0 && s > 0) parts.push(`${s}초`)
  if (parts.length === 0) return '1분 미만'
  return parts.join(' ')
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// ---------- 텍스트 통계 ----------
interface TextStats {
  withSpace: number
  noSpace: number
  words: number
  sentences: number
}
function analyze(text: string): TextStats {
  const withSpace = [...text].length
  const noSpace = [...text.replace(/\s/g, '')].length
  const words = text.trim() === '' ? 0 : text.trim().split(/\s+/).length
  // 한국어 + 영문 문장부호 처리(.!?… 와 줄바꿈을 문장 경계로)
  const sentences =
    text.trim() === ''
      ? 0
      : text
          .replace(/\n+/g, ' ')
          .split(/(?<=[.!?…。！？])\s+|\n/)
          .map(s => s.trim())
          .filter(Boolean).length || (text.trim() ? 1 : 0)
  return { withSpace, noSpace, words, sentences }
}

export default function ReadingTimeEstimator({
  payload,
}: {
  payload?: Record<string, unknown>
}) {
  const [text, setText] = useState('')
  const [s, setS] = useState<Settings>(loadSettings)
  const [copied, setCopied] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [savedNote, setSavedNote] = useState('')
  const copyTimer = useRef<number | null>(null)
  const noteTimer = useRef<number | null>(null)

  // 페이로드(연계로 본문/글자수 전달) 수용
  useEffect(() => {
    if (!payload) return
    if (typeof payload.text === 'string') {
      setText(payload.text)
      setS(prev => ({ ...prev, inputMode: 'text' }))
    } else if (typeof payload.chars === 'number') {
      setS(prev => ({ ...prev, inputMode: 'manual', manualChars: Math.max(0, Math.round(payload.chars as number)) }))
    }
  }, [payload])

  // 설정 영속
  useEffect(() => {
    try {
      localStorage.setItem(LS, JSON.stringify(s))
    } catch {
      /* 용량 초과 등 무시 */
    }
  }, [s])

  // 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (copyTimer.current) window.clearTimeout(copyTimer.current)
      if (noteTimer.current) window.clearTimeout(noteTimer.current)
    }
  }, [])

  const stats = useMemo(() => analyze(text), [text])

  // 기준 글자수(본문 모드면 통계에서, 수동 모드면 입력값)
  const baseChars = useMemo(() => {
    if (s.inputMode === 'manual') return Math.max(0, Math.round(s.manualChars))
    return s.countBasis === 'withSpace' ? stats.withSpace : stats.noSpace
  }, [s.inputMode, s.manualChars, s.countBasis, stats.withSpace, stats.noSpace])

  const wpm = Math.max(1, s.wpm)

  // 독서 시간
  const readMinutes = baseChars / wpm

  // 페이지/원고지/권수
  const cpp = Math.max(1, s.charsPerPage)
  const pages = baseChars / cpp
  const sheets = (s.countBasis === 'withSpace' ? (s.inputMode === 'manual' ? baseChars : stats.withSpace) : (s.inputMode === 'manual' ? baseChars : stats.withSpace)) / 200
  const perVol = Math.max(1, s.perVolume)
  const volumes = baseChars / perVol

  // 연재 회차 분할
  const perEp = Math.max(1, s.perEpisode)
  const episodeCount = baseChars === 0 ? 0 : Math.ceil(baseChars / perEp)
  const episodes = useMemo(() => {
    if (baseChars === 0) return [] as { idx: number; chars: number; minutes: number }[]
    const out: { idx: number; chars: number; minutes: number }[] = []
    let remaining = baseChars
    let idx = 1
    while (remaining > 0 && idx <= 5000) {
      const c = Math.min(perEp, remaining)
      out.push({ idx, chars: c, minutes: c / wpm })
      remaining -= c
      idx++
    }
    return out
  }, [baseChars, perEp, wpm])
  const lastEp = episodes.length ? episodes[episodes.length - 1].chars : 0
  const lastEpRatio = episodes.length ? Math.round((lastEp / perEp) * 100) : 0

  // ---------- 액션 ----------
  const flashCopy = (key: string) => {
    setCopied(key)
    if (copyTimer.current) window.clearTimeout(copyTimer.current)
    copyTimer.current = window.setTimeout(() => setCopied(c => (c === key ? '' : c)), 1300)
  }
  const flashNote = (msg: string) => {
    setSavedNote(msg)
    if (noteTimer.current) window.clearTimeout(noteTimer.current)
    noteTimer.current = window.setTimeout(() => setSavedNote(''), 1800)
  }

  const summaryText = useMemo(() => {
    const basisLabel = s.countBasis === 'withSpace' ? '공백 포함' : '공백 제외'
    const lines = [
      `[독서 시간·연재 분량 계산]`,
      `기준 글자수: ${nf.format(baseChars)}자 (${s.inputMode === 'manual' ? '직접 입력' : basisLabel})`,
      `독서 속도: 분당 ${nf.format(wpm)}자`,
      `예상 독서 시간: ${fmtDuration(readMinutes)}`,
      `예상 페이지: ${fmt(pages, 1)}쪽 (페이지당 ${nf.format(cpp)}자)`,
      `200자 원고지: ${fmt(sheets, 1)}매`,
      `단행본 환산: ${fmt(volumes, 2)}권 (권당 ${nf.format(perVol)}자)`,
      ``,
      `연재 분할 (회당 ${nf.format(perEp)}자): 총 ${nf.format(episodeCount)}회`,
    ]
    if (episodes.length) {
      lines.push(`회당 예상 독서 시간: 약 ${fmtDuration(perEp / wpm)}`)
      lines.push(`마지막 ${episodes.length}회 분량: ${nf.format(lastEp)}자 (목표의 ${lastEpRatio}%)`)
    }
    return lines.join('\n')
  }, [s, baseChars, wpm, readMinutes, pages, cpp, sheets, volumes, perVol, perEp, episodeCount, episodes.length, lastEp, lastEpRatio])

  const copy = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      flashCopy(key)
    } catch {
      setCopied('')
    }
  }

  const sendToProject = () => {
    if (!hasProjectBridge()) return
    const basisLabel = s.countBasis === 'withSpace' ? '공백 포함' : '공백 제외'
    const epRows = episodes
      .map(
        e =>
          `<tr><td>${e.idx}회</td><td>${nf.format(e.chars)}자</td><td>${escapeHtml(
            fmtDuration(e.minutes),
          )}</td></tr>`,
      )
      .join('')
    const html =
      `<h2>독서 시간·연재 분량 계산 결과</h2>` +
      `<ul>` +
      `<li>기준 글자수: ${nf.format(baseChars)}자 (${escapeHtml(
        s.inputMode === 'manual' ? '직접 입력' : basisLabel,
      )})</li>` +
      `<li>독서 속도: 분당 ${nf.format(wpm)}자</li>` +
      `<li>예상 독서 시간: ${escapeHtml(fmtDuration(readMinutes))}</li>` +
      `<li>예상 페이지: ${escapeHtml(fmt(pages, 1))}쪽 / 200자 원고지 ${escapeHtml(fmt(sheets, 1))}매</li>` +
      `<li>단행본 환산: ${escapeHtml(fmt(volumes, 2))}권 (권당 ${nf.format(perVol)}자)</li>` +
      `<li>연재 분할: 회당 ${nf.format(perEp)}자 → 총 ${nf.format(episodeCount)}회</li>` +
      `</ul>` +
      (epRows
        ? `<h3>회차별 분량</h3><table><thead><tr><th>회차</th><th>분량</th><th>예상 독서</th></tr></thead><tbody>${epRows}</tbody></table>`
        : '')
    const id = addToProject({
      root: 'research',
      folder: '집필 메모',
      title: `독서·연재 분량 (${nf.format(baseChars)}자)`,
      bodyHtml: html,
      meta: {
        글자수: nf.format(baseChars),
        예상독서: fmtDuration(readMinutes),
        연재회차: `${nf.format(episodeCount)}회`,
        단행본: `${fmt(volumes, 2)}권`,
      },
    })
    flashNote(id ? '프로젝트에 추가됨 ✓' : '추가 실패')
  }

  const sendToStash = () => {
    if (!hasStash()) return
    addToStash({
      kind: 'memo',
      label: `독서·연재 분량 (${nf.format(baseChars)}자)`,
      text: summaryText,
    })
    flashNote('수집함에 담음 ✓')
  }

  // ---------- 좌측 파일 드롭 ----------
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const item = getDragItem(e)
    if (item && typeof item.text === 'string' && item.text.trim()) {
      setText(item.text)
      setS(prev => ({ ...prev, inputMode: 'text' }))
      flashNote(`"${item.title}" 본문 불러옴 ✓`)
    }
  }
  const onDragOver = (e: React.DragEvent) => {
    if (isItemDrag(e)) {
      e.preventDefault()
      setDragOver(true)
    }
  }
  const onDragLeave = () => setDragOver(false)

  // ---------- 스타일 헬퍼 ----------
  const card: React.CSSProperties = {
    background: 'var(--panel)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    padding: 12,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  }
  const numInput: React.CSSProperties = {
    width: 110,
    boxSizing: 'border-box',
    padding: '6px 8px',
    fontSize: 13,
    color: 'var(--text)',
    background: 'var(--paper)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    outline: 'none',
    fontFamily: 'inherit',
  }
  const labelStyle: React.CSSProperties = { fontSize: 13, color: 'var(--muted)' }

  const setNum = (k: keyof Settings) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value.replace(/[^\d.]/g, ''))
    setS(prev => ({ ...prev, [k]: Number.isFinite(v) ? v : 0 }))
  }

  const empty = baseChars === 0

  // 주요 결과 행
  const resultRows: { key: string; label: string; value: string; hint?: string; accent?: boolean }[] = [
    { key: 'chars', label: '기준 글자수', value: `${nf.format(baseChars)}자`, hint: s.inputMode === 'manual' ? '직접 입력값' : s.countBasis === 'withSpace' ? '공백 포함' : '공백 제외', accent: true },
    { key: 'read', label: '예상 독서 시간', value: fmtDuration(readMinutes), hint: `분당 ${nf.format(wpm)}자`, accent: true },
    { key: 'pages', label: '예상 페이지', value: `${fmt(pages, 1)}쪽`, hint: `페이지당 ${nf.format(cpp)}자` },
    { key: 'sheets', label: '200자 원고지', value: `${fmt(sheets, 1)}매` },
    { key: 'volumes', label: '단행본 환산', value: `${fmt(volumes, 2)}권`, hint: `권당 ${nf.format(perVol)}자` },
    { key: 'episodes', label: '연재 회차 수', value: `${nf.format(episodeCount)}회`, hint: `회당 ${nf.format(perEp)}자`, accent: true },
  ]

  return (
    <div
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        color: 'var(--text)',
        overflow: 'auto',
        position: 'relative',
        outline: dragOver ? '2px dashed var(--accent)' : 'none',
        outlineOffset: -4,
        borderRadius: 8,
      }}
    >
      {dragOver && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'color-mix(in srgb, var(--accent) 12%, transparent)',
            zIndex: 5,
            pointerEvents: 'none',
            fontSize: 15,
            color: 'var(--accent)',
            fontWeight: 700,
          }}
        >
          여기에 놓아 본문 불러오기
        </div>
      )}

      {/* 입력 모드 */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          className={s.inputMode === 'text' ? 'btn-primary' : 'minibtn'}
          onClick={() => setS(p => ({ ...p, inputMode: 'text' }))}
        >
          본문 붙여넣기
        </button>
        <button
          className={s.inputMode === 'manual' ? 'btn-primary' : 'minibtn'}
          onClick={() => setS(p => ({ ...p, inputMode: 'manual' }))}
        >
          글자수 직접 입력
        </button>
        {savedNote && (
          <span style={{ fontSize: 12, color: 'var(--ok)', marginLeft: 'auto' }}>{savedNote}</span>
        )}
      </div>

      {s.inputMode === 'text' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={labelStyle}>
            본문 텍스트 (좌측 파일을 끌어다 놓아도 됩니다)
          </label>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="여기에 원고를 붙여넣으면 글자수·독서 시간·연재 분량이 실시간 계산됩니다."
            spellCheck={false}
            style={{
              width: '100%',
              minHeight: 130,
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
          <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--muted)', flexWrap: 'wrap' }}>
            <span>공백 포함 {nf.format(stats.withSpace)}자</span>
            <span>공백 제외 {nf.format(stats.noSpace)}자</span>
            <span>어절 {nf.format(stats.words)}개</span>
            <span>문장 {nf.format(stats.sentences)}개</span>
            <button className="minibtn" style={{ marginLeft: 'auto' }} onClick={() => setText('')} disabled={text === ''}>
              지우기
            </button>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={labelStyle}>계산 기준:</span>
            <button
              className={s.countBasis === 'noSpace' ? 'btn-primary' : 'minibtn'}
              onClick={() => setS(p => ({ ...p, countBasis: 'noSpace' }))}
            >
              공백 제외
            </button>
            <button
              className={s.countBasis === 'withSpace' ? 'btn-primary' : 'minibtn'}
              onClick={() => setS(p => ({ ...p, countBasis: 'withSpace' }))}
            >
              공백 포함
            </button>
          </div>
        </div>
      ) : (
        <div style={card}>
          <label style={labelStyle}>글자수 직접 입력</label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="text"
              inputMode="numeric"
              value={s.manualChars || ''}
              onChange={setNum('manualChars')}
              placeholder="예: 50000"
              style={{ ...numInput, width: 160 }}
            />
            <span style={labelStyle}>자</span>
            <div style={{ display: 'flex', gap: 6, marginLeft: 'auto', flexWrap: 'wrap' }}>
              {[10000, 50000, 100000].map(v => (
                <button key={v} className="minibtn" onClick={() => setS(p => ({ ...p, manualChars: v }))}>
                  +{nf.format(v / 10000)}만
                </button>
              ))}
              <button className="minibtn" onClick={() => setS(p => ({ ...p, manualChars: 0 }))} disabled={s.manualChars === 0}>
                0
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 독서 속도 */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <label style={labelStyle}>분당 독서 속도</label>
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent)' }}>{nf.format(wpm)}자/분</span>
        </div>
        <input
          type="range"
          min={150}
          max={1500}
          step={10}
          value={Math.min(1500, Math.max(150, wpm))}
          onChange={e => setS(p => ({ ...p, wpm: Number(e.target.value) }))}
          style={{ width: '100%', accentColor: 'var(--accent)' }}
        />
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {PRESETS.map(p => (
            <button
              key={p.wpm}
              className={wpm === p.wpm ? 'btn-primary' : 'minibtn'}
              title={p.hint}
              onClick={() => setS(prev => ({ ...prev, wpm: p.wpm }))}
            >
              {p.label} {p.wpm}
            </button>
          ))}
        </div>
      </div>

      {/* 환산 설정 */}
      <div style={card}>
        <label style={{ ...labelStyle, fontWeight: 600 }}>분량 환산 설정</label>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
          <span style={labelStyle}>회당 목표 글자수 (연재)</span>
          <input type="text" inputMode="numeric" value={s.perEpisode || ''} onChange={setNum('perEpisode')} style={numInput} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
          <span style={labelStyle}>권당 글자수 (단행본)</span>
          <input type="text" inputMode="numeric" value={s.perVolume || ''} onChange={setNum('perVolume')} style={numInput} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
          <span style={labelStyle}>페이지당 글자수</span>
          <input type="text" inputMode="numeric" value={s.charsPerPage || ''} onChange={setNum('charsPerPage')} style={numInput} />
        </div>
        <button
          className="minibtn"
          style={{ alignSelf: 'flex-start' }}
          onClick={() => setS(p => ({ ...p, perEpisode: DEFAULTS.perEpisode, perVolume: DEFAULTS.perVolume, charsPerPage: DEFAULTS.charsPerPage }))}
        >
          환산값 기본으로
        </button>
      </div>

      {/* 결과 요약 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8 }}>
        {resultRows.map(r => (
          <div
            key={r.key}
            style={{
              background: r.accent ? 'color-mix(in srgb, var(--accent) 10%, var(--panel))' : 'var(--panel)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '10px 12px',
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              opacity: empty ? 0.55 : 1,
            }}
          >
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>{r.label}</span>
            <span style={{ fontSize: 20, fontWeight: 800, color: r.accent ? 'var(--accent)' : 'var(--text)', whiteSpace: 'nowrap' }}>
              {r.value}
            </span>
            {r.hint && <span style={{ fontSize: 11, color: 'var(--muted)', opacity: 0.8 }}>{r.hint}</span>}
          </div>
        ))}
      </div>

      {/* 연재 회차 분할 표 */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <label style={{ ...labelStyle, fontWeight: 600 }}>연재 회차 분할</label>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>
            {empty ? '본문/글자수를 입력하세요' : `총 ${nf.format(episodeCount)}회 · 회당 ${nf.format(perEp)}자`}
          </span>
        </div>
        {empty ? (
          <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>
            본문을 붙여넣거나 글자수를 입력하면 회차별 분량과 예상 독서 시간이 표시됩니다.
          </p>
        ) : (
          <>
            <div
              style={{
                maxHeight: 220,
                overflowY: 'auto',
                border: '1px solid var(--border)',
                borderRadius: 8,
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ position: 'sticky', top: 0, background: 'var(--panel)' }}>
                    <th style={thStyle}>회차</th>
                    <th style={thStyle}>분량</th>
                    <th style={thStyle}>예상 독서</th>
                    <th style={thStyle}>채움</th>
                  </tr>
                </thead>
                <tbody>
                  {episodes.map(e => {
                    const ratio = Math.min(100, Math.round((e.chars / perEp) * 100))
                    return (
                      <tr key={e.idx} style={{ borderTop: '1px solid var(--border)' }}>
                        <td style={tdStyle}>{e.idx}회</td>
                        <td style={tdStyle}>{nf.format(e.chars)}자</td>
                        <td style={{ ...tdStyle, color: 'var(--muted)' }}>{fmtDuration(e.minutes)}</td>
                        <td style={tdStyle}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 4, overflow: 'hidden', minWidth: 40 }}>
                              <div style={{ width: `${ratio}%`, height: '100%', background: 'var(--accent)' }} />
                            </div>
                            <span style={{ fontSize: 11, color: 'var(--muted)', width: 34, textAlign: 'right' }}>{ratio}%</span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>
              마지막 {episodes.length}회는 {nf.format(lastEp)}자 (목표의 {lastEpRatio}%) · 회당 예상 독서 약 {fmtDuration(perEp / wpm)}
            </span>
          </>
        )}
      </div>

      {/* 액션 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="btn-primary" onClick={() => copy('all', summaryText)} disabled={empty}>
          {copied === 'all' ? '복사됨 ✓' : '결과 전체 복사'}
        </button>
        <button className="minibtn" onClick={() => copy('read', `예상 독서 시간: ${fmtDuration(readMinutes)}`)} disabled={empty}>
          {copied === 'read' ? '✓' : '독서 시간만 복사'}
        </button>
        <button
          className="minibtn"
          onClick={() => copy('ep', episodes.map(e => `${e.idx}회: ${nf.format(e.chars)}자 (${fmtDuration(e.minutes)})`).join('\n'))}
          disabled={empty}
        >
          {copied === 'ep' ? '✓' : '회차 목록 복사'}
        </button>
        {hasProjectBridge() && (
          <button className="linkbtn" onClick={sendToProject} disabled={empty}>
            <Emoji e="📄" /> 프로젝트에 추가
          </button>
        )}
        {hasStash() && (
          <button className="linkbtn" onClick={sendToStash} disabled={empty}>
            <Emoji e="📌" /> 수집함에 담기
          </button>
        )}
      </div>

      <p style={{ margin: 0, fontSize: 11, color: 'var(--muted)', textAlign: 'center' }}>
        모든 계산은 브라우저에서 실시간 처리됩니다. (외부 전송 없음)
      </p>
    </div>
  )
}

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '8px 10px',
  fontSize: 12,
  color: 'var(--muted)',
  fontWeight: 600,
  borderBottom: '1px solid var(--border)',
}
const tdStyle: React.CSSProperties = {
  padding: '7px 10px',
  whiteSpace: 'nowrap',
}
