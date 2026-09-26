import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import {
  addToProject,
  hasProjectBridge,
  getDragItem,
  isItemDrag,
  Emoji,
  type ResolvedItem,
} from './linkbus'

export const meta = {
  id: 'manuscript-format-preview',
  name: '표준 원고 서식 미리보기',
  icon: '📄',
  group: '유틸·참고',
  intro: '본문을 투고용 표준 서식(줄간격·들여쓰기·장 구분·머리말·쪽수)으로 미리보고 매수·페이지 계산',
  w: 940,
  h: 760,
}

// ---------- 영속 설정 ----------
const LS_KEY = 'sry:tool:manuscript-format-preview'

type PaperKind = 'a4' | 'letter' | 'b5'
type FontFamily = 'serif' | 'sans' | 'mono'
type SheetBase = 200 | 400

interface Settings {
  fontPt: number          // 본문 글꼴 크기(pt)
  lineHeight: number      // 줄간격(배수)
  fontFamily: FontFamily
  paper: PaperKind
  indentEm: number        // 문단 첫 줄 들여쓰기(em)
  paraGap: number         // 문단 사이 여백(em)
  chapterMarker: string   // 장 구분 정규식의 "키워드"(예: 제, 장, #)
  splitChapters: boolean  // 장 구분선/새 페이지 표시
  showHeader: boolean     // 머리말 표시
  showPageNo: boolean     // 쪽수 자리 표시
  headerTitle: string     // 머리말 제목
  authorName: string      // 머리말 저자/이름
  align: 'left' | 'justify'
  sheetBase: SheetBase    // 원고지 기준(200/400자)
  charsPerPage: number    // 1쪽당 글자 수(예상 페이지 환산)
}

const DEFAULTS: Settings = {
  fontPt: 12,
  lineHeight: 2.0,
  fontFamily: 'serif',
  paper: 'a4',
  indentEm: 1,
  paraGap: 0.2,
  chapterMarker: '제',
  splitChapters: true,
  showHeader: true,
  showPageNo: true,
  headerTitle: '제목 없음',
  authorName: '',
  align: 'left',
  sheetBase: 200,
  charsPerPage: 1000,
}

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) {
      const p = JSON.parse(raw) as Partial<Settings>
      return { ...DEFAULTS, ...p }
    }
  } catch {
    /* noop */
  }
  return { ...DEFAULTS }
}

// 종이 규격(mm) — 인쇄/미리보기 비율 참고용
const PAPERS: Record<PaperKind, { w: number; h: number; label: string }> = {
  a4: { w: 210, h: 297, label: 'A4 (210×297mm)' },
  letter: { w: 215.9, h: 279.4, label: 'Letter (8.5×11in)' },
  b5: { w: 176, h: 250, label: 'B5 (176×250mm)' },
}

const FONTS: Record<FontFamily, { label: string; css: string }> = {
  serif: { label: '명조(세리프)', css: '"Noto Serif KR", "Batang", "Nanum Myeongjo", serif' },
  sans: { label: '고딕(산세리프)', css: '"Noto Sans KR", "Malgun Gothic", "Apple SD Gothic Neo", sans-serif' },
  mono: { label: '고정폭', css: '"D2Coding", "Consolas", "Nanum Gothic Coding", monospace' },
}

// ---------- HTML escape (연계 본문 전송용) ----------
function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// 장 구분 판정: "제1장", "1장", "프롤로그", "에필로그", "#", "* * *" 등
function makeChapterTest(marker: string): (line: string) => boolean {
  const m = (marker || '').trim()
  return (raw: string) => {
    const line = raw.trim()
    if (line === '') return false
    // 사용자 키워드 우선
    if (m && line.startsWith(m)) return true
    // 흔한 패턴
    if (/^#{1,6}\s+/.test(line)) return true // 마크다운 헤더
    if (/^제?\s*\d+\s*(장|부|화|편|막)\b/.test(line)) return true
    if (/^(프롤로그|에필로그|서장|종장|서막|막간|간주)\b/.test(line)) return true
    if (/^\s*(\*\s*){3,}\s*$/.test(line)) return true // * * *
    if (/^\s*[-–—=]{3,}\s*$/.test(line)) return false // 구분선은 장 제목 아님
    // "Chapter 1", "PART I" 등
    if (/^(chapter|part)\s+[\dIVXLC]+/i.test(line)) return true
    return false
  }
}

interface Block {
  type: 'chapter' | 'para'
  text: string
}

function parseBlocks(text: string, marker: string, splitChapters: boolean): Block[] {
  const lines = text.replace(/\r\n?/g, '\n').split('\n')
  const isChapter = makeChapterTest(marker)
  const blocks: Block[] = []
  for (const ln of lines) {
    const t = ln.trim()
    if (t === '') continue
    if (splitChapters && isChapter(ln)) {
      blocks.push({ type: 'chapter', text: t.replace(/^#{1,6}\s+/, '') })
    } else {
      blocks.push({ type: 'para', text: t })
    }
  }
  return blocks
}

export default function ManuscriptFormatPreview({ payload }: { payload?: Record<string, unknown> }) {
  const [text, setText] = useState<string>(() => {
    if (payload && typeof payload.text === 'string') return payload.text as string
    return ''
  })
  const [settings, setSettings] = useState<Settings>(loadSettings)
  const [showSettings, setShowSettings] = useState(false)
  const [copied, setCopied] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [added, setAdded] = useState(false)
  const copyTimer = useRef<number | null>(null)
  const addTimer = useRef<number | null>(null)
  const previewRef = useRef<HTMLDivElement | null>(null)

  // payload 로 들어온 본문 갱신(도구 열기 연계)
  useEffect(() => {
    if (payload && typeof payload.text === 'string') {
      setText(payload.text as string)
    }
    if (payload && typeof payload.title === 'string') {
      setSettings((s) => ({ ...s, headerTitle: (payload.title as string) || s.headerTitle }))
    }
  }, [payload])

  // 설정 영속
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(settings))
    } catch {
      /* 용량 초과 등 무시 */
    }
  }, [settings])

  // 언마운트 정리(타이머)
  useEffect(() => {
    return () => {
      if (copyTimer.current) window.clearTimeout(copyTimer.current)
      if (addTimer.current) window.clearTimeout(addTimer.current)
    }
  }, [])

  const set = useCallback(<K extends keyof Settings>(k: K, v: Settings[K]) => {
    setSettings((s) => ({ ...s, [k]: v }))
  }, [])

  // ---------- 통계 ----------
  const stats = useMemo(() => {
    const withSpace = [...text].length
    const noSpace = [...text.replace(/\s/g, '')].length
    const words = text.trim() === '' ? 0 : text.trim().split(/\s+/).length
    // 문장 수(한국어 문장부호 포함)
    const sentenceMatches = text.match(/[^.!?…。！？\n]+[.!?…。！？]+/g)
    const sentences = sentenceMatches ? sentenceMatches.length : (text.trim() ? text.trim().split(/\n+/).length : 0)
    const paragraphs = text.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean).length
    const sheets = withSpace / settings.sheetBase
    const contestSheets = withSpace / 200 // 공모전은 통상 200자 원고지 매수
    const pages = settings.charsPerPage > 0 ? noSpace / settings.charsPerPage : 0
    const readMin = noSpace === 0 ? 0 : noSpace / 500
    return { withSpace, noSpace, words, sentences, paragraphs, sheets, contestSheets, pages, readMin }
  }, [text, settings.sheetBase, settings.charsPerPage])

  const blocks = useMemo(
    () => parseBlocks(text, settings.chapterMarker, settings.splitChapters),
    [text, settings.chapterMarker, settings.splitChapters],
  )

  const chapterCount = useMemo(() => blocks.filter((b) => b.type === 'chapter').length, [blocks])

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

  // ---------- 복사 ----------
  const flashCopied = (key: string) => {
    setCopied(key)
    if (copyTimer.current) window.clearTimeout(copyTimer.current)
    copyTimer.current = window.setTimeout(() => setCopied((c) => (c === key ? '' : c)), 1300)
  }

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(text)
      flashCopied('text')
    } catch {
      setCopied('')
    }
  }

  const copyStats = async () => {
    const summary = [
      `머리말: ${settings.headerTitle}${settings.authorName ? ' / ' + settings.authorName : ''}`,
      `글자수(공백 포함): ${fmt(stats.withSpace)}자`,
      `글자수(공백 제외): ${fmt(stats.noSpace)}자`,
      `단어(어절): ${fmt(stats.words)}개`,
      `문장: ${fmt(stats.sentences)}개 · 문단: ${fmt(stats.paragraphs)}개`,
      `${settings.sheetBase}자 원고지: ${fmt(stats.sheets, 1)}매`,
      `공모전 매수(200자): ${fmt(stats.contestSheets, 1)}매`,
      `예상 페이지: ${fmt(stats.pages, 1)}쪽 (${fmt(settings.charsPerPage)}자/쪽)`,
      `장(섹션) 수: ${fmt(chapterCount)}개`,
      `예상 읽기시간: ${readLabel}`,
    ].join('\n')
    try {
      await navigator.clipboard.writeText(summary)
      flashCopied('stats')
    } catch {
      setCopied('')
    }
  }

  // ---------- 인쇄 ----------
  const doPrint = () => {
    const node = previewRef.current
    if (!node) return
    const html = buildPrintHtml(node.innerHTML, settings)
    const win = window.open('', '_blank', 'noopener,noreferrer,width=820,height=1000')
    if (!win) {
      // 팝업 차단 시: 현재 창 인쇄(미리보기 영역만 보이도록 처리는 못 하므로 안내)
      window.print()
      return
    }
    win.document.open()
    win.document.write(html)
    win.document.close()
    // 렌더 후 인쇄
    const trigger = () => {
      try {
        win.focus()
        win.print()
      } catch {
        /* noop */
      }
    }
    if (win.document.readyState === 'complete') {
      window.setTimeout(trigger, 200)
    } else {
      win.addEventListener('load', () => window.setTimeout(trigger, 200))
    }
  }

  // ---------- 프로젝트에 추가 ----------
  const sendToProject = () => {
    if (!hasProjectBridge() || !text.trim()) return
    const bodyHtml = blocks
      .map((b) => {
        if (b.type === 'chapter') return `<h2>${esc(b.text)}</h2>`
        return `<p>${esc(b.text)}</p>`
      })
      .join('\n')
    addToProject({
      root: 'draft',
      title: settings.headerTitle && settings.headerTitle !== '제목 없음' ? settings.headerTitle : '서식 원고',
      bodyHtml,
      meta: {
        '글자수': `${stats.withSpace}`,
        '원고지매수': `${stats.contestSheets.toFixed(1)}`,
        '예상페이지': `${stats.pages.toFixed(1)}`,
      },
    })
    setAdded(true)
    if (addTimer.current) window.clearTimeout(addTimer.current)
    addTimer.current = window.setTimeout(() => setAdded(false), 1500)
  }

  // ---------- 좌측 파일 드롭 수용 ----------
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const item: ResolvedItem | null = getDragItem(e)
    if (item) {
      if (item.text && item.text.trim()) setText(item.text)
      if (item.title) setSettings((s) => ({ ...s, headerTitle: item.title || s.headerTitle }))
      return
    }
    // 일반 텍스트 드롭도 허용
    let plain = ''
    try {
      plain = e.dataTransfer.getData('text/plain')
    } catch {
      /* noop */
    }
    if (plain) setText(plain)
  }
  const onDragOver = (e: React.DragEvent) => {
    if (isItemDrag(e) || (e.dataTransfer && Array.prototype.indexOf.call(e.dataTransfer.types, 'text/plain') >= 0)) {
      e.preventDefault()
      setDragOver(true)
    }
  }
  const onDragLeave = () => setDragOver(false)

  const empty = text.trim() === ''
  const paper = PAPERS[settings.paper]
  const fontCss = FONTS[settings.fontFamily].css

  // 미리보기 페이지 비율(폭 고정, 높이는 종이 비율)
  const pageRatio = paper.h / paper.w

  return (
    <div
      style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 10, color: 'var(--text)', minHeight: 0 }}
    >
      {/* 상단 입력 + 동작 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
          <label style={{ fontSize: 13, color: 'var(--muted)' }}>
            본문을 붙여넣으면 투고용 표준 서식으로 미리보기됩니다 (좌측 파일을 끌어다 놓아도 됩니다)
          </label>
          <button className="minibtn" onClick={() => setShowSettings((v) => !v)}>
            {showSettings ? <>설정 닫기 ▲</> : <>서식 설정 <Emoji e="⚙" /></>}
          </button>
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          placeholder={
            '여기에 원고를 입력하거나 붙여넣으세요.\n\n빈 줄로 문단을 나누고, "제1장"·"프롤로그"·"# 제목" 같은 줄은 장(章) 제목으로 인식됩니다.'
          }
          spellCheck={false}
          style={{
            width: '100%',
            minHeight: 86,
            maxHeight: 180,
            resize: 'vertical',
            boxSizing: 'border-box',
            padding: 10,
            fontSize: 13,
            lineHeight: 1.6,
            color: 'var(--text)',
            background: dragOver ? 'var(--panel)' : 'var(--paper)',
            border: dragOver ? '2px dashed var(--accent)' : '1px solid var(--border)',
            borderRadius: 8,
            outline: 'none',
            fontFamily: 'inherit',
          }}
        />
      </div>

      {/* 설정 패널 */}
      {showSettings && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
            gap: 10,
            padding: 12,
            background: 'var(--panel)',
            border: '1px solid var(--border)',
            borderRadius: 10,
          }}
        >
          <Field label={`본문 글꼴 크기: ${settings.fontPt}pt`}>
            <input
              type="range"
              min={9}
              max={20}
              step={0.5}
              value={settings.fontPt}
              onChange={(e) => set('fontPt', Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </Field>
          <Field label={`줄간격: ${settings.lineHeight.toFixed(1)}배`}>
            <input
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={settings.lineHeight}
              onChange={(e) => set('lineHeight', Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </Field>
          <Field label="글꼴 종류">
            <select
              value={settings.fontFamily}
              onChange={(e) => set('fontFamily', e.target.value as FontFamily)}
              style={selStyle}
            >
              {(Object.keys(FONTS) as FontFamily[]).map((k) => (
                <option key={k} value={k}>
                  {FONTS[k].label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="종이 규격">
            <select value={settings.paper} onChange={(e) => set('paper', e.target.value as PaperKind)} style={selStyle}>
              {(Object.keys(PAPERS) as PaperKind[]).map((k) => (
                <option key={k} value={k}>
                  {PAPERS[k].label}
                </option>
              ))}
            </select>
          </Field>
          <Field label={`첫 줄 들여쓰기: ${settings.indentEm}em`}>
            <input
              type="range"
              min={0}
              max={3}
              step={0.5}
              value={settings.indentEm}
              onChange={(e) => set('indentEm', Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </Field>
          <Field label={`문단 사이 여백: ${settings.paraGap.toFixed(1)}em`}>
            <input
              type="range"
              min={0}
              max={2}
              step={0.1}
              value={settings.paraGap}
              onChange={(e) => set('paraGap', Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </Field>
          <Field label="정렬">
            <select value={settings.align} onChange={(e) => set('align', e.target.value as 'left' | 'justify')} style={selStyle}>
              <option value="left">왼쪽 맞춤</option>
              <option value="justify">양쪽 맞춤</option>
            </select>
          </Field>
          <Field label="원고지 기준">
            <select
              value={settings.sheetBase}
              onChange={(e) => set('sheetBase', Number(e.target.value) as SheetBase)}
              style={selStyle}
            >
              <option value={200}>200자 원고지</option>
              <option value={400}>400자 원고지</option>
            </select>
          </Field>
          <Field label={`예상 페이지 환산: ${fmt(settings.charsPerPage)}자/쪽`}>
            <input
              type="range"
              min={500}
              max={2000}
              step={50}
              value={settings.charsPerPage}
              onChange={(e) => set('charsPerPage', Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </Field>
          <Field label="장 인식 키워드">
            <input
              type="text"
              value={settings.chapterMarker}
              onChange={(e) => set('chapterMarker', e.target.value)}
              placeholder="예: 제"
              style={inputStyle}
            />
          </Field>
          <Field label="머리말 제목">
            <input
              type="text"
              value={settings.headerTitle}
              onChange={(e) => set('headerTitle', e.target.value)}
              placeholder="작품 제목"
              style={inputStyle}
            />
          </Field>
          <Field label="저자/필명">
            <input
              type="text"
              value={settings.authorName}
              onChange={(e) => set('authorName', e.target.value)}
              placeholder="머리말에 표시"
              style={inputStyle}
            />
          </Field>
          <Field label="옵션">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <Check label="장 구분(새 면)" checked={settings.splitChapters} onChange={(v) => set('splitChapters', v)} />
              <Check label="머리말 표시" checked={settings.showHeader} onChange={(v) => set('showHeader', v)} />
              <Check label="쪽수 자리 표시" checked={settings.showPageNo} onChange={(v) => set('showPageNo', v)} />
            </div>
          </Field>
          <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end' }}>
            <button className="minibtn" onClick={() => setSettings({ ...DEFAULTS })}>
              서식 기본값으로 초기화
            </button>
          </div>
        </div>
      )}

      {/* 통계 띠 */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          padding: '8px 10px',
          background: 'var(--panel)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          fontSize: 12,
        }}
      >
        <Stat label="공백 포함" value={`${fmt(stats.withSpace)}자`} accent />
        <Stat label="공백 제외" value={`${fmt(stats.noSpace)}자`} />
        <Stat label="어절" value={`${fmt(stats.words)}개`} />
        <Stat label={`${settings.sheetBase}자 원고지`} value={`${fmt(stats.sheets, 1)}매`} accent />
        <Stat label="공모전 매수(200자)" value={`${fmt(stats.contestSheets, 1)}매`} accent />
        <Stat label="예상 페이지" value={`${fmt(stats.pages, 1)}쪽`} />
        <Stat label="문장" value={`${fmt(stats.sentences)}개`} />
        <Stat label="문단" value={`${fmt(stats.paragraphs)}개`} />
        <Stat label="장(섹션)" value={`${fmt(chapterCount)}개`} />
        <Stat label="읽기시간" value={readLabel} />
      </div>

      {/* 동작 버튼 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn-primary" onClick={doPrint} disabled={empty} title="새 창에서 인쇄(PDF 저장)">
          <Emoji e="🖨" /> 인쇄 / PDF
        </button>
        <button className="minibtn" onClick={copyText} disabled={empty}>
          {copied === 'text' ? '본문 복사됨 ✓' : '본문 복사'}
        </button>
        <button className="minibtn" onClick={copyStats} disabled={empty}>
          {copied === 'stats' ? '통계 복사됨 ✓' : '통계 복사'}
        </button>
        {hasProjectBridge() && (
          <button className="linkbtn" onClick={sendToProject} disabled={empty}>
            {added ? <>추가됨 ✓</> : <><Emoji e="📄" /> 프로젝트에 추가</>}
          </button>
        )}
        <button className="minibtn" onClick={() => setText('')} disabled={empty} style={{ marginLeft: 'auto' }}>
          지우기
        </button>
      </div>

      {/* 미리보기 영역 */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflow: 'auto',
          background: 'var(--chrome-2, var(--panel))',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: 20,
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        {empty ? (
          <div
            style={{
              alignSelf: 'center',
              textAlign: 'center',
              color: 'var(--muted)',
              maxWidth: 420,
              lineHeight: 1.7,
              fontSize: 13,
            }}
          >
            <div style={{ fontSize: 40, marginBottom: 8 }}><Emoji e="📄" /></div>
            <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>아직 원고가 없습니다</div>
            위 입력창에 본문을 붙여넣거나 좌측 파일을 끌어다 놓으면, 출판 투고용 표준 서식으로 정돈된 미리보기가 여기에
            나타납니다. 빈 줄은 문단을, “제1장”·“프롤로그”·“# 제목” 같은 줄은 장 제목으로 인식합니다.
          </div>
        ) : (
          <div
            style={{
              width: '100%',
              maxWidth: 720,
            }}
          >
            <div
              ref={previewRef}
              className="mfp-page"
              style={{
                background: '#ffffff',
                color: '#1a1a1a',
                boxShadow: '0 2px 14px rgba(0,0,0,0.18)',
                borderRadius: 4,
                // 종이 비율을 시각화: 좌우 여백 큰 "원고지 느낌"
                padding: '64px 70px',
                minHeight: `${Math.round(720 * pageRatio)}px`,
                boxSizing: 'border-box',
                fontFamily: fontCss,
                fontSize: `${settings.fontPt}pt`,
                lineHeight: settings.lineHeight,
                textAlign: settings.align,
              }}
            >
              {settings.showHeader && (
                <div
                  className="mfp-header"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    borderBottom: '1px solid #ccc',
                    paddingBottom: 6,
                    marginBottom: 28,
                    fontSize: '10pt',
                    color: '#666',
                    fontFamily: FONTS.sans.css,
                    textAlign: 'left',
                  }}
                >
                  <span>{settings.headerTitle || '제목 없음'}</span>
                  <span>{settings.authorName || ''}</span>
                </div>
              )}

              {blocks.map((b, i) =>
                b.type === 'chapter' ? (
                  <div
                    key={i}
                    className={settings.splitChapters ? 'mfp-chapter mfp-break' : 'mfp-chapter'}
                    style={{
                      textAlign: 'center',
                      fontWeight: 700,
                      fontSize: '1.4em',
                      margin: i === 0 ? '0 0 1.6em' : '2.4em 0 1.6em',
                      letterSpacing: '0.05em',
                    }}
                  >
                    {b.text}
                  </div>
                ) : (
                  <p
                    key={i}
                    style={{
                      margin: 0,
                      marginBottom: `${settings.paraGap}em`,
                      textIndent: `${settings.indentEm}em`,
                      wordBreak: 'keep-all',
                      overflowWrap: 'break-word',
                    }}
                  >
                    {b.text}
                  </p>
                ),
              )}

              {settings.showPageNo && (
                <div
                  className="mfp-footer"
                  style={{
                    marginTop: 36,
                    paddingTop: 8,
                    borderTop: '1px solid #ddd',
                    textAlign: 'center',
                    fontSize: '9pt',
                    color: '#888',
                    fontFamily: FONTS.sans.css,
                  }}
                >
                  — 쪽수 자리 (인쇄 시 자동) —
                </div>
              )}
            </div>
            <p style={{ margin: '10px 0 0', fontSize: 11, color: 'var(--muted)', textAlign: 'center' }}>
              {paper.label} · {FONTS[settings.fontFamily].label} {settings.fontPt}pt · 줄간격 {settings.lineHeight.toFixed(1)}배
              · 인쇄 시 실제 쪽 단위로 나뉩니다.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ---------- 인쇄용 HTML 빌드(독립 문서) ----------
function buildPrintHtml(innerHtml: string, s: Settings): string {
  const paper = PAPERS[s.paper]
  const fontCss = FONTS[s.fontFamily].css
  // 페이지 크기 매핑
  const size =
    s.paper === 'a4' ? 'A4' : s.paper === 'letter' ? 'Letter' : `${paper.w}mm ${paper.h}mm`
  const titleSafe = esc(s.headerTitle || '원고')
  // @page 머리말/쪽수: CSS 카운터 사용(브라우저 지원 범위 내)
  return `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><title>${titleSafe}</title>
<style>
  @page { size: ${size}; margin: 25mm 22mm 22mm 22mm; }
  html, body { margin: 0; padding: 0; background: #fff; color: #111; }
  body {
    font-family: ${fontCss};
    font-size: ${s.fontPt}pt;
    line-height: ${s.lineHeight};
    text-align: ${s.align};
  }
  .mfp-header {
    display: flex; justify-content: space-between; align-items: baseline;
    border-bottom: 1px solid #ccc; padding-bottom: 6px; margin-bottom: 24px;
    font-size: 10pt; color: #555; font-family: ${FONTS.sans.css}; text-align: left;
  }
  .mfp-footer { display: none; }
  .mfp-chapter {
    text-align: center; font-weight: 700; font-size: 1.4em;
    margin: 2.2em 0 1.4em; letter-spacing: .05em;
  }
  .mfp-chapter:first-child { margin-top: 0; }
  .mfp-break { break-before: page; page-break-before: always; }
  .mfp-chapter.mfp-break:first-of-type { break-before: auto; page-break-before: auto; }
  p {
    margin: 0 0 ${s.paraGap}em;
    text-indent: ${s.indentEm}em;
    word-break: keep-all; overflow-wrap: break-word; orphans: 2; widows: 2;
  }
</style></head>
<body>${innerHtml}</body></html>`
}

// ---------- 소형 UI 보조 컴포넌트 ----------
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--muted)' }}>
      <span>{label}</span>
      {children}
    </label>
  )
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text)', cursor: 'pointer' }}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  )
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: 5,
        padding: '4px 9px',
        background: 'var(--chrome-2, var(--paper))',
        border: '1px solid var(--border)',
        borderRadius: 7,
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ color: 'var(--muted)' }}>{label}</span>
      <span style={{ fontWeight: 700, color: accent ? 'var(--accent)' : 'var(--text)' }}>{value}</span>
    </div>
  )
}

const selStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '6px 8px',
  fontSize: 13,
  color: 'var(--text)',
  background: 'var(--paper)',
  border: '1px solid var(--border)',
  borderRadius: 6,
  outline: 'none',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
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
