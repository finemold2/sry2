// CSS 그라디언트 생성기 — 두~세 색과 각도를 골라 실시간 미리보기를 보고,
// linear-gradient CSS 코드를 복사한다. 무작위 그라디언트 버튼으로 표지·무드용 배경을 빠르게 잡는다.
// 외부 네트워크/라이브러리 없이 react만으로 로컬 동작한다.
import { useState, useMemo } from 'react'

export const meta = { id: 'gradient-maker', name: 'CSS 그라디언트', icon: '🌈', group: '분위기·시각', intro: '색과 각도로 그라디언트를 만들고 CSS를 복사하세요', w: 420, h: 600 }

// hex → 무작위 색 생성용. 조화로운 채도/명도 범위에서 뽑아 표지·무드에 어울리게 한다.
function randHex(): string {
  const h = Math.floor(Math.random() * 360)
  const s = 55 + Math.floor(Math.random() * 40)  // 55~94 채도
  const l = 38 + Math.floor(Math.random() * 38)  // 38~75 명도
  const sN = s / 100, lN = l / 100
  const c = (1 - Math.abs(2 * lN - 1)) * sN
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = lN - c / 2
  let r = 0, g = 0, b = 0
  if (h < 60) { r = c; g = x } else if (h < 120) { r = x; g = c } else if (h < 180) { g = c; b = x } else if (h < 240) { g = x; b = c } else if (h < 300) { r = x; b = c } else { r = c; b = x }
  const to = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0')
  return ('#' + to(r) + to(g) + to(b)).toUpperCase()
}

const ANGLE_PRESETS = [0, 45, 90, 135, 180, 225, 270, 315]

export default function GradientMaker() {
  const [colors, setColors] = useState<string[]>(['#FF7A59', '#7C5CFF'])
  const [angle, setAngle] = useState(135)
  const [copied, setCopied] = useState(false)

  // 미리보기와 복사에 같이 쓰는 CSS 문자열을 메모이즈한다.
  const css = useMemo(() => {
    const stops = colors.join(', ')
    return `linear-gradient(${angle}deg, ${stops})`
  }, [colors, angle])

  const cssFull = useMemo(() => `background: ${css};`, [css])

  const setColorAt = (i: number, v: string) => {
    setColors((prev) => prev.map((c, idx) => (idx === i ? v.toUpperCase() : c)))
    setCopied(false)
  }

  const addColor = () => {
    if (colors.length >= 3) return
    setColors((prev) => [...prev, randHex()])
    setCopied(false)
  }

  const removeColor = (i: number) => {
    if (colors.length <= 2) return
    setColors((prev) => prev.filter((_, idx) => idx !== i))
    setCopied(false)
  }

  const randomize = () => {
    const n = Math.random() < 0.5 ? 2 : 3  // 두~세 색 무작위
    setColors(Array.from({ length: n }, randHex))
    setAngle(ANGLE_PRESETS[Math.floor(Math.random() * ANGLE_PRESETS.length)])
    setCopied(false)
  }

  const copyCss = () => {
    try {
      navigator.clipboard?.writeText(cssFull)
        .then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500) })
        .catch(() => {})
    } catch { /* 클립보드 미지원·권한 거부 무시 */ }
  }

  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, color: 'var(--text)', boxSizing: 'border-box' }

  return (
    <div style={wrap}>
      <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
        두~세 색과 각도로 <b>그라디언트</b>를 만들고 CSS를 복사하세요. 표지·무드 배경에 활용하기 좋습니다.
      </div>

      {/* 실시간 미리보기 */}
      <div style={{ height: 140, borderRadius: 12, border: '1px solid var(--border)', background: css, flexShrink: 0 }} />

      {/* 컨트롤 스크롤 영역 */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, paddingRight: 2 }}>
        {/* 색 선택 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 700 }}>색 ({colors.length}/3)</div>
          {colors.map((c, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: 8 }}>
              <input
                type="color"
                value={c}
                onChange={(e) => setColorAt(i, e.target.value)}
                aria-label={`색 ${i + 1}`}
                style={{ width: 40, height: 40, border: '1px solid var(--border)', borderRadius: 8, background: 'transparent', cursor: 'pointer', flexShrink: 0, padding: 0 }}
              />
              <span style={{ flex: 1, fontFamily: 'monospace', fontWeight: 700, fontSize: 14 }}>{c}</span>
              <button
                className="minibtn"
                onClick={() => removeColor(i)}
                disabled={colors.length <= 2}
                title={colors.length <= 2 ? '최소 2색이 필요합니다' : '이 색 제거'}
                style={{ flexShrink: 0 }}
              >
                ✕
              </button>
            </div>
          ))}
          <button className="minibtn" onClick={addColor} disabled={colors.length >= 3} style={{ alignSelf: 'flex-start' }}>
            ＋ 색 추가
          </button>
        </div>

        {/* 각도 조절 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 700 }}>각도</span>
            <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 14 }}>{angle}°</span>
          </div>
          <input
            type="range"
            min={0}
            max={360}
            value={angle}
            onChange={(e) => { setAngle(Number(e.target.value)); setCopied(false) }}
            aria-label="그라디언트 각도"
            style={{ width: '100%', accentColor: 'var(--accent)' }}
          />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {ANGLE_PRESETS.map((a) => (
              <button
                key={a}
                className="minibtn"
                onClick={() => { setAngle(a); setCopied(false) }}
                style={{ borderColor: angle === a ? 'var(--accent)' : 'var(--border)', color: angle === a ? 'var(--accent)' : 'var(--text)' }}
              >
                {a}°
              </button>
            ))}
          </div>
        </div>

        {/* CSS 코드 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 700 }}>CSS</div>
          <pre style={{ margin: 0, background: 'var(--chrome-2)', border: '1px solid var(--border)', borderRadius: 10, padding: 12, fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontFamily: 'monospace', color: 'var(--text)' }}>
            {cssFull}
          </pre>
        </div>
      </div>

      {/* 액션 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flexShrink: 0 }}>
        <button className="btn-primary" onClick={randomize}>🔀 무작위 그라디언트</button>
        <button className="minibtn" onClick={copyCss}>{copied ? '✓ 복사됨' : '📋 CSS 복사'}</button>
      </div>
      <div style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}>색을 누르면 색상 선택기가 열립니다. 각도와 색을 바꾸며 표지·장면의 무드를 잡아보세요.</div>
    </div>
  )
}
