// 미세 긴장 계량기 — 본문을 문단 단위로 쪼개, 각 문단의 '질문/불확실/위협/욕망' 신호를
//   국어 어휘 사전(키워드·어미·문장부호 패턴)으로 점수화한다. 그 점수를 SVG 긴장 곡선으로
//   그리고, 연속된 저긴장(평탄) 구간을 자동 탐지해 경고한다. 정점/저점 문단을 짚어주고,
//   신호별 기여도(스택)와 약한 문단 보강 제안까지 제공하는 대형 인터랙티브 분석기.
// 자급식: react 와 './linkbus' 만 import. 모든 계산은 브라우저 로컬(결정론적). 네트워크 없음.
// 데이터 수용: 텍스트 직접 입력 / 좌측 바인더 문서 드롭(getDragItem) / payload.text / 스니펫 라이브러리.
// 산출 연동: 프로젝트에 분석 리포트 추가, 수집함에 약한 문단 담기, 관련 도구 열기, 메모를 스니펫으로 저장.
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  addToProject, hasProjectBridge,
  addToStash, hasStash,
  addToLibrary, useLibraryList,
  getDragItem, isItemDrag,
  openToolLinked,
  type ToolPayload,
} from './linkbus'

export const meta = {
  id: 'micro-tension-meter',
  name: '미세 긴장 계량기',
  icon: '📈',
  group: '구조',
  intro: '문단마다 질문·불확실·위협·욕망 신호를 점수화해 긴장 곡선을 그리고 평탄 구간을 경고합니다',
  w: 480,
  h: 620,
}

const LS_KEY = 'sry:tool:micro-tension-meter'

// ── 신호 사전(국어) ─────────────────────────────────────────────
// 4개 축. 각 축마다 키워드/패턴과 가중치. 전부 로컬 규칙 — 외부 모델 없음.
type Axis = 'question' | 'uncertain' | 'threat' | 'desire'
interface AxisDef { key: Axis; label: string; color: string; words: string[]; weight: number }

const AXES: AxisDef[] = [
  {
    key: 'question', label: '질문', color: '#3b82f6', weight: 1,
    // 단음절/과광범위 토큰('까','맞아')은 mid-word 오탐이 커서 제거.
    // 어말 의문형('~까?','~까.')은 아래 questionTailHits 로 어말 한정 집계한다.
    words: ['왜', '어째서', '무엇', '누구', '어디', '언제', '어떻게', '정말', '진짜', '설마', '혹시', '과연', '대체', '도대체', '맞나', '그럴까', '일까', '걸까', '가요', '나요'],
  },
  {
    key: 'uncertain', label: '불확실', color: '#a855f7', weight: 1,
    words: ['아마', '어쩌면', '모른다', '모르겠', '모를', '글쎄', '같았다', '같은', '듯', '듯이', '듯한', '인지', '일지', '확실하지', '아닐', '못한다', '못했다', '망설', '머뭇', '주저', '갸웃', '혹', '어딘가', '왠지', '무언가', '뭔가'],
  },
  {
    key: 'threat', label: '위협', color: '#ef4444', weight: 1.3,
    words: ['죽', '피', '칼', '총', '불', '비명', '소리쳤', '소리질', '위험', '두려', '무서', '공포', '떨', '도망', '쫓', '추격', '습격', '공격', '폭발', '경고', '비상', '적', '함정', '배신', '위협', '협박', '잡혔', '갇', '쓰러', '무너', '깨졌', '부서', '터졌', '찢', '베', '찔', '맞았', '때렸'],
  },
  {
    key: 'desire', label: '욕망', color: '#f59e0b', weight: 1,
    words: ['원한다', '원했다', '바란다', '바랐다', '갖고', '가지고싶', '하고싶', '되고싶', '필요', '간절', '절실', '욕심', '갈망', '꿈', '목표', '반드시', '기어이', '결코', '절대', '꼭', '결심', '다짐', '포기', '놓칠', '잃을', '지켜', '구해', '되찾'],
  },
]
const AXIS_COLOR: Record<Axis, string> = Object.fromEntries(AXES.map((a) => [a.key, a.color])) as Record<Axis, string>
const AXIS_LABEL: Record<Axis, string> = Object.fromEntries(AXES.map((a) => [a.key, a.label])) as Record<Axis, string>

// ── 문장부호/구조 신호 ──────────────────────────────────────────
// 물음표·말줄임·느낌표·짧고 끊긴 문장은 미세 긴장의 신호.
function countMatches(text: string, words: string[]): number {
  let n = 0
  for (const w of words) {
    let from = 0
    while (true) {
      const i = text.indexOf(w, from)
      if (i < 0) break
      n++
      from = i + w.length
    }
  }
  return n
}

// 어말 한정 의문 종결('까'). 단순 substring(까) 은 까닭·깜짝·가까이 등 mid-word 오탐이 커서,
// 문장부호/공백/문자열 끝 앞의 '까'만 의문 신호로 집계한다(어말 한정).
function questionTailHits(text: string): number {
  return (text.match(/까(?=[?？.。!！…\s」』)]|$)/g) || []).length
}

// ── 분석 결과 타입 ──────────────────────────────────────────────
interface ParaScore {
  index: number
  text: string
  chars: number
  axis: Record<Axis, number>   // 축별 원점수(가중 전, 문단 길이 정규화 후 0~)
  punct: number                // 문장부호 보너스
  total: number                // 0~100 정규화 긴장 점수
}
interface Analysis {
  paras: ParaScore[]
  avg: number
  peakIdx: number
  troughIdx: number
  flatRuns: { start: number; end: number; len: number }[] // 연속 저긴장 구간(문단 index 범위)
}

// 문단 분리: 빈 줄 기준, 없으면 줄 단위, 그래도 1개면 문장(. ? ! …) 단위로.
function splitParas(raw: string): string[] {
  const t = raw.replace(/\r\n/g, '\n').trim()
  if (!t) return []
  let parts = t.split(/\n\s*\n+/).map((s) => s.trim()).filter(Boolean)
  if (parts.length <= 1) parts = t.split(/\n+/).map((s) => s.trim()).filter(Boolean)
  if (parts.length <= 1) {
    parts = t.split(/(?<=[.?!…。」』])\s+/).map((s) => s.trim()).filter(Boolean)
  }
  return parts
}

// HTML 제거(드롭 문서가 HTML 본문일 수 있어 안전 처리) — 태그 벗기고 엔티티 풀기.
function stripHtml(s: string): string {
  if (s.indexOf('<') < 0 && s.indexOf('&') < 0) return s
  const noTag = s.replace(/<br\s*\/?>(?=)/gi, '\n').replace(/<\/(p|div|li|h[1-6])>/gi, '\n').replace(/<[^>]+>/g, '')
  return noTag
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
}

// 한 문단 점수화. 문단 길이로 정규화(긴 문단이 무조건 높지 않게) 후 가중합 → 0~100.
function scorePara(text: string, index: number): ParaScore {
  const chars = text.length
  const axis: Record<Axis, number> = { question: 0, uncertain: 0, threat: 0, desire: 0 }
  // 길이 정규화 기준(문단을 ~120자 단위로 환산). 너무 짧은 문단은 분모 하한 적용.
  const norm = Math.max(60, chars)
  for (const a of AXES) {
    let hits = countMatches(text, a.words)
    // 질문 축: 어말 의문형 '~까' 를 어말 한정으로 추가 집계(mid-word 오탐 방지).
    if (a.key === 'question') hits += questionTailHits(text)
    // 100자당 히트 비율 * 가중치
    axis[a.key] = (hits / norm) * 100 * a.weight
  }
  // 문장부호 신호: 물음표/느낌표/말줄임 + 짧은 문장(끊김) 비율.
  const q = (text.match(/[?？]/g) || []).length
  const ex = (text.match(/[!！]/g) || []).length
  const ell = (text.match(/(\.\.\.|…|—|―|--)/g) || []).length
  const sentences = text.split(/(?<=[.?!…。」』])\s*/).filter((s) => s.trim().length > 0)
  const avgSentLen = sentences.length ? chars / sentences.length : chars
  const shortBurst = avgSentLen > 0 && avgSentLen < 18 ? 1 : 0 // 짧고 끊긴 문장 = 긴장
  const punct = (q * 2.2 + ex * 1.6 + ell * 1.2 + shortBurst * 1.5) / norm * 100

  // 합산 → 압축(과도한 한 축 도배가 100을 넘지 않게 로지스틱 유사 스케일)
  const rawSum = axis.question + axis.uncertain + axis.threat + axis.desire + punct
  const total = Math.round(100 * (1 - Math.exp(-rawSum / 6)))
  return { index, text, chars, axis, punct, total }
}

function analyze(paras: string[]): Analysis {
  const scored = paras.map((p, i) => scorePara(p, i))
  const avg = scored.length ? scored.reduce((s, p) => s + p.total, 0) / scored.length : 0
  let peakIdx = 0, troughIdx = 0
  scored.forEach((p) => {
    if (p.total > scored[peakIdx].total) peakIdx = p.index
    if (p.total < scored[troughIdx].total) troughIdx = p.index
  })
  // 평탄 구간: total 이 임계(평균의 55% 또는 절대 22 중 큰 값) 이하인 문단이 3개 이상 연속.
  const flatThresh = Math.max(22, avg * 0.55)
  const flatRuns: { start: number; end: number; len: number }[] = []
  let runStart = -1
  for (let i = 0; i <= scored.length; i++) {
    const low = i < scored.length && scored[i].total <= flatThresh
    if (low && runStart < 0) runStart = i
    if (!low && runStart >= 0) {
      const len = i - runStart
      if (len >= 3) flatRuns.push({ start: runStart, end: i - 1, len })
      runStart = -1
    }
  }
  return { paras: scored, avg, peakIdx: scored.length ? peakIdx : -1, troughIdx: scored.length ? troughIdx : -1, flatRuns }
}

// 약한 문단 보강 제안 — 가장 부족한 축을 짚어준다(결정론적).
function suggestFor(p: ParaScore): string {
  const ranked = AXES.slice().sort((a, b) => p.axis[a.key] - p.axis[b.key])
  const weakest = ranked[0].key
  const tip: Record<Axis, string> = {
    question: '인물이 답을 모르는 의문(왜·정말·설마)을 던져 독자도 함께 궁금하게 만들기',
    uncertain: '확신을 흐리는 표현(아마·~인 듯·모르겠다)으로 결과를 불투명하게 두기',
    threat: '위험·손실의 그림자(시간·관계·안전이 걸린 무엇)를 한 줄 심어 압박 더하기',
    desire: '인물이 지금 간절히 원하는 것을 드러내 장면에 추진력 주기',
  }
  return `약한 신호: ${AXIS_LABEL[weakest]} → ${tip[weakest]}`
}

// ── 저장/복원 ───────────────────────────────────────────────────
interface SaveShape { title: string; text: string }
function load(): SaveShape {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return { title: '', text: '' }
    const p = JSON.parse(raw)
    if (!p || typeof p !== 'object') return { title: '', text: '' }
    return { title: typeof p.title === 'string' ? p.title : '', text: typeof p.text === 'string' ? p.text : '' }
  } catch { return { title: '', text: '' } }
}

function bandLabel(v: number): string {
  if (v >= 70) return '고긴장'
  if (v >= 45) return '중긴장'
  if (v >= 22) return '저긴장'
  return '평탄'
}
function bandColor(v: number): string {
  if (v >= 70) return '#ef4444'
  if (v >= 45) return '#f59e0b'
  if (v >= 22) return '#3b82f6'
  return 'var(--muted)'
}

export default function MicroTensionMeter({ payload }: { payload?: ToolPayload }) {
  const init = useRef(load())
  const [title, setTitle] = useState(init.current.title)
  const [text, setText] = useState(init.current.text)
  const [note, setNote] = useState('')
  const [toast, setToast] = useState('')
  const [hover, setHover] = useState<number | null>(null)
  const [dropOn, setDropOn] = useState(false)
  const [showSnips, setShowSnips] = useState(false)
  const mounted = useRef(true)
  const snippets = useLibraryList('snippets')

  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  // payload.text 수용(다른 도구/바인더에서 텍스트와 함께 열렸을 때).
  useEffect(() => {
    const pt = payload && typeof payload.text === 'string' ? (payload.text as string) : ''
    if (pt && pt.trim()) {
      setText(stripHtml(pt))
      const ptitle = payload && typeof payload.title === 'string' ? (payload.title as string) : ''
      if (ptitle) setTitle(ptitle)
    }
    // payload 는 마운트 시 1회만 반영
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 자동 저장.
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ title, text } as SaveShape)) }
    catch { if (mounted.current) setNote('이 브라우저에서 저장이 막혀 있어 새로고침하면 내용이 사라질 수 있어요.') }
  }, [title, text])

  // 토스트 자동 소거.
  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => { if (mounted.current) setToast('') }, 2000)
    return () => window.clearTimeout(t)
  }, [toast])

  const paras = useMemo(() => splitParas(text), [text])
  const analysis = useMemo(() => analyze(paras), [paras])
  const has = analysis.paras.length > 0

  // 드롭(좌측 바인더 문서) 수용.
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDropOn(false)
    const item = getDragItem(e)
    if (item && (item.text || item.title)) {
      const body = stripHtml(item.text || '')
      if (body.trim()) {
        setText(body)
        if (item.title && !title.trim()) setTitle(item.title)
        setToast(`'${item.title || '문서'}' 본문을 불러왔어요`)
        return
      }
    }
    // 일반 텍스트 드롭도 허용.
    try {
      const plain = e.dataTransfer.getData('text/plain')
      if (plain && plain.trim()) { setText(stripHtml(plain)); setToast('텍스트를 불러왔어요') }
    } catch { /* noop */ }
  }

  const useSnippet = (s: { text: string }) => {
    setText((prev) => (prev.trim() ? prev + '\n\n' + s.text : s.text))
    setShowSnips(false)
    setToast('스니펫을 본문에 더했어요')
  }

  // ── 텍스트 리포트 ─────────────────────────────────────────────
  const buildText = (): string => {
    const out: string[] = []
    out.push(title.trim() ? `[미세 긴장 분석] ${title.trim()}` : '[미세 긴장 분석]')
    out.push(`문단 ${analysis.paras.length}개 · 평균 긴장 ${analysis.avg.toFixed(0)}/100`)
    if (analysis.peakIdx >= 0) out.push(`정점: ${analysis.peakIdx + 1}번 문단(${analysis.paras[analysis.peakIdx].total})`)
    if (analysis.troughIdx >= 0) out.push(`저점: ${analysis.troughIdx + 1}번 문단(${analysis.paras[analysis.troughIdx].total})`)
    if (analysis.flatRuns.length) {
      out.push('평탄 경고: ' + analysis.flatRuns.map((r) => `${r.start + 1}~${r.end + 1}번(${r.len}문단)`).join(', '))
    } else if (has) {
      out.push('평탄 경고: 없음 — 긴장이 고르게 출렁입니다.')
    }
    out.push('')
    analysis.paras.forEach((p) => {
      const sig = AXES.filter((a) => p.axis[a.key] > 0).map((a) => AXIS_LABEL[a.key]).join('·') || '신호 없음'
      out.push(`${p.index + 1}. [${p.total}/${bandLabel(p.total)}] ${sig}`)
    })
    return out.join('\n')
  }
  const copy = async () => {
    const t = buildText()
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(t)
      else {
        const ta = document.createElement('textarea')
        ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0'
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
      }
      setToast('분석 결과를 복사했어요')
    } catch { setNote('복사에 실패했어요. 브라우저 권한을 확인하세요.') }
  }

  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const buildHtml = (): string => {
    const parts: string[] = []
    parts.push(`<p><strong>미세 긴장 분석</strong>${title.trim() ? ' · ' + esc(title.trim()) : ''} · 문단 ${analysis.paras.length}개 · 평균 ${analysis.avg.toFixed(0)}/100</p>`)
    if (analysis.flatRuns.length) {
      parts.push('<p><strong>평탄 구간 경고</strong>: ' + analysis.flatRuns.map((r) => `${r.start + 1}~${r.end + 1}번(${r.len}문단 연속)`).join(', ') + '</p>')
    }
    parts.push('<ol>')
    analysis.paras.forEach((p) => {
      const sig = AXES.filter((a) => p.axis[a.key] > 0).map((a) => AXIS_LABEL[a.key]).join('·') || '신호 없음'
      parts.push(`<li>[${p.total}/${esc(bandLabel(p.total))}] ${esc(sig)} — ${esc(p.text.slice(0, 60))}${p.text.length > 60 ? '…' : ''}</li>`)
    })
    parts.push('</ol>')
    return parts.join('')
  }
  const toProject = () => {
    if (!hasProjectBridge() || !has) return
    const meta: Record<string, string> = {
      문단수: String(analysis.paras.length),
      평균긴장: analysis.avg.toFixed(0),
      평탄구간: String(analysis.flatRuns.length),
    }
    const id = addToProject({
      kind: 'text', root: 'research', folder: '구조',
      title: title.trim() ? `미세 긴장 분석 — ${title.trim()}` : '미세 긴장 분석',
      bodyHtml: buildHtml(), meta,
    })
    if (!mounted.current) return
    if (id) setToast('프로젝트 자료(구조)에 분석 리포트를 추가했어요')
    else setNote('프로젝트에 연결되지 않았습니다.')
  }

  // 평탄/약한 문단들을 수집함에 메모로 담기.
  const stashWeak = () => {
    if (!hasStash() || !has) return
    const weak = analysis.paras.filter((p) => p.total < Math.max(22, analysis.avg * 0.55))
    if (!weak.length) { setToast('보강이 필요한 약한 문단이 없어요'); return }
    weak.slice(0, 12).forEach((p) => {
      addToStash({
        kind: 'memo',
        label: `긴장 약함 ${p.index + 1}번 (${p.total}/100)`,
        text: `${p.text.slice(0, 140)}\n→ ${suggestFor(p)}`,
      })
    })
    setToast(`약한 문단 ${Math.min(weak.length, 12)}개를 수집함에 담았어요`)
  }

  // 분석 요약을 스니펫 라이브러리에 저장(다른 도구에서 재사용).
  const saveSnippet = () => {
    if (!has) return
    addToLibrary('snippets', {
      text: buildText(),
      source: 'micro-tension-meter',
      tags: ['긴장분석', title.trim() || '무제'],
    })
    setToast('분석 요약을 스니펫 라이브러리에 저장했어요')
  }

  // 관련 도구 열기(감정 곡선/장면 목록 등) — 현재 본문과 함께.
  const openRelated = (toolId: string) => {
    openToolLinked(toolId, { text, title: title.trim() })
    setToast('관련 도구를 열었어요')
  }

  const clearAll = () => { setText(''); setTitle(''); setNote('') }

  // ── SVG 좌표 ──────────────────────────────────────────────────
  const VBW = 440, VBH = 180
  const PADL = 26, PADR = 12, PADT = 14, PADB = 22
  const plotW = VBW - PADL - PADR
  const plotH = VBH - PADT - PADB
  const xAt = (i: number) => analysis.paras.length <= 1 ? PADL + plotW / 2 : PADL + (i / (analysis.paras.length - 1)) * plotW
  const yAt = (v: number) => PADT + (1 - v / 100) * plotH
  const pts = analysis.paras.map((p) => ({ x: xAt(p.index), y: yAt(p.total), p }))
  const linePath = pts.map((q, i) => `${i === 0 ? 'M' : 'L'}${q.x.toFixed(1)},${q.y.toFixed(1)}`).join(' ')
  const areaPath = pts.length
    ? `${linePath} L${pts[pts.length - 1].x.toFixed(1)},${(PADT + plotH).toFixed(1)} L${pts[0].x.toFixed(1)},${(PADT + plotH).toFixed(1)} Z`
    : ''
  const flatThresh = Math.max(22, analysis.avg * 0.55)

  // ── 스타일 ────────────────────────────────────────────────────
  const wrap: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text)', boxSizing: 'border-box', background: 'var(--paper)' }
  const head: React.CSSProperties = { display: 'flex', gap: 6, alignItems: 'center', padding: '10px 12px', borderBottom: '1px solid var(--border)', background: 'var(--chrome-2)', flexShrink: 0, flexWrap: 'wrap' }
  const titleInput: React.CSSProperties = { flex: 1, minWidth: 120, padding: '7px 10px', fontSize: 13, fontWeight: 600, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--text)', boxSizing: 'border-box' }
  const body: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }
  const panel: React.CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 12 }
  const sectionTitle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 8, letterSpacing: '.02em' }
  const hint: React.CSSProperties = { color: 'var(--muted)', fontSize: 12, lineHeight: 1.55 }
  const empty: React.CSSProperties = { textAlign: 'center', color: 'var(--muted)', fontSize: 13, lineHeight: 1.8, padding: '18px 8px' }

  const hovered = hover != null && analysis.paras[hover] ? analysis.paras[hover] : null

  return (
    <div style={wrap}>
      <div style={head}>
        <input style={titleInput} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="장/장면 제목 (선택)" maxLength={80} aria-label="제목" />
        <button className="minibtn" onClick={copy} disabled={!has} title="분석 결과를 텍스트로 복사">복사</button>
        <button className="minibtn" onClick={clearAll} disabled={!text} title="본문 비우기">비우기</button>
      </div>

      {toast && <div style={{ ...hint, color: 'var(--ok)', padding: '6px 12px 0' }}>{toast}</div>}
      {note && <div style={{ ...hint, color: 'var(--warn)', padding: '6px 12px 0' }}>{note}</div>}

      <div style={body}>
        {/* ── 입력(텍스트/드롭/스니펫) ── */}
        <div style={panel}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ ...sectionTitle, marginBottom: 0 }}>본문</span>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>{text.length}자 · 문단 {paras.length}개</span>
            <span style={{ flex: 1 }} />
            <button className="minibtn" onClick={() => setShowSnips((v) => !v)} title="스니펫 라이브러리에서 가져오기">스니펫 {snippets.length}</button>
          </div>
          {showSnips && (
            <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 6, marginBottom: 8, maxHeight: 130, overflowY: 'auto', background: 'var(--chrome-2)' }}>
              {snippets.length === 0 ? (
                <div style={{ ...hint, padding: 6 }}>저장된 스니펫이 없습니다. 분석 후 '요약 저장'으로 만들 수 있어요.</div>
              ) : snippets.slice(0, 30).map((s) => (
                <div key={s.id} style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '4px 2px', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ flex: 1, minWidth: 0, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.text.slice(0, 60)}</span>
                  <button className="minibtn" style={{ padding: '2px 7px', fontSize: 11 }} onClick={() => useSnippet(s)}>넣기</button>
                </div>
              ))}
            </div>
          )}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onDragOver={(e) => { if (isItemDrag(e) || (e.dataTransfer && Array.prototype.indexOf.call(e.dataTransfer.types, 'text/plain') >= 0)) { e.preventDefault(); if (!dropOn) setDropOn(true) } }}
            onDragLeave={() => setDropOn(false)}
            onDrop={onDrop}
            placeholder={'분석할 본문을 붙여넣거나, 좌측 바인더 문서를 이 칸으로 끌어다 놓으세요.\n빈 줄로 나뉜 문단 단위(없으면 줄/문장 단위)로 긴장을 점수화합니다.'}
            style={{
              width: '100%', minHeight: 120, resize: 'vertical', boxSizing: 'border-box',
              padding: '9px 11px', fontSize: 13, lineHeight: 1.6, borderRadius: 9,
              border: dropOn ? '2px dashed var(--accent)' : '1px solid var(--border)',
              background: 'var(--paper)', color: 'var(--text)', fontFamily: 'inherit',
            }}
            aria-label="본문 입력"
          />
        </div>

        {!has ? (
          <div style={{ ...panel }}>
            <div style={empty}>
              본문을 넣으면 문단별 긴장 곡선이 그려집니다.<br />
              질문·불확실·위협·욕망 네 신호를 사전 규칙으로 찾아 점수화하고,<br />
              연속된 저긴장(평탄) 구간을 자동으로 경고합니다.<br />
              <span style={{ fontSize: 12 }}>좌측 바인더 문서 드롭, 스니펫 가져오기, 다른 도구에서 텍스트 전달도 받습니다.</span>
            </div>
          </div>
        ) : (
          <>
            {/* ── 긴장 곡선 ── */}
            <div style={panel}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                <span style={{ ...sectionTitle, marginBottom: 0 }}>긴장 곡선</span>
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>평균 <strong style={{ color: bandColor(analysis.avg) }}>{analysis.avg.toFixed(0)}</strong>/100</span>
                {analysis.peakIdx >= 0 && <span style={{ fontSize: 11, color: 'var(--muted)' }}>정점 {analysis.peakIdx + 1}번</span>}
                {analysis.troughIdx >= 0 && <span style={{ fontSize: 11, color: 'var(--muted)' }}>저점 {analysis.troughIdx + 1}번</span>}
              </div>
              <svg viewBox={`0 0 ${VBW} ${VBH}`} width="100%" style={{ display: 'block', maxHeight: 200 }} role="img" aria-label="문단별 긴장 곡선">
                {/* 격자 + Y라벨 */}
                {[100, 70, 45, 22, 0].map((v) => {
                  const y = yAt(v)
                  return (
                    <g key={v}>
                      <line x1={PADL} y1={y} x2={VBW - PADR} y2={y} stroke="var(--border)" strokeWidth={1} strokeDasharray="2 4" opacity={0.5} />
                      <text x={PADL - 4} y={y + 3} textAnchor="end" fontSize={8} fill="var(--muted)">{v}</text>
                    </g>
                  )
                })}
                {/* 평탄 임계선 */}
                <line x1={PADL} y1={yAt(flatThresh)} x2={VBW - PADR} y2={yAt(flatThresh)} stroke="var(--warn)" strokeWidth={1} strokeDasharray="5 3" opacity={0.55} />
                {/* 평탄 구간 음영 */}
                {analysis.flatRuns.map((r, k) => {
                  const x1 = xAt(r.start), x2 = xAt(r.end)
                  return <rect key={k} x={Math.min(x1, x2) - 3} y={PADT} width={Math.abs(x2 - x1) + 6} height={plotH} fill="var(--warn)" opacity={0.1} />
                })}
                {areaPath && <path d={areaPath} fill="var(--accent)" opacity={0.1} />}
                <path d={linePath} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                {pts.map((q) => (
                  <circle
                    key={q.p.index}
                    cx={q.x} cy={q.y} r={hover === q.p.index ? 5 : 3}
                    fill={bandColor(q.p.total)} stroke="var(--paper)" strokeWidth={1.2}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHover(q.p.index)}
                    onMouseLeave={() => setHover((h) => (h === q.p.index ? null : h))}
                  >
                    <title>{`${q.p.index + 1}번 문단: ${q.p.total}/100 (${bandLabel(q.p.total)})`}</title>
                  </circle>
                ))}
              </svg>
              {/* 축 범례(텍스트) */}
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 4 }}>
                {AXES.map((a) => (
                  <span key={a.key} style={{ fontSize: 11, color: 'var(--muted)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 9, height: 9, borderRadius: 2, background: a.color, display: 'inline-block' }} />{a.label}
                  </span>
                ))}
              </div>
            </div>

            {/* ── 평탄 경고 ── */}
            <div style={{ ...panel, borderLeft: `3px solid ${analysis.flatRuns.length ? 'var(--warn)' : 'var(--ok)'}` }}>
              <div style={sectionTitle}>평탄 구간 경고</div>
              {analysis.flatRuns.length ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ fontSize: 13, color: 'var(--warn)', lineHeight: 1.5 }}>
                    저긴장 문단이 연속되는 구간이 {analysis.flatRuns.length}곳 있습니다. 독자가 늘어짐을 느낄 수 있어요.
                  </div>
                  {analysis.flatRuns.map((r, k) => (
                    <div key={k} style={{ fontSize: 12, color: 'var(--text)', background: 'var(--chrome-2)', borderRadius: 8, padding: '6px 8px' }}>
                      <strong>{r.start + 1}~{r.end + 1}번</strong> ({r.len}문단 연속 · 평탄선 {Math.round(flatThresh)} 이하) — {suggestFor(analysis.paras[r.start])}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 13, color: 'var(--ok)', lineHeight: 1.5 }}>연속된 평탄 구간이 없습니다. 긴장이 고르게 출렁이고 있어요.</div>
              )}
            </div>

            {/* ── 호버/선택 문단 상세 ── */}
            {hovered && (
              <div style={{ ...panel, borderLeft: `3px solid ${bandColor(hovered.total)}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ ...sectionTitle, marginBottom: 0 }}>{hovered.index + 1}번 문단</span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: bandColor(hovered.total) }}>{hovered.total}/100 · {bandLabel(hovered.total)}</span>
                </div>
                {/* 신호 기여 막대 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 6 }}>
                  {AXES.map((a) => {
                    const max = Math.max(0.0001, ...AXES.map((x) => hovered.axis[x.key]))
                    const pct = Math.min(100, (hovered.axis[a.key] / max) * 100)
                    return (
                      <div key={a.key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 10, width: 34, color: 'var(--muted)', flexShrink: 0 }}>{a.label}</span>
                        <div style={{ flex: 1, height: 7, background: 'var(--chrome-2)', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: a.color }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.55, maxHeight: 60, overflowY: 'auto' }}>{hovered.text.slice(0, 220)}{hovered.text.length > 220 ? '…' : ''}</div>
                <div style={{ ...hint, marginTop: 6 }}>{suggestFor(hovered)}</div>
              </div>
            )}

            {/* ── 문단 목록(미니 히트맵) ── */}
            <div style={panel}>
              <div style={sectionTitle}>문단 히트맵 (클릭/호버로 상세)</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {analysis.paras.map((p) => (
                  <div
                    key={p.index}
                    onMouseEnter={() => setHover(p.index)}
                    onMouseLeave={() => setHover((h) => (h === p.index ? null : h))}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '3px 4px', borderRadius: 6, background: hover === p.index ? 'var(--chrome-2)' : 'transparent' }}
                  >
                    <span style={{ fontSize: 10, color: 'var(--muted)', width: 22, flexShrink: 0, textAlign: 'right' }}>{p.index + 1}</span>
                    <div style={{ flex: 1, height: 12, background: 'var(--chrome-2)', borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
                      <div style={{ width: `${p.total}%`, height: '100%', background: bandColor(p.total), opacity: 0.85 }} />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, width: 26, textAlign: 'right', color: bandColor(p.total), flexShrink: 0 }}>{p.total}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── 연동 동작 ── */}
            <div style={panel}>
              <div style={sectionTitle}>연동</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                <button className="linkbtn" onClick={toProject} disabled={!hasProjectBridge()} title={hasProjectBridge() ? '자료 › 구조 폴더에 분석 리포트 추가' : '프로젝트에 연결되지 않았습니다'}>프로젝트에 추가</button>
                <button className="linkbtn" onClick={stashWeak} disabled={!hasStash()} title={hasStash() ? '평탄/약한 문단을 보강 제안과 함께 수집함에 담기' : '수집함이 없습니다'}>약한 문단 수집함</button>
                <button className="linkbtn" onClick={saveSnippet} title="분석 요약을 스니펫 라이브러리에 저장">요약 저장</button>
                <button className="linkbtn" onClick={() => openRelated('emotion-arc')} title="감정 곡선 도구를 본문과 함께 열기">감정 곡선 열기</button>
                <button className="linkbtn" onClick={() => openRelated('scene-list')} title="장면 목록 도구를 본문과 함께 열기">장면 목록 열기</button>
              </div>
              <div className="license-note" style={{ marginTop: 8, fontSize: 11, color: 'var(--muted)' }}>
                모든 점수는 브라우저 안에서 한국어 신호 사전(키워드·어미·문장부호)으로 계산됩니다. 외부 전송 없음. 규칙 기반 추정치이니 최종 판단은 작가의 몫입니다.
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
