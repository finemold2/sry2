// 책표지 목업 — 제목/부제/저자, 배경(단색·두 색 그라디언트+각도·이미지), 글꼴군·글자색·정렬을 골라
// canvas 로 표지를 실시간 렌더하고 PNG 로 다운로드한다. 모든 설정은 localStorage 에 저장/복원한다.
// [연계] 배경 이미지는 공유 이미지 라이브러리(useLibraryList) 또는 갤러리 픽(requestImagePick)에서 가져온다.
//        payload.image 로 들어온 이미지는 배경 후보로 제시한다. linkbar 로 팔레트/갤러리 등 관련 도구를 연다.
// 저작권 안전: 외부 이미지는 키 불필요+https+CORS(crossOrigin='anonymous') 만 사용하고, 라이선스/출처를
//   라이브러리에서 받은 그대로 표기한다. CORS 가 막혀 캔버스가 오염되면 미리보기는 유지하되 PNG 저장만
//   막아(graceful) 무단 복제를 피한다. react / './linkbus' 외 import 없음 · 언마운트 시 타이머·이미지 정리.
import { useState, useEffect, useRef } from 'react'
import {
  useLibraryList,
  requestImagePick,
  openToolLinked,
  TOOL_RELATIONS,
  Emoji,
  emojify,
  type SharedImage,
} from './linkbus'

export const meta = { id: 'cover-mockup', name: '책표지 목업', icon: '📕', group: '분위기·시각', intro: '제목·배경·글꼴을 골라 책표지를 미리보고 PNG로 저장하세요', w: 560, h: 640 }

const NS = 'sry:tool:cover-mockup'

// 렌더 해상도(2:3 표지 비율). 화면 미리보기는 CSS 로 축소하되 캔버스는 고해상도로 그려 선명하게 저장한다.
const CW = 600
const CH = 900

type BgMode = 'solid' | 'gradient' | 'image'
type Align = 'left' | 'center' | 'right'

interface FontDef { id: string; label: string; stack: string }
// 웹 안전 글꼴군만 사용(외부 폰트 로드 없음). 캔버스 fillText 에 그대로 넣는다.
const FONTS: FontDef[] = [
  { id: 'serif', label: '명조(세리프)', stack: 'Georgia, "Nanum Myeongjo", "Times New Roman", serif' },
  { id: 'sans', label: '고딕(산세리프)', stack: '"Helvetica Neue", "Malgun Gothic", Arial, sans-serif' },
  { id: 'mono', label: '타자기(모노)', stack: '"Courier New", Consolas, monospace' },
  { id: 'display', label: '굵은 제목', stack: 'Impact, "Arial Black", "Malgun Gothic", sans-serif' },
]

interface State {
  title: string
  subtitle: string
  author: string
  bgMode: BgMode
  color1: string
  color2: string
  angle: number
  fontId: string
  textColor: string
  align: Align
  // 배경 이미지(저작권 안전한 공유 라이브러리/갤러리 출처만)
  bgImageUrl: string
  bgImageCredit: string
  bgImageLicense: string
  bgImageSource: string
  // 이미지 위 가독성을 위한 어둡게(오버레이) 강도 0~100
  overlay: number
}

const DEFAULT_STATE: State = {
  title: '제목 없는 이야기',
  subtitle: '부제를 입력하세요',
  author: '지은이',
  bgMode: 'gradient',
  color1: '#2B2D42',
  color2: '#7C5CFF',
  angle: 135,
  fontId: 'serif',
  textColor: '#FFFFFF',
  align: 'center',
  bgImageUrl: '',
  bgImageCredit: '',
  bgImageLicense: '',
  bgImageSource: '',
  overlay: 45,
}

function loadState(): State {
  try {
    const raw = localStorage.getItem(NS)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') {
        return { ...DEFAULT_STATE, ...parsed }
      }
    }
  } catch { /* localStorage 미지원/거부/파싱실패 graceful */ }
  return { ...DEFAULT_STATE }
}

// 각도(도)를 캔버스 그라디언트의 시작/끝 좌표로 변환한다. CSS linear-gradient 의 각도 관례에 맞춰
// 0도=위로, 시계방향으로 증가하도록 계산한다.
function gradientPoints(angle: number, w: number, h: number) {
  const rad = ((angle - 90) * Math.PI) / 180
  const cx = w / 2
  const cy = h / 2
  // 대각선 절반 길이로 끝점을 잡아 캔버스를 충분히 덮게 한다.
  const len = Math.abs(w * Math.cos(rad)) / 2 + Math.abs(h * Math.sin(rad)) / 2
  const dx = Math.cos(rad) * len
  const dy = Math.sin(rad) * len
  return { x0: cx - dx, y0: cy - dy, x1: cx + dx, y1: cy + dy }
}

// 캔버스에서 긴 텍스트를 폭에 맞춰 단어/글자 단위로 줄바꿈한다.
function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const out: string[] = []
  const paragraphs = text.split('\n')
  for (const para of paragraphs) {
    if (para.trim() === '') { out.push(''); continue }
    // 공백이 있으면 단어 단위, 없으면(한국어 등) 글자 단위로 채운다.
    const hasSpace = para.indexOf(' ') >= 0
    const tokens = hasSpace ? para.split(' ') : Array.from(para)
    const sep = hasSpace ? ' ' : ''
    let line = ''
    for (const tk of tokens) {
      const test = line ? line + sep + tk : tk
      if (ctx.measureText(test).width > maxWidth && line) {
        out.push(line)
        line = tk
      } else {
        line = test
      }
    }
    if (line) out.push(line)
  }
  return out
}

// 캔버스를 "cover"(잘림 채움)로 덮도록 이미지의 그릴 영역을 계산한다.
function coverRect(iw: number, ih: number, w: number, h: number) {
  if (!iw || !ih) return { dx: 0, dy: 0, dw: w, dh: h }
  const scale = Math.max(w / iw, h / ih)
  const dw = iw * scale
  const dh = ih * scale
  return { dx: (w - dw) / 2, dy: (h - dh) / 2, dw, dh }
}

export default function CoverMockup({ payload }: { payload?: Record<string, unknown> }) {
  const [st, setSt] = useState<State>(loadState)
  const [supported, setSupported] = useState(true)
  const [copied, setCopied] = useState(false)
  const [note, setNote] = useState('')           // 사용자 안내(이미지 로드 실패/오염 등)
  const [tainted, setTainted] = useState(false)   // 캔버스가 CORS 로 오염되어 PNG 저장 불가
  const [showPicker, setShowPicker] = useState(false) // 라이브러리 이미지 선택 패널 토글

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const copyTimer = useRef<number | null>(null)
  // 로드된 배경 이미지 엘리먼트와 로드 경쟁상태 방지용 nonce
  const bgImgRef = useRef<HTMLImageElement | null>(null)
  const imgNonce = useRef(0)
  const mounted = useRef(true)

  // 공유 이미지 라이브러리(자동 구독/리렌더)
  const libImages = useLibraryList('images')

  const set = <K extends keyof State>(key: K, value: State[K]) => {
    setSt((prev) => ({ ...prev, [key]: value }))
  }

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  // payload.image 로 이미지가 들어오면 배경 후보로 채택(다른 도구에서 "표지 배경으로" 전달 시).
  // SharedImage 형태 또는 단순 {url,...} 모두 수용. mount 직후 1회만 반영.
  useEffect(() => {
    const raw = payload && (payload.image as unknown)
    if (!raw || typeof raw !== 'object') return
    const img = raw as Partial<SharedImage>
    if (typeof img.url === 'string' && img.url) {
      applyBgImage({
        url: img.url,
        title: img.title,
        credit: img.credit,
        license: img.license,
        source: img.source,
      })
    }
    // payload 는 진입 시 한 번만 적용한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 설정 변경 시 localStorage 저장
  useEffect(() => {
    try {
      localStorage.setItem(NS, JSON.stringify(st))
    } catch { /* 저장 실패 graceful */ }
  }, [st])

  // 배경 이미지 URL 이 바뀌면 비동기로 로드(경쟁상태 nonce·언마운트 정리). 성공 시 ref 에 보관 후 재렌더 트리거.
  const [imgTick, setImgTick] = useState(0) // 이미지 로드 완료를 렌더 useEffect 에 알리는 신호
  useEffect(() => {
    if (st.bgMode !== 'image' || !st.bgImageUrl) {
      bgImgRef.current = null
      setTainted(false)
      return
    }
    const my = ++imgNonce.current
    setNote('')
    const im = new Image()
    // CORS 허용 출처만 사용 — anonymous 로 요청해야 toDataURL 시 캔버스 오염을 피할 수 있다.
    im.crossOrigin = 'anonymous'
    im.onload = () => {
      if (my !== imgNonce.current || !mounted.current) return
      bgImgRef.current = im
      setTainted(false)
      setImgTick((t) => t + 1)
    }
    im.onerror = () => {
      if (my !== imgNonce.current || !mounted.current) return
      bgImgRef.current = null
      setImgTick((t) => t + 1)
      setNote('배경 이미지를 불러오지 못했습니다. 다른 이미지를 골라 보세요.')
    }
    im.src = st.bgImageUrl
    return () => { imgNonce.current++ }
  }, [st.bgMode, st.bgImageUrl])

  // 캔버스 렌더 — 설정/이미지가 바뀔 때마다 다시 그린다.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let ctx: CanvasRenderingContext2D | null = null
    try {
      ctx = canvas.getContext('2d')
    } catch { ctx = null }
    if (!ctx) { setSupported(false); return }
    setSupported(true)

    const c = ctx

    // 배경
    let drewImage = false
    if (st.bgMode === 'image' && bgImgRef.current) {
      try {
        const im = bgImgRef.current
        const { dx, dy, dw, dh } = coverRect(im.naturalWidth || im.width, im.naturalHeight || im.height, CW, CH)
        c.drawImage(im, dx, dy, dw, dh)
        drewImage = true
        // 텍스트 가독성을 위한 어둠 오버레이
        const a = Math.max(0, Math.min(100, st.overlay)) / 100
        if (a > 0) {
          c.fillStyle = `rgba(0, 0, 0, ${a})`
          c.fillRect(0, 0, CW, CH)
        }
      } catch {
        drewImage = false
      }
    }

    if (!drewImage) {
      try {
        if (st.bgMode === 'gradient') {
          const { x0, y0, x1, y1 } = gradientPoints(st.angle, CW, CH)
          const grad = c.createLinearGradient(x0, y0, x1, y1)
          grad.addColorStop(0, st.color1)
          grad.addColorStop(1, st.color2)
          c.fillStyle = grad
        } else {
          c.fillStyle = st.color1
        }
      } catch {
        c.fillStyle = st.color1
      }
      c.fillRect(0, 0, CW, CH)
    }

    // 테두리 안쪽에 은은한 프레임을 그려 표지다움을 더한다.
    c.strokeStyle = withAlpha(st.textColor, 0.35)
    c.lineWidth = 3
    c.strokeRect(28, 28, CW - 56, CH - 56)

    const font = FONTS.find((f) => f.id === st.fontId) || FONTS[0]
    const pad = 60
    const maxW = CW - pad * 2
    c.fillStyle = st.textColor
    c.textBaseline = 'alphabetic'
    c.textAlign = st.align === 'center' ? 'center' : st.align === 'right' ? 'right' : 'left'
    const tx = st.align === 'center' ? CW / 2 : st.align === 'right' ? CW - pad : pad

    // 제목 — 폭에 맞춰 폰트 크기를 자동 축소(최대 3줄 권장)하며 줄바꿈한다.
    const title = st.title.trim() || ' '
    let titleSize = 72
    let titleLines: string[] = []
    for (; titleSize >= 32; titleSize -= 2) {
      c.font = `700 ${titleSize}px ${font.stack}`
      titleLines = wrapLines(c, title, maxW)
      if (titleLines.length <= 4) break
    }
    const titleLH = titleSize * 1.18

    // 부제
    const subtitle = st.subtitle.trim()
    const subSize = 30
    c.font = `400 ${subSize}px ${font.stack}`
    const subLines = subtitle ? wrapLines(c, subtitle, maxW) : []
    const subLH = subSize * 1.3

    // 저자
    const author = st.author.trim()
    const authorSize = 28

    // 세로 배치: 제목 블록은 위쪽 1/3 지점, 저자는 하단 고정.
    const titleBlockH = titleLines.length * titleLH
    const subBlockH = subLines.length ? subLines.length * subLH + 24 : 0
    let cy = CH * 0.30
    c.font = `700 ${titleSize}px ${font.stack}`
    // 제목과 부제를 묶어 상단 영역 중앙쯤에 배치
    const groupTop = Math.max(110, cy - titleBlockH / 2)
    let yy = groupTop + titleSize
    for (const ln of titleLines) {
      c.fillText(ln, tx, yy)
      yy += titleLH
    }

    if (subLines.length) {
      // 제목 아래 구분선
      c.strokeStyle = withAlpha(st.textColor, 0.5)
      c.lineWidth = 2
      const lineY = yy - titleLH + 18
      const half = Math.min(maxW, 160) / 2
      const lcx = st.align === 'center' ? CW / 2 : st.align === 'right' ? CW - pad - half : pad + half
      c.beginPath()
      c.moveTo(lcx - half, lineY)
      c.lineTo(lcx + half, lineY)
      c.stroke()

      c.font = `400 ${subSize}px ${font.stack}`
      c.fillStyle = withAlpha(st.textColor, 0.9)
      yy += 8
      for (const ln of subLines) {
        c.fillText(ln, tx, yy)
        yy += subLH
      }
    }

    if (author) {
      c.font = `600 ${authorSize}px ${font.stack}`
      c.fillStyle = st.textColor
      c.fillText(author, tx, CH - 80)
    }

    // 일부 변수의 미사용 경고를 피하기 위한 참조(레이아웃 계산에 사용)
    void subBlockH
  }, [st, imgTick])

  // 언마운트 시 복사 타이머 정리
  useEffect(() => {
    return () => {
      if (copyTimer.current !== null) {
        clearTimeout(copyTimer.current)
        copyTimer.current = null
      }
    }
  }, [])

  // 배경 이미지 적용(공통) — 출처/라이선스를 함께 저장하고 배경 모드를 image 로 전환.
  const applyBgImage = (img: { url: string; title?: string; credit?: string; license?: string; source?: string }) => {
    setSt((prev) => ({
      ...prev,
      bgMode: 'image',
      bgImageUrl: img.url,
      bgImageCredit: img.credit || img.title || '',
      bgImageLicense: img.license || '',
      bgImageSource: img.source || '',
    }))
    setNote('')
    setShowPicker(false)
  }

  // 배경 이미지 해제 → 그라디언트로 복귀.
  const clearBgImage = () => {
    setSt((prev) => ({ ...prev, bgMode: 'gradient', bgImageUrl: '', bgImageCredit: '', bgImageLicense: '', bgImageSource: '' }))
    bgImgRef.current = null
    setTainted(false)
    setNote('')
  }

  // [연계] 갤러리 도구에 이미지 픽을 요청 → 갤러리에서 고른 이미지를 콜백으로 받아 배경에 적용.
  const pickFromGallery = () => {
    requestImagePick({
      requesterId: meta.id,
      onPick: (img) => {
        if (!mounted.current) return
        if (img && img.url) {
          applyBgImage({ url: img.url, title: img.title, credit: img.credit, license: img.license, source: img.source })
        }
      },
    })
  }

  const download = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    try {
      const url = canvas.toDataURL('image/png')
      const a = document.createElement('a')
      const name = (st.title.trim() || 'cover').replace(/[\\/:*?"<>|]/g, '_').slice(0, 40)
      a.href = url
      a.download = `${name}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch {
      // CORS 로 오염된 캔버스는 toDataURL 이 SecurityError 를 던진다 → 저장 차단(graceful) + 안내.
      if (mounted.current) {
        setTainted(true)
        setNote('이 배경 이미지는 보안 정책(CORS) 때문에 PNG로 저장할 수 없습니다. 미리보기는 가능하지만, 저장하려면 단색·그라디언트 배경이나 다른 이미지를 사용하세요.')
      }
    }
  }

  const copyDataUrl = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    try {
      const url = canvas.toDataURL('image/png')
      navigator.clipboard?.writeText(url)
        .then(() => {
          if (!mounted.current) return
          setCopied(true)
          if (copyTimer.current !== null) clearTimeout(copyTimer.current)
          copyTimer.current = window.setTimeout(() => { if (mounted.current) setCopied(false) }, 1500)
        })
        .catch(() => {})
    } catch {
      if (mounted.current) {
        setTainted(true)
        setNote('이 배경 이미지는 보안 정책(CORS) 때문에 데이터 URL로 복사할 수 없습니다. 다른 이미지나 단색·그라디언트 배경을 사용하세요.')
      }
    }
  }

  const resetAll = () => { setSt({ ...DEFAULT_STATE }); bgImgRef.current = null; setTainted(false); setNote('') }

  const relTools = TOOL_RELATIONS[meta.id] || []
  const REL_LABELS: Record<string, string> = {
    'palette-lock': '🔒 팔레트 잠금',
    'imagination-gallery': '🖼 상상력 갤러리',
    'met-museum-art': '🏛 명화(Met)',
    'moodboard-grid': '🧩 무드보드',
  }

  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', gap: 10, color: 'var(--text)', boxSizing: 'border-box' }
  const labelStyle: React.CSSProperties = { fontSize: 12, color: 'var(--accent)', fontWeight: 700, marginBottom: 4, display: 'block' }
  const inputStyle: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', fontSize: 14 }
  const rowStyle: React.CSSProperties = { display: 'flex', gap: 8, flexWrap: 'wrap' }
  const fieldStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column' }

  const disableSave = !supported || tainted

  return (
    <div style={wrap}>
      <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
        제목·배경·글꼴을 고르면 <b>책표지</b>가 실시간으로 그려집니다. PNG로 저장하거나 데이터 URL을 복사하세요.
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14, paddingRight: 4 }}>
        {/* 미리보기 */}
        <div style={{ display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
          {supported ? (
            <canvas
              ref={canvasRef}
              width={CW}
              height={CH}
              style={{ width: 220, height: 330, borderRadius: 10, border: '1px solid var(--border)', boxShadow: '0 6px 20px rgba(0,0,0,0.25)', background: 'var(--chrome-2)' }}
            />
          ) : (
            <div style={{ width: 220, minHeight: 330, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 20, borderRadius: 10, border: '1px dashed var(--border)', background: 'var(--chrome-2)', color: 'var(--muted)', fontSize: 13, lineHeight: 1.6 }}>
              이 환경에서는 캔버스 미리보기를 지원하지 않습니다. 설정은 저장되며, 캔버스를 지원하는 브라우저에서 미리보기와 PNG 저장을 사용할 수 있습니다.
            </div>
          )}
        </div>

        {/* 텍스트 입력 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={fieldStyle}>
            <label style={labelStyle}>제목</label>
            <input style={inputStyle} value={st.title} onChange={(e) => set('title', e.target.value)} placeholder="표지 제목" />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>부제</label>
            <input style={inputStyle} value={st.subtitle} onChange={(e) => set('subtitle', e.target.value)} placeholder="부제 (선택)" />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>저자</label>
            <input style={inputStyle} value={st.author} onChange={(e) => set('author', e.target.value)} placeholder="지은이 (선택)" />
          </div>
        </div>

        {/* 배경 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={labelStyle}>배경</span>
          <div style={rowStyle}>
            <button
              className="minibtn"
              onClick={() => set('bgMode', 'solid')}
              style={{ borderColor: st.bgMode === 'solid' ? 'var(--accent)' : 'var(--border)', color: st.bgMode === 'solid' ? 'var(--accent)' : 'var(--text)' }}
            >단색</button>
            <button
              className="minibtn"
              onClick={() => set('bgMode', 'gradient')}
              style={{ borderColor: st.bgMode === 'gradient' ? 'var(--accent)' : 'var(--border)', color: st.bgMode === 'gradient' ? 'var(--accent)' : 'var(--text)' }}
            >그라디언트</button>
            <button
              className="minibtn"
              onClick={() => set('bgMode', 'image')}
              style={{ borderColor: st.bgMode === 'image' ? 'var(--accent)' : 'var(--border)', color: st.bgMode === 'image' ? 'var(--accent)' : 'var(--text)' }}
            >이미지</button>
          </div>

          {st.bgMode !== 'image' && (
            <div style={rowStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>{st.bgMode === 'gradient' ? '색 1' : '색'}</span>
                <input type="color" value={st.color1} onChange={(e) => set('color1', e.target.value.toUpperCase())} aria-label="배경 색 1" style={{ width: 38, height: 32, border: '1px solid var(--border)', borderRadius: 8, background: 'transparent', cursor: 'pointer', padding: 0 }} />
                <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{st.color1}</span>
              </div>
              {st.bgMode === 'gradient' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>색 2</span>
                  <input type="color" value={st.color2} onChange={(e) => set('color2', e.target.value.toUpperCase())} aria-label="배경 색 2" style={{ width: 38, height: 32, border: '1px solid var(--border)', borderRadius: 8, background: 'transparent', cursor: 'pointer', padding: 0 }} />
                  <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{st.color2}</span>
                </div>
              )}
            </div>
          )}

          {st.bgMode === 'gradient' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 12, color: 'var(--muted)', flexShrink: 0 }}>각도</span>
              <input type="range" min={0} max={360} value={st.angle} onChange={(e) => set('angle', Number(e.target.value))} aria-label="그라디언트 각도" style={{ flex: 1, accentColor: 'var(--accent)' }} />
              <span style={{ fontFamily: 'monospace', fontSize: 13, width: 44, textAlign: 'right' }}>{st.angle}°</span>
            </div>
          )}

          {/* 이미지 배경 — 라이브러리/갤러리에서 저작권 안전한 이미지를 가져온다. */}
          {st.bgMode === 'image' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={rowStyle}>
                <button className="minibtn" onClick={() => setShowPicker((v) => !v)}>
                  <Emoji e="🖼" /> 이미지 라이브러리에서 선택 {libImages.length ? `(${libImages.length})` : ''}
                </button>
                <button className="minibtn" onClick={pickFromGallery}><Emoji e="🎨" /> 갤러리에서 고르기</button>
                {st.bgImageUrl && <button className="minibtn" onClick={clearBgImage}>✕ 이미지 해제</button>}
              </div>

              {/* 라이브러리 선택 패널 */}
              {showPicker && (
                <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 8, background: 'var(--chrome-2)' }}>
                  <div className="license-note" style={{ marginBottom: 8 }}>
                    <span className="license-badge" style={{ marginRight: 6 }}>초상권 주의</span>
                    실존 인물 사진은 초상권 우려 — 표지 배경엔 풍경·추상·명화(PD) 권장.
                  </div>
                  {libImages.length === 0 ? (
                    <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6, padding: 4 }}>
                      공유 이미지 라이브러리가 비어 있습니다. 상상력 갤러리·명화(Met)·무드보드에서 마음에 드는 이미지를 라이브러리에 담거나, 아래 <b>갤러리에서 고르기</b>로 직접 골라 보세요.
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, maxHeight: 180, overflowY: 'auto' }}>
                      {libImages.map((img) => (
                        <button
                          key={img.id}
                          onClick={() => applyBgImage({ url: img.url, title: img.title, credit: img.credit, license: img.license, source: img.source })}
                          title={`${img.title || '이미지'}${img.credit ? ' — ' + img.credit : ''}${img.license ? ' · ' + img.license : ''}`}
                          style={{
                            position: 'relative', aspectRatio: '1 / 1', borderRadius: 8, overflow: 'hidden', padding: 0, cursor: 'pointer',
                            border: st.bgImageUrl === img.url ? '2px solid var(--accent)' : '1px solid var(--border)', background: 'var(--panel)',
                          }}
                        >
                          <img src={img.url} alt={img.title || '라이브러리 이미지'} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 초상권 경고 — 라이브러리/갤러리 픽 배경엔 항상 노출(표지는 상업적 맥락). */}
              {st.bgImageUrl && (
                <div className="license-note">
                  <span className="license-badge" style={{ marginRight: 6 }}>초상권 주의</span>
                  실존 인물 사진은 초상권 우려 — 표지 배경엔 풍경·추상·명화(PD) 권장. 표지는 상업적 맥락으로 쓰일 수 있어, 식별 가능한 실존 인물 사진을 배경으로 사용하는 것은 지양하세요.
                </div>
              )}

              {/* 선택된 이미지 출처/라이선스 표기 */}
              {st.bgImageUrl && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, color: 'var(--muted)', flexShrink: 0 }}>이미지 어둡게</span>
                    <input type="range" min={0} max={100} value={st.overlay} onChange={(e) => set('overlay', Number(e.target.value))} aria-label="배경 이미지 오버레이 강도" style={{ flex: 1, accentColor: 'var(--accent)' }} />
                    <span style={{ fontFamily: 'monospace', fontSize: 13, width: 44, textAlign: 'right' }}>{st.overlay}%</span>
                  </div>
                  <div className="license-note">
                    {st.bgImageLicense && <span className="license-badge" style={{ marginRight: 6 }}>{st.bgImageLicense}</span>}
                    출처: {st.bgImageCredit || '미상'}{st.bgImageSource ? ` · ${st.bgImageSource}` : ''} — 저작권 안전(키 불필요·CORS) 이미지만 사용하세요. 표시된 라이선스·출처는 그대로 보존됩니다.
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 글꼴 / 글자색 / 정렬 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={labelStyle}>글꼴</span>
          <div style={rowStyle}>
            {FONTS.map((f) => (
              <button
                key={f.id}
                className="minibtn"
                onClick={() => set('fontId', f.id)}
                style={{ borderColor: st.fontId === f.id ? 'var(--accent)' : 'var(--border)', color: st.fontId === f.id ? 'var(--accent)' : 'var(--text)', fontFamily: f.stack }}
              >{f.label}</button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>글자색</span>
            <input type="color" value={st.textColor} onChange={(e) => set('textColor', e.target.value.toUpperCase())} aria-label="글자 색" style={{ width: 38, height: 32, border: '1px solid var(--border)', borderRadius: 8, background: 'transparent', cursor: 'pointer', padding: 0 }} />
            <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{st.textColor}</span>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['#FFFFFF', '#000000', '#F5E9D0', '#FFD166'] as const).map((c) => (
                <button key={c} onClick={() => set('textColor', c)} title={c} aria-label={`글자색 ${c}`} style={{ width: 24, height: 24, borderRadius: 6, border: st.textColor === c ? '2px solid var(--accent)' : '1px solid var(--border)', background: c, cursor: 'pointer', padding: 0 }} />
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>정렬</span>
            {([['left', '왼쪽'], ['center', '가운데'], ['right', '오른쪽']] as [Align, string][]).map(([a, lbl]) => (
              <button
                key={a}
                className="minibtn"
                onClick={() => set('align', a)}
                style={{ borderColor: st.align === a ? 'var(--accent)' : 'var(--border)', color: st.align === a ? 'var(--accent)' : 'var(--text)' }}
              >{lbl}</button>
            ))}
          </div>
        </div>
      </div>

      {/* 안내(이미지 로드 실패/CORS 오염 등) */}
      {note && (
        <div style={{ fontSize: 11.5, color: 'var(--warn)', lineHeight: 1.5, flexShrink: 0 }}>{note}</div>
      )}

      {/* 액션 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flexShrink: 0 }}>
        <button className="btn-primary" onClick={download} disabled={disableSave}><Emoji e="⬇️" /> PNG 저장</button>
        <button className="minibtn" onClick={copyDataUrl} disabled={disableSave}>{copied ? <>✓ 복사됨</> : <><Emoji e="📋" /> 데이터 URL 복사</>}</button>
        <button className="minibtn" onClick={resetAll}>↺ 기본값</button>
      </div>

      {/* [연계] 관련 도구 — 표지 배색·배경 이미지를 다른 도구에서 가져오기 */}
      {relTools.length > 0 && (
        <div className="linkbar" style={{ flexShrink: 0 }}>
          <span className="linkbar-label">연계:</span>
          {relTools.map((id) => (
            <button key={id} className="linkbtn" onClick={() => openToolLinked(id)}>
              {emojify(REL_LABELS[id] || id)}
            </button>
          ))}
        </div>
      )}

      <div style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}>
        입력과 색은 자동 저장됩니다. 제목이 길면 자동으로 줄바꿈·축소되어 표지에 맞춰집니다. 배경 이미지는 저작권 안전(키 불필요·CORS)한 공유 라이브러리·갤러리 자료만 사용하세요.
      </div>
    </div>
  )
}

// hex 색에 알파를 적용해 rgba 로 변환(프레임·구분선 등 반투명 장식용). 잘못된 입력이면 원본 반환.
function withAlpha(hex: string, alpha: number): string {
  try {
    let h = hex.replace('#', '')
    if (h.length === 3) h = h.split('').map((ch) => ch + ch).join('')
    if (h.length !== 6) return hex
    const r = parseInt(h.slice(0, 2), 16)
    const g = parseInt(h.slice(2, 4), 16)
    const b = parseInt(h.slice(4, 6), 16)
    if ([r, g, b].some((v) => Number.isNaN(v))) return hex
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  } catch {
    return hex
  }
}
