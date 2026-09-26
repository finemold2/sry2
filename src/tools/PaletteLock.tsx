// 팔레트 잠금 — Coolors식 잠금형 색 팔레트. 5색을 무작위 생성하고, 각 색에 잠금을 걸면
// 그 색은 유지된 채 나머지 색만 다시 생성된다. 색을 누르면 hex가 복사되고, 전체를 CSS 변수
// 블록으로 복사할 수 있다. 표지·테마 배색용. 외부 네트워크/라이브러리 없이 로컬에서만 동작.
import { useState, useEffect, useRef, useCallback } from 'react'
import { Emoji } from './linkbus'

export const meta = { id: 'palette-lock', name: '팔레트 잠금', icon: '🔒', group: '분위기·시각', intro: '잠금형 색 팔레트로 표지·테마 배색을 잡으세요', w: 460, h: 600 }

interface Swatch { hex: string; locked: boolean }

// HSL 기준으로 조화로운 무작위 한 색을 만든다.
function randHex(): string {
  const h = Math.floor(Math.random() * 360)
  const s = 35 + Math.floor(Math.random() * 55)   // 35~89
  const l = 30 + Math.floor(Math.random() * 50)   // 30~79
  return hslToHex(h, s, l)
}

function hslToHex(h: number, s: number, l: number): string {
  const sN = s / 100, lN = l / 100
  const c = (1 - Math.abs(2 * lN - 1)) * sN
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = lN - c / 2
  let r = 0, g = 0, b = 0
  if (h < 60) { r = c; g = x } else if (h < 120) { r = x; g = c } else if (h < 180) { g = c; b = x }
  else if (h < 240) { g = x; b = c } else if (h < 300) { r = x; b = c } else { r = c; b = x }
  const to = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0')
  return ('#' + to(r) + to(g) + to(b)).toUpperCase()
}

// hex 의 상대 밝기로 그 위에 올릴 글자 색(검정/흰색)을 정한다.
function readableText(hex: string): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16) / 255
  const g = parseInt(h.slice(2, 4), 16) / 255
  const b = parseInt(h.slice(4, 6), 16) / 255
  const lin = (v: number) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4))
  const lum = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
  return lum > 0.45 ? '#111111' : '#FFFFFF'
}

function makePalette(): Swatch[] {
  return Array.from({ length: 5 }, () => ({ hex: randHex(), locked: false }))
}

export default function PaletteLock() {
  const [palette, setPalette] = useState<Swatch[]>([])
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)
  const [copiedAll, setCopiedAll] = useState(false)
  // 언마운트 이후 setState 방지용 마운트 플래그(타이머 콜백 경쟁상태 차단).
  const mounted = useRef(true)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      timers.current.forEach((t) => clearTimeout(t))
      timers.current = []
    }
  }, [])

  // 잠긴 색은 그대로 두고 잠기지 않은 색만 새로 뽑는다.
  const regen = useCallback(() => {
    setPalette((prev) => {
      if (!prev.length) return makePalette()
      return prev.map((sw) => (sw.locked ? sw : { hex: randHex(), locked: false }))
    })
    if (mounted.current) { setCopiedIdx(null); setCopiedAll(false) }
  }, [])

  useEffect(() => { setPalette(makePalette()) }, [])

  const toggleLock = (idx: number) => {
    setPalette((prev) => prev.map((sw, i) => (i === idx ? { ...sw, locked: !sw.locked } : sw)))
  }

  const setHexAt = (idx: number, raw: string) => {
    // 사용자가 직접 입력한 hex 를 검증 후 반영(#RRGGBB).
    let v = raw.trim().toUpperCase()
    if (v && !v.startsWith('#')) v = '#' + v
    if (!/^#[0-9A-F]{6}$/.test(v)) return
    setPalette((prev) => prev.map((sw, i) => (i === idx ? { ...sw, hex: v } : sw)))
  }

  const after = (fn: () => void, ms: number) => {
    const t = setTimeout(() => { if (mounted.current) fn() }, ms)
    timers.current.push(t)
  }

  const safeCopy = (text: string, onDone: () => void) => {
    try {
      navigator.clipboard?.writeText(text).then(() => { if (mounted.current) onDone() }).catch(() => {})
    } catch { /* 클립보드 미지원·권한 거부 무시 */ }
  }

  const copyHex = (sw: Swatch, idx: number) => {
    safeCopy(sw.hex, () => { setCopiedIdx(idx); after(() => setCopiedIdx((c) => (c === idx ? null : c)), 1200) })
  }

  const copyCssVars = () => {
    if (!palette.length) return
    const lines = palette.map((sw, i) => `  --color-${i + 1}: ${sw.hex};`).join('\n')
    const text = `:root {\n${lines}\n}`
    safeCopy(text, () => { setCopiedAll(true); after(() => setCopiedAll(false), 1500) })
  }

  // 키보드 접근성: 스페이스/엔터로도 색 영역을 클릭하는 곳에서 hex 복사가 동작.
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, color: 'var(--text)', boxSizing: 'border-box' }

  return (
    <div style={wrap}>
      <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5, flexShrink: 0 }}>
        <b>5색 잠금형 팔레트</b>입니다. <Emoji e="🔒"/>로 색을 고정하면 그 색은 유지되고 나머지만 다시 생성됩니다. 색을 누르면 hex가 복사돼요.
      </div>

      {/* 세로 색 띠 — 각 칸이 hex 복사 버튼 + 잠금 토글 */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 6, overflowY: 'auto', paddingRight: 2 }}>
        {palette.map((sw, i) => {
          const fg = readableText(sw.hex)
          return (
            <div
              key={i}
              style={{
                position: 'relative', flex: 1, minHeight: 64, borderRadius: 10, background: sw.hex,
                border: '1px solid var(--border)', overflow: 'hidden',
                outline: sw.locked ? '2px solid var(--accent)' : 'none', outlineOffset: -2,
              }}
            >
              {/* 색 본문 클릭 → hex 복사 */}
              <button
                onClick={() => copyHex(sw, i)}
                title="클릭하면 hex 복사"
                style={{
                  position: 'absolute', inset: 0, background: 'transparent', border: 'none', cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2, padding: '0 14px',
                  textAlign: 'left', color: fg,
                }}
              >
                <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 18, letterSpacing: 0.5 }}>{sw.hex}</span>
                <span style={{ fontSize: 11, opacity: 0.85 }}>{copiedIdx === i ? <>✓ 복사됨</> : <><Emoji e="📋"/> 클릭해 복사</>}</span>
              </button>

              {/* 잠금 토글 — 우상단 */}
              <button
                onClick={(e) => { e.stopPropagation(); toggleLock(i) }}
                title={sw.locked ? '잠금 해제' : '이 색 잠그기'}
                aria-pressed={sw.locked}
                style={{
                  position: 'absolute', top: 8, right: 8, width: 32, height: 32, borderRadius: 8, cursor: 'pointer',
                  border: '1px solid ' + (sw.locked ? 'var(--accent)' : 'var(--border)'),
                  background: sw.locked ? 'var(--accent)' : 'var(--panel)',
                  color: sw.locked ? '#fff' : 'var(--text)', fontSize: 15, lineHeight: 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                {sw.locked ? <Emoji e="🔒"/> : <Emoji e="🔓"/>}
              </button>
            </div>
          )
        })}
      </div>

      {/* 직접 입력(미세 조정용) */}
      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
        {palette.map((sw, i) => (
          <input
            key={i}
            value={sw.hex}
            onChange={(e) => setHexAt(i, e.target.value)}
            spellCheck={false}
            maxLength={7}
            style={{
              flex: 1, minWidth: 0, fontFamily: 'monospace', fontSize: 11, textAlign: 'center',
              padding: '5px 2px', borderRadius: 6, border: '1px solid var(--border)',
              background: 'var(--paper)', color: 'var(--text)',
            }}
          />
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flexShrink: 0 }}>
        <button className="btn-primary" onClick={regen}><Emoji e="🔀"/> 다시 생성</button>
        <button className="minibtn" onClick={copyCssVars} disabled={!palette.length}>
          {copiedAll ? <>✓ 복사됨</> : <><Emoji e="📋"/> CSS 변수로 복사</>}
        </button>
      </div>
      <div style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}>
        마음에 드는 색은 잠그고 다시 생성을 눌러 배색을 좁혀가세요. 아래 칸에 직접 hex를 입력해 미세 조정할 수 있습니다.
      </div>
    </div>
  )
}
